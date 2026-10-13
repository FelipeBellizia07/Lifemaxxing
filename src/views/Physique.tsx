import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Area as RArea, AreaChart, Bar as RBar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from '../lib/store.tsx'
import type { DailyLog, MetricKey } from '../lib/types.ts'
import { addDays, fmtShort, today, uid, weekKey } from '../lib/date.ts'
import { AnimatedNumber, Btn, EmptyState, Field, IconBtn, Panel, Stat, numOrUndef, useConfirm } from '../components/ui.tsx'
import { ModuleHeader, Tabs } from '../components/Module.tsx'
import { Missions, chartTooltip } from './Mind.tsx'

const FIELDS: { key: keyof Omit<DailyLog, 'date'>; metric: MetricKey; label: string; unit: string }[] = [
  { key: 'weightKg', metric: 'weight', label: 'Weight', unit: 'kg' },
  { key: 'sleepH', metric: 'sleep', label: 'Sleep', unit: 'h' },
  { key: 'waterL', metric: 'hydration', label: 'Water', unit: 'L' },
  { key: 'proteinG', metric: 'nutrition', label: 'Protein', unit: 'g' },
  { key: 'kcal', metric: 'nutrition', label: 'Calories', unit: 'kcal' },
]

export function Physique() {
  const { state } = useStore()
  const [tab, setTab] = useState<'log' | 'training' | 'trends' | 'missions'>('log')
  const w = weekKey(today())
  const weights = state.daily.filter((d) => d.weightKg != null).sort((a, b) => a.date.localeCompare(b.date))
  const sleeps = state.daily.filter((d) => d.sleepH != null && d.date >= addDays(today(), -6))
  const avgSleep = sleeps.length ? sleeps.reduce((n, d) => n + d.sleepH!, 0) / sleeps.length : null
  return (
    <>
      <ModuleHeader area="physique">
        <div className="grid max-w-3xl grid-cols-3 gap-6">
          <Stat label="Workouts · week" value={<AnimatedNumber value={state.workouts.filter((x) => weekKey(x.date) === w).length} />} />
          <Stat label="Latest weight" value={weights.length ? <AnimatedNumber value={weights.at(-1)!.weightKg!} decimals={1} /> : '—'} unit={weights.length ? 'kg' : undefined} />
          <Stat label="Avg sleep · 7d" value={avgSleep != null ? <AnimatedNumber value={avgSleep} decimals={1} /> : '—'} unit={avgSleep != null ? 'h' : undefined} />
        </div>
      </ModuleHeader>
      <div className="mt-8"><Tabs tabs={[{ id: 'log', label: 'Daily log' }, { id: 'training', label: 'Training' }, { id: 'trends', label: 'Trends' }, { id: 'missions', label: 'Missions' }]} value={tab} onChange={setTab} /></div>
      <div className="mt-8">
        {tab === 'log' && <DailyLogPanel />}
        {tab === 'training' && <Training />}
        {tab === 'trends' && <Trends />}
        {tab === 'missions' && <Missions area="physique" />}
      </div>
    </>
  )
}

