import { carryForward, defaultBudget } from './seed'
import { INSTRUMENT_CATEGORY, netWorthTotals, otherIncomeTotal, totalIncome } from './finance'
import type {
  AppData,
  Bucket,
  BudgetItem,
  MonthBudget,
  NetWorthSnapshot,
} from './types'

export const BUCKETS: Bucket[] = ['needs', 'wants', 'savings']

/** The most recent saved month at or before `month`. */
function previousKey(keys: string[], month: string): string | undefined {
  return keys
    .filter((m) => m < month)
    .sort()
    .pop()
}

/**
 * Budget for a month. A month the user has never opened inherits the previous
 * month's categories, modes and auto amounts, so a new month is ready to go
 * without any setup — and saved months are never overwritten.
 */
export function budgetFor(data: AppData, month: string): MonthBudget {
  const existing = data.budgets[month]
  if (existing) return existing
  const prev = previousKey(Object.keys(data.budgets), month)
  return carryForward(prev ? data.budgets[prev] : defaultBudget())
}

export function isMonthStarted(data: AppData, month: string): boolean {
  return Boolean(data.budgets[month])
}

export function netWorthFor(data: AppData, month: string): NetWorthSnapshot {
  const existing = data.netWorth[month]
  if (existing) return existing
  const prev = previousKey(Object.keys(data.netWorth), month)
  if (!prev) return { assets: [], liabilities: [] }
  const base = data.netWorth[prev]
  return {
    assets: base.assets.map((a) => ({ ...a })),
    liabilities: base.liabilities.map((l) => ({ ...l })),
  }
}

// --- Actuals -------------------------------------------------------------

export interface ActualBreakdown {
  auto: number
  monthly: number
  logged: number
  total: number
}

export function loggedFor(data: AppData, month: string, category: string): number {
  if (!category) return 0
  return data.expenses
    .filter((e) => e.date.startsWith(month) && e.category === category)
    .reduce((s, e) => s + (e.amount || 0), 0)
}

/**
 * Actual for one category = every source that has a value, added together.
 * Summing rather than switching on the mode means changing a category's mode
 * never silently hides numbers the user already entered.
 */
export function actualBreakdown(data: AppData, month: string, item: BudgetItem): ActualBreakdown {
  const auto = item.mode === 'auto' ? (item.autoAmount ?? item.budgeted ?? 0) : 0
  const monthly = data.monthlyEntries[month]?.[item.id] ?? 0
  const logged = loggedFor(data, month, item.name)
  return { auto, monthly, logged, total: auto + monthly + logged }
}

export function itemActual(data: AppData, month: string, item: BudgetItem): number {
  return actualBreakdown(data, month, item).total
}

export function bucketActual(data: AppData, month: string, bucket: Bucket): number {
  return budgetFor(data, month)[bucket].reduce((s, i) => s + itemActual(data, month, i), 0)
}

export function bucketBudgeted(data: AppData, month: string, bucket: Bucket): number {
  return budgetFor(data, month)[bucket].reduce((s, i) => s + (i.budgeted || 0), 0)
}

/** Categories that accept itemised rows, for the Expense Log dropdown. */
export function categoryOptions(budget: MonthBudget): Array<{ bucket: Bucket; items: BudgetItem[] }> {
  return BUCKETS.map((bucket) => ({ bucket, items: budget[bucket] }))
}

export function allCategoryNames(budget: MonthBudget): string[] {
  return BUCKETS.flatMap((b) => budget[b].map((i) => i.name)).filter(Boolean)
}

export function findItemByName(budget: MonthBudget, name: string): BudgetItem | undefined {
  for (const b of BUCKETS) {
    const hit = budget[b].find((i) => i.name === name)
    if (hit) return hit
  }
  return undefined
}

// --- Emergency fund ------------------------------------------------------

/** Balance either typed by hand or read from the month's net-worth assets. */
export function emergencyBalance(data: AppData, month: string): number {
  const ef = data.emergencyFund
  if (!ef.trackFromNetWorth) return ef.currentBalance
  const snap = netWorthFor(data, month)
  return snap.assets
    .filter((a) => ef.trackedAssets.includes(a.name))
    .reduce((s, a) => s + (a.amount || 0), 0)
}

/**
 * The part of the month's savings the household actually chooses where to put.
 * EPF (and anything else not mapped to an instrument) is deducted at source,
 * so it is savings but not allocatable — excluding it keeps the Investment
 * Plan's percentages honest and stops "apply to budget" inflating the total.
 */
export function investibleSurplus(data: AppData, month: string): number {
  const instrumentNames = Object.values(INSTRUMENT_CATEGORY)
  return budgetFor(data, month)
    .savings.filter((i) => instrumentNames.includes(i.name))
    .reduce((s, i) => s + itemActual(data, month, i), 0)
}

/** Savings that bypass the allocation entirely, e.g. employer EPF. */
export function nonDiscretionarySavings(data: AppData, month: string): number {
  const instrumentNames = Object.values(INSTRUMENT_CATEGORY)
  return budgetFor(data, month)
    .savings.filter((i) => !instrumentNames.includes(i.name))
    .reduce((s, i) => s + itemActual(data, month, i), 0)
}

// --- Whole-month rollup --------------------------------------------------

const DEBT_PATTERN = /emi|loan|credit card/i

