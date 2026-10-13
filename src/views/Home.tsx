import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, ArrowUpRight, Check, Clock, Play, Plus, SkipForward } from 'lucide-react'
import { useStore } from '../lib/store.tsx'
import { AREA_META, AREAS, type Area, type Energy, type State } from '../lib/types.ts'
import { daysBetween, fmtLong, fromKey, isoDate, today, weekKey, inWeek } from '../lib/date.ts'
import { recommend, type Recommendation } from '../lib/strategy.ts'
import { levelOf, titleFor, weeklyChallenges, xpEvents } from '../lib/xp.ts'
import { newTask, postpone, startSession, SUGGESTED, toggleTask } from '../lib/actions.ts'
import { AnimatedNumber, Bar, Btn, Chip, Field, Panel, Reveal, fmtMoney, usePhoto } from '../components/ui.tsx'
import { Plate } from '../components/Plate.tsx'
import { AREA_TONE, useParallax } from '../components/Module.tsx'

const greeting = (h: number) => (h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening')

function useClock() {
  const [d, setD] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setD(new Date()), 15000); return () => clearInterval(t) }, [])
  return d
}

export function Home() {
  const { state, update, celebrate, toast } = useStore()
  const p = state.profile!
  const now = useClock()
  const t = today()
  const energy = state.energy?.date === t ? state.energy : null
  const recs = useMemo(
    () => recommend({ state, today: t, energy: energy?.level ?? 'medium', minutes: energy?.minutes ?? p.dailyMinutes }),
    [state, t, energy, p.dailyMinutes],
  )
  const heroUrl = usePhoto(p.heroPhotoId)
  const par = useParallax<HTMLDivElement>(0.35)
  const [motto, setMotto] = useState(p.motto)
  useEffect(() => setMotto(p.motto), [p.motto])
  const day = Math.min(30, daysBetween(isoDate(p.createdAt), t) + 1)

  const start = (r: Recommendation) => update((s) => startSession(s, { label: r.taskId ? r.title : r.action, area: r.area, plannedMin: r.minutes, taskId: r.taskId }))

  const complete = (r: Recommendation) => {
    const task = state.tasks.find((x) => x.id === r.taskId)
    if (!task) return
    update((s) => toggleTask(s, task.id))
    if (task.importance === 3) celebrate({ kind: 'mission', title: task.title, xp: 30 })
    else toast(`Mission complete · +20 XP`)
  }

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative -mx-4 flex min-h-[94dvh] flex-col overflow-hidden sm:-mx-8 lg:-mx-12" aria-label="Today">
        <div ref={par} className="absolute inset-0 -bottom-24">
          <div className="drift h-full w-full">
            {heroUrl
              ? <img src={heroUrl} alt="" className="h-full w-full object-cover grayscale contrast-125 brightness-75" />
              : <Plate scene="monolith" className="h-full w-full" />}
          </div>
        </div>
        <div className="vignette absolute inset-0" />
        <div className="scanlines absolute inset-0 opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-ink/40" />

        <div className="relative flex items-center justify-between px-4 pt-6 sm:px-8 lg:px-12">
          <div className="kicker enter flex items-center gap-2"><span className="pulse-dot h-1.5 w-1.5 rounded-full bg-acc" />Local · {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          <div className="kicker enter hidden sm:block">Day {day < 30 ? String(day).padStart(2, '0') : '30+'} / 30 of the objective</div>
        </div>

        <div className="relative mt-auto px-4 pb-10 sm:px-8 lg:px-12">
          <div className="kicker enter text-bone/70" style={{ animationDelay: '100ms' }}>{fmtLong(t)}</div>
          <h1 className="display enter mt-4 text-[17vw] sm:text-[11vw] xl:text-[10rem]" style={{ animationDelay: '200ms' }}>
            <span className="block text-bone/50">{greeting(now.getHours())},</span>
            <span className="block">{p.name}<span className="text-acc">.</span></span>
          </h1>
          <label className="enter mt-5 block max-w-2xl" style={{ animationDelay: '350ms' }}>
            <span className="sr-only">Your motto</span>
            <input
              value={motto}
              onChange={(e) => setMotto(e.target.value)}
              onBlur={() => motto.trim() && motto !== p.motto && update((s) => ({ ...s, profile: { ...s.profile!, motto: motto.trim() } }))}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              className="w-full border-b border-transparent bg-transparent font-serif text-2xl italic text-bone/85 outline-none transition-colors hover:border-line2 focus:border-acc sm:text-3xl"
              title="Click to edit your motto"
              maxLength={80}
            />
          </label>

          <div className="enter mt-10 grid gap-6 border-t border-line2 pt-6 md:grid-cols-[1fr_auto] md:items-end" style={{ animationDelay: '500ms' }}>
            <div>
              <div className="kicker">Primary objective · 30 days</div>
              <div className="mt-2 max-w-2xl text-lg text-bone sm:text-xl">{p.objective30}</div>
            </div>
            {recs[0] ? (
              <Btn variant="primary" size="lg" onClick={() => start(recs[0])} className="w-full md:w-auto">
                <Play size={16} fill="currentColor" />Begin first mission · {recs[0].minutes} min
              </Btn>
            ) : (
              <Btn variant="primary" size="lg" onClick={() => document.getElementById('capture')?.focus()} className="w-full md:w-auto"><Plus size={16} />Define first mission</Btn>
            )}
          </div>
        </div>
      </section>

      {/* ── Goals ticker ─────────────────────────────────────── */}
      <div className="relative -mx-4 overflow-hidden border-y border-line bg-coal py-3 sm:-mx-8 lg:-mx-12" aria-hidden="true">
        <div className="marquee flex w-max gap-10 whitespace-nowrap">
          {[...p.goals, ...p.goals, ...p.goals, ...p.goals].map((g, i) => (
            <span key={i} className="display flex items-center gap-10 text-2xl text-bone/30">{g}<span className="text-acc">/</span></span>
          ))}
        </div>
      </div>

      {/* ── Today's priorities ───────────────────────────────── */}
      <section className="mt-16" aria-labelledby="prio">
        <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="kicker">Strategy engine · max three</div>
            <h2 id="prio" className="display mt-2 text-6xl sm:text-7xl">Today</h2>
          </div>
          <EnergyControl state={state} onChange={(level, minutes) => update((s) => ({ ...s, energy: { date: t, level, minutes } }))} current={energy} fallback={p.dailyMinutes} />
        </Reveal>

        <div className="mt-8 space-y-px">
          {recs.length === 0 && (
            <Reveal className="border border-dashed border-line2 p-8">
              <div className="display text-3xl">Nothing queued.</div>
              <p className="mt-2 max-w-md text-sm text-ash">Add a mission below or adopt a suggestion. The engine only recommends from what you've defined — it doesn't invent work.</p>
            </Reveal>
          )}
          {recs.map((r, i) => (
            <Reveal key={r.id} delay={i * 90}>
              <article className="panel group grid gap-6 p-5 sm:p-7 md:grid-cols-[110px_1fr_auto]">
                <div className={`display text-7xl leading-none sm:text-8xl ${i === 0 ? 'text-acc' : 'text-bone/20'}`}>{String(i + 1).padStart(2, '0')}</div>
                <div className="min-w-0">
                  <div className="kicker flex flex-wrap items-center gap-2">
                    <span className={AREA_TONE[r.area]}>{AREA_META[r.area].label}</span><span>·</span><Clock size={11} />{r.minutes} min
                  </div>
                  <h3 className="display mt-2 text-3xl sm:text-4xl">{r.title}</h3>
                  <ul className="mt-3 space-y-1 text-sm text-ash">
                    {r.why.map((w, j) => <li key={j} className="flex gap-2"><span className="text-acc/70">—</span>{w}</li>)}
                  </ul>
                  <div className="mt-4 border-l-2 border-acc bg-white/[0.02] px-4 py-3 text-sm">
                    <span className="kicker mr-2 text-acc">Do now</span>{r.action}
                  </div>
                </div>
                <div className="flex flex-row flex-wrap gap-2 md:flex-col">
                  <Btn variant={i === 0 ? 'primary' : 'line'} onClick={() => start(r)}><Play size={13} />Start</Btn>
                  {r.taskId && <Btn onClick={() => complete(r)}><Check size={13} />Done</Btn>}
                  {r.taskId && <Btn variant="ghost" onClick={() => { update((s) => postpone(s, r.taskId!)); toast('Moved to tomorrow. No penalty.') }}><SkipForward size={13} />Not today</Btn>}
                  {r.id.startsWith('reentry:') && <Btn variant="ghost" onClick={() => (location.hash = `/${r.area}`)}>Open<ArrowUpRight size={13} /></Btn>}
                  {r.projectId && <Btn variant="ghost" onClick={() => (location.hash = '/lab')}>Open lab<ArrowUpRight size={13} /></Btn>}
                  {r.id === 'review' && <Btn variant="ghost" onClick={() => (location.hash = '/progression')}>Review<ArrowUpRight size={13} /></Btn>}
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal><QuickCapture /></Reveal>
      </section>

      {/* ── Priority areas ───────────────────────────────────── */}
      <section className="mt-20" aria-labelledby="areas">
        <Reveal>
          <div className="kicker">Your top areas</div>
          <h2 id="areas" className="display mt-2 text-5xl sm:text-6xl">Focus fields</h2>
        </Reveal>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {p.areas.slice(0, 3).map((a, i) => <Reveal key={a} delay={i * 100}><AreaCard area={a} rank={i} state={state} /></Reveal>)}
        </div>
        {p.areas.length < AREAS.length && (
          <div className="mt-4 flex flex-wrap gap-2">
            {AREAS.filter((a) => !p.areas.slice(0, 3).includes(a)).map((a) => (
              <a key={a} href={`#/${a}`} className="border border-line px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ash hover:text-bone">{AREA_META[a].label} →</a>
            ))}
          </div>
        )}
      </section>

      {/* ── Progression + weekly ─────────────────────────────── */}
      <section className="mt-20 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Reveal><LevelCard state={state} /></Reveal>
        <Reveal delay={100}><WeeklyCard state={state} /></Reveal>
      </section>

      <Suggestions />
    </>
  )
}

function EnergyControl({ current, fallback, onChange }: { state: State; current: State['energy']; fallback: number; onChange: (l: Energy, m: number) => void }) {
  const level = current?.level
  const minutes = current?.minutes ?? fallback
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div>
        <div className="kicker mb-2">Energy today {level ? '' : '· not set'}</div>
        <div className="flex gap-1" role="group" aria-label="Energy level">
          {(['low', 'medium', 'high'] as Energy[]).map((e) => <Chip key={e} active={level === e} onClick={() => onChange(e, minutes)}>{e}</Chip>)}
        </div>
      </div>
      <label>
        <div className="kicker mb-2">Time today</div>
        <select className="field num w-28" value={minutes} onChange={(e) => onChange(level ?? 'medium', Number(e.target.value))}>
          {[15, 30, 45, 60, 90, 120, 180, 240].map((m) => <option key={m} value={m}>{m} min</option>)}
        </select>
      </label>
    </div>
  )
}

function QuickCapture() {
  const { state, update, toast } = useStore()
  const [title, setTitle] = useState('')
  const [first, setFirst] = useState('')
  const [area, setArea] = useState<Area>(state.profile!.areas[0] ?? 'mind')
  return (
    <form
      className="mt-6 grid gap-4 border border-line p-5 sm:grid-cols-[1.2fr_1.4fr_auto_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault()
        if (!title.trim()) return
        update((s) => ({ ...s, tasks: [...s.tasks, newTask({ title: title.trim(), area, firstAction: first.trim() })] }))
        setTitle(''); setFirst('')
        toast('Mission added')
      }}
    >
      <Field label="New mission"><input id="capture" className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to happen?" /></Field>
      <Field label="First 10-minute action" hint="makes starting easy"><input className="field" value={first} onChange={(e) => setFirst(e.target.value)} placeholder="The very first physical step" /></Field>
      <Field label="Area">
        <select className="field" value={area} onChange={(e) => setArea(e.target.value as Area)}>
          {AREAS.map((a) => <option key={a} value={a}>{AREA_META[a].label}</option>)}
        </select>
      </Field>
      <Btn type="submit" disabled={!title.trim()}><Plus size={14} />Add</Btn>
    </form>
  )
}

