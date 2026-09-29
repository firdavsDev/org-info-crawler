import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ArrowUpRight, Check, ChevronDown, Copy, KeyRound, Play } from 'lucide-react'
import { toast } from 'sonner'

import { apiFetch, getUsername } from '@/api/client.js'
import { highlightJson } from '@/components/json-highlight'
import { useRecentOrgs } from '@/components/RecentOrgsProvider.jsx'
import { useI18n } from '@/lib/i18n'
import { API_ORIGIN, SWAGGER_URL } from '@/lib/links.js'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const TIN_DESCRIPTION = {
  en: '9–14 digit Tax Identification Number.',
  uz: '9–14 xonali STIR (soliq to‘lovchining identifikatsiya raqami).',
}

const UNAUTHORIZED = {
  label: { en: '401 — unauthorized', uz: '401 — ruxsat yo‘q' },
  body: JSON.stringify({ detail: 'Invalid credentials' }, null, 2),
}

const META = { request_id: 'abc-130', elapsed_ms: 4 }

const INVALID_TIN = {
  label: { en: '422 — invalid TIN', uz: '422 — STIR noto‘g‘ri' },
  body: JSON.stringify({ detail: 'Invalid TIN: must be 9–14 digits.' }, null, 2),
}

// Failures shared by every /didox/* endpoint.
const DIDOX_ERRORS = [
  {
    label: { en: '502 — Didox error', uz: '502 — Didox xatosi' },
    body: JSON.stringify({ detail: 'Didox returned an unexpected response.' }, null, 2),
  },
  {
    label: { en: '503 — not configured', uz: '503 — sozlanmagan' },
    body: JSON.stringify({ detail: 'Didox integration is not configured.' }, null, 2),
  },
  {
    label: { en: '504 — Didox timeout', uz: '504 — Didox javob bermadi' },
    body: JSON.stringify({ detail: 'Didox did not respond in time.' }, null, 2),
  },
  UNAUTHORIZED,
]

// Sample Didox payloads: real field names and types (September 2026), dummy personal data.
const DIDOX_ORG_SAMPLE = {
  ns10Code: 27,
  ns11Code: 12,
  shortName: '"EXAMPLE" MCHJ',
  tin: '304918546',
  name: '"EXAMPLE" MAS\'ULIYATI CHEKLANGAN JAMIYAT',
  regDate: '30.05.2017',
  na1Code: 12,
  na1Name: 'Общество с огр. ответствен.',
  statusCode: 0,
  statusName: 'Действующие и имеющие налоговые обязательства',
  mfo: '00475',
  account: '20208000000000000001',
  address: 'Example MFY, Example ko‘chasi, 1-uy',
  oked: '10310',
  directorTin: '500000000',
  directorPinfl: '30000000000000',
  director: 'JOHN DOE',
  accountant: 'JANE DOE',
  isBudget: 0,
  taxpayerType: 1,
  isItd: false,
  personalNum: null,
  selfEmployment: false,
  privateNotary: false,
  peasantFarm: false,
  VATRegCode: '300000000000',
  VATRegStatus: 20,
  VATRegStatusCode: '1110',
  VATRegSimplified: false,
  bankAccount: '20208000000000000001',
  bankCode: '00475',
  shortname: '"EXAMPLE" MCHJ',
  fullname: '"EXAMPLE" MAS\'ULIYATI CHEKLANGAN JAMIYAT',
  fullName: '"EXAMPLE" MAS\'ULIYATI CHEKLANGAN JAMIYAT',
}

const DIDOX_BANK_NAME = 'НУРАФШОН Ш., "АГРОБАНК" АТБ ТОШКЕНТ ВИЛОЯТ ХУДУДИЙ ФИЛИАЛИ'

const DIDOX_REGION_SAMPLE = {
  code: 1703,
  name: 'Andijan region',
  nameUzCyrl: 'Андижон вилояти',
  nameUzLatn: 'Andijon viloyati',
  nameRu: 'Андижанская область',
  regionId: 3,
  districtCode: 0,
  active: 1,
}

const DIDOX_DISTRICT_SAMPLE = {
  soato: 1703202,
  name: 'Altynkul district',
  nameUzCyrl: 'Олтинкўл тумани',
  nameUzLatn: 'Oltinko\'l tumani',
  nameRu: 'Алтынкульский район',
  regionId: 3,
  districtCode: 6,
  active: 1,
}

