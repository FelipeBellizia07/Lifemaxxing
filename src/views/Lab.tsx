import { useState } from 'react'
import { ArrowUpRight, Check, Plus, Rocket, Trash2 } from 'lucide-react'
import { useStore } from '../lib/store.tsx'
import type { Project, ProjectStage } from '../lib/types.ts'
import { fmtShort, today, uid } from '../lib/date.ts'
import { newTask, startSession } from '../lib/actions.ts'
import { AnimatedNumber, Bar, Btn, Chip, EmptyState, Field, IconBtn, Stat, useConfirm, numOrUndef } from '../components/ui.tsx'
import { ModuleHeader } from '../components/Module.tsx'

const STAGES: { id: ProjectStage; label: string }[] = [
  { id: 'idea', label: 'Ideas' }, { id: 'prototype', label: 'Prototype' }, { id: 'active', label: 'Active' }, { id: 'shipped', label: 'Shipped' }, { id: 'archived', label: 'Archived' },
]

export function Lab() {
  const { state, update, toast } = useStore()
  const [sel, setSel] = useState<string | null>(null)
  const [filter, setFilter] = useState<ProjectStage | 'all'>('all')
  const [idea, setIdea] = useState('')
  const project = state.projects.find((p) => p.id === sel)
  const list = state.projects.filter((p) => (filter === 'all' ? p.stage !== 'archived' : p.stage === filter)).sort((a, b) => STAGES.findIndex((s) => s.id === b.stage) - STAGES.findIndex((s) => s.id === a.stage) || b.createdAt.localeCompare(a.createdAt))

  return (
    <>
      <ModuleHeader area="lab">
        <div className="grid max-w-3xl grid-cols-3 gap-6">
          <Stat label="Ideas" value={<AnimatedNumber value={state.projects.filter((p) => p.stage === 'idea').length} />} />
          <Stat label="In build" value={<AnimatedNumber value={state.projects.filter((p) => p.stage === 'prototype' || p.stage === 'active').length} />} />
          <Stat label="Shipped" value={<AnimatedNumber value={state.projects.filter((p) => p.stage === 'shipped').length} />} accent />
        </div>
      </ModuleHeader>

      <form className="mt-8 flex gap-3 border border-line p-4" onSubmit={(e) => {
        e.preventDefault()
        if (!idea.trim()) return
        const p: Project = { id: uid(), title: idea.trim(), pitch: '', stage: 'idea', stack: '', milestones: [], blockers: [], notes: [], experiments: [], createdAt: new Date().toISOString() }
        update((s) => ({ ...s, projects: [...s.projects, p] }))
        setIdea(''); setSel(p.id); toast('Idea captured')
      }}>
        <input className="field text-lg" value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="Capture an idea in one line — a CLI, an agent, a tool you wish existed…" aria-label="New idea" />
        <Btn type="submit" disabled={!idea.trim()}><Plus size={14} />Capture</Btn>
      </form>

      <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto">
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>All live</Chip>
        {STAGES.map((s) => <Chip key={s.id} active={filter === s.id} onClick={() => setFilter(s.id)} className="shrink-0">{s.label} · {state.projects.filter((p) => p.stage === s.id).length}</Chip>)}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
        <div className="space-y-px">
          {list.length === 0 && <EmptyState title="Empty lab" body="Ideas are cheap and that's the point. Capture freely; promote only the ones you'll actually build." />}
          {list.map((p) => {
            const done = p.milestones.filter((m) => m.done).length
            return (
              <button key={p.id} onClick={() => setSel(p.id)} aria-pressed={sel === p.id}
                className={`panel tex-lab block w-full p-4 text-left transition-colors cursor-pointer ${sel === p.id ? 'border-volt' : 'hover:border-line2'}`}>
                <div className="kicker flex justify-between"><span className={p.stage === 'shipped' ? 'text-acc' : p.stage === 'idea' ? '' : 'text-volt'}>{p.stage}</span>{p.blockers.some((b) => !b.resolved) && <span className="text-red-300">blocked</span>}</div>
                <div className="display mt-1 text-xl">{p.title}</div>
                {p.milestones.length > 0 && <Bar value={done} max={p.milestones.length} className="mt-3" color="bg-volt" label={`${p.title} progress`} />}
              </button>
            )
          })}
        </div>
        {project ? <ProjectDetail key={project.id} p={project} onDeleted={() => setSel(null)} /> : (
          <div className="hidden border border-dashed border-line2 p-10 text-center text-sm text-ash lg:block">Select a project to open its workspace.</div>
        )}
      </div>
    </>
  )
}

