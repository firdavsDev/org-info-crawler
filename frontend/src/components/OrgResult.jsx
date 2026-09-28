import { useState } from 'react'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'
import { orginfoFounderUrl } from '@/lib/links.js'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// Field groups for reading the record. Keys not listed here fall into "Other fields".
const SECTIONS = [
  { id: 'organization', keys: ['legal_name', 'alternate_name', 'status', 'founding_date', 'tin'] },
  { id: 'registration', keys: ['registration_authority', 'thsht', 'dbibt', 'ifut', 'charter_fund', 'large_taxpayer'] },
  { id: 'leadership', keys: ['director', 'director_position', 'founders'] },
  { id: 'contacts', keys: ['phone', 'email', 'address'] },
]

// `name` is the card title; the as-of date and source link render as the record's footnote.
const HIDDEN_KEYS = new Set(['_meta', 'name', 'data_as_of', 'source_url'])

const MONO_KEYS = new Set(['tin', 'thsht', 'dbibt', 'ifut', 'phone'])

// Values staff paste into contracts and payment forms get a copy control.
const COPY_KEYS = new Set(['legal_name', 'tin', 'thsht', 'dbibt', 'ifut', 'director', 'phone', 'email', 'address'])

export default function OrgResult({ data }) {
  const { t } = useI18n()
  if (!data || typeof data !== 'object') return null
  const labelFor = (key) => fieldLabel(t, key)

  const known = new Set(SECTIONS.flatMap((s) => s.keys))
  const sections = [
    ...SECTIONS.map((s) => ({ title: t(`record.sections.${s.id}`), keys: s.keys.filter((k) => k in data) })),
    {
      title: t('record.sections.other'),
      keys: Object.keys(data).filter((k) => !known.has(k) && !HIDDEN_KEYS.has(k)),
    },
  ].filter((s) => s.keys.length > 0)

  return (
    <div className="flex flex-col">
      {sections.map((section, i) => (
        <section key={section.title} aria-labelledby={`section-${i}`}>
          {i > 0 && <Separator className="my-5" />}
          <h3 id={`section-${i}`} className="mb-3 text-sm font-medium text-foreground">
            {section.title}
          </h3>
          <dl className="flex flex-col gap-4 text-sm sm:grid sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-x-6 sm:gap-y-3">
            {section.keys.map((key) => (
              <div key={key} className="flex flex-col gap-1 sm:contents">
                <dt className="text-muted-foreground">{labelFor(key)}</dt>
                {COPY_KEYS.has(key) && typeof data[key] === 'string' && data[key] !== '' ? (
                  <dd className="group/value flex min-w-0 items-start gap-1.5 break-words">
                    <div className="min-w-0 flex-1 sm:flex-none">{formatValue(t, key, data[key])}</div>
                    <CopyValue value={data[key]} label={labelFor(key)} />
                  </dd>
                ) : (
                  <dd className="min-w-0 break-words">{formatValue(t, key, data[key])}</dd>
                )}
              </div>
            ))}
          </dl>
        </section>
      ))}
      {(data.data_as_of || data.source_url) && (
        <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-4 text-xs text-muted-foreground">
          {data.data_as_of && <span>{t('record.asOf', { date: data.data_as_of })}</span>}
          {data.source_url && (
            <a
              href={data.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 underline decoration-border underline-offset-4 hover:text-foreground hover:decoration-foreground">
              {t('record.viewSource')}
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          )}
        </p>
      )}
    </div>
  )
}

/** Flatten a value to a plain string for Excel cells */
function flattenValue(value) {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === 'object' && item !== null
          ? Object.values(item).join(' | ')
          : String(item)
      )
      .join('; ')
  }
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export async function exportExcel(data, t) {
  const XLSX = await import('xlsx')
  const entries = Object.entries(data).filter(([k]) => k !== '_meta')
  const rows = [
    [t('record.excelField'), t('record.excelValue')],
    ...entries.map(([k, v]) => [fieldLabel(t, k), flattenValue(v)]),
  ]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 28 }, { wch: 60 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'OrgInfo')
  XLSX.writeFile(wb, `org_${data.tin || 'export'}.xlsx`)
}

export { flattenValue }

export function fieldLabel(t, key) {
  const translated = t(`record.fields.${key}`)
  if (translated !== `record.fields.${key}`) return translated
  const words = key.replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function CopyValue({ value, label }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success(t('toast.copied', { label }))
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error(t('toast.copyFailed'))
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      onClick={handleCopy}
      aria-label={t('record.copyValue', { label })}
      className="-my-0.5 shrink-0 text-muted-foreground transition-opacity duration-150 hover:text-foreground pointer-fine:opacity-0 pointer-fine:group-hover/value:opacity-100 pointer-fine:focus-visible:opacity-100">
      {copied ? <Check /> : <Copy />}
    </Button>
  )
}

function Empty() {
  return <span className="text-muted-foreground">—</span>
}

function formatValue(t, key, value) {
  if (value === null || value === undefined || value === '') return <Empty />
  if (typeof value === 'boolean') return value ? t('record.yes') : t('record.no')

  if (key === 'email' && typeof value === 'string') {
    return (
      <a href={`mailto:${value}`} className="underline decoration-border underline-offset-4 hover:decoration-foreground">
        {value}
      </a>
    )
  }

  if (key === 'phone' && typeof value === 'string') {
    return (
      <a
        href={`tel:${value.replace(/[^\d+]/g, '')}`}
        className="font-mono tabular-nums underline decoration-border underline-offset-4 hover:decoration-foreground">
        {value}
      </a>
    )
  }

  // Array of founder objects: [{name, share}, ...]
  if (Array.isArray(value) && value.length > 0 && value[0]?.name !== undefined) {
    return <FoundersTable founders={value} />
  }

  // Generic array → bullet list
  if (Array.isArray(value)) {
    return (
      <ul className="list-disc space-y-1 pl-4">
        {value.map((item, i) => <li key={i}>{String(item)}</li>)}
      </ul>
    )
  }

  if (typeof value === 'object') {
    return (
      <pre className="overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-xs">
        {JSON.stringify(value, null, 2)}
      </pre>
    )
  }

  if (MONO_KEYS.has(key)) return <span className="font-mono tabular-nums">{String(value)}</span>
  return String(value)
}

function FoundersTable({ founders }) {
  const { t } = useI18n()
  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="h-9">{t('record.founder')}</TableHead>
            <TableHead className="h-9 w-40 text-right">{t('record.share')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {founders.map((f, i) => {
            const share = Number.parseFloat(f.share)
            return (
              <TableRow key={i}>
                <TableCell className="whitespace-normal">
                  {f.name ? (
                    <a
                      href={orginfoFounderUrl(f.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group hover:underline hover:underline-offset-4">
                      {f.name}
                      <ExternalLink className="ml-1.5 inline size-3.5 align-[-2px] text-muted-foreground group-hover:text-foreground" aria-hidden="true" />
                      <span className="sr-only">{t('record.founderLinkHint')}</span>
                    </a>
                  ) : <Empty />}
                </TableCell>
                <TableCell className="text-right">
                  {f.share ? (
                    <div className="flex items-center justify-end gap-3">
                      {Number.isFinite(share) && (
                        <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:block" aria-hidden="true">
                          <div className="h-full rounded-full bg-foreground/70" style={{ width: `${Math.min(share, 100)}%` }} />
                        </div>
                      )}
                      <span className="font-mono tabular-nums">{f.share} %</span>
                    </div>
                  ) : <Empty />}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
