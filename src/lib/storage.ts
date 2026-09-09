import { seedData } from './seed'
import type { AppData, BudgetItem, EntryMode, MonthBudget } from './types'

export const STORAGE_KEY = 'household-finance-tracker:v1'
export const CURRENT_VERSION = 2

/**
 * v1 had no entry modes and fed every Actual from the expense log, so an item
 * with no mode migrates to `detailed` — that reproduces its old total exactly.
 */
function migrateItem(raw: Partial<BudgetItem> & { name?: string }): BudgetItem {
  const mode: EntryMode = raw.mode ?? 'detailed'
  return {
    id: String(raw.id ?? Math.random().toString(36).slice(2, 10)),
    name: String(raw.name ?? ''),
    budgeted: Number(raw.budgeted ?? 0),
    mode,
    ...(mode === 'auto' ? { autoAmount: raw.autoAmount ?? raw.budgeted ?? 0, autoDay: raw.autoDay } : {}),
  }
}

function migrateBudget(raw: unknown): MonthBudget {
  const b = (raw ?? {}) as Partial<MonthBudget>
  const list = (items: unknown) => (Array.isArray(items) ? items.map(migrateItem) : [])
  return { needs: list(b.needs), wants: list(b.wants), savings: list(b.savings) }
}

/** Fill in anything a hand-edited, imported or older JSON blob is missing. */
export function normalise(raw: unknown): AppData {
  const fallback = seedData()
  if (!raw || typeof raw !== 'object') return fallback
  const d = raw as Partial<AppData>

  const budgets: AppData['budgets'] = {}
  for (const [month, budget] of Object.entries(d.budgets ?? {})) {
    budgets[month] = migrateBudget(budget)
  }

  return {
    version: CURRENT_VERSION,
    isSeedData: d.isSeedData ?? false,
    income: { ...fallback.income, ...(d.income ?? {}) },
    otherIncome: d.otherIncome ?? {},
    budgets: Object.keys(budgets).length ? budgets : fallback.budgets,
    monthlyEntries: d.monthlyEntries ?? {},
    expenses: Array.isArray(d.expenses) ? d.expenses : [],
    netWorth: d.netWorth ?? {},
    closedMonths: Array.isArray(d.closedMonths) ? d.closedMonths : [],
    emergencyFund: { ...fallback.emergencyFund, ...(d.emergencyFund ?? {}) },
    allocation: { ...fallback.allocation, ...(d.allocation ?? {}) },
    goals: Array.isArray(d.goals) ? d.goals : [],
  }
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedData()
    return normalise(JSON.parse(raw))
  } catch {
    // Corrupt blob or storage blocked — start from example data rather than crash.
    return seedData()
  }
}

export function saveData(data: AppData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch {
    // Private mode / quota exceeded: the session still works, it just won't persist.
    return false
  }
}

export function clearData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function downloadJSON(data: AppData): void {
  const stamp = new Date().toISOString().slice(0, 10)
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `household-finance-${stamp}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
