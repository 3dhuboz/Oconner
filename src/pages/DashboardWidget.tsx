import React, { useMemo } from 'react';
import { Job, Electrician } from '../types';
import { Link } from 'react-router-dom';
import { format, isToday } from 'date-fns';
import {
  ClipboardList, CheckCircle2, Clock, AlertCircle, Calendar,
  Users, Plus, MapPin, ArrowRight, Zap, ExternalLink, Maximize2
} from 'lucide-react';
import { cn } from '../utils';

interface DashboardWidgetProps {
  jobs: Job[];
  electricians: Electrician[];
}

const PIPELINE = [
  { key: 'INTAKE', label: 'In', color: 'bg-blue-500' },
  { key: 'SCHEDULING', label: 'Sch', color: 'bg-purple-500' },
  { key: 'DISPATCHED', label: 'Dis', color: 'bg-amber-500' },
  { key: 'EXECUTION', label: 'Fld', color: 'bg-orange-500' },
  { key: 'REVIEW', label: 'Rev', color: 'bg-rose-500' },
  { key: 'CLOSED', label: 'Done', color: 'bg-emerald-500' },
] as const;

export function DashboardWidget({ jobs, electricians }: DashboardWidgetProps) {
  const totalActive = jobs.filter(j => j.status !== 'CLOSED').length;
  const actionRequired = jobs.filter(j => ['INTAKE', 'REVIEW'].includes(j.status));
  const todayJobs = useMemo(() => {
    return jobs.filter(j => j.scheduledDate && isToday(new Date(j.scheduledDate)))
      .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime());
  }, [jobs]);

  const techStats = useMemo(() => {
    return electricians.map(e => ({
      ...e,
      active: jobs.filter(j => j.assignedElectricianId === e.id && !['CLOSED', 'REVIEW'].includes(j.status)).length,
      today: jobs.filter(j => j.assignedElectricianId === e.id && j.scheduledDate && isToday(new Date(j.scheduledDate))).length,
    }));
  }, [electricians, jobs]);

  const openFullDashboard = () => {
    window.open(window.location.origin + '/', '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-100 p-3">
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="bg-amber-500 p-1.5 rounded-lg">
            <Zap className="w-4 h-4 text-slate-900" />
          </div>
          <span className="text-sm font-bold text-slate-800">Wirez R Us</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400">{format(new Date(), 'EEE d MMM')}</span>
          <button
            onClick={openFullDashboard}
            className="p-1 hover:bg-white rounded transition-colors text-slate-400 hover:text-slate-700"
            title="Open full dashboard"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mini KPI Row */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <Link to="/jobs" className="bg-white rounded-lg p-2.5 border border-slate-200 hover:border-slate-300 transition-all text-center group" target="_blank">
          <p className="text-lg font-bold text-slate-900">{totalActive}</p>
          <p className="text-[10px] text-slate-500 group-hover:text-blue-600">Active</p>
        </Link>
        <Link to="/jobs" className="bg-white rounded-lg p-2.5 border border-slate-200 hover:border-slate-300 transition-all text-center group" target="_blank">
          <p className="text-lg font-bold text-rose-600">{actionRequired.length}</p>
          <p className="text-[10px] text-slate-500 group-hover:text-rose-600">Action</p>
        </Link>
        <Link to="/calendar" className="bg-white rounded-lg p-2.5 border border-slate-200 hover:border-slate-300 transition-all text-center group" target="_blank">
          <p className="text-lg font-bold text-slate-900">{todayJobs.length}</p>
          <p className="text-[10px] text-slate-500 group-hover:text-amber-600">Today</p>
        </Link>
        <Link to="/team" className="bg-white rounded-lg p-2.5 border border-slate-200 hover:border-slate-300 transition-all text-center group" target="_blank">
          <p className="text-lg font-bold text-slate-900">{electricians.length}</p>
          <p className="text-[10px] text-slate-500 group-hover:text-emerald-600">Techs</p>
        </Link>
      </div>

      {/* Mini Pipeline */}
      <div className="bg-white rounded-lg border border-slate-200 p-2.5 mb-3">
        <div className="flex items-center gap-1">
          {PIPELINE.map(stage => {
            const count = jobs.filter(j => j.status === stage.key).length;
            return (
              <Link key={stage.key} to="/jobs" target="_blank" className="flex-1 text-center group">
                <div className={cn("h-1.5 rounded-full mb-1 transition-all group-hover:h-2", stage.color)} />
                <span className="text-xs font-bold text-slate-800">{count}</span>
                <p className="text-[8px] text-slate-400 uppercase">{stage.label}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Action Required Feed */}
      {actionRequired.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 mb-3 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-rose-500" /> Action Required
            </span>
            <Link to="/jobs" target="_blank" className="text-[10px] text-indigo-600 hover:text-indigo-700">all</Link>
          </div>
          {actionRequired.slice(0, 4).map(job => (
            <a
              key={job.id}
              href={`${window.location.origin}/jobs/${job.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-3 py-2 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-slate-800 truncate">{job.title}</p>
                <span className={cn('text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0',
                  job.status === 'INTAKE' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'
                )}>
                  {job.status === 'INTAKE' ? 'Contact' : 'Invoice'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">{job.propertyAddress}</p>
            </a>
          ))}
        </div>
      )}

      {/* Today's Schedule */}
      <div className="bg-white rounded-lg border border-slate-200 mb-3 overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-amber-500" /> Today
          </span>
          <Link to="/calendar" target="_blank" className="text-[10px] text-indigo-600 hover:text-indigo-700">calendar</Link>
        </div>
        {todayJobs.length > 0 ? (
          todayJobs.slice(0, 4).map(job => {
            const tech = electricians.find(e => e.id === job.assignedElectricianId);
            return (
              <a
                key={job.id}
                href={`${window.location.origin}/jobs/${job.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-2 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-amber-600 w-12 shrink-0">
                    {format(new Date(job.scheduledDate!), 'h:mm a')}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate">{job.title}</p>
                    <p className="text-[10px] text-slate-400 truncate">{tech?.name || 'Unassigned'}</p>
                  </div>
                </div>
              </a>
            );
          })
        ) : (
          <div className="p-4 text-center text-[11px] text-slate-400">No jobs today</div>
        )}
      </div>

      {/* Team Quick View */}
      {techStats.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 mb-3 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100">
            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <Users className="w-3 h-3 text-emerald-500" /> Team
            </span>
          </div>
          {techStats.map(tech => (
            <div key={tech.id} className="px-3 py-1.5 flex items-center gap-2 border-b border-slate-50 last:border-0">
              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600 shrink-0">
                {tech.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </div>
              <span className="text-xs text-slate-700 flex-1 truncate">{tech.name}</span>
              {tech.today > 0 && (
                <span className="text-[8px] font-bold bg-amber-100 text-amber-700 px-1 py-0.5 rounded">{tech.today} today</span>
              )}
              <span className="text-[8px] font-bold bg-slate-100 text-slate-500 px-1 py-0.5 rounded">{tech.active}</span>
            </div>
          ))}
        </div>
      )}

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <a href={`${window.location.origin}/jobs/new`} target="_blank" rel="noopener noreferrer"
          className="flex flex-col items-center gap-1 p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
          <Plus className="w-4 h-4 text-slate-600" />
          <span className="text-[9px] font-semibold text-slate-600">New Job</span>
        </a>
        <a href={`${window.location.origin}/calendar`} target="_blank" rel="noopener noreferrer"
          className="flex flex-col items-center gap-1 p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
          <Calendar className="w-4 h-4 text-slate-600" />
          <span className="text-[9px] font-semibold text-slate-600">Calendar</span>
        </a>
        <a href={`${window.location.origin}/jobs`} target="_blank" rel="noopener noreferrer"
          className="flex flex-col items-center gap-1 p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
          <ClipboardList className="w-4 h-4 text-slate-600" />
          <span className="text-[9px] font-semibold text-slate-600">Board</span>
        </a>
      </div>
    </div>
  );
}
