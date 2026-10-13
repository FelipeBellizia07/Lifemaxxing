import { useEffect, useMemo, useRef, useState } from 'react'
import { Brain, Dumbbell, Film, FlaskConical, House, Landmark, ScanFace, Settings2, Trophy, Users, type LucideIcon } from 'lucide-react'
import { useStore } from './lib/store.tsx'
import { levelOf, titleFor, xpEvents } from './lib/xp.ts'
import { CelebrationOverlay, FocusOverlay, Toasts } from './components/Overlays.tsx'
import { Onboarding } from './views/Onboarding.tsx'
import { Home } from './views/Home.tsx'
import { Physique } from './views/Physique.tsx'
import { Looks } from './views/Looks.tsx'
import { Wealth } from './views/Wealth.tsx'
import { Mind } from './views/Mind.tsx'
import { Social } from './views/Social.tsx'
import { Lab } from './views/Lab.tsx'
import { Evolution } from './views/Evolution.tsx'
import { Progression } from './views/Progression.tsx'
import { Settings } from './views/Settings.tsx'

const ROUTES = {
  home: { label: 'Home', icon: House, el: Home },
  physique: { label: 'Physique', icon: Dumbbell, el: Physique },
  looks: { label: 'Looks', icon: ScanFace, el: Looks },
  wealth: { label: 'Wealth', icon: Landmark, el: Wealth },
  mind: { label: 'Mind', icon: Brain, el: Mind },
  social: { label: 'Social', icon: Users, el: Social },
  lab: { label: 'Lab', icon: FlaskConical, el: Lab },
  evolution: { label: 'Evolution', icon: Film, el: Evolution },
  progression: { label: 'Progress', icon: Trophy, el: Progression },
  settings: { label: 'Settings', icon: Settings2, el: Settings },
} satisfies Record<string, { label: string; icon: LucideIcon; el: () => JSX.Element }>
export type Route = keyof typeof ROUTES

const parse = (): Route => {
  const h = location.hash.replace(/^#\/?/, '') as Route
  return h in ROUTES ? h : 'home'
}
export const go = (r: Route) => { location.hash = `/${r}` }

export default function App() {
  const { state, status, saveError, celebrate, celebration } = useStore()
  const [route, setRoute] = useState<Route>(parse)

  useEffect(() => {
    const on = () => { setRoute(parse()); window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }) }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.accent = state.profile?.accent ?? 'lime'
    root.dataset.motion = state.profile?.motion ?? 'cinematic'
  }, [state.profile?.accent, state.profile?.motion])

  const lvl = useMemo(() => levelOf(xpEvents(state).reduce((n, e) => n + e.amount, 0)), [state])

  // Level-up moment. Folded into an active celebration so the two don't fight.
  const prevLevel = useRef(0)
  useEffect(() => {
    if (status !== 'ready') return
    if (prevLevel.current && lvl.level > prevLevel.current) {
      const sub = `Level ${lvl.level} · ${titleFor(lvl.level)}`
      celebrate(celebration ? { ...celebration, sub } : { kind: 'level', title: `Level ${lvl.level}`, sub: titleFor(lvl.level) })
    }
    prevLevel.current = lvl.level
  }, [lvl.level, status]) // eslint-disable-line react-hooks/exhaustive-deps

  if (status === 'loading') return (
    <div className="grain flex min-h-dvh items-center justify-center">
      <div className="text-center"><div className="display text-5xl">LifeMaxxing</div><div className="kicker mt-3 pulse-dot">Loading local vault</div></div>
    </div>
  )
  if (status === 'error') return (
    <div className="grain flex min-h-dvh items-center justify-center p-6">
      <div className="max-w-md border border-red-500/40 p-6">
        <div className="kicker text-red-300">Storage unavailable</div>
        <p className="mt-3 text-sm text-ash">IndexedDB could not be opened. This happens in some private-browsing modes or when site data is blocked. Open LifeMaxxing in a normal window and allow site storage.</p>
      </div>
    </div>
  )
  if (!state.profile) return <div className="grain"><Onboarding /><Toasts /></div>

  const View = ROUTES[route].el
  const nav = Object.entries(ROUTES) as [Route, (typeof ROUTES)[Route]][]

  return (
    <div className="grain min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:bg-acc focus:px-3 focus:py-2 focus:text-acc-ink">Skip to content</a>

      {/* Desktop rail */}
      <nav aria-label="Primary" className="fixed inset-y-0 left-0 z-40 hidden w-[208px] flex-col border-r border-line bg-ink/85 backdrop-blur-md lg:flex">
        <a href="#/home" className="block px-6 pb-6 pt-7">
          <div className="display text-[26px] leading-none">Life<span className="text-acc">Maxxing</span></div>
          <div className="kicker mt-2">Personal OS · v1</div>
        </a>
        <ul className="flex-1 space-y-px px-3">
          {nav.map(([id, r], i) => {
            const Icon = r.icon
            const active = route === id
            return (
              <li key={id}>
                <a href={`#/${id}`} aria-current={active ? 'page' : undefined} className={`group flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${active ? 'bg-white/[0.05] text-bone' : 'text-ash hover:text-bone'}`}>
                  <span className={`num w-5 text-[10px] ${active ? 'text-acc' : 'text-ash/50'}`}>{String(i).padStart(2, '0')}</span>
                  <Icon size={15} strokeWidth={1.6} />
                  <span className="tracking-wide">{r.label}</span>
                  {active && <span className="ml-auto h-1 w-1 bg-acc" />}
                </a>
              </li>
            )
          })}
        </ul>
        <a href="#/progression" className="m-3 block border border-line p-4 hover:border-line2">
          <div className="flex items-baseline justify-between"><span className="kicker">Level</span><span className="display text-2xl text-acc">{lvl.level}</span></div>
          <div className="mt-1 font-serif text-lg italic">{titleFor(lvl.level)}</div>
          <div className="mt-2 h-[2px] bg-white/10"><div className="h-full bg-acc" style={{ width: `${(lvl.into / lvl.span) * 100}%` }} /></div>
        </a>
      </nav>

      {/* Mobile bottom bar */}
      <nav aria-label="Primary mobile" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        <ul className="no-scrollbar flex overflow-x-auto">
          {nav.map(([id, r]) => {
            const Icon = r.icon
            const active = route === id
            return (
              <li key={id} className="shrink-0">
                <a href={`#/${id}`} aria-current={active ? 'page' : undefined} className={`flex w-[68px] flex-col items-center gap-1 py-2.5 text-[9.5px] font-mono uppercase tracking-wider ${active ? 'text-acc' : 'text-ash'}`}>
                  <Icon size={18} strokeWidth={1.6} />{r.label}
                </a>
              </li>
            )
          })}
        </ul>
      </nav>

      {saveError && (
        <div role="alert" className="fixed left-1/2 top-3 z-[85] -translate-x-1/2 border border-red-500/40 bg-red-950/90 px-4 py-2 text-xs text-red-200">
          Could not save: {saveError}. Export a backup from Settings.
        </div>
      )}

      <main id="main" key={route} className="view-enter px-4 pb-32 sm:px-8 lg:ml-[208px] lg:px-12 lg:pb-16">
        <View />
      </main>

      <FocusOverlay />
      <CelebrationOverlay />
      <Toasts />
    </div>
  )
}
