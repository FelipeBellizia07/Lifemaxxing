import { useState } from 'react'
import { Check, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../lib/store.tsx'
import type { Interaction } from '../lib/types.ts'
import { addDays, fmtShort, today, uid, weekKey } from '../lib/date.ts'
import { AnimatedNumber, Btn, Chip, EmptyState, Field, IconBtn, Panel, Stat, useConfirm } from '../components/ui.tsx'
import { ModuleHeader, Tabs } from '../components/Module.tsx'
import { Missions } from './Mind.tsx'

const CHALLENGE_IDEAS = [
  'Ask one person a genuine follow-up question every day this week',
  'Invite someone to train, study, or eat together',
  'Speak first in one group setting',
  'Give one specific compliment about effort, not looks',
  'Share a project you built with three people',
]

const KINDS: { id: Interaction['kind']; label: string }[] = [
  { id: 'conversation', label: 'Conversation' }, { id: 'reconnect', label: 'Reconnect' }, { id: 'event', label: 'Event / group' }, { id: 'ask', label: 'Asked for something' }, { id: 'other', label: 'Other' },
]

export function Social() {
  const { state } = useStore()
  const [tab, setTab] = useState<'log' | 'challenges' | 'missions'>('log')
  const w = weekKey(today())
  const thisWeek = state.interactions.filter((i) => weekKey(i.date) === w)
  return (
    <>
      <ModuleHeader area="social">
        <div className="grid max-w-3xl grid-cols-3 gap-6">
          <Stat label="Initiated · week" value={<AnimatedNumber value={thisWeek.filter((i) => i.initiated).length} />} />
          <Stat label="Interactions · week" value={<AnimatedNumber value={thisWeek.length} />} />
          <Stat label="Challenges done" value={<AnimatedNumber value={state.challenges.filter((c) => c.status === 'done').length} />} />
        </div>
      </ModuleHeader>
      <p className="mt-6 max-w-2xl text-sm text-ash">This module measures only what you control: showing up, starting, following through. It never tracks popularity, matches, or anyone's opinion of you.</p>
      <div className="mt-6"><Tabs tabs={[{ id: 'log', label: 'Interactions' }, { id: 'challenges', label: 'Challenges' }, { id: 'missions', label: 'Missions' }]} value={tab} onChange={setTab} /></div>
      <div className="mt-8">
        {tab === 'log' && <Log />}
        {tab === 'challenges' && <Challenges />}
        {tab === 'missions' && <Missions area="social" />}
      </div>
    </>
  )
}

function Log() {
  const { state, update, toast } = useStore()
  const [f, setF] = useState({ date: today(), kind: 'conversation' as Interaction['kind'], initiated: true, note: '', reflection: '' })
  const { ask, node } = useConfirm()
  const list = [...state.interactions].sort((a, b) => b.date.localeCompare(a.date))
  const days = Array.from({ length: 28 }, (_, i) => addDays(today(), i - 27))
  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
      <Panel kicker="Log" title="Interaction" className="h-fit">
        <form className="space-y-5" onSubmit={(e) => {
          e.preventDefault()
          if (!f.note.trim()) return
          update((s) => ({ ...s, interactions: [...s.interactions, { id: uid(), date: f.date, kind: f.kind, initiated: f.initiated, note: f.note.trim(), reflection: f.reflection.trim() }] }))
          setF({ ...f, note: '', reflection: '' })
          toast(`Logged · +${f.initiated ? 14 : 8} XP`)
        }}>
          <div className="flex flex-wrap gap-1">{KINDS.map((k) => <Chip key={k.id} active={f.kind === k.id} onClick={() => setF({ ...f, kind: k.id })}>{k.label}</Chip>)}</div>
          <div className="flex gap-1"><Chip active={f.initiated} onClick={() => setF({ ...f, initiated: true })}>I initiated</Chip><Chip active={!f.initiated} onClick={() => setF({ ...f, initiated: false })}>They did</Chip></div>
          <Field label="What happened"><input className="field" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Talked to the guy at the squat rack about programming" required /></Field>
          <Field label="Reflection" hint="what you'd repeat or change"><textarea className="field min-h-[60px] font-serif text-lg italic" value={f.reflection} onChange={(e) => setF({ ...f, reflection: e.target.value })} /></Field>
          <Field label="Date"><input type="date" className="field num" value={f.date} max={today()} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Btn type="submit" variant="primary" className="w-full" disabled={!f.note.trim()}><Plus size={14} />Log</Btn>
        </form>
      </Panel>
      <div>
        <div className="kicker mb-2">Initiative · last 28 days</div>
        <div className="mb-8 grid grid-cols-[repeat(28,minmax(0,1fr))] gap-[3px]" aria-label="Initiative heat strip">
          {days.map((d) => {
            const n = state.interactions.filter((i) => i.date === d && i.initiated).length
            return <div key={d} title={`${d}: ${n} initiated`} className="aspect-square" style={{ background: n ? `color-mix(in srgb, var(--volt) ${Math.min(100, 35 + n * 25)}%, transparent)` : 'rgba(255,255,255,0.05)' }} />
          })}
        </div>
        {list.length === 0 ? <EmptyState title="No interactions yet" body="A short conversation counts. Log it while it's fresh, with one line of reflection." /> : (
          <ul className="space-y-px">
            {list.map((i) => (
              <li key={i.id} className="panel tex-social flex items-start gap-4 p-4">
                <span className="num w-14 shrink-0 text-xs text-ash">{fmtShort(i.date)}</span>
                <div className="min-w-0 flex-1">
                  <div className="kicker"><span className={i.initiated ? 'text-volt' : ''}>{i.initiated ? 'Initiated' : 'Responded'}</span> · {KINDS.find((k) => k.id === i.kind)?.label}</div>
                  <div className="mt-1 text-sm">{i.note}</div>
                  {i.reflection && <p className="mt-1 font-serif text-lg italic text-bone/75">“{i.reflection}”</p>}
                </div>
                <IconBtn label="Delete interaction" onClick={() => ask(() => update((s) => ({ ...s, interactions: s.interactions.filter((x) => x.id !== i.id) })), 'Delete interaction?')}><Trash2 size={14} /></IconBtn>
              </li>
            ))}
          </ul>
        )}
      </div>
      {node}
    </div>
  )
}

