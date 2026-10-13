import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Bar as RBar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from '../lib/store.tsx'
import type { Forecast, Transaction } from '../lib/types.ts'
import { fmtShort, fromKey, today, uid } from '../lib/date.ts'
import { Bar, Btn, Chip, EmptyState, Field, IconBtn, Panel, Stat, fmtMoney, useConfirm } from '../components/ui.tsx'
import { ModuleHeader, Tabs } from '../components/Module.tsx'
import { Missions, chartTooltip } from './Mind.tsx'

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const shiftMonth = (m: string, n: number) => { const [y, mo] = m.split('-').map(Number); return monthKey(new Date(y, mo - 1 + n, 1)) }
const monthLabel = (m: string) => fromKey(`${m}-01`).toLocaleDateString(undefined, { month: 'short' })

export function Wealth() {
  const { state } = useStore()
  const [tab, setTab] = useState<'ledger' | 'plan' | 'career' | 'missions'>('ledger')
  const cur = state.profile!.currency
  const m = today().slice(0, 7)
  const monthTx = state.transactions.filter((t) => t.date.startsWith(m))
  const inc = monthTx.filter((t) => t.kind === 'income').reduce((n, t) => n + t.amount, 0)
  const exp = monthTx.filter((t) => t.kind === 'expense').reduce((n, t) => n + t.amount, 0)
  const bal = [...state.balances].sort((a, b) => b.date.localeCompare(a.date))[0]
  return (
    <>
      <ModuleHeader area="wealth">
        <div className="grid max-w-3xl grid-cols-3 gap-6">
          <Stat label="Income · month" value={<span className="text-[0.7em]">{fmtMoney(inc, cur)}</span>} sub="actual" />
          <Stat label="Spent · month" value={<span className="text-[0.7em]">{fmtMoney(exp, cur)}</span>} sub="actual" />
          <Stat label="Savings" value={<span className="text-[0.7em]">{bal ? fmtMoney(bal.amount, cur) : '—'}</span>} sub={bal ? `as of ${fmtShort(bal.date)}` : 'no balance recorded'} />
        </div>
      </ModuleHeader>
      <div className="mt-8"><Tabs tabs={[{ id: 'ledger', label: 'Ledger' }, { id: 'plan', label: 'Forecast & FI path' }, { id: 'career', label: 'Career & skills' }, { id: 'missions', label: 'Missions' }]} value={tab} onChange={setTab} /></div>
      <div className="mt-8">
        {tab === 'ledger' && <Ledger />}
        {tab === 'plan' && <Plan />}
        {tab === 'career' && <Career />}
        {tab === 'missions' && <Missions area="wealth" />}
      </div>
    </>
  )
}

