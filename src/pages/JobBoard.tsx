import React, { useState, useEffect, useMemo } from 'react';
import { Job, JobStatus } from '../types';
import { format } from 'date-fns';
import { Clock, MapPin, User, AlertTriangle, Bell, BellOff, ArrowDownUp, Search, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../utils';

interface JobBoardProps {
  jobs: Job[];
}

const STATUSES: { id: JobStatus | 'ALL'; label: string; color: string; dot: string }[] = [
  { id: 'ALL', label: 'All Active', color: 'bg-slate-900 text-white', dot: 'bg-slate-600' },
  { id: 'INTAKE', label: 'Intake', color: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500' },
  { id: 'SCHEDULING', label: 'Scheduling', color: 'bg-purple-100 text-purple-800', dot: 'bg-purple-500' },
  { id: 'DISPATCHED', label: 'Dispatched', color: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
  { id: 'EXECUTION', label: 'In Field', color: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500' },
  { id: 'REVIEW', label: 'Review', color: 'bg-rose-100 text-rose-800', dot: 'bg-rose-500' },
  { id: 'CLOSED', label: 'Closed', color: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' },
];

const STATUS_DOT: Record<string, string> = {
  INTAKE: 'bg-blue-500',
  SCHEDULING: 'bg-purple-500',
  DISPATCHED: 'bg-amber-500',
  EXECUTION: 'bg-orange-500',
  REVIEW: 'bg-rose-500',
  CLOSED: 'bg-emerald-500',
};

const STATUS_BADGE: Record<string, string> = {
  INTAKE: 'bg-blue-100 text-blue-700',
  SCHEDULING: 'bg-purple-100 text-purple-700',
  DISPATCHED: 'bg-amber-100 text-amber-700',
  EXECUTION: 'bg-orange-100 text-orange-700',
  REVIEW: 'bg-rose-100 text-rose-700',
  CLOSED: 'bg-emerald-100 text-emerald-700',
};

type Priority = 'emergency' | 'urgent' | 'routine';

function getPriority(job: Job): Priority {
  const u = (job.urgency || job.title || '').toLowerCase();
  if (u.includes('emergency')) return 'emergency';
  if (u.includes('urgent')) return 'urgent';
  return 'routine';
}

const PRIORITY_ORDER: Record<Priority, number> = { emergency: 0, urgent: 1, routine: 2 };

type SortMode = 'priority' | 'newest' | 'oldest';

export function JobBoard({ jobs }: JobBoardProps) {
  const [sortMode, setSortMode] = useState<SortMode>('priority');
  const [activeTab, setActiveTab] = useState<JobStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
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

  // Count per status
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: 0 };
    STATUSES.forEach(s => { if (s.id !== 'ALL') counts[s.id] = 0; });
    jobs.forEach(j => {
      counts[j.status] = (counts[j.status] || 0) + 1;
      if (j.status !== 'CLOSED') counts.ALL++;
    });
    return counts;
  }, [jobs]);

  // Filter + sort
  const filteredJobs = useMemo(() => {
    let list = [...jobs];

    // Status filter
    if (activeTab === 'ALL') {
      list = list.filter(j => j.status !== 'CLOSED');
    } else {
      list = list.filter(j => j.status === activeTab);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(j =>
        (j.title || '').toLowerCase().includes(q) ||
        (j.propertyAddress || '').toLowerCase().includes(q) ||
        (j.tenantName || '').toLowerCase().includes(q) ||
        (j.agency || '').toLowerCase().includes(q) ||
        j.id.toLowerCase().includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      if (sortMode === 'priority') {
        const pa = PRIORITY_ORDER[getPriority(a)];
        const pb = PRIORITY_ORDER[getPriority(b)];
        if (pa !== pb) return pa - pb;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortMode === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    return list;
  }, [jobs, activeTab, search, sortMode]);

  const urgentCount = jobs.filter(j => getPriority(j) !== 'routine' && j.status !== 'CLOSED').length;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* ── Top bar: search + controls ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search jobs, addresses, tenants..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {urgentCount > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-xs font-bold animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              {urgentCount}
            </span>
          )}
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
            </button>
          )}
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

      {/* ── Status filter tabs ── */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {STATUSES.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveTab(s.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0',
              activeTab === s.id
                ? s.id === 'ALL' ? 'bg-slate-900 text-white' : s.color
                : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
            )}
          >
            <span className={cn('w-2 h-2 rounded-full', activeTab === s.id ? (s.id === 'ALL' ? 'bg-white' : s.dot) : 'bg-slate-300')} />
            {s.label}
            <span className={cn(
              'ml-0.5 text-[10px] font-bold',
              activeTab === s.id ? 'opacity-80' : 'text-slate-400'
            )}>
              {statusCounts[s.id] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* ── Job list ── */}
      <div className="space-y-2">
        {filteredJobs.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg font-medium">No jobs found</p>
            <p className="text-sm mt-1">{search ? 'Try a different search term' : 'No jobs in this status'}</p>
          </div>
        )}

        {filteredJobs.map(job => {
          const priority = getPriority(job);
          const isUrgent = priority !== 'routine';
          const scheduledDate = job.scheduledDate ? new Date(job.scheduledDate) : null;

          return (
            <Link
              key={job.id}
              to={`/jobs/${job.id}`}
              className={cn(
                'block bg-white rounded-xl border transition-all hover:shadow-md group',
                priority === 'emergency' ? 'border-l-4 border-l-red-500 border-y border-r border-red-200 shadow-sm shadow-red-100' :
                priority === 'urgent' ? 'border-l-4 border-l-amber-500 border-y border-r border-amber-200' :
                'border-slate-200 hover:border-slate-300'
              )}
            >
              <div className="p-4 flex items-center gap-4">
                {/* Status dot */}
                <div className="shrink-0 hidden sm:flex flex-col items-center gap-1">
                  <div className={cn('w-3 h-3 rounded-full', STATUS_DOT[job.status] || 'bg-slate-400')} />
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    {job.status === 'EXECUTION' ? 'FIELD' : job.status.slice(0, 5)}
                  </span>
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  {/* Top row: title + badges */}
                  <div className="flex items-start gap-2 mb-1">
                    <h4 className={cn(
                      'font-semibold text-sm truncate flex-1 transition-colors',
                      isUrgent ? (priority === 'emergency' ? 'text-red-900' : 'text-amber-900') : 'text-slate-900 group-hover:text-amber-600'
                    )}>
                      {isUrgent && <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />}
                      {job.title}
                    </h4>
                    <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                      {/* Status badge (always show on mobile since we hide the dot) */}
                      <span className={cn('sm:hidden text-[10px] font-bold px-2 py-0.5 rounded-full', STATUS_BADGE[job.status])}>
                        {job.status === 'EXECUTION' ? 'IN FIELD' : job.status.replace(/_/g, ' ')}
                      </span>
                      <span className={cn(
                        "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                        job.type === 'SMOKE_ALARM' ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"
                      )}>
                        {job.type.replace(/_/g, ' ')}
                      </span>
                      {job.paymentStatus === 'paid' && (
                        <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">PAID</span>
                      )}
                      {job.paymentStatus === 'pending' && job.paymentLinkUrl && (
                        <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">$ DUE</span>
                      )}
                      {job.aiNeedsReview && (
                        <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">AI</span>
                      )}
                      {job.hasFollowUpEmail && (
                        <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">F/UP</span>
                      )}
                      {job.needsReschedule && (
                        <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">RESCHED</span>
                      )}
                    </div>
                  </div>

                  {/* Bottom row: address, tenant, date */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1 min-w-0">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate max-w-[200px]">{job.propertyAddress}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 shrink-0" />
                      <span className="truncate max-w-[120px]">{job.tenantName}</span>
                    </span>
                    {scheduledDate && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3 h-3 shrink-0" />
                        {format(scheduledDate, 'MMM d, h:mm a')}
                      </span>
                    )}
                    <span className="text-slate-300 text-[10px]">{job.id.slice(0, 8)}</span>
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRight className="w-5 h-5 text-slate-300 shrink-0 group-hover:text-amber-500 transition-colors" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Footer count ── */}
      <div className="text-center text-xs text-slate-400 py-2">
        Showing {filteredJobs.length} of {jobs.length} jobs
      </div>
    </div>
  );
}
