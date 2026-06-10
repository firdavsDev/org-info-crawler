export default function OrgResult({ data }) {
  if (!data || typeof data !== 'object') return null

  const entries = Object.entries(data).filter(([k]) => k !== '_meta')

  return (
    <div style={styles.container}>
      <table style={styles.table} className="org-table">
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key} style={styles.row}>
              <td style={styles.key} className="key-cell">{formatKey(key)}</td>
              <td style={styles.value} className="val-cell">{formatValue(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatKey(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatValue(value) {
  if (value === null || value === undefined) return <span style={{ color: '#a0aec0' }}>—</span>
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'

  // Array of founder objects: [{name, share}, ...]
  if (Array.isArray(value) && value.length > 0 && value[0]?.name !== undefined) {
    return (
      <table style={founderStyles.table}>
        <thead>
          <tr>
            <th style={founderStyles.th}>Name</th>
            <th style={{ ...founderStyles.th, textAlign: 'right' }}>Share</th>
          </tr>
        </thead>
        <tbody>
          {value.map((f, i) => (
            <tr key={i} style={founderStyles.row}>
              <td style={founderStyles.td}>
                {f.name ? (
                  <a
                    href={`https://orginfo.uz/uz/search/founders/?q=${encodeURIComponent(f.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={founderStyles.link}
                  >
                    {f.name}
                    <span style={founderStyles.extIcon}>↗</span>
                  </a>
                ) : '—'}
              </td>
              <td style={{ ...founderStyles.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {f.share ? `${f.share} %` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  // Generic array → bullet list
  if (Array.isArray(value)) {
    return (
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {value.map((item, i) => <li key={i}>{String(item)}</li>)}
      </ul>
    )
  }

  if (typeof value === 'object') return <pre style={{ margin: 0, fontSize: 12 }}>{JSON.stringify(value, null, 2)}</pre>
  return String(value)
}

const founderStyles = {
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: {
    padding: '5px 8px',
    background: '#edf2f7',
    color: '#4a5568',
    fontWeight: 600,
    textAlign: 'left',
    borderBottom: '1px solid #e2e8f0',
  },
  row: { borderBottom: '1px solid #f7fafc' },
  td: { padding: '5px 8px', color: '#1a202c' },
  link: {
    color: '#276749',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  },
  extIcon: { fontSize: 11, color: '#a0aec0' },
}

const styles = {
  container: {
    background: '#fff',
    borderRadius: 10,
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  row: { borderBottom: '1px solid #f7fafc' },
  key: {
    padding: '10px 16px',
    width: '36%',
    fontWeight: 600,
    fontSize: 13,
    color: '#4a5568',
    background: '#f7fafc',
    verticalAlign: 'top',
    whiteSpace: 'nowrap',
  },
  value: {
    padding: '10px 16px',
    fontSize: 14,
    color: '#1a202c',
    wordBreak: 'break-word',
  },
}
