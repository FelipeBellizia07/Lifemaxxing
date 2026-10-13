import { useMemo, useState } from 'react'
import { Check, Lock, Plus, Trash2 } from 'lucide-react'
import { Area as RArea, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from '../lib/store.tsx'
import { AREAS, AREA_META, type Area } from '../lib/types.ts'
import { addDays, fmtShort, isoDate, today, weekKey, uid } from '../lib/date.ts'
import { TITLES, XP_RULES, areaXP, levelOf, skillTree, titleFor, weeklyChallenges, xpEvents, xpForLevel } from '../lib/xp.ts'
import { AnimatedNumber, Bar, Btn, EmptyState, Field, IconBtn, Panel, Reveal, useConfirm } from '../components/ui.tsx'
import { AREA_TONE, ModuleHeader, Tabs } from '../components/Module.tsx'
import { chartTooltip } from './Mind.tsx'

export function Progression() {
  const { state } = useStore()
  const [tab, setTab] = useState<'overview' | 'tree' | 'review' | 'rules'>('overview')
  const ev = useMemo(() => xpEvents(state), [state])
  const total = ev.reduce((n, e) => n + e.amount, 0)
  const l = levelOf(total)
  return (
    <>
      <ModuleHeader scene="stairs" code="08" title="Progression" tagline="Consistency compounds. Missed days cost nothing.">
        <div className="flex flex-wrap items-end gap-10">
          <div><div className="kicker">Level</div><div className="display text-8xl text-acc sm:text-9xl"><AnimatedNumber value={l.level} /></div></div>
          <div className="pb-3">
            <div className="font-serif text-4xl italic">{titleFor(l.level)}</div>
            <div className="num mt-2 text-sm text-ash"><AnimatedNumber value={l.into} /> / {l.span} XP to level {l.level + 1} · {total} total</div>
            <Bar value={l.into} max={l.span} className="mt-2 w-64" label="Level progress" />
          </div>
        </div>
      </ModuleHeader>
      <div className="mt-8"><Tabs tabs={[{ id: 'overview', label: 'Overview' }, { id: 'tree', label: 'Skill trees' }, { id: 'review', label: 'Weekly review' }, { id: 'rules', label: 'XP rules & ledger' }]} value={tab} onChange={setTab} /></div>
      <div className="mt-8">
        {tab === 'overview' && <Overview />}
        {tab === 'tree' && <Trees />}
        {tab === 'review' && <Review />}
        {tab === 'rules' && <Rules />}
      </div>
    </>
  )
}

function Overview() {
  const { state } = useStore()
  const ev = useMemo(() => xpEvents(state), [state])
  const series = useMemo(() => {
    const asc = [...ev].reverse()
    const byDay = new Map<string, number>()
    for (const e of asc) byDay.set(e.date, (byDay.get(e.date) ?? 0) + e.amount)
    let run = 0
    return [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([d, v]) => ({ d: fmtShort(d), xp: (run += v) }))
  }, [ev])
  const total = series.at(-1)?.xp ?? 0
  const levelLines = Array.from({ length: levelOf(total).level }, (_, i) => xpForLevel(i + 1)).filter((x) => x <= total * 1.15)
  const days = Array.from({ length: 28 }, (_, i) => addDays(today(), i - 27))
  const active = new Set(ev.map((e) => e.date))
  const activeCount = days.filter((d) => active.has(d)).length
  const ax = areaXP(ev)
  const maxAx = Math.max(1, ...Object.values(ax))

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel kicker="Evolution timeline" title="Cumulative XP" className="lg:col-span-2">
        {series.length < 2 ? <EmptyState title="The arc starts soon" body="Once you have XP on two different days, your trajectory is drawn here with each level crossed." /> : (
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={series} margin={{ left: -8, right: 8, top: 8 }}>
                <defs><linearGradient id="xg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--acc)" stopOpacity={0.3} /><stop offset="1" stopColor="var(--acc)" stopOpacity={0} /></linearGradient></defs>
                <XAxis dataKey="d" tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip {...chartTooltip} />
                {levelLines.map((y, i) => <ReferenceLine key={y} y={y} stroke="rgba(236,235,230,.15)" strokeDasharray="2 4" label={{ value: `L${i + 2}`, position: 'insideRight', fill: '#8d8c87', fontSize: 10 }} />)}
                <RArea type="stepAfter" dataKey="xp" stroke="var(--acc)" strokeWidth={1.5} fill="url(#xg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <Panel kicker="Last 28 days · not a streak" title={<>{activeCount} active days</>}>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => <div key={d} title={d} className={`aspect-square ${active.has(d) ? 'bg-acc/80' : 'bg-white/[0.05]'}`} />)}
        </div>
        <p className="mt-4 text-xs text-ash">Gaps are normal. There's no counter to break — just a record of the days you showed up.</p>
      </Panel>

      <Panel kicker="XP by area" title="Distribution">
        <div className="space-y-3">
          {AREAS.map((a) => (
            <div key={a}>
              <div className="flex justify-between text-sm"><span className={AREA_TONE[a]}>{AREA_META[a].label}</span><span className="num text-ash">{ax[a]}</span></div>
              <div className="mt-1 h-[3px] bg-white/[0.07]"><div className="bar-fill h-full bg-bone/70" style={{ width: `${(ax[a] / maxAx) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel kicker="This week" title="Weekly challenges">
        <div className="space-y-4">
          {weeklyChallenges(state, weekKey(today())).map((c) => (
            <div key={c.id}>
              <div className="flex justify-between text-sm"><span>{c.title} <span className="kicker">{AREA_META[c.area].label}</span></span><span className="num text-ash">{c.progress}/{c.target}</span></div>
              <Bar value={c.progress} max={c.target} className="mt-2" label={c.title} />
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-ash">Picked from your top three areas. 40 XP each. Reset every Monday with no carry-over penalty.</p>
      </Panel>

      <PersonalMilestones />

      <Panel kicker="Unlockable titles" title="Title ladder" className="lg:col-span-2">
        <div className="no-scrollbar flex gap-px overflow-x-auto">
          {TITLES.map((t) => {
            const lvl = levelOf(state ? ev.reduce((n, e) => n + e.amount, 0) : 0).level
            const got = lvl >= t.level
            return (
              <div key={t.title} className={`min-w-[130px] flex-1 border-t-2 p-4 ${got ? 'border-acc' : 'border-line'}`}>
                <div className="num text-[10px] text-ash">LVL {t.level}</div>
                <div className={`mt-1 font-serif text-2xl italic ${got ? '' : 'text-ash/50'}`}>{t.title}</div>
              </div>
            )
          })}
        </div>
      </Panel>
    </div>
  )
}

function PersonalMilestones() {
  const { state, update, celebrate } = useStore()
  const [f, setF] = useState({ title: '', area: (state.profile?.areas[0] ?? 'mind') as Area, targetDate: '' })
  const { ask, node } = useConfirm()
  const list = [...state.milestones].sort((a, b) => Number(!!a.doneAt) - Number(!!b.doneAt) || (a.targetDate ?? '9').localeCompare(b.targetDate ?? '9'))
  return (
    <Panel kicker="You define them" title="Personal milestones">
      <ul className="space-y-2">
        {list.map((m) => (
          <li key={m.id} className="flex items-center gap-3 text-sm">
            <button aria-label={m.doneAt ? 'Reopen' : 'Mark reached'} onClick={() => {
              update((s) => ({ ...s, milestones: s.milestones.map((x) => (x.id === m.id ? { ...x, doneAt: x.doneAt ? undefined : new Date().toISOString() } : x)) }))
              if (!m.doneAt) celebrate({ kind: 'milestone', title: m.title, xp: 50, sub: AREA_META[m.area].label })
            }} className={`flex h-5 w-5 shrink-0 items-center justify-center border cursor-pointer ${m.doneAt ? 'border-acc bg-acc text-acc-ink' : 'border-line2 hover:border-acc'}`}>{m.doneAt && <Check size={12} strokeWidth={3} />}</button>
            <span className={`flex-1 ${m.doneAt ? 'text-ash line-through' : ''}`}>{m.title}</span>
            <span className="num text-[10px] text-ash">{m.doneAt ? isoDate(m.doneAt) : m.targetDate ? `by ${fmtShort(m.targetDate)}` : ''}</span>
            <IconBtn label="Delete milestone" className="h-6 w-6" onClick={() => ask(() => update((s) => ({ ...s, milestones: s.milestones.filter((x) => x.id !== m.id) })), 'Delete milestone?')}><Trash2 size={12} /></IconBtn>
          </li>
        ))}
      </ul>
      <form className="mt-4 grid grid-cols-2 gap-3" onSubmit={(e) => { e.preventDefault(); if (!f.title.trim()) return; update((s) => ({ ...s, milestones: [...s.milestones, { id: uid(), title: f.title.trim(), area: f.area, targetDate: f.targetDate || undefined }] })); setF({ ...f, title: '', targetDate: '' }) }}>
        <input className="field col-span-2 text-sm" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="First pull-up · first paying user · 10k saved" aria-label="Milestone" />
        <select className="field text-sm" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value as Area })} aria-label="Area">{AREAS.map((a) => <option key={a} value={a}>{AREA_META[a].label}</option>)}</select>
        <input type="date" className="field num text-sm" value={f.targetDate} onChange={(e) => setF({ ...f, targetDate: e.target.value })} aria-label="Target date" />
        <Btn size="sm" type="submit" className="col-span-2" disabled={!f.title.trim()}><Plus size={12} />Add milestone · 50 XP when reached</Btn>
      </form>
      {node}
    </Panel>
  )
}

function Trees() {
  const { state } = useStore()
  const ev = useMemo(() => xpEvents(state), [state])
  const ax = areaXP(ev)
  const tree = skillTree(state, ax)
  const order = [...(state.profile?.areas ?? []), ...AREAS.filter((a) => !state.profile?.areas.includes(a))]
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {order.map((a, i) => (
        <Reveal key={a} delay={i * 60}>
          <div className={`panel tex-${a} h-full p-6`}>
            <div className="flex items-baseline justify-between"><span className={`kicker ${AREA_TONE[a]}`}>{AREA_META[a].code} · {AREA_META[a].label}</span><span className="num text-xs text-ash">{ax[a]} XP</span></div>
            <ol className="relative mt-6 space-y-6 pl-8">
              <span className="absolute bottom-3 left-[11px] top-3 w-px bg-line2" />
              {tree[a].map((n) => (
                <li key={n.id} className="relative">
                  <span className={`absolute -left-8 top-0 flex h-6 w-6 items-center justify-center border ${n.unlocked ? 'border-acc bg-acc text-acc-ink' : 'border-line2 bg-coal text-ash'}`}>
                    {n.unlocked ? <Check size={12} strokeWidth={3} /> : <Lock size={10} />}
                  </span>
                  <div className={`display text-xl ${n.unlocked ? '' : 'text-bone/40'}`}>{n.title}</div>
                  <div className="text-xs text-ash">{n.need}</div>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      ))}
    </div>
  )
}

function Review() {
  const { state, update, toast, celebrate } = useStore()
  const w = weekKey(today())
  const existing = state.reviews.find((r) => r.week === w)
  const [f, setF] = useState({ wins: existing?.wins ?? '', friction: existing?.friction ?? '', nextFocus: existing?.nextFocus ?? '' })
  const ev = xpEvents(state).filter((e) => weekKey(e.date) === w)
  const sessions = state.sessions.filter((s) => s.endedAt && weekKey(isoDate(s.endedAt)) === w)
  const stats = [
    { l: 'XP earned', v: ev.reduce((n, e) => n + e.amount, 0) },
    { l: 'Missions done', v: state.tasks.filter((t) => t.doneAt && weekKey(isoDate(t.doneAt)) === w).length },
    { l: 'Focus min', v: sessions.reduce((n, s) => n + s.actualMin, 0) },
    { l: 'Workouts', v: state.workouts.filter((x) => weekKey(x.date) === w).length },
  ]
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Panel kicker={`Week of ${fmtShort(w)} · ${existing ? 'saved' : '+30 XP'}`} title="Weekly review">
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => <div key={s.l}><div className="kicker">{s.l}</div><div className="display mt-1 text-4xl"><AnimatedNumber value={s.v} /></div></div>)}
        </div>
        <form className="space-y-6" onSubmit={(e) => {
          e.preventDefault()
          if (!f.wins.trim() && !f.friction.trim() && !f.nextFocus.trim()) return
          update((s) => ({ ...s, reviews: [...s.reviews.filter((r) => r.week !== w), { week: w, ...f, createdAt: existing?.createdAt ?? new Date().toISOString() }] }))
          existing ? toast('Review updated') : celebrate({ kind: 'milestone', title: 'Week reviewed', xp: 30, sub: 'Clarity is a multiplier.' })
        }}>
          <Field label="What worked — one win, however small"><textarea className="field min-h-[60px]" value={f.wins} onChange={(e) => setF({ ...f, wins: e.target.value })} /></Field>
          <Field label="Where was the friction? (facts, not judgement)"><textarea className="field min-h-[60px]" value={f.friction} onChange={(e) => setF({ ...f, friction: e.target.value })} /></Field>
          <Field label="One focus for next week"><textarea className="field min-h-[60px] font-serif text-lg italic" value={f.nextFocus} onChange={(e) => setF({ ...f, nextFocus: e.target.value })} /></Field>
          <Btn type="submit" variant="primary">{existing ? 'Update review' : 'Save review'}</Btn>
        </form>
      </Panel>
      <div>
        <div className="kicker mb-3">Past reviews</div>
        {state.reviews.filter((r) => r.week !== w).length === 0 ? <p className="text-sm text-ash">Reviews from previous weeks appear here.</p> : (
          <ul className="space-y-3">
            {[...state.reviews].filter((r) => r.week !== w).sort((a, b) => b.week.localeCompare(a.week)).map((r) => (
              <li key={r.week} className="panel p-4 text-sm">
                <div className="kicker">Week of {fmtShort(r.week)}</div>
                {r.wins && <p className="mt-2"><span className="text-acc">+</span> {r.wins}</p>}
                {r.friction && <p className="mt-1 text-ash">~ {r.friction}</p>}
                {r.nextFocus && <p className="mt-1 font-serif text-base italic">→ {r.nextFocus}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function Rules() {
  const { state } = useStore()
  const ev = useMemo(() => xpEvents(state), [state])
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel kicker="Deterministic · each record pays once" title="XP rules">
        <table className="w-full text-sm">
          <tbody>
            {XP_RULES.map((r) => <tr key={r.label} className="border-b border-line"><td className="py-2">{r.label}</td><td className="num py-2 text-right text-acc">{r.xp}</td></tr>)}
          </tbody>
        </table>
        <div className="mt-5 space-y-2 text-xs text-ash">
          <p>XP is calculated from your records every time, never stored separately. Delete or un-complete something and its XP disappears; redo it and it returns once. No double rewards, no farming.</p>
          <p>Level n requires 60 × n × (n+1) total XP. Level 2 at 120, level 3 at 360, level 4 at 720.</p>
          <p>No streaks, no decay, no penalties. Time away costs nothing.</p>
        </div>
      </Panel>
      <Panel kicker={`${ev.length} events`} title="Ledger">
        {ev.length === 0 ? <p className="text-sm text-ash">Empty. Complete anything real to see it appear.</p> : (
          <ul className="max-h-[560px] space-y-1 overflow-y-auto pr-2">
            {ev.map((e) => (
              <li key={e.key} className="flex items-center gap-3 border-b border-line py-1.5 text-sm">
                <span className="num w-12 shrink-0 text-[10px] text-ash">{fmtShort(e.date)}</span>
                <span className="flex-1 truncate">{e.label}</span>
                <span className="num text-acc">+{e.amount}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
