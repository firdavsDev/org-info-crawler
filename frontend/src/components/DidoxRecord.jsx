import { CopyValue } from '@/components/OrgResult.jsx'
import { Separator } from '@/components/ui/separator'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

// Field groups for reading a Didox record. `bank_name` comes from our API, not from Didox itself.
const SECTIONS = [
  { id: 'organization', keys: ['name', 'shortName', 'tin', 'personalNum', 'regDate', 'na1Name', 'statusName', 'oked'] },
  { id: 'leadership', keys: ['director', 'directorTin', 'directorPinfl', 'accountant'] },
  { id: 'bank', keys: ['bank_name', 'mfo', 'account'] },
  { id: 'tax', keys: ['VATRegCode', 'VATRegStatus', 'isBudget'] },
  { id: 'address', keys: ['address'] },
]

// Didox repeats some values under a second name; each value is shown once.
const DUPLICATE_KEYS = new Set(['fullName', 'fullname', 'shortname', 'bankCode', 'bankAccount'])

// Only shown when filled in (PINFL is empty for legal entities).
const OPTIONAL_KEYS = new Set(['personalNum'])

const MONO_KEYS = new Set(['tin', 'personalNum', 'regDate', 'oked', 'directorTin', 'directorPinfl', 'mfo', 'account', 'VATRegCode', 'VATRegStatus'])

// Values staff paste into contracts and payment forms get a copy control.
const COPY_KEYS = new Set(['name', 'tin', 'personalNum', 'director', 'directorTin', 'bank_name', 'mfo', 'account', 'VATRegCode', 'address'])

export default function DidoxRecord({ data, bankName }) {
  const { t } = useI18n()
  if (!data || typeof data !== 'object') return null

  const record = { ...data, bank_name: bankName }
  const known = new Set(SECTIONS.flatMap((s) => s.keys))
  const sections = [
    ...SECTIONS.map((s) => ({
      id: s.id,
      keys: s.keys.filter((k) => k in record && !(OPTIONAL_KEYS.has(k) && isBlank(record[k]))),
    })),
    // Everything else Didox sent, under its raw field name.
    { id: 'other', raw: true, keys: Object.keys(data).filter((k) => !known.has(k) && !DUPLICATE_KEYS.has(k)) },
  ].filter((s) => s.keys.length > 0)

  return (
    <div className="flex flex-col">
      {sections.map((section, i) => (
        <section key={section.id} aria-labelledby={`didox-section-${section.id}`}>
          {i > 0 && <Separator className="my-5" />}
          <h3 id={`didox-section-${section.id}`} className="mb-3 text-sm font-medium text-foreground">
            {t(`didox.sections.${section.id}`)}
          </h3>
          <dl className="flex flex-col gap-4 text-sm sm:grid sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-x-6 sm:gap-y-3">
            {section.keys.map((key) => {
              const label = section.raw ? key : t(`didox.fields.${key}`)
              const value = record[key]
              return (
                <div key={key} className="flex flex-col gap-1 sm:contents">
                  <dt className={cn('text-muted-foreground', section.raw && 'font-mono text-xs leading-5')}>{label}</dt>
                  {COPY_KEYS.has(key) && typeof value === 'string' && value !== '' ? (
                    <dd className="group/value flex min-w-0 items-start gap-1.5 break-words">
                      <div className="min-w-0 flex-1 sm:flex-none">{formatValue(t, key, value)}</div>
                      <CopyValue value={value} label={label} />
                    </dd>
                  ) : (
                    <dd className="min-w-0 break-words">{formatValue(t, key, value)}</dd>
                  )}
                </div>
              )
            })}
          </dl>
        </section>
      ))}
    </div>
  )
}

function isBlank(value) {
  return value === null || value === undefined || value === ''
}

function formatValue(t, key, value) {
  if (isBlank(value)) return <span className="text-muted-foreground">—</span>
  if (typeof value === 'boolean' || key === 'isBudget') return value ? t('record.yes') : t('record.no')
  if (MONO_KEYS.has(key) || typeof value === 'number') {
    return <span className="font-mono tabular-nums">{String(value)}</span>
  }
  if (typeof value === 'object') return <span className="font-mono text-xs">{JSON.stringify(value)}</span>
  return String(value)
}
