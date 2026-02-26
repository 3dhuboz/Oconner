import React from 'react';
import { Zap, Clock, DollarSign, Smartphone, Mail, CheckCircle2, ArrowRight, TrendingUp, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PromoFlyer() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 print:bg-white print:py-0">
      {/* Flyer Container */}
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden print:shadow-none print:rounded-none">
        
        {/* Header Section */}
        <div className="bg-slate-900 text-white px-8 py-16 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            {/* Abstract background pattern */}
            <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full border-[40px] border-amber-500"></div>
            <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full border-[30px] border-emerald-500"></div>
          </div>
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-amber-500 text-slate-900 px-4 py-1.5 rounded-full font-bold text-sm mb-6 tracking-wide uppercase">
              <Zap className="w-4 h-4" /> Wirez R Us CRM
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
              Stop Chasing Paperwork.<br/>
              <span className="text-amber-400">Start Growing Your Business.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto font-medium">
              The all-in-one field service management platform built specifically for modern electrical contractors.
            </p>
          </div>
        </div>

        {/* The Money-Saving Workflow */}
        <div className="px-8 py-16 bg-emerald-50">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">The Workflow That Pays For Itself</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Every manual step in your business costs you money. We automated the entire lifecycle of a job so you can drastically reduce admin overhead and get paid faster.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting Lines (Desktop only) */}
            <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-0.5 bg-emerald-200 z-0"></div>

            {/* Step 1 */}
            <div className="relative z-10 bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                <Mail className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">1. Auto-Create</h3>
              <p className="text-sm text-slate-600 mb-4">
                Client emails a work request. Our system reads it and instantly generates a Work Order.
              </p>
              <div className="bg-emerald-50 text-emerald-700 text-xs font-bold py-2 px-3 rounded-lg inline-block">
                Saves ~15 mins of data entry
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative z-10 bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                <Smartphone className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">2. Field Dispatch</h3>
              <p className="text-sm text-slate-600 mb-4">
                Drag and drop the job to a tech. It pings their mobile portal instantly with all details.
              </p>
              <div className="bg-emerald-50 text-emerald-700 text-xs font-bold py-2 px-3 rounded-lg inline-block">
                Eliminates phone tag & lost notes
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative z-10 bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                <DollarSign className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">3. Instant Invoice</h3>
              <p className="text-sm text-slate-600 mb-4">
                Tech taps "Complete". The job auto-syncs to Xero and the invoice is ready to send.
              </p>
              <div className="bg-emerald-50 text-emerald-700 text-xs font-bold py-2 px-3 rounded-lg inline-block">
                Improves cash flow by days
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="px-8 py-16">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Everything You Need. Nothing You Don't.</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <div className="shrink-0 mt-1">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Email-to-Job Automation</h3>
                <p className="text-slate-600 leading-relaxed">
                  Give your clients a dedicated email address. When they email a request, it automatically appears on your Job Board. No more manually typing out work orders from your inbox.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="shrink-0 mt-1">
                <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Mobile Tech Portal</h3>
                <p className="text-slate-600 leading-relaxed">
                  Your electricians get a clean, simple mobile view. They can see their daily schedule, get directions, read job notes, and mark jobs complete right from the field.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="shrink-0 mt-1">
                <div className="w-10 h-10 bg-sky-100 text-sky-600 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Seamless Xero Sync</h3>
                <p className="text-slate-600 leading-relaxed">
                  Stop double-entering data. When a job is marked complete in the field, it automatically pushes to Xero so your office can invoice the client immediately.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="shrink-0 mt-1">
                <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Real-Time Dashboard</h3>
                <p className="text-slate-600 leading-relaxed">
                  Know exactly what's happening in your business. See active jobs, unassigned work, and daily revenue estimates at a single glance.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ROI Section */}
        <div className="bg-slate-900 text-white px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-amber-500" /> The Bottom Line
              </h2>
              <p className="text-slate-300">
                If your admin staff spends just 2 hours a day doing manual data entry, and your techs waste 30 minutes a day calling the office for job details, <strong>you are losing thousands of dollars a month.</strong> Wirez R Us reclaims that time.
              </p>
            </div>
            <div className="shrink-0 w-full md:w-auto text-center">
              <Link to="/purchase" className="inline-flex items-center justify-center gap-2 bg-amber-500 text-slate-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-amber-400 transition-colors w-full md:w-auto print:hidden">
                Get Started Now <ArrowRight className="w-5 h-5" />
              </Link>
              <p className="hidden print:block text-amber-400 font-bold mt-4">Visit wirezrus.com to get started</p>
            </div>
          </div>
        </div>

      </div>
      
      {/* Print Helper */}
      <div className="text-center mt-8 print:hidden">
        <button 
          onClick={() => window.print()}
          className="text-slate-500 hover:text-slate-800 font-medium underline"
        >
          Print this flyer or save as PDF
        </button>
      </div>
    </div>
  );
}
