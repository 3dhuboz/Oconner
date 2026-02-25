import React from 'react';
import { Job } from '../types';
import { Link } from 'react-router-dom';
import { ClipboardList, CheckCircle2, Clock, AlertCircle, ArrowRight, Calendar, Users, Plus, Zap } from 'lucide-react';
import { cn } from '../utils';

interface DashboardProps {
  jobs: Job[];
}

const StatCard = ({ label, value, icon: Icon, color, to }: { label: string, value: number, icon: React.ElementType, color: string, to: string }) => (
  <Link to={to} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-slate-300 transition-colors group">
    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", color)}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm font-medium text-slate-500 group-hover:text-slate-700">{label}</p>
    </div>
  </Link>
);

const ActionButton = ({ to, icon: Icon, title, subtitle, className }: { to: string, icon: React.ElementType, title: string, subtitle: string, className?: string }) => (
  <Link to={to} className={cn("p-6 rounded-2xl text-white relative overflow-hidden group transition-transform hover:scale-[1.02]", className)}>
    <div className="relative z-10">
      <div className="bg-white/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="font-bold text-lg">{title}</h3>
      <p className="text-sm opacity-80">{subtitle}</p>
      <div className="absolute bottom-4 right-4 bg-white/20 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowRight className="w-4 h-4" />
      </div>
    </div>
  </Link>
);

export function Dashboard({ jobs }: DashboardProps) {
  const stats = [
    { label: 'New Intakes', value: jobs.filter(j => j.status === 'INTAKE').length, icon: AlertCircle, color: 'bg-blue-500', to: '/jobs?status=INTAKE' },
    { label: 'Needs Scheduling', value: jobs.filter(j => j.status === 'SCHEDULING').length, icon: Clock, color: 'bg-purple-500', to: '/jobs?status=SCHEDULING' },
    { label: 'In Field', value: jobs.filter(j => ['DISPATCHED', 'EXECUTION'].includes(j.status)).length, icon: ClipboardList, color: 'bg-amber-500', to: '/jobs?status=IN_FIELD' },
    { label: 'Awaiting Invoice', value: jobs.filter(j => j.status === 'REVIEW').length, icon: CheckCircle2, color: 'bg-rose-500', to: '/jobs?status=REVIEW' },
  ];

  const actionRequiredJobs = jobs.filter(j => ['INTAKE', 'REVIEW'].includes(j.status)).slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
      
      {/* Top Row: Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </div>

      {/* Main Grid: Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Quick Actions */}
        <div className="lg:col-span-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
          <ActionButton to="/jobs/new" icon={Plus} title="New Work Order" subtitle="Create and assign a new job" className="bg-slate-800" />
          <ActionButton to="/calendar" icon={Calendar} title="Field Schedule" subtitle="View and manage appointments" className="bg-indigo-500" />
          <ActionButton to="/team" icon={Users} title="Manage Team" subtitle="Add or edit electricians" className="bg-emerald-500" />
        </div>

        {/* Right Column: Action Required */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900">Action Required</h2>
            <Link to="/jobs" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {actionRequiredJobs.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {actionRequiredJobs.map(job => (
                <Link key={job.id} to={`/jobs/${job.id}`} className="block p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-800">{job.title}</p>
                      <p className="text-sm text-slate-500">{job.propertyAddress}</p>
                    </div>
                    <div className="text-right">
                      <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                        job.status === 'INTAKE' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'
                      )}>
                        {job.status === 'INTAKE' ? 'Needs Contact' : 'Needs Invoicing'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400 mb-2" />
              <h3 className="font-semibold">All caught up!</h3>
              <p className="text-sm">There are no jobs that require immediate action.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
