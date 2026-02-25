import React, { useState } from 'react';
import { CreditCard, CheckCircle2, Shield, Zap, Users } from 'lucide-react';

// Mock Plans (same as SuperAdmin for consistency)
const PLANS = [
  { id: 'p1', name: 'Basic', price: 29.99, features: ['Up to 2 Users', 'Basic Job Management'] },
  { id: 'p2', name: 'Pro', price: 79.99, features: ['Up to 10 Users', 'Advanced Scheduling', 'SMS Dispatch'], recommended: true },
  { id: 'p3', name: 'Enterprise', price: 199.99, features: ['Unlimited Users', 'API Access', 'Dedicated Support'] },
];

export function Billing() {
  const [selectedPlan, setSelectedPlan] = useState('p2');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePurchase = () => {
    setIsProcessing(true);
    // Simulate Square Payment Processing
    setTimeout(() => {
      setIsProcessing(false);
      alert("Payment Successful! License updated.");
    }, 2000);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Billing & Licenses</h1>
          <p className="text-slate-500 mt-1">Manage your subscription and payment methods.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Current Plan */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Current Subscription</h2>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Pro Plan</h3>
                  <p className="text-sm text-slate-500">Active • Renews on Dec 1, 2024</p>
                </div>
              </div>
              <span className="text-lg font-bold text-slate-900">$79.99<span className="text-sm font-normal text-slate-500">/mo</span></span>
            </div>
            
            <div className="mt-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-700">License Usage</h3>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-indigo-500 h-2 rounded-full" style={{ width: '50%' }}></div>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>5 / 10 Licenses Used</span>
                <span>5 Available</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Payment Method</h2>
            <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl mb-4">
              <div className="flex items-center gap-4">
                <CreditCard className="w-8 h-8 text-slate-400" />
                <div>
                  <p className="font-medium text-slate-900">Visa ending in 4242</p>
                  <p className="text-xs text-slate-500">Expires 12/25</p>
                </div>
              </div>
              <button className="text-sm text-blue-600 font-medium hover:underline">Edit</button>
            </div>
            <button className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4" /> Secure payments powered by Square
            </button>
          </div>
        </div>

        {/* Upgrade / Change Plan */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900">Available Plans</h2>
          <div className="space-y-4">
            {PLANS.map(plan => (
              <div 
                key={plan.id} 
                className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedPlan === plan.id 
                    ? 'border-indigo-500 bg-indigo-50 shadow-md' 
                    : 'border-slate-200 bg-white hover:border-indigo-200'
                }`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {plan.recommended && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">
                    Recommended
                  </span>
                )}
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-slate-900">{plan.name}</h3>
                  {selectedPlan === plan.id && <CheckCircle2 className="w-5 h-5 text-indigo-500" />}
                </div>
                <div className="text-2xl font-bold text-slate-900 mb-4">
                  ${plan.price}<span className="text-sm font-normal text-slate-500">/mo</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="text-xs text-slate-600 flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {feature}
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={handlePurchase}
                  disabled={isProcessing}
                  className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedPlan === plan.id 
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {isProcessing && selectedPlan === plan.id ? 'Processing...' : (selectedPlan === plan.id ? 'Upgrade Now' : 'Select Plan')}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
