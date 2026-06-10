import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api/client.js'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/')
    } catch {
      setError('Invalid username or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card} className="login-card">
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🏢</span>
          <h1 style={styles.logoText}>OrgInfo Crawler</h1>
        </div>
        <p style={styles.subtitle}>Sign in to your account</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              placeholder="Enter username"
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="Enter password"
            />
          </div>
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <p style={styles.hint}>
          Accounts are provisioned by administrators only.
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '40px 48px',
    width: '100%',
    maxWidth: 420,
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  logoIcon: { fontSize: 32 },
  logoText: { margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a2e' },
  subtitle: { margin: '0 0 28px', color: '#666', fontSize: 14 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#444' },
  input: {
    padding: '10px 14px',
    border: '1.5px solid #e0e0e0',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  error: {
    margin: 0,
    color: '#e53e3e',
    fontSize: 13,
    background: '#fff5f5',
    border: '1px solid #fed7d7',
    padding: '8px 12px',
    borderRadius: 6,
  },
  button: {
    marginTop: 4,
    padding: '12px',
    background: '#0f3460',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  hint: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 12,
    color: '#aaa',
  },
}
