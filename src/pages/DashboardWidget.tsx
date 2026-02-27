import React, { useMemo, useState } from 'react';
import { Job, Electrician } from '../types';
import { format, isToday } from 'date-fns';
import {
  ClipboardList, CheckCircle2, Clock, AlertCircle, Calendar,
  Users, Plus, Zap, ExternalLink, Minimize2, X, GripVertical, ChevronDown, ChevronRight
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
  { key: 'CLOSED', label: 'Cls', color: 'bg-emerald-500' },
] as const;

export function DashboardWidget({ jobs, electricians }: DashboardWidgetProps) {
  const [minimized, setMinimized] = useState(false);
  
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

  const closeWidget = () => {
    window.close();
  };

  const [showActions, setShowActions] = useState(true);
  const [showToday, setShowToday] = useState(true);
  const [showTeam, setShowTeam] = useState(false);

  if (minimized) {
    return (
      <div className="w-screen bg-gradient-to-r from-slate-800 to-slate-900 text-white px-3 py-1.5 flex items-center justify-between shadow-lg border-b border-slate-700 cursor-pointer hover:from-slate-700 hover:to-slate-800 transition-all" onClick={() => setMinimized(false)}>
        <div className="flex items-center gap-2">
          <div className="bg-amber-500 p-0.5 rounded">
            <Zap className="w-2.5 h-2.5 text-slate-900" />
          </div>
          <span className="text-[10px] font-semibold">Wirez</span>
          <span className="text-[9px] text-slate-400">•</span>
          <span className="text-[9px] text-slate-300">{totalActive} / {actionRequired.length}</span>
        </div>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col shadow-2xl border-2 border-slate-300">
      {/* Readable Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-lg flex-shrink-0">
        <div className="px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <GripVertical className="w-4 h-4 text-slate-500 cursor-move flex-shrink-0" title="Drag to dock" />
            <div className="bg-amber-500 p-1 rounded flex-shrink-0">
              <Zap className="w-3.5 h-3.5 text-slate-900" />
            </div>
            <span className="text-xs font-bold truncate">Wirez R Us</span>
          </div>
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            <button onClick={() => setMinimized(true)} className="p-1 hover:bg-slate-700 rounded transition-colors" title="Minimize">
              <Minimize2 className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
            </button>
            <button onClick={openFullDashboard} className="p-1 hover:bg-slate-700 rounded transition-colors" title="Open Dashboard">
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
            </button>
            <button onClick={closeWidget} className="p-1 hover:bg-rose-600 rounded transition-colors" title="Close">
              <X className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Readable Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        
        {/* Stats Row - Easy to Read */}
        <div className="grid grid-cols-2 gap-2">
          <a href={`${window.location.origin}/jobs`} target="_blank" rel="noopener noreferrer" className="bg-white rounded-lg p-3 border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Active Jobs</span>
              <span className="text-2xl font-bold text-slate-900">{totalActive}</span>
            </div>
          </a>
          <a href={`${window.location.origin}/jobs`} target="_blank" rel="noopener noreferrer" className="bg-white rounded-lg p-3 border border-rose-200 hover:border-rose-400 hover:shadow-md transition-all">
            <div className="flex flex-col">
              <span className="text-[10px] text-rose-600 uppercase font-semibold mb-1">Action Req</span>
              <span className="text-2xl font-bold text-rose-600">{actionRequired.length}</span>
            </div>
          </a>
        </div>

        {/* Pipeline Bar - Clear Visual */}
        <div className="bg-white rounded-lg p-2.5 border border-slate-200 shadow-sm">
          <div className="flex gap-1 mb-1.5">
            {PIPELINE.map(stage => {
              const count = jobs.filter(j => j.status === stage.key).length;
              return (
                <div key={stage.key} className="flex-1">
                  <div className={cn("h-2 rounded-full", stage.color)} style={{ opacity: count > 0 ? 1 : 0.25 }} />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[9px] text-slate-500 font-semibold">
            {PIPELINE.map(stage => {
              const count = jobs.filter(j => j.status === stage.key).length;
              return <span key={stage.key}>{count}</span>;
            })}
          </div>
          <div className="flex justify-between text-[8px] text-slate-400 mt-0.5">
            {PIPELINE.map(stage => <span key={stage.key}>{stage.label}</span>)}
          </div>
        </div>

        {/* Collapsible Action Required */}
        {actionRequired.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowActions(!showActions)}
              className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-500" /> Action Required ({actionRequired.length})
              </span>
              {showActions ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>
            {showActions && (
              <div className="border-t border-slate-100">
                {actionRequired.slice(0, 3).map(job => (
                  <a
                    key={job.id}
                    href={`${window.location.origin}/jobs/${job.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-3 py-2 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                  >
                    <p className="text-xs font-medium text-slate-800 truncate">{job.title}</p>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{job.propertyAddress}</p>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Collapsible Today's Schedule */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowToday(!showToday)}
            className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-500" /> Today's Schedule ({todayJobs.length})
            </span>
            {showToday ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          </button>
          {showToday && (
            <div className="border-t border-slate-100">
              {todayJobs.length > 0 ? (
                todayJobs.slice(0, 3).map(job => {
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
                        <span className="text-[10px] font-bold text-amber-600 w-14 shrink-0">
                          {format(new Date(job.scheduledDate!), 'h:mm a')}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-slate-800 truncate">{job.title}</p>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">{tech?.name || 'Unassigned'}</p>
                        </div>
                      </div>
                    </a>
                  );
                })
              ) : (
                <div className="px-3 py-3 text-center text-[10px] text-slate-400">No jobs scheduled</div>
              )}
            </div>
          )}
        </div>

        {/* Collapsible Team */}
        {techStats.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowTeam(!showTeam)}
              className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-500" /> Team ({electricians.length})
              </span>
              {showTeam ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>
            {showTeam && (
              <div className="border-t border-slate-100">
                {techStats.slice(0, 4).map(tech => (
                  <div key={tech.id} className="px-3 py-2 flex items-center gap-2 border-b border-slate-50 last:border-0">
                    <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                      {tech.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </div>
                    <span className="text-xs text-slate-700 flex-1 truncate">{tech.name}</span>
                    {tech.today > 0 && (
                      <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">{tech.today}</span>
                    )}
                    <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{tech.active}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2">
          <a href={`${window.location.origin}/jobs/new`} target="_blank" rel="noopener noreferrer"
            className="flex flex-col items-center gap-1 p-2.5 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 hover:shadow-md transition-all">
            <Plus className="w-5 h-5 text-slate-600" />
            <span className="text-[9px] font-semibold text-slate-600">New Job</span>
          </a>
          <a href={`${window.location.origin}/calendar`} target="_blank" rel="noopener noreferrer"
            className="flex flex-col items-center gap-1 p-2.5 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 hover:shadow-md transition-all">
            <Calendar className="w-5 h-5 text-slate-600" />
            <span className="text-[9px] font-semibold text-slate-600">Calendar</span>
          </a>
          <a href={`${window.location.origin}/jobs`} target="_blank" rel="noopener noreferrer"
            className="flex flex-col items-center gap-1 p-2.5 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 hover:shadow-md transition-all">
            <ClipboardList className="w-5 h-5 text-slate-600" />
            <span className="text-[9px] font-semibold text-slate-600">Job Board</span>
          </a>
        </div>
      </div>
    </div>
  );
}
