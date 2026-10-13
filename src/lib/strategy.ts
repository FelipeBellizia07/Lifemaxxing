// Strategy engine: transparent, rule-based, local. At most three priorities per day.
// Each rule adds points AND a human-readable reason, so every recommendation explains itself.

import type { Area, Energy, State, Task } from './types.ts'
import { AREA_META } from './types.ts'
import { addDays, daysBetween, fromKey, isoDate } from './date.ts'

export interface Recommendation {
  id: string
  title: string
  area: Area
  why: string[]
  action: string
  minutes: number
  score: number
  taskId?: string
  projectId?: string
}

export interface StrategyInput { state: State; today: string; energy: Energy; minutes: number }

const RE_ENTRY: Record<Area, { action: string; minutes: number }> = {
  physique: { action: 'Put on training clothes and do a 10-minute warm-up plus one working set. Log it.', minutes: 10 },
  looks: { action: 'Run your shortest routine once, then tick it off. Nothing extra.', minutes: 5 },
  wealth: { action: 'Open your bank app and log the last 3 transactions you can see.', minutes: 10 },
  mind: { action: 'Pick one page of reading or one file of code and start a 10-minute focus session.', minutes: 10 },
  social: { action: 'Send one message to someone you have meant to contact. Log it as initiated.', minutes: 5 },
  lab: { action: 'Open your project, write the next tiny step as a note, and run it once.', minutes: 15 },
}

/** Most recent date with any recorded activity per area. */
export function lastActivity(s: State): Partial<Record<Area, string>> {
  const out: Partial<Record<Area, string>> = {}
  const bump = (a: Area, d: string) => { if (!out[a] || out[a]! < d) out[a] = d }
  s.workouts.forEach((w) => bump('physique', w.date))
  s.daily.forEach((d) => bump('physique', d.date))
  s.routineChecks.forEach((c) => bump('looks', c.date))
  s.transactions.forEach((t) => bump('wealth', t.date))
  s.reading.forEach((r) => bump('mind', r.date))
  s.interactions.forEach((i) => bump('social', i.date))
  s.evolution.forEach((e) => bump(e.area, e.date))
  s.sessions.forEach((f) => f.endedAt && bump(f.area, isoDate(f.endedAt)))
  s.tasks.forEach((t) => t.doneAt && bump(t.area, isoDate(t.doneAt)))
  s.projects.forEach((p) => p.notes.forEach((n) => bump('lab', n.date)))
  return out
}

function scoreTask(t: Task, inp: StrategyInput, areaRank: (a: Area) => number, heavy: boolean): Recommendation {
  const why: string[] = []
  let score = t.importance * 10
  why.push(t.importance === 3 ? 'You marked this high importance.' : t.importance === 2 ? 'Medium importance.' : 'Low importance, but open.')

  if (t.deadline) {
    const d = daysBetween(inp.today, t.deadline)
    if (d < 0) { score += 30; why.push(`Deadline passed ${-d} day${d === -1 ? '' : 's'} ago — decide: do the first action or move the date.`) }
    else if (d <= 2) { score += 22; why.push(d === 0 ? 'Due today.' : `Due in ${d} day${d === 1 ? '' : 's'}.`) }
    else if (d <= 7) { score += 10; why.push(`Due within a week (${d} days).`) }
  }
  const rank = areaRank(t.area)
  if (rank >= 0 && rank < 3) { score += [12, 8, 5][rank]; why.push(`${AREA_META[t.area].label} is priority #${rank + 1} for you.`) }
  if (t.postponed >= 2) { score += 8; why.push(`Postponed ${t.postponed} times. The fix is a smaller start, not more willpower.`) }

  const est = t.estimateMin ?? 0
  let minutes = t.firstActionMin
  if (inp.energy === 'low') {
    if (t.firstActionMin <= 10) { score += 6; why.push('Low energy today: this starts in 10 minutes or less.') }
    else score -= 4
  } else if (inp.energy === 'high' && t.importance === 3) {
    score += 6; why.push('High energy today: good day for the hard one.')
    if (est && est <= inp.minutes) minutes = est
  }
  if (est > inp.minutes) why.push(`Full task (~${est} min) exceeds today's ${inp.minutes} min — only the first action is planned.`)
  if (heavy && t.importance < 3 && !t.deadline) score -= 6

  return { id: `task:${t.id}`, title: t.title, area: t.area, why, action: t.firstAction || `Define the first 10-minute action for "${t.title}".`, minutes, score, taskId: t.id }
}

