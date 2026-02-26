import React, { useState, useEffect } from 'react';
import { Activity, Shield, Server, Database, Lock, Users, Save, Wifi, AlertTriangle, Flame, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils';

// Mock Data for Wirez R Us Staff
const STAFF = [
  { id: 'u1', name: 'John Spark', role: 'ADMIN', email: 'john@wirezrus.com', status: 'Active' },
  { id: 'u2', name: 'Sarah Watt', role: 'OFFICE', email: 'sarah@wirezrus.com', status: 'Active' },
  { id: 'u3', name: 'Mike Volt', role: 'TECH', email: 'mike@wirezrus.com', status: 'Active' },
  { id: 'u4', name: 'Dev User', role: 'SUPER_ADMIN', email: 'dev@agency.com', status: 'Active' },
];

const initialFirebaseConfig = {
  apiKey: '', authDomain: '', projectId: '', storageBucket: '', messagingSenderId: '', appId: ''
};

const initialApiKeys = {
  xeroClientId: '', xeroClientSecret: '', twilioAccountSid: '', twilioAuthToken: '', twilioPhoneNumber: ''
};

export function SuperAdmin() {
  const { backendStatus, license } = useAuth();
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  
  // State for current values
  const [firebaseConfig, setFirebaseConfig] = useState(initialFirebaseConfig);
  const [apiKeys, setApiKeys] = useState(initialApiKeys);

  // State for pristine (un-edited) values
  const [pristineFirebaseConfig, setPristineFirebaseConfig] = useState(initialFirebaseConfig);
  const [pristineApiKeys, setPristineApiKeys] = useState(initialApiKeys);

  const firebaseConfigChanged = JSON.stringify(firebaseConfig) !== JSON.stringify(pristineFirebaseConfig);
  const apiKeysChanged = JSON.stringify(apiKeys) !== JSON.stringify(pristineApiKeys);

  const handleConfigChange = (setter: React.Dispatch<React.SetStateAction<any>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = (configName: 'Firebase' | 'API Keys') => {
    if (configName === 'Firebase') {
      console.log('Saving Firebase Config...', firebaseConfig);
      setPristineFirebaseConfig(firebaseConfig);
    } else {
      console.log('Saving API Keys...', apiKeys);
      setPristineApiKeys(apiKeys);
    }
    setShowSaveConfirmation(true);
    setTimeout(() => setShowSaveConfirmation(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Global Save Confirmation Toast */}
      <div className={`fixed top-5 right-5 bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg transition-transform duration-300 ${showSaveConfirmation ? 'translate-x-0' : 'translate-x-[calc(100%+20px)]'}`}>
        Configuration Saved!
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dev Console</h1>
          <p className="text-slate-500 mt-1">System configuration and license management for Wirez R Us.</p>
        </div>
        <div className="bg-slate-900 text-white px-4 py-2 rounded-lg font-mono text-xs flex items-center gap-2">
          <Shield className="w-4 h-4" /> SUPER_ADMIN_ACCESS
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: System Health & License */}
        <div className="space-y-6">
          {/* License Control */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">App License</h3>
                <p className="text-xs text-slate-500">Managed by Developer</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Status</span>
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${license?.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {license?.status || 'UNKNOWN'}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Plan Type</span>
                <span className="font-medium">{license?.plan || 'N/A'}</span>
              </div>
              
              <div className="pt-4 border-t border-slate-100">
                <button className="w-full py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium transition-colors">
                  Extend License (Dev Only)
                </button>
              </div>
            </div>
          </div>

          {/* System Health */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" /> Backend Monitoring
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-600"><Server className="w-3 h-3" /> API Latency</span>
                <span className={`font-mono font-medium ${backendStatus.latency > 100 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {backendStatus.latency}ms
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-600"><Database className="w-3 h-3" /> Firebase</span>
                <span className={`font-medium flex items-center gap-1 ${backendStatus.firebase ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {backendStatus.firebase ? 'Connected' : 'Disconnected'}
                  {!backendStatus.firebase && <AlertTriangle className="w-3 h-3" />}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-600"><Wifi className="w-3 h-3" /> Connection</span>
                <span className="text-emerald-600 font-medium">Stable</span>
              </div>
            </div>
          </div>
        </div>

        {/* Middle/Right: Configuration & Staff */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Firebase Configuration */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" /> Firebase Configuration
              </h3>
              <button 
                onClick={() => handleSave('Firebase')}
                disabled={!firebaseConfigChanged}
                className={cn("text-xs text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors",
                  firebaseConfigChanged ? "bg-slate-900 hover:bg-slate-800" : "bg-slate-400 cursor-not-allowed"
                )}
              >
                <Save className="w-3 h-3" /> Save Config
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.keys(firebaseConfig).map(key => (
                <div className="space-y-1" key={key}>
                  <label className="text-xs font-medium text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                  <input 
                    type="text" 
                    name={key}
                    value={firebaseConfig[key as keyof typeof firebaseConfig]}
                    onChange={handleConfigChange(setFirebaseConfig)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* API Key Management */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-sky-500" /> 3rd Party API Keys
              </h3>
              <button 
                onClick={() => handleSave('API Keys')}
                disabled={!apiKeysChanged}
                className={cn("text-xs text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors",
                  apiKeysChanged ? "bg-slate-900 hover:bg-slate-800" : "bg-slate-400 cursor-not-allowed"
                )}
              >
                <Save className="w-3 h-3" /> Save Keys
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500">Xero Client ID</label>
                <input type="text" name="xeroClientId" value={apiKeys.xeroClientId} onChange={handleConfigChange(setApiKeys)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500">Xero Client Secret</label>
                <input type="password" name="xeroClientSecret" value={apiKeys.xeroClientSecret} onChange={handleConfigChange(setApiKeys)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500">Twilio Account SID</label>
                <input type="text" name="twilioAccountSid" value={apiKeys.twilioAccountSid} onChange={handleConfigChange(setApiKeys)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500">Twilio Auth Token</label>
                <input type="password" name="twilioAuthToken" value={apiKeys.twilioAuthToken} onChange={handleConfigChange(setApiKeys)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-slate-500">Twilio Phone Number</label>
                <input type="text" name="twilioPhoneNumber" value={apiKeys.twilioPhoneNumber} onChange={handleConfigChange(setApiKeys)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono" />
              </div>
            </div>
          </div>

          {/* Feature Flags & User Management can go here */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-500" /> System Logs
            </h3>
            <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-emerald-400 h-48 overflow-y-auto space-y-2">
              <p>[{new Date().toISOString()}] SYSTEM: Dev Console initialized.</p>
              <p>[{new Date().toISOString()}] AUTH: Admin user authenticated.</p>
              <p>[{new Date().toISOString()}] DB: Firebase connection verified.</p>
              <p className="text-slate-500">Waiting for new events...</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-bold mb-1">Developer Note: Environment Variables</p>
          <p>While you can save configuration here for testing, it is highly recommended to use environment variables (e.g., in Vercel) for production secrets like API keys and Firebase config. This ensures your secrets are never exposed in the client-side code.</p>
        </div>
      </div>
    </div>
  );
}
