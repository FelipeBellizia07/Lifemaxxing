// Device-to-device sync over WebRTC (PeerJS). No accounts, no cloud copy of your data:
// the free PeerJS broker only introduces the two devices; records and photos then travel
// directly between them over an encrypted DTLS channel.
//
// Flow: device A shows a 6-character code (host). Device B types it (guest).
//   B → A  hello  { device, state, photos }
//   A merges (three-way, using the snapshot from their last sync) and replies
//   A → B  merged { device, state, want }, then any photos B lacks, then 'end'
//   B adopts the merged state, sends the photos A asked for, then 'end'.
// Both store the merged state as the base for their next sync.

import type { DataConnection, Peer as PeerT } from 'peerjs'
import type { State } from './types.ts'
import { allPhotoIds, getPhoto, kvGet, kvSet, putPhoto } from './db.ts'
import { mergeStates } from './merge.ts'
import { validateBackup } from './backup.ts'
import { uid } from './date.ts'

const PREFIX = 'lifemaxxing-sync-'
// Self-hosted broker is optional: set VITE_PEER_HOST (and VITE_PEER_PORT) at build time.
const peerOpts = () => (import.meta.env.VITE_PEER_HOST
  ? { host: import.meta.env.VITE_PEER_HOST, port: Number(import.meta.env.VITE_PEER_PORT ?? 9000), path: '/', secure: false }
  : {})

export type SyncStatus = { phase: 'idle' | 'waiting' | 'connecting' | 'syncing' | 'done' | 'error'; text: string }
export interface SyncHooks { getState: () => State; adopt: (s: State) => void; onStatus: (s: SyncStatus) => void }

type Msg =
  | { t: 'hello'; device: string; state: State; photos: string[] }
  | { t: 'merged'; device: string; state: State; want: string[] }
  | { t: 'photo'; id: string; type: string; data: ArrayBuffer }
  | { t: 'end' }

export async function deviceId() {
  let id = await kvGet<string>('device')
  if (!id) { id = uid(); await kvSet('device', id) }
  return id
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I
export const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => ALPHABET[b % 32]).join('')

const checkState = (state: unknown) => {
  const errs = validateBackup({ app: 'lifemaxxing', schemaVersion: (state as State)?.schemaVersion ?? 0, state })
  if (errs.length) throw new Error(`Other device sent invalid data: ${errs[0]}`)
}

async function sendPhotos(conn: DataConnection, ids: string[]) {
  for (const id of ids) {
    const b = await getPhoto(id)
    if (b) conn.send({ t: 'photo', id, type: b.type, data: await b.arrayBuffer() } satisfies Msg)
  }
}

const loadPeer = async () => (await import('peerjs')).Peer

function fail(h: SyncHooks, peer: PeerT, e: unknown) {
  const msg = String((e as any)?.type === 'peer-unavailable' ? 'Code not found. Check it and make sure the other device is showing it.' : (e as any)?.message ?? e)
  h.onStatus({ phase: 'error', text: msg })
  peer.destroy()
}

/** Show a code and wait for the other device. Returns a cancel function. */
export async function host(code: string, h: SyncHooks): Promise<() => void> {
  const Peer = await loadPeer()
  const me = await deviceId()
  const peer = new Peer(PREFIX + code, peerOpts())
  h.onStatus({ phase: 'connecting', text: 'Opening channel…' })
  peer.on('open', () => h.onStatus({ phase: 'waiting', text: 'Waiting for the other device…' }))
  peer.on('error', (e) => fail(h, peer, e))
  peer.on('connection', (conn) => {
    let merged: State | null = null, other = ''
    conn.on('data', async (raw) => {
      const m = raw as Msg
      try {
        if (m.t === 'hello') {
          checkState(m.state)
          h.onStatus({ phase: 'syncing', text: 'Merging…' })
          other = m.device
          merged = mergeStates((await kvGet<State>(`base:${other}`)) ?? null, h.getState(), m.state)
          const mine = await allPhotoIds()
          const theirs = new Set(m.photos)
          conn.send({ t: 'merged', device: me, state: merged, want: m.photos.filter((id) => !mine.includes(id)) } satisfies Msg)
          await sendPhotos(conn, mine.filter((id) => !theirs.has(id)))
          conn.send({ t: 'end' } satisfies Msg)
          h.adopt(merged)
        } else if (m.t === 'photo') {
          await putPhoto(m.id, new Blob([m.data], { type: m.type }))
        } else if (m.t === 'end' && merged) {
          await kvSet(`base:${other}`, merged) // only once the guest confirmed it has everything
          h.onStatus({ phase: 'done', text: 'Synced. Both devices are identical.' })
          setTimeout(() => peer.destroy(), 500)
        }
      } catch (e) { fail(h, peer, e) }
    })
  })
  return () => peer.destroy()
}

/** Connect to the device showing `code` and sync. */
export async function join(code: string, h: SyncHooks): Promise<() => void> {
  const Peer = await loadPeer()
  const me = await deviceId()
  const peer = new Peer(peerOpts())
  h.onStatus({ phase: 'connecting', text: 'Connecting…' })
  peer.on('error', (e) => fail(h, peer, e))
  peer.on('open', () => {
    const conn = peer.connect(PREFIX + code.toUpperCase(), { reliable: true })
    conn.on('open', async () => {
      h.onStatus({ phase: 'syncing', text: 'Sending your data…' })
      conn.send({ t: 'hello', device: me, state: h.getState(), photos: await allPhotoIds() } satisfies Msg)
    })
    let sent: Promise<void> = Promise.resolve()
    conn.on('data', async (raw) => {
      const m = raw as Msg
      try {
        if (m.t === 'merged') {
          checkState(m.state)
          h.adopt(m.state)
          h.onStatus({ phase: 'syncing', text: 'Exchanging photos…' })
          // Assigned synchronously so a following 'end' always waits for it.
          sent = (async () => {
            await kvSet(`base:${m.device}`, m.state)
            await sendPhotos(conn, m.want)
            conn.send({ t: 'end' } satisfies Msg)
          })()
          await sent
        } else if (m.t === 'photo') {
          await putPhoto(m.id, new Blob([m.data], { type: m.type }))
        } else if (m.t === 'end') {
          await sent
          h.onStatus({ phase: 'done', text: 'Synced. Both devices are identical.' })
          setTimeout(() => peer.destroy(), 1500) // let the channel flush
        }
      } catch (e) { fail(h, peer, e) }
    })
  })
  return () => peer.destroy()
}
