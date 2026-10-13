import { useMemo, useState } from 'react'
import { Check, ChevronDown, Play, Plus, SkipForward, Trash2 } from 'lucide-react'
import { Bar as RBar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from '../lib/store.tsx'
import { AREAS, AREA_META, type Area, type Task } from '../lib/types.ts'
import { addDays, fmtShort, isoDate, today, uid } from '../lib/date.ts'
import { BLOCKERS, newTask, postpone, setTask, startSession, toggleTask } from '../lib/actions.ts'
import { Btn, Chip, EmptyState, Field, IconBtn, Panel, Stat, AnimatedNumber, useConfirm, numOrUndef } from '../components/ui.tsx'
import { AREA_TONE, ModuleHeader, Tabs } from '../components/Module.tsx'

type Tab = 'missions' | 'focus' | 'reading'

export const chartTooltip = { contentStyle: { background: '#0d0d0e', border: '1px solid rgba(236,235,230,.18)', borderRadius: 0, fontFamily: 'JetBrains Mono', fontSize: 11 }, labelStyle: { color: '#8d8c87' } }

export function Mind() {
  const { state } = useStore()
  const [tab, setTab] = useState<Tab>('missions')
  const week = state.sessions.filter((f) => f.endedAt && isoDate(f.endedAt) >= addDays(today(), -6))
  const mins = week.reduce((n, f) => n + f.actualMin, 0)
  return (
    <>
      <ModuleHeader area="mind">
        <div className="grid max-w-3xl grid-cols-3 gap-6">
          <Stat label="Focus · 7 days" value={<AnimatedNumber value={mins / 60} decimals={1} />} unit="h" />
          <Stat label="Open missions" value={<AnimatedNumber value={state.tasks.filter((t) => t.status === 'open').length} />} />
          <Stat label="Completed" value={<AnimatedNumber value={state.tasks.filter((t) => t.status === 'done').length} />} />
        </div>
      </ModuleHeader>
      <div className="mt-8"><Tabs tabs={[{ id: 'missions', label: 'Missions' }, { id: 'focus', label: 'Focus & blockers' }, { id: 'reading', label: 'Reading' }]} value={tab} onChange={setTab} /></div>
      <div className="mt-8">
        {tab === 'missions' && <Missions />}
        {tab === 'focus' && <FocusLab />}
        {tab === 'reading' && <Reading />}
      </div>
    </>
  )
}

/** Mission list with decomposition. Reused by other modules with an area filter. */
export function Missions({ area }: { area?: Area }) {
  const { state, update } = useStore()
  const [show, setShow] = useState<'open' | 'done'>('open')
  const list = state.tasks.filter((t) => (!area || t.area === area) && t.status === show)
    .sort((a, b) => (a.deadline ?? '9999') .localeCompare(b.deadline ?? '9999') || b.importance - a.importance)
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div>
        <div className="mb-4 flex gap-2">
          <Chip active={show === 'open'} onClick={() => setShow('open')}>Open</Chip>
          <Chip active={show === 'done'} onClick={() => setShow('done')}>Done</Chip>
        </div>
        {list.length === 0
          ? <EmptyState title={show === 'open' ? 'No open missions' : 'Nothing completed yet'} body={show === 'open' ? 'Add one on the right. Give it a first action you could start in 10 minutes.' : 'Completed missions land here with their XP.'} />
          : <div className="space-y-px">{list.map((t) => <TaskRow key={t.id} t={t} />)}</div>}
      </div>
      <TaskForm area={area} onAdd={(t) => update((s) => ({ ...s, tasks: [...s.tasks, t] }))} />
    </div>
  )
}

