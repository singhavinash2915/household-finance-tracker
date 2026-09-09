import { monthLabel, shiftMonth, currentMonthKey } from '../lib/format'

/** Global month control that lives in the header — every page follows it. */
export function MonthPicker({
  month,
  onChange,
  compact = false,
}: {
  month: string
  onChange: (m: string) => void
  compact?: boolean
}) {
  const isCurrent = month === currentMonthKey()
  return (
    <div className="flex items-center gap-1 rounded-xl border border-slate-300 bg-white p-0.5 shadow-sm">
      <button
        type="button"
        aria-label="Previous month"
        onClick={() => onChange(shiftMonth(month, -1))}
        className="rounded-lg px-2.5 py-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
      >
        ‹
      </button>
      <label className="relative cursor-pointer">
        <span className="px-1 text-[13px] font-semibold tabular-nums text-slate-900 sm:text-sm">
          {compact ? monthLabel(month).replace(' 20', " '") : monthLabel(month)}
        </span>
        <input
          type="month"
          value={month}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          aria-label="Select month"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
      <button
        type="button"
        aria-label="Next month"
        onClick={() => onChange(shiftMonth(month, 1))}
        className="rounded-lg px-2.5 py-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
      >
        ›
      </button>
      {!isCurrent && (
        <button
          type="button"
          onClick={() => onChange(currentMonthKey())}
          className="mr-0.5 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-200"
        >
          Today
        </button>
      )}
    </div>
  )
}