function Ledger() {
  const { state, update, toast } = useStore()
  const cur = state.profile!.currency
  const [f, setF] = useState({ date: today(), kind: 'expense' as Transaction['kind'], amount: '', category: '', note: '' })
  const [month, setMonth] = useState(today().slice(0, 7))
  const { ask, node } = useConfirm()
  const list = state.transactions.filter((t) => t.date.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date))
  const cats = useMemo(() => [...new Set(state.transactions.map((t) => t.category).filter(Boolean))], [state.transactions])
  const byCat = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of list) if (t.kind === 'expense') m.set(t.category || 'Uncategorized', (m.get(t.category || 'Uncategorized') ?? 0) + t.amount)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [list])
  const maxCat = Math.max(1, ...byCat.map((c) => c[1]))
  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <div className="space-y-6">
        <Panel kicker="Actual money only" title="Log transaction">
          <form className="space-y-5" onSubmit={(e) => {
            e.preventDefault()
            const amount = Number(f.amount)
            if (!(amount > 0)) return
            update((s) => ({ ...s, transactions: [...s.transactions, { id: uid(), date: f.date, kind: f.kind, amount, category: f.category.trim(), note: f.note.trim() }] }))
            setF({ ...f, amount: '', note: '' })
            toast('Transaction logged')
          }}>
            <div className="flex gap-1"><Chip active={f.kind === 'expense'} onClick={() => setF({ ...f, kind: 'expense' })}>Expense</Chip><Chip active={f.kind === 'income'} onClick={() => setF({ ...f, kind: 'income' })}>Income</Chip></div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Amount" hint={cur}><input inputMode="decimal" className="field num text-xl" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} required /></Field>
              <Field label="Date"><input type="date" className="field num" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
            </div>
            <Field label="Category"><input className="field" list="cats" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder="Food, Rent, Freelance…" /></Field>
            <datalist id="cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
            <Field label="Note"><input className="field" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
            <Btn type="submit" variant="primary" className="w-full" disabled={!(Number(f.amount) > 0)}><Plus size={14} />Log</Btn>
          </form>
        </Panel>
        {byCat.length > 0 && (
          <Panel kicker={monthLabel(month)} title="Where it went">
            <div className="space-y-3">
              {byCat.map(([c, v]) => (
                <div key={c}><div className="flex justify-between text-sm"><span>{c}</span><span className="num text-ash">{fmtMoney(v, cur)}</span></div>
                  <div className="mt-1 h-[3px] bg-white/[0.07]"><div className="bar-fill h-full bg-acc" style={{ width: `${(v / maxCat) * 100}%` }} /></div></div>
              ))}
            </div>
          </Panel>
        )}
      </div>
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="kicker">Transactions</div>
          <input type="month" className="field num w-40" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Month" />
        </div>
        {list.length === 0 ? <EmptyState title="Clean ledger" body="Log what actually moved. Projections live in the Forecast tab, never here." /> : (
          <ul className="space-y-px">
            {list.map((t) => (
              <li key={t.id} className="panel tex-wealth flex items-center gap-4 px-4 py-3">
                <span className="num w-14 shrink-0 text-xs text-ash">{fmtShort(t.date)}</span>
                <div className="min-w-0 flex-1"><div className="truncate text-sm">{t.category || 'Uncategorized'}</div>{t.note && <div className="truncate text-xs text-ash">{t.note}</div>}</div>
                <span className={`num ${t.kind === 'income' ? 'text-acc' : ''}`}>{t.kind === 'income' ? '+' : '−'}{fmtMoney(t.amount, cur)}</span>
                <IconBtn label="Delete transaction" onClick={() => ask(() => update((s) => ({ ...s, transactions: s.transactions.filter((x) => x.id !== t.id) })), 'Delete transaction?')}><Trash2 size={13} /></IconBtn>
              </li>
            ))}
          </ul>
        )}
      </div>
      {node}
    </div>
  )
}

