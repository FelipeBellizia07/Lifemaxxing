// Local-date helpers. Dates are stored as YYYY-MM-DD in the user's local time.

const pad = (n: number) => String(n).padStart(2, '0')

export const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const today = () => toKey(new Date())
export const fromKey = (k: string) => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const addDays = (k: string, n: number) => {
  const d = fromKey(k)
  d.setDate(d.getDate() + n)
  return toKey(d)
}
export const daysBetween = (a: string, b: string) => Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86400000)

/** Monday of the week containing `k`, used as the week id. */
export const weekKey = (k: string) => {
  const d = fromKey(k)
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  return toKey(d)
}
export const inWeek = (k: string, week: string) => weekKey(k) === week

export const fmtShort = (k: string) => fromKey(k).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
export const fmtLong = (k: string) => fromKey(k).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

export const isoDate = (iso: string) => toKey(new Date(iso))
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
