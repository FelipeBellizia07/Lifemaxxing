import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { compressImage, getPhoto, putPhoto } from '../lib/db.ts'
import { uid } from '../lib/date.ts'

export const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'calm'

// ── Buttons ─────────────────────────────────────────────────────────
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'line' | 'danger'; size?: 'sm' | 'md' | 'lg' }
export function Btn({ variant = 'line', size = 'md', className = '', ...p }: BtnProps) {
  const v = {
    primary: 'bg-acc text-acc-ink hover:brightness-110 border border-acc',
    line: 'border border-line2 text-bone hover:border-bone hover:bg-white/[0.03]',
    ghost: 'text-ash hover:text-bone',
    danger: 'border border-red-500/40 text-red-300 hover:bg-red-500/10',
  }[variant]
  const s = { sm: 'h-8 px-3 text-[11px]', md: 'h-10 px-4 text-xs', lg: 'h-14 px-7 text-sm' }[size]
  return (
    <button
      {...p}
      className={`inline-flex items-center justify-center gap-2 font-mono uppercase tracking-[0.16em] transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none cursor-pointer select-none ${v} ${s} ${className}`}
    />
  )
}

export const IconBtn = ({ label, className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) => (
  <button aria-label={label} title={label} {...p} className={`inline-flex h-8 w-8 items-center justify-center text-ash hover:text-bone transition-colors cursor-pointer ${className}`} />
)

// ── Layout primitives ──────────────────────────────────────────────
export function Panel({ children, className = '', title, kicker, action }: { children: ReactNode; className?: string; title?: ReactNode; kicker?: string; action?: ReactNode }) {
  return (
    <section className={`panel hud-corners p-5 sm:p-6 ${className}`}>
      {(title || kicker || action) && (
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            {kicker && <div className="kicker mb-1.5">{kicker}</div>}
            {title && <h3 className="display text-2xl sm:text-[28px]">{title}</h3>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

export function Label({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <span className="kicker flex items-baseline justify-between gap-2">
      {children}
      {hint && <span className="normal-case tracking-normal text-[10px] text-ash/70">{hint}</span>}
    </span>
  )
}

export function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <Label hint={hint}>{label}</Label>
      {children}
    </label>
  )
}

export function Chip({ active, children, onClick, className = '' }: { active?: boolean; children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`border px-3 py-2 text-left text-xs font-mono uppercase tracking-[0.12em] transition-all cursor-pointer ${active ? 'border-acc bg-acc/10 text-bone' : 'border-line2 text-ash hover:text-bone hover:border-bone/50'} ${className}`}
    >
      {children}
    </button>
  )
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="border border-dashed border-line2 px-5 py-8 text-center">
      <div className="display text-xl text-bone/80">{title}</div>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ash">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Stat({ label, value, unit, sub, accent }: { label: string; value: ReactNode; unit?: string; sub?: ReactNode; accent?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="kicker">{label}</div>
      <div className={`mt-1 flex items-baseline gap-1.5 ${accent ? 'text-acc' : ''}`}>
        <span className="display text-4xl sm:text-5xl">{value}</span>
        {unit && <span className="num text-xs text-ash">{unit}</span>}
      </div>
      {sub && <div className="mt-1 text-xs text-ash">{sub}</div>}
    </div>
  )
}

// ── Motion primitives ──────────────────────────────────────────────
export function AnimatedNumber({ value, decimals = 0, duration = 1100 }: { value: number; decimals?: number; duration?: number }) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    if (reducedMotion()) { setShown(value); from.current = value; return }
    const start = performance.now(), a = from.current
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration)
      const e = 1 - Math.pow(1 - k, 4)
      setShown(a + (value - a) * e)
      if (k < 1) raf = requestAnimationFrame(tick)
      else from.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); from.current = value }
  }, [value, duration])
  return <>{shown.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</>
}

export function Bar({ value, max, color = 'bg-acc', className = '', label }: { value: number; max: number; color?: string; className?: string; label?: string }) {
  const [w, setW] = useState(0)
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  useEffect(() => { const r = requestAnimationFrame(() => setW(pct)); return () => cancelAnimationFrame(r) }, [pct])
  return (
    <div className={`relative h-[3px] w-full bg-white/[0.07] ${className}`} role="progressbar" aria-label={label} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`bar-fill absolute inset-y-0 left-0 ${color}`} style={{ width: `${w}%` }} />
    </div>
  )
}

