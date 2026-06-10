const ENDPOINTS = [
  {
    method: 'GET',
    path: '/org/{tin}',
    description:
      'Look up an organization by its Tax Identification Number (TIN/INN). ' +
      'If the record is not yet cached, a crawl job is enqueued and the response returns status "queued". ' +
      'Poll /org/{tin}/status until the status is "ready" or "failed".',
    params: [
      { name: 'tin', in: 'path', required: true, description: '9–14 digit Tax Identification Number.' },
    ],
    responses: [
      {
        label: '200 — ready (data available)',
        body: JSON.stringify({ status: 'ready', data: { name: 'EXAMPLE LLC', tin: '304918546', director: 'John Doe', address: 'Tashkent, Uzbekistan' }, _meta: { request_id: 'abc-123', elapsed_ms: 42 } }, null, 2),
      },
      {
        label: '200 — queued (crawl started)',
        body: JSON.stringify({ status: 'queued', _meta: { request_id: 'abc-124', elapsed_ms: 5 } }, null, 2),
      },
      {
        label: '200 — failed',
        body: JSON.stringify({ status: 'failed', error: 'Crawler returned no data.', _meta: { request_id: 'abc-125', elapsed_ms: 12 } }, null, 2),
      },
      {
        label: '401 — unauthorized',
        body: JSON.stringify({ detail: 'Invalid credentials' }, null, 2),
      },
      {
        label: '422 — invalid TIN',
        body: JSON.stringify({ detail: 'Invalid TIN: must be 9–14 digits.' }, null, 2),
      },
    ],
    curl: `curl -u staff_user:password \\
  http://localhost:8000/org/304918546`,
    fetchExample: `const res = await fetch('/api/org/304918546', {
  headers: { Authorization: 'Basic ' + btoa('staff_user:password') },
});
const data = await res.json();
console.log(data.status, data.data);`,
  },
  {
    method: 'GET',
    path: '/org/{tin}/status',
    description:
      'Check the crawl status for a given TIN. Use this to poll after receiving "queued" or "processing" from /org/{tin}.',
    params: [
      { name: 'tin', in: 'path', required: true, description: '9–14 digit Tax Identification Number.' },
    ],
    responses: [
      {
        label: '200 — processing',
        body: JSON.stringify({ status: 'processing', _meta: { request_id: 'abc-126', elapsed_ms: 3 } }, null, 2),
      },
      {
        label: '200 — ready',
        body: JSON.stringify({ status: 'ready', _meta: { request_id: 'abc-127', elapsed_ms: 2 } }, null, 2),
      },
      {
        label: '200 — not found',
        body: JSON.stringify({ status: 'not_found' }, null, 2),
      },
      {
        label: '200 — failed',
        body: JSON.stringify({ status: 'failed', error: 'Crawler returned no data.' }, null, 2),
      },
    ],
    curl: `curl -u staff_user:password \\
  http://localhost:8000/org/304918546/status`,
    fetchExample: `const res = await fetch('/api/org/304918546/status', {
  headers: { Authorization: 'Basic ' + btoa('staff_user:password') },
});
const { status } = await res.json();
// status: 'queued' | 'processing' | 'ready' | 'failed' | 'not_found'`,
  },
  {
    method: 'GET',
    path: '/auth/me',
    description: 'Verify credentials and retrieve the authenticated username. Useful for confirming a session is valid.',
    params: [],
    responses: [
      {
        label: '200 — success',
        body: JSON.stringify({ username: 'staff_user' }, null, 2),
      },
      {
        label: '401 — unauthorized',
        body: JSON.stringify({ detail: 'Invalid credentials' }, null, 2),
      },
    ],
    curl: `curl -u staff_user:password \\
  http://localhost:8000/auth/me`,
    fetchExample: `const res = await fetch('/api/auth/me', {
  headers: { Authorization: 'Basic ' + btoa('staff_user:password') },
});
const { username } = await res.json();`,
  },
]

