import { useState } from 'react'
import { login } from '../firebase'
import { useToast } from '../App'

export default function Login({ branding, onExit }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const brandName = branding?.brandName || 'Wirez R Us'
  const brandIcon = branding?.brandIcon || '⚡'

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      toast(err.message.replace('Firebase: ', ''), 'error')
      setLoading(false)
    }
  }

  return (
    <div className="wz-login-page">
      <div className="wz-login-box">
        <div className="wz-login-logo">
          <div className="wz-login-logo-icon">{brandIcon}</div>
          <h1>{brandName}</h1>
          <p>Operational Workflow System</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="wz-form-group">
            <label className="wz-form-label">Email</label>
            <input
              className="wz-form-input"
              type="email"
              placeholder="you@company.com.au"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
            />
          </div>
          <div className="wz-form-group">
            <label className="wz-form-label">Password</label>
            <input
              className="wz-form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button className="wz-btn wz-btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
            {loading ? <><span className="wz-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Signing in…</> : 'Sign In'}
          </button>
        </form>

        {onExit && (
          <button
            className="wz-btn wz-btn-secondary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
            onClick={onExit}
          >
            ← Back to Penny Wise
          </button>
        )}
      </div>
    </div>
  )
}
