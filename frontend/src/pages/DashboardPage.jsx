import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { CircleX, Download, RotateCw, ScanSearch, Search, SearchX } from 'lucide-react'

import { apiFetch } from '../api/client.js'
import OrgResult, { exportExcel } from '../components/OrgResult.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import CrawlProgress from '../components/CrawlProgress.jsx'
import { useSearchHistory } from '../components/SearchHistoryProvider.jsx'
import { useI18n } from '@/lib/i18n'
import { orginfoSearchUrl } from '@/lib/links.js'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Kbd } from '@/components/ui/kbd'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'

const POLL_INTERVAL_MS = 2000
const POLL_TIMEOUT_MS = 60000

const PROGRESS_STAGES = {
  queued:     { ceiling: 20,  speed: 0.8 },
  processing: { ceiling: 88,  speed: 0.4 },
}

function useProgress(status) {
  const [pct, setPct] = useState(0)
  const raf = useRef(null)
  const pctRef = useRef(0)

  const animate = useCallback((ceiling, speed) => {
    if (raf.current) cancelAnimationFrame(raf.current)
    function step() {
      const remaining = ceiling - pctRef.current
      if (remaining <= 0.05) return
      const delta = Math.max(remaining * speed * 0.016, 0.05)
      pctRef.current = Math.min(pctRef.current + delta, ceiling)
      setPct(Math.round(pctRef.current * 10) / 10)
      raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
  }, [])

  useEffect(() => {
    if (status === null) {
      if (raf.current) cancelAnimationFrame(raf.current)
      pctRef.current = 0
      setPct(0)
    } else if (PROGRESS_STAGES[status]) {
      const { ceiling, speed } = PROGRESS_STAGES[status]
      animate(ceiling, speed)
    } else {
      if (raf.current) cancelAnimationFrame(raf.current)
      pctRef.current = 100
      setPct(100)
    }
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [status, animate])

  return pct
}

function isTypingTarget(el) {
  return el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

export default function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const tinParam = searchParams.get('tin')
  const [tin, setTin] = useState(tinParam || '')
  const [searchedTin, setSearchedTin] = useState('')
  const [loading, setLoading] = useState(false)
  const [crawlStatus, setCrawlStatus] = useState(null)
  const [result, setResult] = useState(null)
  const [fromCache, setFromCache] = useState(false)
  const [queryError, setQueryError] = useState(null)
  const { history, refresh: refreshHistory } = useSearchHistory()
  const { t } = useI18n()
  const pollTimer = useRef(null)
  const lastLocationKey = useRef(null)
  const inputRef = useRef(null)

  const progress = useProgress(crawlStatus)

  function clearPoll() {
    if (pollTimer.current) {
      clearInterval(pollTimer.current)
      pollTimer.current = null
    }
  }

  function handleTinChange(e) {
    setTin(e.target.value.replace(/\D/g, ''))
  }

  async function fetchOrg(tinValue) {
    const res = await apiFetch(`/org/${tinValue}`)
    // Errors carry a code so the message re-renders in the active language.
    if (res.status === 422) throw Object.assign(new Error('invalidTin'), { code: 'invalidTin', status: 422 })
    if (res.status === 401) throw Object.assign(new Error('sessionExpired'), { code: 'sessionExpired', status: 401 })
    if (!res.ok) throw Object.assign(new Error('server'), { code: 'server', status: res.status })
    return res.json()
  }

  const pollStatus = useCallback(async (tinValue, deadline) => {
    const res = await apiFetch(`/org/${tinValue}/status`)
    if (!res.ok) return
    const data = await res.json()

    if (data.status === 'processing') setCrawlStatus('processing')

    if (data.status === 'ready' || data.status === 'failed' || data.status === 'not_found') {
      clearPoll()
      setCrawlStatus('done')
      if (data.status === 'ready') {
        const full = await fetchOrg(tinValue)
        setResult(full)
      } else {
        setResult(data)
      }
      setLoading(false)
      refreshHistory()
    } else if (Date.now() > deadline) {
      clearPoll()
      setCrawlStatus('done')
      setResult({ status: 'failed', errorCode: 'timeout' })
      setLoading(false)
    }
  }, [refreshHistory])

  const runSearch = useCallback(async (tinValue) => {
    clearPoll()
    setQueryError(null)
    setResult(null)
    setCrawlStatus(null)
    setFromCache(false)
    setSearchedTin(tinValue)
    setLoading(true)

    try {
      const data = await fetchOrg(tinValue)
      if (data.status === 'ready') {
        setCrawlStatus('done')
        setFromCache(true)
        setResult(data)
        setLoading(false)
        refreshHistory()
      } else if (data.status === 'failed' || data.status === 'not_found') {
        setCrawlStatus('done')
        setResult(data)
        setLoading(false)
        refreshHistory()
      } else {
        setCrawlStatus(data.status)
        setResult(data)
        const deadline = Date.now() + POLL_TIMEOUT_MS
        pollTimer.current = setInterval(() => pollStatus(tinValue, deadline), POLL_INTERVAL_MS)
      }
    } catch (err) {
      setQueryError({ code: err.code || 'server', status: err.status, message: err.message })
      setCrawlStatus(null)
      setLoading(false)
    }
  }, [pollStatus, refreshHistory])

  // Every lookup goes through the URL (?tin=), so the sidebar, recent chips,
  // back/forward, and the search form all share one path.
  useEffect(() => {
    if (lastLocationKey.current === location.key) return
    lastLocationKey.current = location.key
    if (tinParam) {
      setTin(tinParam)
      runSearch(tinParam)
    } else {
      clearPoll()
      setTin('')
      setSearchedTin('')
      setResult(null)
      setCrawlStatus(null)
      setFromCache(false)
      setQueryError(null)
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [location.key, tinParam, runSearch])

  useEffect(() => () => clearPoll(), [])

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return
      e.preventDefault()
      inputRef.current?.focus()
      inputRef.current?.select()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function lookup(tinValue) {
    setSearchParams({ tin: tinValue }, { replace: false })
  }

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = tin.trim()
    if (!trimmed || trimmed.length < 9) return
    lookup(trimmed)
  }

  const isPolling = loading && crawlStatus && crawlStatus !== 'done'
  const showProgress = crawlStatus !== null && !fromCache
  const tooShort = tin.length > 0 && tin.length < 9
  const atMax    = tin.length === 14
  const isReady = result?.status === 'ready' && result.data

  return (
    <div className="flex flex-col gap-6 pt-2">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{t('lookup.title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('lookup.subtitle')}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="flex w-full flex-col gap-1.5 sm:max-w-xs">
            <label htmlFor="tin" className="sr-only">{t('lookup.inputLabel')}</label>
            <InputGroup className="h-10">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                ref={inputRef}
                id="tin"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                autoFocus={!tinParam}
                value={tin}
                onChange={handleTinChange}
                placeholder={t('lookup.placeholder')}
                className="font-mono tabular-nums"
                aria-invalid={tooShort || undefined}
                aria-describedby={tooShort ? 'tin-error' : undefined}
                minLength={9}
                maxLength={14}
                required
              />
              <InputGroupAddon align="inline-end">
                {tin.length > 0 ? (
                  <span
                    className={cn(
                      'font-mono text-xs tabular-nums',
                      tooShort ? 'text-destructive' : atMax ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'
                    )}>
                    {tin.length}/14
                  </span>
                ) : (
                  <Kbd>/</Kbd>
                )}
              </InputGroupAddon>
            </InputGroup>
            {tooShort && (
              <p id="tin-error" className="text-xs text-destructive">
                {t('lookup.tooShort', { count: tin.length })}
              </p>
            )}
          </div>
          <Button type="submit" size="lg" className="h-10" disabled={loading || tin.length < 9}>
            {loading ? <Spinner /> : null}
            {loading ? t('lookup.searching') : t('lookup.search')}
          </Button>
        </form>

        {history.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-medium text-muted-foreground">{t('lookup.recent')}</span>
            {history.map((item) => (
              <Button
                key={item.tin + item.searched_at}
                type="button"
                variant="outline"
                size="xs"
                className={cn(
                  'rounded-full font-mono tabular-nums',
                  item.tin === searchedTin && 'border-foreground/30 bg-accent'
                )}
                onClick={() => lookup(item.tin)}>
                {item.tin}
              </Button>
            ))}
          </div>
        )}
      </div>

      {queryError && (
        <Alert variant="destructive">
          <AlertTitle>{t('lookup.failedTitle')}</AlertTitle>
          <AlertDescription>
            <p>{queryError.code ? t(`errors.${queryError.code}`, { status: queryError.status }) : queryError.message}</p>
            {queryError.status === 401 && (
              <Button asChild variant="outline" size="sm" className="mt-2 text-foreground">
                <Link to="/login">{t('lookup.signInAgain')}</Link>
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {result && (
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-b py-5 [.border-b]:pb-5">
            <CardTitle className="text-lg leading-snug text-balance">
              {isReady && result.data.name ? result.data.name : (
                <span className="font-mono tabular-nums">{t('lookup.tin', { tin: searchedTin })}</span>
              )}
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {isReady && result.data.name && (
                <span className="font-mono tabular-nums text-foreground/80">{t('lookup.tin', { tin: searchedTin })}</span>
              )}
              <StatusBadge status={isPolling ? crawlStatus : result.status} />
              {fromCache && <span className="text-xs">{t('lookup.cached')}</span>}
              {result._meta && (
                <span className="font-mono text-xs tabular-nums">
                  {result._meta.elapsed_ms} ms · req {result._meta.request_id}
                </span>
              )}
            </CardDescription>
            {isReady && (
              <CardAction>
                <Button variant="outline" size="sm" onClick={() => exportExcel(result.data, t)}>
                  <Download />
                  {t('lookup.export')}
                </Button>
              </CardAction>
            )}
          </CardHeader>

          {showProgress && (
            <div className="border-b px-6 py-4">
              <CrawlProgress
                stage={crawlStatus}
                outcome={result.status}
                progress={progress}
                isPolling={Boolean(isPolling)}
              />
            </div>
          )}

          <CardContent className="py-6">
            {isPolling && <RecordSkeleton />}

            {result.status === 'failed' && (
              <div className="flex flex-col items-start gap-4" role="alert">
                <div className="flex gap-3">
                  <CircleX className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
                  <div className="flex flex-col gap-1 text-sm">
                    <p className="font-medium">{t('crawl.failedTitle')}</p>
                    {result.errorCode && <p className="text-foreground/80">{t(`errors.${result.errorCode}`)}</p>}
                    {result.error && <p className="text-foreground/80">{result.error}</p>}
                    <p className="text-muted-foreground">{t('crawl.retryHint')}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="ml-7" onClick={() => lookup(searchedTin)}>
                  <RotateCw />
                  {t('crawl.retry')}
                </Button>
              </div>
            )}

            {result.status === 'not_found' && (
              <Empty className="p-6 md:p-6">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <SearchX />
                  </EmptyMedia>
                  <EmptyTitle className="text-base">{t('notFound.title')}</EmptyTitle>
                  <EmptyDescription>
                    {t('notFound.check')}{' '}
                    <a href={orginfoSearchUrl(searchedTin)} target="_blank" rel="noopener noreferrer">
                      {t('notFound.link')}
                    </a>
                    .
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}

            {isReady && <OrgResult data={result.data} />}
          </CardContent>
        </Card>
      )}

      {!result && !queryError && !loading && (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ScanSearch />
            </EmptyMedia>
            <EmptyTitle className="text-base">{t('empty.title')}</EmptyTitle>
          </EmptyHeader>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {t('empty.shortcutBefore')} <Kbd>/</Kbd> {t('empty.shortcutAfter')}
          </p>
        </Empty>
      )}

      {!result && loading && <LoadingCard tin={searchedTin} />}
    </div>
  )
}

function RecordSkeleton() {
  const widths = ['w-2/3', 'w-1/2', 'w-1/3', 'w-3/5', 'w-2/5']
  return (
    <div className="flex flex-col gap-3.5" aria-hidden="true">
      <Skeleton className="mb-1 h-4 w-28" />
      {widths.map((w, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className={cn('h-4', w)} />
        </div>
      ))}
    </div>
  )
}

function LoadingCard({ tin }) {
  const { t } = useI18n()
  return (
    <Card className="gap-0 overflow-hidden py-0" aria-busy="true">
      <CardHeader className="border-b py-5 [.border-b]:pb-5">
        <CardTitle className="font-mono text-lg tabular-nums">{t('lookup.tin', { tin })}</CardTitle>
        <CardDescription className="flex items-center gap-2">
          <Spinner className="size-3.5" />
          {t('lookup.contacting')}
        </CardDescription>
      </CardHeader>
      <CardContent className="py-6">
        <RecordSkeleton />
      </CardContent>
    </Card>
  )
}