function ProjectDetail({ p, onDeleted }: { p: Project; onDeleted: () => void }) {
  const { state, update, toast, celebrate } = useStore()
  const { ask, node } = useConfirm()
  const [ms, setMs] = useState('')
  const [bl, setBl] = useState('')
  const [note, setNote] = useState('')
  const [exp, setExp] = useState({ hypothesis: '', result: '' })
  const [mission, setMission] = useState({ title: '', first: '' })
  const set = (patch: Partial<Project>) => update((s) => ({ ...s, projects: s.projects.map((x) => (x.id === p.id ? { ...x, ...patch } : x)) }))
  const tasks = state.tasks.filter((t) => t.projectId === p.id)

  const promote = () => {
    set({ stage: 'prototype', promotedAt: p.promotedAt ?? new Date().toISOString() })
    celebrate({ kind: 'milestone', title: `${p.title} is live`, xp: p.promotedAt ? undefined : 15, sub: 'Idea promoted to prototype' })
  }

  return (
    <div className="panel enter p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="kicker">Project · created {fmtShort(p.createdAt.slice(0, 10))}</div>
          <input className="display mt-2 w-full bg-transparent text-4xl outline-none focus:text-acc sm:text-5xl" value={p.title} onChange={(e) => set({ title: e.target.value })} aria-label="Project title" />
        </div>
        {p.stage === 'idea' && <Btn variant="primary" onClick={promote}><Rocket size={14} />Promote to prototype</Btn>}
      </div>

      <div className="mt-5 flex flex-wrap gap-1">
        {STAGES.map((s) => <Chip key={s.id} active={p.stage === s.id} onClick={() => {
          if (s.id === p.stage) return
          if (p.stage === 'idea' && s.id !== 'archived') return promote()
          set({ stage: s.id })
          if (s.id === 'shipped') celebrate({ kind: 'milestone', title: `${p.title} shipped`, sub: 'Proof of work.' })
        }}>{s.label}</Chip>)}
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field label="Pitch" className="sm:col-span-2"><textarea className="field min-h-[56px]" value={p.pitch} onChange={(e) => set({ pitch: e.target.value })} placeholder="Who is it for, what does it do, why now?" /></Field>
        <Field label="Stack"><input className="field num text-sm" value={p.stack} onChange={(e) => set({ stack: e.target.value })} placeholder="Vite · React · Claude Code" /></Field>
        <Field label="Monthly income target" hint="forecast, optional"><input inputMode="decimal" className="field num" value={p.incomeGoal ?? ''} onChange={(e) => set({ incomeGoal: numOrUndef(e.target.value) })} placeholder="—" /></Field>
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-2">
        <section>
          <h4 className="kicker mb-3 text-bone">Milestones</h4>
          <ul className="space-y-1">
            {p.milestones.map((m) => (
              <li key={m.id} className="flex items-center gap-3 text-sm">
                <button aria-label={m.done ? 'Reopen milestone' : 'Complete milestone'} onClick={() => {
                  set({ milestones: p.milestones.map((x) => (x.id === m.id ? { ...x, done: !x.done, doneAt: x.done ? undefined : new Date().toISOString() } : x)) })
                  if (!m.done) celebrate({ kind: 'milestone', title: m.text, xp: 25, sub: p.title })
                }} className={`flex h-5 w-5 shrink-0 items-center justify-center border cursor-pointer ${m.done ? 'border-volt bg-volt text-ink' : 'border-line2 hover:border-volt'}`}>{m.done && <Check size={12} strokeWidth={3} />}</button>
                <span className={`flex-1 ${m.done ? 'text-ash line-through' : ''}`}>{m.text}</span>
                <IconBtn label="Delete milestone" className="h-6 w-6" onClick={() => set({ milestones: p.milestones.filter((x) => x.id !== m.id) })}><Trash2 size={12} /></IconBtn>
              </li>
            ))}
          </ul>
          <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!ms.trim()) return; set({ milestones: [...p.milestones, { id: uid(), text: ms.trim(), done: false }] }); setMs('') }}>
            <input className="field text-sm" value={ms} onChange={(e) => setMs(e.target.value)} placeholder="Add milestone — e.g. auth works end to end" />
            <Btn size="sm" type="submit" disabled={!ms.trim()}>Add</Btn>
          </form>
        </section>

        <section>
          <h4 className="kicker mb-3 text-bone">Blockers</h4>
          <ul className="space-y-1">
            {p.blockers.map((b) => (
              <li key={b.id} className="flex items-center gap-3 text-sm">
                <input type="checkbox" checked={b.resolved} aria-label="Resolved" className="accent-[var(--volt)]" onChange={() => set({ blockers: p.blockers.map((x) => (x.id === b.id ? { ...x, resolved: !x.resolved } : x)) })} />
                <span className={`flex-1 ${b.resolved ? 'text-ash line-through' : 'text-red-200'}`}>{b.text}</span>
                <IconBtn label="Delete blocker" className="h-6 w-6" onClick={() => set({ blockers: p.blockers.filter((x) => x.id !== b.id) })}><Trash2 size={12} /></IconBtn>
              </li>
            ))}
          </ul>
          <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!bl.trim()) return; set({ blockers: [...p.blockers, { id: uid(), text: bl.trim(), resolved: false }] }); setBl('') }}>
            <input className="field text-sm" value={bl} onChange={(e) => setBl(e.target.value)} placeholder="What's stopping progress?" />
            <Btn size="sm" type="submit" disabled={!bl.trim()}>Add</Btn>
          </form>
        </section>

        <section>
          <h4 className="kicker mb-3 text-bone">Missions · linked</h4>
          <ul className="space-y-1">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2 text-sm">
                <span className={`flex-1 ${t.status === 'done' ? 'text-ash line-through' : ''}`}>{t.title}</span>
                {t.status === 'open' && <IconBtn label="Start first action" onClick={() => update((s) => startSession(s, { label: t.title, area: 'lab', plannedMin: t.firstActionMin, taskId: t.id }))}><ArrowUpRight size={14} /></IconBtn>}
              </li>
            ))}
          </ul>
          <form className="mt-2 space-y-2" onSubmit={(e) => {
            e.preventDefault()
            if (!mission.title.trim() || !mission.first.trim()) return
            update((s) => ({ ...s, tasks: [...s.tasks, newTask({ title: mission.title.trim(), area: 'lab', firstAction: mission.first.trim(), projectId: p.id })] }))
            setMission({ title: '', first: '' }); toast('Mission linked to project')
          }}>
            <input className="field text-sm" value={mission.title} onChange={(e) => setMission({ ...mission, title: e.target.value })} placeholder="Mission" />
            <input className="field text-sm" value={mission.first} onChange={(e) => setMission({ ...mission, first: e.target.value })} placeholder="First 10-minute action" />
            <Btn size="sm" type="submit" disabled={!mission.title.trim() || !mission.first.trim()}>Add mission</Btn>
          </form>
        </section>

        <section>
          <h4 className="kicker mb-3 text-bone">Experiments</h4>
          <ul className="space-y-3">
            {p.experiments.map((x) => (
              <li key={x.id} className="border-l border-volt/50 pl-3 text-sm">
                <div className="num text-[10px] text-ash">{x.date}</div>
                <div><span className="text-ash">H:</span> {x.hypothesis}</div>
                {x.result && <div><span className="text-ash">R:</span> {x.result}</div>}
              </li>
            ))}
          </ul>
          <form className="mt-2 space-y-2" onSubmit={(e) => { e.preventDefault(); if (!exp.hypothesis.trim()) return; set({ experiments: [...p.experiments, { id: uid(), date: today(), hypothesis: exp.hypothesis.trim(), result: exp.result.trim() }] }); setExp({ hypothesis: '', result: '' }); toast('Experiment recorded · +10 XP') }}>
            <input className="field text-sm" value={exp.hypothesis} onChange={(e) => setExp({ ...exp, hypothesis: e.target.value })} placeholder="Hypothesis — if I try X, Y happens" />
            <input className="field text-sm" value={exp.result} onChange={(e) => setExp({ ...exp, result: e.target.value })} placeholder="Result (can add later)" />
            <Btn size="sm" type="submit" disabled={!exp.hypothesis.trim()}>Record</Btn>
          </form>
        </section>
      </div>

      <section className="mt-8">
        <h4 className="kicker mb-3 text-bone">Technical notes</h4>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!note.trim()) return; set({ notes: [{ id: uid(), date: today(), text: note.trim() }, ...p.notes] }); setNote('') }}>
          <textarea className="field num min-h-[44px] text-sm" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Commands, decisions, prompts that worked…" />
          <Btn size="sm" type="submit" disabled={!note.trim()}>Save</Btn>
        </form>
        <ul className="mt-3 space-y-2">
          {p.notes.map((n) => (
            <li key={n.id} className="group flex gap-3 border-b border-line pb-2">
              <span className="num shrink-0 text-[10px] text-ash">{n.date}</span>
              <pre className="num flex-1 whitespace-pre-wrap text-xs text-bone/85">{n.text}</pre>
              <IconBtn label="Delete note" className="h-6 w-6" onClick={() => set({ notes: p.notes.filter((x) => x.id !== n.id) })}><Trash2 size={12} /></IconBtn>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-8 border-t border-line pt-4 text-right">
        <Btn variant="danger" size="sm" onClick={() => ask(() => { update((s) => ({ ...s, projects: s.projects.filter((x) => x.id !== p.id), tasks: s.tasks.map((t) => (t.projectId === p.id ? { ...t, projectId: undefined } : t)) })); onDeleted() }, `Delete ${p.title}?`, 'Milestones, notes, blockers and experiments are removed. Linked missions are kept but unlinked.')}><Trash2 size={12} />Delete project</Btn>
      </div>
      {node}
    </div>
  )
}
