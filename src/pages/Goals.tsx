import type { PageId } from '../App'
import {
  ActionNote,
  Button,
  Card,
  MoneyInput,
  PageHeader,
  ProgressBar,
  StatCard,
  TableWrap,
  TextField,
} from '../components/ui'
import { requiredSIP } from '../lib/finance'
import { formatINR, uid } from '../lib/format'
import { investibleSurplus } from '../lib/selectors'
import { useStore } from '../lib/store'
import type { Goal } from '../lib/types'

export function Goals({ goTo }: { goTo: (p: PageId) => void }) {
  const { data, update, month } = useStore()
  const surplus = investibleSurplus(data, month)

  const rows = data.goals.map((g) => ({ ...g, sip: requiredSIP(g.targetAmount, g.years, g.expectedReturn) }))
  const totalSIP = rows.reduce((s, r) => s + r.sip, 0)
  const over = totalSIP > surplus && surplus > 0
  const coverage = surplus > 0 ? Math.min(100, (surplus / totalSIP) * 100) : 0

  function patch(id: string, changes: Partial<Goal>) {
    update((d) => ({ ...d, goals: d.goals.map((g) => (g.id === id ? { ...g, ...changes } : g)) }))
  }

  function addGoal() {
    update((d) => ({
      ...d,
      goals: [...d.goals, { id: uid(), name: '', targetAmount: 0, years: 5, expectedReturn: 10 }],
    }))
  }

  function removeGoal(id: string) {
    update((d) => ({ ...d, goals: d.goals.filter((g) => g.id !== id) }))
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Goals & SIP"
        description="Work backwards from each target to the monthly SIP it needs, assuming contributions at the start of each month."
        right={
          <Button variant="primary" onClick={addGoal}>
            + Add goal
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total required monthly SIP"
          value={formatINR(totalSIP)}
          hint={`${rows.length} goal${rows.length === 1 ? '' : 's'}`}
        />
        <StatCard
          label="Monthly investible surplus"
          value={formatINR(surplus)}
          hint="Savings actual from the Budget page"
          onClick={() => goTo('investments')}
        />
        <StatCard
          label={over ? 'Gap' : 'Headroom'}
          value={formatINR(Math.abs(surplus - totalSIP))}
          tone={over ? 'red' : 'green'}
          badge={over ? 'Short' : 'Within surplus'}
        />
      </div>

      <Card
        title="Are these goals fundable?"
        subtitle={
          over
            ? `Your surplus covers ${Math.round(coverage)}% of what these goals need.`
            : 'Your monthly surplus covers every goal on this list.'
        }
      >
        <ProgressBar pct={over ? coverage : 100} tone={over ? 'rose' : 'emerald'} />
        <div className="mt-2 flex justify-between text-[12px] text-slate-500">
          <span>{formatINR(surplus)} available</span>
          <span>{formatINR(totalSIP)} needed</span>
        </div>
      </Card>

      {over && (
        <ActionNote
          tone="rose"
          action={
            <Button variant="secondary" size="sm" onClick={() => goTo('budget')}>
              Raise savings
            </Button>
          }
        >
          <span className="font-semibold">
            These goals need {formatINR(totalSIP)} a month against a {formatINR(surplus)} surplus.
          </span>{' '}
          Stretch the timelines, trim a target, or raise the savings rate — an optimistic expected return is the one
          lever that only looks like it helps.
        </ActionNote>
      )}

      <Card>
        {/* One card per goal on phones. */}
        <ul className="space-y-2.5 sm:hidden">
          {rows.map((g) => (
            <li key={g.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-start gap-2">
                <TextField
                  value={g.name}
                  placeholder="Goal name"
                  onChange={(e) => patch(g.id, { name: e.target.value })}
                  className="flex-1"
                />
                <Button variant="ghost" aria-label="Remove goal" onClick={() => removeGoal(g.id)}>
                  ✕
                </Button>
              </div>
              <div className="mt-2.5 grid grid-cols-3 gap-2">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-slate-500">Target</span>
                  <MoneyInput value={g.targetAmount} onChange={(n) => patch(g.id, { targetAmount: n })} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-slate-500">Years</span>
                  <MoneyInput value={g.years} min={0} onChange={(n) => patch(g.id, { years: n })} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-slate-500">Return</span>
                  <MoneyInput
                    value={g.expectedReturn}
                    min={0}
                    step={0.5}
                    onChange={(n) => patch(g.id, { expectedReturn: n })}
                    suffix="%"
                  />
                </label>
              </div>
              <p className="mt-2.5 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-[13px]">
                <span className="text-slate-500">Monthly SIP needed</span>
                <span className="font-semibold tabular-nums text-slate-900">{formatINR(g.sip)}</span>
              </p>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-[13px] text-slate-500">
              No goals yet — add one to size the SIP it needs.
            </li>
          )}
          <li className="flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2.5 text-[13px] font-semibold">
            <span>Total monthly SIP</span>
            <span className={`tabular-nums ${over ? 'text-rose-600' : ''}`}>{formatINR(totalSIP)}</span>
          </li>
        </ul>

        <div className="hidden sm:block">
        <TableWrap minWidth="48rem">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-2 py-2 font-semibold">Goal</th>
                <th className="px-2 py-2 text-right font-semibold">Target amount</th>
                <th className="px-2 py-2 text-right font-semibold">Years</th>
                <th className="px-2 py-2 text-right font-semibold">Expected return</th>
                <th className="px-2 py-2 text-right font-semibold">Required monthly SIP</th>
                <th className="w-8 px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((g) => (
                <tr key={g.id} className="hover:bg-slate-50/60">
                  <td className="px-2 py-2">
                    <TextField
                      value={g.name}
                      placeholder="Goal name"
                      onChange={(e) => patch(g.id, { name: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <MoneyInput value={g.targetAmount} onChange={(n) => patch(g.id, { targetAmount: n })} className="w-36" />
                  </td>
                  <td className="px-2 py-2">
                    <MoneyInput value={g.years} min={0} onChange={(n) => patch(g.id, { years: n })} className="w-20" />
                  </td>
                  <td className="px-2 py-2">
                    <MoneyInput
                      value={g.expectedReturn}
                      min={0}
                      step={0.5}
                      onChange={(n) => patch(g.id, { expectedReturn: n })}
                      className="w-24"
                      suffix="%"
                    />
                  </td>
                  <td className="px-2 py-2 text-right text-sm font-semibold tabular-nums text-slate-900">
                    {formatINR(g.sip)}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <Button variant="ghost" size="sm" aria-label="Remove goal" onClick={() => removeGoal(g.id)}>
                      ✕
                    </Button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-2 py-10 text-center text-sm text-slate-500">
                    No goals yet — add one to size the SIP it needs.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 text-[13px] font-semibold">
                <td className="px-2 py-3 text-slate-900" colSpan={4}>
                  Total required monthly SIP
                </td>
                <td className={`px-2 py-3 text-right tabular-nums ${over ? 'text-rose-600' : 'text-slate-900'}`}>
                  {formatINR(totalSIP)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </TableWrap>
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
          SIP = FV × r / (((1+r)<sup>n</sup> − 1) × (1+r)), where r is the monthly rate (annual ÷ 12) and n is the
          number of months. Returns are assumptions, not promises — figures are nominal and ignore inflation and taxes.
        </p>
      </Card>
    </div>
  )
}
