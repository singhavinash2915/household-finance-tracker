import { useEffect, useState } from 'react'
import { MonthPicker } from './components/MonthPicker'
import { Toast } from './components/ui'
import { Expenses } from './pages/Expenses'
import { Home } from './pages/Home'
import { Month } from './pages/Month'
import { Settings } from './pages/Settings'
import { Wealth } from './pages/Wealth'
import { StoreProvider, useStore } from './lib/store'
import { clearData } from './lib/storage'
import { monthChecklist } from './lib/selectors'

export type PageId = 'home' | 'month' | 'wealth' | 'expenses' | 'settings'

interface NavItem {
  id: PageId
  label: string
  /** Shorter label for the bottom tab bar. */
  short: string
  icon: string
}

/**
 * Three places to go, plus settings. Everything long-term lives together on
 * Wealth, and the Expense Log is reachable from Month rather than owning a
 * permanent slot — it is optional for using the app at all.
 */
const NAV: NavItem[] = [
  { id: 'home', label: 'Home', short: 'Home', icon: '◎' },
  { id: 'month', label: 'This month', short: 'Month', icon: '▤' },
  { id: 'wealth', label: 'Wealth', short: 'Wealth', icon: '◈' },
  { id: 'settings', label: 'Settings', short: 'Settings', icon: '⚙' },
]

const ALL_PAGES: NavItem[] = [
  ...NAV,
  { id: 'expenses', label: 'Expense Log', short: 'Log', icon: '≡' },
]

function isPageId(value: string): value is PageId {
  return ALL_PAGES.some((n) => n.id === value)
}

function Shell() {
  const { data, saving, storageBlocked, month, setMonth, toast, startFresh, notify } = useStore()
  // The hash keeps deep links working on GitHub Pages without a router.
  const [page, setPage] = useState<PageId>(() => {
    const fromHash = window.location.hash.replace('#', '')
    return isPageId(fromHash) ? fromHash : 'home'
  })

  useEffect(() => {
    window.location.hash = page
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

  const outstanding = monthChecklist(data, month).filter((c) => !c.done).length

  const sidebar = (
    <nav className="space-y-0.5">
      {NAV.map((n) => (
        <button
          key={n.id}
          type="button"
          onClick={() => setPage(n.id)}
          aria-current={page === n.id ? 'page' : undefined}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13.5px] font-medium transition ${
            page === n.id
              ? 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-100'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <span aria-hidden className="w-4 text-center text-base opacity-70">
            {n.icon}
          </span>
          <span className="flex-1">{n.label}</span>
          {n.id === 'home' && outstanding > 0 && (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
              {outstanding}
            </span>
          )}
        </button>
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

          {page === 'home' && <Home goTo={setPage} />}
          {page === 'month' && <Month goTo={setPage} />}
          {page === 'wealth' && <Wealth goTo={setPage} />}
          {page === 'expenses' && <Expenses goTo={setPage} />}
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
          {NAV.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setPage(t.id)}
              aria-current={page === t.id ? 'page' : undefined}
              className={`relative flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition ${
                page === t.id || (t.id === 'month' && page === 'expenses') ? 'text-sky-700' : 'text-slate-500'
              }`}
            >
              <span aria-hidden className="text-lg leading-none">
                {t.icon}
              </span>
              {t.short}
              {t.id === 'home' && outstanding > 0 && (
                <span className="absolute right-1/2 top-1.5 translate-x-3.5 rounded-full bg-amber-500 px-1.5 text-[9px] font-bold leading-4 text-white">
                  {outstanding}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

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
