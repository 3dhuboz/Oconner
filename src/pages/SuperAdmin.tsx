import React, { useState } from 'react';
import { Activity, Shield, Server, Database, Lock, Users, Save, Wifi, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Mock Data for Wirez R Us Staff
const STAFF = [
  { id: 'u1', name: 'John Spark', role: 'ADMIN', email: 'john@wirezrus.com', status: 'Active' },
  { id: 'u2', name: 'Sarah Watt', role: 'OFFICE', email: 'sarah@wirezrus.com', status: 'Active' },
  { id: 'u3', name: 'Mike Volt', role: 'TECH', email: 'mike@wirezrus.com', status: 'Active' },
  { id: 'u4', name: 'Dev User', role: 'SUPER_ADMIN', email: 'dev@agency.com', status: 'Active' },
];

export function SuperAdmin() {
  const { backendStatus, license } = useAuth();
  const [featureFlags, setFeatureFlags] = useState({
    smsDispatch: true,
    xeroIntegration: true,
    complianceGenerator: true,
    betaFeatures: false
  });

  const toggleFeature = (key: keyof typeof featureFlags) => {
    setFeatureFlags(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
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
          
          {/* Feature Flags */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900">Feature Configuration</h3>
              <button className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded-lg flex items-center gap-1">
                <Save className="w-3 h-3" /> Save Changes
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(featureFlags).map(([key, enabled]) => (
                <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-sm font-medium text-slate-700 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <button 
                    onClick={() => toggleFeature(key as keyof typeof featureFlags)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* User Management */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4" /> User Management
              </h3>
              <button className="text-sm text-blue-600 font-medium hover:underline">+ Add User</button>
            </div>
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {STAFF.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3">
                      <div className="font-medium text-slate-900">{user.name}</div>
                      <div className="text-xs text-slate-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold uppercase ${
                        user.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {user.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-emerald-600 font-medium text-xs">Active</span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button className="text-slate-400 hover:text-slate-600">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}
