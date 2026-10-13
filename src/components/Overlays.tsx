import { useEffect, useState } from 'react'
import { Square, Zap } from 'lucide-react'
import { useStore } from '../lib/store.tsx'
import { BLOCKERS, cancelSession, endSession, logInterruption } from '../lib/actions.ts'
import type { BlockerKind } from '../lib/types.ts'
import { AREA_META } from '../lib/types.ts'
import { Btn, Chip, Field } from './ui.tsx'
import { Plate } from './Plate.tsx'
import { AREA_SCENE } from './Module.tsx'

const mmss = (sec: number) => `${String(Math.floor(Math.abs(sec) / 60)).padStart(2, '0')}:${String(Math.abs(sec) % 60).padStart(2, '0')}`

/** Fullscreen focus session. Survives refresh because the start time lives in state. */
export function FocusOverlay() {
  const { state, update, celebrate, toast } = useStore()
  const f = state.sessions.find((x) => x.id === state.activeSessionId)
  const [now, setNow] = useState(Date.now())
  const [phase, setPhase] = useState<'run' | 'end'>('run')
  const [intLog, setIntLog] = useState<{ open: boolean; kind: BlockerKind; note: string }>({ open: false, kind: 'phone', note: '' })
  const [blocker, setBlocker] = useState<BlockerKind | undefined>()

  useEffect(() => {
    if (!f) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [f])
  useEffect(() => { setPhase('run'); setBlocker(undefined) }, [f?.id])
  useEffect(() => {
    if (!f) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && phase === 'run' && setPhase('end')
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [f, phase])

  if (!f) return null
  const task = f.taskId ? state.tasks.find((t) => t.id === f.taskId) : undefined
  const elapsed = Math.floor((now - new Date(f.startedAt).getTime()) / 1000)
  const remaining = f.plannedMin * 60 - elapsed
  const pct = Math.min(1, elapsed / (f.plannedMin * 60))

  const finish = (complete: boolean) => {
    const mins = Math.round(elapsed / 60)
    update((s) => endSession(s, blocker, complete))
    if (complete && task) celebrate({ kind: 'mission', title: task.title, xp: (task.importance === 3 ? 30 : 20) + (mins >= 5 ? Math.min(30, Math.floor(mins / 2)) : 0), sub: mins >= 1 ? `${mins} min focused` : undefined })
    else toast(mins >= 5 ? `Session saved · ${mins} min` : 'Session saved. Under 5 min earns no XP, but starting counts.')
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Focus session" className="fixed inset-0 z-50 flex flex-col bg-ink text-bone">
      <div className="absolute inset-0 opacity-40"><Plate scene={AREA_SCENE[f.area]} className="h-full w-full" /></div>
      <div className="vignette absolute inset-0" />
      <div className="scanlines absolute inset-0" />
      {/* letterbox bars sweep away on entry */}
      <div className="letterbox-in absolute inset-x-0 top-0 h-1/2 origin-top bg-black" />
      <div className="letterbox-in absolute inset-x-0 bottom-0 h-1/2 origin-bottom bg-black" />
      <div className="absolute inset-x-0 top-0 h-[7vh] bg-black" />
      <div className="absolute inset-x-0 bottom-0 h-[7vh] bg-black" />

      <div className="relative flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="kicker enter flex items-center gap-2" style={{ animationDelay: '700ms' }}>
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-acc" /> Focus · {AREA_META[f.area].label}
        </div>
        <div className="display enter mt-6 num text-[26vw] leading-none tabular-nums sm:text-[17vw] lg:text-[13rem]" style={{ animationDelay: '800ms', fontFamily: 'var(--font-display)' }} aria-live="off">
          {remaining >= 0 ? mmss(remaining) : `+${mmss(remaining)}`}
        </div>
        <div className="enter mt-2 max-w-2xl" style={{ animationDelay: '950ms' }}>
          <div className="font-serif text-2xl italic sm:text-3xl">{f.label}</div>
          {task?.firstAction && <p className="mt-3 text-sm text-ash">First action: <span className="text-bone">{task.firstAction}</span></p>}
          {remaining < 0 && <p className="mt-3 text-sm text-acc">Planned time reached. Keep going or wrap up — either is a win.</p>}
        </div>
        <div className="mt-10 h-px w-full max-w-xl bg-white/10"><div className="h-px bg-acc" style={{ width: `${pct * 100}%`, transition: 'width 1s linear' }} /></div>

        {phase === 'run' ? (
          <div className="enter mt-10 flex flex-wrap justify-center gap-3" style={{ animationDelay: '1100ms' }}>
            <Btn onClick={() => setIntLog({ ...intLog, open: !intLog.open })}><Zap size={14} />Interruption {f.interruptions.length > 0 && `· ${f.interruptions.length}`}</Btn>
            <Btn variant="primary" onClick={() => setPhase('end')}><Square size={14} />End session</Btn>
          </div>
        ) : (
          <div className="enter mt-8 w-full max-w-xl text-left">
            <div className="kicker mb-3">Anything get in the way? (optional)</div>
            <div className="flex flex-wrap gap-2">
              {BLOCKERS.map((b) => <Chip key={b.id} active={blocker === b.id} onClick={() => setBlocker(blocker === b.id ? undefined : b.id)}>{b.label}</Chip>)}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              {task && task.status === 'open' && <Btn variant="primary" onClick={() => finish(true)}>Save + mission complete</Btn>}
              <Btn variant={task ? 'line' : 'primary'} onClick={() => finish(false)}>Save session</Btn>
              <Btn variant="ghost" onClick={() => setPhase('run')}>Back</Btn>
              <Btn variant="ghost" onClick={() => { update(cancelSession); toast('Session discarded') }}>Discard</Btn>
            </div>
          </div>
        )}

        {intLog.open && phase === 'run' && (
          <form
            className="enter mt-6 w-full max-w-xl border border-line2 bg-coal/90 p-4 text-left"
            onSubmit={(e) => { e.preventDefault(); update((s) => logInterruption(s, intLog.kind, intLog.note)); setIntLog({ open: false, kind: intLog.kind, note: '' }); toast('Interruption logged. Back to it.') }}
          >
            <div className="flex flex-wrap gap-2">
              {BLOCKERS.map((b) => <Chip key={b.id} active={intLog.kind === b.id} onClick={() => setIntLog({ ...intLog, kind: b.id })}>{b.label}</Chip>)}
            </div>
            <Field label="Note" className="mt-3"><input className="field" value={intLog.note} onChange={(e) => setIntLog({ ...intLog, note: e.target.value })} placeholder="What pulled you away?" autoFocus /></Field>
            <Btn type="submit" size="sm" className="mt-3">Log it</Btn>
          </form>
        )}
      </div>
    </div>
  )
}

/** Fullscreen completion moment for important missions and milestones. */
export function CelebrationOverlay() {
  const { celebration: c, clearCelebration } = useStore()
  useEffect(() => {
    if (!c) return
    const t = setTimeout(clearCelebration, 3600)
    const k = () => clearCelebration()
    window.addEventListener('keydown', k)
    return () => { clearTimeout(t); window.removeEventListener('keydown', k) }
  }, [c, clearCelebration])
  if (!c) return null
  const head = { mission: 'Mission complete', milestone: 'Milestone', level: 'Level up' }[c.kind]
  return (
    <div role="status" aria-live="polite" onClick={clearCelebration} className="fixed inset-0 z-[70] flex cursor-pointer items-center justify-center overflow-hidden bg-black/90">
      <div className="flash absolute inset-0 bg-bone" />
      <div className="wipe absolute inset-y-[48%] left-0 right-0 h-[4%] bg-acc" />
      <div className="relative px-6 text-center">
        <div className="kicker slam text-acc" style={{ animationDelay: '300ms' }}>{head}</div>
        <div className="display slam mt-4 text-[13vw] sm:text-8xl" style={{ animationDelay: '450ms' }}>{c.title}</div>
        {c.xp != null && <div className="num slam mt-6 text-2xl text-acc" style={{ animationDelay: '700ms' }}>+{c.xp} XP</div>}
        {c.sub && <div className="enter mt-3 font-serif text-xl italic text-ash" style={{ animationDelay: '900ms' }}>{c.sub}</div>}
      </div>
    </div>
  )
}

export function Toasts() {
  const { toasts } = useStore()
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-24 left-1/2 z-[80] flex w-[min(92vw,420px)] -translate-x-1/2 flex-col gap-2 lg:bottom-6">
      {toasts.map((t) => (
        <div key={t.id} className={`enter border px-4 py-3 text-sm backdrop-blur ${t.tone === 'err' ? 'border-red-500/40 bg-red-950/80 text-red-200' : 'border-line2 bg-coal/90 text-bone'}`}>
          <span className={`mr-2 font-mono text-[10px] ${t.tone === 'err' ? 'text-red-300' : 'text-acc'}`}>{t.tone === 'err' ? 'ERR' : 'OK'}</span>{t.text}
        </div>
      ))}
    </div>
  )
}
