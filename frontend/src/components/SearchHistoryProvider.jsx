import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../api/client.js'

const HISTORY_LIMIT = 10

const SearchHistoryContext = createContext(null)

export function SearchHistoryProvider({ children }) {
  const [history, setHistory] = useState([])
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const res = await apiFetch('/search/history')
      if (res.ok) {
        const data = await res.json()
        // Deduplicate: keep only the most recent entry per TIN
        const seen = new Set()
        const deduped = data.filter((item) => {
          if (seen.has(item.tin)) return false
          seen.add(item.tin)
          return true
        })
        setHistory(deduped.slice(0, HISTORY_LIMIT))
      }
    } catch {
      // history is non-critical, silently ignore errors
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const value = useMemo(() => ({ history, loaded, refresh }), [history, loaded, refresh])

  return <SearchHistoryContext.Provider value={value}>{children}</SearchHistoryContext.Provider>
}

export function useSearchHistory() {
  const context = useContext(SearchHistoryContext)
  if (!context) {
    throw new Error('useSearchHistory must be used within a SearchHistoryProvider.')
  }
  return context
}
