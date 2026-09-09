import { useEffect, type ReactNode } from 'react'
import type { BadgeTone } from '../lib/finance'
import { formatINR } from '../lib/format'

export function Card({
  title,
  subtitle,
  children,
  right,
  className = '',
  padded = true,
}: {
  title?: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  right?: ReactNode
  className?: string
  padded?: boolean
}) {
  return (
    <section
      // min-w-0 keeps a card holding a wide table from stretching its grid column.
      className={`min-w-0 rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50 ${padded ? 'p-4 sm:p-5' : ''} ${className}`}
    >
      {(title || right) && (
        <header className={`flex flex-wrap items-start justify-between gap-3 ${padded ? 'mb-4' : 'p-4 sm:p-5'}`}>
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">{title}</h2>}
            {subtitle && <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{subtitle}</p>}
          </div>
          {right && <div className="flex shrink-0 flex-wrap items-center gap-2">{right}</div>}
        </header>
      )}
      {children}
    </section>
  )
}

const TONE_CLASS: Record<BadgeTone, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-rose-50 text-rose-700 ring-rose-200',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-200',
}

const TONE_ACCENT: Record<BadgeTone, string> = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-rose-500',
  neutral: 'bg-slate-300',
}

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  )
}

export function StatCard({
  label,
  value,
  tone,
  badge,
  hint,
  onClick,
}: {
  label: string
  value: ReactNode
  tone?: BadgeTone
  badge?: string
  hint?: ReactNode
  onClick?: () => void
}) {
  const interactive = onClick
    ? 'cursor-pointer text-left transition hover:border-slate-300 hover:shadow-md hover:shadow-slate-200/60'
    : 'text-left'
  return (
    <button
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      disabled={!onClick}
      className={`relative min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/50 disabled:cursor-default ${interactive}`}
    >
      {tone && <span className={`absolute inset-x-0 top-0 h-0.5 ${TONE_ACCENT[tone]}`} aria-hidden />}
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium text-slate-500">{label}</p>
        {tone && badge && <Badge tone={tone}>{badge}</Badge>}
      </div>
      <p className="mt-2 truncate text-2xl font-semibold tracking-tight tabular-nums text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{hint}</p>}
    </button>
  )
}

const inputBase =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50 disabled:text-slate-500'

export function TextField(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputBase} ${props.className ?? ''}`} />
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputBase} font-mono text-xs leading-relaxed ${props.className ?? ''}`} />
}

/** Number input that reports a clean number and selects on focus. */
export function MoneyInput({
  value,
  onChange,
  className = '',
  suffix,
  placeholder,
  ...rest
}: {
  value: number | null
  onChange: (n: number) => void
  className?: string
  suffix?: string
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <div className="relative">
      <input
        {...rest}
        type="number"
        inputMode="numeric"
        placeholder={placeholder}
        value={value === null || !Number.isFinite(value) ? '' : String(value)}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        onFocus={(e) => e.target.select()}
        className={`${inputBase} text-right tabular-nums ${suffix ? 'pr-8' : ''} ${className}`}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
          {suffix}
        </span>
      )}
    </div>
  )
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputBase} ${props.className ?? ''}`} />
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  ...props
}: {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle'
  size?: 'sm' | 'md'
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = {
    primary: 'bg-sky-600 text-white hover:bg-sky-700 border-transparent shadow-sm',
    secondary: 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300 shadow-sm',
    subtle: 'bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-100',
    ghost: 'bg-transparent text-slate-400 hover:bg-slate-100 hover:text-slate-700 border-transparent',
    danger: 'bg-white text-rose-600 hover:bg-rose-50 border-rose-200 shadow-sm',
  }[variant]
  const sizing = size === 'sm' ? 'px-2.5 py-1.5 text-[13px]' : 'px-3 py-2 text-sm'
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${sizing} ${className}`}
    />
  )
}

/** Small pill switcher — used for entry modes and view toggles. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
  full = false,
}: {
  value: T
  options: Array<{ value: T; label: string; title?: string }>
  onChange: (v: T) => void
  size?: 'sm' | 'md'
  /** Full width with equal, thumb-sized segments — for mobile cards. */
  full?: boolean
}) {
  const segment = full
    ? 'flex-1 py-2 text-[12px]'
    : size === 'sm'
      ? 'px-2 py-1 text-[11px]'
      : 'px-3 py-1.5 text-[13px]'
  return (
    <div className={`${full ? 'flex w-full' : 'inline-flex'} rounded-lg bg-slate-100 p-0.5`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`rounded-md font-medium transition ${segment} ${
            value === o.value
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2.5 text-sm text-slate-700"
    >
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? 'bg-sky-600' : 'bg-slate-300'}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? 'left-[1.125rem]' : 'left-0.5'}`}
        />
      </span>
      {label}
    </button>
  )
}

export function ProgressBar({
  pct,
  tone = 'sky',
  height = 'h-3',
}: {
  pct: number
  tone?: 'sky' | 'emerald' | 'amber' | 'rose'
  height?: string
}) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0))
  const bar = { sky: 'bg-sky-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500', rose: 'bg-rose-500' }[tone]
  return (
    <div className={`w-full overflow-hidden rounded-full bg-slate-100 ${height}`}>
      <div className={`h-full rounded-full transition-all duration-500 ${bar}`} style={{ width: `${clamped}%` }} />
    </div>
  )
}

/** Signed rupee value: negatives red and parenthesised, positives green. */
export function Delta({ value, goodWhenPositive = true }: { value: number; goodWhenPositive?: boolean }) {
  const cls =
    value === 0
      ? 'text-slate-400'
      : (value > 0) === goodWhenPositive
        ? 'text-emerald-600'
        : 'text-rose-600'
  return <span className={`tabular-nums font-medium ${cls}`}>{formatINR(value)}</span>
}

export function PageHeader({
  title,
  description,
  right,
}: {
  title: string
  description?: ReactNode
  right?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-[26px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">{description}</p>}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl ${wide ? 'sm:max-w-4xl' : 'sm:max-w-lg'}`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-1 text-[13px] text-slate-500">{subtitle}</p>}
          </div>
          <Button variant="ghost" onClick={onClose} aria-label="Close">
            ✕
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null
  return (
    // Sits above the mobile tab bar, and drops to the corner on desktop.
    <div className="pointer-events-none fixed bottom-[4.75rem] left-1/2 z-50 w-max max-w-[92vw] -translate-x-1/2 px-2 lg:bottom-5">
      <div className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-[13px] font-medium text-white shadow-lg">
        <span className="text-emerald-400" aria-hidden>
          ✓
        </span>
        {message}
      </div>
    </div>
  )
}

/** Highlighted call-to-action row used for cross-page automations. */
export function ActionNote({
  tone = 'sky',
  children,
  action,
}: {
  tone?: 'sky' | 'amber' | 'rose' | 'emerald'
  children: ReactNode
  action?: ReactNode
}) {
  const styles = {
    sky: 'border-sky-200 bg-sky-50 text-sky-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    rose: 'border-rose-200 bg-rose-50 text-rose-900',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  }[tone]
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${styles}`}>
      <div className="min-w-0 flex-1 leading-relaxed">{children}</div>
      {action}
    </div>
  )
}

export function TableWrap({ children, minWidth = '36rem' }: { children: ReactNode; minWidth?: string }) {
  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0">
      <div style={{ minWidth }}>{children}</div>
    </div>
  )
}
