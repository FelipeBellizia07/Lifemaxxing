import { useMemo, useState } from 'react'
import { Maximize2, Plus, Trash2, X } from 'lucide-react'
import { useStore } from '../lib/store.tsx'
import { AREAS, AREA_META, type Area, type EvolutionEntry } from '../lib/types.ts'
import { daysBetween, fmtLong, fmtShort, fromKey, today, uid, weekKey } from '../lib/date.ts'
import { deletePhoto } from '../lib/db.ts'
import { xpEvents } from '../lib/xp.ts'
import { Btn, Chip, EmptyState, Field, IconBtn, Modal, Panel, Photo, PhotoPicker, Reveal, useConfirm } from '../components/ui.tsx'
import { AREA_TONE, ModuleHeader, Tabs } from '../components/Module.tsx'
import { Plate } from '../components/Plate.tsx'

const ANGLES = ['front', 'side', 'back', 'detail', 'other'] as const

export function Evolution() {
  const { state } = useStore()
  const [tab, setTab] = useState<'timeline' | 'compare' | 'week'>('timeline')
  const [area, setArea] = useState<Area | 'all'>('all')
  return (
    <>
      <ModuleHeader scene="stairs" code="07" title="Evolution" tagline="Dated evidence. No filters, no exaggeration.">
        <div className="kicker">{state.evolution.length} entries · {state.evolution.filter((e) => e.photoId).length} with photos</div>
      </ModuleHeader>
      <div className="mt-8"><Tabs tabs={[{ id: 'timeline', label: 'Timeline' }, { id: 'compare', label: 'Compare' }, { id: 'week', label: 'Weekly highlights' }]} value={tab} onChange={setTab} /></div>
      {tab !== 'week' && (
        <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto">
          <Chip active={area === 'all'} onClick={() => setArea('all')}>All</Chip>
          {AREAS.map((a) => <Chip key={a} active={area === a} onClick={() => setArea(a)} className="shrink-0">{AREA_META[a].label}</Chip>)}
        </div>
      )}
      <div className="mt-8">
        {tab === 'timeline' && (
          <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
            <EntryForm area={area === 'all' ? undefined : area} />
            <Timeline area={area === 'all' ? undefined : area} />
          </div>
        )}
        {tab === 'compare' && <CompareView area={area === 'all' ? undefined : area} />}
        {tab === 'week' && <WeekHighlights />}
      </div>
    </>
  )
}

export function EntryForm({ area }: { area?: Area }) {
  const { update, toast } = useStore()
  const blank = { date: today(), area: area ?? 'physique' as Area, title: '', description: '', observation: '', result: '', photoId: undefined as string | undefined, angle: 'front' as EvolutionEntry['angle'] }
  const [f, setF] = useState(blank)
  const a = area ?? f.area
  return (
    <Panel kicker="Record" title="New entry" className="h-fit lg:sticky lg:top-6">
      <form className="space-y-5" onSubmit={(e) => {
        e.preventDefault()
        if (!f.title.trim()) return
        update((s) => ({ ...s, evolution: [...s.evolution, { id: uid(), date: f.date, area: a, title: f.title.trim(), description: f.description.trim(), observation: f.observation.trim(), result: f.result.trim(), photoId: f.photoId, angle: f.photoId ? f.angle : undefined }] }))
        setF({ ...blank, area: a })
        toast(`Entry saved · +${f.photoId ? 15 : 10} XP`)
      }}>
        {f.photoId ? (
          <div className="relative">
            <Photo id={f.photoId} alt="Selected" className="aspect-[4/5] w-full object-contain bg-black" />
            <IconBtn label="Remove photo" className="absolute right-2 top-2 bg-black/70" onClick={() => { deletePhoto(f.photoId!); setF({ ...f, photoId: undefined }) }}><X size={14} /></IconBtn>
          </div>
        ) : <PhotoPicker onPicked={(id) => setF({ ...f, photoId: id })} label="Add photo (optional)" className="w-full justify-center py-8" />}
        {f.photoId && <div className="flex flex-wrap gap-1">{ANGLES.map((x) => <Chip key={x} active={f.angle === x} onClick={() => setF({ ...f, angle: x })}>{x}</Chip>)}</div>}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date"><input type="date" className="field num" value={f.date} max={today()} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          {!area && <Field label="Area"><select className="field" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value as Area })}>{AREAS.map((x) => <option key={x} value={x}>{AREA_META[x].label}</option>)}</select></Field>}
        </div>
        <Field label="Title"><input className="field" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Week 4 front / v0.2 deployed / Finished Meditations" required /></Field>
        <Field label="Description"><textarea className="field min-h-[56px]" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <Field label="Measurable result" hint="objective · optional"><input className="field num" value={f.result} onChange={(e) => setF({ ...f, result: e.target.value })} placeholder="78.4 kg · 1,200 users · 312 pages" /></Field>
        <Field label="Personal observation" hint="subjective"><textarea className="field min-h-[56px] font-serif text-lg italic" value={f.observation} onChange={(e) => setF({ ...f, observation: e.target.value })} placeholder="How it feels, what you notice" /></Field>
        <Btn type="submit" variant="primary" className="w-full" disabled={!f.title.trim()}><Plus size={14} />Save entry</Btn>
      </form>
    </Panel>
  )
}

