import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Settings, Save, CreditCard, Mail, Globe, Phone, Facebook,
  Building, Shield, Server, Eye, EyeOff, Loader2, CheckCircle, AlertTriangle,
  DollarSign, Edit, Trash2, Plus, ChevronDown, ChevronUp, Palette, ExternalLink
} from 'lucide-react';
import api from '../api';
import { useClientConfig } from '../context/ClientConfigContext';
import toast from 'react-hot-toast';
import './Admin.css';

const AdminSettings = () => {
  const { clientMode } = useClientConfig();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState({});
  const [activeTab, setActiveTab] = useState(clientMode ? 'branding' : 'business');
  const [editingPlan, setEditingPlan] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  useEffect(() => {
    api.get('/settings').then(res => {
      setSettings(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const saveSettings = async (partial) => {
    setSaving(true);
    try {
      const res = await api.put('/settings', partial || settings);
      setSettings(res.data.settings);
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
    setSaving(false);
  };

  const updateField = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const toggleSecret = (key) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const SecretField = ({ label, field, placeholder }) => (
    <div className="form-group">
      <label>{label}</label>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type={showSecrets[field] ? 'text' : 'password'}
          value={settings[field] || ''}
          onChange={e => updateField(field, e.target.value)}
          placeholder={placeholder}
          style={{ flex: 1 }}
        />
        <button type="button" onClick={() => toggleSecret(field)} className="btn btn-sm btn-secondary" style={{ padding: '0.5rem' }}>
          {showSecrets[field] ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );

  const saveHostingPlan = (plan, index) => {
    const plans = [...(settings.hostingPlans || [])];
    if (index >= 0) {
      plans[index] = plan;
    } else {
      plans.push(plan);
    }
    const updated = { ...settings, hostingPlans: plans };
    setSettings(updated);
    saveSettings({ hostingPlans: plans });
    setEditingPlan(null);
  };

  const deletePlan = (index) => {
    if (!window.confirm('Delete this hosting plan?')) return;
    const plans = [...(settings.hostingPlans || [])];
    plans.splice(index, 1);
    setSettings(prev => ({ ...prev, hostingPlans: plans }));
    saveSettings({ hostingPlans: plans });
  };

  if (loading) return <div className="page-loading">Loading settings...</div>;
  if (!settings) return <div className="page-loading">Failed to load settings</div>;

  const tabs = clientMode ? [
    { key: 'branding', label: 'Branding', icon: Palette },
    { key: 'business', label: 'Business Info', icon: Building },
  ] : [
    { key: 'business', label: 'Business Info', icon: Building },
    { key: 'payment', label: 'Payment Gateway', icon: CreditCard },
    { key: 'email', label: 'Email Server', icon: Mail },
    { key: 'hosting', label: 'Hosting Plans', icon: Server },
    { key: 'siteground', label: 'SiteGround', icon: Globe },
    { key: 'endpoints', label: 'API Endpoints', icon: Shield },
  ];

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Logo must be under 2MB'); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result;
      setLogoPreview(base64);
      try {
        const res = await api.put('/settings', { brandLogoUrl: base64 });
        setSettings(res.data.settings);
        toast.success('Logo uploaded');
      } catch (err) {
        toast.error('Failed to upload logo');
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="admin-page">
      <div className="container" style={{ padding: '2rem 1.5rem' }}>
        <Link to="/admin" className="back-link"><ArrowLeft size={16} /> Back to Admin</Link>
        <div className="admin-header">
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={24} style={{ color: 'var(--primary)' }} /> {clientMode ? 'App Settings' : 'Admin Settings'}
            </h1>
            <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>
              {clientMode ? 'Customise your branding, business info, and app settings' : 'Payment gateway, email, hosting plans, and business configuration'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`btn btn-sm ${activeTab === tab.key ? 'btn-primary' : 'btn-secondary'}`}
                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}
              >
                <Icon size={14} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Branding Tab — Client Mode */}
        {activeTab === 'branding' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Palette size={18} /> Branding & Appearance
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#9ca3af', marginBottom: '1.25rem' }}>
              Customise how your app looks. Changes apply across your entire app.
            </p>

            {/* Logo Upload */}
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#d1d5db', display: 'block', marginBottom: '0.5rem' }}>Logo</label>
                <div style={{ width: 100, height: 100, borderRadius: 12, border: '2px dashed rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: 'rgba(255,255,255,0.03)' }}>
                  {(logoPreview || settings.brandLogoUrl) ? (
                    <img src={logoPreview || settings.brandLogoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Palette size={32} style={{ color: '#4b5563' }} />
                  )}
                </div>
                <label className="btn btn-sm btn-secondary" style={{ marginTop: '0.5rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Edit size={12} /> Upload
                  <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
                </label>
              </div>
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Brand Name</label>
                  <input value={settings.brandName || ''} onChange={e => updateField('brandName', e.target.value)} placeholder="Your Business Name" />
                </div>
                <div className="form-group">
                  <label>Tagline</label>
                  <input value={settings.brandTagline || ''} onChange={e => updateField('brandTagline', e.target.value)} placeholder="Your catchy tagline" />
                </div>
                <div className="form-group">
                  <label>Primary Colour</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="color" value={settings.brandPrimaryColor || '#7c3aed'} onChange={e => updateField('brandPrimaryColor', e.target.value)} style={{ width: 40, height: 38, border: 'none', borderRadius: 6, cursor: 'pointer' }} />
                    <input value={settings.brandPrimaryColor || '#7c3aed'} onChange={e => updateField('brandPrimaryColor', e.target.value)} style={{ flex: 1 }} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Accent Colour</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="color" value={settings.brandAccentColor || '#f59e0b'} onChange={e => updateField('brandAccentColor', e.target.value)} style={{ width: 40, height: 38, border: 'none', borderRadius: 6, cursor: 'pointer' }} />
                    <input value={settings.brandAccentColor || '#f59e0b'} onChange={e => updateField('brandAccentColor', e.target.value)} style={{ flex: 1 }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Hero Image */}
            <div className="form-group">
              <label>Hero / Banner Image URL</label>
              <input value={settings.brandHeroImage || ''} onChange={e => updateField('brandHeroImage', e.target.value)} placeholder="https://... or leave blank for default" />
              {settings.brandHeroImage && (
                <img src={settings.brandHeroImage} alt="Hero preview" style={{ marginTop: '0.5rem', maxHeight: 120, borderRadius: 8, objectFit: 'cover' }} />
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button onClick={() => saveSettings()} className="btn btn-primary" disabled={saving}>
                {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />} Save Branding
              </button>
            </div>
          </div>
        )}

        {/* Business Info Tab */}
        {activeTab === 'business' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building size={18} /> Business Information
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Business Name</label>
                <input value={settings.businessName || ''} onChange={e => updateField('businessName', e.target.value)} />
              </div>
              <div className="form-group">
                <label>ABN</label>
                <input value={settings.businessABN || ''} onChange={e => updateField('businessABN', e.target.value)} placeholder="XX XXX XXX XXX" />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={settings.businessEmail || ''} onChange={e => updateField('businessEmail', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input value={settings.businessPhone || ''} onChange={e => updateField('businessPhone', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Facebook Page</label>
                <input value={settings.businessFacebook || ''} onChange={e => updateField('businessFacebook', e.target.value)} placeholder="https://facebook.com/..." />
              </div>
              <div className="form-group">
                <label>Instagram</label>
                <input value={settings.businessInstagram || ''} onChange={e => updateField('businessInstagram', e.target.value)} placeholder="https://instagram.com/..." />
              </div>
              <div className="form-group">
                <label>LinkedIn</label>
                <input value={settings.businessLinkedin || ''} onChange={e => updateField('businessLinkedin', e.target.value)} placeholder="https://linkedin.com/..." />
              </div>
              <div className="form-group">
                <label>Website</label>
                <input value={settings.businessWebsite || ''} onChange={e => updateField('businessWebsite', e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button onClick={() => saveSettings()} className="btn btn-primary" disabled={saving}>
                {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />} Save Business Info
              </button>
            </div>
          </div>
        )}

        {/* Payment Gateway Tab */}
        {activeTab === 'payment' && (
          <div>
            {/* Status Banner */}
            <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1rem', background: settings.squareAccessToken ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)', border: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                {settings.squareAccessToken ? <CheckCircle size={16} style={{ color: '#10b981' }} /> : <AlertTriangle size={16} style={{ color: '#f59e0b' }} />}
                {settings.squareAccessToken ? 'Square API connected' : 'Square API not configured — payments will not process'}
                <span style={{ marginLeft: 'auto', fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: 4, background: settings.squareEnvironment === 'production' ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.12)', color: settings.squareEnvironment === 'production' ? '#ef4444' : '#3b82f6', fontWeight: 700 }}>
                  {settings.squareEnvironment === 'production' ? 'LIVE' : 'SANDBOX'}
                </span>
              </div>
            </div>

            {/* Quick Links */}
            <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1rem', background: 'rgba(124,58,237,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', fontWeight: 600, color: '#c4b5fd', marginBottom: '0.5rem' }}>
                <ExternalLink size={14} /> Square Dashboard Links
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <a href="https://developer.squareup.com/apps" target="_blank" rel="noopener noreferrer"
                  style={{ padding: '0.3rem 0.65rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, background: 'rgba(124,58,237,0.15)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.25)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Globe size={11} /> Developer Apps
                </a>
                <a href="https://developer.squareup.com/apps" target="_blank" rel="noopener noreferrer"
                  style={{ padding: '0.3rem 0.65rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, background: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.25)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <CreditCard size={11} /> Credentials & API Keys
                </a>
                <a href="https://developer.squareup.com/apps" target="_blank" rel="noopener noreferrer"
                  style={{ padding: '0.3rem 0.65rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, background: 'rgba(245,158,11,0.15)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.25)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Shield size={11} /> Webhooks
                </a>
                <a href="https://squareup.com/dashboard/locations" target="_blank" rel="noopener noreferrer"
                  style={{ padding: '0.3rem 0.65rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.25)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Building size={11} /> Locations
                </a>
              </div>
            </div>

            {/* API Credentials */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e5e7eb' }}>
                <CreditCard size={16} style={{ color: '#7c3aed' }} /> API Credentials
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '1rem' }}>
                Found in <a href="https://developer.squareup.com/apps" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', textDecoration: 'underline' }}>Square Developer Dashboard</a> &rarr; select your app &rarr; <strong>Credentials</strong> tab
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <SecretField label="Access Token" field="squareAccessToken" placeholder="sq0atp-..." />
                  <span style={{ fontSize: '0.6875rem', color: '#6b7280' }}>
                    Production: starts with <code style={{ color: '#818cf8' }}>EAAAl...</code> &nbsp;|&nbsp; Sandbox: starts with <code style={{ color: '#818cf8' }}>EAAAEq...</code>
                  </span>
                </div>
                <div className="form-group">
                  <label>Location ID</label>
                  <input value={settings.squareLocationId || ''} onChange={e => updateField('squareLocationId', e.target.value)} placeholder="LXXXXXXXXXXXXXXX" />
                  <span style={{ fontSize: '0.6875rem', color: '#6b7280' }}>
                    Found in <a href="https://squareup.com/dashboard/locations" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', textDecoration: 'underline' }}>Square Dashboard &rarr; Locations</a> or Developer &rarr; Locations tab
                  </span>
                </div>
              </div>
            </div>

            {/* Environment */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e5e7eb' }}>
                <Server size={16} style={{ color: '#3b82f6' }} /> Environment
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '1rem' }}>
                Use <strong>Sandbox</strong> for testing with fake payments. Switch to <strong>Production</strong> when ready to take real payments.
              </p>
              <div className="form-group" style={{ maxWidth: 320 }}>
                <label>Environment</label>
                <select value={settings.squareEnvironment || 'sandbox'} onChange={e => updateField('squareEnvironment', e.target.value)}>
                  <option value="sandbox">Sandbox (Testing)</option>
                  <option value="production">Production (Live)</option>
                </select>
              </div>
              {settings.squareEnvironment === 'production' && (
                <div style={{ padding: '0.5rem 0.75rem', borderRadius: 6, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: '0.75rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <AlertTriangle size={14} style={{ color: '#ef4444', flexShrink: 0 }} />
                  <span><strong>Live mode active</strong> — real payments will be processed. Make sure your Access Token is a production token.</span>
                </div>
              )}
            </div>

            {/* Webhook Configuration */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e5e7eb' }}>
                <Shield size={16} style={{ color: '#f59e0b' }} /> Webhook Configuration
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                Webhooks let Square notify your app about payment events (completed, refunded, etc.)
              </p>

              {/* Webhook Endpoint URL */}
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#d1d5db' }}>Your Webhook Endpoint URL</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    readOnly
                    value={`${window.location.origin}/api/square/webhook`}
                    style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.8125rem', background: 'rgba(255,255,255,0.03)', color: '#6ee7b7' }}
                    onClick={e => { e.target.select(); navigator.clipboard.writeText(e.target.value).then(() => toast.success('Webhook URL copied!')).catch(() => {}); }}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    style={{ padding: '0.5rem 0.75rem', whiteSpace: 'nowrap' }}
                    onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/api/square/webhook`).then(() => toast.success('Webhook URL copied!')).catch(() => {}); }}
                  >
                    Copy
                  </button>
                </div>
                <span style={{ fontSize: '0.6875rem', color: '#6b7280' }}>
                  Paste this URL into Square Developer Dashboard &rarr; Webhooks &rarr; Add Webhook
                </span>
              </div>

              {/* Events to subscribe */}
              <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#93c5fd', marginBottom: '0.375rem' }}>Events to subscribe to in Square:</p>
                <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                  {['payment.completed', 'payment.updated', 'order.updated', 'refund.created', 'refund.updated'].map(evt => (
                    <span key={evt} style={{ padding: '0.15rem 0.5rem', borderRadius: 4, fontSize: '0.6875rem', fontFamily: 'monospace', fontWeight: 600, background: 'rgba(59,130,246,0.12)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.2)' }}>
                      {evt}
                    </span>
                  ))}
                </div>
              </div>

              {/* How to find signature key */}
              <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fcd34d', marginBottom: '0.5rem' }}>How to find your Webhook Signature Key:</p>
                <ol style={{ fontSize: '0.75rem', color: '#9ca3af', paddingLeft: '1.25rem', margin: 0, lineHeight: 1.8 }}>
                  <li>Go to <a href="https://developer.squareup.com/apps" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', textDecoration: 'underline' }}>developer.squareup.com/apps</a></li>
                  <li>Select your application</li>
                  <li>Click the <strong style={{ color: '#e5e7eb' }}>Webhooks</strong> tab in the left sidebar</li>
                  <li>Click <strong style={{ color: '#e5e7eb' }}>Add Webhook</strong>, paste the endpoint URL above, and select the events listed above</li>
                  <li>Once saved, the <strong style={{ color: '#e5e7eb' }}>Signature Key</strong> is shown on the webhook details page — copy it below</li>
                </ol>
              </div>

              <SecretField label="Webhook Signature Key" field="squareWebhookSecret" placeholder="e.g. abc123XYZ..." />
              <span style={{ fontSize: '0.6875rem', color: '#6b7280' }}>
                Used to verify that incoming webhook requests are genuinely from Square. Leave blank if you haven't set up webhooks yet.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={async () => {
                  try {
                    toast.loading('Testing Square connection...', { id: 'sq-test' });
                    const res = await api.post('/settings/test-square');
                    toast.success(`${res.data.message}\n${res.data.locationMatch}`, { id: 'sq-test', duration: 6000 });
                  } catch (err) {
                    toast.error(err.response?.data?.message || 'Connection test failed', { id: 'sq-test', duration: 6000 });
                  }
                }}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
              >
                <CheckCircle size={14} /> Test Connection
              </button>
              <button onClick={() => saveSettings()} className="btn btn-primary" disabled={saving}>
                {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />} Save Payment Settings
              </button>
            </div>
          </div>
        )}

        {/* Email Server Tab */}
        {activeTab === 'email' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mail size={18} /> SMTP Email Server
            </h3>
            <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', background: settings.smtpHost ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)', border: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                {settings.smtpHost ? <CheckCircle size={14} style={{ color: '#10b981' }} /> : <AlertTriangle size={14} style={{ color: '#f59e0b' }} />}
                {settings.smtpHost ? `SMTP: ${settings.smtpHost}:${settings.smtpPort}` : 'SMTP not configured — emails will not send'}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>SMTP Host</label>
                <input value={settings.smtpHost || ''} onChange={e => updateField('smtpHost', e.target.value)} placeholder="smtp.gmail.com" />
              </div>
              <div className="form-group">
                <label>SMTP Port</label>
                <input type="number" value={settings.smtpPort || 587} onChange={e => updateField('smtpPort', parseInt(e.target.value))} />
              </div>
              <div className="form-group">
                <label>SMTP Username</label>
                <input value={settings.smtpUser || ''} onChange={e => updateField('smtpUser', e.target.value)} placeholder="your@email.com" />
              </div>
              <SecretField label="SMTP Password" field="smtpPass" placeholder="App password or SMTP password" />
              <div className="form-group">
                <label>From Name</label>
                <input value={settings.smtpFromName || ''} onChange={e => updateField('smtpFromName', e.target.value)} placeholder="Penny Wise I.T" />
              </div>
              <div className="form-group">
                <label>From Email</label>
                <input type="email" value={settings.smtpFromEmail || ''} onChange={e => updateField('smtpFromEmail', e.target.value)} placeholder="noreply@pennywiseit.com.au" />
              </div>
              <div className="form-group">
                <label>Use TLS/SSL</label>
                <select value={settings.smtpSecure ? 'true' : 'false'} onChange={e => updateField('smtpSecure', e.target.value === 'true')}>
                  <option value="false">STARTTLS (Port 587)</option>
                  <option value="true">SSL/TLS (Port 465)</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button onClick={() => saveSettings()} className="btn btn-primary" disabled={saving}>
                {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />} Save Email Settings
              </button>
            </div>
          </div>
        )}

        {/* Hosting Plans Tab */}
        {activeTab === 'hosting' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Server size={18} /> Hosting Plans ({(settings.hostingPlans || []).length})
              </h3>
              <button onClick={() => setEditingPlan({ key: '', name: '', price: 0, yearlyPrice: 0, storage: '', bandwidth: '', emails: '', domains: '', features: [], isActive: true, color: '#3b82f6', _isNew: true })} className="btn btn-primary btn-sm">
                <Plus size={14} /> Add Plan
              </button>
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
              {(settings.hostingPlans || []).map((plan, idx) => (
                <div key={idx} className="card" style={{ padding: '1.25rem', borderLeft: `3px solid ${plan.color || '#3b82f6'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{plan.name}</h4>
                      <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>
                        ${plan.price}/mo · ${plan.yearlyPrice || 0}/yr · {plan.storage} · {plan.domains}
                      </div>
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                        {(plan.features || []).map((f, i) => (
                          <span key={i} style={{ fontSize: '0.6875rem', padding: '0.125rem 0.375rem', borderRadius: 4, background: 'var(--gray-100)', color: 'var(--gray-600)' }}>{f}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button onClick={() => setEditingPlan({ ...plan, _index: idx })} className="btn btn-sm btn-secondary"><Edit size={12} /></button>
                      <button onClick={() => deletePlan(idx)} className="btn btn-sm btn-danger"><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="card" style={{ padding: '1rem', marginTop: '1.5rem' }}>
              <h4 style={{ fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Globe size={16} /> Domain Sales
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Domain Sales Enabled</label>
                  <select value={settings.domainSalesEnabled ? 'true' : 'false'} onChange={e => updateField('domainSalesEnabled', e.target.value === 'true')}>
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Domain Markup ($)</label>
                  <input type="number" value={settings.domainMarkup || 0} onChange={e => updateField('domainMarkup', parseFloat(e.target.value))} />
                </div>
              </div>
              <div className="form-group">
                <label>Domain Sales Notes (internal)</label>
                <textarea rows={3} value={settings.domainNotes || ''} onChange={e => updateField('domainNotes', e.target.value)} placeholder="e.g. Register through SiteGround, add to GoGeek account..." />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => saveSettings()} className="btn btn-primary" disabled={saving}>
                  {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />} Save
                </button>
              </div>
            </div>

            {/* Edit Plan Modal */}
            {editingPlan && (
              <PlanEditModal plan={editingPlan} onSave={saveHostingPlan} onClose={() => setEditingPlan(null)} />
            )}
          </div>
        )}

        {/* SiteGround Tab */}
        {activeTab === 'siteground' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Globe size={18} /> SiteGround / GoGeek Integration
            </h3>
            <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', background: settings.sitegroundApiToken ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)', border: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                {settings.sitegroundApiToken ? <CheckCircle size={14} style={{ color: '#10b981' }} /> : <AlertTriangle size={14} style={{ color: '#f59e0b' }} />}
                {settings.sitegroundApiToken ? 'SiteGround API connected' : 'SiteGround API not configured'}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>API URL</label>
                <input value={settings.sitegroundApiUrl || ''} onChange={e => updateField('sitegroundApiUrl', e.target.value)} />
              </div>
              <SecretField label="API Token" field="sitegroundApiToken" placeholder="Your SiteGround API token" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button onClick={() => saveSettings()} className="btn btn-primary" disabled={saving}>
                {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />} Save SiteGround Settings
              </button>
            </div>
          </div>
        )}

        {/* API Endpoints Tab */}
        {activeTab === 'endpoints' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={18} /> API Endpoints Reference
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginBottom: '1rem' }}>All registered API routes for this application.</p>
            {[
              { group: 'Auth', routes: ['POST /api/auth/login', 'POST /api/auth/register', 'GET /api/auth/me', 'PUT /api/auth/profile', 'POST /api/auth/google'] },
              { group: 'Marketplace', routes: ['GET /api/marketplace/apps', 'GET /api/marketplace/apps/:slug', 'GET /api/marketplace/my-apps', 'POST /api/marketplace/subscribe', 'PUT /api/marketplace/admin/apps/:appId', 'POST /api/marketplace/admin/grant-free', 'POST /api/marketplace/admin/subscribe', 'POST /api/marketplace/admin/cancel', 'GET /api/marketplace/admin/subscriptions', 'GET /api/marketplace/admin/stats', 'GET /api/marketplace/tenant-config/:appSlug', 'PUT /api/marketplace/admin/tenant-config/:subId'] },
              { group: 'Settings', routes: ['GET /api/settings', 'PUT /api/settings', 'GET /api/settings/hosting-plans', 'GET /api/settings/public'] },
              { group: 'Hosting', routes: ['POST /api/hosting/order', 'GET /api/hosting/my-orders', 'GET /api/hosting/admin/orders', 'PUT /api/hosting/admin/orders/:id'] },
              { group: 'Customers', routes: ['GET /api/customers', 'GET /api/customers/:id', 'PUT /api/customers/:id'] },
              { group: 'Tickets', routes: ['GET /api/tickets', 'POST /api/tickets', 'GET /api/tickets/:id', 'PUT /api/tickets/:id'] },
              { group: 'Invoices', routes: ['GET /api/invoices', 'POST /api/invoices', 'POST /api/invoices/:id/send'] },
              { group: 'Social AI', routes: ['GET /api/social/profile', 'POST /api/social/generate', 'GET /api/social/posts', 'POST /api/social/schedule'] },
              { group: 'SiteGround', routes: ['GET /api/siteground/account', 'GET /api/siteground/sites'] },
            ].map(group => (
              <div key={group.group} style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>{group.group}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {group.routes.map((r, i) => {
                    const [method, ...pathParts] = r.split(' ');
                    const path = pathParts.join(' ');
                    const methodColor = { GET: '#10b981', POST: '#3b82f6', PUT: '#f59e0b', DELETE: '#ef4444' }[method] || '#6b7280';
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                        <span style={{ padding: '0.125rem 0.375rem', borderRadius: 3, background: `${methodColor}15`, color: methodColor, fontWeight: 700, minWidth: 40, textAlign: 'center' }}>{method}</span>
                        <span style={{ color: 'var(--gray-600)' }}>{path}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Plan Edit Modal Component
const PlanEditModal = ({ plan, onSave, onClose }) => {
  const [form, setForm] = useState({ ...plan, features: (plan.features || []).join('\n') });

  const handleSave = () => {
    const data = {
      ...form,
      price: parseFloat(form.price) || 0,
      yearlyPrice: parseFloat(form.yearlyPrice) || 0,
      features: form.features.split('\n').map(f => f.trim()).filter(Boolean),
    };
    delete data._isNew;
    const idx = plan._isNew ? -1 : plan._index;
    delete data._index;
    onSave(data, idx);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        <h2>{plan._isNew ? 'Add Hosting Plan' : 'Edit Hosting Plan'}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div className="form-group">
            <label>Plan Key</label>
            <input value={form.key || ''} onChange={e => setForm({ ...form, key: e.target.value })} placeholder="e.g. starter" />
          </div>
          <div className="form-group">
            <label>Plan Name</label>
            <input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Starter Hosting" />
          </div>
          <div className="form-group">
            <label>Monthly Price ($)</label>
            <input type="number" step="0.01" value={form.price || 0} onChange={e => setForm({ ...form, price: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Yearly Price ($)</label>
            <input type="number" step="0.01" value={form.yearlyPrice || 0} onChange={e => setForm({ ...form, yearlyPrice: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Storage</label>
            <input value={form.storage || ''} onChange={e => setForm({ ...form, storage: e.target.value })} placeholder="e.g. 10 GB SSD" />
          </div>
          <div className="form-group">
            <label>Bandwidth</label>
            <input value={form.bandwidth || ''} onChange={e => setForm({ ...form, bandwidth: e.target.value })} placeholder="e.g. Unmetered" />
          </div>
          <div className="form-group">
            <label>Email Accounts</label>
            <input value={form.emails || ''} onChange={e => setForm({ ...form, emails: e.target.value })} placeholder="e.g. 5 Email Accounts" />
          </div>
          <div className="form-group">
            <label>Domains</label>
            <input value={form.domains || ''} onChange={e => setForm({ ...form, domains: e.target.value })} placeholder="e.g. 1 Domain" />
          </div>
          <div className="form-group">
            <label>Accent Colour</label>
            <input type="color" value={form.color || '#3b82f6'} onChange={e => setForm({ ...form, color: e.target.value })} style={{ height: 38 }} />
          </div>
          <div className="form-group">
            <label>Active</label>
            <select value={form.isActive ? 'true' : 'false'} onChange={e => setForm({ ...form, isActive: e.target.value === 'true' })}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Features (one per line)</label>
          <textarea rows={5} value={form.features || ''} onChange={e => setForm({ ...form, features: e.target.value })} placeholder="Free SSL\nDaily Backups\ncPanel Access" />
        </div>
        <div className="modal-actions">
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button onClick={handleSave} className="btn btn-primary"><Save size={14} /> Save Plan</button>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
