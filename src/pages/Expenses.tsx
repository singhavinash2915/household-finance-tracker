import { useMemo, useState } from 'react'
import type { PageId } from '../App'
import {
  ActionNote,
  Badge,
  Button,
  Card,
  Modal,
  MoneyInput,
  PageHeader,
  Select,
  TableWrap,
  TextArea,
  TextField,
} from '../components/ui'
import { BUCKET_LABEL } from '../lib/finance'
import { formatINR, monthLabel, todayISO, uid } from '../lib/format'
import { parseStatement, type ParsedRow } from '../lib/importer'
import { BUCKETS, allCategoryNames, budgetFor, categoryOptions, findItemByName } from '../lib/selectors'
import { useStore } from '../lib/store'
import type { Expense, Payer } from '../lib/types'

const PAYERS: Payer[] = ['person1', 'person2', 'joint']

export function Expenses({ goTo }: { goTo: (p: PageId) => void }) {
  const { data, update, month, notify } = useStore()
  const budget = budgetFor(data, month)
  const groups = categoryOptions(budget)
  const categories = allCategoryNames(budget)

  const payerLabel = (p: Payer) =>
    p === 'person1' ? data.income.person1Name : p === 'person2' ? data.income.person2Name : 'Joint'

  // --- filters ---
  const [category, setCategory] = useState('')
  const [payer, setPayer] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const [monthOnly, setMonthOnly] = useState(true)

  // --- quick add ---
  const [qDate, setQDate] = useState(todayISO)
  const [qCategory, setQCategory] = useState(
    () => budget.wants.find((i) => i.mode === 'detailed')?.name ?? categories[0] ?? '',
  )
  const [qPayer, setQPayer] = useState<Payer>('joint')
  const [qAmount, setQAmount] = useState(0)
  const [qNotes, setQNotes] = useState('')

  // --- importer ---
  const [importOpen, setImportOpen] = useState(false)
  const [pasted, setPasted] = useState('')
  const [rows, setRows] = useState<ParsedRow[] | null>(null)
  const [importPayer, setImportPayer] = useState<Payer>('joint')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.expenses
      .filter((e) => (monthOnly ? e.date.startsWith(month) : true))
      .filter((e) => (category ? e.category === category : true))
      .filter((e) => (payer ? e.paidBy === payer : true))
      .filter((e) => (from ? e.date >= from : true))
      .filter((e) => (to ? e.date <= to : true))
      .filter((e) => (q ? `${e.category} ${e.notes}`.toLowerCase().includes(q) : true))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  }, [data.expenses, category, payer, from, to, search, monthOnly, month])

  const filteredTotal = filtered.reduce((s, e) => s + (e.amount || 0), 0)

  function patch(id: string, changes: Partial<Expense>) {
    update((d) => ({ ...d, expenses: d.expenses.map((e) => (e.id === id ? { ...e, ...changes } : e)) }))
  }

  function removeRow(id: string) {
    update((d) => ({ ...d, expenses: d.expenses.filter((e) => e.id !== id) }))
  }

  /**
   * Logged rows only reach the Budget when their category reads the log, so
   * anything we log gets switched to `detailed` automatically. The month's
   * typed total is dropped at the same time — once itemised rows are the
   * source, keeping both would count the same spending twice.
   */
  function ensureDetailed(names: string[]): string[] {
    const budgetNow = budgetFor(data, month)
    const switched = BUCKETS.flatMap((b) => budgetNow[b])
      .filter((i) => names.includes(i.name) && i.mode !== 'detailed')
      .map((i) => i.name)
    const clearedTotals = BUCKETS.flatMap((b) => budgetNow[b])
      .filter((i) => names.includes(i.name) && (data.monthlyEntries[month]?.[i.id] ?? 0) > 0)
      .map((i) => i.name)

    update((d) => {
      const b = budgetFor(d, month)
      const ids: string[] = []
      const fix = (items: typeof b.needs) =>
        items.map((i) => {
          if (!names.includes(i.name) || i.mode === 'detailed') return i
          ids.push(i.id)
          return { ...i, mode: 'detailed' as const }
        })
      const next = { needs: fix(b.needs), wants: fix(b.wants), savings: fix(b.savings) }
      const entries = { ...(d.monthlyEntries[month] ?? {}) }
      ids.forEach((id) => delete entries[id])
      return {
        ...d,
        budgets: { ...d.budgets, [month]: next },
        monthlyEntries: { ...d.monthlyEntries, [month]: entries },
      }
    })
    return switched.length ? clearedTotals : []
  }

  function addQuick() {
    if (!qAmount || !qCategory) return
    const row: Expense = {
      id: uid(),
      date: qDate,
      category: qCategory,
      paidBy: qPayer,
      amount: qAmount,
      notes: qNotes,
    }
    update((d) => ({ ...d, expenses: [row, ...d.expenses] }))
    const cleared = ensureDetailed([qCategory])
    setQAmount(0)
    setQNotes('')
    notify(
      cleared.length
        ? `Added ${formatINR(row.amount)} — ${row.category} now itemised, its monthly total was cleared`
        : `Added ${formatINR(row.amount)} to ${row.category}`,
    )
  }

  function runParse() {
    const parsed = parseStatement(pasted, categories, importPayer)
    setRows(parsed)
    if (parsed.length === 0) notify('No transactions recognised in that text')
  }

  function commitImport() {
    const keep = (rows ?? []).filter((r) => r.include && r.category && r.amount > 0)
    if (keep.length === 0) return
    const added: Expense[] = keep.map((r) => ({
      id: uid(),
      date: r.date,
      category: r.category,
      paidBy: r.paidBy,
      amount: r.amount,
      notes: r.description,
    }))
    update((d) => ({ ...d, expenses: [...added, ...d.expenses] }))
    const cleared = ensureDetailed([...new Set(keep.map((r) => r.category))])
    setImportOpen(false)
    resetPaste()
    notify(
      cleared.length
        ? `Imported ${added.length} rows · monthly totals cleared for ${cleared.join(', ')}`
        : `Imported ${added.length} transaction${added.length === 1 ? '' : 's'}`,
    )
  }

  function resetPaste() {
    setPasted('')
    setRows(null)
  }

  const includedCount = (rows ?? []).filter((r) => r.include && r.category).length
  const includedTotal = (rows ?? [])
    .filter((r) => r.include && r.category)
    .reduce((s, r) => s + r.amount, 0)

  const detailedCategories = groups.flatMap((g) => g.items).filter((i) => i.mode === 'detailed')

  return (
    <div className="space-y-5">
      <PageHeader
        title="Expense Log"
        description="Only for spending you actually want itemised. Everything else is handled by Auto and Monthly categories on the Budget page — so this stays short."
        right={
          <Button variant="primary" onClick={() => setImportOpen(true)}>
            Paste a statement
          </Button>
        }
      />

      <Card title="Quick add" subtitle="One line, then Enter. The category switches to Detailed automatically.">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[9.5rem_1fr_9rem_8rem_1fr_auto]">
          <TextField type="date" value={qDate} onChange={(e) => setQDate(e.target.value)} aria-label="Date" />
          <Select value={qCategory} onChange={(e) => setQCategory(e.target.value)} aria-label="Category">
            {groups.map((g) => (
              <optgroup key={g.bucket} label={BUCKET_LABEL[g.bucket]}>
                {g.items.map((i) => (
                  <option key={i.id} value={i.name}>
                    {i.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
          <Select
            value={qPayer}
            onChange={(e) => setQPayer(e.target.value as Payer)}
            aria-label="Paid by"
          >
            {PAYERS.map((p) => (
              <option key={p} value={p}>
                {payerLabel(p)}
              </option>
            ))}
          </Select>
          <MoneyInput value={qAmount || null} placeholder="Amount" onChange={setQAmount} aria-label="Amount" />
          <TextField
            value={qNotes}
            placeholder="Note (optional)"
            onChange={(e) => setQNotes(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addQuick()}
            aria-label="Notes"
          />
          <Button variant="primary" onClick={addQuick} disabled={!qAmount || !qCategory}>
            Add
          </Button>
        </div>
      </Card>

      {detailedCategories.length === 0 && (
        <ActionNote
          tone="amber"
          action={
            <Button variant="secondary" size="sm" onClick={() => goTo('month')}>
              Open Budget
            </Button>
          }
        >
          No category is set to <span className="font-medium">Detailed</span> right now, so logged rows would not reach
          your budget totals. Adding a row here switches its category over for you.
        </ActionNote>
      )}

      <Card
        title="Transactions"
        subtitle={`${filtered.length} row${filtered.length === 1 ? '' : 's'} · ${formatINR(filteredTotal)}`}
        right={
          <>
            <Button
              variant={monthOnly ? 'subtle' : 'secondary'}
              size="sm"
              onClick={() => setMonthOnly((v) => !v)}
            >
              {monthOnly ? monthLabel(month) : 'All months'}
            </Button>
            {(category || payer || from || to || search) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCategory('')
                  setPayer('')
                  setFrom('')
                  setTo('')
                  setSearch('')
                }}
              >
                Clear filters
              </Button>
            )}
          </>
        }
      >
        <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
            <option value="">All categories</option>
            {groups.map((g) => (
              <optgroup key={g.bucket} label={BUCKET_LABEL[g.bucket]}>
                {g.items.map((i) => (
                  <option key={i.id} value={i.name}>
                    {i.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
          <Select value={payer} onChange={(e) => setPayer(e.target.value)} aria-label="Filter by payer">
            <option value="">Anyone</option>
            {PAYERS.map((p) => (
              <option key={p} value={p}>
                {payerLabel(p)}
              </option>
            ))}
          </Select>
          <TextField type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
          <TextField type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
          <TextField
            value={search}
            placeholder="Search notes…"
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search notes"
          />
        </div>

        {/* Card per transaction on phones — five columns never fit. */}
        <ul className="space-y-2.5 sm:hidden">
          {filtered.map((e) => {
            const item = findItemByName(budget, e.category)
            const ignored = item && item.mode !== 'detailed'
            return (
              <li key={e.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center gap-2">
                  <TextField
                    type="date"
                    value={e.date}
                    onChange={(ev) => patch(e.id, { date: ev.target.value })}
                    className="flex-1"
                    aria-label="Date"
                  />
                  <MoneyInput
                    value={e.amount}
                    onChange={(n) => patch(e.id, { amount: n })}
                    className="w-28"
                    aria-label="Amount"
                  />
                  <Button variant="ghost" aria-label="Delete transaction" onClick={() => removeRow(e.id)}>
                    ✕
                  </Button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Select
                    value={e.category}
                    onChange={(ev) => patch(e.id, { category: ev.target.value })}
                    aria-label="Category"
                  >
                    {!categories.includes(e.category) && (
                      <option value={e.category}>{e.category || 'Uncategorised'}</option>
                    )}
                    {groups.map((g) => (
                      <optgroup key={g.bucket} label={BUCKET_LABEL[g.bucket]}>
                        {g.items.map((i) => (
                          <option key={i.id} value={i.name}>
                            {i.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </Select>
                  <Select
                    value={e.paidBy}
                    onChange={(ev) => patch(e.id, { paidBy: ev.target.value as Payer })}
                    aria-label="Paid by"
                  >
                    {PAYERS.map((p) => (
                      <option key={p} value={p}>
                        {payerLabel(p)}
                      </option>
                    ))}
                  </Select>
                </div>
                <TextField
                  value={e.notes}
                  placeholder="Optional note"
                  onChange={(ev) => patch(e.id, { notes: ev.target.value })}
                  className="mt-2"
                  aria-label="Notes"
                />
                {ignored && (
                  <p className="mt-1.5 text-[11px] text-amber-600">
                    Counted via the {item?.mode} entry, not this row
                  </p>
                )}
              </li>
            )
          })}
          {filtered.length === 0 && (
            <li className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-[13px] text-slate-500">
              Nothing here{monthOnly ? ` for ${monthLabel(month)}` : ''}. Paste a statement or use Quick add.
            </li>
          )}
        </ul>

        <div className="hidden sm:block">
        <TableWrap minWidth="52rem">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-2 py-2 font-semibold">Date</th>
                <th className="px-2 py-2 font-semibold">Category</th>
                <th className="px-2 py-2 font-semibold">Paid by</th>
                <th className="px-2 py-2 text-right font-semibold">Amount</th>
                <th className="px-2 py-2 font-semibold">Notes</th>
                <th className="w-8 px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((e) => {
                const item = findItemByName(budget, e.category)
                const ignored = item && item.mode !== 'detailed'
                return (
                  <tr key={e.id} className="hover:bg-slate-50/60">
                    <td className="px-2 py-2">
                      <TextField
                        type="date"
                        value={e.date}
                        onChange={(ev) => patch(e.id, { date: ev.target.value })}
                        className="w-36"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Select
                        value={e.category}
                        onChange={(ev) => patch(e.id, { category: ev.target.value })}
                        className="min-w-[12rem]"
                      >
                        {/* Keep an unknown category selectable so renaming never loses data. */}
                        {!categories.includes(e.category) && (
                          <option value={e.category}>{e.category || 'Uncategorised'}</option>
                        )}
                        {groups.map((g) => (
                          <optgroup key={g.bucket} label={BUCKET_LABEL[g.bucket]}>
                            {g.items.map((i) => (
                              <option key={i.id} value={i.name}>
                                {i.name}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </Select>
                      {ignored && (
                        <p className="mt-1 px-1 text-[11px] text-amber-600">
                          Counted via the {item?.mode} entry, not this row
                        </p>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <Select
                        value={e.paidBy}
                        onChange={(ev) => patch(e.id, { paidBy: ev.target.value as Payer })}
                        className="w-28"
                      >
                        {PAYERS.map((p) => (
                          <option key={p} value={p}>
                            {payerLabel(p)}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-2 py-2">
                      <MoneyInput value={e.amount} onChange={(n) => patch(e.id, { amount: n })} className="w-28" />
                    </td>
                    <td className="px-2 py-2">
                      <TextField
                        value={e.notes}
                        placeholder="Optional note"
                        onChange={(ev) => patch(e.id, { notes: ev.target.value })}
                      />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <Button variant="ghost" size="sm" aria-label="Delete transaction" onClick={() => removeRow(e.id)}>
                        ✕
                      </Button>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-2 py-10 text-center text-sm text-slate-500">
                    Nothing here{monthOnly ? ` for ${monthLabel(month)}` : ''}. Paste a statement or use Quick add —
                    or leave it empty and let Auto and Monthly categories do the work.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableWrap>
        </div>
      </Card>

      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        wide
        title="Paste a bank or card statement"
        subtitle="Copy rows straight out of your statement, netbanking export or a CSV. Dates, amounts and merchants are worked out for you."
        footer={
          rows ? (
            <>
              <Button variant="ghost" onClick={resetPaste}>
                Back to paste
              </Button>
              <Button variant="primary" onClick={commitImport} disabled={includedCount === 0}>
                Import {includedCount} row{includedCount === 1 ? '' : 's'} · {formatINR(includedTotal)}
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setImportOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={runParse} disabled={!pasted.trim()}>
                Read transactions
              </Button>
            </>
          )
        }
      >
        {!rows ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-[13px] font-medium text-slate-600">Default payer</label>
              <Select
                value={importPayer}
                onChange={(e) => setImportPayer(e.target.value as Payer)}
                className="w-40"
              >
                {PAYERS.map((p) => (
                  <option key={p} value={p}>
                    {payerLabel(p)}
                  </option>
                ))}
              </Select>
            </div>
            <TextArea
              rows={12}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder={`05/09/2026,SWIGGY BANGALORE,1240.00,84500.00\n08-09-2026\tMYNTRA DESIGNS\t3499.00\n11 Sep 2026  UPI/P2M/ZOMATO  2180.00  Dr`}
            />
            <p className="text-[12px] leading-relaxed text-slate-500">
              Comma, tab or wide-space separated all work. Credits like salary are detected and left out by default,
              and each row's category is a guess you can correct before importing.
            </p>
          </div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Nothing recognisable in that text. Each row needs at least a date and an amount.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="px-2 py-2 font-semibold">Use</th>
                  <th className="px-2 py-2 font-semibold">Date</th>
                  <th className="px-2 py-2 font-semibold">Description</th>
                  <th className="px-2 py-2 text-right font-semibold">Amount</th>
                  <th className="px-2 py-2 font-semibold">Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, idx) => (
                  <tr key={r.key} className={r.include ? '' : 'opacity-50'}>
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={r.include}
                        onChange={(e) =>
                          setRows((prev) =>
                            (prev ?? []).map((x, i) => (i === idx ? { ...x, include: e.target.checked } : x)),
                          )
                        }
                        className="h-4 w-4 rounded border-slate-300 accent-sky-600"
                        aria-label={`Include ${r.description}`}
                      />
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 tabular-nums text-slate-600">{r.date}</td>
                    <td className="max-w-[16rem] truncate px-2 py-2 text-slate-700" title={r.raw}>
                      {r.description}
                      {r.isCredit && (
                        <span className="ml-2">
                          <Badge tone="green">credit</Badge>
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums font-medium text-slate-900">
                      {formatINR(r.amount)}
                    </td>
                    <td className="px-2 py-2">
                      <Select
                        value={r.category}
                        onChange={(e) =>
                          setRows((prev) =>
                            (prev ?? []).map((x, i) =>
                              i === idx ? { ...x, category: e.target.value, include: Boolean(e.target.value) } : x,
                            ),
                          )
                        }
                        className="min-w-[12rem]"
                      >
                        <option value="">— skip —</option>
                        {groups.map((g) => (
                          <optgroup key={g.bucket} label={BUCKET_LABEL[g.bucket]}>
                            {g.items.map((i) => (
                              <option key={i.id} value={i.name}>
                                {i.name}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  )
}