/** Fades children in when scrolled into view. */
export function Reveal({ children, className = '', delay = 0, as: Tag = 'div' }: { children: ReactNode; className?: string; delay?: number; as?: 'div' | 'section' }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add('in'); io.disconnect() } }, { threshold: 0.08 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return <Tag ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</Tag>
}

// ── Dialogs (native <dialog>: focus trap + Esc for free) ───────────
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={`m-auto w-[calc(100%-1.5rem)] ${wide ? 'max-w-3xl' : 'max-w-lg'} bg-transparent p-0 text-bone backdrop:bg-black/80 backdrop:backdrop-blur-sm`}
    >
      {open && (
        <div className="panel hud-corners enter max-h-[85vh] overflow-y-auto p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="display text-2xl">{title}</h2>
            <IconBtn label="Close" onClick={onClose}><X size={18} /></IconBtn>
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}

export function Confirm({ open, title, body, confirmLabel = 'Delete', typeToConfirm, onConfirm, onClose }: {
  open: boolean; title: string; body: string; confirmLabel?: string; typeToConfirm?: string; onConfirm: () => void; onClose: () => void
}) {
  const [typed, setTyped] = useState('')
  useEffect(() => { if (!open) setTyped('') }, [open])
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-ash">{body}</p>
      {typeToConfirm && (
        <Field label={`Type ${typeToConfirm} to confirm`} className="mt-5">
          <input className="field num" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
        </Field>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="danger" disabled={!!typeToConfirm && typed !== typeToConfirm} onClick={() => { onConfirm(); onClose() }}>{confirmLabel}</Btn>
      </div>
    </Modal>
  )
}

/** Small hook: `ask(fn, title, body)` opens a confirm, runs fn on yes. */
export function useConfirm() {
  const [c, setC] = useState<{ title: string; body: string; fn: () => void } | null>(null)
  const node = <Confirm open={!!c} title={c?.title ?? ''} body={c?.body ?? ''} onConfirm={() => c?.fn()} onClose={() => setC(null)} />
  return { ask: (fn: () => void, title: string, body = 'This cannot be undone.') => setC({ fn, title, body }), node }
}

// ── Photos ─────────────────────────────────────────────────────────
export function usePhoto(id?: string) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!id) { setUrl(null); return }
    let u: string | null = null, alive = true
    getPhoto(id).then((b) => { if (b && alive) { u = URL.createObjectURL(b); setUrl(u) } })
    return () => { alive = false; if (u) URL.revokeObjectURL(u) }
  }, [id])
  return url
}

export function Photo({ id, alt, className = '' }: { id?: string; alt: string; className?: string }) {
  const url = usePhoto(id)
  if (!url) return <div className={`bg-coal2 ${className}`} aria-label={alt} />
  return <img src={url} alt={alt} className={`object-cover ${className}`} loading="lazy" />
}

/** File picker that compresses and stores the image locally; returns the new photo id. */
export function PhotoPicker({ onPicked, label = 'Add photo', className = '' }: { onPicked: (id: string) => void; label?: string; className?: string }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  return (
    <label className={`inline-flex cursor-pointer items-center gap-2 border border-dashed border-line2 px-4 py-3 text-xs font-mono uppercase tracking-[0.14em] text-ash hover:text-bone hover:border-bone/60 ${className}`}>
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          setBusy(true); setErr('')
          try {
            const id = uid()
            await putPhoto(id, await compressImage(f))
            onPicked(id)
          } catch (x: any) { setErr(x?.message ?? 'Could not read image') }
          setBusy(false)
        }}
      />
      {busy ? 'Processing…' : label}
      {err && <span className="text-red-300 normal-case tracking-normal">{err}</span>}
    </label>
  )
}

export const fmtMoney = (n: number, currency: string) => {
  try { return n.toLocaleString(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }) }
  catch { return `${currency} ${Math.round(n).toLocaleString()}` }
}

export const numOrUndef = (v: string) => (v.trim() === '' || isNaN(Number(v)) ? undefined : Number(v))
