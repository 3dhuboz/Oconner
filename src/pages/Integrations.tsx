import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Database, DollarSign, CheckCircle2, AlertCircle, Loader2, Mail, MessageSquare, ExternalLink, Copy, PlayCircle, Phone, Send, Eye, EyeOff, Save, TestTube2, Inbox, RefreshCw, Clock, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils';
import { db } from '../services/firebase';
import { collection, addDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

const IntegrationCard = ({ icon: Icon, title, status, statusColor, children, onAction, actionText, actionDisabled, isConnecting }: any) => {
  const statusStyles: Record<string, string> = {
    green: 'bg-emerald-100 text-emerald-700',
    slate: 'bg-slate-100 text-slate-600',
    amber: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
      <div className="flex gap-4 items-start">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", statusColor.bg)}>
          <Icon className={cn("w-6 h-6", statusColor.text)} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            {title}
            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", statusStyles[status.color])}>
              {status.text === 'Connected' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              {status.text}
            </span>
          </h3>
          <div className="text-slate-500 text-sm mt-1 max-w-md space-y-2">
            {children}
          </div>
        </div>
      </div>
      {actionText && (
        <div className="shrink-0 w-full sm:w-auto">
          <button 
            onClick={onAction}
            disabled={actionDisabled || isConnecting}
            className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isConnecting && <Loader2 className="w-4 h-4 animate-spin" />}
            {actionText}
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Settings input helper ──────────────────────────────────────
const SettingsInput = ({ label, value, onChange, placeholder, type = 'text', secret = false }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; secret?: boolean;
}) => {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <div className="relative">
        <input
          type={secret && !show ? 'password' : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition-all pr-10"
        />
        {secret && (
          <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
};

export function Integrations() {
  const { backendStatus } = useAuth();
  const navigate = useNavigate();
  const [xeroConnected, setXeroConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [xeroConfig, setXeroConfig] = useState({
    clientId: '',
    clientSecret: '',
    tenantId: '',
    defaultAccountCode: '200',
    defaultTaxType: 'OUTPUT',
    invoicePrefix: 'WRU-',
    laborDescription: 'Electrical Labour',
    hourlyRate: '120',
  });
  const [xeroSaving, setXeroSaving] = useState(false);
  const [xeroExpanded, setXeroExpanded] = useState(false);
  const [forwardingEmail, setForwardingEmail] = useState<string | null>(null);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  
  // ─── SMS Provider State ─────────────────────────────────────
  const [smsProvider, setSmsProvider] = useState<'twilio' | 'vonage'>('twilio');
  const [smsConfig, setSmsConfig] = useState({
    accountSid: '',
    authToken: '',
    fromNumber: '',
    enabled: false,
  });
  const [smsSaving, setSmsSaving] = useState(false);
  const [smsTesting, setSmsTesting] = useState(false);
  const [smsTestNumber, setSmsTestNumber] = useState('');

  // ─── Gmail Catch-All State ───────────────────────────────────
  const [gmailConfig, setGmailConfig] = useState({
    emailAddress: '',
    clientId: '',
    clientSecret: '',
    refreshToken: '',
    pollingInterval: '5',
    autoCreateJobs: true,
    markAsRead: true,
    enabled: false,
  });
  const [gmailSaving, setGmailSaving] = useState(false);
  const [gmailPolling, setGmailPolling] = useState(false);
  const [gmailPollResult, setGmailPollResult] = useState<any>(null);
  const [gmailDiagnostic, setGmailDiagnostic] = useState<any>(null);
  const [gmailDiagLoading, setGmailDiagLoading] = useState(false);
  const isGmailConfigured = !!(gmailConfig.emailAddress && gmailConfig.clientId && gmailConfig.refreshToken);

  // ─── Email Provider State ───────────────────────────────────
  const [emailProvider, setEmailProvider] = useState<'smtp' | 'sendgrid' | 'ses' | 'gmail'>('smtp');
  const [emailConfig, setEmailConfig] = useState({
    host: '',
    port: '587',
    username: '',
    password: '',
    fromEmail: '',
    fromName: 'Wirez R Us',
    apiKey: '', // for SendGrid/SES
    enabled: false,
  });
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailTesting, setEmailTesting] = useState(false);
  const [emailTestAddress, setEmailTestAddress] = useState('');

  // ─── Load saved settings from Firestore ─────────────────────
  useEffect(() => {
    if (!db) return;
    // Load SMS config
    getDoc(doc(db, 'settings', 'sms')).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setSmsProvider(data.provider || 'twilio');
        setSmsConfig({
          accountSid: data.accountSid || '',
          authToken: data.authToken || '',
          fromNumber: data.fromNumber || '',
          enabled: data.enabled || false,
        });
      }
    }).catch(() => {});
    // Load Email config
    getDoc(doc(db, 'settings', 'email')).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setEmailProvider(data.provider || 'smtp');
        setEmailConfig({
          host: data.host || '',
          port: data.port || '587',
          username: data.username || '',
          password: data.password || '',
          fromEmail: data.fromEmail || '',
          fromName: data.fromName || 'Wirez R Us',
          apiKey: data.apiKey || '',
          enabled: data.enabled || false,
        });
      }
    }).catch(() => {});
    // Load Gmail catch-all config
    getDoc(doc(db, 'settings', 'gmail')).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setGmailConfig({
          emailAddress: data.emailAddress || '',
          clientId: data.clientId || '',
          clientSecret: data.clientSecret || '',
          refreshToken: data.refreshToken || '',
          pollingInterval: data.pollingInterval || '5',
          autoCreateJobs: data.autoCreateJobs !== false,
          markAsRead: data.markAsRead !== false,
          enabled: data.enabled || false,
        });
      }
    }).catch(() => {});
  }, []);

  // ─── Save SMS Settings ──────────────────────────────────────
  const handleSaveSms = async () => {
    if (!db) { toast.error('Database not connected'); return; }
    setSmsSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'sms'), {
        provider: smsProvider,
        ...smsConfig,
        updatedAt: new Date().toISOString(),
      });
      toast.success('SMS settings saved');
    } catch (err) {
      toast.error('Failed to save SMS settings');
    } finally {
      setSmsSaving(false);
    }
  };

  const handleTestSms = async () => {
    if (!smsTestNumber.trim()) { toast.error('Enter a test phone number'); return; }
    setSmsTesting(true);
    try {
      const res = await fetch('/api/sms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: smsTestNumber, provider: smsProvider, ...smsConfig }),
      });
      const data = await res.json();
      if (data.success && data.simulated) toast.success('SMS API reachable (simulated — credentials not reaching server)');
      else if (data.success) toast.success('Test SMS sent via Twilio!');
      else toast.error(data.error || 'SMS test failed');
    } catch {
      toast.error('Could not reach SMS API — check server configuration');
    } finally {
      setSmsTesting(false);
    }
  };

  // ─── Save Email Settings ────────────────────────────────────
  const handleSaveEmail = async () => {
    if (!db) { toast.error('Database not connected'); return; }
    setEmailSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'email'), {
        provider: emailProvider,
        ...emailConfig,
        updatedAt: new Date().toISOString(),
      });
      toast.success('Email settings saved');
    } catch (err) {
      toast.error('Failed to save email settings');
    } finally {
      setEmailSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!emailTestAddress.trim()) { toast.error('Enter a test email address'); return; }
    setEmailTesting(true);
    try {
      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: emailTestAddress, provider: emailProvider, ...emailConfig }),
      });
      const data = await res.json();
      if (data.success) toast.success('Test email sent!');
      else toast.error(data.error || 'Email test failed');
    } catch {
      toast.error('Could not reach Email API — check server configuration');
    } finally {
      setEmailTesting(false);
    }
  };

  // ─── Save Gmail Catch-All Settings ─────────────────────────
  const handleSaveGmail = async () => {
    if (!db) { toast.error('Database not connected'); return; }
    setGmailSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'gmail'), {
        ...gmailConfig,
        updatedAt: new Date().toISOString(),
      });
      toast.success('Gmail catch-all settings saved');
    } catch (err) {
      toast.error('Failed to save Gmail settings');
    } finally {
      setGmailSaving(false);
    }
  };

  const handleGmailPollNow = async () => {
    setGmailPolling(true);
    setGmailPollResult(null);
    try {
      const res = await fetch('/api/email/poll-inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setGmailPollResult(data);
      if (data.success) {
        toast.success(`Polled inbox: ${data.processed || 0} emails processed, ${data.errors || 0} errors`);
      } else {
        toast.error(data.error || 'Poll failed');
      }
    } catch (err: any) {
      setGmailPollResult({ error: err.message });
      toast.error('Could not reach poll endpoint');
    } finally {
      setGmailPolling(false);
    }
  };

  const handleGmailDiagnostic = async () => {
    setGmailDiagLoading(true);
    setGmailDiagnostic(null);
    try {
      const res = await fetch('/api/email/poll-inbox');
      const data = await res.json();
      setGmailDiagnostic(data);
    } catch (err: any) {
      setGmailDiagnostic({ error: err.message });
    } finally {
      setGmailDiagLoading(false);
    }
  };

  // ─── Load Xero Settings ─────────────────────────────────────
  useEffect(() => {
    if (!db) return;
    getDoc(doc(db, 'settings', 'xero')).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setXeroConfig({
          clientId: data.clientId || '',
          clientSecret: data.clientSecret || '',
          tenantId: data.tenantId || '',
          defaultAccountCode: data.defaultAccountCode || '200',
          defaultTaxType: data.defaultTaxType || 'OUTPUT',
          invoicePrefix: data.invoicePrefix || 'WRU-',
          laborDescription: data.laborDescription || 'Electrical Labour',
          hourlyRate: data.hourlyRate || '120',
        });
      }
    }).catch(() => {});
  }, []);

  const handleSaveXero = async () => {
    if (!db) { toast.error('Database not connected'); return; }
    setXeroSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'xero'), {
        ...xeroConfig,
        updatedAt: new Date().toISOString(),
      });
      toast.success('Xero settings saved');
    } catch (err) {
      toast.error('Failed to save Xero settings');
    } finally {
      setXeroSaving(false);
    }
  };

  const handleDisconnectXero = async () => {
    if (!confirm('Disconnect Xero? This will revoke the OAuth token.')) return;
    try {
      await fetch('/api/xero/disconnect', { method: 'POST' });
      setXeroConnected(false);
      toast.success('Xero disconnected');
    } catch {
      toast.error('Failed to disconnect Xero');
    }
  };

  useEffect(() => {
    fetch('/api/xero/status').then(res => res.json()).then(data => setXeroConnected(data.connected)).catch(() => {});
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setXeroConnected(true);
        setIsConnecting(false);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnectXero = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch('/api/auth/xero/url');
      const data = await response.json();
      if (data.error) {
        alert(`Configuration Error: ${data.error}`);
        setIsConnecting(false);
        return;
      }
      window.open(data.url, 'xero_oauth', 'width=600,height=700');
    } catch (error) { 
      console.error(error); 
      setIsConnecting(false); 
    }
  };

  const handleSimulateEmail = async () => {
    if (!db) {
      toast.error('Firebase is not connected');
      return;
    }
    
    setIsSimulating(true);
    
    try {
      const now = new Date();
      const newJob = {
        title: 'Emergency: Sparking Outlet in Kitchen',
        status: 'INTAKE',
        location: '42 Wallaby Way, Sydney',
        propertyAddress: '42 Wallaby Way, Sydney',
        description: `WORK ORDER — Auto-generated from inbound email\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nDate Created: ${now.toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\nTime: ${now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}\n\nTENANT: P. Sherman\nPHONE: 0412 345 678\nEMAIL: psherman@example.com\nPROPERTY: 42 Wallaby Way, Sydney\n\nISSUE REPORTED:\nSparking outlet in kitchen that smells like burning plastic. Tenant requests urgent attendance.\n\nORIGINAL EMAIL:\n"Hi Wirez R Us,\nI have a sparking outlet in my kitchen that smells like burning plastic. Please send someone ASAP!\nThanks, P. Sherman"\n\nPRIORITY: URGENT\nTYPE: General Repair / Emergency`,
        tenantName: 'P. Sherman',
        tenantPhone: '0412 345 678',
        tenantEmail: 'psherman@example.com',
        type: 'GENERAL_REPAIR',
        contactAttempts: [],
        materials: [],
        photos: [],
        createdAt: now.toISOString()
      };

      const docRef = await addDoc(collection(db, 'jobs'), newJob);
      toast.success('Inbound email processed! Job created.');
      
      // Navigate to the job board after a short delay so they can see it
      setTimeout(() => {
        navigate('/');
      }, 1500);
      
    } catch (error) {
      console.error("Error creating job from email simulation:", error);
      toast.error('Failed to process inbound email');
    } finally {
      setIsSimulating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Integrations</h1>
        <p className="text-slate-500 mt-1">Manage connections to third-party services.</p>
      </div>

      <div className="grid gap-6">
        {/* ─── Xero Accounting ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 flex items-start gap-4 border-b border-slate-100">
            <div className="w-12 h-12 rounded-xl bg-[#13B5EA]/10 flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6 text-[#13B5EA]" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                Xero Accounting
                <span className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                  xeroConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                )}>
                  {xeroConnected ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  {xeroConnected ? 'Connected' : 'Not Connected'}
                </span>
              </h3>
              <p className="text-sm text-slate-500 mt-1">Sync completed jobs to Xero invoices. Configure your OAuth credentials and invoice defaults below.</p>
            </div>
            <button
              onClick={() => setXeroExpanded(x => !x)}
              className="text-sm text-slate-500 hover:text-slate-800 font-medium shrink-0"
            >
              {xeroExpanded ? 'Hide' : 'Configure'}
            </button>
          </div>

          {xeroExpanded && (
            <div className="p-6 space-y-5">

              {/* OAuth Credentials */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">OAuth App Credentials</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SettingsInput
                    label="Client ID"
                    value={xeroConfig.clientId}
                    onChange={v => setXeroConfig(c => ({ ...c, clientId: v }))}
                    placeholder="Your Xero OAuth Client ID"
                  />
                  <SettingsInput
                    label="Client Secret"
                    value={xeroConfig.clientSecret}
                    onChange={v => setXeroConfig(c => ({ ...c, clientSecret: v }))}
                    placeholder="Your Xero OAuth Client Secret"
                    secret
                  />
                </div>
                <div className="mt-4">
                  <SettingsInput
                    label="Tenant / Organisation ID"
                    value={xeroConfig.tenantId}
                    onChange={v => setXeroConfig(c => ({ ...c, tenantId: v }))}
                    placeholder="Xero Tenant ID (from Connections API)"
                  />
                  <p className="text-xs text-slate-400 mt-1">Found in your Xero dashboard under <strong>Settings → Connected Apps</strong>, or retrieved automatically after connecting.</p>
                </div>
              </div>

              {/* Invoice Defaults */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Invoice Defaults</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SettingsInput
                    label="Invoice Number Prefix"
                    value={xeroConfig.invoicePrefix}
                    onChange={v => setXeroConfig(c => ({ ...c, invoicePrefix: v }))}
                    placeholder="WRU-"
                  />
                  <SettingsInput
                    label="Default Account Code"
                    value={xeroConfig.defaultAccountCode}
                    onChange={v => setXeroConfig(c => ({ ...c, defaultAccountCode: v }))}
                    placeholder="200"
                  />
                  <SettingsInput
                    label="Default Tax Type"
                    value={xeroConfig.defaultTaxType}
                    onChange={v => setXeroConfig(c => ({ ...c, defaultTaxType: v }))}
                    placeholder="OUTPUT"
                  />
                  <SettingsInput
                    label="Default Labour Rate ($/hr)"
                    value={xeroConfig.hourlyRate}
                    onChange={v => setXeroConfig(c => ({ ...c, hourlyRate: v }))}
                    placeholder="120"
                    type="number"
                  />
                </div>
                <div className="mt-4">
                  <SettingsInput
                    label="Labour Line Item Description"
                    value={xeroConfig.laborDescription}
                    onChange={v => setXeroConfig(c => ({ ...c, laborDescription: v }))}
                    placeholder="Electrical Labour"
                  />
                </div>
              </div>

              {/* How to get credentials */}
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-xs font-semibold text-blue-800 mb-2">How to get your Xero credentials</p>
                <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                  <li>Go to <a href="https://developer.xero.com/app/manage" target="_blank" rel="noopener noreferrer" className="underline font-medium">developer.xero.com/app/manage</a></li>
                  <li>Create a new app → set redirect URI to <code className="bg-blue-100 px-1 rounded">{window.location.origin}/api/auth/xero/callback</code></li>
                  <li>Copy the <strong>Client ID</strong> and <strong>Client Secret</strong> above</li>
                  <li>Click <strong>Save Settings</strong> then <strong>Connect Xero</strong> to authorise</li>
                  <li>After authorisation, the Tenant ID will be stored automatically</li>
                </ol>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-100">
                <button
                  onClick={handleSaveXero}
                  disabled={xeroSaving}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {xeroSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Settings
                </button>
                {!xeroConnected ? (
                  <button
                    onClick={handleConnectXero}
                    disabled={isConnecting || !xeroConfig.clientId || !xeroConfig.clientSecret}
                    className="px-4 py-2 bg-[#13B5EA] hover:bg-[#0f9bc9] disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                    {isConnecting ? 'Connecting...' : 'Connect Xero'}
                  </button>
                ) : (
                  <button
                    onClick={handleDisconnectXero}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    Disconnect Xero
                  </button>
                )}
                <a
                  href="https://developer.xero.com/app/manage"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Xero Developer Portal
                </a>
              </div>
            </div>
          )}

          {/* Collapsed summary when connected */}
          {!xeroExpanded && xeroConnected && (
            <div className="px-6 py-3 bg-emerald-50 border-t border-emerald-100 text-xs text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Connected — invoices will sync automatically when jobs are closed
            </div>
          )}
          {!xeroExpanded && !xeroConnected && (
            <div className="px-6 py-3 bg-amber-50 border-t border-amber-100 text-xs text-amber-700 flex items-center justify-between">
              <span className="flex items-center gap-2"><AlertCircle className="w-3.5 h-3.5" /> Add your Client ID and Client Secret to connect Xero</span>
              <button onClick={() => setXeroExpanded(true)} className="text-amber-800 font-semibold hover:underline">Set up →</button>
            </div>
          )}
        </div>

        {/* ─── Gmail Catch-All Inbox Polling ──────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 flex items-start gap-4 border-b border-slate-100">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
              <Inbox className="w-6 h-6 text-red-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                Gmail Catch-All
                <span className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                  gmailConfig.enabled && isGmailConfigured ? 'bg-emerald-100 text-emerald-700' :
                  isGmailConfigured ? 'bg-blue-100 text-blue-700' :
                  'bg-amber-100 text-amber-700'
                )}>
                  {gmailConfig.enabled && isGmailConfigured ? <CheckCircle2 className="w-3 h-3" /> :
                   isGmailConfigured ? <Clock className="w-3 h-3" /> :
                   <AlertCircle className="w-3 h-3" />}
                  {gmailConfig.enabled && isGmailConfigured ? 'Active' :
                   isGmailConfigured ? 'Configured' : 'Setup Required'}
                </span>
              </h3>
              <p className="text-slate-500 text-sm mt-1">
                Poll a Gmail inbox for work orders from property managers. Uses Gmail API with OAuth2.
                Set up a dedicated address like <strong>jobs@wirezrus.com.au</strong> or <strong>wirezrusjobs@gmail.com</strong>.
              </p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* OAuth Credentials */}
            <div className="grid gap-4 sm:grid-cols-2">
              <SettingsInput
                label="Gmail Address"
                value={gmailConfig.emailAddress}
                onChange={v => setGmailConfig(c => ({ ...c, emailAddress: v }))}
                placeholder="wirezrusjobs@gmail.com"
              />
              <SettingsInput
                label="Polling Interval (minutes)"
                value={gmailConfig.pollingInterval}
                onChange={v => setGmailConfig(c => ({ ...c, pollingInterval: v }))}
                placeholder="5"
                type="number"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <SettingsInput
                label="Google OAuth Client ID"
                value={gmailConfig.clientId}
                onChange={v => setGmailConfig(c => ({ ...c, clientId: v }))}
                placeholder="xxxx.apps.googleusercontent.com"
              />
              <SettingsInput
                label="Google OAuth Client Secret"
                value={gmailConfig.clientSecret}
                onChange={v => setGmailConfig(c => ({ ...c, clientSecret: v }))}
                placeholder="GOCSPX-xxxxxxxx"
                secret
              />
            </div>

            <SettingsInput
              label="OAuth Refresh Token"
              value={gmailConfig.refreshToken}
              onChange={v => setGmailConfig(c => ({ ...c, refreshToken: v }))}
              placeholder="1//0xxxxxxxxxxxxxxxxxxxxxxxx"
              secret
            />

            {/* Toggles */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setGmailConfig(c => ({ ...c, enabled: !c.enabled }))}
                  className={cn("relative w-11 h-6 rounded-full transition-colors",
                    gmailConfig.enabled ? 'bg-emerald-500' : 'bg-slate-300'
                  )}
                  title="Toggle Gmail polling"
                >
                  <span className={cn("absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                    gmailConfig.enabled && 'translate-x-5'
                  )} />
                </button>
                <span className="text-sm text-slate-700 font-medium">Enable polling</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setGmailConfig(c => ({ ...c, autoCreateJobs: !c.autoCreateJobs }))}
                  className={cn("relative w-11 h-6 rounded-full transition-colors",
                    gmailConfig.autoCreateJobs ? 'bg-emerald-500' : 'bg-slate-300'
                  )}
                  title="Toggle auto-create jobs"
                >
                  <span className={cn("absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                    gmailConfig.autoCreateJobs && 'translate-x-5'
                  )} />
                </button>
                <span className="text-sm text-slate-700 font-medium">Auto-create jobs</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setGmailConfig(c => ({ ...c, markAsRead: !c.markAsRead }))}
                  className={cn("relative w-11 h-6 rounded-full transition-colors",
                    gmailConfig.markAsRead ? 'bg-emerald-500' : 'bg-slate-300'
                  )}
                  title="Toggle mark as read"
                >
                  <span className={cn("absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                    gmailConfig.markAsRead && 'translate-x-5'
                  )} />
                </button>
                <span className="text-sm text-slate-700 font-medium">Mark as read</span>
              </div>
            </div>

            {/* Diagnostic panel */}
            {gmailDiagnostic && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-xs font-semibold text-slate-700 mb-2">Server Diagnostic</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                  {gmailDiagnostic.checks && Object.entries(gmailDiagnostic.checks).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="font-mono text-slate-500">{key}:</span>
                      <span className="text-slate-800">{String(val)}</span>
                    </div>
                  ))}
                </div>
                {gmailDiagnostic.error && (
                  <p className="text-xs text-red-600 mt-2">{gmailDiagnostic.error}</p>
                )}
              </div>
            )}

            {/* Poll results */}
            {gmailPollResult && (
              <div className={cn(
                "p-3 rounded-lg border",
                gmailPollResult.success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
              )}>
                <p className={cn("text-xs font-semibold mb-1",
                  gmailPollResult.success ? 'text-emerald-800' : 'text-red-800'
                )}>
                  {gmailPollResult.success
                    ? `Processed ${gmailPollResult.processed || 0} email(s), ${gmailPollResult.errors || 0} error(s)`
                    : `Error: ${gmailPollResult.error || 'Unknown'}`}
                </p>
                {gmailPollResult.results?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {gmailPollResult.results.map((r: any, i: number) => (
                      <div key={i} className="text-[11px] flex items-center gap-2">
                        {r.error
                          ? <span className="text-red-600">{r.error}</span>
                          : <>
                              <span className="font-medium text-slate-800">{r.subject?.substring(0, 40)}</span>
                              <span className="text-slate-400">→</span>
                              <span className="text-emerald-700">{r.software}</span>
                              <span className="text-slate-400">→</span>
                              <span className="font-mono text-blue-600">{r.jobId}</span>
                            </>
                        }
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* How it works */}
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
              <p className="text-xs font-semibold text-red-800 mb-2">How Gmail Catch-All works</p>
              <div className="flex items-center gap-2 text-xs text-red-700 flex-wrap">
                <span className="bg-red-200/60 rounded px-1.5 py-0.5 font-medium">Email arrives</span>
                <span>→</span>
                <span className="bg-red-200/60 rounded px-1.5 py-0.5 font-medium">Cron polls Gmail API</span>
                <span>→</span>
                <span className="bg-red-200/60 rounded px-1.5 py-0.5 font-medium">Detect PM software</span>
                <span>→</span>
                <span className="bg-red-200/60 rounded px-1.5 py-0.5 font-medium">Parse &amp; create job</span>
                <span>→</span>
                <span className="bg-red-200/60 rounded px-1.5 py-0.5 font-medium">Mark as read</span>
              </div>
              <p className="text-[10px] text-red-600 mt-2">
                Detects: PropertyMe, Console Cloud, PropertyTree, Palace, Rex PM, ManagedApp, Inspection Express, MRI Software, and generic emails.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-1 border-t border-slate-100">
              <button
                onClick={handleSaveGmail}
                disabled={gmailSaving}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                {gmailSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Gmail Settings
              </button>
              <button
                onClick={handleGmailPollNow}
                disabled={gmailPolling || !isGmailConfigured}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-200 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                title="Trigger an immediate poll of the Gmail inbox"
              >
                {gmailPolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {gmailPolling ? 'Polling...' : 'Poll Now'}
              </button>
              <button
                onClick={handleGmailDiagnostic}
                disabled={gmailDiagLoading}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                title="Check server environment variables"
              >
                {gmailDiagLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube2 className="w-4 h-4" />}
                Diagnostic
              </button>
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Google Cloud Console
              </a>
            </div>

            {/* Setup help */}
            {!isGmailConfigured && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 space-y-2">
                <p className="font-semibold flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> Gmail Setup Guide</p>
                <ol className="list-decimal list-inside text-xs text-amber-700 space-y-1">
                  <li>Create a Gmail or Google Workspace address for receiving work orders</li>
                  <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">Google Cloud Console</a> → Create OAuth 2.0 credentials (Web App)</li>
                  <li>Enable the <strong>Gmail API</strong> in your Google Cloud project</li>
                  <li>Use the <a href="https://developers.google.com/oauthplayground" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">OAuth Playground</a> to generate a refresh token with scope <code className="bg-amber-100 px-1 rounded text-[10px]">https://www.googleapis.com/auth/gmail.modify</code></li>
                  <li>Paste credentials above and click <strong>Save Gmail Settings</strong></li>
                  <li>Set these as environment variables on Vercel: <code className="bg-amber-100 px-1 rounded text-[10px]">GMAIL_ADDRESS</code>, <code className="bg-amber-100 px-1 rounded text-[10px]">GMAIL_CLIENT_ID</code>, <code className="bg-amber-100 px-1 rounded text-[10px]">GMAIL_CLIENT_SECRET</code>, <code className="bg-amber-100 px-1 rounded text-[10px]">GMAIL_REFRESH_TOKEN</code></li>
                  <li>Add a <a href="https://vercel.com/docs/cron-jobs" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">Vercel Cron</a> to call <code className="bg-amber-100 px-1 rounded text-[10px]">POST /api/email/poll-inbox</code> every 2–5 minutes</li>
                </ol>
              </div>
            )}
          </div>
        </div>

        <IntegrationCard
          icon={Database}
          title="Firebase Database"
          status={{ text: backendStatus.firebase ? 'Connected' : 'Not Configured', color: backendStatus.firebase ? 'green' : 'amber' }}
          statusColor={{ bg: 'bg-amber-500/10', text: 'text-amber-500' }}
        >
          <p>Connect your Firebase project to sync job data, photos, and electrician field updates in real-time.</p>
          <p className="text-xs">Configuration is managed in the <Link to="/admin" className="text-blue-600 underline">Dev Console</Link>.</p>
        </IntegrationCard>

        {/* ─── SMS Provider Settings ─────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 flex items-start gap-4 border-b border-slate-100">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
              <Phone className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                SMS Provider
                <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                  smsConfig.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                )}>
                  {smsConfig.enabled ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  {smsConfig.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </h3>
              <p className="text-sm text-slate-500 mt-1">Send appointment confirmations, reminders, and status updates to tenants via SMS.</p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {/* Provider selector */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">Provider</label>
              <div className="flex gap-2">
                {(['twilio', 'vonage'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setSmsProvider(p)}
                    className={cn("px-4 py-2 rounded-lg text-sm font-medium border transition-colors capitalize",
                      smsProvider === p ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    {p === 'twilio' ? 'Twilio' : 'Vonage'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SettingsInput
                label="Account SID"
                value={smsConfig.accountSid}
                onChange={v => setSmsConfig(c => ({ ...c, accountSid: v }))}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
              <SettingsInput
                label="Auth Token"
                value={smsConfig.authToken}
                onChange={v => setSmsConfig(c => ({ ...c, authToken: v }))}
                placeholder="Your auth token"
                secret
              />
            </div>
            <SettingsInput
              label="From Number"
              value={smsConfig.fromNumber}
              onChange={v => setSmsConfig(c => ({ ...c, fromNumber: v }))}
              placeholder="+61412345678"
            />

            {/* Enable toggle */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setSmsConfig(c => ({ ...c, enabled: !c.enabled }))}
                className={cn("w-11 h-6 rounded-full transition-colors relative",
                  smsConfig.enabled ? 'bg-emerald-500' : 'bg-slate-300'
                )}
              >
                <div className={cn("w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform",
                  smsConfig.enabled ? 'translate-x-5' : 'translate-x-0.5'
                )} />
              </button>
              <span className="text-sm text-slate-700 font-medium">Enable SMS sending</span>
            </div>

            {/* Test & Save */}
            <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="tel"
                  value={smsTestNumber}
                  onChange={e => setSmsTestNumber(e.target.value)}
                  placeholder="Test number: +61..."
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                />
                <button
                  onClick={handleTestSms}
                  disabled={smsTesting || !smsConfig.accountSid}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
                >
                  {smsTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TestTube2 className="w-3.5 h-3.5" />}
                  Test
                </button>
              </div>
              <button
                onClick={handleSaveSms}
                disabled={smsSaving}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
              >
                {smsSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save SMS Settings
              </button>
            </div>
          </div>
        </div>

        {/* ─── Email Provider Settings ───────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 flex items-start gap-4 border-b border-slate-100">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
              <Send className="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                Email Provider
                <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                  emailConfig.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                )}>
                  {emailConfig.enabled ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  {emailConfig.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </h3>
              <p className="text-sm text-slate-500 mt-1">Send job confirmations, invoices, compliance reports, and Form 9 notices to tenants and property managers.</p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {/* Provider selector */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">Provider</label>
              <div className="flex gap-2 flex-wrap">
                {(['gmail', 'smtp', 'sendgrid', 'ses'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => {
                      setEmailProvider(p);
                      if (p === 'gmail') {
                        setEmailConfig(c => ({ ...c, host: 'smtp.gmail.com', port: '587' }));
                      }
                    }}
                    className={cn("px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
                      emailProvider === p ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    {p === 'gmail' ? 'Gmail SMTP' : p === 'smtp' ? 'Custom SMTP' : p === 'sendgrid' ? 'SendGrid' : 'Amazon SES'}
                  </button>
                ))}
              </div>
            </div>

            {emailProvider === 'gmail' ? (
              <>
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                  <p className="text-xs font-semibold text-red-800 mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> Gmail SMTP Settings
                  </p>
                  <p className="text-[11px] text-red-700">
                    Uses <strong>smtp.gmail.com:587</strong> with TLS. You need a <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">Google App Password</a> (not your regular Gmail password).
                    Enable 2-Step Verification on your Google account first.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SettingsInput
                    label="Gmail Address"
                    value={emailConfig.username}
                    onChange={v => setEmailConfig(c => ({ ...c, username: v, fromEmail: c.fromEmail || v }))}
                    placeholder="wirezrus@gmail.com"
                  />
                  <SettingsInput
                    label="App Password"
                    value={emailConfig.password}
                    onChange={v => setEmailConfig(c => ({ ...c, password: v }))}
                    placeholder="xxxx xxxx xxxx xxxx"
                    secret
                  />
                </div>
              </>
            ) : emailProvider === 'smtp' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SettingsInput
                    label="SMTP Host"
                    value={emailConfig.host}
                    onChange={v => setEmailConfig(c => ({ ...c, host: v }))}
                    placeholder="smtp.gmail.com"
                  />
                  <SettingsInput
                    label="SMTP Port"
                    value={emailConfig.port}
                    onChange={v => setEmailConfig(c => ({ ...c, port: v }))}
                    placeholder="587"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SettingsInput
                    label="Username / Email"
                    value={emailConfig.username}
                    onChange={v => setEmailConfig(c => ({ ...c, username: v }))}
                    placeholder="your@email.com"
                  />
                  <SettingsInput
                    label="Password / App Password"
                    value={emailConfig.password}
                    onChange={v => setEmailConfig(c => ({ ...c, password: v }))}
                    placeholder="App-specific password"
                    secret
                  />
                </div>
              </>
            ) : (
              <SettingsInput
                label={emailProvider === 'sendgrid' ? 'SendGrid API Key' : 'AWS SES API Key'}
                value={emailConfig.apiKey}
                onChange={v => setEmailConfig(c => ({ ...c, apiKey: v }))}
                placeholder={emailProvider === 'sendgrid' ? 'SG.xxxxxxxx...' : 'AKIA...'}
                secret
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SettingsInput
                label="From Email"
                value={emailConfig.fromEmail}
                onChange={v => setEmailConfig(c => ({ ...c, fromEmail: v }))}
                placeholder="noreply@wirezrus.com"
              />
              <SettingsInput
                label="From Name"
                value={emailConfig.fromName}
                onChange={v => setEmailConfig(c => ({ ...c, fromName: v }))}
                placeholder="Wirez R Us"
              />
            </div>

            {/* Enable toggle */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setEmailConfig(c => ({ ...c, enabled: !c.enabled }))}
                className={cn("w-11 h-6 rounded-full transition-colors relative",
                  emailConfig.enabled ? 'bg-emerald-500' : 'bg-slate-300'
                )}
              >
                <div className={cn("w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform",
                  emailConfig.enabled ? 'translate-x-5' : 'translate-x-0.5'
                )} />
              </button>
              <span className="text-sm text-slate-700 font-medium">Enable email sending</span>
            </div>

            {/* Test & Save */}
            <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="email"
                  value={emailTestAddress}
                  onChange={e => setEmailTestAddress(e.target.value)}
                  placeholder="Test email address..."
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                />
                <button
                  onClick={handleTestEmail}
                  disabled={emailTesting}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
                >
                  {emailTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TestTube2 className="w-3.5 h-3.5" />}
                  Test
                </button>
              </div>
              <button
                onClick={handleSaveEmail}
                disabled={emailSaving}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
              >
                {emailSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Email Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
