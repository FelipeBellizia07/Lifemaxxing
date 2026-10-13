import { useState } from 'react'
import { Check, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../lib/store.tsx'
import type { Routine } from '../lib/types.ts'
import { addDays, fromKey, today, uid } from '../lib/date.ts'
import { AnimatedNumber, Btn, Chip, EmptyState, Field, IconBtn, Panel, Stat, useConfirm } from '../components/ui.tsx'
import { ModuleHeader, Tabs } from '../components/Module.tsx'
import { Missions } from './Mind.tsx'
import { CompareView, EntryForm, Timeline } from './Evolution.tsx'

export function Looks() {
  const { state } = useStore()
  const [tab, setTab] = useState<'routines' | 'photos' | 'compare' | 'missions'>('routines')
  const t = today()
  const photos = state.evolution.filter((e) => e.area === 'looks')
  return (
    <>
      <ModuleHeader area="looks">
        <div className="grid max-w-3xl grid-cols-3 gap-6">
          <Stat label="Routines today" value={<><AnimatedNumber value={state.routineChecks.filter((c) => c.date === t).length} /><span className="text-ash">/{state.routines.length}</span></>} />
          <Stat label="Progress photos" value={<AnimatedNumber value={photos.filter((p) => p.photoId).length} />} />
          <Stat label="Checks · 7d" value={<AnimatedNumber value={state.routineChecks.filter((c) => c.date >= addDays(t, -6)).length} />} />
        </div>
      </ModuleHeader>
      <div className="mt-8"><Tabs tabs={[{ id: 'routines', label: 'Routines' }, { id: 'photos', label: 'Photo timeline' }, { id: 'compare', label: 'Compare' }, { id: 'missions', label: 'Missions' }]} value={tab} onChange={setTab} /></div>
      <div className="mt-8">
        {tab === 'routines' && <Routines />}
        {tab === 'photos' && (
          <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
            <div className="space-y-4">
              <EntryForm area="looks" />
              <Protocol />
            </div>
            <Timeline area="looks" />
          </div>
        )}
        {tab === 'compare' && <CompareView area="looks" />}
        {tab === 'missions' && <Missions area="looks" />}
      </div>
    </>
  )
}

function Protocol() {
  return (
    <div className="border border-line p-5 text-sm text-ash">
      <div className="kicker mb-2 text-bone">Standardized photo protocol</div>
      <ol className="list-decimal space-y-1 pl-4">
        <li>Same place, same light source, same time of day.</li>
        <li>Phone at eye level, same distance. Neutral face.</li>
        <li>Front, side, and a detail shot if relevant (skin, hairline).</li>
        <li>Record measurements as <span className="text-bone">objective</span>, impressions as <span className="text-bone">subjective</span>.</li>
      </ol>
      <p className="mt-3 text-xs">Photos never leave this device. LifeMaxxing does not score attractiveness or diagnose anything — consult a dermatologist for medical concerns.</p>
    </div>
  )
}

function Routines() {
  const { state, update, toast } = useStore()
  const [f, setF] = useState<Omit<Routine, 'id'>>({ name: '', kind: 'skin', steps: '', cadence: 'daily' })
  const { ask, node } = useConfirm()
  const t = today()
  const days = Array.from({ length: 14 }, (_, i) => addDays(t, i - 13))
  const checked = (rid: string, d: string) => state.routineChecks.some((c) => c.routineId === rid && c.date === d)
  const toggle = (rid: string, d: string) => update((s) => ({
    ...s,
    routineChecks: checked(rid, d) ? s.routineChecks.filter((c) => !(c.routineId === rid && c.date === d)) : [...s.routineChecks, { routineId: rid, date: d }],
  }))

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-px">
        {state.routines.length === 0 && <EmptyState title="No routines yet" body="Start with the minimum: cleanser, moisturizer, sunscreen. Add more only when that's automatic." />}
        {state.routines.map((r) => {
          const done = checked(r.id, t)
          return (
            <div key={r.id} className="panel tex-looks p-5">
              <div className="flex items-start gap-4">
                <button onClick={() => { toggle(r.id, t); if (!done) toast(`${r.name} · +3 XP`) }} aria-pressed={done} aria-label={`Check ${r.name} for today`}
                  className={`flex h-12 w-12 shrink-0 items-center justify-center border transition-all cursor-pointer ${done ? 'border-acc bg-acc text-acc-ink' : 'border-line2 hover:border-acc'}`}>
                  <Check size={18} strokeWidth={done ? 3 : 1.5} />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="kicker">{r.kind} · {r.cadence}</div>
                  <div className="display mt-1 text-2xl">{r.name}</div>
                  {r.steps && <p className="mt-1 whitespace-pre-line text-sm text-ash">{r.steps}</p>}
                </div>
                <IconBtn label="Delete routine" onClick={() => ask(() => update((s) => ({ ...s, routines: s.routines.filter((x) => x.id !== r.id), routineChecks: s.routineChecks.filter((c) => c.routineId !== r.id) })), `Delete ${r.name}?`, 'Its check history and XP will be removed.')}><Trash2 size={14} /></IconBtn>
              </div>
              <div className="mt-4 flex gap-1" aria-label="Last 14 days">
                {days.map((d) => (
                  <button key={d} onClick={() => toggle(r.id, d)} title={d} aria-label={`${r.name} ${d}`} aria-pressed={checked(r.id, d)}
                    className={`h-6 flex-1 border cursor-pointer transition-colors ${checked(r.id, d) ? 'border-acc/60 bg-acc/70' : 'border-line hover:border-line2'} ${d === t ? 'outline outline-1 outline-offset-1 outline-bone/30' : ''}`} />
                ))}
              </div>
              <div className="num mt-1 flex justify-between text-[10px] text-ash/60"><span>{fromKey(days[0]).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span><span>today</span></div>
            </div>
          )
        })}
      </div>
      <Panel kicker="New" title="Routine" className="h-fit">
        <form className="space-y-5" onSubmit={(e) => {
          e.preventDefault()
          if (!f.name.trim()) return
          update((s) => ({ ...s, routines: [...s.routines, { ...f, id: uid(), name: f.name.trim(), steps: f.steps.trim() }] }))
          setF({ ...f, name: '', steps: '' })
          toast('Routine created')
        }}>
          <Field label="Name"><input className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="AM skin" required /></Field>
          <div className="flex flex-wrap gap-1">{(['skin', 'hair', 'grooming'] as const).map((k) => <Chip key={k} active={f.kind === k} onClick={() => setF({ ...f, kind: k })}>{k}</Chip>)}</div>
          <div className="flex gap-1">{(['daily', 'weekly'] as const).map((k) => <Chip key={k} active={f.cadence === k} onClick={() => setF({ ...f, cadence: k })}>{k}</Chip>)}</div>
          <Field label="Steps / products"><textarea className="field min-h-[80px]" value={f.steps} onChange={(e) => setF({ ...f, steps: e.target.value })} placeholder={'Cleanser\nMoisturizer\nSPF 50'} /></Field>
          <Btn type="submit" variant="primary" className="w-full" disabled={!f.name.trim()}><Plus size={14} />Create routine</Btn>
        </form>
      </Panel>
      {node}
    </div>
  )
}
