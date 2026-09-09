import { useEffect, useRef, useState } from 'react'
import { Badge, Button, Card, MoneyInput } from './ui'
import { formatINR, monthLabel } from '../lib/format'
import { BUCKETS, budgetFor } from '../lib/selectors'
import { useStore } from '../lib/store'

/**
 * The one grid where a month's variable totals get typed.
 *
 * The list of rows is captured when the month (or the set of monthly
 * categories) changes — deliberately NOT recomputed as values are entered.
 * Deriving it from "still empty" would unmount the very field being typed
 * into as soon as the first digit landed, which loses everything after it.
 */
export function MonthlyFillGrid({
  limit,
  onOpenBudget,
  dismissible = false,
}: {
  limit?: number
  onOpenBudget?: () => void
  dismissible?: boolean
}) {
  const { data, update, month } = useStore()
  const budget = budgetFor(data, month)

  const monthlyItems = BUCKETS.flatMap((b) => budget[b]).filter((i) => i.mode === 'monthly')
  // Identity of the row set, so renames and additions refresh it but edits don't.
  const signature = `${month}|${monthlyItems.map((i) => i.id).join(',')}`
  const lastSignature = useRef('')
  const [rowIds, setRowIds] = useState<string[]>([])

  useEffect(() => {
    if (lastSignature.current === signature) return
    lastSignature.current = signature
    const entries = data.monthlyEntries[month] ?? {}
    setRowIds(monthlyItems.filter((i) => (entries[i.id] ?? null) === null).map((i) => i.id))
    // Only the signature may reset the list; entered values must not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  const rows = rowIds
    .map((id) => monthlyItems.find((i) => i.id === id))
    .filter((i): i is NonNullable<typeof i> => Boolean(i))
    .slice(0, limit)

  const [hidden, setHidden] = useState(false)
  if (rows.length === 0 || hidden) return null

  const entries = data.monthlyEntries[month] ?? {}
  const remaining = rows.filter((i) => (entries[i.id] ?? null) === null).length

  function setEntry(id: string, value: number) {
    update((d) => ({
      ...d,
      // Materialise the month so the entry has a budget to attach to.
      budgets: { ...d.budgets, [month]: budgetFor(d, month) },
      monthlyEntries: { ...d.monthlyEntries, [month]: { ...(d.monthlyEntries[month] ?? {}), [id]: value } },
    }))
  }

  return (
    <Card
      title={
        remaining > 0
          ? `Enter ${remaining} monthly total${remaining === 1 ? '' : 's'}`
          : `${monthLabel(month)} totals entered`
      }
      subtitle={
        remaining > 0
          ? 'The only numbers this month actually needs from you — read them off your statements.'
          : 'Nothing left to type. These stay here until the month changes, in case you want to adjust them.'
      }
      className={remaining > 0 ? 'border-sky-200 bg-sky-50/40' : ''}
      right={
        <>
          {onOpenBudget && (
            <Button variant="secondary" size="sm" onClick={onOpenBudget}>
              Open Budget
            </Button>
          )}
          {dismissible && (
            <Button variant="ghost" size="sm" onClick={() => setHidden(true)}>
              Hide
            </Button>
          )}
        </>
      }
    >
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((item) => {
          const value = entries[item.id] ?? null
          const done = value !== null
          return (
            <label
              key={item.id}
              className={`flex items-center gap-2 rounded-xl border p-2.5 transition ${
                done ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-white'
              }`}
            >
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-700">
                {item.name}
                {done && (
                  <span aria-hidden className="ml-1.5 text-emerald-600">
                    ✓
                  </span>
                )}
              </span>
              <div className="w-28 shrink-0">
                <MoneyInput
                  value={value}
                  placeholder={item.budgeted ? String(item.budgeted) : '0'}
                  onChange={(n) => setEntry(item.id, n)}
                  aria-label={`${item.name} total for ${monthLabel(month)}`}
                />
              </div>
            </label>
          )
        })}
      </div>
      {remaining === 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
          <Badge tone="green">All entered</Badge>
          {formatINR(rows.reduce((s, i) => s + (entries[i.id] ?? 0), 0))} recorded for {monthLabel(month)}.
        </p>
      )}
    </Card>
  )
}
