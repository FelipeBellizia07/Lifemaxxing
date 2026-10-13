// Three-way merge between two devices, per record.
// `base` is the state both devices agreed on at their last sync. Comparing against it tells us
// what each side added, edited or deleted, so deletions propagate instead of resurrecting.
// Conflicts (both sides edited the same record) resolve to `local`. An edit beats a delete.

import { emptyState, type State } from './types.ts'

const byId = (x: { id: string }) => x.id
const KEYS: Record<string, (x: any) => string> = {
  tasks: byId, sessions: byId, workouts: byId, routines: byId, evolution: byId, transactions: byId,
  forecasts: byId, balances: byId, skills: byId, reading: byId, challenges: byId, interactions: byId,
  projects: byId, milestones: byId,
  daily: (d) => d.date,
  routineChecks: (c) => `${c.routineId}|${c.date}`,
  reviews: (r) => r.week,
}
const SCALARS = ['profile', 'energy', 'finance', 'activeSessionId'] as const

const J = (v: unknown) => JSON.stringify(v ?? null)

function pick<T>(b: T, l: T, r: T): T {
  if (J(l) === J(r)) return l
  if (J(l) === J(b)) return r // only remote changed
  return l // local changed (or both did): local wins
}

function mergeList(b: any[] = [], l: any[] = [], r: any[] = [], key: (x: any) => string) {
  const B = new Map(b.map((x) => [key(x), x]))
  const L = new Map(l.map((x) => [key(x), x]))
  const R = new Map(r.map((x) => [key(x), x]))
  const out: any[] = []
  for (const k of new Set([...L.keys(), ...R.keys()])) {
    const inB = B.has(k), lv = L.get(k), rv = R.get(k)
    if (L.has(k) && R.has(k)) out.push(pick(B.get(k), lv, rv))
    else if (L.has(k)) { if (!inB || J(lv) !== J(B.get(k))) out.push(lv) } // remote deleted an unchanged record → drop
    else { if (!inB || J(rv) !== J(B.get(k))) out.push(rv) }
  }
  return out
}

export function mergeStates(base: State | null, local: State, remote: State): State {
  const b = base ?? emptyState()
  const out: any = { ...local, schemaVersion: Math.max(local.schemaVersion, remote.schemaVersion) }
  for (const [k, key] of Object.entries(KEYS)) out[k] = mergeList((b as any)[k], (local as any)[k], (remote as any)[k], key)
  for (const k of SCALARS) out[k] = pick(b[k], local[k], remote[k])
  // An active session that no longer exists after merging is cleared.
  if (out.activeSessionId && !out.sessions.some((s: any) => s.id === out.activeSessionId)) out.activeSessionId = undefined
  return out
}

/** Photo ids referenced by a state. */
export const photoRefs = (s: State) =>
  new Set([...s.evolution.map((e) => e.photoId), s.profile?.heroPhotoId].filter(Boolean) as string[])
