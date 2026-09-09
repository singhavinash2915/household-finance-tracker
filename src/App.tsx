import { useEffect, useState } from 'react'
import { MonthPicker } from './components/MonthPicker'
import { Toast } from './components/ui'
import { Budget } from './pages/Budget'
import { Dashboard } from './pages/Dashboard'
import { EmergencyFund } from './pages/EmergencyFund'
import { Expenses } from './pages/Expenses'
import { Goals } from './pages/Goals'
import { InvestmentPlan } from './pages/InvestmentPlan'
import { NetWorth } from './pages/NetWorth'
import { Settings } from './pages/Settings'
import { StoreProvider, useStore } from './lib/store'
import { clearData } from './lib/storage'
import { monthChecklist } from './lib/selectors'

export type PageId =
  | 'dashboard'
  | 'budget'
  | 'expenses'
  | 'networth'
  | 'emergency'
  | 'investments'
  | 'goals'
  | 'settings'

interface NavItem {
  id: PageId
  label: string
  /** Shorter label for the bottom tab bar. */
  short: string
  icon: string
}

const NAV: Array<{ group: string; items: NavItem[] }> = [
  {
    group: 'Overview',
    items: [{ id: 'dashboard', label: 'Dashboard', short: 'Home', icon: '◎' }],
  },
  {
    group: 'This month',
    items: [
      { id: 'budget', label: 'Monthly Budget', short: 'Budget', icon: '▤' },
      { id: 'expenses', label: 'Expense Log', short: 'Log', icon: '≡' },
      { id: 'networth', label: 'Net Worth', short: 'Worth', icon: '◈' },
    ],
  },
  {
    group: 'Plan ahead',
    items: [
      { id: 'emergency', label: 'Emergency Fund', short: 'Fund', icon: '⛨' },
      { id: 'investments', label: 'Investment Plan', short: 'Invest', icon: '▲' },
      { id: 'goals', label: 'Goals & SIP', short: 'Goals', icon: '◉' },
    ],
  },
  {
    group: 'Data',
    items: [{ id: 'settings', label: 'Settings & Data', short: 'Data', icon: '⚙' }],
  },
]

const ALL_PAGES = NAV.flatMap((g) => g.items)

/** The four tabs that earn a permanent slot on a phone; the rest live in More. */
const TAB_IDS: PageId[] = ['dashboard', 'budget', 'expenses', 'networth']
const TABS = TAB_IDS.map((id) => ALL_PAGES.find((p) => p.id === id)!)
const MORE_ITEMS = ALL_PAGES.filter((p) => !TAB_IDS.includes(p.id))

function isPageId(value: string): value is PageId {
  return ALL_PAGES.some((n) => n.id === value)
}

