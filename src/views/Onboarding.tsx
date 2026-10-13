import { useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useStore } from '../lib/store.tsx'
import { AREAS, AREA_META, type Accent, type MetricKey, type MotionMode, type Profile } from '../lib/types.ts'
import { Btn, Chip, Field } from '../components/ui.tsx'
import { Plate } from '../components/Plate.tsx'

export const GOAL_OPTIONS = [
  'Build visible muscle', 'Lose fat without obsessing', 'Fix my sleep', 'Sharpen skin, hair & grooming',
  'Ship a project with Claude Code', 'Grow my income', 'Build savings', 'Get better at programming',
  'Read and think more deeply', 'Hold focus for hours', 'Start conversations with confidence', 'Build a real social circle',
]

export const METRIC_GROUPS: { label: string; items: { id: MetricKey; label: string }[] }[] = [
  { label: 'Body', items: [{ id: 'weight', label: 'Body weight' }, { id: 'workouts', label: 'Workouts' }, { id: 'sleep', label: 'Sleep' }, { id: 'hydration', label: 'Hydration' }, { id: 'nutrition', label: 'Protein / calories' }] },
  { label: 'Appearance', items: [{ id: 'skincare', label: 'Routines' }, { id: 'photos', label: 'Progress photos' }] },
  { label: 'Money', items: [{ id: 'income', label: 'Income' }, { id: 'expenses', label: 'Expenses' }, { id: 'savings', label: 'Savings balance' }] },
  { label: 'Mind & social', items: [{ id: 'focus', label: 'Focus time' }, { id: 'reading', label: 'Reading' }, { id: 'social', label: 'Interactions' }] },
]

export const MOTTOS = ['Quiet work. Loud results.', 'Become the evidence.', 'Start before you feel ready.', 'The edit is earned off-camera.', 'Small reps. Long arc.']

export const ACCENTS: { id: Accent; label: string; color: string }[] = [
  { id: 'lime', label: 'Noir / Lime', color: '#c6ff3d' },
  { id: 'violet', label: 'Noir / Ultraviolet', color: '#b49bff' },
  { id: 'cobalt', label: 'Noir / Cobalt', color: '#6b9bff' },
]

const STEPS = ['Identity', 'Goals', 'Priorities', 'Time', 'Metrics', 'Objective', 'Visuals'] as const