function Challenges() {
  const { state, update, celebrate } = useStore()
  const [title, setTitle] = useState('')
  const [why, setWhy] = useState('')
  const { ask, node } = useConfirm()
  const active = state.challenges.filter((c) => c.status === 'active')
  const done = state.challenges.filter((c) => c.status === 'done')
  const add = (t: string, w = '') => update((s) => ({ ...s, challenges: [...s.challenges, { id: uid(), title: t, why: w, status: 'active', createdAt: new Date().toISOString() }] }))
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-8">
        <div>
          <div className="kicker mb-3">Active</div>
          {active.length === 0 ? <EmptyState title="No active challenge" body="Choose one you'd feel slightly nervous about. One at a time is plenty." /> : (
            <div className="space-y-px">
              {active.map((c) => (
                <div key={c.id} className="panel tex-social flex items-start gap-4 p-5">
                  <button aria-label={`Complete ${c.title}`} onClick={() => { update((s) => ({ ...s, challenges: s.challenges.map((x) => (x.id === c.id ? { ...x, status: 'done', doneAt: new Date().toISOString() } : x)) })); celebrate({ kind: 'milestone', title: c.title, xp: 40, sub: 'Social challenge completed' }) }}
                    className="flex h-10 w-10 shrink-0 items-center justify-center border border-line2 hover:border-volt cursor-pointer"><Check size={16} /></button>
                  <div className="min-w-0 flex-1"><div className="display text-2xl">{c.title}</div>{c.why && <p className="mt-1 text-sm text-ash">{c.why}</p>}</div>
                  <IconBtn label="Delete challenge" onClick={() => ask(() => update((s) => ({ ...s, challenges: s.challenges.filter((x) => x.id !== c.id) })), 'Delete challenge?')}><Trash2 size={14} /></IconBtn>
                </div>
              ))}
            </div>
          )}
        </div>
        {done.length > 0 && (
          <div>
            <div className="kicker mb-3">Completed</div>
            <ul className="space-y-1">{done.map((c) => <li key={c.id} className="flex justify-between border-b border-line py-2 text-sm"><span className="text-bone/80">{c.title}</span><span className="num text-xs text-ash">{c.doneAt?.slice(0, 10)}</span></li>)}</ul>
          </div>
        )}
      </div>
      <div className="space-y-6">
        <Panel kicker="Your choice" title="New challenge">
          <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); if (!title.trim()) return; add(title.trim(), why.trim()); setTitle(''); setWhy('') }}>
            <Field label="Challenge"><input className="field" value={title} onChange={(e) => setTitle(e.target.value)} required /></Field>
            <Field label="Why it matters to you"><input className="field" value={why} onChange={(e) => setWhy(e.target.value)} /></Field>
            <Btn type="submit" variant="primary" className="w-full" disabled={!title.trim()}><Plus size={14} />Accept</Btn>
          </form>
        </Panel>
        <div>
          <div className="kicker mb-2">Ideas · tap to adopt</div>
          <div className="space-y-1">
            {CHALLENGE_IDEAS.filter((i) => !state.challenges.some((c) => c.title === i)).map((i) => (
              <button key={i} onClick={() => add(i)} className="block w-full border border-dashed border-line2 px-3 py-2 text-left text-sm text-ash hover:border-volt hover:text-bone cursor-pointer">{i}</button>
            ))}
          </div>
        </div>
      </div>
      {node}
    </div>
  )
}
