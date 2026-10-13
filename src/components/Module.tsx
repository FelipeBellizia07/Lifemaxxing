import { useEffect, useRef, type ReactNode } from 'react'
import { AREA_META, type Area } from '../lib/types.ts'
import { Plate, type Scene } from './Plate.tsx'
import { reducedMotion } from './ui.tsx'

/** Subtle scroll parallax on a photographic layer. */
export function useParallax<T extends HTMLElement>(speed = 0.25) {
  const ref = useRef<T>(null)
  useEffect(() => {
    if (reducedMotion()) return
    let raf = 0
    const on = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => { if (ref.current) ref.current.style.transform = `translate3d(0, ${window.scrollY * speed}px, 0)` })
    }
    window.addEventListener('scroll', on, { passive: true })
    return () => { window.removeEventListener('scroll', on); cancelAnimationFrame(raf) }
  }, [speed])
  return ref
}

export const AREA_SCENE: Record<Area, Scene> = {
  physique: 'iron', looks: 'mirror', wealth: 'skyline', mind: 'eclipse', social: 'lights', lab: 'blueprint',
}

export const AREA_TONE: Record<Area, string> = {
  physique: 'text-acc', looks: 'text-bone', wealth: 'text-acc', mind: 'text-violet', social: 'text-volt', lab: 'text-volt',
}

export function ModuleHeader({ area, scene, code, title, tagline, children }: {
  area?: Area; scene?: Scene; code?: string; title?: string; tagline?: string; children?: ReactNode
}) {
  const meta = area ? AREA_META[area] : null
  const par = useParallax<HTMLDivElement>(0.3)
  return (
    <header className="relative -mx-4 overflow-hidden border-b border-line sm:-mx-8 lg:-mx-12">
      <div ref={par} className="absolute inset-0 -top-10 -bottom-10">
        <Plate scene={scene ?? AREA_SCENE[area!]} className="h-full w-full" />
      </div>
      <div className={`absolute inset-0 tex-${area ?? 'none'} opacity-70`} />
      <div className="vignette absolute inset-0" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
      <div className="relative px-4 pb-8 pt-24 sm:px-8 sm:pt-32 lg:px-12">
        <div className="kicker enter flex items-center gap-3">
          <span className={area ? AREA_TONE[area] : 'text-acc'}>{code ?? meta?.code}</span>
          <span className="h-px w-10 bg-line2" />
          <span>Module</span>
        </div>
        <h1 className="display enter mt-3 text-[12.5vw] sm:text-7xl lg:text-8xl" style={{ animationDelay: '80ms' }}>{title ?? meta?.label}</h1>
        <p className="enter mt-3 font-serif text-xl italic text-bone/75 sm:text-2xl" style={{ animationDelay: '160ms' }}>{tagline ?? meta?.tagline}</p>
        {children && <div className="enter mt-8" style={{ animationDelay: '240ms' }}>{children}</div>}
      </div>
    </header>
  )
}

/** Tabs used inside modules; keyboard-accessible buttons. */
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="no-scrollbar -mx-4 flex gap-6 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={`relative shrink-0 py-3 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors cursor-pointer ${value === t.id ? 'text-bone' : 'text-ash hover:text-bone'}`}
        >
          {t.label}
          <span className={`absolute inset-x-0 -bottom-px h-px bg-acc transition-transform duration-500 origin-left ${value === t.id ? 'scale-x-100' : 'scale-x-0'}`} />
        </button>
      ))}
    </div>
  )
}
