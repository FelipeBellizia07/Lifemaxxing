// IndexedDB persistence. Two stores:
//   kv     → the whole app State under key "state" (small, JSON-shaped)
//   photos → image Blobs by id (kept out of State so it stays fast to save)
// Nothing ever leaves the device.

import { SCHEMA_VERSION, emptyState, type State } from './types.ts'

const DB_NAME = 'lifemaxxing'
const DB_VERSION = 1

let dbp: Promise<IDBDatabase> | null = null
function db() {
  dbp ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const d = req.result
      if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv')
      if (!d.objectStoreNames.contains('photos')) d.createObjectStore('photos')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbp
}

async function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db()
  return new Promise((resolve, reject) => {
    const t = d.transaction(store, mode)
    const req = fn(t.objectStore(store))
    t.oncomplete = () => resolve(req.result)
    t.onerror = () => reject(t.error)
    t.onabort = () => reject(t.error)
  })
}

// Migrations: index i upgrades schema i → i+1. Add entries here when State changes shape.
const MIGRATIONS: ((s: any) => any)[] = [
  (s) => ({ ...emptyState(), ...s, schemaVersion: 1 }), // 0 → 1: fill any missing collections
]

export function migrate(raw: any): State {
  let s = raw ?? {}
  for (let v = s.schemaVersion ?? 0; v < SCHEMA_VERSION; v++) s = MIGRATIONS[v](s)
  return { ...emptyState(), ...s }
}

export const loadState = async () => migrate(await tx<any>('kv', 'readonly', (s) => s.get('state')))
export const saveState = (state: State) => tx('kv', 'readwrite', (s) => s.put(state, 'state'))

export const putPhoto = (id: string, blob: Blob) => tx('photos', 'readwrite', (s) => s.put(blob, id))
export const getPhoto = (id: string) => tx<Blob | undefined>('photos', 'readonly', (s) => s.get(id))
export const deletePhoto = (id: string) => tx('photos', 'readwrite', (s) => s.delete(id))
export const allPhotoIds = () => tx<IDBValidKey[]>('photos', 'readonly', (s) => s.getAllKeys()) as Promise<string[]>
export const clearPhotos = () => tx('photos', 'readwrite', (s) => s.clear())

export async function wipeAll() {
  await tx('kv', 'readwrite', (s) => s.clear())
  await clearPhotos()
}

/** Downscale to max 1600px JPEG so years of progress photos stay small. */
export async function compressImage(file: Blob, max = 1600): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * k)
  c.height = Math.round(bmp.height * k)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  bmp.close()
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Could not encode image'))), 'image/jpeg', 0.86))
}
