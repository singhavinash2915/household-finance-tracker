import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PageId } from '../App'
import {
  ActionNote,
  Button,
  Card,
  MoneyInput,
  PageHeader,
  StatCard,
  TableWrap,
  TextField,
} from '../components/ui'
import { CONTRIBUTION_TO_ASSET, netWorthTone, netWorthTotals } from '../lib/finance'
import { compactINR, formatINR, formatMonths, monthLabel, shiftMonth, shortMonthLabel, uid } from '../lib/format'
import { budgetFor, itemActual, monthMetrics, netWorthFor } from '../lib/selectors'
import { useStore } from '../lib/store'
import type { NetWorthLine, NetWorthSnapshot } from '../lib/types'

type Side = 'assets' | 'liabilities'

export function NetWorth({ goTo }: { goTo: (p: PageId) => void }) {
  const { data, update, month, notify } = useStore()
  const snapshot = netWorthFor(data, month)
  const totals = netWorthTotals(snapshot)
  const m = monthMetrics(data, month)
  const saved = Boolean(data.netWorth[month])

  function writeSnapshot(fn: (s: NetWorthSnapshot) => NetWorthSnapshot) {
    update((d) => ({ ...d, netWorth: { ...d.netWorth, [month]: fn(netWorthFor(d, month)) } }))
  }

  function patch(side: Side, id: string, changes: Partial<NetWorthLine>) {
    writeSnapshot((s) => ({ ...s, [side]: s[side].map((l) => (l.id === id ? { ...l, ...changes } : l)) }))
  }

  function addLine(side: Side) {
    writeSnapshot((s) => ({ ...s, [side]: [...s[side], { id: uid(), name: '', amount: 0 }] }))
  }

  function removeLine(side: Side, id: string) {
    writeSnapshot((s) => ({ ...s, [side]: s[side].filter((l) => l.id !== id) }))
  }

  /**
   * The one-click month update: take last month's balances and add what this
   * month's savings categories actually contributed, so only market movement
   * and loan balances need a human.
   */
  const contributions = (() => {
    const budget = budgetFor(data, month)
    const map: Record<string, number> = {}
    for (const item of budget.savings) {
      const asset = CONTRIBUTION_TO_ASSET[item.name]
      if (!asset) continue
      map[asset] = (map[asset] ?? 0) + itemActual(data, month, item)
    }
    return map
  })()

  const contributionTotal = Object.values(contributions).reduce((s, v) => s + v, 0)

  function rollForward() {
    const prevKey = Object.keys(data.netWorth)
      .filter((k) => k < month)
      .sort()
      .pop()
    const base = prevKey ? data.netWorth[prevKey] : snapshot
    update((d) => ({
      ...d,
      netWorth: {
        ...d.netWorth,
        [month]: {
          assets: base.assets.map((a) => ({
            ...a,
            id: uid(),
            amount: Math.round((a.amount || 0) + (contributions[a.name] ?? 0)),
          })),
          liabilities: base.liabilities.map((l) => ({ ...l, id: uid() })),
        },
      },
    }))
    notify(
      `Carried ${prevKey ? shortMonthLabel(prevKey) : 'previous'} forward and added ${formatINR(contributionTotal)} of contributions`,
    )
  }

  const trend = Object.keys(data.netWorth)
    .sort()
    .map((key) => {
      const t = netWorthTotals(data.netWorth[key])
      return {
        label: shortMonthLabel(key),
        'Net Worth': t.net,
        Assets: t.assets,
        Liabilities: t.liabilities,
      }
    })

  const prevKey = Object.keys(data.netWorth)
    .filter((k) => k < month)
    .sort()
    .pop()
  const change = prevKey ? totals.net - netWorthTotals(data.netWorth[prevKey]).net : null

  return (
    <div className="space-y-5">
      <PageHeader
        title="Net Worth"
        description="One snapshot per month. A new month starts from your last one, with this month's investment contributions already added."
        right={
          <Button variant={saved ? 'secondary' : 'primary'} onClick={rollForward}>
            {saved ? 'Re-roll from last month' : 'Roll forward + add contributions'}
          </Button>
        }
      />

      {!saved && (
        <ActionNote
          tone="amber"
          action={
            <Button variant="primary" size="sm" onClick={rollForward}>
              Roll forward
            </Button>
          }
        >
          <span className="font-medium">No snapshot saved for {monthLabel(month)} yet.</span> The figures below are
          carried over from {prevKey ? shortMonthLabel(prevKey) : 'nothing yet'} — roll forward to add{' '}
          {formatINR(contributionTotal)} of contributions logged in Savings this month, then adjust for market moves.
        </ActionNote>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total assets" value={compactINR(totals.assets)} hint={formatINR(totals.assets)} />
        <StatCard label="Total liabilities" value={compactINR(totals.liabilities)} hint={formatINR(totals.liabilities)} />
        <StatCard
          label="Net worth"
          value={compactINR(totals.net)}
          tone={netWorthTone(totals.net)}
          badge={saved ? 'Saved' : 'Unsaved'}
          hint={
            change === null
              ? formatINR(totals.net)
              : `${change >= 0 ? '▲' : '▼'} ${formatINR(Math.abs(change))} vs ${shortMonthLabel(prevKey!)}`
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {(['assets', 'liabilities'] as Side[]).map((side) => (
          <Card
            key={side}
            title={side === 'assets' ? 'Assets' : 'Liabilities'}
            subtitle={`Total ${formatINR(side === 'assets' ? totals.assets : totals.liabilities)}`}
            right={
              <Button variant="secondary" size="sm" onClick={() => addLine(side)}>
                + Line
              </Button>
            }
          >
            <TableWrap minWidth="0">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {snapshot[side].map((l) => {
                    const added = side === 'assets' ? contributions[l.name] : undefined
                    return (
                      <tr key={l.id} className="hover:bg-slate-50/60">
                        <td className="px-2 py-2">
                          <TextField
                            value={l.name}
                            placeholder="Line item"
                            onChange={(e) => patch(side, l.id, { name: e.target.value })}
                          />
                          {Boolean(added) && (
                            <p className="mt-1 px-1 text-[11px] text-emerald-600">
                              +{formatINR(added!)} contributed this month
                            </p>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <MoneyInput
                            value={l.amount}
                            onChange={(n) => patch(side, l.id, { amount: n })}
                            className="w-28 sm:w-32"
                            aria-label={`${l.name} amount`}
                          />
                        </td>
                        <td className="w-8 px-2 py-2 text-right">
                          <Button variant="ghost" size="sm" aria-label="Remove line" onClick={() => removeLine(side, l.id)}>
                            ✕
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                  {snapshot[side].length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-2 py-6 text-center text-sm text-slate-500">
                        Nothing recorded — add a line.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableWrap>
          </Card>
        ))}
      </div>

      {data.emergencyFund.trackFromNetWorth && (
        <ActionNote
          tone="sky"
          action={
            <Button variant="secondary" size="sm" onClick={() => goTo('emergency')}>
              Emergency Fund
            </Button>
          }
        >
          {data.emergencyFund.trackedAssets.length === 0 ? (
            <>
              Your emergency fund is set to track these assets but none are selected yet, so it reads nothing. Pick the
              lines that make up your fund.
            </>
          ) : (
            <>
              Your emergency fund reads {formatINR(m.emergencyBalance)} from{' '}
              {data.emergencyFund.trackedAssets.join(' + ')} above — {formatMonths(m.emergencyMonths)} of essentials.
            </>
          )}
        </ActionNote>
      )}

      <Card title="Net worth trend" subtitle="Across every saved month.">
        <div className="h-80">
          {trend.length < 2 ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500">
              Save snapshots for at least two months to see a trend line.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  width={64}
                  tickFormatter={compactINR}
                />
                <Tooltip
                  formatter={(v: number) => formatINR(v)}
                  contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Line type="monotone" dataKey="Net Worth" stroke="#0284c7" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Assets" stroke="#10b981" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                <Line type="monotone" dataKey="Liabilities" stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <p className="mt-3 text-[11px] text-slate-500">
          Next month ({shortMonthLabel(shiftMonth(month, 1))}) will start from these balances automatically.
        </p>
      </Card>
    </div>
  )
}
