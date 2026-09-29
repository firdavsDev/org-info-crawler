import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'

import { apiFetch } from '@/api/client.js'
import { didoxErrorMessage } from '@/components/DidoxLookup.jsx'
import { useI18n } from '@/lib/i18n'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

// Didox reference data that needs no TIN: banks, and regions with their districts.
export default function DidoxDirectory() {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <BanksCard />
      <RegionsCard />
    </div>
  )
}

// Rows rendered at once in the bank table; the filter narrows the rest.
const BANKS_SHOWN = 50

// Didox reference lists (banks, regions, districts) for this browser session.
const listCache = new Map()

function useDidoxList(path) {
  const [state, setState] = useState({ data: null, loading: Boolean(path), error: null })

  useEffect(() => {
    if (!path) {
      setState({ data: null, loading: false, error: null })
      return
    }
    if (listCache.has(path)) {
      setState({ data: listCache.get(path), loading: false, error: null })
      return
    }
    let cancelled = false
    setState({ data: null, loading: true, error: null })
    apiFetch(path)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          setState({ data: null, loading: false, error: res.status })
          return
        }
        listCache.set(path, body.data)
        setState({ data: body.data, loading: false, error: null })
      })
      .catch(() => {
        if (!cancelled) setState({ data: null, loading: false, error: 'network' })
      })
    return () => {
      cancelled = true
    }
  }, [path])

  return state
}

function ListError({ status }) {
  const { t } = useI18n()
  return (
    <Alert variant="destructive">
      <AlertTitle>{t('didox.failedTitle')}</AlertTitle>
      <AlertDescription>{didoxErrorMessage(t, status)}</AlertDescription>
    </Alert>
  )
}

function TableSkeleton({ rows = 6 }) {
  return (
    <div className="flex flex-col gap-3 rounded-md border p-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  )
}

function BanksCard() {
  const { t } = useI18n()
  const { data, loading, error } = useDidoxList('/didox/banks')
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()

  const matches = useMemo(() => {
    const banks = Array.isArray(data) ? data : []
    if (!needle) return banks
    return banks.filter((b) => String(b.bankId).includes(needle) || String(b.name).toLowerCase().includes(needle))
  }, [data, needle])
  const shown = matches.slice(0, BANKS_SHOWN)

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>{t('didox.banks.title')}</CardTitle>
        <CardDescription>
          {Array.isArray(data) ? t('didox.banks.description', { count: data.length }) : t('didox.banks.descriptionLoading')}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <InputGroup>
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('didox.banks.filter')}
            aria-label={t('didox.banks.filter')}
            disabled={!Array.isArray(data)}
          />
        </InputGroup>

        {loading && <TableSkeleton />}
        {error && <ListError status={error} />}

        {Array.isArray(data) && (
          matches.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              {t('didox.banks.none', { query: query.trim() })}
            </p>
          ) : (
            <div className="max-h-[28rem] overflow-auto rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-20">{t('didox.banks.mfo')}</TableHead>
                    <TableHead>{t('didox.banks.name')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shown.map((bank) => (
                    <TableRow key={bank.bankId}>
                      <TableCell className="align-top font-mono tabular-nums">{bank.bankId}</TableCell>
                      <TableCell className="whitespace-normal">{bank.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        )}

        {matches.length > shown.length && (
          <p className="text-xs text-muted-foreground tabular-nums">
            {t('didox.banks.showing', { shown: shown.length, total: matches.length })}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function RegionsCard() {
  const { t, lang } = useI18n()
  const regions = useDidoxList('/didox/regions')
  const [regionId, setRegionId] = useState('')
  const districts = useDidoxList(regionId ? `/didox/regions/${regionId}/districts` : null)

  // Didox names places in English, Uzbek (Latin and Cyrillic) and Russian.
  const placeName = (place) => (lang === 'uz' ? place.nameUzLatn || place.name : place.name || place.nameUzLatn)

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>{t('didox.regions.title')}</CardTitle>
        <CardDescription>{t('didox.regions.description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {regions.loading && <Skeleton className="h-9 w-full" />}
        {regions.error && <ListError status={regions.error} />}

        {Array.isArray(regions.data) && (
          <Select value={regionId} onValueChange={setRegionId}>
            <SelectTrigger className="w-full" aria-label={t('didox.regions.region')}>
              <SelectValue placeholder={t('didox.regions.choose')} />
            </SelectTrigger>
            <SelectContent>
              {regions.data.map((region) => (
                <SelectItem key={region.regionId} value={String(region.regionId)}>
                  {placeName(region)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {!regionId && Array.isArray(regions.data) && (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            {t('didox.regions.pickHint')}
          </p>
        )}

        {districts.loading && <TableSkeleton />}
        {districts.error && <ListError status={districts.error} />}

        {Array.isArray(districts.data) && (
          <>
            <div className="max-h-[28rem] overflow-auto rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>{t('didox.regions.district')}</TableHead>
                    <TableHead className="w-28 text-right">{t('didox.regions.soato')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {districts.data.map((district) => (
                    <TableRow key={district.soato ?? district.districtCode}>
                      <TableCell className="whitespace-normal">{placeName(district)}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{district.soato}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground tabular-nums">
              {t('didox.regions.count', { count: districts.data.length })}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