function Plan() {
  const { state, update, toast } = useStore()
  const cur = state.profile!.currency
  const { ask, node } = useConfirm()
  const [fc, setFc] = useState({ label: '', kind: 'income' as Forecast['kind'], monthly: '' })
  const [bal, setBal] = useState({ date: today(), amount: '' })
  const m0 = today().slice(0, 7)
  const fcInc = state.forecasts.filter((f) => f.kind === 'income').reduce((n, f) => n + f.monthly, 0)
  const fcExp = state.forecasts.filter((f) => f.kind === 'expense').reduce((n, f) => n + f.monthly, 0)
  const data = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const m = shiftMonth(m0, i - 5)
    if (i <= 5) {
      const tx = state.transactions.filter((t) => t.date.startsWith(m))
      return { m: monthLabel(m), 'Income (actual)': tx.filter((t) => t.kind === 'income').reduce((n, t) => n + t.amount, 0), 'Expenses (actual)': tx.filter((t) => t.kind === 'expense').reduce((n, t) => n + t.amount, 0) }
    }
    return { m: monthLabel(m), 'Income (forecast)': fcInc, 'Expenses (forecast)': fcExp }
  }), [state.transactions, fcInc, fcExp, m0])

  const latest = [...state.balances].sort((a, b) => b.date.localeCompare(a.date))[0]
  const fiNumber = state.finance.monthlyExpensesTarget > 0 ? (state.finance.monthlyExpensesTarget * 12) / (state.finance.withdrawalRate / 100) : 0
  const saved = latest?.amount ?? 0
  const last3 = [1, 2, 3].map((k) => shiftMonth(m0, -k))
  const avgNet = last3.reduce((n, m) => n + state.transactions.filter((t) => t.date.startsWith(m)).reduce((x, t) => x + (t.kind === 'income' ? t.amount : -t.amount), 0), 0) / 3
  const monthsToFI = fiNumber > saved && avgNet > 0 ? Math.ceil((fiNumber - saved) / avgNet) : null
  const pct = fiNumber ? Math.min(100, (saved / fiNumber) * 100) : 0

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel kicker="Solid = actual · faded = forecast" title="12-month view" className="lg:col-span-2">
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={data} margin={{ left: 0, top: 8 }}>
              <XAxis dataKey="m" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={56} />
              <Tooltip {...chartTooltip} formatter={(v) => fmtMoney(Number(v), cur)} />
              <Legend wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: 10 }} />
              <RBar dataKey="Income (actual)" fill="var(--acc)" />
              <RBar dataKey="Expenses (actual)" fill="#ecebe6" />
              <RBar dataKey="Income (forecast)" fill="var(--acc)" fillOpacity={0.25} stroke="var(--acc)" strokeDasharray="3 3" />
              <RBar dataKey="Expenses (forecast)" fill="#ecebe6" fillOpacity={0.15} stroke="#ecebe6" strokeDasharray="3 3" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel kicker="Visual path" title="Financial independence">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Monthly expenses at FI" hint={cur}><input inputMode="decimal" className="field num" value={state.finance.monthlyExpensesTarget || ''} onChange={(e) => update((s) => ({ ...s, finance: { ...s.finance, monthlyExpensesTarget: Number(e.target.value) || 0 } }))} placeholder="0" /></Field>
          <Field label="Withdrawal rate" hint="%"><input inputMode="decimal" className="field num" value={state.finance.withdrawalRate} onChange={(e) => update((s) => ({ ...s, finance: { ...s.finance, withdrawalRate: Math.max(0.5, Number(e.target.value) || 4) } }))} /></Field>
        </div>
        {fiNumber > 0 ? (
          <>
            <div className="mt-6 flex items-baseline justify-between"><span className="kicker">Target</span><span className="display text-3xl">{fmtMoney(fiNumber, cur)}</span></div>
            <div className="relative mt-6 h-10">
              <div className="absolute inset-x-0 top-1/2 h-px bg-line2" />
              <div className="bar-fill absolute left-0 top-1/2 h-[3px] -translate-y-1/2 bg-acc" style={{ width: `${pct}%` }} />
              {[10, 25, 50, 75, 100].map((p) => (
                <div key={p} className="absolute top-0 -translate-x-1/2 text-center" style={{ left: `${p}%` }}>
                  <div className={`mx-auto h-3 w-px ${pct >= p ? 'bg-acc' : 'bg-line2'}`} />
                  <div className={`num mt-5 text-[10px] ${pct >= p ? 'text-acc' : 'text-ash'}`}>{p}%</div>
                </div>
              ))}
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
              <div><div className="kicker">Saved (actual)</div><div className="num mt-1">{latest ? fmtMoney(saved, cur) : 'Record a balance →'}</div></div>
              <div><div className="kicker">Projection</div><div className="num mt-1 text-ash">{monthsToFI ? `~${monthsToFI} months at last-3-month avg net (${fmtMoney(avgNet, cur)}/mo)` : 'Needs positive avg net savings'}</div></div>
            </div>
            <p className="mt-4 text-xs text-ash">Target = yearly expenses ÷ withdrawal rate. A projection, not a promise.</p>
          </>
        ) : <p className="mt-6 text-sm text-ash">Enter the monthly spending you'd want covered. The path draws from your recorded balances.</p>}
      </Panel>

      <div className="space-y-6">
        <Panel kicker="Actual" title="Savings balance">
          <form className="flex items-end gap-3" onSubmit={(e) => { e.preventDefault(); const a = Number(bal.amount); if (isNaN(a) || bal.amount === '') return; update((s) => ({ ...s, balances: [...s.balances, { id: uid(), date: bal.date, amount: a }] })); setBal({ ...bal, amount: '' }); toast('Balance recorded') }}>
            <Field label="Amount" className="flex-1"><input inputMode="decimal" className="field num" value={bal.amount} onChange={(e) => setBal({ ...bal, amount: e.target.value })} /></Field>
            <Field label="Date"><input type="date" className="field num" value={bal.date} onChange={(e) => setBal({ ...bal, date: e.target.value })} /></Field>
            <Btn type="submit" size="sm">Save</Btn>
          </form>
          <ul className="mt-4 space-y-1 text-sm">
            {[...state.balances].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6).map((b) => (
              <li key={b.id} className="flex items-center justify-between border-b border-line py-1"><span className="num text-ash">{b.date}</span><span className="num">{fmtMoney(b.amount, cur)}<IconBtn label="Delete balance" className="ml-1 h-6 w-6" onClick={() => ask(() => update((s) => ({ ...s, balances: s.balances.filter((x) => x.id !== b.id) })), 'Delete balance snapshot?')}><Trash2 size={12} /></IconBtn></span></li>
            ))}
          </ul>
        </Panel>
        <Panel kicker="Projections — never mixed with actuals" title="Forecasts">
          <form className="grid grid-cols-[1fr_auto] gap-3 sm:grid-cols-[1fr_100px_auto_auto] sm:items-end" onSubmit={(e) => { e.preventDefault(); const v = Number(fc.monthly); if (!fc.label.trim() || !(v > 0)) return; update((s) => ({ ...s, forecasts: [...s.forecasts, { id: uid(), label: fc.label.trim(), kind: fc.kind, monthly: v }] })); setFc({ ...fc, label: '', monthly: '' }) }}>
            <Field label="Label"><input className="field" value={fc.label} onChange={(e) => setFc({ ...fc, label: e.target.value })} placeholder="Salary, rent…" /></Field>
            <Field label="Monthly"><input inputMode="decimal" className="field num" value={fc.monthly} onChange={(e) => setFc({ ...fc, monthly: e.target.value })} /></Field>
            <select className="field w-24" value={fc.kind} onChange={(e) => setFc({ ...fc, kind: e.target.value as Forecast['kind'] })} aria-label="Kind"><option value="income">Income</option><option value="expense">Expense</option></select>
            <Btn type="submit" size="sm">Add</Btn>
          </form>
          <ul className="mt-4 space-y-1 text-sm">
            {state.forecasts.map((f) => (
              <li key={f.id} className="flex items-center justify-between border-b border-dashed border-line py-1"><span>{f.label} <span className="kicker">{f.kind}</span></span><span className="num text-ash">{fmtMoney(f.monthly, cur)}/mo<IconBtn label="Delete forecast" className="ml-1 h-6 w-6" onClick={() => update((s) => ({ ...s, forecasts: s.forecasts.filter((x) => x.id !== f.id) }))}><Trash2 size={12} /></IconBtn></span></li>
            ))}
          </ul>
        </Panel>
      </div>
      {node}
    </div>
  )
}

