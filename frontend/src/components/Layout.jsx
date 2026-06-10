import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { logout, getUsername } from '../api/client.js'

export default function Layout() {
  const navigate = useNavigate()
  const username = getUsername()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div style={styles.shell}>
      <nav style={styles.nav} className="nav-shell">
        <div style={styles.navLeft} className="nav-left">
          <span style={styles.brand} className="nav-brand">🏢 OrgInfo Crawler</span>
          <NavLink
            to="/"
            end
            style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.linkActive : {}) })}
          >
            Org Lookup
          </NavLink>
          <NavLink
            to="/docs"
            style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.linkActive : {}) })}
          >
            API Docs
          </NavLink>
        </div>
        <div style={styles.navRight} className="nav-right">
          <span style={styles.user}>👤 {username}</span>
          <button onClick={handleLogout} style={styles.logout}>Logout</button>
        </div>
      </nav>
      <main style={styles.main} className="page-main">
        <Outlet />
      </main>
    </div>
  )
}

const styles = {
  shell: { minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#1a1a2e',
    padding: '0 32px',
    height: 60,
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  },
  navLeft: { display: 'flex', alignItems: 'center', gap: 28 },
  navRight: { display: 'flex', alignItems: 'center', gap: 16 },
  brand: { color: '#fff', fontWeight: 700, fontSize: 17, letterSpacing: '-0.3px' },
  link: {
    color: '#a0aec0',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
    padding: '4px 0',
    borderBottom: '2px solid transparent',
    transition: 'color 0.2s',
  },
  linkActive: { color: '#fff', borderBottom: '2px solid #4a90d9' },
  user: { color: '#a0aec0', fontSize: 13 },
  logout: {
    background: 'transparent',
    border: '1px solid #4a5568',
    color: '#a0aec0',
    borderRadius: 6,
    padding: '5px 12px',
    fontSize: 13,
    cursor: 'pointer',
  },
  main: { flex: 1, padding: '32px', maxWidth: 900, margin: '0 auto', width: '100%' },

}