function TaskForm({ area, onAdd }: { area?: Area; onAdd: (t: Task) => void }) {
  const { toast } = useStore()
  const blank = { title: '', firstAction: '', firstActionMin: 10, area: area ?? 'mind' as Area, importance: 2 as Task['importance'], deadline: '', estimateMin: '' }
  const [f, setF] = useState(blank)
  return (
    <Panel kicker="Decompose" title="New mission" className="h-fit lg:sticky lg:top-6">
      <form className="space-y-5" onSubmit={(e) => {
        e.preventDefault()
        if (!f.title.trim() || !f.firstAction.trim()) return
        onAdd(newTask({ title: f.title.trim(), area: f.area, firstAction: f.firstAction.trim(), firstActionMin: f.firstActionMin, importance: f.importance, deadline: f.deadline || undefined, estimateMin: numOrUndef(f.estimateMin) }))
        setF({ ...blank, area: f.area })
        toast('Mission added')
      }}>
        <Field label="Mission"><input className="field" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Ship the login screen" required /></Field>
        <Field label="First action" hint="required · physical, specific">
          <textarea className="field min-h-[64px] resize-y" value={f.firstAction} onChange={(e) => setF({ ...f, firstAction: e.target.value })} placeholder="Open the repo and write the component skeleton" required />
        </Field>
        <div>
          <div className="kicker mb-2">First action length</div>
          <div className="flex gap-1">{[5, 10, 15].map((m) => <Chip key={m} active={f.firstActionMin === m} onClick={() => setF({ ...f, firstActionMin: m })}>{m} min</Chip>)}</div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {!area && <Field label="Area"><select className="field" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value as Area })}>{AREAS.map((a) => <option key={a} value={a}>{AREA_META[a].label}</option>)}</select></Field>}
          <Field label="Importance"><select className="field" value={f.importance} onChange={(e) => setF({ ...f, importance: Number(e.target.value) as Task['importance'] })}><option value={1}>Low</option><option value={2}>Medium</option><option value={3}>High</option></select></Field>
          <Field label="Deadline"><input type="date" className="field num" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></Field>
          <Field label="Full estimate" hint="min"><input inputMode="numeric" className="field num" value={f.estimateMin} onChange={(e) => setF({ ...f, estimateMin: e.target.value })} placeholder="—" /></Field>
        </div>
        <Btn type="submit" variant="primary" className="w-full" disabled={!f.title.trim() || !f.firstAction.trim()}><Plus size={14} />Add mission</Btn>
      </form>
    </Panel>
  )
}

function TaskRow({ t }: { t: Task }) {
  const { update, celebrate, toast } = useStore()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState('')
  const { ask, node } = useConfirm()
  const doneSteps = t.steps.filter((s) => s.done).length
  const overdue = t.deadline && t.status === 'open' && t.deadline < today()
  return (
    <div className="panel">
      <div className="flex items-start gap-3 p-4">
        <button
          aria-label={t.status === 'done' ? 'Mark open' : 'Mark done'}
          onClick={() => {
            update((s) => toggleTask(s, t.id))
            if (t.status === 'open') t.importance === 3 ? celebrate({ kind: 'mission', title: t.title, xp: 30 }) : toast('Mission complete · +20 XP')
          }}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border transition-colors cursor-pointer ${t.status === 'done' ? 'border-acc bg-acc text-acc-ink' : 'border-line2 hover:border-acc'}`}
        >{t.status === 'done' && <Check size={12} strokeWidth={3} />}</button>
        <button className="min-w-0 flex-1 text-left cursor-pointer" onClick={() => setOpen(!open)} aria-expanded={open}>
          <div className={`text-[15px] ${t.status === 'done' ? 'text-ash line-through' : ''}`}>{t.title}</div>
          <div className="kicker mt-1 flex flex-wrap gap-x-3 gap-y-1">
            <span className={AREA_TONE[t.area]}>{AREA_META[t.area].label}</span>
            <span>{['', 'Low', 'Med', 'High'][t.importance]}</span>
            {t.deadline && <span className={overdue ? 'text-red-300' : ''}>Due {fmtShort(t.deadline)}</span>}
            {t.steps.length > 0 && <span>{doneSteps}/{t.steps.length} steps</span>}
            {t.postponed > 0 && <span>Postponed {t.postponed}×</span>}
            {t.origin === 'suggested' && <span>Adopted suggestion</span>}
          </div>
        </button>
        <ChevronDown size={16} className={`mt-1 shrink-0 text-ash transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && (
        <div className="enter border-t border-line p-4 pl-12">
          <div className="border-l-2 border-acc pl-3 text-sm"><span className="kicker mr-2 text-acc">First · {t.firstActionMin}m</span>{t.firstAction}</div>
          <div className="mt-4 space-y-1.5">
            {t.steps.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="accent-[var(--acc)]" checked={s.done} onChange={() => update((st) => setTask(st, t.id, { steps: t.steps.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)) }))} />
                <span className={s.done ? 'text-ash line-through' : ''}>{s.text}</span>
                <IconBtn label="Remove step" className="ml-auto h-6 w-6" onClick={() => update((st) => setTask(st, t.id, { steps: t.steps.filter((x) => x.id !== s.id) }))}><Trash2 size={12} /></IconBtn>
              </label>
            ))}
          </div>
          <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!step.trim()) return; update((st) => setTask(st, t.id, { steps: [...t.steps, { id: uid(), text: step.trim(), done: false }] })); setStep('') }}>
            <input className="field text-sm" value={step} onChange={(e) => setStep(e.target.value)} placeholder="Break it down: add a step" />
            <Btn size="sm" type="submit" disabled={!step.trim()}>Add</Btn>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            {t.status === 'open' && <Btn size="sm" variant="primary" onClick={() => update((s) => startSession(s, { label: t.title, area: t.area, plannedMin: t.firstActionMin, taskId: t.id }))}><Play size={12} />Start {t.firstActionMin} min</Btn>}
            {t.status === 'open' && <Btn size="sm" variant="ghost" onClick={() => { update((s) => postpone(s, t.id)); toast('Back tomorrow. No penalty.') }}><SkipForward size={12} />Not today</Btn>}
            <Btn size="sm" variant="ghost" className="ml-auto" onClick={() => ask(() => update((s) => ({ ...s, tasks: s.tasks.filter((x) => x.id !== t.id) })), 'Delete mission?', `"${t.title}" and any XP it earned will be removed.`)}><Trash2 size={12} />Delete</Btn>
          </div>
        </div>
      )}
      {node}
    </div>
  )
}

