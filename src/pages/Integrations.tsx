import React, { useEffect, useState } from 'react';
import { Database, DollarSign, CheckCircle2, AlertCircle, Loader2, Mail, MessageSquare } from 'lucide-react';

export function Integrations() {
  const [xeroConnected, setXeroConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Check initial status
    fetch('/api/xero/status')
      .then(res => res.json())
      .then(data => setXeroConnected(data.connected))
      .catch(console.error);

    // Listen for OAuth popup success
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
    try {
      setIsConnecting(true);
      const response = await fetch('/api/auth/xero/url');
      const data = await response.json();
      
      if (data.error) {
        alert(`Configuration Error: ${data.error}\n\nPlease add XERO_CLIENT_ID and XERO_CLIENT_SECRET to your environment variables.`);
        setIsConnecting(false);
        return;
      }

      const authWindow = window.open(data.url, 'xero_oauth', 'width=600,height=700');
      if (!authWindow) {
        alert('Please allow popups to connect to Xero.');
        setIsConnecting(false);
      }
    } catch (error) {
      console.error('Failed to start Xero auth:', error);
      setIsConnecting(false);
    }
  };

  const simulateIncomingEmail = async () => {
    try {
      await fetch('/api/webhooks/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'Work Order: Broken Power Outlet',
          text: 'Please fix the broken power outlet in the living room. Tenant is available tomorrow.',
          from: 'propertymanager@realestate.com',
          tenantName: 'John Doe',
          tenantPhone: '555-9999',
          address: '999 Webhook Lane, Springfield'
        })
      });
      alert('Email simulated! A new job has been instantly added to your Job Board in the INTAKE column.');
    } catch (error) {
      console.error('Failed to simulate email:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Integrations</h1>
        <p className="text-slate-500 mt-1">Manage connections to third-party services.</p>
      </div>

      <div className="grid gap-6">
        {/* Xero Integration */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
          <div className="flex gap-4 items-start">
            <div className="w-12 h-12 rounded-xl bg-[#13B5EA]/10 text-[#13B5EA] flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                Xero Accounting
                {xeroConnected ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                    <AlertCircle className="w-3 h-3" /> Not Connected
                  </span>
                )}
              </h3>
              <p className="text-slate-500 text-sm mt-1 max-w-md">
                Automatically sync completed jobs, generate invoices, and track payments directly in your Xero account.
              </p>
            </div>
          </div>
          <div className="shrink-0 w-full sm:w-auto">
            <button 
              onClick={handleConnectXero}
              disabled={xeroConnected || isConnecting}
              className="w-full sm:w-auto px-4 py-2 bg-[#13B5EA] hover:bg-[#0f9bc9] disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isConnecting && <Loader2 className="w-4 h-4 animate-spin" />}
              {xeroConnected ? 'Manage Connection' : 'Connect Xero'}
            </button>
          </div>
        </div>

        {/* Email Inbox Monitoring */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
          <div className="flex gap-4 items-start">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                Email Inbox Monitoring
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                  <CheckCircle2 className="w-3 h-3" /> Active
                </span>
              </h3>
              <p className="text-slate-500 text-sm mt-1 max-w-md">
                Automatically catches incoming emails from Property Managers and creates a new job in the <strong>INTAKE</strong> column.
              </p>
              <div className="mt-3 p-2 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-600 break-all">
                Webhook URL: {window.location.origin}/api/webhooks/email
              </div>
            </div>
          </div>
          <div className="shrink-0 w-full sm:w-auto">
            <button 
              onClick={simulateIncomingEmail}
              className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Simulate Incoming Email
            </button>
          </div>
        </div>

        {/* Twilio SMS Integration */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
          <div className="flex gap-4 items-start">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                Twilio SMS Dispatch
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                  <AlertCircle className="w-3 h-3" /> Not Configured
                </span>
              </h3>
              <p className="text-slate-500 text-sm mt-1 max-w-md">
                Automatically send SMS notifications to electricians when they are dispatched to a job. Requires Twilio API credentials.
              </p>
            </div>
          </div>
          <div className="shrink-0 w-full sm:w-auto">
            <button className="w-full sm:w-auto px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors">
              Configure Twilio
            </button>
          </div>
        </div>

        {/* Firebase Integration */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
          <div className="flex gap-4 items-start">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                Firebase Database
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                  <AlertCircle className="w-3 h-3" /> Not Configured
                </span>
              </h3>
              <p className="text-slate-500 text-sm mt-1 max-w-md">
                Connect your Firebase project to sync job data, photos, and electrician field updates in real-time.
              </p>
            </div>
          </div>
          <div className="shrink-0 w-full sm:w-auto">
            <button className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors">
              Connect Firebase
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
