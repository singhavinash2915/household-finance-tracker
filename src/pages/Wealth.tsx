import { useState } from 'react'
import type { PageId } from '../App'
import { PageHeader } from '../components/ui'
import { EmergencyFund } from './EmergencyFund'
import { Goals } from './Goals'
import { InvestmentPlan } from './InvestmentPlan'
import { NetWorth } from './NetWorth'
import { formatINR, compactINR } from '../lib/format'
import { monthMetrics, investibleSurplus } from '../lib/selectors'
import { requiredSIP } from '../lib/finance'
import { useStore } from '../lib/store'

type SectionId = 'networth' | 'emergency' | 'investments' | 'goals'

/**
 * The four long-term views on one page. They are separate concerns but you
 * look at them together and rarely — no reason for each to own a tab.
 */
export function Wealth({ goTo }: { goTo: (p: PageId) => void }) {
  const { data, month } = useStore()
  const m = monthMetrics(data, month)
  const [open, setOpen] = useState<SectionId>('networth')

  const goalsSIP = data.goals.reduce((s, g) => s + requiredSIP(g.targetAmount, g.years, g.expectedReturn), 0)

  const sections: Array<{ id: SectionId; label: string; summary: string; body: React.ReactNode }> = [
    {
      id: 'networth',
      label: 'Net worth',
      summary: `${compactINR(m.netWorth)} — ${compactINR(m.assets)} owned, ${compactINR(m.liabilities)} owed`,
      body: <NetWorth goTo={goTo} embedded />,
    },
    {
      id: 'emergency',
      label: 'Emergency fund',
      summary: Number.isFinite(m.emergencyMonths)
        ? `${m.emergencyMonths.toFixed(1)} months of essentials covered`
        : 'Not set up yet',
      body: <EmergencyFund goTo={goTo} embedded />,
    },
    {
      id: 'investments',
      label: 'Where savings go',
      summary: `${formatINR(investibleSurplus(data, month))} a month to allocate`,
      body: <InvestmentPlan goTo={goTo} embedded />,
    },
    {
      id: 'goals',
      label: 'Goals',
      summary: data.goals.length
        ? `${data.goals.length} goal${data.goals.length === 1 ? '' : 's'} · ${formatINR(goalsSIP)} a month needed`
        : 'No goals yet',
      body: <Goals goTo={goTo} embedded />,
    },
  ]

  return (
    <div className="space-y-3">
      <PageHeader
        title="Wealth"
        description="The long view: what you own, what you would fall back on, and what you are building toward. Nothing here needs monthly upkeep."
      />

      {sections.map((section) => {
        const isOpen = open === section.id
        return (
          <div
            key={section.id}
            className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50"
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? ('' as SectionId) : section.id)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold tracking-tight text-slate-900">{section.label}</span>
                <span className="mt-0.5 block truncate text-[12px] text-slate-500">{section.summary}</span>
              </span>
              <span
                aria-hidden
                className={`shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              >
                ⌄
              </span>
            </button>
            {isOpen && <div className="border-t border-slate-100 bg-slate-50/40 p-3 sm:p-4">{section.body}</div>}
          </div>
        )
      })}
    </div>
  )
}