function Career() {
  const { state, update, toast } = useStore()
  const cur = state.profile!.currency
  const [name, setName] = useState('')
  const { ask, node } = useConfirm()
  const incomeProjects = state.projects.filter((p) => p.incomeGoal && p.stage !== 'archived')
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel kicker="Self-assessed, 0–5" title="Skill stack">
        <form className="flex items-end gap-3" onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; update((s) => ({ ...s, skills: [...s.skills, { id: uid(), name: name.trim(), level: 0, notes: '' }] })); setName(''); toast('Skill added') }}>
          <Field label="Skill" className="flex-1"><input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="TypeScript, sales, video editing…" /></Field>
          <Btn type="submit" size="sm" disabled={!name.trim()}>Add</Btn>
        </form>
        {state.skills.length === 0 ? <p className="mt-6 text-sm text-ash">Track the skills that raise your earning power. Levels are your own honest rating.</p> : (
          <ul className="mt-6 space-y-4">
            {state.skills.map((sk) => (
              <li key={sk.id}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm">{sk.name}</span>
                  <span className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((l) => (
                      <button key={l} aria-label={`Set ${sk.name} to level ${l}`} onClick={() => update((s) => ({ ...s, skills: s.skills.map((x) => (x.id === sk.id ? { ...x, level: x.level === l ? l - 1 : l } : x)) }))}
                        className={`h-3 w-6 cursor-pointer border ${sk.level >= l ? 'border-acc bg-acc' : 'border-line2 hover:border-bone/50'}`} />
                    ))}
                    <IconBtn label="Delete skill" className="h-6 w-6" onClick={() => ask(() => update((s) => ({ ...s, skills: s.skills.filter((x) => x.id !== sk.id) })), `Delete ${sk.name}?`)}><Trash2 size={12} /></IconBtn>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel kicker="From Project Lab · targets are forecasts" title="Income projects">
        {incomeProjects.length === 0 ? <EmptyState title="None yet" body="In Project Lab, set a monthly income target on a project to track it here." action={<Btn size="sm" onClick={() => (location.hash = '/lab')}>Open Lab</Btn>} /> : (
          <ul className="space-y-5">
            {incomeProjects.map((p) => {
              const done = p.milestones.filter((m) => m.done).length
              return (
                <li key={p.id}>
                  <div className="flex items-baseline justify-between"><span className="display text-xl">{p.title}</span><span className="num text-xs text-ash">target {fmtMoney(p.incomeGoal!, cur)}/mo</span></div>
                  <div className="kicker mt-1">{p.stage} · {done}/{p.milestones.length} milestones</div>
                  <Bar value={done} max={p.milestones.length || 1} className="mt-2" label={`${p.title} milestones`} />
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
      {node}
    </div>
  )
}

