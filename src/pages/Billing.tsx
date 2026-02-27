import React from 'react';
import { CreditCard, Shield, Users, Lock, Headphones, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Billing() {
  const { license, user } = useAuth();

  // New Pricing Structure:
  // - $1500 one-time setup fee (not shown in monthly)
  // - $79/month base subscription (includes 1 admin + 1 tech)
  // - $10/month per additional tech license
  const BASE_MONTHLY = 79;
  const ADDITIONAL_TECH_COST = 10;
  const SETUP_FEE = 1500;
  
  const extraTechs = Math.max(0, (license?.techLicenses || 1) - 1);
  const totalMonthly = BASE_MONTHLY + (extraTechs * ADDITIONAL_TECH_COST);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Billing & Licenses</h1>
        <p className="text-slate-500 mt-1">Your current subscription details.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Plan */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-500" /> Current Subscription
            </h2>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${license?.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              {license?.status || 'Unknown'}
            </span>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 text-lg">{license?.plan || 'No Plan'}</p>
                  <p className="text-sm text-slate-500">{license?.tenantName || user?.email}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900 text-xl">${totalMonthly}<span className="text-sm text-slate-500 font-normal">/mo</span></p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-indigo-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-indigo-700">{license?.adminLicenses || 0}</p>
                <p className="text-xs text-indigo-600 font-medium">Admin License(s)</p>
              </div>
              <div className="p-3 bg-sky-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-sky-700">{license?.techLicenses || 0}</p>
                <p className="text-xs text-sky-600 font-medium">Tech License(s)</p>
              </div>
            </div>

            {extraTechs > 0 && (
              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
                <p>1 tech license included &middot; {extraTechs} extra @ ${ADDITIONAL_TECH_COST}/mo each = <strong>${extraTechs * ADDITIONAL_TECH_COST}/mo</strong></p>
              </div>
            )}
            
            <div className="text-xs text-slate-400 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <p className="font-semibold text-slate-600 mb-1">Pricing Breakdown:</p>
              <p>• Base: ${BASE_MONTHLY}/month (1 admin + 1 tech)</p>
              {extraTechs > 0 && <p>• Additional techs: {extraTechs} × ${ADDITIONAL_TECH_COST}/month</p>}
              <p className="text-slate-400 mt-1">One-time setup fee: ${SETUP_FEE} (paid at signup)</p>
            </div>
          </div>
        </div>

        {/* License Details */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6">
            <Lock className="w-5 h-5 text-slate-500" /> License Info
          </h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">License Type</span>
              <span className="font-medium text-slate-900 capitalize">{license?.type || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Plan</span>
              <span className="font-medium text-slate-900">{license?.plan || 'None'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Max Tech Licenses</span>
              <span className="font-medium text-slate-900">{license?.maxTechLicenses === 999 ? 'Unlimited' : license?.maxTechLicenses || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Your Role</span>
              <span className="font-medium text-slate-900 capitalize">{user?.role || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">Account Email</span>
              <span className="font-medium text-slate-900">{user?.email || 'N/A'}</span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            <p className="font-bold mb-1">Need to upgrade or add licenses?</p>
            <p>Contact your developer or reach out to support below.</p>
          </div>
        </div>
      </div>

      {/* Support Footer */}
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Headphones className="w-5 h-5 text-slate-400" />
          <div>
            <p className="text-sm font-medium text-slate-700">Need help with billing?</p>
            <p className="text-xs text-slate-500">Contact Penny Wise I.T for support.</p>
          </div>
        </div>
        <a
          href="https://www.facebook.com/pennywiseitoz"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Contact Support <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
