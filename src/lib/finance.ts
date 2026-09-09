import type { AppData, Bucket, InstrumentKey, NetWorthSnapshot } from './types'

export const TARGET_SPLIT: Record<Bucket, number> = {
  needs: 0.5,
  wants: 0.3,
  savings: 0.2,
}

export const BUCKET_LABEL: Record<Bucket, string> = {
  needs: 'Needs',
  wants: 'Wants',
  savings: 'Savings',
}

export const BUCKET_COLOR: Record<Bucket, string> = {
  needs: '#0284c7',
  wants: '#f59e0b',
  savings: '#10b981',
}

export function salaryIncome(data: AppData): number {
  return (data.income.person1 || 0) + (data.income.person2 || 0)
}

/** Extra earnings recorded for a specific month. */
export function otherIncomeTotal(data: AppData, month: string): number {
  return (data.otherIncome[month] ?? []).reduce((s, o) => s + (o.amount || 0), 0)
}

/** Salaries plus that month's freelance and other income. */
export function totalIncome(data: AppData, month: string): number {
  return salaryIncome(data) + otherIncomeTotal(data, month)
}

export function netWorthTotals(snap: NetWorthSnapshot) {
  const assets = snap.assets.reduce((s, a) => s + (a.amount || 0), 0)
  const liabilities = snap.liabilities.reduce((s, l) => s + (l.amount || 0), 0)
  return { assets, liabilities, net: assets - liabilities }
}

/**
 * Required monthly SIP for a future value.
 *   SIP = FV × r / (((1+r)^n − 1) × (1+r))
 * with r = monthly rate and n = months. Falls back to FV/n at 0% return.
 */
export function requiredSIP(fv: number, years: number, annualReturn: number): number {
  const n = Math.round(years * 12)
  if (!Number.isFinite(fv) || fv <= 0 || n <= 0) return 0
  const r = annualReturn / 100 / 12
  if (r === 0) return fv / n
  const denominator = (Math.pow(1 + r, n) - 1) * (1 + r)
  if (denominator === 0) return 0
  return (fv * r) / denominator
}

/** Savings budget category that each investment instrument writes into. */
export const INSTRUMENT_CATEGORY: Record<InstrumentKey, string> = {
  ppf: 'PPF',
  nps: 'NPS Voluntary',
  mutualFunds: 'Mutual Fund SIP/ELSS',
  stocks: 'Direct Stocks',
  emergencyTopUp: 'Emergency Fund Top-up',
  gold: 'Gold/SGB',
}

/**
 * Which net-worth asset line a month's savings contribution grows.
 * Used by the "roll forward + add contributions" action on Net Worth.
 */
export const CONTRIBUTION_TO_ASSET: Record<string, string> = {
  'EPF (auto)': 'EPF Balance',
  PPF: 'PPF Balance',
  'NPS Voluntary': 'NPS Corpus',
  'Mutual Fund SIP/ELSS': 'Mutual Funds',
  'Direct Stocks': 'Direct Stocks',
  'Gold/SGB': 'Gold/SGB',
  'Emergency Fund Top-up': 'Savings Bank',
}

export type BadgeTone = 'green' | 'amber' | 'red' | 'neutral'

export function savingsRateTone(pct: number): BadgeTone {
  if (!Number.isFinite(pct)) return 'neutral'
  if (pct >= 20) return 'green'
  if (pct >= 10) return 'amber'
  return 'red'
}

export function emergencyMonthsTone(months: number): BadgeTone {
  if (!Number.isFinite(months)) return 'neutral'
  if (months >= 6) return 'green'
  if (months >= 3) return 'amber'
  return 'red'
}

export function debtToIncomeTone(pct: number): BadgeTone {
  if (!Number.isFinite(pct)) return 'neutral'
  if (pct <= 35) return 'green'
  if (pct <= 50) return 'amber'
  return 'red'
}

/** Needs ratio: at or under the 50% target is healthy. */
export function needsRatioTone(pct: number): BadgeTone {
  if (!Number.isFinite(pct)) return 'neutral'
  if (pct <= 50) return 'green'
  if (pct <= 60) return 'amber'
  return 'red'
}

export function netWorthTone(net: number): BadgeTone {
  if (net > 0) return 'green'
  if (net === 0) return 'neutral'
  return 'red'
}
