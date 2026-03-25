import { useState } from 'react'
import { useToast } from '../App'

export default function Settings({ branding }) {
  const toast = useToast()
  const brandName = branding?.brandName || 'Wirez R Us'

  return (
    <>
      <div className="wz-page-header">
        <div><div className="wz-page-title">Settings</div><div className="wz-page-subtitle">App configuration</div></div>
      </div>
      <div className="wz-page-body">
        <div className="wz-two-col" style={{ alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="wz-card">
              <div className="wz-card-title">Firebase Config</div>
              <p style={{ color: 'var(--wz-text2)', fontSize: 13, lineHeight: 1.7, marginBottom: 12 }}>
                Your Firebase project is managed by your Penny Wise subscription. Contact your admin to update credentials.
              </p>
              <div style={{ background: 'var(--wz-bg3)', borderRadius: 'var(--wz-radius)', padding: 14, fontFamily: 'monospace', fontSize: 12, color: 'var(--wz-text2)', lineHeight: 2 }}>
                Status: Connected via Penny Wise<br />
                Auth: Firebase Email/Password<br />
                Database: Cloud Firestore<br />
                Storage: Firebase Storage
              </div>
            </div>
            <div className="wz-card">
              <div className="wz-card-title">Firestore Security Rules</div>
              <p style={{ color: 'var(--wz-text2)', fontSize: 13, lineHeight: 1.7, marginBottom: 12 }}>
                Deploy these rules in Firebase Console {'\u2192'} Firestore {'\u2192'} Rules:
              </p>
              <pre style={{ background: 'var(--wz-bg3)', borderRadius: 'var(--wz-radius)', padding: 14, fontSize: 11.5, color: 'var(--wz-text2)', overflowX: 'auto', lineHeight: 1.8 }}>
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`}
              </pre>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="wz-card">
              <div className="wz-card-title">About</div>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>{branding?.brandIcon || '\u26A1'}</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{brandName}</div>
                <div style={{ color: 'var(--wz-text3)', fontSize: 13, marginTop: 4 }}>Operational Workflow System</div>
                <div style={{ color: 'var(--wz-text3)', fontSize: 12, marginTop: 8 }}>Powered by Penny Wise I.T.</div>
              </div>
            </div>
            <div className="wz-card">
              <div className="wz-card-title">Integrations</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Xero Accounting</div>
                  <div style={{ fontSize: 12, color: 'var(--wz-text3)', marginTop: 2 }}>Invoice creation and reconciliation</div>
                </div>
                <a href="#/xero" style={{ color: 'var(--wz-accent)', fontSize: 13 }}>Configure {'\u2192'}</a>
              </div>
            </div>
            <div className="wz-card">
              <div className="wz-card-title">Setup Checklist</div>
              {['Firebase project created', 'Firebase Auth enabled (Email/Password)', 'Firestore database created', 'Firebase Storage enabled', 'Security rules deployed', 'First user created in Firebase Auth', 'Xero app created (optional)', 'Xero credentials configured (optional)'].map((item, i) => (
                <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < 7 ? '1px solid rgba(42,48,71,0.4)' : 'none', cursor: 'pointer' }}>
                  <input type="checkbox" style={{ accentColor: 'var(--wz-accent)', width: 14, height: 14 }} />
                  <span style={{ fontSize: 12.5, color: 'var(--wz-text2)' }}>{item}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
