import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { emptyState, type State } from './types.ts'
import { loadState, saveState } from './db.ts'

export type Celebration = { kind: 'mission' | 'milestone' | 'level'; title: string; xp?: number; sub?: string }
type Toast = { id: number; text: string; tone: 'ok' | 'err' }

interface Ctx {
  state: State
  update: (fn: (s: State) => State) => void
  replace: (s: State) => void
  status: 'loading' | 'ready' | 'error'
  saveError: string | null
  toast: (text: string, tone?: Toast['tone']) => void
  toasts: Toast[]
  celebrate: (c: Celebration) => void
  celebration: Celebration | null
  clearCelebration: () => void
}

const StoreCtx = createContext<Ctx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(emptyState)
  const [status, setStatus] = useState<Ctx['status']>('loading')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [celebration, setCelebration] = useState<Celebration | null>(null)
  const pending = useRef<State | null>(null)
  const timer = useRef<number>(0)

  useEffect(() => {
    loadState()
      .then((s) => { setState(s); setStatus('ready') })
      .catch(() => setStatus('error'))
  }, [])

  const flush = useCallback(() => {
    clearTimeout(timer.current)
    const s = pending.current
    if (!s) return
    pending.current = null
    saveState(s).then(() => setSaveError(null)).catch((e) => setSaveError(String(e?.message ?? e)))
  }, [])

  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && flush()
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flush)
    return () => { document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', flush) }
  }, [flush])

  const persist = useCallback((s: State) => {
    pending.current = s
    clearTimeout(timer.current)
    timer.current = window.setTimeout(flush, 250)
  }, [flush])

  const update = useCallback((fn: (s: State) => State) => {
    setState((prev) => { const next = fn(prev); persist(next); return next })
  }, [persist])

  const replace = useCallback((s: State) => { setState(s); persist(s) }, [persist])

  const toast = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t.slice(-2), { id, text, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])

  const value = useMemo<Ctx>(() => ({
    state, update, replace, status, saveError, toast, toasts,
    celebrate: setCelebration, celebration, clearCelebration: () => setCelebration(null),
  }), [state, update, replace, status, saveError, toast, toasts, celebration])

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export const useStore = () => {
  const c = useContext(StoreCtx)
  if (!c) throw new Error('useStore outside provider')
  return c
}
