import type { PageId } from '../App'
import { MonthlyFillGrid } from '../components/MonthlyFillGrid'
import {
  ActionNote,
  Badge,
  Button,
  Card,
  Delta,
  MoneyInput,
  PageHeader,
  ProgressBar,
  Segmented,
  TableWrap,
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

const MODE_OPTIONS: Array<{ value: EntryMode; label: string; title: string }> = [
  { value: 'auto', label: 'Auto', title: 'A fixed amount that counts itself every month — no typing' },
  { value: 'monthly', label: 'Monthly', title: 'One total typed once a month, off your statement' },
  { value: 'detailed', label: 'Detailed', title: 'Sums itemised rows from the Expense Log' },
]

export function Budget({ goTo }: { goTo: (p: PageId) => void }) {
  const { data, update, month, notify } = useStore()
  const m = monthMetrics(data, month)
  const budget = budgetFor(data, month)

  /** All writes go through here so an untouched month materialises on first edit. */
  function writeBudget(fn: (b: MonthBudget) => MonthBudget) {
    update((d) => ({ ...d, budgets: { ...d.budgets, [month]: fn(budgetFor(d, month)) } }))
  }

  function updateItem(bucket: Bucket, id: string, patch: Partial<BudgetItem>) {
    writeBudget((b) => ({
      ...b,
      [bucket]: b[bucket].map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }))
  }

  function setMode(bucket: Bucket, item: BudgetItem, mode: EntryMode) {
    updateItem(bucket, item.id, {
      mode,
      // Seed the auto amount from the budget so switching to Auto is one click.
      autoAmount: mode === 'auto' ? (item.autoAmount ?? item.budgeted) : item.autoAmount,
    })
  }

  function setMonthlyEntry(id: string, value: number) {
    update((d) => ({
      ...d,
      budgets: { ...d.budgets, [month]: budgetFor(d, month) },
      monthlyEntries: { ...d.monthlyEntries, [month]: { ...(d.monthlyEntries[month] ?? {}), [id]: value } },
    }))
  }

  function addItem(bucket: Bucket) {
    writeBudget((b) => ({
      ...b,
      [bucket]: [...b[bucket], { id: uid(), name: '', budgeted: 0, mode: 'monthly' }],
    }))
  }

  function removeItem(bucket: Bucket, id: string) {
    writeBudget((b) => ({ ...b, [bucket]: b[bucket].filter((i) => i.id !== id) }))
  }

  function copyBudgetedFromActual(bucket: Bucket) {
    writeBudget((b) => ({
      ...b,
      [bucket]: b[bucket].map((i) => ({ ...i, budgeted: Math.round(actualBreakdown(data, month, i).total) })),
    }))
    notify(`${BUCKET_LABEL[bucket]} budget matched to this month's actuals`)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Monthly Budget"
        description={
          <>
            Plan against the 50/30/20 rule for <span className="font-medium text-slate-700">{monthLabel(month)}</span>.
            Each category fills its Actual the cheapest way it can — automatically, from one monthly total, or from
            itemised rows.
          </>
        }
      />

      {/* Quick fill: the whole month's manual work, in one place. */}
      <MonthlyFillGrid dismissible />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="bg-slate-900 text-white" padded>
          <p className="text-[13px] font-medium text-slate-300">Combined take-home</p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums">{formatINR(m.income)}</p>
          <p className="mt-1 text-[11px] text-slate-400">
            {data.income.person1Name} {formatINR(data.income.person1)} · {data.income.person2Name}{' '}
            {formatINR(data.income.person2)}
          </p>
          <button
            type="button"
            onClick={() => goTo('dashboard')}
            className="mt-1 inline-block py-1.5 text-[11px] font-medium text-sky-300 underline-offset-2 hover:underline"
          >
            Edit income →
          </button>
        </Card>

        {BUCKETS.map((b) => {
          const pctOfIncome = m.income ? (m.actual[b] / m.income) * 100 : 0
          const targetPct = TARGET_SPLIT[b] * 100
          const over = b === 'savings' ? pctOfIncome < targetPct : pctOfIncome > targetPct
          return (
            <Card key={b}>
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-[13px] font-medium text-slate-500">
                  <span className={`h-2 w-2 rounded-full ${ACCENT[b]}`} aria-hidden />
                  {BUCKET_LABEL[b]} · {targetPct}% target
                </p>
                <Badge tone={over ? 'amber' : 'green'}>{formatPercent(pctOfIncome, 0)}</Badge>
              </div>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums text-slate-900">{formatINR(m.actual[b])}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Target {formatINR(m.target[b])} · budgeted {formatINR(m.budgeted[b])}
              </p>
              <div className="mt-2.5">
                <ProgressBar
                  pct={m.target[b] ? (m.actual[b] / m.target[b]) * 100 : 0}
                  height="h-1.5"
                  tone={b === 'savings' ? 'emerald' : over ? 'amber' : 'sky'}
                />
              </div>
            </Card>
          )
        })}
      </div>

      {BUCKETS.map((bucket) => {
        const items = budget[bucket]
        const budgetedTotal = items.reduce((s, i) => s + (i.budgeted || 0), 0)
        const actualTotal = m.actual[bucket]
        const varianceTotal = actualTotal - budgetedTotal
        const goodWhenPositive = bucket === 'savings'
        return (
          <Card
            key={bucket}
            title={
              <span className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${ACCENT[bucket]}`} aria-hidden />
                {BUCKET_LABEL[bucket]}
              </span>
            }
            subtitle={`Target ${formatINR(m.target[bucket])} · budgeted ${formatINR(budgetedTotal)} · actual ${formatINR(actualTotal)}`}
            right={
              <>
                <Button variant="ghost" size="sm" onClick={() => copyBudgetedFromActual(bucket)}>
                  Match budget to actuals
                </Button>
                <Button variant="secondary" size="sm" onClick={() => addItem(bucket)}>
                  + Category
                </Button>
              </>
            }
          >
            {/* Phones get one card per category; the table needs too much width. */}
            <ul className="space-y-2.5 sm:hidden">
              {items.map((it) => {
                const b = actualBreakdown(data, month, it)
                const variance = b.total - it.budgeted
                return (
                  <li key={it.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-start gap-2">
                      <TextField
                        value={it.name}
                        placeholder="Category name"
                        onChange={(e) => updateItem(bucket, it.id, { name: e.target.value })}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        aria-label={`Remove ${it.name || 'category'}`}
                        onClick={() => removeItem(bucket, it.id)}
                      >
                        ✕
                      </Button>
                    </div>

                    <div className="mt-2.5">
                      <Segmented
                        full
                        value={it.mode}
                        options={MODE_OPTIONS}
                        onChange={(mode) => setMode(bucket, it, mode)}
                      />
                      {it.mode === 'auto' && it.autoDay && (
                        <p className="mt-1 text-[11px] text-slate-400">Posts on the {ordinal(it.autoDay)}</p>
                      )}
                    </div>

                    <div className="mt-2.5 grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-medium text-slate-500">Budgeted</span>
                        <MoneyInput
                          value={it.budgeted}
                          onChange={(n) => updateItem(bucket, it.id, { budgeted: n })}
                          aria-label={`${it.name} budgeted`}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-medium text-slate-500">
                          {it.mode === 'auto' ? 'Posts monthly' : it.mode === 'monthly' ? 'This month' : 'From log'}
                        </span>
                        {it.mode === 'auto' && (
                          <MoneyInput
                            value={it.autoAmount ?? it.budgeted}
                            onChange={(n) => updateItem(bucket, it.id, { autoAmount: n })}
                            className="border-emerald-200 bg-emerald-50/50"
                            aria-label={`${it.name} automatic amount`}
                          />
                        )}
                        {it.mode === 'monthly' && (
                          <MoneyInput
                            value={data.monthlyEntries[month]?.[it.id] ?? null}
                            placeholder="Enter"
                            onChange={(n) => setMonthlyEntry(it.id, n)}
                            aria-label={`${it.name} total for ${monthLabel(month)}`}
                          />
                        )}
                        {it.mode === 'detailed' && (
                          <button
                            type="button"
                            onClick={() => goTo('expenses')}
                            className="w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-right text-sm tabular-nums text-slate-700"
                          >
                            {formatINR(b.logged)}
                          </button>
                        )}
                      </label>
                    </div>

                    <p className="mt-2 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Variance</span>
                      <Delta value={variance} goodWhenPositive={goodWhenPositive} />
                    </p>
                  </li>
                )
              })}
              {items.length === 0 && (
                <li className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-[13px] text-slate-500">
                  No categories yet — add one to start budgeting.
                </li>
              )}
              <li className="flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2.5 text-[13px] font-semibold">
                <span>Total</span>
                <span className="tabular-nums">
                  {formatINR(actualTotal)}{' '}
                  <span className="font-normal text-slate-500">of {formatINR(budgetedTotal)}</span>
                </span>
              </li>
            </ul>

            <div className="hidden sm:block">
            <TableWrap minWidth="48rem">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-400">
                    <th className="px-2 py-2 font-semibold">Category</th>
                    <th className="px-2 py-2 font-semibold">How it fills</th>
                    <th className="px-2 py-2 text-right font-semibold">Budgeted</th>
                    <th className="px-2 py-2 text-right font-semibold">Actual</th>
                    <th className="px-2 py-2 text-right font-semibold">Variance</th>
                    <th className="w-8 px-2 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it) => {
                    const b = actualBreakdown(data, month, it)
                    const variance = b.total - it.budgeted
                    const sources = [
                      b.auto > 0 ? `auto ${formatINR(b.auto)}` : '',
                      b.monthly > 0 ? `monthly ${formatINR(b.monthly)}` : '',
                      b.logged > 0 ? `logged ${formatINR(b.logged)}` : '',
                    ].filter(Boolean)
                    const mixed = sources.length > 1
                    return (
                      <tr key={it.id} className="align-top hover:bg-slate-50/60">
                        <td className="px-2 py-2">
                          <TextField
                            value={it.name}
                            placeholder="Category name"
                            onChange={(e) => updateItem(bucket, it.id, { name: e.target.value })}
                          />
                          {mixed && (
                            <p className="mt-1 px-1 text-[11px] text-slate-400">{sources.join(' + ')}</p>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <Segmented
                            size="sm"
                            value={it.mode}
                            options={MODE_OPTIONS}
                            onChange={(mode) => setMode(bucket, it, mode)}
                          />
                          {it.mode === 'auto' && it.autoDay && (
                            <p className="mt-1 px-1 text-[11px] text-slate-400">
                              Posts on the {ordinal(it.autoDay)}
                            </p>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <MoneyInput
                            value={it.budgeted}
                            onChange={(n) => updateItem(bucket, it.id, { budgeted: n })}
                            className="w-28"
                            aria-label={`${it.name} budgeted`}
                          />
                        </td>
                        <td className="px-2 py-2">
                          {it.mode === 'auto' && (
                            <MoneyInput
                              value={it.autoAmount ?? it.budgeted}
                              onChange={(n) => updateItem(bucket, it.id, { autoAmount: n })}
                              className="w-28 border-emerald-200 bg-emerald-50/50"
                              aria-label={`${it.name} automatic amount`}
                            />
                          )}
                          {it.mode === 'monthly' && (
                            <MoneyInput
                              value={data.monthlyEntries[month]?.[it.id] ?? null}
                              placeholder="Enter"
                              onChange={(n) => setMonthlyEntry(it.id, n)}
                              className="w-28"
                              aria-label={`${it.name} total for ${monthLabel(month)}`}
                            />
                          )}
                          {it.mode === 'detailed' && (
                            <button
                              type="button"
                              onClick={() => goTo('expenses')}
                              className="flex w-28 items-center justify-end gap-1 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-right text-sm tabular-nums text-slate-700 transition hover:border-sky-400 hover:text-sky-700"
                              title="Open the Expense Log"
                            >
                              {formatINR(b.logged)}
                            </button>
                          )}
                        </td>
                        <td className="px-2 py-4 text-right">
                          <Delta value={variance} goodWhenPositive={goodWhenPositive} />
                        </td>
                        <td className="px-2 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Remove ${it.name || 'category'}`}
                            onClick={() => removeItem(bucket, it.id)}
                          >
                            ✕
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-2 py-6 text-center text-sm text-slate-500">
                        No categories yet — add one to start budgeting.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 text-[13px] font-semibold">
                    <td className="px-2 py-3 text-slate-900" colSpan={2}>
                      Total
                    </td>
                    <td className="px-2 py-3 text-right tabular-nums text-slate-900">{formatINR(budgetedTotal)}</td>
                    <td className="px-2 py-3 text-right tabular-nums text-slate-900">{formatINR(actualTotal)}</td>
                    <td className="px-2 py-3 text-right">
                      <Delta value={varianceTotal} goodWhenPositive={goodWhenPositive} />
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </TableWrap>
            </div>
          </Card>
        )
      })}

      <ActionNote tone="sky">
        <span className="font-medium">Auto</span> categories need no upkeep — change the amount once and it applies
        from this month on. <span className="font-medium">Monthly</span> ones want a single number each month.{' '}
        <span className="font-medium">Detailed</span> ones read the Expense Log, where you can paste a whole statement
        at once.
      </ActionNote>
    </div>
  )
}
