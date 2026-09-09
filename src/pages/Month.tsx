import { useState } from 'react'
import type { PageId } from '../App'
import { MonthlyFillGrid } from '../components/MonthlyFillGrid'
import {
  Badge,
  Button,
  Card,
  MoneyInput,
  PageHeader,
  ProgressBar,
  Segmented,
  TextField,
} from '../components/ui'
import { BUCKET_LABEL, TARGET_SPLIT } from '../lib/finance'
import { formatINR, formatPercent, monthLabel, ordinal, uid } from '../lib/format'
import { BUCKETS, actualBreakdown, budgetFor, monthMetrics } from '../lib/selectors'
import { useStore } from '../lib/store'
import type { Bucket, BudgetItem, EntryMode, MonthBudget } from '../lib/types'

const ACCENT: Record<Bucket, string> = {
  needs: 'bg-sky-500',
  wants: 'bg-amber-500',
  savings: 'bg-emerald-500',
}

const BAR: Record<Bucket, 'sky' | 'amber' | 'emerald'> = {
  needs: 'sky',
  wants: 'amber',
  savings: 'emerald',
}

const MODE_OPTIONS: Array<{ value: EntryMode; label: string; title: string }> = [
  { value: 'auto', label: 'Automatic', title: 'A fixed amount that counts itself every month — no typing' },
  { value: 'monthly', label: 'One total', title: 'One number typed once a month, off your statement' },
  { value: 'detailed', label: 'Itemised', title: 'Adds up individual transactions from the log' },
]

