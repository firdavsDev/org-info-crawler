const STATUS_STYLES = {
  queued:     { background: '#ebf8ff', color: '#2b6cb0', border: '#bee3f8' },
  processing: { background: '#fffbeb', color: '#b7791f', border: '#fbd38d' },
  ready:      { background: '#f0fff4', color: '#276749', border: '#c6f6d5' },
  failed:     { background: '#fff5f5', color: '#c53030', border: '#fed7d7' },
  not_found:  { background: '#f7fafc', color: '#718096', border: '#e2e8f0' },
}

const STATUS_LABELS = {
  queued: '⏳ Queued',
  processing: '⚙️ Processing',
  ready: '✅ Ready',
  failed: '❌ Failed',
  not_found: '🔍 Not Found',
}

export default function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.not_found
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: 13,
      fontWeight: 600,
      background: s.background,
      color: s.color,
      border: `1px solid ${s.border}`,
    }}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}