// Mirrors the Swagger tags, so the same grouping shows up in /docs and here.
const GROUPS = [
  { id: 'org-info', key: 'orgInfo' },
  { id: 'didox', key: 'didox' },
]

const ENDPOINTS = [
  {
    id: 'get-org',
    group: 'org-info',
    method: 'GET',
    path: '/org/{tin}',
    description: {
      en:
        'Look up an organization by its Tax Identification Number (TIN/INN). ' +
        'If the record is not yet cached, a crawl job is enqueued and the response returns status "queued". ' +
        'Poll /org/{tin}/status until the status is "ready" or "failed".',
      uz:
        'Tashkilotni soliq to‘lovchining identifikatsiya raqami (STIR/INN) bo‘yicha qidirish. ' +
        'Agar yozuv hali keshda bo‘lmasa, yig‘ish vazifasi navbatga qo‘yiladi va javob "queued" holatini qaytaradi. ' +
        'Holat "ready" yoki "failed" bo‘lguncha /org/{tin}/status ni so‘rab turing.',
    },
    params: [
      { name: 'tin', in: 'path', required: true, description: TIN_DESCRIPTION },
    ],
    responses: [
      {
        label: { en: '200 — ready (data available)', uz: '200 — ready (ma’lumot mavjud)' },
        body: JSON.stringify({ status: 'ready', data: { name: 'EXAMPLE LLC', tin: '304918546', director: 'John Doe', address: 'Tashkent, Uzbekistan' }, _meta: { request_id: 'abc-123', elapsed_ms: 42 } }, null, 2),
      },
      {
        label: { en: '200 — queued (crawl started)', uz: '200 — queued (yig‘ish boshlandi)' },
        body: JSON.stringify({ status: 'queued', _meta: { request_id: 'abc-124', elapsed_ms: 5 } }, null, 2),
      },
      {
        label: { en: '200 — failed', uz: '200 — failed' },
        body: JSON.stringify({ status: 'failed', error: 'Crawler returned no data.', _meta: { request_id: 'abc-125', elapsed_ms: 12 } }, null, 2),
      },
      UNAUTHORIZED,
      INVALID_TIN,
    ],
    curl: `curl -u staff_user:password \\
  ${API_ORIGIN}/org/304918546`,
    fetchExample: `const res = await fetch('/api/org/304918546', {
  headers: { Authorization: 'Basic ' + btoa('staff_user:password') },
});
const data = await res.json();
console.log(data.status, data.data);`,
  },
  {
    id: 'get-org-status',
    group: 'org-info',
    method: 'GET',
    path: '/org/{tin}/status',
    description: {
      en: 'Check the crawl status for a given TIN. Use this to poll after receiving "queued" or "processing" from /org/{tin}.',
      uz: 'Berilgan STIR uchun yig‘ish holatini tekshirish. /org/{tin} dan "queued" yoki "processing" javobini olgach, holatni shu endpoint orqali kuzatib boring.',
    },
    params: [
      { name: 'tin', in: 'path', required: true, description: TIN_DESCRIPTION },
    ],
    responses: [
      {
        label: { en: '200 — processing', uz: '200 — processing' },
        body: JSON.stringify({ status: 'processing', _meta: { request_id: 'abc-126', elapsed_ms: 3 } }, null, 2),
      },
      {
        label: { en: '200 — ready', uz: '200 — ready' },
        body: JSON.stringify({ status: 'ready', _meta: { request_id: 'abc-127', elapsed_ms: 2 } }, null, 2),
      },
      {
        label: { en: '200 — not found', uz: '200 — topilmadi' },
        body: JSON.stringify({ status: 'not_found' }, null, 2),
      },
      {
        label: { en: '200 — failed', uz: '200 — failed' },
        body: JSON.stringify({ status: 'failed', error: 'Crawler returned no data.' }, null, 2),
      },
    ],
    curl: `curl -u staff_user:password \\
  ${API_ORIGIN}/org/304918546/status`,
    fetchExample: `const res = await fetch('/api/org/304918546/status', {
  headers: { Authorization: 'Basic ' + btoa('staff_user:password') },
});
const { status } = await res.json();
// status: 'queued' | 'processing' | 'ready' | 'failed' | 'not_found'`,
  },
  {
    id: 'get-orgs',
    group: 'org-info',
    method: 'GET',
    path: '/orgs',
    description: {
      en: 'List the organizations the service has looked up, newest crawl first. Supports search, a crawl-status filter, and pagination.',
      uz: 'Xizmat qidirgan tashkilotlar ro‘yxati, eng so‘nggi yig‘ilganlari birinchi. Qidiruv, yig‘ish holati bo‘yicha filtr va sahifalashni qo‘llab-quvvatlaydi.',
    },
    params: [
      {
        name: 'q',
        in: 'query',
        required: false,
        description: { en: 'Search text: TIN, name, legal name, or director.', uz: 'Qidiruv matni: STIR, nomi, yuridik nomi yoki rahbar.' },
      },
      {
        name: 'status',
        in: 'query',
        required: false,
        description: { en: 'Crawl status: queued, processing, ready, or failed.', uz: 'Yig‘ish holati: queued, processing, ready yoki failed.' },
      },
      { name: 'page', in: 'query', required: false, description: { en: 'Page number, starting at 1.', uz: 'Sahifa raqami, 1 dan boshlanadi.' } },
      { name: 'page_size', in: 'query', required: false, description: { en: 'Rows per page, 1–100 (default 20).', uz: 'Sahifadagi qatorlar soni, 1–100 (standart 20).' } },
    ],
    responses: [
      {
        label: { en: '200 — success', uz: '200 — muvaffaqiyatli' },
        body: JSON.stringify({
          items: [{ tin: '304918546', status: 'ready', error: null, crawled_at: '2026-09-28T09:12:00', data: { name: 'EXAMPLE LLC', director: 'John Doe' } }],
          total: 1,
          page: 1,
          page_size: 20,
        }, null, 2),
      },
      UNAUTHORIZED,
    ],
    curl: `curl -u staff_user:password \\
  "${API_ORIGIN}/orgs?q=example&status=ready&page=1&page_size=20"`,
    fetchExample: `const params = new URLSearchParams({ q: 'example', page: '1', page_size: '20' });
const res = await fetch('/api/orgs?' + params, {
  headers: { Authorization: 'Basic ' + btoa('staff_user:password') },
});
const { items, total } = await res.json();`,
  },
  {
    id: 'get-didox-org',
    group: 'didox',
    method: 'GET',
    path: '/didox/org/{tin}',
    description: {
      en:
        'Organization details from Didox by TIN (INN) or PINFL, with the name of its bank. ' +
        'Answers immediately — no crawl and no polling — and is cached for a day. ' +
        '"data" is the Didox record, unchanged; "bank_name" is looked up in the Didox bank list.',
      uz:
        'Didox’dan STIR (INN) yoki JShShIR bo‘yicha tashkilot ma’lumotlari va uning banki nomi. ' +
        'Javob darhol qaytadi — yig‘ish ham, holatni so‘rab turish ham kerak emas — va bir kunga keshlanadi. ' +
        '"data" — Didox yozuvi o‘zgarishsiz; "bank_name" Didox banklar ro‘yxatidan olinadi.',
    },
    params: [
      {
        name: 'tin',
        in: 'path',
        required: true,
        description: { en: '9–14 digits: a TIN (INN) or a PINFL.', uz: '9–14 xonali raqam: STIR (INN) yoki JShShIR.' },
      },
    ],
    responses: [
      {
        label: { en: '200 — success', uz: '200 — muvaffaqiyatli' },
        body: JSON.stringify({ data: DIDOX_ORG_SAMPLE, bank_name: DIDOX_BANK_NAME, _meta: META }, null, 2),
      },
      {
        label: { en: '404 — not in Didox', uz: '404 — Didox’da yo‘q' },
        body: JSON.stringify({ detail: 'Organization not found in Didox.' }, null, 2),
      },
      INVALID_TIN,
      ...DIDOX_ERRORS,
    ],
    curl: `curl -u staff_user:password \\
  ${API_ORIGIN}/didox/org/304918546`,
    fetchExample: `const res = await fetch('/api/didox/org/304918546', {
  headers: { Authorization: 'Basic ' + btoa('staff_user:password') },
});
const { data, bank_name } = await res.json();`,
  },
  {
    id: 'get-didox-banks',
    group: 'didox',
    method: 'GET',
    path: '/didox/banks',
    description: {
      en: 'All banks known to Didox (about 2,000). "bankId" is the bank’s MFO code — the same value as "bankCode" in /didox/org/{tin}. Cached for 7 days.',
      uz: 'Didox’dagi barcha banklar ro‘yxati (2 000 ga yaqin). "bankId" — bankning MFO kodi, /didox/org/{tin} dagi "bankCode" bilan bir xil. 7 kunga keshlanadi.',
    },
    params: [],
    responses: [
      {
        label: { en: '200 — success', uz: '200 — muvaffaqiyatli' },
        body: JSON.stringify({ data: [{ bankId: '00475', name: DIDOX_BANK_NAME }], _meta: META }, null, 2),
      },
      ...DIDOX_ERRORS,
    ],
    curl: `curl -u staff_user:password \\
  ${API_ORIGIN}/didox/banks`,
    fetchExample: `const res = await fetch('/api/didox/banks', {
  headers: { Authorization: 'Basic ' + btoa('staff_user:password') },
});
const { data: banks } = await res.json();`,
  },
  {
    id: 'get-didox-regions',
    group: 'didox',
    method: 'GET',
    path: '/didox/regions',
    description: {
      en: 'Regions from the Didox waybill directory, named in English, Uzbek (Latin and Cyrillic) and Russian. Pass a region’s "regionId" to /didox/regions/{region_id}/districts. Cached for 7 days.',
      uz: 'Didox yuk xatlari (TTN) ma’lumotnomasidagi viloyatlar: ingliz, o‘zbek (lotin va kirill) va rus tilidagi nomlari bilan. Viloyatning "regionId" qiymatini /didox/regions/{region_id}/districts ga bering. 7 kunga keshlanadi.',
    },
    params: [],
    responses: [
      {
        label: { en: '200 — success', uz: '200 — muvaffaqiyatli' },
        body: JSON.stringify({ data: [DIDOX_REGION_SAMPLE], _meta: META }, null, 2),
      },
      ...DIDOX_ERRORS,
    ],
    curl: `curl -u staff_user:password \\
  ${API_ORIGIN}/didox/regions`,
    fetchExample: `const res = await fetch('/api/didox/regions', {
  headers: { Authorization: 'Basic ' + btoa('staff_user:password') },
});
const { data: regions } = await res.json();`,
  },
  {
    id: 'get-didox-districts',
    group: 'didox',
    method: 'GET',
    path: '/didox/regions/{region_id}/districts',
    description: {
      en: 'Districts of one region from the Didox waybill directory. An unknown region returns an empty list. Cached for 7 days.',
      uz: 'Didox yuk xatlari (TTN) ma’lumotnomasidan bitta viloyatning tumanlari. Noma’lum viloyat uchun bo‘sh ro‘yxat qaytadi. 7 kunga keshlanadi.',
    },
    params: [
      {
        name: 'region_id',
        in: 'path',
        required: true,
        description: { en: '"regionId" from /didox/regions (for example 3).', uz: '/didox/regions dagi "regionId" (masalan, 3).' },
      },
    ],
    responses: [
      {
        label: { en: '200 — success', uz: '200 — muvaffaqiyatli' },
        body: JSON.stringify({ data: [DIDOX_DISTRICT_SAMPLE], _meta: META }, null, 2),
      },
      {
        label: { en: '422 — invalid region_id', uz: '422 — region_id noto‘g‘ri' },
        body: JSON.stringify({ detail: [{ type: 'int_parsing', loc: ['path', 'region_id'], msg: 'Input should be a valid integer, unable to parse string as an integer', input: 'abc' }] }, null, 2),
      },
      ...DIDOX_ERRORS,
    ],
    curl: `curl -u staff_user:password \\
  ${API_ORIGIN}/didox/regions/1/districts`,
    fetchExample: `const res = await fetch('/api/didox/regions/1/districts', {
  headers: { Authorization: 'Basic ' + btoa('staff_user:password') },
});
const { data: districts } = await res.json();`,
  },
  {
    id: 'get-auth-me',
    group: 'org-info',
    method: 'GET',
    path: '/auth/me',
    description: {
      en: 'Verify credentials and retrieve the authenticated username. Useful for confirming a session is valid.',
      uz: 'Login va parolni tekshirib, autentifikatsiyadan o‘tgan foydalanuvchi nomini qaytaradi. Sessiya haqiqiyligini tasdiqlash uchun qulay.',
    },
    params: [],
    responses: [
      {
        label: { en: '200 — success', uz: '200 — muvaffaqiyatli' },
        body: JSON.stringify({ username: 'staff_user' }, null, 2),
      },
      UNAUTHORIZED,
    ],
    curl: `curl -u staff_user:password \\
  ${API_ORIGIN}/auth/me`,
    fetchExample: `const res = await fetch('/api/auth/me', {
  headers: { Authorization: 'Basic ' + btoa('staff_user:password') },
});
const { username } = await res.json();`,
  },
]

