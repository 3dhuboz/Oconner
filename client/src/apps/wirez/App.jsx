import { useState, useEffect, createContext, useContext } from 'react'
import { Routes, Route, Navigate, MemoryRouter } from 'react-router-dom'
import { initFirebase, subscribeToAuth } from './firebase'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NewJob from './pages/NewJob'
import JobsBoard from './pages/JobsBoard'
import JobDetail from './pages/JobDetail'
import FieldCapture from './pages/FieldCapture'
import XeroPage from './pages/XeroPage'
import Settings from './pages/Settings'
import './wirez.css'

// ─── Toast Context ────────────────────────────────────────────────────────────
export const ToastContext = createContext(null)
export function useToast() { return useContext(ToastContext) }

let toastId = 0

// ─── Wirez App (white-label, per-tenant Firebase) ────────────────────────────
export default function WirezApp({ tenantConfig, branding, onExit }) {
  const [firebaseReady, setFirebaseReady] = useState(false)
  const [user, setUser] = useState(undefined) // undefined = loading
  const [toasts, setToasts] = useState([])
  const [error, setError] = useState(null)

  // Initialize Firebase with tenant config
  useEffect(() => {
    if (!tenantConfig || !tenantConfig.apiKey) {
      setError('Firebase not configured. Ask your admin to set up your tenant config.')
      return
    }
    try {
      initFirebase(tenantConfig)
      setFirebaseReady(true)
    } catch (err) {
      setError(`Firebase init failed: ${err.message}`)
    }
  }, [tenantConfig])

  // Subscribe to auth once Firebase is ready
  useEffect(() => {
    if (!firebaseReady) return
    const unsub = subscribeToAuth(u => setUser(u))
    return unsub
  }, [firebaseReady])

  function toast(message, type = 'success', duration = 4000) {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }

  // Error state
  if (error) {
    return (
      <div className="wirez-app">
        <div className="wirez-config-needed">
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
          <h2>{branding?.brandName || 'Wirez'}</h2>
          <p style={{ color: '#8a94a6', marginTop: 8, maxWidth: 400, lineHeight: 1.7 }}>{error}</p>
          {onExit && (
            <button className="wz-btn wz-btn-secondary" style={{ marginTop: 24 }} onClick={onExit}>
              ← Back to Dashboard
            </button>
          )}
        </div>
      </div>
    )
  }

  // Loading Firebase
  if (!firebaseReady || user === undefined) {
    return (
      <div className="wirez-app">
        <div className="wz-loading" style={{ height: '100vh' }}>
          <div className="wz-spinner" />
          Loading…
        </div>
      </div>
    )
  }

  // Not logged in — show tenant login
  if (!user) {
    return (
      <div className="wirez-app">
        <ToastContext.Provider value={toast}>
          <Login branding={branding} onExit={onExit} />
          <Toasts toasts={toasts} />
        </ToastContext.Provider>
      </div>
    )
  }

  // Logged in — show full app
  return (
    <div className="wirez-app">
      <ToastContext.Provider value={toast}>
        <MemoryRouter>
          <div className="wz-app-shell">
            <Sidebar user={user} branding={branding} onExit={onExit} />
            <div className="wz-main-content">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/jobs/new" element={<NewJob />} />
                <Route path="/jobs" element={<JobsBoard />} />
                <Route path="/jobs/:jobId" element={<JobDetail />} />
                <Route path="/jobs/:jobId/field" element={<FieldCapture />} />
                <Route path="/xero" element={<XeroPage />} />
                <Route path="/settings" element={<Settings branding={branding} />} />
              </Routes>
            </div>
          </div>
        </MemoryRouter>
        <Toasts toasts={toasts} />
      </ToastContext.Provider>
    </div>
  )
}

function Toasts({ toasts }) {
  return (
    <div className="wz-toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`wz-toast wz-toast-${t.type}`}>
          <span>{t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}</span>
          {t.message}
        </div>
      ))}
    </div>
  )
}