export function Onboarding() {
  const { update } = useStore()
  const [step, setStep] = useState(0)
  const [p, setP] = useState<Omit<Profile, 'createdAt'>>({
    name: '', motto: MOTTOS[0], objective30: '', goals: [], areas: [], dailyMinutes: 60,
    accent: 'lime', motion: 'cinematic', metrics: ['workouts', 'sleep', 'focus'], currency: 'USD',
  })
  const set = (patch: Partial<typeof p>) => setP((x) => ({ ...x, ...patch }))
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

  const canNext = [
    p.name.trim().length > 0,
    p.goals.length > 0,
    p.areas.length > 0,
    p.dailyMinutes > 0,
    p.metrics.length > 0,
    p.objective30.trim().length > 0,
    true,
  ][step]

  const finish = () => {
    document.documentElement.dataset.accent = p.accent
    update((s) => ({ ...s, profile: { ...p, name: p.name.trim(), objective30: p.objective30.trim(), createdAt: new Date().toISOString() } }))
  }

  return (
    <div className="relative min-h-dvh overflow-hidden" data-accent={p.accent}>
      <div className="fixed inset-0"><Plate scene={step === 0 ? 'monolith' : 'stairs'} className="h-full w-full opacity-70" /></div>
      <div className="vignette fixed inset-0" />
      <div className="fixed inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/30" />

      <div className="relative mx-auto flex min-h-dvh max-w-3xl flex-col px-5 py-8 sm:px-10">
        <div className="flex items-center justify-between">
          <div className="display text-xl">Life<span className="text-acc">Maxxing</span></div>
          <div className="kicker">{String(step + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')} · {STEPS[step]}</div>
        </div>
        <div className="mt-4 flex gap-1">{STEPS.map((_, i) => <div key={i} className={`h-[2px] flex-1 transition-colors duration-500 ${i <= step ? 'bg-acc' : 'bg-white/10'}`} />)}</div>

        <form
          key={step}
          className="view-enter flex flex-1 flex-col justify-center py-10"
          onSubmit={(e) => { e.preventDefault(); if (!canNext) return; step === STEPS.length - 1 ? finish() : setStep(step + 1) }}
        >
          {step === 0 && (
            <>
              <div className="kicker text-acc">Initialization</div>
              <h1 className="display mt-4 text-[17vw] sm:text-8xl">The edit<br />starts here.</h1>
              <p className="mt-6 max-w-lg font-serif text-xl italic text-bone/80">A private operating system for your body, mind, money and work. Nothing is pre-filled. Everything stays on this device.</p>
              <Field label="What should the system call you?" className="mt-10 max-w-md">
                <input className="field display text-3xl" value={p.name} onChange={(e) => set({ name: e.target.value })} placeholder="Name" autoFocus maxLength={40} />
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="display text-5xl sm:text-6xl">What are you building?</h2>
              <p className="mt-3 text-ash">Pick everything that's true. You can change this later.</p>
              <div className="mt-8 grid gap-2 sm:grid-cols-2">
                {GOAL_OPTIONS.map((g) => <Chip key={g} active={p.goals.includes(g)} onClick={() => set({ goals: toggle(p.goals, g) })}>{g}</Chip>)}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="display text-5xl sm:text-6xl">Rank what matters.</h2>
              <p className="mt-3 text-ash">Tap areas in order of importance. Your top three shape the dashboard and daily priorities.</p>
              <div className="mt-8 grid gap-2 sm:grid-cols-2">
                {AREAS.map((a) => {
                  const rank = p.areas.indexOf(a)
                  return (
                    <button
                      type="button" key={a} aria-pressed={rank >= 0}
                      onClick={() => set({ areas: toggle(p.areas, a) })}
                      className={`flex items-center gap-4 border p-4 text-left transition-all cursor-pointer ${rank >= 0 ? 'border-acc bg-acc/[0.07]' : 'border-line2 hover:border-bone/50'}`}
                    >
                      <span className={`display w-8 text-3xl ${rank >= 0 ? 'text-acc' : 'text-ash/40'}`}>{rank >= 0 ? rank + 1 : AREA_META[a].code}</span>
                      <span><span className="display block text-xl">{AREA_META[a].label}</span><span className="text-xs text-ash">{AREA_META[a].tagline}</span></span>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="display text-5xl sm:text-6xl">Honest time budget.</h2>
              <p className="mt-3 text-ash">On a normal day, how much time can you give deliberate work outside obligations? The engine plans inside this, never beyond it.</p>
              <div className="mt-8 flex flex-wrap gap-2">
                {[15, 30, 45, 60, 90, 120, 180].map((m) => <Chip key={m} active={p.dailyMinutes === m} onClick={() => set({ dailyMinutes: m })}>{m < 60 ? `${m} min` : `${m / 60} h`}</Chip>)}
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="display text-5xl sm:text-6xl">Track less. Mean it.</h2>
              <p className="mt-3 text-ash">Only metrics you'll actually log. Untracked metrics stay hidden from your dashboard.</p>
              <div className="mt-8 space-y-6">
                {METRIC_GROUPS.map((g) => (
                  <div key={g.label}>
                    <div className="kicker mb-2">{g.label}</div>
                    <div className="flex flex-wrap gap-2">{g.items.map((m) => <Chip key={m.id} active={p.metrics.includes(m.id)} onClick={() => set({ metrics: toggle(p.metrics, m.id) })}>{m.label}</Chip>)}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <h2 className="display text-5xl sm:text-6xl">Next 30 days.</h2>
              <p className="mt-3 text-ash">One objective. Concrete enough that you'll know if it happened.</p>
              <Field label="Primary objective" className="mt-8">
                <input className="field font-serif text-2xl italic" value={p.objective30} onChange={(e) => set({ objective30: e.target.value })} placeholder="e.g. Ship v1 of my app and train 12 times" autoFocus maxLength={120} />
              </Field>
              <Field label="Motto" hint="editable anytime" className="mt-8">
                <input className="field" value={p.motto} onChange={(e) => set({ motto: e.target.value })} maxLength={80} />
              </Field>
              <div className="mt-3 flex flex-wrap gap-2">{MOTTOS.map((m) => <Chip key={m} active={p.motto === m} onClick={() => set({ motto: m })}>{m}</Chip>)}</div>
              <Field label="Currency" hint="ISO code, e.g. USD, EUR, BRL" className="mt-8 max-w-[200px]">
                <input className="field num uppercase" value={p.currency} onChange={(e) => set({ currency: e.target.value.toUpperCase().slice(0, 3) })} />
              </Field>
            </>
          )}

          {step === 6 && (
            <>
              <h2 className="display text-5xl sm:text-6xl">Set the grade.</h2>
              <p className="mt-3 text-ash">Accent colour and motion intensity. Reduced-motion settings on your device are always respected.</p>
              <div className="mt-8 grid gap-2 sm:grid-cols-3">
                {ACCENTS.map((a) => (
                  <button type="button" key={a.id} aria-pressed={p.accent === a.id} onClick={() => set({ accent: a.id })}
                    className={`border p-4 text-left cursor-pointer ${p.accent === a.id ? 'border-bone' : 'border-line2 hover:border-bone/50'}`}>
                    <div className="h-16 bg-coal2" style={{ boxShadow: `inset 0 -3px 0 ${a.color}` }}><div className="display p-3 text-2xl" style={{ color: a.color }}>Aa</div></div>
                    <div className="kicker mt-3">{a.label}</div>
                  </button>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {(['cinematic', 'calm'] as MotionMode[]).map((m) => <Chip key={m} active={p.motion === m} onClick={() => set({ motion: m })}>{m === 'cinematic' ? 'Cinematic motion' : 'Calm (minimal motion)'}</Chip>)}
              </div>
            </>
          )}

          <div className="mt-12 flex items-center gap-3">
            {step > 0 && <Btn type="button" variant="ghost" onClick={() => setStep(step - 1)}><ArrowLeft size={14} />Back</Btn>}
            <Btn type="submit" variant="primary" size="lg" disabled={!canNext}>
              {step === STEPS.length - 1 ? 'Enter the system' : 'Continue'}<ArrowRight size={16} />
            </Btn>
          </div>
        </form>
      </div>
    </div>
  )
}

