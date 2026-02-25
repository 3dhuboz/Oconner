import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { CreditCard, CheckCircle2, Shield, Zap, Users, Loader2 } from 'lucide-react';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

export function Billing() {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetch('/api/stripe/plans')
      .then(res => res.json())
      .then(data => {
        setPlans(data.plans);
        const recommended = data.plans.find((p: any) => p.metadata.recommended === 'true');
        if (recommended) setSelectedPlan(recommended.id);
      });
  }, []);

  const handlePurchase = async (priceId: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });
      const { sessionId } = await response.json();
      const stripe = await stripePromise;
      await stripe?.redirectToCheckout({ sessionId });
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Failed to start payment process. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-slate-900">Billing & Licenses</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Current Plan & Payment Method would go here */}
        </div>
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900">Available Plans</h2>
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
                <div className="text-2xl font-bold text-slate-900 mb-4">
                  ${(plan.unit_amount / 100).toFixed(2)}<span className="text-sm font-normal text-slate-500">/mo</span>
                </div>
                <button 
                  onClick={() => handlePurchase(plan.id)}
                  disabled={isProcessing}
                  className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedPlan === plan.id 
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {isProcessing && selectedPlan === plan.id ? <Loader2 className="w-4 h-4 mx-auto animate-spin" /> : (selectedPlan === plan.id ? 'Upgrade Now' : 'Select Plan')}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
