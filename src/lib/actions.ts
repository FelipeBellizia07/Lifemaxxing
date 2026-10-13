// Pure state transitions shared across modules.

import type { Area, BlockerKind, FocusSession, State, Task } from './types.ts'
import { addDays, today, uid } from './date.ts'

export const newTask = (p: Partial<Task> & { title: string; area: Area }): Task => ({
  id: uid(), importance: 2, firstAction: '', firstActionMin: 10, steps: [], status: 'open', postponed: 0,
  origin: 'user', createdAt: new Date().toISOString(), ...p,
})

export const setTask = (s: State, id: string, patch: Partial<Task>): State =>
  ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })

export const toggleTask = (s: State, id: string): State => {
  const t = s.tasks.find((x) => x.id === id)
  if (!t) return s
  return setTask(s, id, t.status === 'done' ? { status: 'open', doneAt: undefined } : { status: 'done', doneAt: new Date().toISOString() })
}

/** "Not today": no penalty, it just comes back tomorrow and the engine suggests a smaller start. */
export const postpone = (s: State, id: string): State => {
  const t = s.tasks.find((x) => x.id === id)
  return t ? setTask(s, id, { postponed: t.postponed + 1, snoozedUntil: addDays(today(), 1) }) : s
}

export const startSession = (s: State, p: { label: string; area: Area; plannedMin: number; taskId?: string }): State => {
  const f: FocusSession = { id: uid(), ...p, startedAt: new Date().toISOString(), actualMin: 0, interruptions: [] }
  return { ...s, sessions: [...s.sessions, f], activeSessionId: f.id }
}

export const logInterruption = (s: State, kind: BlockerKind, note: string): State => ({
  ...s,
  sessions: s.sessions.map((f) => (f.id === s.activeSessionId ? { ...f, interruptions: [...f.interruptions, { at: new Date().toISOString(), kind, note }] } : f)),
})

export const endSession = (s: State, blocker?: BlockerKind, completeTask = false): State => {
  const f = s.sessions.find((x) => x.id === s.activeSessionId)
  if (!f) return { ...s, activeSessionId: undefined }
  const end = new Date()
  const actualMin = Math.max(0, Math.round((end.getTime() - new Date(f.startedAt).getTime()) / 60000))
  let next: State = {
    ...s,
    activeSessionId: undefined,
    sessions: s.sessions.map((x) => (x.id === f.id ? { ...x, endedAt: end.toISOString(), actualMin, blocker } : x)),
  }
  if (completeTask && f.taskId) next = setTask(next, f.taskId, { status: 'done', doneAt: end.toISOString() })
  return next
}

export const cancelSession = (s: State): State =>
  ({ ...s, sessions: s.sessions.filter((x) => x.id !== s.activeSessionId), activeSessionId: undefined })

export const BLOCKERS: { id: BlockerKind; label: string }[] = [
  { id: 'phone', label: 'Phone / feeds' },
  { id: 'unclear', label: 'Unclear next step' },
  { id: 'too-big', label: 'Task felt too big' },
  { id: 'tired', label: 'Low energy' },
  { id: 'environment', label: 'Environment / noise' },
  { id: 'perfectionism', label: 'Perfectionism' },
  { id: 'other', label: 'Other' },
]

/** Personalized suggested missions. Shown as suggestions; adopting one copies it into your own list. */
export const SUGGESTED: (Omit<Partial<Task>, 'area'> & { title: string; area: Area })[] = [
  { area: 'lab', title: 'Ship a tiny Claude Code tool you actually use', firstAction: 'Create an empty repo and ask Claude Code to scaffold a one-file CLI that solves one annoyance.', firstActionMin: 15, importance: 3 },
  { area: 'lab', title: 'Write a CLAUDE.md for your main project', firstAction: 'List the 5 commands you run most and the 3 rules Claude keeps breaking.', firstActionMin: 10 },
  { area: 'mind', title: 'Learn one TypeScript concept deeply', firstAction: 'Pick generics or narrowing. Read one docs page, write one 10-line example.', firstActionMin: 15 },
  { area: 'mind', title: 'Read 20 pages of a serious book', firstAction: 'Put the phone in another room and read 5 pages.', firstActionMin: 10 },
  { area: 'physique', title: 'Establish a 3-day training split', firstAction: 'Write down Push / Pull / Legs with 4 exercises each.', firstActionMin: 10, importance: 3 },
  { area: 'physique', title: 'Find your maintenance calories', firstAction: 'Log weight this morning and everything you eat today, no changes.', firstActionMin: 5 },
  { area: 'looks', title: 'Build a minimal skincare routine', firstAction: 'Write: cleanser, moisturizer, sunscreen. Check what you already own.', firstActionMin: 5 },
  { area: 'looks', title: 'Take baseline progress photos', firstAction: 'Same spot, same light, front and side. Add them to Evolution.', firstActionMin: 10 },
  { area: 'wealth', title: 'Know your real monthly burn', firstAction: 'Export last month from your bank and total the 5 biggest categories.', firstActionMin: 15, importance: 3 },
  { area: 'wealth', title: 'Price one skill as a service', firstAction: 'Find 3 listings for a service you could offer and note the price range.', firstActionMin: 15 },
  { area: 'social', title: 'Start one conversation with someone new', firstAction: 'Decide where: gym, class, online community. Pick the place, not the person.', firstActionMin: 5 },
  { area: 'social', title: 'Reconnect with an old friend', firstAction: 'Send a two-line message referencing something you shared.', firstActionMin: 5 },
]
