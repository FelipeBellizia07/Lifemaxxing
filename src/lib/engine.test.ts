import { test } from 'node:test'
import assert from 'node:assert/strict'
import { emptyState, type State, type Task } from './types.ts'
import { levelOf, xpEvents, xpForLevel } from './xp.ts'
import { recommend } from './strategy.ts'

const task = (o: Partial<Task>): Task => ({
  id: 't' + Math.random(), title: 'T', area: 'mind', importance: 2, firstAction: 'Open file', firstActionMin: 10,
  steps: [], status: 'open', postponed: 0, origin: 'user', createdAt: '2026-10-01T10:00:00.000Z', ...o,
})

test('XP is deterministic and each record pays once', () => {
  const s: State = { ...emptyState(), tasks: [task({ id: 'a', status: 'done', doneAt: '2026-10-05T10:00:00.000Z', importance: 3 })] }
  s.routines = [{ id: 'r', name: 'Skin', kind: 'skin', steps: '', cadence: 'daily' }]
  s.routineChecks = [{ routineId: 'r', date: '2026-10-05' }, { routineId: 'r', date: '2026-10-05' }]
  const ev = xpEvents(s)
  assert.equal(new Set(ev.map((e) => e.key)).size, ev.length, 'no duplicate keys')
  assert.equal(ev.find((e) => e.key === 'task:a')!.amount, 30)
  assert.equal(ev.filter((e) => e.key.startsWith('routine:')).length, 1, 'duplicate check pays once')
  assert.deepEqual(xpEvents(s), ev)
  s.tasks[0].status = 'open'
  assert.equal(xpEvents(s).some((e) => e.key === 'task:a'), false, 'un-completing removes XP')
})

test('levels', () => {
  assert.equal(levelOf(0).level, 1)
  assert.equal(levelOf(xpForLevel(1)).level, 2)
  assert.equal(levelOf(xpForLevel(1) - 1).level, 1)
})

test('strategy returns at most three, ranked, with reasons', () => {
  const s: State = { ...emptyState(), tasks: [
    task({ id: 'urgent', deadline: '2026-10-12', importance: 3 }),
    task({ id: 'low', importance: 1 }),
    task({ id: 'snoozed', importance: 3, snoozedUntil: '2026-10-13' }),
    task({ id: 'x2', area: 'lab' }), task({ id: 'x3', area: 'wealth' }), task({ id: 'x4', area: 'social' }),
  ] }
  const r = recommend({ state: s, today: '2026-10-12', energy: 'medium', minutes: 60 })
  assert.ok(r.length <= 3)
  assert.equal(r[0].taskId, 'urgent')
  assert.ok(r.every((x) => x.why.length > 0 && x.action))
  assert.ok(!r.some((x) => x.taskId === 'snoozed'))
  assert.ok(recommend({ state: s, today: '2026-10-12', energy: 'low', minutes: 60 }).length <= 2)
})

import { mergeStates } from './merge.ts'

test('three-way merge: adds union, deletes propagate, local wins conflicts', () => {
  const w = (id: string, type = 'Push') => ({ id, date: '2026-10-10', type, durationMin: 60, notes: '' })
  const base: State = { ...emptyState(), workouts: [w('a'), w('b'), w('c')] }
  const pc: State = { ...emptyState(), workouts: [w('a', 'Legs'), w('b'), w('c'), w('pc')] } // edit a, add pc
  const phone: State = { ...emptyState(), workouts: [w('a', 'Pull'), w('c', 'Cardio'), w('ph')] } // edit a, delete b, edit c, add ph
  const m = mergeStates(base, pc, phone)
  const byId = Object.fromEntries(m.workouts.map((x) => [x.id, x.type]))
  assert.deepEqual(Object.keys(byId).sort(), ['a', 'c', 'pc', 'ph'], 'b deleted on phone stays deleted')
  assert.equal(byId.a, 'Legs', 'conflict → local wins')
  assert.equal(byId.c, 'Cardio', 'remote-only edit is taken')
  // first sync (no base): pure union
  assert.equal(mergeStates(null, pc, phone).workouts.length, 5)
  // deleting a record the other side edited keeps the edit
  const m2 = mergeStates(base, { ...emptyState(), workouts: [w('a'), w('c')] }, { ...emptyState(), workouts: [w('a'), w('b', 'Legs'), w('c')] })
  assert.ok(m2.workouts.some((x) => x.id === 'b'), 'edit beats delete')
})