function DailyLogPanel() {
  const { state, update, toast } = useStore()
  const tracked = FIELDS.filter((f) => state.profile!.metrics.includes(f.metric))
  const fields = tracked.length ? tracked : FIELDS
  const [date, setDate] = useState(today())
  const existing = state.daily.find((d) => d.date === date)
  const [vals, setVals] = useState<Record<string, string>>({})
  const { ask, node } = useConfirm()
  const v = (k: string) => vals[`${date}:${k}`] ?? (existing?.[k as keyof DailyLog]?.toString() ?? '')
  const history = [...state.daily].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 21)

  const save = () => {
    const entry: DailyLog = { date }
    for (const f of fields) {
      const n = numOrUndef(v(f.key))
      if (n != null && n >= 0) entry[f.key] = n
    }
    update((s) => ({ ...s, daily: [...s.daily.filter((d) => d.date !== date), { ...s.daily.find((d) => d.date === date), ...entry }] }))
    toast('Body log saved')
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <Panel kicker="30 seconds, any field optional" title="Today's numbers" className="h-fit">
        <form onSubmit={(e) => { e.preventDefault(); save() }} className="space-y-5">
          <Field label="Date"><input type="date" className="field num" value={date} max={today()} onChange={(e) => setDate(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-x-5 gap-y-5">
            {fields.map((f) => (
              <Field key={f.key} label={f.label} hint={f.unit}>
                <input inputMode="decimal" className="field num text-xl" value={v(f.key)} onChange={(e) => setVals({ ...vals, [`${date}:${f.key}`]: e.target.value })} placeholder="—" />
              </Field>
            ))}
          </div>
          <Btn type="submit" variant="primary" className="w-full">{existing ? 'Update log' : 'Save log'}</Btn>
          {!tracked.length && <p className="text-xs text-ash">Showing all fields because no body metrics are selected in Settings.</p>}
        </form>
      </Panel>
      <div>
        <div className="kicker mb-3">Recent logs</div>
        {history.length === 0 ? <EmptyState title="No logs yet" body="Skip days freely. Trends use whatever you record." /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[460px] text-sm">
              <thead><tr className="kicker text-left"><th className="py-2 font-normal">Date</th>{FIELDS.map((f) => <th key={f.key} className="font-normal">{f.label}</th>)}<th /></tr></thead>
              <tbody>
                {history.map((d) => (
                  <tr key={d.date} className="border-t border-line">
                    <td className="num py-2 text-ash">{fmtShort(d.date)}</td>
                    {FIELDS.map((f) => <td key={f.key} className="num">{d[f.key] ?? <span className="text-ash/40">·</span>}</td>)}
                    <td className="text-right"><IconBtn label="Delete log" onClick={() => ask(() => update((s) => ({ ...s, daily: s.daily.filter((x) => x.date !== d.date) })), `Delete log for ${fmtShort(d.date)}?`)}><Trash2 size={13} /></IconBtn></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {node}
    </div>
  )
}

const WORKOUT_TYPES = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full body', 'Cardio', 'Mobility', 'Sport']

function Training() {
  const { state, update, toast } = useStore()
  const [f, setF] = useState({ date: today(), type: 'Push', durationMin: '60', notes: '' })
  const { ask, node } = useConfirm()
  const list = [...state.workouts].sort((a, b) => b.date.localeCompare(a.date))
  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <Panel kicker="Log" title="Workout" className="h-fit">
        <form className="space-y-5" onSubmit={(e) => {
          e.preventDefault()
          const d = Number(f.durationMin)
          if (!(d > 0)) return
          update((s) => ({ ...s, workouts: [...s.workouts, { id: uid(), date: f.date, type: f.type.trim() || 'Workout', durationMin: d, notes: f.notes.trim() }] }))
          setF({ ...f, notes: '' })
          toast('Workout logged · +15 XP')
        }}>
          <div className="flex flex-wrap gap-1">
            {WORKOUT_TYPES.map((t) => (
              <button type="button" key={t} onClick={() => setF({ ...f, type: t })} aria-pressed={f.type === t}
                className={`border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider cursor-pointer ${f.type === t ? 'border-acc text-acc' : 'border-line2 text-ash hover:text-bone'}`}>{t}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date"><input type="date" className="field num" value={f.date} max={today()} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
            <Field label="Duration" hint="min"><input inputMode="numeric" className="field num" value={f.durationMin} onChange={(e) => setF({ ...f, durationMin: e.target.value })} /></Field>
          </div>
          <Field label="Sets / lifts / notes"><textarea className="field min-h-[90px] num text-sm" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder={'Bench 3×8 @ 60kg\nOHP 3×10 @ 30kg'} /></Field>
          <Btn type="submit" variant="primary" className="w-full"><Plus size={14} />Log workout</Btn>
        </form>
      </Panel>
      <div>
        <div className="kicker mb-3">History · {list.length} sessions</div>
        {list.length === 0 ? <EmptyState title="No workouts yet" body="Log the next one, even if it's 15 minutes." /> : (
          <ul className="space-y-px">
            {list.map((w) => (
              <li key={w.id} className="panel tex-physique flex items-start gap-4 p-4">
                <div className="w-16 shrink-0"><div className="num text-xs text-ash">{fmtShort(w.date)}</div><div className="num mt-1 text-xs text-acc">{w.durationMin}m</div></div>
                <div className="min-w-0 flex-1"><div className="display text-xl">{w.type}</div>{w.notes && <pre className="num mt-1 whitespace-pre-wrap text-xs text-ash">{w.notes}</pre>}</div>
                <IconBtn label="Delete workout" onClick={() => ask(() => update((s) => ({ ...s, workouts: s.workouts.filter((x) => x.id !== w.id) })), 'Delete workout?')}><Trash2 size={14} /></IconBtn>
              </li>
            ))}
          </ul>
        )}
      </div>
      {node}
    </div>
  )
}

function Trends() {
  const { state } = useStore()
  const weights = useMemo(() => state.daily.filter((d) => d.weightKg != null).sort((a, b) => a.date.localeCompare(b.date)).map((d) => ({ d: fmtShort(d.date), kg: d.weightKg })), [state.daily])
  const weeks = useMemo(() => {
    const w0 = weekKey(today())
    return Array.from({ length: 10 }, (_, i) => {
      const w = addDays(w0, (i - 9) * 7)
      const list = state.workouts.filter((x) => weekKey(x.date) === w)
      return { w: fmtShort(w), n: list.length, min: list.reduce((n, x) => n + x.durationMin, 0) }
    })
  }, [state.workouts])
  const sleep = useMemo(() => Array.from({ length: 21 }, (_, i) => {
    const d = addDays(today(), i - 20)
    return { d: fmtShort(d), h: state.daily.find((x) => x.date === d)?.sleepH ?? null }
  }), [state.daily])
  const hasSleep = sleep.some((x) => x.h != null)
  const domain = weights.length ? [Math.floor(Math.min(...weights.map((w) => w.kg!)) - 1), Math.ceil(Math.max(...weights.map((w) => w.kg!)) + 1)] : [0, 1]
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel kicker="Recorded entries only" title="Body weight" className="lg:col-span-2">
        {weights.length < 2 ? <EmptyState title="Need two entries" body="Log weight on at least two days to see a trend line." /> : (
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={weights} margin={{ left: -16, right: 8, top: 8 }}>
                <defs><linearGradient id="wg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--acc)" stopOpacity={0.25} /><stop offset="1" stopColor="var(--acc)" stopOpacity={0} /></linearGradient></defs>
                <XAxis dataKey="d" tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis domain={domain} tickLine={false} axisLine={false} />
                <Tooltip {...chartTooltip} />
                <RArea type="monotone" dataKey="kg" stroke="var(--acc)" strokeWidth={1.5} fill="url(#wg)" dot={{ r: 2, fill: 'var(--acc)' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>
      <Panel kicker="Last 10 weeks" title="Training consistency">
        {state.workouts.length === 0 ? <EmptyState title="No workouts" body="Weekly counts appear once you log training." /> : (
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={weeks} margin={{ left: -24, top: 8 }}>
                <XAxis dataKey="w" tickLine={false} axisLine={false} minTickGap={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip {...chartTooltip} />
                <RBar dataKey="n" name="workouts" fill="var(--acc)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>
      <Panel kicker="Last 21 days" title="Sleep">
        {!hasSleep ? <EmptyState title="No sleep data" body="Add hours slept in the daily log." /> : (
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={sleep} margin={{ left: -24, top: 8 }}>
                <XAxis dataKey="d" tickLine={false} axisLine={false} minTickGap={20} />
                <YAxis domain={[0, 12]} tickLine={false} axisLine={false} />
                <Tooltip {...chartTooltip} />
                <Line dataKey="h" stroke="var(--bone)" strokeWidth={1.5} connectNulls dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>
    </div>
  )
}
