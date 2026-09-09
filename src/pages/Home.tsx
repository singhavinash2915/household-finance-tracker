import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { PageId } from '../App'
import { IncomeCard } from '../components/IncomeCard'
import { MonthlyFillGrid } from '../components/MonthlyFillGrid'
import { Badge, Button, Card, PageHeader, StatCard } from '../components/ui'
import {
  BUCKET_COLOR,
  BUCKET_LABEL,
  emergencyMonthsTone,
  netWorthTone,
  savingsRateTone,
} from '../lib/finance'
import { compactINR, formatINR, formatPercent, monthLabel } from '../lib/format'
import { BUCKETS, monthMetrics, pendingMonthlyItems } from '../lib/selectors'
import { useStore } from '../lib/store'

export function Home({ goTo }: { goTo: (p: PageId) => void }) {
  const { data, month } = useStore()
  const m = monthMetrics(data, month)
  const pending = pendingMonthlyItems(data, month)

  const spent = m.actual.needs + m.actual.wants
  const saved = m.actual.savings
  const left = m.income - spent - saved

  const chartData = BUCKETS.map((b) => ({
    name: BUCKET_LABEL[b],
    Spent: m.actual[b],
    Target: m.target[b],
    fill: BUCKET_COLOR[b],
  }))

  return (
    <div className="space-y-4">
      <PageHeader
        title={monthLabel(month)}
        description={
          pending.length > 0
            ? `${pending.length} number${pending.length === 1 ? '' : 's'} left to enter — everything else filled itself in.`
            : 'Everything for this month is up to date.'
        }
      />

      {/* One glance: in, out, left. */}
      <Card>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">In</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900 sm:text-xl">
              {formatINR(m.income)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Spent</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900 sm:text-xl">{formatINR(spent)}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Saved</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-600 sm:text-xl">{formatINR(saved)}</p>
          </div>
        </div>
        {m.income > 0 && (
          <>
            <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="bg-sky-500"
                style={{ width: `${Math.max(0, Math.min(100, (m.actual.needs / m.income) * 100))}%` }}
              />
              <div
                className="bg-amber-500"
                style={{ width: `${Math.max(0, Math.min(100, (m.actual.wants / m.income) * 100))}%` }}
              />
              <div
                className="bg-emerald-500"
                style={{ width: `${Math.max(0, Math.min(100, (saved / m.income) * 100))}%` }}
              />
            </div>
            <p className="mt-2 text-center text-[12px] text-slate-500">
              {left >= 0 ? (
                <>
                  <span className="font-medium text-slate-700">{formatINR(left)}</span> not yet accounted for
                </>
              ) : (
                <>
                  <span className="font-medium text-rose-600">{formatINR(Math.abs(left))}</span> more than came in
                </>
              )}
            </p>
          </>
        )}
      </Card>

      {/* The only thing asking for input, when there is anything. */}
      <MonthlyFillGrid limit={6} onOpenBudget={() => goTo('month')} />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Savings rate"
          value={formatPercent(m.savingsRate, 0)}
          tone={savingsRateTone(m.savingsRate)}
          badge={
            savingsRateTone(m.savingsRate) === 'green'
              ? 'On track'
              : savingsRateTone(m.savingsRate) === 'amber'
                ? 'Could be better'
                : 'Low'
          }
          hint="20% or more is a healthy target"
          onClick={() => goTo('month')}
        />
        <StatCard
          label="Emergency fund"
          value={Number.isFinite(m.emergencyMonths) ? `${m.emergencyMonths.toFixed(1)} mo` : '—'}
          tone={emergencyMonthsTone(m.emergencyMonths)}
          badge={
            emergencyMonthsTone(m.emergencyMonths) === 'green'
              ? 'Covered'
              : emergencyMonthsTone(m.emergencyMonths) === 'amber'
                ? 'Building'
                : 'Thin'
          }
          hint={`${formatINR(m.emergencyBalance)} put aside`}
          onClick={() => goTo('wealth')}
        />
        <StatCard
          label="Net worth"
          value={compactINR(m.netWorth)}
          tone={netWorthTone(m.netWorth)}
          badge={m.netWorth >= 0 ? 'Positive' : 'Negative'}
          hint={`${compactINR(m.assets)} owned − ${compactINR(m.liabilities)} owed`}
          onClick={() => goTo('wealth')}
        />
      </div>

      <Card
        title="Against the 50/30/20 guide"
        subtitle="Grey is the guideline for your income; colour is what actually happened."
      >
        <div className="h-60 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                width={52}
                tickFormatter={compactINR}
              />
              <Tooltip
                cursor={{ fill: '#f1f5f9' }}
                formatter={(v: number) => formatINR(v)}
                contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}
              />
              <Bar dataKey="Target" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Spent" fill="#0284c7" radius={[4, 4, 0, 0]}>
                {chartData.map((d) => (
                  <Cell key={d.name} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <IncomeCard />

      {m.income > 0 && m.needsRatio > 60 && (
        <Card>
          <p className="flex flex-wrap items-center gap-2 text-[13px] text-slate-600">
            <Badge tone="amber">Heads up</Badge>
            Essentials are {formatPercent(m.needsRatio, 0)} of your income. Above about 60% there is little room left
            to save.
            <Button variant="ghost" size="sm" onClick={() => goTo('month')}>
              Review
            </Button>
          </p>
        </Card>
      )}
    </div>
  )
}