export default function ApiDocsPage() {
  return (
    <div>
      <div style={styles.header} className="docs-header">
        <div>
          <h2 style={styles.heading}>API Documentation</h2>
          <p style={styles.sub}>
            All endpoints require HTTP Basic Authentication.
            Accounts are provisioned via CLI — contact your administrator.
          </p>
        </div>
        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noopener noreferrer"
          style={styles.swaggerLink}
        >
          Open Swagger UI ↗
        </a>
      </div>

      <div style={styles.authBox}>
        <strong>Authentication</strong>
        <p style={{ margin: '4px 0 0', fontSize: 13 }}>
          Pass credentials as HTTP Basic Auth on every request:
        </p>
        <code style={styles.inlineCode}>Authorization: Basic base64(username:password)</code>
      </div>

      {ENDPOINTS.map((ep) => (
        <EndpointCard key={ep.path} ep={ep} />
      ))}
    </div>
  )
}

function EndpointCard({ ep }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={styles.method}>{ep.method}</span>
        <code style={styles.path}>{ep.path}</code>
      </div>
      <p style={styles.desc}>{ep.description}</p>

      {ep.params.length > 0 && (
        <section style={styles.section}>
          <h4 style={styles.sectionTitle}>Parameters</h4>
          <table style={styles.table}>
            <thead>
              <tr>
                {['Name', 'In', 'Required', 'Description'].map((h) => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ep.params.map((p) => (
                <tr key={p.name}>
                  <td style={styles.td}><code>{p.name}</code></td>
                  <td style={styles.td}>{p.in}</td>
                  <td style={styles.td}>{p.required ? '✅ Yes' : 'No'}</td>
                  <td style={styles.td}>{p.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section style={styles.section}>
        <h4 style={styles.sectionTitle}>Responses</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {ep.responses.map((r) => (
            <div key={r.label}>
              <div style={styles.responseLabel}>{r.label}</div>
              <pre style={styles.pre}>{r.body}</pre>
            </div>
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <h4 style={styles.sectionTitle}>Examples</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={styles.exampleLang}>curl</div>
            <pre style={styles.pre}>{ep.curl}</pre>
          </div>
          <div>
            <div style={styles.exampleLang}>JavaScript (fetch)</div>
            <pre style={styles.pre}>{ep.fetchExample}</pre>
          </div>
        </div>
      </section>
    </div>
  )
}

const styles = {
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 16,
  },
  heading: { margin: '0 0 6px', fontSize: 24, fontWeight: 700, color: '#1a1a2e' },
  sub: { margin: 0, color: '#666', fontSize: 14 },
  swaggerLink: {
    display: 'inline-block',
    whiteSpace: 'nowrap',
    padding: '8px 16px',
    background: '#48bb78',
    color: '#fff',
    borderRadius: 7,
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 600,
    marginTop: 4,
  },
  authBox: {
    background: '#ebf8ff',
    border: '1px solid #bee3f8',
    borderRadius: 8,
    padding: '12px 16px',
    marginBottom: 24,
    fontSize: 14,
    color: '#2b6cb0',
  },
  inlineCode: {
    display: 'block',
    marginTop: 6,
    fontFamily: 'monospace',
    fontSize: 13,
    background: '#dbeafe',
    padding: '4px 8px',
    borderRadius: 4,
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    marginBottom: 24,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 20px',
    background: '#f7fafc',
    borderBottom: '1px solid #e2e8f0',
  },
  method: {
    background: '#0f3460',
    color: '#fff',
    padding: '3px 10px',
    borderRadius: 5,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1,
  },
  path: { fontSize: 15, fontWeight: 600, color: '#1a202c' },
  desc: { padding: '14px 20px', margin: 0, color: '#4a5568', fontSize: 14 },
  section: { padding: '0 20px 16px' },
  sectionTitle: { margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: 0.5 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '7px 10px', background: '#f7fafc', color: '#718096', fontWeight: 600, borderBottom: '1px solid #e2e8f0' },
  td: { padding: '7px 10px', borderBottom: '1px solid #f7fafc', color: '#1a202c' },
  responseLabel: { fontSize: 12, fontWeight: 600, color: '#718096', marginBottom: 4 },
  pre: {
    margin: 0,
    padding: '12px 14px',
    background: '#1a202c',
    color: '#e2e8f0',
    borderRadius: 7,
    fontSize: 12.5,
    overflowX: 'auto',
    lineHeight: 1.6,
  },
  exampleLang: { fontSize: 11, fontWeight: 600, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
}
