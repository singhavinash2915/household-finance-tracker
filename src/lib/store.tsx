import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { loadData, normalise, saveData } from './storage'
import { bareData, emptyData, seedData } from './seed'
import { currentMonthKey } from './format'
import type { AppData } from './types'

type Updater = (draft: AppData) => AppData

interface StoreValue {
  data: AppData
  /** Any edit clears the "example data" flag. */
  update: (fn: Updater) => void
  replace: (next: AppData) => void
  /** Wipe to a blank slate. `keepCategories` retains the category skeleton. */
  startFresh: (keepCategories: boolean) => void
  /** Put the example household back, for exploring the app. */
  loadExample: () => void
  saving: boolean
  storageBlocked: boolean
  /** The month every page is looking at. Owned here so pages stay in sync. */
  month: string
  setMonth: (m: string) => void
  toast: string | null
  notify: (message: string) => void
}

const StoreContext = createContext<StoreValue | null>(null)

const SAVE_DEBOUNCE_MS = 400

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData())
  const [month, setMonth] = useState<string>(currentMonthKey)
  const [saving, setSaving] = useState(false)
  const [storageBlocked, setStorageBlocked] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const toastTimer = useRef<number | undefined>(undefined)
  const first = useRef(true)

  // Debounced auto-save: every edit schedules one write, bursts collapse to one.
  useEffect(() => {
    if (first.current) {
      first.current = false
      setStorageBlocked(!saveData(data))
      return
    }
    setSaving(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setStorageBlocked(!saveData(data))
      setSaving(false)
    }, SAVE_DEBOUNCE_MS)
    return () => window.clearTimeout(timer.current)
  }, [data])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const update = useCallback((fn: Updater) => {
    setData((prev) => ({ ...fn(prev), isSeedData: false }))
  }, [])

  const replace = useCallback((next: AppData) => setData(normalise(next)), [])
  const startFresh = useCallback((keepCategories: boolean) => {
    setData(keepCategories ? emptyData() : bareData())
  }, [])
  const loadExample = useCallback(() => setData(seedData()), [])

  const notify = useCallback((message: string) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3200)
  }, [])

  const value = useMemo(
    () => ({
      data,
      update,
      replace,
      startFresh,
      loadExample,
      saving,
      storageBlocked,
      month,
      setMonth,
      toast,
      notify,
    }),
    [data, update, replace, startFresh, loadExample, saving, storageBlocked, month, toast, notify],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}