export function recommend(inp: StrategyInput): Recommendation[] {
  const { state: s, today } = inp
  const areas = s.profile?.areas ?? []
  const areaRank = (a: Area) => areas.indexOf(a)

  const open = s.tasks.filter((t) => t.status === 'open' && !(t.snoozedUntil && t.snoozedUntil > today))
  const dueThisWeek = open.filter((t) => t.deadline && daysBetween(today, t.deadline) <= 7).length
  const heavy = dueThisWeek >= 5
  const cands: Recommendation[] = open.map((t) => scoreTask(t, inp, areaRank, heavy))
  if (heavy) cands.forEach((c) => c.taskId && c.why.push(`Heavy week: ${dueThisWeek} deadlines in 7 days, so optional work is ranked down.`))

  // Priority areas with nothing recorded recently.
  const last = lastActivity(s)
  areas.slice(0, 3).forEach((a, i) => {
    const l = last[a]
    const gap = l ? daysBetween(l, today) : null
    if (gap !== null && gap < 4) return
    const r = RE_ENTRY[a]
    cands.push({
      id: `reentry:${a}`, area: a, title: `Re-enter ${AREA_META[a].label}`,
      why: [
        gap === null ? `Priority #${i + 1}, and nothing is recorded here yet.` : `Priority #${i + 1}; last activity was ${gap} days ago.`,
        'A small restart keeps the area alive. No catching up required.',
      ],
      action: r.action, minutes: r.minutes, score: 14 + (3 - i) * 3 + (inp.energy === 'low' ? 4 : 0),
    })
  })

  // Active projects with an unresolved blocker.
  for (const p of s.projects) {
    if (p.stage !== 'active' && p.stage !== 'prototype') continue
    const b = p.blockers.find((x) => !x.resolved)
    if (!b) continue
    cands.push({
      id: `blocker:${p.id}`, area: 'lab', projectId: p.id, title: `Unblock ${p.title}`,
      why: [`Open blocker: "${b.text}".`, 'Blocked projects stall everything downstream.'],
      action: 'Write the blocker as a single question, then spend 15 minutes on the smallest experiment that answers it.',
      minutes: 15, score: 18 + (areaRank('lab') >= 0 && areaRank('lab') < 3 ? 6 : 0),
    })
  }

  // Weekly review at the edge of the week.
  const dow = fromKey(today).getDay()
  const weekStart = addDays(today, -((dow + 6) % 7))
  const reviewed = s.reviews.some((r) => r.week === weekStart)
  if ((dow === 0 || dow === 6) && !reviewed) cands.push({
    id: 'review', area: 'mind', title: 'Weekly review',
    why: ['End of the week. Ten minutes of review makes next week\'s plan obvious.'],
    action: 'Open Progression → Weekly review and write one win, one friction point, one focus.', minutes: 10, score: 20,
  })

  // Pick: highest score, prefer distinct areas, respect the time budget.
  cands.sort((a, b) => b.score - a.score)
  const max = inp.energy === 'low' ? 2 : 3
  const picked: Recommendation[] = []
  let budget = inp.minutes
  for (const c of cands) {
    if (picked.length >= max) break
    if (c.minutes > budget && picked.length > 0) continue
    const sameArea = picked.some((p) => p.area === c.area)
    if (sameArea && cands.some((o) => !picked.includes(o) && o !== c && o.area !== c.area && !picked.some((p) => p.area === o.area) && o.score >= c.score - 10)) continue
    picked.push(c)
    budget -= c.minutes
  }
  return picked
}
