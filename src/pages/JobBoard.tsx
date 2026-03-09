import React, { useState, useEffect, useMemo } from 'react';
import { Job, JobStatus } from '../types';
import { format } from 'date-fns';
import { Clock, MapPin, User, AlertTriangle, Bell, BellOff, Search, ChevronRight, Calendar, Wrench, Phone, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../utils';

interface JobBoardProps {
  jobs: Job[];
}

// ─── Column config — the kanban lanes ───────────────────────────
const COLUMNS: {
  id: JobStatus;
  label: string;
  headerBg: string;
  cardBg: string;
  cardBorder: string;
  laneBg: string;
  laneBorder: string;
  accent: string;
}[] = [
  { id: 'INTAKE',     label: 'Intake',      headerBg: 'bg-blue-600',   cardBg: 'bg-white',       cardBorder: 'border-blue-200',   laneBg: 'bg-blue-50/80',   laneBorder: 'border-blue-200',   accent: 'text-blue-600' },
  { id: 'SCHEDULING', label: 'Scheduling',   headerBg: 'bg-purple-600', cardBg: 'bg-white',       cardBorder: 'border-purple-200', laneBg: 'bg-purple-50/80', laneBorder: 'border-purple-200', accent: 'text-purple-600' },
  { id: 'DISPATCHED', label: 'Dispatched',   headerBg: 'bg-[#F5A623]',  cardBg: 'bg-white',       cardBorder: 'border-amber-200',  laneBg: 'bg-amber-50/80',  laneBorder: 'border-amber-200',  accent: 'text-[#E8862A]' },
  { id: 'EXECUTION',  label: 'In Field',     headerBg: 'bg-orange-500', cardBg: 'bg-white',       cardBorder: 'border-orange-200', laneBg: 'bg-orange-50/80', laneBorder: 'border-orange-200', accent: 'text-orange-600' },
  { id: 'REVIEW',     label: 'Review',       headerBg: 'bg-rose-500',   cardBg: 'bg-white',       cardBorder: 'border-rose-200',   laneBg: 'bg-rose-50/80',   laneBorder: 'border-rose-200',   accent: 'text-rose-600' },
  { id: 'CLOSED',     label: 'Closed',       headerBg: 'bg-emerald-600',cardBg: 'bg-emerald-50',  cardBorder: 'border-emerald-200',laneBg: 'bg-emerald-50/60',laneBorder: 'border-emerald-200',accent: 'text-emerald-600' },
];

type Priority = 'emergency' | 'urgent' | 'routine';
function getPriority(job: Job): Priority {
  const u = (job.urgency || job.title || '').toLowerCase();
  if (u.includes('emergency')) return 'emergency';
  if (u.includes('urgent')) return 'urgent';
  return 'routine';
}
const PRIORITY_ORDER: Record<Priority, number> = { emergency: 0, urgent: 1, routine: 2 };

export function JobBoard({ jobs }: JobBoardProps) {
  const [search, setSearch] = useState('');
  const [showClosed, setShowClosed] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) setNotifPermission(Notification.permission);
  }, []);

  const requestNotifications = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setNotifPermission(result);
  };

  const searchFiltered = useMemo(() => {
    if (!search.trim()) return jobs;
    const q = search.toLowerCase();
    return jobs.filter(j =>
      (j.title || '').toLowerCase().includes(q) ||
      (j.propertyAddress || '').toLowerCase().includes(q) ||
      (j.tenantName || '').toLowerCase().includes(q) ||
      (j.agency || '').toLowerCase().includes(q) ||
      j.id.toLowerCase().includes(q)
    );
  }, [jobs, search]);

  const grouped = useMemo(() => {
    const g: Record<string, Job[]> = {};
    for (const col of COLUMNS) g[col.id] = [];
    for (const job of searchFiltered) {
      if (g[job.status]) g[job.status].push(job);
    }
    for (const key of Object.keys(g)) {
      g[key].sort((a, b) => {
        const pa = PRIORITY_ORDER[getPriority(a)];
        const pb = PRIORITY_ORDER[getPriority(b)];
        if (pa !== pb) return pa - pb;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }
    return g;
  }, [searchFiltered]);

  const urgentCount = jobs.filter(j => getPriority(j) !== 'routine' && j.status !== 'CLOSED').length;
  const activeCount = jobs.filter(j => j.status !== 'CLOSED').length;

  // Which columns to show
  const visibleCols = COLUMNS.filter(col => {
    if (col.id === 'CLOSED') return showClosed && (grouped[col.id]?.length ?? 0) > 0;
    return (grouped[col.id]?.length ?? 0) > 0;
  });

  const closedCount = grouped['CLOSED']?.length ?? 0;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Job Board</h1>
          <p className="text-sm text-slate-500 font-medium">{activeCount} active{urgentCount > 0 ? <span className="text-red-600 font-bold"> · {urgentCount} urgent</span> : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {urgentCount > 0 && (
            <span className="flex items-center gap-1.5 px-4 py-2 bg-red-100 text-red-700 rounded-xl text-sm font-bold animate-pulse shadow-sm">
              <AlertTriangle className="w-4 h-4" /> {urgentCount} Urgent
            </span>
          )}
          {'Notification' in window && (
            <button
              onClick={requestNotifications}
              title={notifPermission === 'granted' ? 'Notifications on' : 'Enable notifications'}
              className={cn(
                'p-2.5 rounded-xl border transition-colors',
                notifPermission === 'granted'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                  : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
              )}
            >
              {notifPermission === 'granted' ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>

      {/* ── Search ── */}
      <div className="relative px-1">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search jobs, addresses, tenants, agencies..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-2xl text-sm bg-white focus:ring-2 focus:ring-[#F5A623] focus:border-[#F5A623] shadow-sm"
        />
      </div>

      {/* ── Kanban grid — wrapping columns ── */}
      {visibleCols.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5 px-1">
          {visibleCols.map(col => {
            const colJobs = grouped[col.id] || [];
            return (
              <div key={col.id} className={cn('rounded-2xl border overflow-hidden flex flex-col', col.laneBorder, col.laneBg)}>
                {/* Column header — bold, colored */}
                <div className={cn('flex items-center justify-between px-4 py-3', col.headerBg)}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
                    <h2 className="text-sm font-black text-white uppercase tracking-wider">{col.label}</h2>
                  </div>
                  <span className="text-xs font-bold text-white/90 bg-white/20 px-2.5 py-0.5 rounded-full">
                    {colJobs.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="p-3 space-y-2.5 flex-1">
                  {colJobs.map(job => {
                    const priority = getPriority(job);
                    const isUrgent = priority !== 'routine';
                    const scheduled = job.scheduledDate ? new Date(job.scheduledDate) : null;

                    return (
                      <Link
                        key={job.id}
                        to={`/jobs/${job.id}`}
                        className={cn(
                          'block rounded-xl border p-4 transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99] group',
                          col.cardBg, col.cardBorder,
                          priority === 'emergency' && 'ring-2 ring-red-400 border-red-300 bg-red-50',
                          priority === 'urgent' && 'ring-1 ring-amber-300 border-amber-300 bg-amber-50',
                        )}
                      >
                        {/* Title row */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className={cn(
                            'font-bold text-sm leading-snug flex-1',
                            priority === 'emergency' ? 'text-red-900' :
                            priority === 'urgent' ? 'text-amber-900' :
                            'text-slate-900 group-hover:text-[#E8862A]'
                          )}>
                            {isUrgent && <AlertTriangle className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />}
                            {job.title || 'Untitled Job'}
                          </h3>
                          <ChevronRight className="w-5 h-5 text-slate-300 shrink-0 group-hover:text-[#F5A623] transition-colors mt-0.5" />
                        </div>

                        {/* Address */}
                        {job.propertyAddress && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{job.propertyAddress}</span>
                          </div>
                        )}

                        {/* Tenant + phone row */}
                        <div className="flex items-center gap-3 text-xs text-slate-500 mb-2.5">
                          {job.tenantName && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              <span className="truncate max-w-[120px]">{job.tenantName}</span>
                            </span>
                          )}
                          {job.tenantPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {job.tenantPhone}
                            </span>
                          )}
                        </div>

                        {/* Bottom: badges + date */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-wrap gap-1">
                            <span className={cn(
                              'text-[10px] font-bold uppercase px-2 py-0.5 rounded-md',
                              job.type === 'SMOKE_ALARM' ? 'bg-rose-100 text-rose-700' :
                              job.type === 'SAFETY_SWITCH' ? 'bg-violet-100 text-violet-700' :
                              job.type === 'LIGHTING' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-slate-100 text-slate-500'
                            )}>
                              {(job.type || 'GENERAL').replace(/_/g, ' ')}
                            </span>
                            {job.paymentStatus === 'paid' && (
                              <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md">PAID</span>
                            )}
                            {job.paymentStatus === 'pending' && job.paymentLinkUrl && (
                              <span className="bg-amber-100 text-[#E8862A] text-[10px] font-bold px-2 py-0.5 rounded-md">$ DUE</span>
                            )}
                            {job.aiNeedsReview && (
                              <span className="bg-amber-100 text-[#E8862A] text-[10px] font-bold px-2 py-0.5 rounded-md">AI</span>
                            )}
                            {job.hasFollowUpEmail && (
                              <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-md">F/UP</span>
                            )}
                            {job.needsReschedule && (
                              <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-md">RESCHED</span>
                            )}
                          </div>
                          {scheduled && (
                            <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(scheduled, 'MMM d')}
                            </span>
                          )}
                        </div>

                        {/* Agency + ID footer */}
                        {(job.agency || job.id) && (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                            {job.agency && <span className="font-semibold truncate">{job.agency}</span>}
                            <span className="font-mono ml-auto">{job.id.slice(0, 8)}</span>
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 text-slate-400">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-semibold">No jobs found</p>
          <p className="text-sm mt-1">{search ? 'Try a different search' : 'No jobs yet'}</p>
        </div>
      )}

      {/* Show closed toggle */}
      {!showClosed && closedCount > 0 && (
        <div className="text-center px-1">
          <button
            onClick={() => setShowClosed(true)}
            className="px-6 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            Show {closedCount} Closed Job{closedCount !== 1 ? 's' : ''}
          </button>
        </div>
      )}
      {showClosed && closedCount > 0 && (
        <div className="text-center px-1">
          <button
            onClick={() => setShowClosed(false)}
            className="px-4 py-2 text-xs text-slate-400 hover:text-slate-600 font-medium"
          >
            Hide closed jobs
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-slate-400 py-1">
        {searchFiltered.length} jobs total
      </div>
    </div>
  );
}
