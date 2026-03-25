import { NavLink, useNavigate } from 'react-router-dom'
import { logout } from '../firebase'
import { useToast } from '../App'

export default function Sidebar({ user, branding, onExit }) {
  const navigate = useNavigate()
  const toast = useToast()

  async function handleLogout() {
    await logout()
    navigate('/')
    toast('Signed out', 'success')
  }

  const brandName = branding?.brandName || 'Wirez R Us'
  const brandIcon = branding?.brandIcon || '⚡'

  return (
    <div className="wz-sidebar">
      <div className="wz-sidebar-logo">
        <span className="wz-sidebar-logo-icon">{brandIcon}</span>
        <div>
          <div className="wz-sidebar-logo-text">{brandName}</div>
          <div className="wz-sidebar-logo-sub">Operations</div>
        </div>
      </div>

      <nav className="wz-sidebar-nav">
        <div className="wz-sidebar-section">Main</div>

        <NavLink to="/dashboard" className={({ isActive }) => `wz-nav-item ${isActive ? 'active' : ''}`}>
          <span className="wz-icon">📊</span> Dashboard
        </NavLink>

        <NavLink to="/jobs/new" className={({ isActive }) => `wz-nav-item ${isActive ? 'active' : ''}`}>
          <span className="wz-icon">➕</span> New Job
        </NavLink>

        <NavLink to="/jobs" className={({ isActive }) => `wz-nav-item ${isActive ? 'active' : ''}`}>
          <span className="wz-icon">📋</span> Jobs Board
        </NavLink>

        <div className="wz-sidebar-section" style={{ marginTop: 12 }}>Integrations</div>

        <NavLink to="/xero" className={({ isActive }) => `wz-nav-item ${isActive ? 'active' : ''}`}>
          <span className="wz-icon">💰</span> Xero
        </NavLink>

        <div className="wz-sidebar-section" style={{ marginTop: 12 }}>Admin</div>

        <NavLink to="/settings" className={({ isActive }) => `wz-nav-item ${isActive ? 'active' : ''}`}>
          <span className="wz-icon">⚙️</span> Settings
        </NavLink>
      </nav>

      <div className="wz-sidebar-footer">
        <div style={{ fontSize: 12, color: 'var(--wz-text3)', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.email}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="wz-btn wz-btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleLogout}>
            Sign Out
          </button>
          {onExit && (
            <button className="wz-btn wz-btn-secondary" style={{ justifyContent: 'center' }} onClick={onExit} title="Back to Penny Wise">
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
