import { useRef, useState } from 'react'
import { Button, Card, PageHeader } from '../components/ui'
import { STORAGE_KEY, clearData, downloadJSON } from '../lib/storage'
import { useStore } from '../lib/store'
import type { AppData } from '../lib/types'

export function Settings() {
  const { data, replace, reset } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [confirming, setConfirming] = useState(false)

  function onImport(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppData
        if (!parsed || typeof parsed !== 'object') throw new Error('not an object')
        replace(parsed)
        setMessage({ tone: 'ok', text: `Imported ${file.name}. Your previous data has been replaced.` })
      } catch {
        setMessage({ tone: 'error', text: `Could not read ${file.name} — it does not look like an export from this app.` })
      }
    }
    reader.onerror = () => setMessage({ tone: 'error', text: 'Could not read that file.' })
    reader.readAsText(file)
  }

  const counts = {
    months: Object.keys(data.budgets).length,
    expenses: data.expenses.length,
    snapshots: Object.keys(data.netWorth).length,
    goals: data.goals.length,
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & Data"
        description="Your data lives only in this browser. Export it to keep a backup or move it to another device."
      />

      <Card title="Your data" subtitle={`Stored under the localStorage key "${STORAGE_KEY}".`}>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ['Budget months', counts.months],
            ['Transactions', counts.expenses],
            ['Net worth snapshots', counts.snapshots],
            ['Goals', counts.goals],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-lg bg-slate-50 p-3">
              <dt className="text-sm text-slate-500">{label}</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card title="Backup and restore" subtitle="A plain JSON file — readable, portable, and yours.">
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => downloadJSON(data)}>
            Export data as JSON
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            Import data from JSON
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onImport(file)
              e.target.value = ''
            }}
          />
        </div>
        {message && (
          <p
            className={`mt-3 rounded-lg p-3 text-sm ${
              message.tone === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
            }`}
          >
            {message.text}
          </p>
        )}
        <p className="mt-3 text-xs text-slate-500">
          Importing replaces everything currently in this browser. Export first if you want to keep it.
        </p>
      </Card>

      <Card title="Reset" subtitle="Clears this browser's saved data and reloads the example data set.">
        {!confirming ? (
          <Button variant="danger" onClick={() => setConfirming(true)}>
            Reset all data
          </Button>
        ) : (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm font-medium text-rose-900">
              Reset everything? Your budgets, {counts.expenses} transactions, net worth snapshots and goals will be
              deleted from this browser and replaced with the example data. This cannot be undone.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="danger"
                onClick={() => {
                  clearData()
                  reset()
                  setConfirming(false)
                  setMessage({ tone: 'ok', text: 'All data reset. The example data set has been restored.' })
                }}
              >
                Yes, delete everything
              </Button>
              <Button variant="secondary" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