function FocusLab() {
  const { state, update } = useStore()
  const [label, setLabel] = useState('')
  const [min, setMin] = useState(15)
  const [area, setArea] = useState<Area>('mind')
  const ended = state.sessions.filter((f) => f.endedAt).sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const d = addDays(today(), i - 13)
    return { d: fmtShort(d), min: ended.filter((f) => isoDate(f.endedAt!) === d).reduce((n, f) => n + f.actualMin, 0) }
  }), [ended])
  const blockers = useMemo(() => {
    const c = new Map<string, number>()
    for (const f of ended) {
      if (f.blocker) c.set(f.blocker, (c.get(f.blocker) ?? 0) + 1)
      for (const i of f.interruptions) c.set(i.kind, (c.get(i.kind) ?? 0) + 1)
    }
    return BLOCKERS.map((b) => ({ ...b, n: c.get(b.id) ?? 0 })).filter((b) => b.n > 0).sort((a, b) => b.n - a.n)
  }, [ended])
  const maxB = Math.max(1, ...blockers.map((b) => b.n))
  const interruptions = ended.flatMap((f) => f.interruptions.map((i) => ({ ...i, label: f.label }))).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12)
  const advice: Record<string, string> = {
    phone: 'Phone is your top blocker. Next session, start with the phone in another room — that is the whole fix.',
    unclear: 'Unclear next steps stall you most. Before ending each session, write the next first action.',
    'too-big': 'Tasks feel too big. Split the mission into steps until one fits in 10 minutes.',
    tired: 'Energy is the limiter. Set energy to Low on Home and the engine will pick shorter starts.',
    environment: 'Environment interrupts you. Pick one fixed place and time for focus.',
    perfectionism: 'Perfectionism blocks you. Aim for an ugly first version; edit in a second session.',
    other: 'Look at your notes in the interruption log for the pattern.',
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel kicker="Free session" title="Start focus">
        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); if (!label.trim()) return; update((s) => startSession(s, { label: label.trim(), area, plannedMin: min })); setLabel('') }}>
          <Field label="What are you working on?"><input className="field" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Chapter 3 / auth bug / sketching" /></Field>
          <div className="flex flex-wrap gap-1">{[5, 10, 15, 25, 45, 60, 90].map((m) => <Chip key={m} active={min === m} onClick={() => setMin(m)}>{m}m</Chip>)}</div>
          <Field label="Area"><select className="field" value={area} onChange={(e) => setArea(e.target.value as Area)}>{AREAS.map((a) => <option key={a} value={a}>{AREA_META[a].label}</option>)}</select></Field>
          <Btn type="submit" variant="primary" disabled={!label.trim()}><Play size={14} />Enter focus</Btn>
        </form>
      </Panel>
      <Panel kicker="Last 14 days" title="Focus minutes">
        {ended.length === 0 ? <EmptyState title="No sessions yet" body="Your first finished session appears here." /> : (
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={days} margin={{ left: -24, right: 0, top: 8 }}>
                <XAxis dataKey="d" tickLine={false} axisLine={false} interval={1} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip {...chartTooltip} />
                <RBar dataKey="min" fill="var(--violet)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>
      <Panel kicker="Pattern detection" title="Common blockers">
        {blockers.length === 0 ? <p className="text-sm text-ash">Blockers you tag at the end of a session, and interruptions you log during one, are counted here.</p> : (
          <>
            <div className="space-y-3">
              {blockers.map((b) => (
                <div key={b.id}>
                  <div className="flex justify-between text-sm"><span>{b.label}</span><span className="num text-ash">{b.n}</span></div>
                  <div className="mt-1 h-[3px] bg-white/[0.07]"><div className="bar-fill h-full bg-violet" style={{ width: `${(b.n / maxB) * 100}%` }} /></div>
                </div>
              ))}
            </div>
            <p className="mt-5 border-l-2 border-violet pl-3 text-sm text-bone/90">{advice[blockers[0].id]}</p>
          </>
        )}
      </Panel>
      <Panel kicker="Interruption log" title="What pulled you away">
        {interruptions.length === 0 ? <p className="text-sm text-ash">During a focus session, tap “Interruption” to log it in two seconds without stopping.</p> : (
          <ul className="space-y-2 text-sm">
            {interruptions.map((i, k) => (
              <li key={k} className="flex gap-3 border-b border-line pb-2">
                <span className="num shrink-0 text-xs text-ash">{fmtShort(isoDate(i.at))}</span>
                <span className="min-w-0"><span className="text-violet">{BLOCKERS.find((b) => b.id === i.kind)?.label}</span>{i.note && <span className="text-ash"> — {i.note}</span>}<span className="block truncate text-xs text-ash/70">{i.label}</span></span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <div className="lg:col-span-2">
        <div className="kicker mb-3">Session history</div>
        {ended.length === 0 ? <EmptyState title="Empty" body="Start with five minutes. That counts." /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead><tr className="kicker text-left"><th className="py-2 font-normal">Date</th><th className="font-normal">Session</th><th className="font-normal">Planned</th><th className="font-normal">Actual</th><th className="font-normal">Interruptions</th></tr></thead>
              <tbody>
                {ended.slice(0, 30).map((f) => (
                  <tr key={f.id} className="border-t border-line">
                    <td className="num py-2 text-ash">{fmtShort(isoDate(f.startedAt))}</td>
                    <td className="max-w-[260px] truncate pr-3">{f.label}</td>
                    <td className="num text-ash">{f.plannedMin}m</td>
                    <td className="num">{f.actualMin}m</td>
                    <td className="num text-ash">{f.interruptions.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Reading() {
  const { state, update, toast } = useStore()
  const [f, setF] = useState({ title: '', minutes: '20', pages: '', note: '', date: today() })
  const { ask, node } = useConfirm()
  const logs = [...state.reading].sort((a, b) => b.date.localeCompare(a.date))
  const byTitle = useMemo(() => {
    const m = new Map<string, { min: number; pages: number }>()
    for (const r of state.reading) { const x = m.get(r.title) ?? { min: 0, pages: 0 }; x.min += r.minutes; x.pages += r.pages; m.set(r.title, x) }
    return [...m.entries()].sort((a, b) => b[1].min - a[1].min)
  }, [state.reading])
  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Panel kicker="Log" title="Reading session" className="h-fit">
        <form className="space-y-5" onSubmit={(e) => {
          e.preventDefault()
          const minutes = Number(f.minutes)
          if (!f.title.trim() || !(minutes > 0)) return
          update((s) => ({ ...s, reading: [...s.reading, { id: uid(), date: f.date, title: f.title.trim(), minutes, pages: Number(f.pages) || 0, note: f.note.trim() }] }))
          setF({ ...f, pages: '', note: '' })
          toast('Reading logged')
        }}>
          <Field label="Book / article / docs"><input className="field" list="titles" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></Field>
          <datalist id="titles">{byTitle.map(([t]) => <option key={t} value={t} />)}</datalist>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Minutes"><input inputMode="numeric" className="field num" value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })} /></Field>
            <Field label="Pages"><input inputMode="numeric" className="field num" value={f.pages} onChange={(e) => setF({ ...f, pages: e.target.value })} /></Field>
            <Field label="Date"><input type="date" className="field num text-xs" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          </div>
          <Field label="One idea worth keeping"><textarea className="field min-h-[60px]" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
          <Btn type="submit" variant="primary" disabled={!f.title.trim()}>Log reading</Btn>
        </form>
      </Panel>
      <div className="space-y-6">
        {byTitle.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {byTitle.slice(0, 4).map(([t, x]) => (
              <div key={t} className="panel p-4"><div className="truncate font-serif text-xl italic">{t}</div><div className="num mt-1 text-xs text-ash">{x.min} min · {x.pages} pages</div></div>
            ))}
          </div>
        )}
        {logs.length === 0 ? <EmptyState title="No reading logged" body="Books, documentation, papers — all count. Log the session and one idea from it." /> : (
          <ul className="space-y-px">
            {logs.map((r) => (
                <li key={r.id} className="panel flex items-start gap-4 p-4">
                  <span className="num w-14 shrink-0 text-xs text-ash">{fmtShort(r.date)}</span>
                  <div className="min-w-0 flex-1"><div>{r.title}</div><div className="num text-xs text-ash">{r.minutes} min{r.pages ? ` · ${r.pages} p` : ''}</div>{r.note && <p className="mt-2 font-serif text-lg italic text-bone/80">“{r.note}”</p>}</div>
                  <IconBtn label="Delete" onClick={() => ask(() => update((s) => ({ ...s, reading: s.reading.filter((x) => x.id !== r.id) })), 'Delete reading log?')}><Trash2 size={14} /></IconBtn>
                </li>
            ))}
          </ul>
        )}
      </div>
      {node}
    </div>
  )
}
