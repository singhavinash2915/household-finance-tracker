// ---------------------------------------------------------------------------
// One TypeScript data model for the whole app, persisted as a single JSON blob
// in localStorage (see storage.ts).
// ---------------------------------------------------------------------------

export type Bucket = 'needs' | 'wants' | 'savings'

export type Payer = 'person1' | 'person2' | 'joint'

/**
 * How a category's Actual gets filled in. Daily logging of everything is
 * unrealistic, so each category picks the cheapest method that fits it:
 *  - auto      fixed amount that counts itself every month (EMI, SIP, fees)
 *  - monthly   one total typed once a month off a statement (groceries, fuel)
 *  - detailed  itemised rows in the Expense Log (paste-imported or typed)
 * Actual = auto + monthly entry + logged rows, so no source is ever dropped.
 */
export type EntryMode = 'auto' | 'monthly' | 'detailed'

export interface BudgetItem {
  id: string
  name: string
  budgeted: number
  mode: EntryMode
  /** For `auto`: the amount that posts each month. Falls back to `budgeted`. */
  autoAmount?: number
  /** For `auto`: day of month it typically hits — display only. */
  autoDay?: number
}

/** Budget for a single month, keyed in state by "YYYY-MM". */
export interface MonthBudget {
  needs: BudgetItem[]
  wants: BudgetItem[]
  savings: BudgetItem[]
}

export interface Expense {
  id: string
  date: string // YYYY-MM-DD
  category: string // matches a BudgetItem.name
  paidBy: Payer
  amount: number
  notes: string
}

export interface NetWorthLine {
  id: string
  name: string
  amount: number
}

/** One net-worth snapshot, keyed in state by "YYYY-MM". */
export interface NetWorthSnapshot {
  assets: NetWorthLine[]
  liabilities: NetWorthLine[]
}

export interface Income {
  person1Name: string
  person1: number
  person2Name: string
  person2: number
}

/**
 * Income beyond the two salaries — freelance, consulting, rent, bonuses.
 * Stored per month because it genuinely varies month to month, unlike a salary.
 */
export interface OtherIncome {
  id: string
  label: string
  amount: number
  who: Payer
}

export interface EmergencyFund {
  targetMonths: number
  currentBalance: number
  /** When true, the balance is read from the month's net-worth asset lines. */
  trackFromNetWorth: boolean
  /** Names of asset lines that make up the fund when tracking is on. */
  trackedAssets: string[]
}

/** Percentage allocation of the monthly investible surplus. Should total 100. */
export interface InvestmentAllocation {
  ppf: number
  nps: number
  mutualFunds: number
  stocks: number
  emergencyTopUp: number
  gold: number
}

export type InstrumentKey = keyof InvestmentAllocation

export interface Goal {
  id: string
  name: string
  targetAmount: number
  years: number
  expectedReturn: number // annual %
}

/** Per-month, per-category totals typed by hand: monthlyEntries[month][itemId]. */
export type MonthlyEntries = Record<string, Record<string, number>>

export interface AppData {
  version: number
  /** True until the user edits anything — drives the "example data" banner. */
  isSeedData: boolean
  income: Income
  /** otherIncome["YYYY-MM"] — freelance and one-off earnings for that month. */
  otherIncome: Record<string, OtherIncome[]>
  budgets: Record<string, MonthBudget>
  monthlyEntries: MonthlyEntries
  expenses: Expense[]
  netWorth: Record<string, NetWorthSnapshot>
  /** Months the user has explicitly closed off — drives the month checklist. */
  closedMonths: string[]
  emergencyFund: EmergencyFund
  allocation: InvestmentAllocation
  goals: Goal[]
}
