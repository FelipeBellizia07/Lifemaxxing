import { useState } from 'react'
import { Download, ImageOff, Upload } from 'lucide-react'
import { useStore } from '../lib/store.tsx'
import { AREAS, AREA_META, emptyState, type Profile } from '../lib/types.ts'
import { deletePhoto, wipeAll } from '../lib/db.ts'
import { exportBackup, restoreBackup, validateBackup, type Backup } from '../lib/backup.ts'
import { Btn, Chip, Confirm, Field, Panel, Photo, PhotoPicker } from '../components/ui.tsx'
import { ModuleHeader } from '../components/Module.tsx'
import { SyncPanel } from '../components/SyncPanel.tsx'
import { ACCENTS, GOAL_OPTIONS, METRIC_GROUPS } from './Onboarding.tsx'

export function Settings() {
  const { state, update, replace, toast } = useStore()
  const p = state.profile!
  const set = (patch: Partial<Profile>) => update((s) => ({ ...s, profile: { ...s.profile!, ...patch } }))
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
  const [pending, setPending] = useState<Backup | null>(null)
  const [importErrs, setImportErrs] = useState<string[]>([])
  const [wipe, setWipe] = useState(false)
  const [busy, setBusy] = useState(false)
  const [customGoal, setCustomGoal] = useState('')

  const onFile = async (file: File) => {
    setImportErrs([])
    try {
      const data = JSON.parse(await file.text())
      const errs = validateBackup(data)
      if (errs.length) setImportErrs(errs)
      else setPending(data)
    } catch { setImportErrs(['File is not valid JSON.']) }
  }

  const counts = [
    ['Missions', state.tasks.length], ['Focus sessions', state.sessions.length], ['Workouts', state.workouts.length], ['Body logs', state.daily.length],
    ['Evolution entries', state.evolution.length], ['Transactions', state.transactions.length], ['Projects', state.projects.length], ['Interactions', state.interactions.length],
  ] as const

  return (
    <>
      <ModuleHeader scene="monolith" code="09" title="Settings" tagline="Your system, your rules. All data stays on this device." />
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <SyncPanel />
        <Panel kicker="Identity" title="Profile">
          <div className="space-y-5">
            <Field label="Name"><input className="field" value={p.name} onChange={(e) => set({ name: e.target.value })} maxLength={40} /></Field>
            <Field label="Motto"><input className="field font-serif text-lg italic" value={p.motto} onChange={(e) => set({ motto: e.target.value })} maxLength={80} /></Field>
            <Field label="30-day objective"><input className="field" value={p.objective30} onChange={(e) => set({ objective30: e.target.value })} maxLength={120} /></Field>
            <div className="flex items-end gap-3">
              <Field label="Objective start" hint="resets the day counter" className="flex-1"><input type="date" className="field num" value={p.createdAt.slice(0, 10)} onChange={(e) => e.target.value && set({ createdAt: new Date(e.target.value + 'T12:00:00').toISOString() })} /></Field>
              <Field label="Currency" className="w-24"><input className="field num uppercase" value={p.currency} onChange={(e) => set({ currency: e.target.value.toUpperCase().slice(0, 3) })} /></Field>
            </div>
          </div>
        </Panel>

        <Panel kicker="Visual mode" title="Grade & motion">
          <div className="grid grid-cols-3 gap-2">
            {ACCENTS.map((a) => (
              <button key={a.id} aria-pressed={p.accent === a.id} onClick={() => set({ accent: a.id })} className={`border p-3 text-left cursor-pointer ${p.accent === a.id ? 'border-bone' : 'border-line2 hover:border-bone/50'}`}>
                <div className="h-2" style={{ background: a.color }} /><div className="kicker mt-2">{a.label.replace('Noir / ', '')}</div>
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Chip active={p.motion === 'cinematic'} onClick={() => set({ motion: 'cinematic' })}>Cinematic motion</Chip>
            <Chip active={p.motion === 'calm'} onClick={() => set({ motion: 'calm' })}>Calm</Chip>
          </div>
          <div className="mt-6">
            <div className="kicker mb-2">Home hero photo · stays local</div>
            <div className="flex items-center gap-4">
              {p.heroPhotoId && <Photo id={p.heroPhotoId} alt="Hero" className="h-20 w-32 grayscale" />}
              <PhotoPicker label={p.heroPhotoId ? 'Replace' : 'Use my own photo'} onPicked={(id) => { if (p.heroPhotoId) deletePhoto(p.heroPhotoId); set({ heroPhotoId: id }); toast('Hero photo updated') }} />
              {p.heroPhotoId && <Btn variant="ghost" size="sm" onClick={() => { deletePhoto(p.heroPhotoId!); set({ heroPhotoId: undefined }) }}><ImageOff size={12} />Default</Btn>}
            </div>
            <p className="mt-2 text-xs text-ash">Rendered in monochrome with grain. Default is a generated scene — no external images.</p>
          </div>
        </Panel>

        <Panel kicker="Order = priority" title="Life areas">
          <p className="mb-4 text-sm text-ash">Tap to remove; tap again to add at the end. Top three drive Home and the engine.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {AREAS.map((a) => {
              const r = p.areas.indexOf(a)
              return <Chip key={a} active={r >= 0} onClick={() => set({ areas: toggle(p.areas, a) })}><span className="num mr-2 text-acc">{r >= 0 ? r + 1 : '·'}</span>{AREA_META[a].label}</Chip>
            })}
          </div>
          <div className="mt-6">
            <div className="kicker mb-2">Daily time budget</div>
            <div className="flex flex-wrap gap-1">{[15, 30, 45, 60, 90, 120, 180].map((m) => <Chip key={m} active={p.dailyMinutes === m} onClick={() => set({ dailyMinutes: m })}>{m}m</Chip>)}</div>
          </div>
        </Panel>

        <Panel kicker="What you track" title="Metrics">
          <div className="space-y-4">
            {METRIC_GROUPS.map((g) => (
              <div key={g.label}>
                <div className="kicker mb-2">{g.label}</div>
                <div className="flex flex-wrap gap-1">{g.items.map((m) => <Chip key={m.id} active={p.metrics.includes(m.id)} onClick={() => set({ metrics: toggle(p.metrics, m.id) })}>{m.label}</Chip>)}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel kicker="Shown in the Home ticker" title="Goals" className="lg:col-span-2">
          <div className="flex flex-wrap gap-2">
            {[...new Set([...GOAL_OPTIONS, ...p.goals])].map((g) => <Chip key={g} active={p.goals.includes(g)} onClick={() => set({ goals: toggle(p.goals, g) })}>{g}</Chip>)}
          </div>
          <form className="mt-4 flex max-w-md gap-2" onSubmit={(e) => { e.preventDefault(); if (!customGoal.trim()) return; set({ goals: [...p.goals, customGoal.trim()] }); setCustomGoal('') }}>
            <input className="field" value={customGoal} onChange={(e) => setCustomGoal(e.target.value)} placeholder="Custom goal" />
            <Btn size="sm" type="submit" disabled={!customGoal.trim()}>Add</Btn>
          </form>
        </Panel>

        <Panel kicker="JSON · includes photos" title="Backup" className="lg:col-span-2">
          <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
            <div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">{counts.map(([l, n]) => <div key={l} className="flex justify-between border-b border-line py-1"><span className="text-ash">{l}</span><span className="num">{n}</span></div>)}</div>
              <Btn className="mt-5" variant="primary" disabled={busy} onClick={async () => { setBusy(true); try { await exportBackup(state); toast('Backup downloaded') } catch (e: any) { toast(`Export failed: ${e?.message ?? e}`, 'err') } setBusy(false) }}><Download size={14} />{busy ? 'Preparing…' : 'Export backup'}</Btn>
            </div>
            <div>
              <label className="flex cursor-pointer items-center justify-center gap-2 border border-dashed border-line2 px-4 py-8 font-mono text-xs uppercase tracking-[0.14em] text-ash hover:border-bone/60 hover:text-bone">
                <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onFile(f) }} />
                <Upload size={14} />Import backup file
              </label>
              {importErrs.length > 0 && (
                <div role="alert" className="mt-3 border border-red-500/40 p-3 text-xs text-red-200">
                  <div className="kicker mb-1 text-red-300">Import rejected — nothing was changed</div>
                  <ul className="list-disc pl-4">{importErrs.map((e, i) => <li key={i}>{e}</li>)}</ul>
                </div>
              )}
              <p className="mt-3 text-xs text-ash">Import is validated first and replaces all current data only after you confirm.</p>
            </div>
          </div>
        </Panel>

        <Panel kicker="Irreversible" title="Danger zone" className="lg:col-span-2 border-red-500/20">
          <p className="text-sm text-ash">Deletes every record and photo from this browser. Export a backup first if you might want it back.</p>
          <Btn variant="danger" className="mt-4" onClick={() => setWipe(true)}>Delete all data</Btn>
        </Panel>
      </div>

      <Confirm
        open={!!pending}
        title="Replace all data?"
        body={pending ? `Backup from ${pending.exportedAt.slice(0, 10)} with ${Object.keys(pending.photos ?? {}).length} photos. Your current data on this device will be overwritten.` : ''}
        confirmLabel="Replace"
        onClose={() => setPending(null)}
        onConfirm={async () => {
          if (!pending) return
          try { replace(await restoreBackup(pending)); toast('Backup restored') } catch (e: any) { toast(`Restore failed: ${e?.message ?? e}`, 'err') }
        }}
      />
      <Confirm
        open={wipe}
        title="Delete everything?"
        body="All missions, logs, photos, finances and progress will be permanently removed from this device."
        typeToConfirm="DELETE"
        confirmLabel="Delete all"
        onClose={() => setWipe(false)}
        onConfirm={async () => { await wipeAll(); replace(emptyState()); location.hash = '/home' }}
      />
    </>
  )
}