function AreaCard({ area, rank, state }: { area: Area; rank: number; state: State }) {
  const t = today(), w = weekKey(t)
  const cur = state.profile!.currency
  let value: number | string = 0, unit = '', sub = '', decimals = 0
  switch (area) {
    case 'physique': {
      value = state.workouts.filter((x) => inWeek(x.date, w)).length; unit = 'workouts this week'
      const lastW = [...state.daily].filter((d) => d.weightKg != null).sort((a, b) => (a.date < b.date ? 1 : -1))[0]
      sub = lastW ? `Last weight ${lastW.weightKg} kg · ${lastW.date}` : 'No weight logged yet'
      break
    }
    case 'looks': {
      value = state.routineChecks.filter((c) => c.date === t).length; unit = `of ${state.routines.length} routines today`
      sub = `${state.evolution.filter((e) => e.area === 'looks' && e.photoId).length} progress photos on record`
      break
    }
    case 'wealth': {
      const m = t.slice(0, 7)
      const tx = state.transactions.filter((x) => x.date.startsWith(m))
      const net = tx.reduce((n, x) => n + (x.kind === 'income' ? x.amount : -x.amount), 0)
      value = fmtMoney(net, cur); unit = 'net this month (actual)'
      sub = `${tx.length} transactions logged in ${fromKey(t).toLocaleDateString(undefined, { month: 'long' })}`
      break
    }
    case 'mind': {
      const mins = state.sessions.filter((f) => f.endedAt && inWeek(isoDate(f.endedAt), w)).reduce((n, f) => n + f.actualMin, 0)
      value = mins / 60; decimals = 1; unit = 'focus hours this week'
      sub = `${state.tasks.filter((x) => x.status === 'open').length} open missions`
      break
    }
    case 'social': {
      value = state.interactions.filter((i) => i.initiated && inWeek(i.date, w)).length; unit = 'initiated this week'
      sub = `${state.challenges.filter((c) => c.status === 'active').length} active challenges`
      break
    }
    case 'lab': {
      const active = state.projects.filter((x) => x.stage === 'active' || x.stage === 'prototype')
      value = active.length; unit = 'active builds'
      const next = active.flatMap((x) => x.milestones.filter((m) => !m.done).map((m) => `${x.title}: ${m.text}`))[0]
      sub = next ? `Next: ${next}` : `${state.projects.filter((x) => x.stage === 'idea').length} ideas captured`
      break
    }
  }
  return (
    <a href={`#/${area}`} className={`panel group relative block h-full overflow-hidden p-6 transition-colors hover:border-line2`}>
      <div className={`tex-${area} absolute inset-0 opacity-60`} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="kicker"><span className={AREA_TONE[area]}>#{rank + 1}</span> · {AREA_META[area].label}</span>
          <ArrowUpRight size={16} className="text-ash transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-bone" />
        </div>
        <div className="display mt-8 text-6xl">{typeof value === 'number' ? <AnimatedNumber value={value} decimals={decimals} /> : value}</div>
        <div className="kicker mt-2 text-bone/70">{unit}</div>
        <div className="mt-6 truncate border-t border-line pt-3 text-xs text-ash">{sub}</div>
      </div>
    </a>
  )
}

