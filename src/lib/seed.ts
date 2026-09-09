import { currentMonthKey, shiftMonth, uid } from './format'
import type {
  AppData,
  BudgetItem,
  EntryMode,
  Expense,
  MonthBudget,
  NetWorthSnapshot,
} from './types'

type Spec = [name: string, budgeted: number, mode: EntryMode, autoDay?: number]

// Fixed, predictable outgoings are `auto` — they never need touching again.
// Variable-but-lumpy spend is `monthly` — one number off the statement.
// Only categories worth itemising are `detailed`.
// A short starter list beats a complete one: a wall of 20+ rows is the
// fastest way to lose interest. Fixed outgoings are `auto` so they never
// need touching; the rest are one number a month. Add your own as needed.
const NEEDS_SPEC: Spec[] = [
  ['Home — Rent / EMI', 45000, 'auto', 5],
  ['Groceries & Household', 18000, 'monthly'],
  ['Utilities & Phone', 6000, 'monthly'],
  ['Transport & Fuel', 9000, 'monthly'],
  ['Insurance & School Fees', 22000, 'auto', 6],
]

const WANTS_SPEC: Spec[] = [
  ['Eating Out', 12000, 'detailed'],
  ['Shopping', 18000, 'monthly'],
  ['Fun & Subscriptions', 15000, 'monthly'],
]

const SAVINGS_SPEC: Spec[] = [
  ['EPF (from salary)', 18000, 'auto', 1],
  ['SIP / Mutual Funds', 30000, 'auto', 10],
  ['Other Savings', 15000, 'monthly'],
]

export const DEFAULT_NEEDS = NEEDS_SPEC.map((s) => s[0])
export const DEFAULT_WANTS = WANTS_SPEC.map((s) => s[0])
export const DEFAULT_SAVINGS = SAVINGS_SPEC.map((s) => s[0])

function build(spec: Spec[]): BudgetItem[] {
  return spec.map(([name, budgeted, mode, autoDay]) => ({
    id: uid(),
    name,
    budgeted,
    mode,
    ...(mode === 'auto' ? { autoAmount: budgeted, autoDay } : {}),
  }))
}

export function defaultBudget(): MonthBudget {
  return {
    needs: build(NEEDS_SPEC),
    wants: build(WANTS_SPEC),
    savings: build(SAVINGS_SPEC),
  }
}

/**
 * Carry a budget into a new month: category names, modes and auto amounts come
 * along (ids too, so typed monthly totals stay attached), only the variable
 * numbers start fresh.
 */
export function carryForward(template: MonthBudget): MonthBudget {
  const copy = (items: BudgetItem[]) => items.map((i) => ({ ...i }))
  return { needs: copy(template.needs), wants: copy(template.wants), savings: copy(template.savings) }
}

export function defaultNetWorth(): NetWorthSnapshot {
  return {
    assets: [
      { id: uid(), name: 'Savings Bank', amount: 350000 },
      { id: uid(), name: 'Fixed Deposits', amount: 500000 },
      { id: uid(), name: 'EPF Balance', amount: 1450000 },
      { id: uid(), name: 'PPF Balance', amount: 620000 },
      { id: uid(), name: 'NPS Corpus', amount: 310000 },
      { id: uid(), name: 'Mutual Funds', amount: 1850000 },
      { id: uid(), name: 'Direct Stocks', amount: 420000 },
      { id: uid(), name: 'Gold/SGB', amount: 280000 },
      { id: uid(), name: 'Real Estate', amount: 6500000 },
      { id: uid(), name: 'Other', amount: 0 },
    ],
    liabilities: [
      { id: uid(), name: 'Home Loan', amount: 4200000 },
      { id: uid(), name: 'Car Loan', amount: 380000 },
      { id: uid(), name: 'Personal Loan', amount: 0 },
      { id: uid(), name: 'Credit Card', amount: 45000 },
      { id: uid(), name: 'Other Loans', amount: 0 },
    ],
  }
}

function agedSnapshot(base: NetWorthSnapshot, monthsBack: number): NetWorthSnapshot {
  return {
    assets: base.assets.map((a) => ({
      ...a,
      id: uid(),
      amount: Math.round(a.amount * (1 - 0.018 * monthsBack)),
    })),
    liabilities: base.liabilities.map((l) => ({
      ...l,
      id: uid(),
      amount: Math.round(l.amount * (1 + 0.006 * monthsBack)),
    })),
  }
}

/** Only `detailed` categories get seeded rows — everything else is automatic. */
function seedExpenses(month: string, jitter: number): Expense[] {
  const day = (d: number) => `${month}-${String(d).padStart(2, '0')}`
  const rows: Array<[number, string, Expense['paidBy'], number, string]> = [
    [4, 'Eating Out', 'person1', 1240, 'Swiggy order'],
    [8, 'Eating Out', 'person1', 1950, 'Dinner out'],
    [21, 'Eating Out', 'person2', 2450, 'Cafe with friends'],
    [11, 'Eating Out', 'person2', 2180, 'Weekend lunch out'],
    [17, 'Eating Out', 'joint', 1650 + jitter, 'Zomato'],
    [27, 'Eating Out', 'person1', 2330, 'Dinner — family'],
  ]
  return rows.map(([d, category, paidBy, amount, notes]) => ({
    id: uid(),
    date: day(d),
    category,
    paidBy,
    amount,
    notes,
  }))
}