export default function ApiDocsPage() {
  const { hash, key: locationKey } = useLocation()
  const { t } = useI18n()
  const { recent } = useRecentOrgs()
  // Cards start collapsed; the one a link points at (#get-org, …) opens.
  const [openIds, setOpenIds] = useState(() => new Set(hash ? [hash.slice(1)] : []))
  // Param values are shared across cards, so a TIN typed once can be sent to /org/{tin} and then /status.
  const [values, setValues] = useState({ tin: '', q: '', status: '', page: '1', page_size: '20', region_id: '' })
  const [tinTouched, setTinTouched] = useState(false)

  useEffect(() => {
    if (!tinTouched && recent[0]?.tin) setValues((v) => ({ ...v, tin: recent[0].tin }))
  }, [recent, tinTouched])

  // Keyed on the location too, so clicking the same sidebar link again reopens and scrolls.
  useEffect(() => {
    if (!hash) return
    const id = hash.slice(1)
    setOpenIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))
    const frame = requestAnimationFrame(() => {
      const el = document.getElementById(id)
      if (!el) return
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    })
    return () => cancelAnimationFrame(frame)
  }, [hash, locationKey])

  function setOpen(id, open) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (open) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function setValue(name, value) {
    if (name === 'tin') setTinTouched(true)
    setValues((v) => ({ ...v, [name]: value }))
  }

  return (
    <div className="flex flex-col gap-6 pt-2">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">{t('docs.title')}</h1>
          <p className="max-w-prose text-sm text-muted-foreground">{t('docs.subtitle')}</p>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <a href={SWAGGER_URL} target="_blank" rel="noopener noreferrer">
            {t('docs.swagger')}
            <ArrowUpRight />
          </a>
        </Button>
      </div>

      <Alert className="has-[>svg]:grid-cols-[calc(var(--spacing)*4)_minmax(0,1fr)]">
        <KeyRound />
        <AlertTitle>{t('docs.authTitle')}</AlertTitle>
        <AlertDescription className="min-w-0">
          <p>{t('docs.authDescription')}</p>
          <CodeBlock label={t('docs.requestHeader')} code="Authorization: Basic base64(username:password)" className="mt-1 w-full" />
        </AlertDescription>
      </Alert>

      {GROUPS.map((group) => (
        <section
          key={group.id}
          id={group.id}
          aria-labelledby={`${group.id}-heading`}
          className="mt-4 flex scroll-mt-20 flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <h2 id={`${group.id}-heading`} className="flex items-center gap-2.5 text-lg font-semibold">
              {t(`docs.groups.${group.key}.title`)}
              <Badge variant="outline" className="font-mono font-normal">{group.id}</Badge>
            </h2>
            <p className="max-w-prose text-sm text-muted-foreground">{t(`docs.groups.${group.key}.description`)}</p>
          </div>
          {ENDPOINTS.filter((ep) => ep.group === group.id).map((ep) => (
            <EndpointCard
              key={ep.path}
              ep={ep}
              values={values}
              onValueChange={setValue}
              open={openIds.has(ep.id)}
              onOpenChange={(open) => setOpen(ep.id, open)}
            />
          ))}
        </section>
      ))}
    </div>
  )
}

