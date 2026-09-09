import { Button, Card, MoneyInput, Select, TextField } from './ui'
import { formatINR, monthLabel, uid } from '../lib/format'
import { otherIncomeTotal, salaryIncome } from '../lib/finance'
import { useStore } from '../lib/store'
import type { OtherIncome, Payer } from '../lib/types'

/**
 * Salaries are fixed and live on the household; freelance and one-off income
 * varies month to month, so it is recorded against the month you earned it.
 */
export function IncomeCard() {
  const { data, update, month } = useStore()
  const salary = salaryIncome(data)
  const extra = otherIncomeTotal(data, month)
  const rows = data.otherIncome[month] ?? []

  const payerName = (p: Payer) =>
    p === 'person1' ? data.income.person1Name : p === 'person2' ? data.income.person2Name : 'Joint'

  function setRows(next: OtherIncome[]) {
    update((d) => ({ ...d, otherIncome: { ...d.otherIncome, [month]: next } }))
  }

  function addRow() {
    setRows([...rows, { id: uid(), label: '', amount: 0, who: 'person1' }])
  }

  return (
    <Card
      title="Monthly income"
      subtitle={`Take-home pay plus anything else earned in ${monthLabel(month)}. Every target in the app follows this number.`}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {(['person1', 'person2'] as const).map((key) => (
          <label key={key} className="block">
            <TextField
              value={data.income[`${key}Name`]}
              onChange={(e) => update((d) => ({ ...d, income: { ...d.income, [`${key}Name`]: e.target.value } }))}
              aria-label="Earner name"
              className="mb-1.5 border-transparent bg-transparent px-1 py-0.5 text-[13px] font-semibold text-slate-600 shadow-none hover:bg-slate-50"
            />
            <MoneyInput
              value={data.income[key]}
              onChange={(n) => update((d) => ({ ...d, income: { ...d.income, [key]: n } }))}
              aria-label={`${data.income[`${key}Name`]} monthly take-home`}
            />
            <span className="mt-1 block px-1 text-[11px] text-slate-500">Salary — carries across months</span>
          </label>
        ))}
      </div>

      <div className="mt-5 border-t border-slate-200 pt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-[13px] font-semibold text-slate-700">
              Freelance &amp; other income
              <span className="ml-2 font-normal text-slate-400">{monthLabel(month)} only</span>
            </h3>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Consulting, side projects, rent, bonuses — recorded in the month you were paid.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={addRow}>
            + Add income
          </Button>
        </div>

        {rows.length === 0 ? (
          <button
            type="button"
            onClick={addRow}
            className="w-full rounded-xl border border-dashed border-slate-300 px-4 py-3 text-[13px] text-slate-500 transition hover:border-sky-400 hover:text-sky-700"
          >
            No extra income recorded for {monthLabel(month)} — tap to add a freelance payment
          </button>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li
                key={row.id}
                className="grid gap-2 rounded-xl border border-slate-200 p-2.5 sm:grid-cols-[1fr_9rem_8rem_auto] sm:items-center sm:gap-2 sm:border-0 sm:p-0"
              >
                <TextField
                  value={row.label}
                  placeholder="e.g. Freelance — web build"
                  onChange={(e) =>
                    setRows(rows.map((r) => (r.id === row.id ? { ...r, label: e.target.value } : r)))
                  }
                  aria-label="Income source"
                />
                {/* Phones put payer, amount and remove on one row under the label. */}
                <div className="flex items-center gap-2 sm:contents">
                  <Select
                    value={row.who}
                    onChange={(e) =>
                      setRows(rows.map((r) => (r.id === row.id ? { ...r, who: e.target.value as Payer } : r)))
                    }
                    aria-label="Earned by"
                    className="min-w-0 flex-1"
                  >
                    {(['person1', 'person2', 'joint'] as Payer[]).map((p) => (
                      <option key={p} value={p}>
                        {payerName(p)}
                      </option>
                    ))}
                  </Select>
                  <div className="w-28 shrink-0 sm:w-full">
                    <MoneyInput
                      value={row.amount}
                      onChange={(n) => setRows(rows.map((r) => (r.id === row.id ? { ...r, amount: n } : r)))}
                      aria-label="Amount"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    aria-label="Remove income source"
                    onClick={() => setRows(rows.filter((r) => r.id !== row.id))}
                  >
                    ✕
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-sky-50 p-3 ring-1 ring-inset ring-sky-100">
        <div>
          <dt className="text-[11px] font-medium text-sky-700">Salaries</dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums text-sky-900">{formatINR(salary)}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium text-sky-700">Other</dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums text-sky-900">{formatINR(extra)}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium text-sky-700">Total</dt>
          <dd className="mt-0.5 text-lg font-semibold leading-tight tabular-nums text-sky-900">
            {formatINR(salary + extra)}
          </dd>
        </div>
      </dl>
    </Card>
  )
}