/** Typed-once-a-month totals for the `monthly` categories. */
function seedMonthlyEntries(
  budget: MonthBudget,
  jitter: number,
  otherSavings: number,
): Record<string, number> {
  const values: Record<string, number> = {
    'Groceries & Household': 17300,
    'Utilities & Phone': 6100,
    'Transport & Fuel': 8600,
    Shopping: 16400,
    'Fun & Subscriptions': 14200,
    'Other Savings': otherSavings,
  }
  const out: Record<string, number> = {}
  for (const bucket of ['needs', 'wants', 'savings'] as const) {
    for (const item of budget[bucket]) {
      if (item.mode !== 'monthly') continue
      const base = values[item.name]
      if (base === undefined) continue
      out[item.id] = base === 0 ? 0 : Math.max(0, base + jitter)
    }
  }
  return out
}

export function seedData(): AppData {
  const thisMonth = currentMonthKey()
  const months = [shiftMonth(thisMonth, -2), shiftMonth(thisMonth, -1), thisMonth]
  const baseNetWorth = defaultNetWorth()
  const template = defaultBudget()

  const budgets: AppData['budgets'] = {}
  const monthlyEntries: AppData['monthlyEntries'] = {}
  let expenses: Expense[] = []
  const netWorth: AppData['netWorth'] = {}

  months.forEach((m, idx) => {
    const jitter = (idx - 1) * 700
    // Same ids across months so a category keeps its identity over time.
    const budget = carryForward(template)
    budgets[m] = budget
    monthlyEntries[m] = seedMonthlyEntries(budget, jitter, 15600)
    expenses = expenses.concat(seedExpenses(m, jitter))
    netWorth[m] = agedSnapshot(baseNetWorth, months.length - 1 - idx)
  })

  // Make the example add up: whatever income is not spent or auto-saved is
  // shown as landing in Other Savings, so the demo never reads as a household
  // haemorrhaging money it cannot account for.
  const salary = 120000 + 85000
  months.forEach((m) => {
    const budget = budgets[m]
    const entries = monthlyEntries[m]
    const extra = m === thisMonth ? 32000 : 0

    const spendOf = (items: BudgetItem[]) =>
      items.reduce((sum, i) => {
        if (i.mode === 'auto') return sum + (i.autoAmount ?? i.budgeted)
        if (i.mode === 'monthly') return sum + (entries[i.id] ?? 0)
        return (
          sum +
          expenses
            .filter((e) => e.date.startsWith(m) && e.category === i.name)
            .reduce((s2, e) => s2 + e.amount, 0)
        )
      }, 0)

    const other = budget.savings.find((i) => i.name === 'Other Savings')
    if (!other) return
    const spent = spendOf(budget.needs) + spendOf(budget.wants)
    const autoSaved = budget.savings
      .filter((i) => i.mode === 'auto')
      .reduce((sum, i) => sum + (i.autoAmount ?? i.budgeted), 0)
    entries[other.id] = Math.max(0, salary + extra - spent - autoSaved)
  })

  return {
    version: 2,
    isSeedData: true,
    income: {
      person1Name: 'Avinash',
      person1: 120000,
      person2Name: 'Amrita',
      person2: 85000,
    },
    otherIncome: {
      [thisMonth]: [{ id: uid(), label: 'Freelance — web build', amount: 32000, who: 'person1' }],
    },
    budgets,
    monthlyEntries,
    expenses,
    netWorth,
    closedMonths: [months[0], months[1]],
    emergencyFund: {
      targetMonths: 6,
      currentBalance: 620000,
      trackFromNetWorth: true,
      trackedAssets: ['Savings Bank', 'Fixed Deposits'],
    },
    allocation: {
      ppf: 20,
      nps: 8,
      mutualFunds: 40,
      stocks: 12,
      emergencyTopUp: 12,
      gold: 8,
    },
    goals: [
      { id: uid(), name: 'House Down Payment', targetAmount: 3000000, years: 5, expectedReturn: 10 },
      { id: uid(), name: "Child's Education", targetAmount: 5000000, years: 12, expectedReturn: 11 },
      { id: uid(), name: 'Retirement Corpus', targetAmount: 40000000, years: 22, expectedReturn: 12 },
      { id: uid(), name: 'Vacation Fund', targetAmount: 400000, years: 2, expectedReturn: 7 },
      { id: uid(), name: 'Car Purchase', targetAmount: 1200000, years: 4, expectedReturn: 8 },
    ],
  }
}

/**
 * A genuinely blank slate: no income, no transactions, no snapshots, no goals.
 * The category names survive as a starting skeleton with zero amounts — they
 * are a template, not example data, and rebuilding them by hand is tedious.
 */
export function emptyData(): AppData {
  const month = currentMonthKey()
  const blank = (items: BudgetItem[]) =>
    items.map((i) => ({ id: uid(), name: i.name, budgeted: 0, mode: 'monthly' as const }))
  const template = defaultBudget()

  return {
    version: 2,
    isSeedData: false,
    income: { person1Name: 'Avinash', person1: 0, person2Name: 'Amrita', person2: 0 },
    otherIncome: {},
    budgets: {
      [month]: {
        needs: blank(template.needs),
        wants: blank(template.wants),
        savings: blank(template.savings),
      },
    },
    monthlyEntries: {},
    expenses: [],
    netWorth: {},
    closedMonths: [],
    emergencyFund: {
      targetMonths: 6,
      currentBalance: 0,
      trackFromNetWorth: false,
      trackedAssets: [],
    },
    allocation: { ppf: 0, nps: 0, mutualFunds: 0, stocks: 0, emergencyTopUp: 0, gold: 0 },
    goals: [],
  }
}

/** Blank slate with the category list stripped out too. */
export function bareData(): AppData {
  const month = currentMonthKey()
  const base = emptyData()
  return { ...base, budgets: { [month]: { needs: [], wants: [], savings: [] } } }
}
