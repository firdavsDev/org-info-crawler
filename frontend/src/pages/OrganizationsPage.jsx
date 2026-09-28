import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Building,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  RotateCw,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'

import { apiFetch } from '@/api/client.js'
import { fieldLabel, flattenValue } from '@/components/OrgResult.jsx'
import StatusBadge from '@/components/StatusBadge.jsx'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useI18n } from '@/lib/i18n'

const PAGE_SIZES = [10, 20, 50, 100]
const DEFAULT_PAGE_SIZE = 20
const STATUSES = ['queued', 'processing', 'ready', 'failed']
const EXPORT_PAGE_SIZE = 100
const EXPORT_MAX_ROWS = 5000

// Columns written to the Excel export, in order. Record fields come from the crawled payload.
const EXPORT_FIELDS = [
  'tin', 'name', 'legal_name', 'status', 'founding_date', 'director', 'director_position', 'founders',
  'charter_fund', 'thsht', 'dbibt', 'ifut', 'large_taxpayer', 'registration_authority', 'phone', 'email',
  'address', 'data_as_of', 'source_url',
]

// DD.MM.YYYY HH:mm in local time, the same day-first format orginfo.uz uses for dates.
function formatDateTime(iso) {
  if (!iso) return '—'
  const date = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`)
  if (Number.isNaN(date.getTime())) return iso
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function buildQuery({ q, status, page, size }) {
  const qs = new URLSearchParams({ page: String(page), page_size: String(size) })
  if (q.trim()) qs.set('q', q.trim())
  if (status !== 'all') qs.set('status', status)
  return qs
}

async function fetchPage(query, signal) {
  const res = await apiFetch(`/orgs?${query}`, { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export default function OrganizationsPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const q = params.get('q') || ''
  const status = STATUSES.includes(params.get('status')) ? params.get('status') : 'all'
  const page = Math.max(1, Number.parseInt(params.get('page'), 10) || 1)
  const size = PAGE_SIZES.includes(Number(params.get('size'))) ? Number(params.get('size')) : DEFAULT_PAGE_SIZE

  const [search, setSearch] = useState(q)
  const [data, setData] = useState({ items: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [exporting, setExporting] = useState(false)

  const pages = Math.max(1, Math.ceil(data.total / size))
  const filtersActive = q.trim() !== '' || status !== 'all'

  function update(next) {
    const merged = new URLSearchParams(params)
    for (const [key, value] of Object.entries(next)) {
      const isDefault =
        value === '' || value == null ||
        (key === 'status' && value === 'all') ||
        (key === 'page' && value === 1) ||
        (key === 'size' && value === DEFAULT_PAGE_SIZE)
      if (isDefault) merged.delete(key)
      else merged.set(key, String(value))
    }
    setParams(merged, { replace: true })
  }

  // Keep the box in sync when the URL changes from outside (back/forward, clear filters).
  useEffect(() => {
    setSearch(q)
  }, [q])

  // Debounce typing into the URL; changing the search resets to page 1.
  useEffect(() => {
    if (search === q) return
    const id = setTimeout(() => update({ q: search, page: 1 }), 300)
    return () => clearTimeout(id)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    fetchPage(buildQuery({ q, status, page, size }), controller.signal)
      .then((body) => setData(body))
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [q, status, page, size, reloadKey])

  // A page past the end (e.g. after narrowing a filter) snaps back to the last page.
  useEffect(() => {
    if (!loading && !error && page > pages) update({ page: pages })
  }, [loading, error, page, pages]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleExport() {
    setExporting(true)
    try {
      const rows = []
      let total = Infinity
      for (let p = 1; rows.length < Math.min(total, EXPORT_MAX_ROWS); p += 1) {
        const body = await fetchPage(buildQuery({ q, status, page: p, size: EXPORT_PAGE_SIZE }))
        total = body.total
        rows.push(...body.items)
        if (body.items.length < EXPORT_PAGE_SIZE) break
      }
      const exported = rows.slice(0, EXPORT_MAX_ROWS)

      const XLSX = await import('xlsx')
      const header = [
        ...EXPORT_FIELDS.map((key) => fieldLabel(t, key)),
        t('orgs.columns.status'),
        t('orgs.columns.updated'),
      ]
      const body = exported.map((item) => [
        ...EXPORT_FIELDS.map((key) => flattenValue(key === 'tin' ? item.tin : item.data?.[key])),
        t(`status.${item.status}`),
        formatDateTime(item.crawled_at),
      ])
      const ws = XLSX.utils.aoa_to_sheet([header, ...body])
      ws['!cols'] = header.map((_, i) => ({ wch: i === 0 ? 14 : 28 }))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Organizations')
      XLSX.writeFile(wb, `organizations_${new Date().toISOString().slice(0, 10)}.xlsx`)

      toast.success(t('orgs.exported', { count: exported.length }))
      if (total > EXPORT_MAX_ROWS) toast.info(t('orgs.exportCapped', { count: EXPORT_MAX_ROWS }))
    } catch (err) {
      toast.error(t('orgs.exportFailed', { message: err.message }))
    } finally {
      setExporting(false)
    }
  }

  const from = data.total === 0 ? 0 : (page - 1) * size + 1
  const to = Math.min(page * size, data.total)

  return (
    <div className="flex flex-col gap-6 pt-2">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{t('orgs.title')}</h1>
        <p className="max-w-prose text-sm text-muted-foreground">{t('orgs.subtitle')}</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <InputGroup className="sm:max-w-sm">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('orgs.searchPlaceholder')}
            aria-label={t('orgs.searchPlaceholder')}
          />
        </InputGroup>
        <Select value={status} onValueChange={(value) => update({ status: value, page: 1 })}>
          <SelectTrigger className="w-full sm:w-44" aria-label={t('orgs.statusFilter')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('orgs.allStatuses')}</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{t(`status.${s}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          className="sm:ml-auto"
          onClick={handleExport}
          disabled={exporting || loading || data.total === 0}>
          {exporting ? <Spinner /> : <Download />}
          {exporting ? t('orgs.exporting') : t('orgs.export')}
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>{t('orgs.loadError', { message: error.message })}</AlertTitle>
          <AlertDescription>
            <Button variant="outline" size="sm" className="mt-2 text-foreground" onClick={() => setReloadKey((k) => k + 1)}>
              <RotateCw />
              {t('orgs.retry')}
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-32">{t('orgs.columns.tin')}</TableHead>
                <TableHead>{t('orgs.columns.name')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('orgs.columns.director')}</TableHead>
                <TableHead className="hidden xl:table-cell">{t('orgs.columns.registryStatus')}</TableHead>
                <TableHead className="hidden lg:table-cell">{t('orgs.columns.founded')}</TableHead>
                <TableHead>{t('orgs.columns.status')}</TableHead>
                <TableHead className="hidden text-right md:table-cell">{t('orgs.columns.updated')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody aria-busy={loading}>
              {loading && data.items.length === 0 &&
                Array.from({ length: Math.min(size, 8) }).map((_, i) => (
                  <TableRow key={i} className="hover:bg-transparent">
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-56 max-w-full" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="ml-auto h-4 w-28" /></TableCell>
                  </TableRow>
                ))}

              {!loading && data.items.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="p-0">
                    <Empty className="py-12">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          {filtersActive ? <Search /> : <Building />}
                        </EmptyMedia>
                        <EmptyTitle className="text-base">{filtersActive ? t('orgs.empty') : t('orgs.title')}</EmptyTitle>
                        {!filtersActive && <EmptyDescription>{t('orgs.emptyAll')}</EmptyDescription>}
                      </EmptyHeader>
                      {filtersActive && (
                        <EmptyContent>
                          <Button variant="outline" size="sm" onClick={() => update({ q: '', status: 'all', page: 1 })}>
                            {t('orgs.clearFilters')}
                          </Button>
                        </EmptyContent>
                      )}
                    </Empty>
                  </TableCell>
                </TableRow>
              )}

              {data.items.map((item) => {
                const name = item.data?.name || item.data?.legal_name
                return (
                  <TableRow
                    key={item.tin}
                    className={`cursor-pointer transition-opacity ${loading ? 'opacity-60' : ''}`}
                    onClick={() => navigate(`/?tin=${item.tin}`)}>
                    <TableCell className="font-mono tabular-nums">
                      <Link
                        to={`/?tin=${item.tin}`}
                        onClick={(e) => e.stopPropagation()}
                        className="underline decoration-border underline-offset-4 hover:decoration-foreground">
                        {item.tin}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-72 truncate font-medium" title={name || undefined}>
                      {name || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="hidden max-w-56 truncate md:table-cell" title={item.data?.director || undefined}>
                      {item.data?.director || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {item.data?.status || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs tabular-nums lg:table-cell">
                      {item.data?.founding_date || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell><StatusBadge status={item.status} /></TableCell>
                    <TableCell className="hidden text-right text-xs text-muted-foreground tabular-nums md:table-cell">
                      {formatDateTime(item.crawled_at)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {!error && (
        <div className="flex flex-col-reverse gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground tabular-nums" aria-live="polite">
            {t('orgs.showing', { from, to, total: data.total })}
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{t('orgs.rowsPerPage')}</span>
              <Select value={String(size)} onValueChange={(value) => update({ size: Number(value), page: 1 })}>
                <SelectTrigger size="sm" className="w-20" aria-label={t('orgs.rowsPerPage')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="font-medium tabular-nums">{t('orgs.pageOf', { page: Math.min(page, pages), pages })}</span>
            <div className="flex items-center gap-1">
              <PageButton label={t('orgs.first')} disabled={page <= 1} onClick={() => update({ page: 1 })} icon={ChevronsLeft} />
              <PageButton label={t('orgs.previous')} disabled={page <= 1} onClick={() => update({ page: page - 1 })} icon={ChevronLeft} />
              <PageButton label={t('orgs.next')} disabled={page >= pages} onClick={() => update({ page: page + 1 })} icon={ChevronRight} />
              <PageButton label={t('orgs.last')} disabled={page >= pages} onClick={() => update({ page: pages })} icon={ChevronsRight} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PageButton({ label, disabled, onClick, icon: Icon }) {
  return (
    <Button variant="outline" size="icon-sm" disabled={disabled} onClick={onClick} aria-label={label} title={label}>
      <Icon />
    </Button>
  )
}