function LevelCard({ state }: { state: State }) {
  const ev = useMemo(() => xpEvents(state), [state])
  const total = ev.reduce((n, e) => n + e.amount, 0)
  const l = levelOf(total)
  return (
    <Panel kicker="Character" title={<>Level <span className="text-acc"><AnimatedNumber value={l.level} /></span> · <span className="font-serif normal-case italic">{titleFor(l.level)}</span></>}
      action={<a href="#/progression" className="kicker hover:text-bone">Details →</a>}>
      <div className="flex items-baseline justify-between"><span className="num text-sm text-ash"><AnimatedNumber value={l.into} /> / {l.span} XP</span><span className="num text-sm text-ash">{total} total</span></div>
      <Bar value={l.into} max={l.span} className="mt-2" label="Level progress" />
      <ul className="mt-6 space-y-2">
        {ev.slice(0, 4).map((e) => (
          <li key={e.key} className="flex items-center justify-between gap-4 text-sm"><span className="truncate text-ash">{e.label}</span><span className="num text-acc">+{e.amount}</span></li>
        ))}
        {ev.length === 0 && <li className="text-sm text-ash">XP appears here as you complete real actions. Every rule is listed on the Progress screen.</li>}
      </ul>
    </Panel>
  )
}

function WeeklyCard({ state }: { state: State }) {
  const ch = weeklyChallenges(state, weekKey(today()))
  return (
    <Panel kicker="This week · no penalties" title="Weekly challenges">
      <div className="space-y-5">
        {ch.map((c) => (
          <div key={c.id}>
            <div className="flex items-baseline justify-between text-sm">
              <span className={c.progress >= c.target ? 'text-acc' : ''}>{c.title}</span>
              <span className="num text-ash">{c.progress}/{c.target}</span>
            </div>
            <Bar value={c.progress} max={c.target} className="mt-2" label={c.title} color={c.progress >= c.target ? 'bg-acc' : 'bg-bone/60'} />
          </div>
        ))}
      </div>
      <p className="mt-6 text-xs text-ash">Each challenge met pays 40 XP. Missed ones simply reset next Monday.</p>
    </Panel>
  )
}

