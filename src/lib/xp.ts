// Progression engine. XP is DERIVED from your records, never stored:
// every reward has a unique key built from the record id, so a record can only pay once,
// and deleting or un-completing a record removes its XP. Same data in, same XP out.

import type { Area, State } from './types.ts'
import { AREAS } from './types.ts'
import { inWeek, isoDate, weekKey } from './date.ts'

export interface XPEvent { key: string; date: string; area: Area | 'core'; amount: number; label: string }

export const XP_RULES: { label: string; xp: string }[] = [
  { label: 'Mission completed', xp: '20 · +10 if high importance' },
  { label: 'Focus session (≥5 min)', xp: '1 per 2 min, max 30' },
  { label: 'Workout logged', xp: '15' },
  { label: 'Daily body log (any field)', xp: '5 per day' },
  { label: 'Routine checked', xp: '3 per routine per day' },
  { label: 'Evolution entry', xp: '10 · +5 with photo' },
  { label: 'Money logged', xp: '4 per day with entries' },
  { label: 'Reading session', xp: '1 per 3 min, max 20' },
  { label: 'Interaction logged', xp: '8 · +6 if you initiated' },
  { label: 'Social challenge done', xp: '40' },
  { label: 'Project promoted from idea', xp: '15' },
  { label: 'Project milestone done', xp: '25' },
  { label: 'Experiment recorded', xp: '10' },
  { label: 'Personal milestone reached', xp: '50' },
  { label: 'Weekly review', xp: '30' },
  { label: 'Weekly challenge met', xp: '40 each' },
]

