const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

/** ₹1,50,000 — Indian numbering system, negatives in parentheses. */
export function formatINR(value: number): string {
  const safe = Number.isFinite(value) ? value : 0
  const text = inr.format(Math.abs(Math.round(safe)))
  return safe < 0 ? `(${text})` : text
}

/** Tailwind text colour for a signed amount: red when negative. */
export function amountClass(value: number, invert = false): string {
  const positive = invert ? value <= 0 : value >= 0
  if (value === 0) return 'text-slate-600'
  return positive ? 'text-emerald-600' : 'text-rose-600'
}

export function formatPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '—'
  return `${value.toFixed(digits)}%`
}

/** "2026-09" -> "September 2026" */
export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  if (!y || !m) return key
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })
}

export function currentMonthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return currentMonthKey(d)
}

/** Sorted list of month keys, newest first. */
export function sortMonths(keys: string[]): string[] {
  return [...keys].sort()
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

/** ₹1.85 Cr / ₹12.4 L / ₹45,000 — for chart axes and tight spaces. */
export function compactINR(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 10000000) return `${sign}\u20b9${(abs / 10000000).toFixed(2)} Cr`
  if (abs >= 100000) return `${sign}\u20b9${(abs / 100000).toFixed(1)} L`
  if (abs >= 1000) return `${sign}\u20b9${Math.round(abs / 1000)}k`
  return `${sign}\u20b9${Math.round(abs)}`
}

/** "September 2026" -> "Sep 2026" */
export function shortMonthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  if (!y || !m) return key
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 1 -> "1st", 2 -> "2nd", 13 -> "13th", 22 -> "22nd". */
export function ordinal(n: number): string {
  if (!Number.isFinite(n)) return ''
  const v = Math.abs(Math.round(n))
  const mod100 = v % 100
  if (mod100 >= 11 && mod100 <= 13) return `${v}th`
  return `${v}${['th', 'st', 'nd', 'rd'][v % 10] ?? 'th'}`
}

/** "7.2 months" / "—" when there is nothing to divide by. */
export function formatMonths(months: number): string {
  return Number.isFinite(months) ? `${months.toFixed(1)} months` : '—'
}
