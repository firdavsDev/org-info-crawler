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
  if (typeof value === 'object') return <pre style={{ margin: 0, fontSize: 12 }}>{JSON.stringify(value, null, 2)}</pre>
  return String(value)
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