export function xpEvents(s: State): XPEvent[] {
  const ev: XPEvent[] = []
  const add = (key: string, date: string, area: XPEvent['area'], amount: number, label: string) => {
    if (amount > 0) ev.push({ key, date, area, amount, label })
  }

  for (const t of s.tasks) if (t.status === 'done' && t.doneAt)
    add(`task:${t.id}`, isoDate(t.doneAt), t.area, t.importance === 3 ? 30 : 20, `Mission · ${t.title}`)
  for (const f of s.sessions) if (f.endedAt && f.actualMin >= 5)
    add(`focus:${f.id}`, isoDate(f.endedAt), f.area, Math.min(30, Math.floor(f.actualMin / 2)), `Focus · ${f.label}`)
  for (const w of s.workouts) add(`workout:${w.id}`, w.date, 'physique', 15, `Workout · ${w.type}`)
  for (const d of s.daily) {
    const any = [d.weightKg, d.sleepH, d.waterL, d.proteinG, d.kcal].some((v) => v != null)
    if (any) add(`daily:${d.date}`, d.date, 'physique', 5, 'Body log')
  }
  const routineIds = new Set(s.routines.map((r) => r.id))
  const seenChecks = new Set<string>()
  for (const c of s.routineChecks) {
    const k = `routine:${c.routineId}:${c.date}`
    if (!routineIds.has(c.routineId) || seenChecks.has(k)) continue
    seenChecks.add(k)
    add(k, c.date, 'looks', 3, `Routine · ${s.routines.find((r) => r.id === c.routineId)?.name}`)
  }
  for (const e of s.evolution) add(`evo:${e.id}`, e.date, e.area, e.photoId ? 15 : 10, `Evolution · ${e.title}`)
  for (const date of new Set(s.transactions.map((t) => t.date))) add(`money:${date}`, date, 'wealth', 4, 'Money logged')
  for (const r of s.reading) add(`read:${r.id}`, r.date, 'mind', Math.min(20, Math.floor(r.minutes / 3)), `Reading · ${r.title}`)
  for (const i of s.interactions) add(`social:${i.id}`, i.date, 'social', i.initiated ? 14 : 8, i.initiated ? 'Initiated interaction' : 'Interaction')
  for (const c of s.challenges) if (c.status === 'done' && c.doneAt)
    add(`challenge:${c.id}`, isoDate(c.doneAt), 'social', 40, `Challenge · ${c.title}`)
  for (const p of s.projects) {
    if (p.promotedAt) add(`promote:${p.id}`, isoDate(p.promotedAt), 'lab', 15, `Promoted · ${p.title}`)
    for (const m of p.milestones) if (m.done && m.doneAt)
      add(`milestone:${p.id}:${m.id}`, isoDate(m.doneAt), 'lab', 25, `Milestone · ${m.text}`)
    for (const x of p.experiments) add(`exp:${x.id}`, x.date, 'lab', 10, `Experiment · ${p.title}`)
  }
  for (const m of s.milestones) if (m.doneAt) add(`pm:${m.id}`, isoDate(m.doneAt), m.area, 50, `Milestone · ${m.title}`)
  for (const r of s.reviews) add(`review:${r.week}`, isoDate(r.createdAt), 'core', 30, 'Weekly review')

  // Weekly challenge bonuses for every week that has any activity.
  // Dated to the last activity of that week so it never appears in the future.
  const lastByWeek = new Map<string, string>()
  for (const e of ev) {
    const w = weekKey(e.date)
    if (!lastByWeek.has(w) || lastByWeek.get(w)! < e.date) lastByWeek.set(w, e.date)
  }
  for (const [w, last] of lastByWeek) for (const c of weeklyChallenges(s, w)) if (c.progress >= c.target)
    add(`wc:${w}:${c.id}`, last, c.area, 40, `Weekly challenge · ${c.title}`)

  return ev.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

// Level n needs 60·n·(n+1) total XP: 120, 360, 720, 1200 …
export const xpForLevel = (n: number) => 60 * n * (n + 1)
export function levelOf(total: number) {
  let lvl = 0
  while (total >= xpForLevel(lvl + 1)) lvl++
  const base = xpForLevel(lvl), next = xpForLevel(lvl + 1)
  return { level: lvl + 1, into: total - base, span: next - base, next }
}

export const TITLES: { level: number; title: string }[] = [
  { level: 1, title: 'Initiate' },
  { level: 3, title: 'Disciple' },
  { level: 5, title: 'Operator' },
  { level: 8, title: 'Strategist' },
  { level: 12, title: 'Architect' },
  { level: 17, title: 'Ascendant' },
  { level: 24, title: 'Sovereign' },
]
export const titleFor = (level: number) => [...TITLES].reverse().find((t) => level >= t.level)!.title

export function areaXP(ev: XPEvent[]) {
  const out = Object.fromEntries(AREAS.map((a) => [a, 0])) as Record<Area, number>
  for (const e of ev) if (e.area !== 'core') out[e.area] += e.amount
  return out
}

// ── Weekly challenges ──────────────────────────────────────────────
// Derived from your priority areas and the week; no penalty if missed.
export interface WeeklyChallenge { id: string; area: Area; title: string; target: number; progress: number }

const CHALLENGES: Record<Area, { id: string; title: string; target: number; count: (s: State, w: string) => number }> = {
  physique: { id: 'train3', title: 'Train 3 times', target: 3, count: (s, w) => s.workouts.filter((x) => inWeek(x.date, w)).length },
  looks: { id: 'routine5', title: 'Check routines on 5 days', target: 5, count: (s, w) => new Set(s.routineChecks.filter((x) => inWeek(x.date, w)).map((x) => x.date)).size },
  wealth: { id: 'money3', title: 'Log money on 3 days', target: 3, count: (s, w) => new Set(s.transactions.filter((x) => inWeek(x.date, w)).map((x) => x.date)).size },
  mind: { id: 'focus4', title: 'Finish 4 focus sessions', target: 4, count: (s, w) => s.sessions.filter((x) => x.endedAt && x.actualMin >= 5 && inWeek(isoDate(x.endedAt), w)).length },
  social: { id: 'init2', title: 'Initiate 2 interactions', target: 2, count: (s, w) => s.interactions.filter((x) => x.initiated && inWeek(x.date, w)).length },
  lab: { id: 'ship1', title: 'Close a milestone or log an experiment', target: 1, count: (s, w) => s.projects.reduce((n, p) => n + p.milestones.filter((m) => m.doneAt && inWeek(isoDate(m.doneAt), w)).length + p.experiments.filter((x) => inWeek(x.date, w)).length, 0) },
}

export function weeklyChallenges(s: State, week: string): WeeklyChallenge[] {
  const areas = (s.profile?.areas.length ? s.profile.areas : ['mind', 'physique', 'lab'] as Area[]).slice(0, 3)
  return areas.map((a) => {
    const c = CHALLENGES[a]
    return { id: c.id, area: a, title: c.title, target: c.target, progress: Math.min(c.target, c.count(s, week)) }
  })
}

// ── Skill tree nodes ───────────────────────────────────────────────
export interface SkillNode { id: string; title: string; need: string; unlocked: boolean }

export function skillTree(s: State, ax: Record<Area, number>): Record<Area, SkillNode[]> {
  const doneTasks = (a: Area) => s.tasks.filter((t) => t.area === a && t.status === 'done').length
  const n = (id: string, title: string, need: string, unlocked: boolean): SkillNode => ({ id, title, need, unlocked })
  const focusMin = s.sessions.reduce((m, f) => m + (f.endedAt ? f.actualMin : 0), 0)
  return {
    physique: [
      n('p1', 'First Rep', 'Log 1 workout', s.workouts.length >= 1),
      n('p2', 'Baseline', 'Log body data on 7 days', s.daily.length >= 7),
      n('p3', 'Engine', 'Log 20 workouts', s.workouts.length >= 20),
      n('p4', 'Iron Discipline', '500 Physique XP', ax.physique >= 500),
    ],
    looks: [
      n('l1', 'Ritual', 'Create a routine', s.routines.length >= 1),
      n('l2', 'Evidence', 'Add a looks photo', s.evolution.some((e) => e.area === 'looks' && e.photoId)),
      n('l3', 'Maintenance', '30 routine checks', s.routineChecks.length >= 30),
      n('l4', 'Refined', '400 Looks XP', ax.looks >= 400),
    ],
    wealth: [
      n('w1', 'Ledger', 'Log 1 transaction', s.transactions.length >= 1),
      n('w2', 'Net Worth Aware', 'Record a balance', s.balances.length >= 1),
      n('w3', 'Skill Stack', 'Track 3 skills', s.skills.length >= 3),
      n('w4', 'Capital', '400 Wealth XP', ax.wealth >= 400),
    ],
    mind: [
      n('m1', 'Ignition', 'Finish a focus session', s.sessions.some((f) => f.endedAt && f.actualMin >= 5)),
      n('m2', 'Deep Work', '10 focus hours', focusMin >= 600),
      n('m3', 'Finisher', 'Complete 15 missions', s.tasks.filter((t) => t.status === 'done').length >= 15),
      n('m4', 'Monk Mode', '600 Mind XP', ax.mind >= 600),
    ],
    social: [
      n('s1', 'First Move', 'Initiate 1 interaction', s.interactions.some((i) => i.initiated)),
      n('s2', 'Challenger', 'Finish a social challenge', s.challenges.some((c) => c.status === 'done')),
      n('s3', 'Presence', 'Log 20 interactions', s.interactions.length >= 20),
      n('s4', 'Magnetic Habit', '400 Social XP', ax.social >= 400),
    ],
    lab: [
      n('b1', 'Spark', 'Capture an idea', s.projects.length >= 1),
      n('b2', 'Prototype', 'Promote an idea', s.projects.some((p) => p.promotedAt)),
      n('b3', 'Shipper', 'Ship a project', s.projects.some((p) => p.stage === 'shipped')),
      n('b4', 'Builder', `${doneTasks('lab')}/10 lab missions · 500 Lab XP`, ax.lab >= 500 && doneTasks('lab') >= 10),
    ],
  }
}
