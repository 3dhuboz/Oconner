import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Database, DollarSign, CheckCircle2, AlertCircle, Loader2, Mail, MessageSquare, ExternalLink, Copy, PlayCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils';
import { db } from '../services/firebase';
import { collection, addDoc } from 'firebase/firestore';
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

export function Integrations() {
  const { backendStatus } = useAuth();
  const navigate = useNavigate();
  const [xeroConnected, setXeroConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [forwardingEmail, setForwardingEmail] = useState<string | null>(null);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

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

  const handleGenerateEmail = () => {
    setIsGeneratingEmail(true);
    // Simulate API call to generate a unique inbound email address
    setTimeout(() => {
      setForwardingEmail('jobs-8f92a@inbound.wirezrus.com');
      setIsGeneratingEmail(false);
    }, 1200);
  };

  const handleSimulateEmail = async () => {
    if (!db) {
      toast.error('Firebase is not connected');
      return;
    }
    
    setIsSimulating(true);
    
    try {
      const newJob = {
        title: 'Emergency: Sparking Outlet in Kitchen',
        status: 'INTAKE',
        location: '42 Wallaby Way, Sydney',
        propertyAddress: '42 Wallaby Way, Sydney',
        description: 'Hi Wirez R Us,\n\nI have a sparking outlet in my kitchen that smells like burning plastic. Please send someone ASAP!\n\nThanks,\nP. Sherman',
        tenantName: 'P. Sherman',
        tenantPhone: '0412 345 678',
        tenantEmail: 'psherman@example.com',
        type: 'EMERGENCY',
        contactAttempts: [],
        materials: [],
        photos: [],
        createdAt: new Date().toISOString()
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

        <IntegrationCard
          icon={Mail}
          title="Email-to-Job Automation"
          status={{ text: 'Active', color: 'green' }}
          statusColor={{ bg: 'bg-blue-500/10', text: 'text-blue-500' }}
          onAction={handleSimulateEmail}
          actionText="Simulate Inbound Email"
          isConnecting={isSimulating}
        >
          <p>Automatically create new jobs by simply forwarding emails from your clients to a unique Wirez R Us address.</p>
          
          <div className="mt-4 space-y-3">
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800">
              <p className="font-semibold mb-1">Setup Complete!</p>
              <p>Set up an auto-forwarding rule in your email provider (Gmail, Outlook, etc.) to send emails to the address below.</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 flex items-center justify-between">
              <span className="truncate pr-4 font-bold">jobs-8f92a@inbound.wirezrus.com</span>
              <button onClick={() => copyToClipboard('jobs-8f92a@inbound.wirezrus.com')} className="text-slate-400 hover:text-slate-600 transition-colors">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        </IntegrationCard>

        <IntegrationCard
          icon={Database}
          title="Firebase Database"
          status={{ text: backendStatus.firebase ? 'Connected' : 'Not Configured', color: backendStatus.firebase ? 'green' : 'amber' }}
          statusColor={{ bg: 'bg-amber-500/10', text: 'text-amber-500' }}
        >
          <p>Connect your Firebase project to sync job data, photos, and electrician field updates in real-time.</p>
          <p className="text-xs">Configuration is managed in the <Link to="/admin" className="text-blue-600 underline">Dev Console</Link>.</p>
        </IntegrationCard>
      </div>
    </div>
  );
}
