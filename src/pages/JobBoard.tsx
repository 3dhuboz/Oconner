import React, { useState, useEffect } from 'react';
import { Job, JobStatus } from '../types';
import { format } from 'date-fns';
import { Clock, MapPin, User, AlertTriangle, Bell, BellOff, ArrowDownUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../utils';

interface JobBoardProps {
  jobs: Job[];
}

const COLUMNS: { id: JobStatus; label: string; color: string }[] = [
  { id: 'INTAKE', label: '1. Intake', color: 'bg-blue-500' },
  { id: 'SCHEDULING', label: '2. Scheduling', color: 'bg-purple-500' },
  { id: 'DISPATCHED', label: '3. Dispatched', color: 'bg-amber-500' },
  { id: 'EXECUTION', label: '4. Execution', color: 'bg-orange-500' },
  { id: 'REVIEW', label: '5. Admin Review', color: 'bg-rose-500' },
  { id: 'CLOSED', label: '6. Closed', color: 'bg-emerald-500' },
];

type Priority = 'emergency' | 'urgent' | 'routine';

function getPriority(job: Job): Priority {
  const u = (job.urgency || job.title || '').toLowerCase();
  if (u.includes('emergency')) return 'emergency';
  if (u.includes('urgent')) return 'urgent';
  return 'routine';
}

const PRIORITY_ORDER: Record<Priority, number> = { emergency: 0, urgent: 1, routine: 2 };

const PRIORITY_STYLES: Record<Priority, { border: string; badge: string; label: string; glow?: string }> = {
  emergency: {
    border: 'border-l-4 border-l-red-500 ring-1 ring-red-200',
    badge: 'bg-red-600 text-white',
    label: '🚨 EMERGENCY',
    glow: 'shadow-red-100',
  },
  urgent: {
    border: 'border-l-4 border-l-amber-500 ring-1 ring-amber-200',
    badge: 'bg-amber-500 text-white',
    label: '⚡ URGENT',
  },
  routine: {
    border: 'border border-slate-200',
    badge: 'bg-slate-100 text-slate-600',
    label: '',
  },
};

type SortMode = 'priority' | 'newest' | 'oldest';

export function JobBoard({ jobs }: JobBoardProps) {
  const [sortMode, setSortMode] = useState<SortMode>('priority');
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  const requestNotifications = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setNotifPermission(result);
  };

  const sortJobs = (jobList: Job[]): Job[] => {
    return [...jobList].sort((a, b) => {
      if (sortMode === 'priority') {
        const pa = PRIORITY_ORDER[getPriority(a)];
        const pb = PRIORITY_ORDER[getPriority(b)];
        if (pa !== pb) return pa - pb;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortMode === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  };

  const urgentCount = jobs.filter(j => getPriority(j) !== 'routine' && j.status !== 'CLOSED').length;

  return (
    <div className="flex flex-col h-full gap-3">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between flex-wrap gap-2 shrink-0">
        <div className="flex items-center gap-2">
          {urgentCount > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-xs font-bold animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              {urgentCount} urgent job{urgentCount > 1 ? 's' : ''} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Notification permission toggle */}
          {'Notification' in window && (
            <button
              onClick={requestNotifications}
              title={notifPermission === 'granted' ? 'Browser notifications on' : 'Enable browser notifications'}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                notifPermission === 'granted'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              )}
            >
              {notifPermission === 'granted' ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
              {notifPermission === 'granted' ? 'Alerts on' : 'Enable alerts'}
            </button>
          )}
          {/* Sort control */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
            <ArrowDownUp className="w-3.5 h-3.5 text-slate-400 ml-1" />
            {(['priority', 'newest', 'oldest'] as SortMode[]).map(m => (
              <button
                key={m}
                onClick={() => setSortMode(m)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors',
                  sortMode === m ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Kanban columns ── */}
      <div className="flex-1 flex gap-3 sm:gap-6 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 min-h-0">
        {COLUMNS.map((col) => {
          const columnJobs = sortJobs(jobs.filter(j => j.status === col.id));
          const colUrgentCount = columnJobs.filter(j => getPriority(j) !== 'routine').length;

          return (
            <div key={col.id} className="flex-shrink-0 w-[72vw] sm:w-72 lg:w-80 flex flex-col bg-slate-100/50 rounded-2xl border border-slate-200">
              <div className="p-3 sm:p-4 border-b border-slate-200 flex items-center justify-between bg-slate-100 rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-full", col.color)} />
                  <h3 className="font-semibold text-slate-700">{col.label}</h3>
                  {colUrgentCount > 0 && (
                    <span className="flex items-center gap-1 bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      {colUrgentCount}
                    </span>
                  )}
                </div>
                <span className="bg-white text-slate-500 text-xs font-medium px-2 py-1 rounded-full shadow-sm">
                  {columnJobs.length}
                </span>
              </div>

              <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                {columnJobs.map(job => {
                  const priority = getPriority(job);
                  const pStyle = PRIORITY_STYLES[priority];

                  return (
                    <Link
                      key={job.id}
                      to={`/jobs/${job.id}`}
                      className={cn(
                        'block bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all group',
                        pStyle.border,
                        pStyle.glow && `shadow-md ${pStyle.glow}`
                      )}
                    >
                      {/* Priority banner for emergency/urgent */}
                      {priority !== 'routine' && (
                        <div className={cn(
                          'flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest mb-2 px-2 py-1 rounded-lg -mx-1',
                          priority === 'emergency' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                        )}>
                          <AlertTriangle className="w-3 h-3" />
                          {pStyle.label}
                        </div>
                      )}

                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-slate-400 truncate max-w-[80px]">{job.id.slice(0, 8)}</span>
                        <div className="flex gap-1 flex-wrap justify-end">
                          {job.status === 'CLOSED' && (
                            <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </span>
                          )}
                          {job.paymentStatus === 'paid' && (
                            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                              $ PAID
                            </span>
                          )}
                          {job.paymentStatus === 'pending' && job.paymentLinkUrl && (
                            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                              $ PENDING
                            </span>
                          )}
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                            job.type === 'SMOKE_ALARM' ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"
                          )}>
                            {job.type.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>

                      <h4 className={cn(
                        "font-semibold mb-2 line-clamp-2 transition-colors",
                        priority === 'emergency' ? 'text-red-900 group-hover:text-red-700' :
                        priority === 'urgent' ? 'text-amber-900 group-hover:text-amber-700' :
                        'text-slate-900 group-hover:text-amber-600'
                      )}>
                        {job.title}
                      </h4>

                      <div className="space-y-1.5 text-xs text-slate-500">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{job.propertyAddress}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 shrink-0" />
                          <span className="line-clamp-1">{job.tenantName}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>{format(new Date(job.createdAt), 'MMM d, h:mm a')}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}

                {columnJobs.length === 0 && (
                  <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl">
                    <span className="text-sm text-slate-400">No jobs</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
