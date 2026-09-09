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
const NEEDS_SPEC: Spec[] = [
  ['Rent/Home Loan EMI', 45000, 'auto', 5],
  ['Groceries & Household', 18000, 'monthly'],
  ['Electricity/Gas/Wifi/Phone', 6000, 'monthly'],
  ['Transport & Fuel', 9000, 'monthly'],
  ['Insurance Premiums', 7000, 'auto', 7],
  ['School Fees/Child Care', 15000, 'auto', 6],
  ['Domestic Help', 5000, 'auto', 1],
  ['Other EMIs', 12000, 'auto', 14],
]

const WANTS_SPEC: Spec[] = [
  ['Dining Out & Food Delivery', 9000, 'detailed'],
  ['Shopping', 12000, 'detailed'],
  ['Entertainment & OTT', 1500, 'monthly'],
  ['Travel & Vacations', 10000, 'monthly'],
  ['Subscriptions', 2000, 'auto', 18],
  ['Personal Care', 4000, 'monthly'],
  ['Gifts & Social', 5000, 'monthly'],
]

const SAVINGS_SPEC: Spec[] = [
  ['EPF (auto)', 21600, 'auto', 1],
  ['PPF', 12500, 'auto', 10],
  ['NPS Voluntary', 5000, 'auto', 19],
  ['Mutual Fund SIP/ELSS', 25000, 'auto', 10],
  ['Direct Stocks', 8000, 'monthly'],
  ['Emergency Fund Top-up', 5000, 'auto', 28],
  ['Gold/SGB', 5000, 'auto', 25],
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
    [4, 'Dining Out & Food Delivery', 'person1', 1240, 'Swiggy order'],
    [8, 'Shopping', 'person2', 3499 + jitter, 'Myntra — clothing'],
    [11, 'Dining Out & Food Delivery', 'person2', 2180, 'Weekend lunch out'],
    [13, 'Shopping', 'person1', 5290, 'Amazon — home items'],
    [17, 'Dining Out & Food Delivery', 'joint', 1650 + jitter, 'Zomato'],
    [21, 'Shopping', 'person2', 2450, 'Reliance Trends'],
    [23, 'Dining Out & Food Delivery', 'person1', 890, 'Coffee and snacks'],
    [27, 'Dining Out & Food Delivery', 'joint', 3120, 'Dinner — family'],
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
function seedMonthlyEntries(budget: MonthBudget, jitter: number): Record<string, number> {
  const values: Record<string, number> = {
    'Groceries & Household': 17300,
    'Electricity/Gas/Wifi/Phone': 6100,
    'Transport & Fuel': 8600,
    'Entertainment & OTT': 1500,
    'Travel & Vacations': 0,
    'Personal Care': 3200,
    'Gifts & Social': 4600,
    'Direct Stocks': 8000,
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
    monthlyEntries[m] = seedMonthlyEntries(budget, jitter)
    expenses = expenses.concat(seedExpenses(m, jitter))
    netWorth[m] = agedSnapshot(baseNetWorth, months.length - 1 - idx)
  })

  return {
    version: 2,
    isSeedData: true,
    income: {
      person1Name: 'Avinash',
      person1: 145000,
      person2Name: 'Amrita',
      person2: 110000,
    },
    otherIncome: {
      [months[1]]: [
        { id: uid(), label: 'Freelance project', amount: 45000, who: 'person1' },
      ],
      [thisMonth]: [
        { id: uid(), label: 'Freelance — web build', amount: 32000, who: 'person1' },
      ],
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
