import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../api/client.js'

const RECENT_LIMIT = 10

const RecentOrgsContext = createContext(null)

// The most recently crawled organizations (GET /orgs, newest crawl first), for one-click repeat lookups.
export function RecentOrgsProvider({ children }) {
  const [recent, setRecent] = useState([])
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const res = await apiFetch(`/orgs?page=1&page_size=${RECENT_LIMIT}`)
      if (res.ok) {
        const data = await res.json()
        setRecent(data.items)
      }
    } catch {
      // the recent list is non-critical, silently ignore errors
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const value = useMemo(() => ({ recent, loaded, refresh }), [recent, loaded, refresh])

  return <RecentOrgsContext.Provider value={value}>{children}</RecentOrgsContext.Provider>
}

export function useRecentOrgs() {
  const context = useContext(RecentOrgsContext)
  if (!context) {
    throw new Error('useRecentOrgs must be used within a RecentOrgsProvider.')
  }
  return context
}