export function Timeline({ area }: { area?: Area }) {
  const { state, update } = useStore()
  const { ask, node } = useConfirm()
  const [view, setView] = useState<EvolutionEntry | null>(null)
  const list = state.evolution.filter((e) => !area || e.area === area).sort((a, b) => b.date.localeCompare(a.date))
  const months = useMemo(() => {
    const m = new Map<string, EvolutionEntry[]>()
    for (const e of list) { const k = e.date.slice(0, 7); m.set(k, [...(m.get(k) ?? []), e]) }
    return [...m.entries()]
  }, [list])
  if (!list.length) return <EmptyState title="The first frame" body="Every transformation edit starts with a baseline. Record where you are today — it becomes the 'before' you'll compare against." />
  const remove = (e: EvolutionEntry) => ask(() => { if (e.photoId) deletePhoto(e.photoId); update((s) => ({ ...s, evolution: s.evolution.filter((x) => x.id !== e.id) })) }, 'Delete entry?', 'The entry and its photo are permanently removed from this device.')

  return (
    <div className="space-y-14">
      {months.map(([m, entries]) => (
        <section key={m}>
          <div className="sticky top-0 z-10 -mx-1 flex items-baseline gap-4 bg-ink/85 px-1 py-3 backdrop-blur">
            <h3 className="display text-4xl">{fromKey(`${m}-01`).toLocaleDateString(undefined, { month: 'long' })}</h3>
            <span className="num text-sm text-ash">{m.slice(0, 4)}</span>
            <span className="h-px flex-1 bg-line" />
          </div>
          <div className="mt-6 space-y-10 border-l border-line pl-6 sm:pl-10">
            {entries.map((e) => (
              <Reveal key={e.id}>
                <article className="relative">
                  <span className="absolute -left-[29px] top-2 h-2 w-2 bg-acc sm:-left-[45px]" />
                  <div className="grid gap-5 sm:grid-cols-[minmax(0,260px)_1fr]">
                    <button className="group relative block aspect-[4/5] overflow-hidden bg-black cursor-zoom-in" onClick={() => setView(e)} aria-label={`Open ${e.title}`}>
                      {e.photoId ? <Photo id={e.photoId} alt={e.title} className="h-full w-full transition-transform duration-[1.5s] group-hover:scale-[1.04]" /> : <Plate scene="stairs" className="h-full w-full opacity-50" />}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-left">
                        <div className="num text-xs text-bone/80">{e.date}{e.angle ? ` · ${e.angle}` : ''}</div>
                      </div>
                      <Maximize2 size={14} className="absolute right-3 top-3 text-bone/0 transition-colors group-hover:text-bone/80" />
                    </button>
                    <div className="min-w-0">
                      <div className="kicker"><span className={AREA_TONE[e.area]}>{AREA_META[e.area].label}</span> · {fmtShort(e.date)}</div>
                      <h4 className="display mt-2 text-3xl sm:text-4xl">{e.title}</h4>
                      {e.description && <p className="mt-2 text-sm text-bone/80">{e.description}</p>}
                      {e.result && <div className="mt-4"><div className="kicker">Objective</div><div className="num mt-1 text-acc">{e.result}</div></div>}
                      {e.observation && <div className="mt-4"><div className="kicker">Subjective</div><p className="mt-1 font-serif text-xl italic text-bone/85">“{e.observation}”</p></div>}
                      <Btn variant="ghost" size="sm" className="mt-4 -ml-3" onClick={() => remove(e)}><Trash2 size={12} />Delete</Btn>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </section>
      ))}
      <Modal open={!!view} onClose={() => setView(null)} title={view?.title ?? ''} wide>
        {view && (
          <>
            {view.photoId && <Photo id={view.photoId} alt={view.title} className="max-h-[65vh] w-full object-contain bg-black" />}
            <div className="kicker mt-4">{fmtLong(view.date)} · {AREA_META[view.area].label}</div>
          </>
        )}
      </Modal>
      {node}
    </div>
  )
}

export function CompareView({ area }: { area?: Area }) {
  const { state } = useStore()
  const withPhotos = state.evolution.filter((e) => e.photoId && (!area || e.area === area)).sort((a, b) => a.date.localeCompare(b.date))
  const [angle, setAngle] = useState<string>('any')
  const pool = withPhotos.filter((e) => angle === 'any' || e.angle === angle)
  const [aId, setA] = useState<string>('')
  const [bId, setB] = useState<string>('')
  const [mode, setMode] = useState<'side' | 'slider'>('side')
  const [pos, setPos] = useState(50)
  const a = pool.find((e) => e.id === aId) ?? pool[0]
  const b = pool.find((e) => e.id === bId) ?? pool.at(-1)

  if (withPhotos.length < 2) return <EmptyState title="Need two photos" body="Comparison needs at least two dated entries with photos in this area. Use the same angle and light for an honest comparison." />
  const Pick = ({ value, onChange, label }: { value?: string; onChange: (v: string) => void; label: string }) => (
    <Field label={label}>
      <select className="field num" value={value} onChange={(e) => onChange(e.target.value)}>
        {pool.map((e) => <option key={e.id} value={e.id}>{e.date} · {e.title}{e.angle ? ` (${e.angle})` : ''}</option>)}
      </select>
    </Field>
  )
  return (
    <div>
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-wrap gap-1">{['any', ...ANGLES].map((x) => <Chip key={x} active={angle === x} onClick={() => { setAngle(x); setA(''); setB('') }}>{x}</Chip>)}</div>
        <div className="ml-auto flex gap-1"><Chip active={mode === 'side'} onClick={() => setMode('side')}>Side by side</Chip><Chip active={mode === 'slider'} onClick={() => setMode('slider')}>Slider</Chip></div>
      </div>
      {pool.length < 2 ? <div className="mt-6"><EmptyState title="Not enough for this angle" body="Pick another angle or add more photos." /></div> : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Pick label="Before" value={a?.id} onChange={setA} />
            <Pick label="After" value={b?.id} onChange={setB} />
          </div>
          {a && b && (
            <>
              <div className="kicker mt-6 text-center">{Math.abs(daysBetween(a.date, b.date))} days apart · photos shown unaltered</div>
              {mode === 'side' ? (
                <div className="mt-4 grid grid-cols-2 gap-1">
                  {[a, b].map((e, i) => (
                    <figure key={i} className="bg-black">
                      <Photo id={e.photoId} alt={e.title} className="aspect-[4/5] w-full object-contain" />
                      <figcaption className="flex justify-between p-3"><span className="display text-xl">{i ? 'After' : 'Before'}</span><span className="num text-xs text-ash">{e.date}</span></figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <div className="relative mx-auto mt-4 aspect-[4/5] max-w-xl select-none overflow-hidden bg-black">
                  <Photo id={a.photoId} alt={a.title} className="absolute inset-0 h-full w-full object-contain" />
                  <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}><Photo id={b.photoId} alt={b.title} className="h-full w-full object-contain" /></div>
                  <div className="absolute inset-y-0 w-px bg-acc" style={{ left: `${pos}%` }} />
                  <span className="kicker absolute left-3 top-3 bg-black/60 px-2 py-1">{a.date}</span>
                  <span className="kicker absolute right-3 top-3 bg-black/60 px-2 py-1">{b.date}</span>
                  <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} aria-label="Comparison position" className="absolute inset-x-4 bottom-4 accent-[var(--acc)]" />
                </div>
              )}
              {(a.result || b.result) && (
                <div className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-4">
                  {[a, b].map((e, i) => <div key={i}><div className="kicker">Objective · {e.date}</div><div className="num mt-1 text-acc">{e.result || '—'}</div></div>)}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

function WeekHighlights() {
  const { state } = useStore()
  const w = weekKey(today())
  const entries = state.evolution.filter((e) => weekKey(e.date) === w)
  const xp = xpEvents(state).filter((e) => weekKey(e.date) === w)
  const top = [...xp].sort((a, b) => b.amount - a.amount).slice(0, 8)
  const total = xp.reduce((n, e) => n + e.amount, 0)
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel kicker={`Week of ${fmtShort(w)}`} title="Evolution entries">
        {entries.length === 0 ? <p className="text-sm text-ash">No entries this week yet.</p> : (
          <div className="grid grid-cols-2 gap-2">
            {entries.map((e) => (
              <div key={e.id} className="relative aspect-[4/5] overflow-hidden bg-black">
                {e.photoId ? <Photo id={e.photoId} alt={e.title} className="h-full w-full" /> : <Plate scene="stairs" className="h-full w-full opacity-40" />}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black p-3"><div className="display text-lg">{e.title}</div><div className="num text-[10px] text-ash">{e.date}</div></div>
              </div>
            ))}
          </div>
        )}
      </Panel>
      <Panel kicker={`${total} XP this week`} title="Biggest moves">
        {top.length === 0 ? <p className="text-sm text-ash">Your highest-value actions of the week will show here.</p> : (
          <ul className="space-y-2">
            {top.map((e) => <li key={e.key} className="flex justify-between gap-3 border-b border-line pb-2 text-sm"><span className="truncate">{e.label}</span><span className="num shrink-0 text-acc">+{e.amount}</span></li>)}
          </ul>
        )}
      </Panel>
    </div>
  )
}
