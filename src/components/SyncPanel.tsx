import { useEffect, useRef, useState } from 'react'
import { ArrowLeftRight, Download, Smartphone } from 'lucide-react'
import { useStore } from '../lib/store.tsx'
import { host, join, newCode, type SyncStatus } from '../lib/sync.ts'
import { Btn, Field, Panel } from './ui.tsx'

// Android/desktop Chrome fire this before offering install; main.tsx stashes it.
declare global { interface Window { __installPrompt?: any } }

export function SyncPanel() {
  const { state, replace } = useStore()
  const stateRef = useRef(state)
  stateRef.current = state
  const [mode, setMode] = useState<'none' | 'host' | 'join'>('none')
  const [code, setCode] = useState('')
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<SyncStatus>({ phase: 'idle', text: '' })
  const cancel = useRef<() => void>(() => {})
  const [canInstall, setCanInstall] = useState(!!window.__installPrompt)

  useEffect(() => () => cancel.current(), [])
  useEffect(() => {
    const on = () => setCanInstall(true)
    window.addEventListener('lm-installable', on)
    return () => window.removeEventListener('lm-installable', on)
  }, [])

  const hooks = { getState: () => stateRef.current, adopt: replace, onStatus: setStatus }
  const stop = () => { cancel.current(); setMode('none'); setStatus({ phase: 'idle', text: '' }) }
  const startHost = async () => {
    cancel.current()
    const c = newCode()
    setCode(c); setMode('host')
    cancel.current = await host(c, hooks)
  }
  const startJoin = async () => {
    cancel.current()
    cancel.current = await join(input.trim(), hooks)
  }
  const busy = status.phase === 'connecting' || status.phase === 'syncing'
  const tone = status.phase === 'error' ? 'text-red-300' : status.phase === 'done' ? 'text-acc' : 'text-ash'

  return (
    <Panel kicker="PC ⇄ phone · direct, encrypted, no account" title="Sync devices" className="lg:col-span-2">
      <div className="grid gap-8 md:grid-cols-[1fr_1fr]">
        <div>
          <p className="text-sm text-ash">Open LifeMaxxing on both devices. On one, tap <span className="text-bone">Show code</span>. On the other, type it. Both end up with the same data, photos included. Works best on the same Wi-Fi.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Btn variant={mode === 'host' ? 'primary' : 'line'} onClick={startHost} disabled={busy}><ArrowLeftRight size={14} />Show code</Btn>
            <Btn variant={mode === 'join' ? 'primary' : 'line'} onClick={() => { cancel.current(); setMode('join'); setStatus({ phase: 'idle', text: '' }) }} disabled={busy}>Enter code</Btn>
            {mode !== 'none' && <Btn variant="ghost" onClick={stop}>Cancel</Btn>}
          </div>

          {mode === 'host' && (
            <div className="mt-6">
              <div className="kicker">Type this on the other device</div>
              <div className="display mt-2 select-all text-6xl tracking-[0.12em] text-acc sm:text-7xl" aria-live="polite">{code}</div>
            </div>
          )}
          {mode === 'join' && (
            <form className="mt-6 flex items-end gap-3" onSubmit={(e) => { e.preventDefault(); if (input.trim().length === 6) startJoin() }}>
              <Field label="Code from the other device" className="flex-1">
                <input className="field display text-4xl uppercase tracking-[0.12em]" value={input} maxLength={6} autoFocus autoCapitalize="characters" autoComplete="off"
                  onChange={(e) => setInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} />
              </Field>
              <Btn type="submit" variant="primary" disabled={input.trim().length !== 6 || busy}>Sync</Btn>
            </form>
          )}
          {status.text && <p role="status" className={`mt-4 flex items-center gap-2 text-sm ${tone}`}>{busy && <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-acc" />}{status.text}</p>}
        </div>

        <div className="border-t border-line pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
          <div className="kicker mb-2 flex items-center gap-2"><Smartphone size={12} />Phone app</div>
          <p className="text-sm text-ash">Install LifeMaxxing as an app: full screen, its own icon, works offline.</p>
          {canInstall ? (
            <Btn className="mt-4" variant="primary" onClick={async () => { await window.__installPrompt?.prompt(); window.__installPrompt = undefined; setCanInstall(false) }}><Download size={14} />Install app</Btn>
          ) : (
            <ul className="mt-3 space-y-1 text-xs text-ash">
              <li><span className="text-bone">Android (Chrome):</span> menu ⋮ → Install app / Add to home screen.</li>
              <li><span className="text-bone">iPhone (Safari):</span> Share → Add to Home Screen.</li>
              <li><span className="text-bone">PC (Chrome/Edge):</span> install icon in the address bar.</li>
            </ul>
          )}
        </div>
      </div>
    </Panel>
  )
}