export interface MonthMetrics {
  income: number
  salary: number
  otherIncome: number
  budget: MonthBudget
  actual: Record<Bucket, number>
  budgeted: Record<Bucket, number>
  target: Record<Bucket, number>
  essentials: number
  savingsRate: number
  needsRatio: number
  wantsRatio: number
  emergencyBalance: number
  emergencyMonths: number
  debtPayments: number
  debtToIncome: number
  netWorth: number
  assets: number
  liabilities: number
  unallocated: number
}

export function monthMetrics(data: AppData, month: string): MonthMetrics {
  const income = totalIncome(data, month)
  const budget = budgetFor(data, month)

  const actual = {} as Record<Bucket, number>
  const budgeted = {} as Record<Bucket, number>
  BUCKETS.forEach((b) => {
    actual[b] = budget[b].reduce((s, i) => s + itemActual(data, month, i), 0)
    budgeted[b] = budget[b].reduce((s, i) => s + (i.budgeted || 0), 0)
  })

  const target: Record<Bucket, number> = {
    needs: income * 0.5,
    wants: income * 0.3,
    savings: income * 0.2,
  }

  const debtPayments = budget.needs
    .filter((i) => DEBT_PATTERN.test(i.name))
    .reduce((s, i) => s + itemActual(data, month, i), 0)

  const nw = netWorthTotals(netWorthFor(data, month))
  const essentials = actual.needs || budgeted.needs
  const efBalance = emergencyBalance(data, month)

  return {
    income,
    salary: income - otherIncomeTotal(data, month),
    otherIncome: otherIncomeTotal(data, month),
    budget,
    actual,
    budgeted,
    target,
    essentials,
    savingsRate: income > 0 ? (actual.savings / income) * 100 : NaN,
    needsRatio: income > 0 ? (actual.needs / income) * 100 : NaN,
    wantsRatio: income > 0 ? (actual.wants / income) * 100 : NaN,
    emergencyBalance: efBalance,
    emergencyMonths: essentials > 0 ? efBalance / essentials : NaN,
    debtPayments,
    debtToIncome: income > 0 ? (debtPayments / income) * 100 : NaN,
    netWorth: nw.net,
    assets: nw.assets,
    liabilities: nw.liabilities,
    unallocated: income - (actual.needs + actual.wants + actual.savings),
  }
}

// --- Month checklist -----------------------------------------------------

export interface ChecklistItem {
  id: string
  label: string
  detail: string
  done: boolean
  page: string
}

/**
 * The month-close checklist that drives the Dashboard. It is deliberately
 * short: with auto categories doing the heavy lifting, closing a month is
 * a handful of numbers.
 */
export function monthChecklist(data: AppData, month: string): ChecklistItem[] {
  const budget = budgetFor(data, month)
  const pendingMonthly = BUCKETS.flatMap((b) => budget[b])
    .filter((i) => i.mode === 'monthly')
    .filter((i) => (data.monthlyEntries[month]?.[i.id] ?? null) === null)

  const autoCount = BUCKETS.flatMap((b) => budget[b]).filter((i) => i.mode === 'auto').length
  const logged = data.expenses.filter((e) => e.date.startsWith(month)).length
  const allocationTotal = Object.values(data.allocation).reduce((s, v) => s + v, 0)

  return [
    {
      id: 'income',
      label: 'Income confirmed',
      detail:
        totalIncome(data, month) > 0
          ? otherIncomeTotal(data, month) > 0
            ? `Salaries plus ${(data.otherIncome[month] ?? []).length} other source${(data.otherIncome[month] ?? []).length === 1 ? '' : 's'}`
            : 'Both salaries recorded'
          : 'Add take-home pay for each earner',
      done: totalIncome(data, month) > 0,
      page: 'budget',
    },
    {
      id: 'auto',
      label: 'Fixed items posted',
      detail:
        autoCount > 0
          ? `${autoCount} automatic categories counted — nothing to type`
          : 'Set fixed bills like rent and SIPs to Auto so they post themselves',
      done: autoCount > 0,
      page: 'budget',
    },
    {
      id: 'monthly',
      label: 'Monthly totals entered',
      detail: pendingMonthly.length
        ? `${pendingMonthly.length} left: ${pendingMonthly.slice(0, 3).map((i) => i.name).join(', ')}${pendingMonthly.length > 3 ? '…' : ''}`
        : 'Every variable category has a number',
      done: pendingMonthly.length === 0,
      page: 'budget',
    },
    {
      id: 'detail',
      label: 'Detailed spend imported',
      detail: logged ? `${logged} itemised transactions this month` : 'Optional — paste a statement to itemise',
      done: logged > 0,
      page: 'expenses',
    },
    {
      id: 'networth',
      label: 'Net worth snapshot saved',
      detail: data.netWorth[month] ? 'Balances recorded for this month' : 'Roll forward last month and adjust',
      done: Boolean(data.netWorth[month]),
      page: 'networth',
    },
    {
      id: 'allocation',
      label: 'Investment plan balanced',
      detail:
        Math.abs(allocationTotal - 100) < 0.01
          ? 'Allocations total 100%'
          : `Allocations total ${allocationTotal}%`,
      done: Math.abs(allocationTotal - 100) < 0.01,
      page: 'investments',
    },
  ]
}

export function pendingMonthlyItems(data: AppData, month: string): BudgetItem[] {
  const budget = budgetFor(data, month)
  return BUCKETS.flatMap((b) => budget[b])
    .filter((i) => i.mode === 'monthly')
    .filter((i) => (data.monthlyEntries[month]?.[i.id] ?? null) === null)
}