function Shell() {
  const { data, saving, storageBlocked, month, setMonth, toast, startFresh, notify } = useStore()
  // The hash keeps deep links working on GitHub Pages without a router.
  const [page, setPage] = useState<PageId>(() => {
    const fromHash = window.location.hash.replace('#', '')
    return isPageId(fromHash) ? fromHash : 'dashboard'
  })
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    window.location.hash = page
    setMoreOpen(false)
    window.scrollTo({ top: 0 })
  }, [page])

  useEffect(() => {
    const onHash = () => {
      const next = window.location.hash.replace('#', '')
      if (isPageId(next)) setPage(next)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Close the sheet with the back gesture rather than leaving the app.
  useEffect(() => {
    if (!moreOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMoreOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [moreOpen])

  const outstanding = monthChecklist(data, month).filter((c) => !c.done).length
  const moreActive = MORE_ITEMS.some((i) => i.id === page)

  const sidebar = (
    <nav className="space-y-5">
      {NAV.map((group) => (
        <div key={group.group}>
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {group.group}
          </p>
          <div className="space-y-0.5">
            {group.items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => setPage(n.id)}
                aria-current={page === n.id ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13.5px] font-medium transition ${
                  page === n.id
                    ? 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-100'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span aria-hidden className="w-4 text-center text-base opacity-70">
                  {n.icon}
                </span>
                <span className="flex-1">{n.label}</span>
                {n.id === 'dashboard' && outstanding > 0 && (
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                    {outstanding}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 pt-safe backdrop-blur">
        <div className="mx-auto flex max-w-[88rem] items-center gap-2 px-3 py-2 sm:gap-3 sm:px-6 sm:py-2.5">
          <span
            aria-hidden
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-600 text-sm font-bold text-white"
          >
            ₹
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[14px] font-semibold tracking-tight sm:text-[15px]">
              <span className="sm:hidden">Finance Tracker</span>
              <span className="hidden sm:inline">Household Finance Tracker</span>
            </h1>
            <p className="hidden text-[11px] text-slate-500 sm:block">
              All data stays in your browser — nothing is sent to a server.
            </p>
          </div>
          <MonthPicker month={month} onChange={setMonth} compact />
          <span
            title={storageBlocked ? 'Browser storage is unavailable' : undefined}
            className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset lg:inline ${
              storageBlocked
                ? 'bg-rose-50 text-rose-700 ring-rose-200'
                : saving
                  ? 'bg-amber-50 text-amber-700 ring-amber-200'
                  : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
            }`}
          >
            {storageBlocked ? 'Not saving' : saving ? 'Saving…' : 'Saved'}
          </span>
        </div>
      </header>

      <div className="mx-auto flex max-w-[88rem] gap-7 px-3 py-4 sm:px-6 sm:py-6">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24">{sidebar}</div>
        </aside>

        <main className="min-w-0 flex-1 space-y-4 pb-nav sm:space-y-5 lg:pb-0">
          {storageBlocked && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              <span className="font-semibold">This browser is not saving your data.</span> Private browsing or a
              storage-blocking setting is preventing writes. Everything works for now but will be lost on reload —
              export a backup from Settings &amp; Data.
            </div>
          )}

          {data.isSeedData && page !== 'settings' && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-900 sm:text-sm">
              <p className="min-w-0 flex-1">
                <span className="font-semibold">This is example data.</span> A sample dual-income household is
                pre-filled so nothing looks empty. Edit any field to make it yours, or clear it all out and start
                from your own numbers.
              </p>
              <button
                type="button"
                onClick={() => {
                  clearData()
                  startFresh(true)
                  notify('Example data cleared — the app is yours now')
                }}
                className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-2 text-[13px] font-medium text-amber-900 shadow-sm transition hover:bg-amber-50"
              >
                Clear example data
              </button>
            </div>
          )}

          {page === 'dashboard' && <Dashboard goTo={setPage} />}
          {page === 'budget' && <Budget goTo={setPage} />}
          {page === 'expenses' && <Expenses goTo={setPage} />}
          {page === 'networth' && <NetWorth goTo={setPage} />}
          {page === 'emergency' && <EmergencyFund goTo={setPage} />}
          {page === 'investments' && <InvestmentPlan goTo={setPage} />}
          {page === 'goals' && <Goals goTo={setPage} />}
          {page === 'settings' && <Settings />}

          <footer className="pt-2 text-[11px] text-slate-400">
            Offline, local-only, no accounts. Figures are for planning, not financial advice.
          </footer>
        </main>
      </div>

      {/* Bottom tab bar — thumb-reachable, the primary navigation on a phone. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-safe backdrop-blur lg:hidden"
        aria-label="Main"
      >
        <div className="mx-auto flex max-w-lg items-stretch">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setPage(t.id)}
              aria-current={page === t.id ? 'page' : undefined}
              className={`relative flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition ${
                page === t.id ? 'text-sky-700' : 'text-slate-500'
              }`}
            >
              <span aria-hidden className="text-lg leading-none">
                {t.icon}
              </span>
              {t.short}
              {t.id === 'dashboard' && outstanding > 0 && (
                <span className="absolute right-1/2 top-1.5 translate-x-3.5 rounded-full bg-amber-500 px-1.5 text-[9px] font-bold leading-4 text-white">
                  {outstanding}
                </span>
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-expanded={moreOpen}
            className={`flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition ${
              moreActive ? 'text-sky-700' : 'text-slate-500'
            }`}
          >
            <span aria-hidden className="text-lg leading-none">
              ⋯
            </span>
            More
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 pb-safe shadow-2xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" />
            <div className="grid grid-cols-2 gap-2">
              {MORE_ITEMS.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setPage(n.id)}
                  className={`flex min-h-[3.25rem] items-center gap-3 rounded-xl border px-3 py-2 text-left text-[13px] font-medium transition ${
                    page === n.id
                      ? 'border-sky-200 bg-sky-50 text-sky-700'
                      : 'border-slate-200 text-slate-700'
                  }`}
                >
                  <span aria-hidden className="text-base opacity-70">
                    {n.icon}
                  </span>
                  {n.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-center text-[11px] text-slate-400">
              {storageBlocked ? 'Not saving — storage blocked' : saving ? 'Saving…' : 'All changes saved on this device'}
            </p>
          </div>
        </div>
      )}

      <Toast message={toast} />
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
