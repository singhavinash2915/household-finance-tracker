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
  Toggle,
} from '../components/ui'
import { emergencyMonthsTone } from '../lib/finance'
import { formatINR, monthLabel } from '../lib/format'
import { investibleSurplus, monthMetrics, netWorthFor } from '../lib/selectors'
import { useStore } from '../lib/store'

export function EmergencyFund({ goTo }: { goTo: (p: PageId) => void }) {
  const { data, update, month, notify } = useStore()
  const m = monthMetrics(data, month)
  const ef = data.emergencyFund
  const surplusForPlan = investibleSurplus(data, month)

  const essentials = m.essentials
  const usingBudgeted = m.actual.needs === 0 && m.budgeted.needs > 0
  const balance = m.emergencyBalance
  const targetAmount = essentials * ef.targetMonths
  const gap = balance - targetAmount
  const monthsCovered = m.emergencyMonths
  const progress = targetAmount > 0 ? (balance / targetAmount) * 100 : 0
  const tone = emergencyMonthsTone(monthsCovered)

  const assetNames = netWorthFor(data, month).assets.map((a) => a.name).filter(Boolean)

  /** Push the shortfall into the investment plan as a monthly top-up. */
  function fundGapOverYear() {
    const monthlyNeed = Math.abs(gap) / 12
    const surplus = investibleSurplus(data, month)
    if (surplus <= 0) return
    const neededPct = Math.min(100, Math.round((monthlyNeed / surplus) * 100))
    update((d) => {
      const others = (['ppf', 'nps', 'mutualFunds', 'stocks', 'gold'] as const)
      const currentOthers = others.reduce((s, k) => s + d.allocation[k], 0)
      const remaining = Math.max(0, 100 - neededPct)
      // Scale the other instruments down proportionally to make room.
      const scale = currentOthers > 0 ? remaining / currentOthers : 0
      const allocation = { ...d.allocation, emergencyTopUp: neededPct }
      others.forEach((k) => {
        allocation[k] = Math.round(d.allocation[k] * scale)
      })
      return { ...d, allocation }
    })
    notify(`Emergency top-up set to ${Math.round((monthlyNeed / surplusForPlan) * 100)}% of surplus`)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Emergency Fund"
        description="How long your liquid savings would cover essential expenses if income stopped."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Months covered"
          value={Number.isFinite(monthsCovered) ? `${monthsCovered.toFixed(1)} mo` : '—'}
          tone={tone}
          badge={tone === 'green' ? 'Covered' : tone === 'amber' ? 'Building' : 'Thin'}
          hint="≥6 green · 3–6 amber · <3 red"
        />
        <StatCard
          label="Target amount"
          value={formatINR(targetAmount)}
          hint={`${ef.targetMonths} months × ${formatINR(essentials)} of essentials`}
        />
        <StatCard
          label={gap >= 0 ? 'Surplus' : 'Shortfall'}
          value={formatINR(Math.abs(gap))}
          tone={gap >= 0 ? 'green' : 'amber'}
          badge={gap >= 0 ? 'Above target' : 'To go'}
        />
      </div>

      <Card
        title="Progress toward target"
        right={<Badge tone={tone}>{progress >= 100 ? 'Target met' : `${Math.round(progress)}% funded`}</Badge>}
      >
        <ProgressBar pct={progress} tone={tone === 'green' ? 'emerald' : tone === 'amber' ? 'amber' : 'rose'} />
        <div className="mt-2 flex justify-between text-[12px] text-slate-500">
          <span>{formatINR(balance)} saved</span>
          <span>{formatINR(targetAmount)} target</span>
        </div>
      </Card>

      {gap < 0 && surplusForPlan > 0 && (
        <ActionNote
          tone="sky"
          action={
            <Button variant="primary" size="sm" onClick={fundGapOverYear}>
              Fund it over 12 months
            </Button>
          }
        >
          Closing the {formatINR(Math.abs(gap))} gap in a year needs {formatINR(Math.abs(gap) / 12)} a month — about{' '}
          {Math.round((Math.abs(gap) / 12 / surplusForPlan) * 100)}% of your {formatINR(surplusForPlan)} monthly
          surplus. This rebalances the Investment Plan for you.
        </ActionNote>
      )}

      <Card title="Inputs" subtitle={`Essentials come from the Needs total for ${monthLabel(month)}.`}>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-slate-600">Monthly essential expenses</p>
            <button
              type="button"
              onClick={() => goTo('budget')}
              className="w-full rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-right text-sm font-semibold tabular-nums text-slate-900 transition hover:border-sky-400 hover:text-sky-700"
            >
              {formatINR(essentials)}
            </button>
            <p className="mt-1 text-[11px] text-slate-500">
              {usingBudgeted ? 'From budgeted Needs — no actuals yet' : 'From actual Needs spend'} · click to edit
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-slate-600" htmlFor="ef-months">
              Target coverage (months)
            </label>
            <MoneyInput
              id="ef-months"
              value={ef.targetMonths}
              min={0}
              onChange={(n) => update((d) => ({ ...d, emergencyFund: { ...d.emergencyFund, targetMonths: n } }))}
              suffix="mo"
            />
            <p className="mt-1 text-[11px] text-slate-500">Default 6.</p>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-slate-600" htmlFor="ef-balance">
              Current balance
            </label>
            <MoneyInput
              id="ef-balance"
              value={balance}
              disabled={ef.trackFromNetWorth}
              onChange={(n) => update((d) => ({ ...d, emergencyFund: { ...d.emergencyFund, currentBalance: n } }))}
            />
            <p className="mt-1 text-[11px] text-slate-500">
              {ef.trackFromNetWorth ? 'Read from your net worth assets' : 'Savings account, sweep FD, liquid funds'}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <Toggle
            checked={ef.trackFromNetWorth}
            onChange={(v) => update((d) => ({ ...d, emergencyFund: { ...d.emergencyFund, trackFromNetWorth: v } }))}
            label="Track the balance automatically from my net worth"
          />
          {ef.trackFromNetWorth && (
            <div className="mt-3 flex flex-wrap gap-2">
              {assetNames.map((name) => {
                const on = ef.trackedAssets.includes(name)
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() =>
                      update((d) => ({
                        ...d,
                        emergencyFund: {
                          ...d.emergencyFund,
                          trackedAssets: on
                            ? d.emergencyFund.trackedAssets.filter((a) => a !== name)
                            : [...d.emergencyFund.trackedAssets, name],
                        },
                      }))
                    }
                    className={`min-h-[2.25rem] rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition ${
                      on
                        ? 'border-sky-200 bg-sky-100 text-sky-800'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {on ? '✓ ' : '+ '}
                    {name}
                  </button>
                )
              })}
              {assetNames.length === 0 && (
                <p className="text-[12px] text-slate-500">
                  No asset lines yet — add some on the Net Worth page first.
                </p>
              )}
            </div>
          )}
        </div>

        <p className="mt-4 rounded-xl bg-sky-50 p-3 text-[13px] leading-relaxed text-sky-900">
          <span className="font-medium">How much is enough?</span> 3–6 months of essentials is often considered
          reasonable for a dual-income household, since both incomes are unlikely to stop at once. A single-income
          household is usually pointed toward 6–12 months. Adjust for job stability, health cover, and dependants.
        </p>
      </Card>
    </div>
  )
}
