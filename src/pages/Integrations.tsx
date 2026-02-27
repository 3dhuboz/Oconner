import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Database, DollarSign, CheckCircle2, AlertCircle, Loader2, Mail, MessageSquare, ExternalLink, Copy, PlayCircle, Phone, Send, Eye, EyeOff, Save, TestTube2 } from 'lucide-react';
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
  const [forwardingEmail, setForwardingEmail] = useState<string | null>(null);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  
  // ─── CloudMailin Configuration State ────────────────────────
  const envCloudmailinEmail = import.meta.env.VITE_CLOUDMAILIN_EMAIL || '';
  const [cloudmailinConfig, setCloudmailinConfig] = useState({
    emailAddress: envCloudmailinEmail,
    webhookUrl: '',
    enabled: false,
  });
  const [cloudmailinSaving, setCloudmailinSaving] = useState(false);
  const [handshakeStatus, setHandshakeStatus] = useState<'idle' | 'testing' | 'success' | 'fail'>('idle');
  const [handshakeMessage, setHandshakeMessage] = useState('');
  const isCloudMailinConfigured = !!cloudmailinConfig.emailAddress;
  const webhookUrl = `${window.location.origin}/api/webhooks/email`;

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

  // ─── Email Provider State ───────────────────────────────────
  const [emailProvider, setEmailProvider] = useState<'smtp' | 'sendgrid' | 'ses'>('smtp');
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
    // Load CloudMailin config
    getDoc(doc(db, 'settings', 'cloudmailin')).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setCloudmailinConfig({
          emailAddress: data.emailAddress || envCloudmailinEmail || '',
          webhookUrl: data.webhookUrl || '',
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
  }, []);

  // ─── Save CloudMailin Settings ─────────────────────────────
  const handleSaveCloudmailin = async () => {
    if (!db) { toast.error('Database not connected'); return; }
    setCloudmailinSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'cloudmailin'), {
        ...cloudmailinConfig,
        webhookUrl: webhookUrl,
        updatedAt: new Date().toISOString(),
      });
      toast.success('CloudMailin settings saved');
    } catch (err) {
      toast.error('Failed to save CloudMailin settings');
    } finally {
      setCloudmailinSaving(false);
    }
  };

  const handleHandshakeTest = async () => {
    setHandshakeStatus('testing');
    setHandshakeMessage('');
    try {
      const res = await fetch('/api/webhooks/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          envelope: { from: 'handshake-test@wirezrus.com' },
          headers: { Subject: '[HANDSHAKE TEST] Connection Verified' },
          plain: 'This is an automated handshake test from the Wirez R Us integrations page. If you see this job, the webhook is working correctly.',
        }),
      });
      const data = await res.json();
      if (data.success || data.jobId) {
        setHandshakeStatus('success');
        setHandshakeMessage(data.jobId ? `Connected — test job created (${data.jobId})` : 'Connected — webhook responded OK');
        toast.success('Handshake successful! Webhook is working.');
      } else {
        setHandshakeStatus('fail');
        setHandshakeMessage(data.warning || data.error || 'Webhook responded but did not confirm success');
        toast.error(data.warning || 'Handshake returned a warning');
      }
    } catch (err: any) {
      setHandshakeStatus('fail');
      setHandshakeMessage(err.message || 'Could not reach webhook endpoint');
      toast.error('Handshake failed — could not reach webhook');
    }
  };

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
      if (data.success) toast.success('Test SMS sent!');
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

  useEffect(() => {
    fetch('/api/xero/status').then(res => res.json()).then(data => setXeroConnected(data.connected));
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
        <IntegrationCard
          icon={DollarSign}
          title="Xero Accounting"
          status={{ text: xeroConnected ? 'Connected' : 'Not Connected', color: xeroConnected ? 'green' : 'slate' }}
          statusColor={{ bg: 'bg-[#13B5EA]/10', text: 'text-[#13B5EA]' }}
          onAction={handleConnectXero}
          actionText={xeroConnected ? 'Manage' : 'Connect Xero'}
          actionDisabled={xeroConnected}
          isConnecting={isConnecting}
        >
          <p>Automatically sync completed jobs, generate invoices, and track payments directly in your Xero account.</p>
        </IntegrationCard>

        {/* ─── CloudMailin Email-to-Job ─────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 flex items-start gap-4 border-b border-slate-100">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6 text-blue-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                Email-to-Job Automation
                <span className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                  isCloudMailinConfigured
                    ? handshakeStatus === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                    : 'bg-amber-100 text-amber-700'
                )}>
                  {isCloudMailinConfigured
                    ? handshakeStatus === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <Mail className="w-3 h-3" />
                    : <AlertCircle className="w-3 h-3" />}
                  {isCloudMailinConfigured
                    ? handshakeStatus === 'success' ? 'Verified' : 'Configured'
                    : 'Setup Required'}
                </span>
              </h3>
              <p className="text-slate-500 text-sm mt-1">Powered by <a href="https://www.cloudmailin.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">CloudMailin</a> — emails sent to your unique address automatically create new jobs.</p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* ── Editable Configuration Fields ── */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">CloudMailin Email Address</label>
                <div className="relative">
                  <input
                    type="text"
                    value={cloudmailinConfig.emailAddress}
                    onChange={e => setCloudmailinConfig(c => ({ ...c, emailAddress: e.target.value }))}
                    placeholder="abc123@cloudmailin.net"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition-all pr-9"
                  />
                  {cloudmailinConfig.emailAddress && (
                    <button onClick={() => copyToClipboard(cloudmailinConfig.emailAddress)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" title="Copy">
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">From your CloudMailin dashboard</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Webhook Endpoint</label>
                <div className="relative">
                  <input
                    type="text"
                    value={webhookUrl}
                    readOnly
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-100 text-slate-500 cursor-default pr-9"
                  />
                  <button onClick={() => copyToClipboard(webhookUrl)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" title="Copy">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1">Paste this into CloudMailin's Target URL</p>
              </div>
            </div>

            {/* ── Enable toggle ── */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <p className="text-sm font-medium text-slate-700">Enable Email-to-Job</p>
                <p className="text-xs text-slate-400">Incoming emails will automatically create jobs</p>
              </div>
              <button
                onClick={() => setCloudmailinConfig(c => ({ ...c, enabled: !c.enabled }))}
                className={cn(
                  "relative w-11 h-6 rounded-full transition-colors",
                  cloudmailinConfig.enabled ? 'bg-emerald-500' : 'bg-slate-300'
                )}
              >
                <span className={cn(
                  "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                  cloudmailinConfig.enabled && 'translate-x-5'
                )} />
              </button>
            </div>

            {/* ── Handshake Test ── */}
            <div className={cn(
              "p-4 rounded-lg border",
              handshakeStatus === 'success' ? 'bg-emerald-50 border-emerald-200' :
              handshakeStatus === 'fail' ? 'bg-red-50 border-red-200' :
              'bg-slate-50 border-slate-200'
            )}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  {handshakeStatus === 'testing' && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                  {handshakeStatus === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  {handshakeStatus === 'fail' && <AlertCircle className="w-4 h-4 text-red-500" />}
                  {handshakeStatus === 'idle' && <Send className="w-4 h-4 text-slate-400" />}
                  Webhook Handshake
                </p>
                <button
                  onClick={handleHandshakeTest}
                  disabled={handshakeStatus === 'testing'}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  {handshakeStatus === 'testing' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {handshakeStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                </button>
              </div>
              {handshakeStatus === 'idle' && (
                <p className="text-xs text-slate-500">Send a test POST to your webhook to verify the pipeline is working end-to-end.</p>
              )}
              {handshakeStatus === 'success' && (
                <div className="text-xs text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  {handshakeMessage}
                </div>
              )}
              {handshakeStatus === 'fail' && (
                <div className="text-xs text-red-600 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {handshakeMessage}
                </div>
              )}
            </div>

            {/* ── How it works ── */}
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs font-semibold text-blue-800 mb-2">How it works</p>
              <div className="flex items-center gap-2 text-xs text-blue-700 flex-wrap">
                <span className="bg-blue-200/60 rounded px-1.5 py-0.5 font-medium">Email received</span>
                <span>→</span>
                <span className="bg-blue-200/60 rounded px-1.5 py-0.5 font-medium">CloudMailin webhook</span>
                <span>→</span>
                <span className="bg-blue-200/60 rounded px-1.5 py-0.5 font-medium">Job created in Firestore</span>
                <span>→</span>
                <span className="bg-blue-200/60 rounded px-1.5 py-0.5 font-medium">Appears on Job Board</span>
              </div>
            </div>

            {/* ── Action Buttons ── */}
            <div className="flex flex-wrap gap-3 pt-1 border-t border-slate-100">
              <button
                onClick={handleSaveCloudmailin}
                disabled={cloudmailinSaving}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                {cloudmailinSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Settings
              </button>
              <button
                onClick={handleSimulateEmail}
                disabled={isSimulating}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube2 className="w-4 h-4" />}
                Simulate Inbound Email
              </button>
              <a
                href="https://www.cloudmailin.com/address"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                CloudMailin Dashboard
              </a>
            </div>

            {/* ── Setup help if not configured ── */}
            {!isCloudMailinConfigured && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 space-y-2">
                <p className="font-semibold flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> Quick Setup</p>
                <ol className="list-decimal list-inside text-xs text-amber-700 space-y-1">
                  <li><a href="https://www.cloudmailin.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">Sign up at CloudMailin</a> (free tier: 200 emails/month)</li>
                  <li>Copy the webhook URL above into CloudMailin's <strong>Target URL</strong></li>
                  <li>Paste your CloudMailin email address into the field above</li>
                  <li>Click <strong>Save Settings</strong>, then <strong>Test Connection</strong></li>
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
              <div className="flex gap-2">
                {(['smtp', 'sendgrid', 'ses'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setEmailProvider(p)}
                    className={cn("px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
                      emailProvider === p ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    {p === 'smtp' ? 'SMTP' : p === 'sendgrid' ? 'SendGrid' : 'Amazon SES'}
                  </button>
                ))}
              </div>
            </div>

            {emailProvider === 'smtp' ? (
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
