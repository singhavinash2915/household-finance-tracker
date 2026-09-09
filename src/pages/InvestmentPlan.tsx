import type { PageId } from '../App'
import {
  ActionNote,
  Badge,
  Button,
  Card,
  MoneyInput,
  PageHeader,
  ProgressBar,
  StatCard,
} from '../components/ui'
import { INSTRUMENT_CATEGORY, requiredSIP } from '../lib/finance'
import { formatINR, formatPercent, monthLabel } from '../lib/format'
import { budgetFor, investibleSurplus, itemActual, monthMetrics, nonDiscretionarySavings } from '../lib/selectors'
import { useStore } from '../lib/store'
import type { InstrumentKey } from '../lib/types'

const INSTRUMENTS: Array<{ key: InstrumentKey; label: string; note: string; color: string }> = [
  {
    key: 'ppf',
    label: 'PPF',
    note: '15-year lock-in, EEE tax treatment — tax-free interest and maturity; counts toward the ₹1.5L 80C limit.',
    color: 'bg-sky-500',
  },
  {
    key: 'nps',
    label: 'NPS Voluntary',
    note: 'Retirement-locked until 60, with an extra ₹50,000 deduction under 80CCD(1B) over and above 80C.',
    color: 'bg-indigo-500',
  },
  {
    key: 'mutualFunds',
    label: 'Mutual Fund SIP/ELSS',
    note: 'Core long-term growth engine; ELSS variants have a 3-year lock-in and qualify under 80C.',
    color: 'bg-emerald-500',
  },
  {
    key: 'stocks',
    label: 'Direct Stocks',
    note: 'Highest risk and effort, fully liquid; gains taxed as short- or long-term capital gains.',
    color: 'bg-violet-500',
  },
  {
    key: 'emergencyTopUp',
    label: 'Emergency Fund Top-up',
    note: 'Liquid or sweep-FD money kept accessible — fund this first until you hit your target months of cover.',
    color: 'bg-amber-500',
  },
  {
    key: 'gold',
    label: 'Gold/SGB',
    note: 'Inflation and currency hedge; sovereign gold bonds pay interest and are tax-free if held to maturity.',
    color: 'bg-yellow-600',
  },
]

