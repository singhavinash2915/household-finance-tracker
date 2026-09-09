import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PageId } from '../App'
import { IncomeCard } from '../components/IncomeCard'
import { MonthlyFillGrid } from '../components/MonthlyFillGrid'
import {
  ActionNote,
  Badge,
  Button,
  Card,
  PageHeader,
  ProgressBar,
  StatCard,
} from '../components/ui'
import {
  BUCKET_COLOR,
  BUCKET_LABEL,
  debtToIncomeTone,
  emergencyMonthsTone,
  needsRatioTone,
  netWorthTone,
  netWorthTotals,
  savingsRateTone,
} from '../lib/finance'
import { compactINR, formatINR, formatPercent, monthLabel, shortMonthLabel } from '../lib/format'
import { BUCKETS, monthChecklist, monthMetrics, pendingMonthlyItems } from '../lib/selectors'
import { useStore } from '../lib/store'

export function Dashboard({ goTo }: { goTo: (p: PageId) => void }) {
  const { data, month } = useStore()
  const m = monthMetrics(data, month)
  const checklist = monthChecklist(data, month)
  const pending = pendingMonthlyItems(data, month)
  const outstanding = checklist.filter((c) => !c.done)
  const doneCount = checklist.length - outstanding.length

  const chartData = BUCKETS.map((b) => ({
    name: BUCKET_LABEL[b],
    Actual: m.actual[b],
    Target: m.target[b],
    fill: BUCKET_COLOR[b],
  }))

  const trend = Object.keys(data.netWorth)
    .sort()
    .slice(-12)
    .map((key) => ({ label: shortMonthLabel(key), 'Net Worth': netWorthTotals(data.netWorth[key]).net }))

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        description={
          <>
            Everything below is computed live from{' '}
            <span className="font-medium text-slate-700">{monthLabel(month)}</span> — change the month in the header and
            every page follows.
          </>
        }
      />

      {/* The month-close ritual, front and centre. */}
      <Card
        title={outstanding.length === 0 ? `${monthLabel(month)} is fully up to date` : `Closing ${monthLabel(month)}`}
        subtitle={
          outstanding.length === 0
            ? 'Nothing left to enter. Fixed categories posted themselves.'
            : `${doneCount} of ${checklist.length} steps done — most of the month fills itself in.`
        }
        right={<Badge tone={outstanding.length === 0 ? 'green' : 'amber'}>{doneCount}/{checklist.length}</Badge>}
      >
        <ProgressBar
          pct={(doneCount / checklist.length) * 100}
          height="h-1.5"
          tone={outstanding.length === 0 ? 'emerald' : 'sky'}
        />
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {checklist.map((c) => (
            <li key={c.id} className="min-w-0">
              <button
                type="button"
                onClick={() => goTo(c.page as PageId)}
                className={`flex w-full items-start gap-2.5 rounded-xl border p-3 text-left transition hover:border-slate-300 hover:shadow-sm ${
                  c.done ? 'border-slate-200 bg-white' : 'border-amber-200 bg-amber-50/60'
                }`}
              >
                <span
                  aria-hidden
                  className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white ${
                    c.done ? 'bg-emerald-500' : 'bg-amber-400'
                  }`}
                >
                  {c.done ? '✓' : '!'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-slate-800">{c.label}</span>
                  <span className="block truncate text-[11px] text-slate-500">{c.detail}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {pending.length > 0 && (
        <Card
          title={`Enter ${pending.length} monthly total${pending.length === 1 ? '' : 's'}`}
          subtitle="The only numbers this month actually needs from you."
          right={
            <Button variant="secondary" size="sm" onClick={() => goTo('budget')}>
              Open Budget
            </Button>
          }
        >
          <MonthlyFillGrid limit={6} />
        </Card>
      )}

      <IncomeCard />

      <div className="grid gap-4 sm:grid-cols-3">
        {BUCKETS.map((b) => (
          <StatCard
            key={b}
            label={`${BUCKET_LABEL[b]} this month`}
            value={formatINR(m.actual[b])}
            hint={`Target ${formatINR(m.target[b])} · budgeted ${formatINR(m.budgeted[b])}`}
            onClick={() => goTo('budget')}
          />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Savings rate"
          value={formatPercent(m.savingsRate)}
          tone={savingsRateTone(m.savingsRate)}
          badge={savingsRateTone(m.savingsRate) === 'green' ? 'On track' : savingsRateTone(m.savingsRate) === 'amber' ? 'Watch' : 'Low'}
          hint="≥20% green · 10–20% amber · <10% red"
          onClick={() => goTo('investments')}
        />
        <StatCard
          label="Needs ratio"
          value={formatPercent(m.needsRatio)}
          tone={needsRatioTone(m.needsRatio)}
          badge={needsRatioTone(m.needsRatio) === 'green' ? 'Within 50%' : needsRatioTone(m.needsRatio) === 'amber' ? 'Slightly over' : 'Over'}
          hint="Essentials as a share of take-home"
          onClick={() => goTo('budget')}
        />
        <StatCard
          label="Emergency fund"
          value={Number.isFinite(m.emergencyMonths) ? `${m.emergencyMonths.toFixed(1)} mo` : '—'}
          tone={emergencyMonthsTone(m.emergencyMonths)}
          badge={emergencyMonthsTone(m.emergencyMonths) === 'green' ? 'Covered' : emergencyMonthsTone(m.emergencyMonths) === 'amber' ? 'Building' : 'Thin'}
          hint={`${formatINR(m.emergencyBalance)} against ${formatINR(m.essentials)}/mo`}
          onClick={() => goTo('emergency')}
        />
        <StatCard
          label="Net worth"
          value={compactINR(m.netWorth)}
          tone={netWorthTone(m.netWorth)}
          badge={m.netWorth >= 0 ? 'Positive' : 'Negative'}
          hint={`Assets ${compactINR(m.assets)} − debts ${compactINR(m.liabilities)}`}
          onClick={() => goTo('networth')}
        />
        <StatCard
          label="Debt-to-income"
          value={formatPercent(m.debtToIncome)}
          tone={debtToIncomeTone(m.debtToIncome)}
          badge={debtToIncomeTone(m.debtToIncome) === 'green' ? 'Comfortable' : debtToIncomeTone(m.debtToIncome) === 'amber' ? 'Stretched' : 'High'}
          hint={`${formatINR(m.debtPayments)} of EMI and loan spend`}
          onClick={() => goTo('budget')}
        />
      </div>

      {Math.abs(m.unallocated) > m.income * 0.02 && m.income > 0 && (
        <ActionNote
          tone={m.unallocated > 0 ? 'sky' : 'amber'}
          action={
            <Button variant="secondary" size="sm" onClick={() => goTo('budget')}>
              Review budget
            </Button>
          }
        >
          {m.unallocated > 0 ? (
            <>
              <span className="font-medium">{formatINR(m.unallocated)} of this month's income is unaccounted for.</span>{' '}
              Either it is still sitting in the bank — in which case it belongs in savings — or a category is missing a
              number.
            </>
          ) : (
            <>
              <span className="font-medium">
                Recorded spending exceeds income by {formatINR(Math.abs(m.unallocated))}.
              </span>{' '}
              That is normal in a month with a big one-off, but worth a look.
            </>
          )}
        </ActionNote>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Actual vs 50/30/20 target" subtitle="Grey is the target, colour is what actually happened.">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  width={58}
                  tickFormatter={compactINR}
                />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  formatter={(v: number) => formatINR(v)}
                  contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Target" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                {/* fill drives the legend swatch; Cells override it per bucket. */}
                <Bar dataKey="Actual" fill="#0284c7" radius={[4, 4, 0, 0]}>
                  {chartData.map((d) => (
                    <Cell key={d.name} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Net worth trend" subtitle="Every month you have saved a snapshot for.">
          <div className="h-72">
            {trend.length < 2 ? (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500">
                Save snapshots for two months to see a trend.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="nw" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0284c7" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#0284c7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    width={62}
                    tickFormatter={compactINR}
                  />
                  <Tooltip
                    formatter={(v: number) => formatINR(v)}
                    contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Net Worth"
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#0284c7' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