function Suggestions() {
  const { state, update, toast } = useStore()
  const p = state.profile!
  const open = state.tasks.filter((t) => t.status === 'open').length
  const have = new Set(state.tasks.map((t) => t.title))
  const list = SUGGESTED.filter((s) => p.areas.includes(s.area) && !have.has(s.title))
    .sort((a, b) => p.areas.indexOf(a.area) - p.areas.indexOf(b.area)).slice(0, 4)
  if (open >= 6 || list.length === 0) return null
  return (
    <section className="mt-20">
      <Reveal>
        <div className="kicker">Suggested · example content, not yours until adopted</div>
        <h2 className="display mt-2 text-4xl sm:text-5xl">Missions for your goals</h2>
      </Reveal>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {list.map((s, i) => (
          <Reveal key={s.title} delay={i * 70}>
            <div className="flex h-full flex-col border border-dashed border-line2 p-5">
              <div className="kicker"><span className={AREA_TONE[s.area]}>{AREA_META[s.area].label}</span> · suggestion</div>
              <div className="mt-2 text-lg">{s.title}</div>
              <p className="mt-1 flex-1 text-sm text-ash">First action: {s.firstAction}</p>
              <Btn size="sm" className="mt-4 self-start" onClick={() => { update((st) => ({ ...st, tasks: [...st.tasks, newTask({ ...s, origin: 'suggested' })] })); toast('Adopted into your missions') }}>
                Adopt<ArrowRight size={12} />
              </Btn>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