export function InvestmentPlan({ goTo, embedded = false }: { goTo: (p: PageId) => void; embedded?: boolean }) {
  const { data, update, month, notify } = useStore()
  const m = monthMetrics(data, month)

  // Percentages apply to what is actually allocatable — EPF is not.
  const surplus = investibleSurplus(data, month)
  const locked = nonDiscretionarySavings(data, month)
  const total = INSTRUMENTS.reduce((s, i) => s + (data.allocation[i.key] || 0), 0)
  const balanced = Math.abs(total - 100) < 0.01

  const goalsSIP = data.goals.reduce((s, g) => s + requiredSIP(g.targetAmount, g.years, g.expectedReturn), 0)

  function setPct(key: InstrumentKey, value: number) {
    update((d) => ({ ...d, allocation: { ...d.allocation, [key]: value } }))
  }

  function normalise() {
    update((d) => {
      const sum = INSTRUMENTS.reduce((s, i) => s + (d.allocation[i.key] || 0), 0)
      if (sum === 0) return d
      const allocation = { ...d.allocation }
      let running = 0
      INSTRUMENTS.forEach((inst, idx) => {
        if (idx === INSTRUMENTS.length - 1) {
          allocation[inst.key] = Math.max(0, 100 - running) // absorb rounding
        } else {
          const v = Math.round((d.allocation[inst.key] / sum) * 100)
          allocation[inst.key] = v
          running += v
        }
      })
      return { ...d, allocation }
    })
    notify('Allocations scaled to 100%')
  }

  /** Write the plan's rupee amounts into this month's Savings budget lines. */
  function applyToBudget() {
    update((d) => {
      const budget = budgetFor(d, month)
      const savings = budget.savings.map((item) => {
        const entry = Object.entries(INSTRUMENT_CATEGORY).find(([, name]) => name === item.name)
        if (!entry) return item
        const pct = d.allocation[entry[0] as InstrumentKey] || 0
        const amount = Math.round(surplus * (pct / 100))
        return {
          ...item,
          budgeted: amount,
          ...(item.mode === 'auto' ? { autoAmount: amount } : {}),
        }
      })
      return { ...d, budgets: { ...d.budgets, [month]: { ...budget, savings } } }
    })
    notify(`Savings budget updated for ${monthLabel(month)}`)
  }

  const budget = budgetFor(data, month)

  return (
    <div className="space-y-5">
      {!embedded && (
      <PageHeader
        title="Investment Plan"
        description="Split your monthly investible surplus across instruments. Amounts recompute as you move the sliders."
        right={
          <Button variant="secondary" onClick={applyToBudget} disabled={surplus <= 0}>
            Apply to {monthLabel(month)} budget
          </Button>
        }
      />
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Monthly investible surplus"
          value={formatINR(surplus)}
          hint={
            locked > 0
              ? `${formatINR(m.actual.savings)} saved less ${formatINR(locked)} deducted at source`
              : `Savings actual for ${monthLabel(month)}`
          }
          onClick={() => goTo('month')}
        />
        <StatCard
          label="Allocated"
          value={formatPercent(total, 0)}
          tone={balanced ? 'green' : 'amber'}
          badge={balanced ? 'Balanced' : 'Check'}
          hint="Should total 100%"
        />
        <StatCard
          label="Goals need"
          value={formatINR(goalsSIP)}
          tone={goalsSIP > surplus ? 'red' : 'green'}
          badge={goalsSIP > surplus ? 'Short' : 'Covered'}
          hint={goalsSIP > surplus ? `${formatINR(goalsSIP - surplus)} more than the surplus` : 'Within your surplus'}
          onClick={() => goTo('wealth')}
        />
      </div>

      {!balanced && (
        <ActionNote
          tone="amber"
          action={
            <Button variant="primary" size="sm" onClick={normalise}>
              Scale to 100%
            </Button>
          }
        >
          <span className="font-semibold">Allocations total {formatPercent(total, 1)}, not 100%.</span>{' '}
          {total > 100
            ? `You are over-allocating by ${formatPercent(total - 100, 1)} — the amounts below add up to more than your surplus.`
            : `${formatPercent(100 - total, 1)} of your surplus is unassigned.`}
        </ActionNote>
      )}

      <Card title="Allocation" subtitle="Percentages apply to the surplus above. Each row also shows what your budget currently sets aside.">
        <ul className="divide-y divide-slate-100">
          {INSTRUMENTS.map((inst) => {
            const pct = data.allocation[inst.key] || 0
            const amount = surplus * (pct / 100)
            const category = INSTRUMENT_CATEGORY[inst.key]
            const item = budget.savings.find((i) => i.name === category)
            const actual = item ? itemActual(data, month, item) : 0
            const drift = actual - amount
            return (
              <li key={inst.key} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${inst.color}`} aria-hidden />
                    <h3 className="truncate text-sm font-semibold text-slate-900">{inst.label}</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-28 text-right text-sm font-semibold tabular-nums text-slate-900">
                      {formatINR(amount)}
                    </span>
                    <div className="w-20">
                      <MoneyInput
                        value={pct}
                        min={0}
                        max={100}
                        onChange={(n) => setPct(inst.key, Math.max(0, Math.min(100, n)))}
                        suffix="%"
                        aria-label={`${inst.label} allocation percent`}
                      />
                    </div>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={pct}
                  onChange={(e) => setPct(inst.key, Number(e.target.value))}
                  aria-label={`${inst.label} allocation slider`}
                  className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-sky-600"
                />
                <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
                  <p className="max-w-xl text-[11.5px] leading-relaxed text-slate-500">{inst.note}</p>
                  {item && (
                    <p className="text-[11px] tabular-nums text-slate-400">
                      budget says {formatINR(actual)}
                      {Math.abs(drift) > 500 && (
                        <span className={drift > 0 ? ' text-emerald-600' : ' text-amber-600'}>
                          {' '}
                          ({drift > 0 ? '+' : '−'}
                          {formatINR(Math.abs(drift))})
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>

        <div className="mt-5 border-t border-slate-200 pt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] font-medium text-slate-600">Total allocated</span>
            <Badge tone={balanced ? 'green' : 'amber'}>{formatPercent(total, 1)}</Badge>
          </div>
          <ProgressBar pct={total} tone={balanced ? 'emerald' : 'amber'} />
        </div>
      </Card>
    </div>
  )
}
