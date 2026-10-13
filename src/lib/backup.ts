// JSON backup export / validated import. Photos are embedded as data URLs.

import { AREAS, SCHEMA_VERSION, type State } from './types.ts'
import { allPhotoIds, clearPhotos, getPhoto, migrate, putPhoto } from './db.ts'

export interface Backup { app: 'lifemaxxing'; schemaVersion: number; exportedAt: string; state: State; photos: Record<string, string> }

const blobToDataURL = (b: Blob) => new Promise<string>((res, rej) => {
  const r = new FileReader()
  r.onload = () => res(r.result as string)
  r.onerror = () => rej(r.error)
  r.readAsDataURL(b)
})

export async function exportBackup(state: State) {
  const photos: Record<string, string> = {}
  for (const id of await allPhotoIds()) {
    const b = await getPhoto(id)
    if (b) photos[id] = await blobToDataURL(b)
  }
  const data: Backup = { app: 'lifemaxxing', schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), state, photos }
  const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `lifemaxxing-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Required fields per collection: [field, typeof]. Extra fields are allowed.
type Spec = [string, string][]
const SPECS: Record<string, Spec> = {
  tasks: [['id', 'string'], ['title', 'string'], ['area', 'string'], ['status', 'string'], ['steps', 'object']],
  sessions: [['id', 'string'], ['label', 'string'], ['startedAt', 'string'], ['actualMin', 'number']],
  daily: [['date', 'string']],
  workouts: [['id', 'string'], ['date', 'string'], ['type', 'string'], ['durationMin', 'number']],
  routines: [['id', 'string'], ['name', 'string']],
  routineChecks: [['routineId', 'string'], ['date', 'string']],
  evolution: [['id', 'string'], ['date', 'string'], ['area', 'string'], ['title', 'string']],
  transactions: [['id', 'string'], ['date', 'string'], ['kind', 'string'], ['amount', 'number']],
  forecasts: [['id', 'string'], ['label', 'string'], ['monthly', 'number']],
  balances: [['id', 'string'], ['date', 'string'], ['amount', 'number']],
  skills: [['id', 'string'], ['name', 'string'], ['level', 'number']],
  reading: [['id', 'string'], ['date', 'string'], ['minutes', 'number']],
  challenges: [['id', 'string'], ['title', 'string'], ['status', 'string']],
  interactions: [['id', 'string'], ['date', 'string'], ['initiated', 'boolean']],
  projects: [['id', 'string'], ['title', 'string'], ['stage', 'string'], ['milestones', 'object'], ['blockers', 'object'], ['notes', 'object'], ['experiments', 'object']],
  milestones: [['id', 'string'], ['title', 'string'], ['area', 'string']],
  reviews: [['week', 'string'], ['createdAt', 'string']],
}

export function validateBackup(data: any): string[] {
  const errs: string[] = []
  if (!data || typeof data !== 'object') return ['File is not a JSON object.']
  if (data.app !== 'lifemaxxing') errs.push('Not a LifeMaxxing backup (missing app marker).')
  if (typeof data.schemaVersion !== 'number' || data.schemaVersion > SCHEMA_VERSION) errs.push('Backup comes from a newer or unknown version.')
  const s = data.state
  if (!s || typeof s !== 'object') return [...errs, 'Missing state.']
  for (const [key, spec] of Object.entries(SPECS)) {
    const arr = s[key]
    if (arr === undefined) continue
    if (!Array.isArray(arr)) { errs.push(`${key} must be a list.`); continue }
    arr.forEach((item: any, i: number) => {
      if (!item || typeof item !== 'object') return errs.push(`${key}[${i}] is not an object.`)
      for (const [f, t] of spec) if (typeof item[f] !== t) errs.push(`${key}[${i}].${f} should be ${t}.`)
      if ('area' in item && !AREAS.includes(item.area)) errs.push(`${key}[${i}].area "${item.area}" is unknown.`)
    })
  }
  if (s.profile != null && (typeof s.profile !== 'object' || !Array.isArray(s.profile.areas))) errs.push('profile is malformed.')
  if (data.photos != null && typeof data.photos !== 'object') errs.push('photos must be an object.')
  else for (const [id, url] of Object.entries(data.photos ?? {}))
    if (typeof url !== 'string' || !url.startsWith('data:image/')) errs.push(`photo ${id} is not an image data URL.`)
  return errs.slice(0, 12)
}

/** Replaces all local data with the backup. Call only after validateBackup returned []. */
export async function restoreBackup(data: Backup): Promise<State> {
  await clearPhotos()
  for (const [id, url] of Object.entries(data.photos ?? {})) await putPhoto(id, await (await fetch(url)).blob())
  return migrate(data.state)
}
