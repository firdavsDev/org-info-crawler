import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiFetch } from '../api/client.js'
import OrgResult from '../components/OrgResult.jsx'
import StatusBadge from '../components/StatusBadge.jsx'

const POLL_INTERVAL_MS = 2000
const POLL_TIMEOUT_MS = 60000

const PROGRESS_STAGES = {
  queued:     { ceiling: 20,  speed: 0.8 },
  processing: { ceiling: 88,  speed: 0.4 },
}

const STAGE_LABELS = {
  queued: 'Job queued — waiting for worker…',
  processing: 'Crawling orginfo.uz…',
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

export default function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [tin, setTin] = useState(searchParams.get('tin') || '')
  const [loading, setLoading] = useState(false)
  const [crawlStatus, setCrawlStatus] = useState(null)
  const [result, setResult] = useState(null)
  const [queryError, setQueryError] = useState('')
  const pollTimer = useRef(null)

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
    if (res.status === 422) {
      const body = await res.json()
      throw new Error(body.detail || 'Invalid TIN format.')
    }
    if (res.status === 401) throw new Error('Session expired. Please log in again.')
    if (!res.ok) throw new Error(`Server error: ${res.status}`)
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
    } else if (Date.now() > deadline) {
      clearPoll()
      setCrawlStatus('done')
      setResult({ status: 'failed', error: 'Timed out waiting for crawl result.' })
      setLoading(false)
    }
  }, [])

  const runSearch = useCallback(async (tinValue) => {
    clearPoll()
    setQueryError('')
    setResult(null)
    setCrawlStatus(null)
    setLoading(true)

    try {
      const data = await fetchOrg(tinValue)
      if (data.status === 'ready') {
        setCrawlStatus('done')
        setResult(data)
        setLoading(false)
      } else if (data.status === 'failed' || data.status === 'not_found') {
        setCrawlStatus('done')
        setResult(data)
        setLoading(false)
      } else {
        setCrawlStatus(data.status)
        setResult(data)
        const deadline = Date.now() + POLL_TIMEOUT_MS
        pollTimer.current = setInterval(() => pollStatus(tinValue, deadline), POLL_INTERVAL_MS)
      }
    } catch (err) {
      setQueryError(err.message)
      setCrawlStatus(null)
      setLoading(false)
    }
  }, [pollStatus])

  useEffect(() => {
    const tinParam = searchParams.get('tin')
    if (tinParam) {
      setTin(tinParam)
      runSearch(tinParam)
    }
    return () => clearPoll()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = tin.trim()
    if (!trimmed || trimmed.length < 9) return
    setSearchParams({ tin: trimmed }, { replace: false })
    runSearch(trimmed)
  }

  const isPolling = loading && crawlStatus && crawlStatus !== 'done'
  const showBar = crawlStatus !== null
  const tooShort = tin.length > 0 && tin.length < 9
  const atMax    = tin.length === 14
  const counterColor = tooShort ? '#e53e3e' : atMax ? '#dd6b20' : '#68d391'

  return (
    <div>
      <h2 style={styles.heading}>Organization Lookup</h2>
      <p style={styles.sub}>Enter a Tax Identification Number (TIN / INN) to retrieve organization data.</p>

      <form onSubmit={handleSubmit} style={styles.form} className="search-form">
        <div style={styles.inputWrap}>
          <div style={styles.inputRow}>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={tin}
              onChange={handleTinChange}
              placeholder="e.g. 304918546"
              className="search-input"
              style={{
                ...styles.input,
                borderColor: tooShort ? '#fc8181' : undefined,
              }}
              minLength={9}
              maxLength={14}
              required
            />
            {tin.length > 0 && (
              <span style={{ ...styles.charCount, color: counterColor }}>
                {tin.length}/14
              </span>
            )}
          </div>
          {tooShort && (
            <p style={styles.inputError}>
              Too short — minimum 9 digits ({tin.length} entered)
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || tin.length < 9}
          className="search-button"
          style={{
            ...styles.button,
            opacity: loading || tin.length < 9 ? 0.55 : 1,
            cursor: loading || tin.length < 9 ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {queryError && <p style={styles.error}>{queryError}</p>}

      {result && (
        <div style={styles.resultBox}>
          <div style={styles.resultHeader} className="result-header">
            <span style={{ fontSize: 13, color: '#4a5568', fontWeight: 600 }}>TIN: {tin.trim()}</span>
            <StatusBadge status={result.status} />
            {result._meta && (
              <span style={styles.meta} className="result-meta">
                {result._meta.elapsed_ms}ms · req {result._meta.request_id}
              </span>
            )}
          </div>

          {showBar && (
            <div style={styles.progressWrap}>
              <div style={styles.progressRow}>
                <span style={styles.progressLabel}>
                  {isPolling
                    ? (STAGE_LABELS[crawlStatus] || 'Processing…')
                    : result.status === 'ready'
                      ? '✅ Complete'
                      : 'Finished'}
                </span>
                <span style={styles.progressPct}>{Math.round(progress)}%</span>
              </div>
              <div style={styles.barTrack}>
                <div
                  style={{
                    ...styles.barFill,
                    width: `${progress}%`,
                    background: result.status === 'failed'
                      ? '#fc8181'
                      : progress === 100
                        ? '#68d391'
                        : '#4a90d9',
                  }}
                />
              </div>
              {isPolling && (
                <p style={styles.pollHint}>Checking every 2 s — this page updates automatically.</p>
              )}
            </div>
          )}

          {result.status === 'failed' && result.error && (
            <p style={styles.errorMsg}>{result.error}</p>
          )}

          {result.status === 'not_found' && (
            <p style={styles.notFound}>No organization found for this TIN.</p>
          )}

          {result.status === 'ready' && result.data && (
            <OrgResult data={result.data} />
          )}
        </div>
      )}
    </div>
  )
}

const styles = {
  heading: { margin: '0 0 6px', fontSize: 24, fontWeight: 700, color: '#1a1a2e' },
  sub: { margin: '0 0 24px', color: '#666', fontSize: 14 },
  form: { display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 20 },
  inputWrap: { display: 'flex', flexDirection: 'column', gap: 4 },
  inputRow: { position: 'relative', display: 'flex', alignItems: 'center' },
  input: {
    padding: '11px 44px 11px 16px',
    border: '1.5px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 15,
    outline: 'none',
    width: 240,
    maxWidth: '100%',
    transition: 'border-color 0.2s',
  },
  charCount: {
    position: 'absolute',
    right: 10,
    fontSize: 11,
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
    pointerEvents: 'none',
  },
  inputError: {
    margin: 0,
    fontSize: 12,
    color: '#e53e3e',
  },
  button: {
    padding: '11px 28px',
    background: '#0f3460',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    transition: 'opacity 0.2s',
    flexShrink: 0,
  },
  error: {
    color: '#e53e3e',
    background: '#fff5f5',
    border: '1px solid #fed7d7',
    padding: '8px 12px',
    borderRadius: 6,
    fontSize: 14,
    marginBottom: 12,
  },
  resultBox: {
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  resultHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 20px',
    borderBottom: '1px solid #f0f0f0',
    background: '#fafafa',
  },
  meta: { marginLeft: 'auto', fontSize: 11, color: '#a0aec0' },
  progressWrap: {
    padding: '14px 20px 12px',
    borderBottom: '1px solid #f0f0f0',
  },
  progressRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  progressLabel: { fontSize: 13, color: '#4a5568', fontWeight: 500 },
  progressPct: { fontSize: 13, fontWeight: 700, color: '#2d3748', fontVariantNumeric: 'tabular-nums' },
  barTrack: {
    height: 8,
    background: '#edf2f7',
    borderRadius: 99,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 99,
    transition: 'width 0.1s linear, background 0.4s ease',
  },
  pollHint: { margin: '6px 0 0', fontSize: 11, color: '#a0aec0' },
  errorMsg: { padding: '16px 20px', color: '#c53030', fontSize: 14, margin: 0 },
  notFound: { padding: '16px 20px', color: '#718096', fontSize: 14, margin: 0 },
}
