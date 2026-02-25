import React from 'react';
import { Job } from '../types';
import { Link } from 'react-router-dom';
import { ClipboardList, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface DashboardProps {
  jobs: Job[];
}

export function Dashboard({ jobs }: DashboardProps) {
  const stats = [
    { 
      label: 'New Intakes', 
      value: jobs.filter(j => j.status === 'INTAKE').length,
      icon: AlertCircle,
      color: 'text-blue-600',
      bg: 'bg-blue-100'
    },
    { 
      label: 'Needs Scheduling', 
      value: jobs.filter(j => j.status === 'SCHEDULING').length,
      icon: Clock,
      color: 'text-purple-600',
      bg: 'bg-purple-100'
    },
    { 
      label: 'In Field', 
      value: jobs.filter(j => ['DISPATCHED', 'EXECUTION'].includes(j.status)).length,
      icon: ClipboardList,
      color: 'text-amber-600',
      bg: 'bg-amber-100'
    },
    { 
      label: 'Awaiting Invoice', 
      value: jobs.filter(j => j.status === 'REVIEW').length,
      icon: CheckCircle2,
      color: 'text-rose-600',
      bg: 'bg-rose-100'
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${stat.bg} ${stat.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity / Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900">Action Required</h2>
            <Link to="/jobs" className="text-sm font-medium text-amber-600 hover:text-amber-700">View All Jobs &rarr;</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {jobs.filter(j => ['INTAKE', 'REVIEW'].includes(j.status)).map(job => (
              <Link key={job.id} to={`/jobs/${job.id}`} className="block p-6 hover:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm font-bold text-slate-400">{job.id}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        job.status === 'INTAKE' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-900">{job.title}</h3>
                    <p className="text-sm text-slate-500 mt-1">{job.propertyAddress}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-slate-900">
                      {job.status === 'INTAKE' ? 'Needs Contact' : 'Needs Invoicing'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>
          </div>
          <h2 className="text-lg font-bold mb-2 relative z-10">Wirez R Us Workflow</h2>
          <p className="text-slate-400 text-sm mb-6 relative z-10">Your operational command center.</p>
          
          <div className="space-y-4 relative z-10">
            <button className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-xl font-bold text-sm transition-colors">
              + Create Work Order
            </button>
            <button className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium text-sm transition-colors border border-slate-700">
              View Field Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
