import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileSearch, ScanSearch, SearchX } from 'lucide-react'

import { apiFetch } from '@/api/client.js'
import DidoxRecord from '@/components/DidoxRecord.jsx'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'

export function didoxErrorMessage(t, status) {
  if (status === 401) return t('errors.sessionExpired')
  if (status === 422) return t('errors.invalidTin')
  if (status === 502 || status === 'network') return t('didox.errors.upstream')
  if (status === 503) return t('didox.errors.notConfigured')
  if (status === 504) return t('didox.errors.timeout')
  return t('errors.server', { status })
}

/**
 * Didox record for a TIN/PINFL. `searchId` changes on every submitted search,
 * so searching the same TIN again refetches.
 * Status: idle | loading | ready | notFound | error.
 */
export function useDidoxOrg(tin, searchId) {
  const [state, setState] = useState({ status: 'idle' })

  useEffect(() => {
    if (!tin) {
      setState({ status: 'idle' })
      return
    }
    let cancelled = false
    setState({ status: 'loading', tin })
    apiFetch(`/didox/org/${encodeURIComponent(tin)}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}))
        if (cancelled) return
        if (res.ok) setState({ status: 'ready', tin, result: body })
        else if (res.status === 404) setState({ status: 'notFound', tin })
        else setState({ status: 'error', tin, code: res.status })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error', tin, code: 'network' })
      })
    return () => {
      cancelled = true
    }
  }, [tin, searchId])

  return state
}

export default function DidoxLookup({ state, onOpenRegistry }) {
  const { t } = useI18n()

  if (state.status === 'loading') return <LoadingCard tin={state.tin} />

  if (state.status === 'error') {
    return (
      <Alert variant="destructive">
        <AlertTitle>{t('didox.failedTitle')}</AlertTitle>
        <AlertDescription>
          <p>{didoxErrorMessage(t, state.code)}</p>
          {state.code === 401 && (
            <Button asChild variant="outline" size="sm" className="mt-2 text-foreground">
              <Link to="/login">{t('lookup.signInAgain')}</Link>
            </Button>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  if (state.status === 'notFound') {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchX />
          </EmptyMedia>
          <EmptyTitle className="text-base">{t('didox.notFoundTitle')}</EmptyTitle>
          <EmptyDescription>{t('didox.notFoundHint', { tin: state.tin })}</EmptyDescription>
        </EmptyHeader>
        <Button variant="outline" size="sm" onClick={onOpenRegistry}>
          <ScanSearch />
          {t('didox.openRegistry')}
        </Button>
      </Empty>
    )
  }

  if (state.status === 'ready') {
    return <ResultCard tin={state.tin} result={state.result} onOpenRegistry={onOpenRegistry} />
  }

  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileSearch />
        </EmptyMedia>
        <EmptyTitle className="text-base">{t('didox.emptyTitle')}</EmptyTitle>
      </EmptyHeader>
    </Empty>
  )
}

function ResultCard({ tin, result, onOpenRegistry }) {
  const { t } = useI18n()
  const data = result.data || {}
  const title = data.name || data.shortName

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b py-5 [.border-b]:pb-5">
        <CardTitle className="text-lg leading-snug text-balance">
          {title || <span className="font-mono tabular-nums">{t('lookup.tin', { tin })}</span>}
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {title && <span className="font-mono tabular-nums text-foreground/80">{t('lookup.tin', { tin })}</span>}
          {result._meta && (
            <span className="font-mono text-xs tabular-nums">
              {result._meta.elapsed_ms} ms · req {result._meta.request_id}
            </span>
          )}
        </CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" onClick={onOpenRegistry}>
            <ScanSearch />
            {t('didox.openRegistry')}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="py-6">
        <DidoxRecord data={data} bankName={result.bank_name} />
      </CardContent>
    </Card>
  )
}

function LoadingCard({ tin }) {
  const { t } = useI18n()
  const widths = ['w-2/3', 'w-1/2', 'w-1/3', 'w-3/5', 'w-2/5']
  return (
    <Card className="gap-0 overflow-hidden py-0" aria-busy="true">
      <CardHeader className="border-b py-5 [.border-b]:pb-5">
        <CardTitle className="font-mono text-lg tabular-nums">{t('lookup.tin', { tin })}</CardTitle>
        <CardDescription className="flex items-center gap-2">
          <Spinner className="size-3.5" />
          {t('didox.contacting')}
        </CardDescription>
      </CardHeader>
      <CardContent className="py-6">
        <div className="flex flex-col gap-3.5" aria-hidden="true">
          <Skeleton className="mb-1 h-4 w-28" />
          {widths.map((w, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className={cn('h-4', w)} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
