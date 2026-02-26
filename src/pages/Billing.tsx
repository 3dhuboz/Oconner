import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, Shield, Zap, Users, Loader2, AlertCircle } from 'lucide-react';

// Mock Plans Data
const MOCK_PLANS = [
  {
    id: 'price_basic',
    nickname: 'Starter',
    unit_amount: 4900,
    metadata: { recommended: 'false', features: 'Up to 3 Techs, Basic Scheduling, Email Support' }
  },
  {
    id: 'price_pro',
    nickname: 'Professional',
    unit_amount: 9900,
    metadata: { recommended: 'true', features: 'Up to 10 Techs, Advanced Routing, Xero Sync, Priority Support' }
  },
  {
    id: 'price_enterprise',
    nickname: 'Enterprise',
    unit_amount: 24900,
    metadata: { recommended: 'false', features: 'Unlimited Techs, Custom API Access, Dedicated Account Manager' }
  }
];

export function Billing() {
  const [plans, setPlans] = useState(MOCK_PLANS);
  const [selectedPlan, setSelectedPlan] = useState('price_pro');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePurchase = async (priceId: string) => {
    setIsProcessing(true);
    // Simulate API call
    setTimeout(() => {
      setIsProcessing(false);
      alert('Stripe integration requires backend configuration. Please set up your Stripe API keys in the Dev Console.');
    }, 1500);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Billing & Licenses</h1>
        <p className="text-slate-500 mt-1">Manage your subscription and payment methods.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Current Plan */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-500" /> Current Subscription
              </h2>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">Active</span>
            </div>
            
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900 text-lg">Starter Plan</p>
                <p className="text-sm text-slate-500">3 Technician Licenses Included</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-900 text-xl">$49.00<span className="text-sm text-slate-500 font-normal">/mo</span></p>
                <p className="text-xs text-slate-400 mt-1">Renews on Oct 1, 2024</p>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-slate-500" /> Payment Method
              </h2>
              <button className="text-sm font-medium text-blue-600 hover:text-blue-700">Update</button>
            </div>
            
            <div className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl">
              <div className="w-12 h-8 bg-slate-100 rounded flex items-center justify-center border border-slate-200">
                <span className="font-bold text-slate-800 text-xs italic">VISA</span>
              </div>
              <div>
                <p className="font-medium text-slate-900">Visa ending in 4242</p>
                <p className="text-xs text-slate-500">Expires 12/2025</p>
              </div>
            </div>
          </div>
          
          {/* Billing History */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-6">Billing History</h2>
            <div className="space-y-4">
              {[
                { date: 'Sep 1, 2024', amount: '$49.00', status: 'Paid', invoice: '#INV-003' },
                { date: 'Aug 1, 2024', amount: '$49.00', status: 'Paid', invoice: '#INV-002' },
                { date: 'Jul 1, 2024', amount: '$49.00', status: 'Paid', invoice: '#INV-001' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{item.date}</p>
                    <p className="text-xs text-slate-500">{item.invoice}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-slate-900 text-sm">{item.amount}</p>
                    <p className="text-xs text-emerald-600 font-medium">{item.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Available Plans */}
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Payments are currently in <strong>Test Mode</strong>. No real charges will be made.
            </p>
          </div>
          
          <h2 className="text-xl font-bold text-slate-900">Upgrade Plan</h2>
          <div className="space-y-4">
            {plans.map((plan: any) => (
              <div 
                key={plan.id} 
                className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedPlan === plan.id 
                    ? 'border-indigo-500 bg-indigo-50 shadow-md' 
                    : 'border-slate-200 bg-white hover:border-indigo-200'
                }`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {plan.metadata.recommended === 'true' && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">
                    Recommended
                  </span>
                )}
                <h3 className="font-bold text-slate-900">{plan.nickname}</h3>
                <div className="text-2xl font-bold text-slate-900 mb-2">
                  ${(plan.unit_amount / 100).toFixed(2)}<span className="text-sm font-normal text-slate-500">/mo</span>
                </div>
                
                <ul className="text-xs text-slate-600 space-y-2 mb-6">
                  {plan.metadata.features.split(', ').map((feature: string, i: number) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button 
                  onClick={(e) => { e.stopPropagation(); handlePurchase(plan.id); }}
                  disabled={isProcessing}
                  className={`w-full py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
                    selectedPlan === plan.id 
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {isProcessing && selectedPlan === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : (selectedPlan === plan.id ? 'Upgrade Now' : 'Select Plan')}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