function EndpointCard({ ep, values, onValueChange, open, onOpenChange }) {
  const { t, pick } = useI18n()

  return (
    <section id={ep.id} aria-labelledby={`${ep.id}-title`} className="scroll-mt-20">
      <Collapsible open={open} onOpenChange={onOpenChange} asChild>
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className={cn('py-5', open && 'border-b [.border-b]:pb-5')}>
            <CardTitle id={`${ep.id}-title`} className="flex items-center gap-2.5">
              <Badge className="rounded-md font-mono">{ep.method}</Badge>
              <code className="font-mono text-base font-medium break-all">{ep.path}</code>
            </CardTitle>
            <CardDescription className="max-w-prose leading-relaxed">{pick(ep.description)}</CardDescription>
            <CardAction>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={t(open ? 'docs.collapse' : 'docs.expand', { path: ep.path })}>
                  <ChevronDown className={cn('transition-transform duration-200 motion-reduce:transition-none', open && 'rotate-180')} />
                </Button>
              </CollapsibleTrigger>
            </CardAction>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="flex flex-col gap-6 py-6">
              {ep.params.length > 0 && (
                <DocSection title={t('docs.parameters')}>
                  <dl className="flex flex-col divide-y rounded-md border text-sm sm:hidden">
                    {ep.params.map((p) => (
                      <div key={p.name} className="flex flex-col gap-1.5 p-3">
                        <dt className="flex items-center gap-2">
                          <span className="font-mono">{p.name}</span>
                          <span className="text-muted-foreground">{p.in}</span>
                          {p.required && <Badge variant="secondary">{t('docs.required')}</Badge>}
                        </dt>
                        <dd>{pick(p.description)}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="hidden overflow-hidden rounded-md border sm:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          {['name', 'in', 'required', 'description'].map((h) => (
                            <TableHead key={h} className="h-9">{t(`docs.columns.${h}`)}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ep.params.map((p) => (
                          <TableRow key={p.name}>
                            <TableCell className="font-mono">{p.name}</TableCell>
                            <TableCell className="text-muted-foreground">{p.in}</TableCell>
                            <TableCell>
                              {p.required ? <Badge variant="secondary">{t('docs.required')}</Badge> : <span className="text-muted-foreground">{t('docs.optional')}</span>}
                            </TableCell>
                            <TableCell className="min-w-56 whitespace-normal">{pick(p.description)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </DocSection>
              )}

              <DocSection title={t('tryIt.title')}>
                <TryIt ep={ep} values={values} onValueChange={onValueChange} />
              </DocSection>

              <DocSection title={t('docs.responses')}>
                <Tabs defaultValue="0">
                  <div>
                    <TabsList className="h-auto flex-wrap justify-start group-data-[orientation=horizontal]/tabs:h-auto">
                      {ep.responses.map((r, i) => {
                        const [code, rest = ''] = pick(r.label).split(' — ')
                        return (
                          <TabsTrigger key={i} value={String(i)} className="h-8 flex-none gap-1.5">
                            <span className="font-mono tabular-nums">{code}</span>
                            <span className="text-muted-foreground">{rest.replace(/\s*\(.*\)$/, '')}</span>
                          </TabsTrigger>
                        )
                      })}
                    </TabsList>
                  </div>
                  {ep.responses.map((r, i) => (
                    <TabsContent key={i} value={String(i)}>
                      <CodeBlock label={pick(r.label)} code={r.body} language="json" />
                    </TabsContent>
                  ))}
                </Tabs>
              </DocSection>

              <DocSection title={t('docs.examples')}>
                <Tabs defaultValue="curl">
                  <TabsList>
                    <TabsTrigger value="curl">curl</TabsTrigger>
                    <TabsTrigger value="fetch">JavaScript (fetch)</TabsTrigger>
                  </TabsList>
                  <TabsContent value="curl">
                    <CodeBlock label="Shell" code={ep.curl} />
                  </TabsContent>
                  <TabsContent value="fetch">
                    <CodeBlock label="JavaScript" code={ep.fetchExample} />
                  </TabsContent>
                </Tabs>
              </DocSection>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </section>
  )
}

function buildRequestPath(ep, values) {
  let path = ep.path
  const query = new URLSearchParams()
  for (const p of ep.params) {
    const value = (values[p.name] ?? '').trim()
    if (p.in === 'path') path = path.replace(`{${p.name}}`, encodeURIComponent(value))
    else if (value) query.set(p.name, value)
  }
  const qs = query.toString()
  return qs ? `${path}?${qs}` : path
}

function TryIt({ ep, values, onValueChange }) {
  const { t } = useI18n()
  const [state, setState] = useState({ status: 'idle' })

  const path = buildRequestPath(ep, values)
  const missingRequired = ep.params.some((p) => p.required && !(values[p.name] ?? '').trim())
  const sending = state.status === 'sending'

  async function send(e) {
    e.preventDefault()
    if (missingRequired || sending) return
    setState({ status: 'sending' })
    const started = performance.now()
    try {
      const res = await apiFetch(path)
      const text = await res.text()
      let body = text
      let isJson = false
      try {
        body = JSON.stringify(JSON.parse(text), null, 2)
        isJson = true
      } catch {
        // not JSON; show the raw body
      }
      setState({
        status: 'done',
        code: res.status,
        statusText: res.statusText,
        ms: Math.round(performance.now() - started),
        path,
        body,
        isJson,
      })
    } catch (err) {
      setState({ status: 'error', message: err.message })
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={send} className="flex flex-col gap-3 rounded-lg border p-3">
        {ep.params.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {ep.params.map((p) => (
              <div key={p.name} className="flex flex-col gap-1.5">
                <Label htmlFor={`${ep.id}-${p.name}`} className="font-mono text-xs">
                  {p.name}
                  <span className="font-sans font-normal text-muted-foreground">{p.in}</span>
                </Label>
                <Input
                  id={`${ep.id}-${p.name}`}
                  value={values[p.name] ?? ''}
                  onChange={(e) => onValueChange(p.name, e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono tabular-nums"
                  placeholder={p.name === 'tin' ? '304918546' : undefined}
                />
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <code className="min-w-0 flex-1 truncate rounded-md bg-muted/60 px-2.5 py-1.5 font-mono text-xs">
            <span className="font-medium">{ep.method}</span> {path}
          </code>
          <Button type="submit" size="sm" disabled={missingRequired || sending} className="shrink-0">
            {sending ? <Spinner /> : <Play />}
            {sending ? t('tryIt.sending') : t('tryIt.send')}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('tryIt.runsAs', { user: getUsername() })}
        </p>
      </form>

      {state.status === 'done' && (
        <CodeBlock
          label={
            <span className="flex items-center gap-2">
              <span>{t('tryIt.response')}</span>
              <Badge
                variant="outline"
                className={cn(
                  'font-mono tabular-nums',
                  state.code < 300
                    ? 'border-emerald-600/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'border-destructive/25 bg-destructive/10 text-destructive'
                )}>
                {state.code}
                {state.statusText ? ` ${state.statusText}` : ''}
              </Badge>
              <span className="font-mono tabular-nums">{state.ms} ms</span>
            </span>
          }
          copyLabel={t('tryIt.response')}
          code={state.body || t('tryIt.emptyBody')}
          language={state.isJson ? 'json' : undefined}
        />
      )}
      {state.status === 'error' && (
        <p role="alert" className="text-sm text-destructive">{t('tryIt.networkError', { message: state.message })}</p>
      )}
    </div>
  )
}

function DocSection({ title, children }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium">{title}</h3>
      {children}
    </div>
  )
}

function CodeBlock({ code, label, copyLabel, language, className }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error(t('toast.copyFailed'))
    }
  }

  const ariaName = copyLabel || (typeof label === 'string' ? label : '')

  return (
    <div className={`min-w-0 overflow-hidden rounded-lg border bg-muted/50 ${className || ''}`}>
      <div className="flex items-center justify-between gap-2 border-b py-1 pr-1 pl-3">
        <span className="min-w-0 truncate text-xs text-muted-foreground">{label}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={handleCopy}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={copied ? t('docs.copied') : `${t('docs.copy')}${ariaName ? `: ${ariaName}` : ''}`}>
          {copied ? <Check /> : <Copy />}
        </Button>
      </div>
      <pre className="max-h-96 overflow-auto px-4 py-3 font-mono text-xs leading-relaxed text-foreground">
        <code>{language === 'json' ? highlightJson(code) : code}</code>
      </pre>
    </div>
  )
}
