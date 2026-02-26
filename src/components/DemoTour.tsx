import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChevronRight, X, PlayCircle, CheckCircle2 } from 'lucide-react';

export function DemoTour() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Only show for demo user
  if (!user?.isDemo || !isVisible) return null;

  const tourSteps = [
    {
      title: "Welcome to Wirez R Us",
      content: "This is the Dashboard. It gives you a bird's-eye view of your electrical business, active jobs, and daily revenue.",
      route: "/",
      buttonText: "Next: See Automation"
    },
    {
      title: "1. Email-to-Job Automation",
      content: "Clients email your dedicated address, and the system automatically creates a Work Order. No more manual data entry!",
      route: "/integrations",
      buttonText: "Next: Dispatching"
    },
    {
      title: "2. Drag & Drop Dispatch",
      content: "New jobs appear in the 'Unassigned' column. Simply drag a job onto a technician to instantly dispatch it to their mobile phone.",
      route: "/jobs",
      buttonText: "Next: Field Portal"
    },
    {
      title: "3. The Tech Mobile Portal",
      content: "Technicians get a simplified mobile view to see job details, get directions, and mark jobs as complete from the field.",
      route: "/field/j1",
      buttonText: "Next: Instant Invoicing"
    },
    {
      title: "4. Instant Xero Invoicing",
      content: "Once the tech taps 'Complete', the job automatically syncs to Xero. Your invoice is generated instantly, improving cash flow.",
      route: "/integrations",
      buttonText: "Finish Tour"
    }
  ];

  const currentStepData = tourSteps[step];

  const handleNext = () => {
    if (step < tourSteps.length - 1) {
      const nextStep = step + 1;
      setStep(nextStep);
      navigate(tourSteps[nextStep].route);
    } else {
      setIsVisible(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 w-80 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 overflow-hidden z-50 animate-in slide-in-from-bottom-10">
      <div className="bg-amber-500 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-slate-900">
          <PlayCircle className="w-5 h-5" />
          Guided Tour ({step + 1}/{tourSteps.length})
        </div>
        <button onClick={() => setIsVisible(false)} className="text-slate-900 hover:bg-amber-600 p-1 rounded-lg transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-5 space-y-4">
        <h3 className="font-bold text-lg">{currentStepData.title}</h3>
        <p className="text-slate-300 text-sm leading-relaxed">
          {currentStepData.content}
        </p>
        <div className="pt-4 flex justify-end">
          <button 
            onClick={handleNext}
            className="bg-white text-slate-900 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors flex items-center gap-2"
          >
            {currentStepData.buttonText}
            {step < tourSteps.length - 1 ? <ChevronRight className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