export function Month({ goTo }: { goTo: (p: PageId) => void }) {
  const { data, update, month, notify } = useStore()
  const m = monthMetrics(data, month)
  const budget = budgetFor(data, month)
  const [editing, setEditing] = useState<string | null>(null)

  function writeBudget(fn: (b: MonthBudget) => MonthBudget) {
    update((d) => ({ ...d, budgets: { ...d.budgets, [month]: fn(budgetFor(d, month)) } }))
  }

  function updateItem(bucket: Bucket, id: string, patch: Partial<BudgetItem>) {
    writeBudget((b) => ({ ...b, [bucket]: b[bucket].map((i) => (i.id === id ? { ...i, ...patch } : i)) }))
  }

  function setMonthlyEntry(id: string, value: number) {
    update((d) => ({
      ...d,
      budgets: { ...d.budgets, [month]: budgetFor(d, month) },
      monthlyEntries: { ...d.monthlyEntries, [month]: { ...(d.monthlyEntries[month] ?? {}), [id]: value } },
    }))
  }

  function addItem(bucket: Bucket) {
    const id = uid()
    writeBudget((b) => ({ ...b, [bucket]: [...b[bucket], { id, name: '', budgeted: 0, mode: 'monthly' }] }))
    setEditing(id)
  }

  function removeItem(bucket: Bucket, id: string) {
    writeBudget((b) => ({ ...b, [bucket]: b[bucket].filter((i) => i.id !== id) }))
    setEditing(null)
    notify('Category removed')
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={monthLabel(month)}
        description="What came in, what went out. Fixed bills fill themselves in — you only type the rest."
      />

      {/* The only typing the month needs, before anything else. */}
      <MonthlyFillGrid />

      <Card>
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium text-slate-500">Income this month</p>
            <p className="mt-0.5 text-2xl font-semibold tabular-nums text-slate-900">{formatINR(m.income)}</p>
          </div>
          <button
            type="button"
            onClick={() => goTo('home')}
            className="rounded-lg px-2 py-1.5 text-[12px] font-medium text-sky-700 hover:bg-sky-50"
          >
            Edit income
          </button>
        </div>
        <div className="mt-3 space-y-2.5">
          {BUCKETS.map((b) => {
            const pct = m.income ? (m.actual[b] / m.income) * 100 : 0
            return (
              <div key={b}>
                <div className="flex items-baseline justify-between gap-2 text-[13px]">
                  <span className="flex items-center gap-2 font-medium text-slate-700">
                    <span className={`h-2 w-2 rounded-full ${ACCENT[b]}`} aria-hidden />
                    {BUCKET_LABEL[b]}
                  </span>
                  <span className="tabular-nums text-slate-900">
                    {formatINR(m.actual[b])}
                    <span className="ml-1.5 text-[11px] text-slate-400">
                      {formatPercent(pct, 0)} of {TARGET_SPLIT[b] * 100}%
                    </span>
                  </span>
                </div>
                <div className="mt-1">
                  <ProgressBar pct={m.target[b] ? (m.actual[b] / m.target[b]) * 100 : 0} height="h-1.5" tone={BAR[b]} />
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {BUCKETS.map((bucket) => {
        const items = budget[bucket]
        const budgetedTotal = items.reduce((s, i) => s + (i.budgeted || 0), 0)
        return (
          <Card
            key={bucket}
            title={
              <span className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${ACCENT[bucket]}`} aria-hidden />
                {BUCKET_LABEL[bucket]}
              </span>
            }
            subtitle={`${formatINR(m.actual[bucket])} of ${formatINR(budgetedTotal)} budgeted`}
            right={
              <Button variant="ghost" size="sm" onClick={() => addItem(bucket)}>
                + Add
              </Button>
            }
          >
            <ul className="divide-y divide-slate-100">
              {items.map((it) => {
                const b = actualBreakdown(data, month, it)
                const pct = it.budgeted ? (b.total / it.budgeted) * 100 : 0
                const over = it.budgeted > 0 && b.total > it.budgeted && bucket !== 'savings'
                const isEditing = editing === it.id
                return (
                  <li key={it.id} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium text-slate-800">
                          {it.name || <span className="text-slate-400">Untitled category</span>}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                          {it.mode === 'auto' && (
                            <span className="text-emerald-600">
                              automatic{it.autoDay ? ` · ${ordinal(it.autoDay)}` : ''}
                            </span>
                          )}
                          {it.mode === 'detailed' && (
                            <button
                              type="button"
                              onClick={() => goTo('expenses')}
                              className="text-sky-600 underline-offset-2 hover:underline"
                            >
                              itemised — view transactions
                            </button>
                          )}
                          {it.budgeted > 0 && <span>of {formatINR(it.budgeted)}</span>}
                        </p>
                      </div>

                      {/* Only the number that matters for this row's mode. */}
                      {it.mode === 'monthly' ? (
                        <div className="w-28 shrink-0">
                          <MoneyInput
                            value={data.monthlyEntries[month]?.[it.id] ?? null}
                            placeholder={it.budgeted ? String(it.budgeted) : '0'}
                            onChange={(n) => setMonthlyEntry(it.id, n)}
                            aria-label={`${it.name} total for ${monthLabel(month)}`}
                          />
                        </div>
                      ) : (
                        <span className="w-24 shrink-0 text-right text-[15px] font-semibold tabular-nums text-slate-900">
                          {formatINR(b.total)}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => setEditing(isEditing ? null : it.id)}
                        aria-label={`Edit ${it.name || 'category'}`}
                        aria-expanded={isEditing}
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 ${
                          isEditing ? 'bg-slate-100 text-slate-700' : ''
                        }`}
                      >
                        ⋯
                      </button>
                    </div>

                    {it.budgeted > 0 && (
                      <div className="mt-1.5">
                        <ProgressBar
                          pct={pct}
                          height="h-1"
                          tone={over ? 'rose' : bucket === 'savings' ? 'emerald' : 'sky'}
                        />
                      </div>
                    )}

                    {/* Everything fiddly lives here, out of the way until asked for. */}
                    {isEditing && (
                      <div className="mt-3 space-y-3 rounded-xl bg-slate-50 p-3">
                        <label className="block">
                          <span className="mb-1 block text-[11px] font-medium text-slate-500">Name</span>
                          <TextField
                            value={it.name}
                            placeholder="Category name"
                            onChange={(e) => updateItem(bucket, it.id, { name: e.target.value })}
                          />
                        </label>

                        <div>
                          <span className="mb-1 block text-[11px] font-medium text-slate-500">How it fills</span>
                          <Segmented
                            full
                            value={it.mode}
                            options={MODE_OPTIONS}
                            onChange={(mode) =>
                              updateItem(bucket, it.id, {
                                mode,
                                autoAmount: mode === 'auto' ? (it.autoAmount ?? it.budgeted) : it.autoAmount,
                              })
                            }
                          />
                          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
                            {it.mode === 'auto' &&
                              'Counts the same amount every month without you touching it — best for rent, EMIs, insurance and SIPs.'}
                            {it.mode === 'monthly' &&
                              'You type one total a month, straight off your bank or card statement.'}
                            {it.mode === 'detailed' &&
                              'Adds up individual transactions. Paste a statement in the Expense Log rather than typing them.'}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <label className="block">
                            <span className="mb-1 block text-[11px] font-medium text-slate-500">Monthly budget</span>
                            <MoneyInput
                              value={it.budgeted}
                              onChange={(n) => updateItem(bucket, it.id, { budgeted: n })}
                            />
                          </label>
                          {it.mode === 'auto' && (
                            <label className="block">
                              <span className="mb-1 block text-[11px] font-medium text-slate-500">Amount posted</span>
                              <MoneyInput
                                value={it.autoAmount ?? it.budgeted}
                                onChange={(n) => updateItem(bucket, it.id, { autoAmount: n })}
                              />
                            </label>
                          )}
                        </div>

                        <div className="flex justify-between">
                          <Button variant="danger" size="sm" onClick={() => removeItem(bucket, it.id)}>
                            Remove
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => setEditing(null)}>
                            Done
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
              {items.length === 0 && (
                <li className="py-6 text-center text-[13px] text-slate-500">
                  Nothing here yet — add a category.
                </li>
              )}
            </ul>
          </Card>
        )
      })}

      <Card
        title="Itemised transactions"
        subtitle="Only for spending you want broken down. Paste a statement instead of typing."
        right={
          <Button variant="secondary" size="sm" onClick={() => goTo('expenses')}>
            Open
          </Button>
        }
      >
        <p className="text-[13px] text-slate-500">
          {data.expenses.filter((e) => e.date.startsWith(month)).length} transaction
          {data.expenses.filter((e) => e.date.startsWith(month)).length === 1 ? '' : 's'} recorded this month.
          {m.actual.needs + m.actual.wants + m.actual.savings === 0 && ' Nothing needs to go here to use the app.'}
        </p>
      </Card>

      <p className="flex flex-wrap items-center gap-2 px-1 text-[11px] text-slate-400">
        <Badge tone="neutral">Tip</Badge>
        Tap ⋯ on any row to rename it, set its budget, or change how it fills.
      </p>
    </div>
  )
}
