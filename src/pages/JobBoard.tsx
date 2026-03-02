import React, { useState, useEffect, useMemo } from 'react';
import { Job, JobStatus } from '../types';
import { format } from 'date-fns';
import { Clock, MapPin, User, AlertTriangle, Bell, BellOff, Search, ChevronRight, Zap, Calendar, Wrench, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../utils';

interface JobBoardProps {
  jobs: Job[];
}

// ─── Status config ─────────────────────────────────────────────
const STATUS_SECTIONS: { id: JobStatus; label: string; bg: string; border: string; dot: string; headerBg: string; headerText: string }[] = [
  { id: 'INTAKE',     label: 'Intake',     bg: 'bg-blue-50',    border: 'border-blue-200',   dot: 'bg-blue-500',    headerBg: 'bg-blue-500',    headerText: 'text-white' },
  { id: 'SCHEDULING', label: 'Scheduling', bg: 'bg-purple-50',  border: 'border-purple-200', dot: 'bg-purple-500',  headerBg: 'bg-purple-500',  headerText: 'text-white' },
  { id: 'DISPATCHED', label: 'Dispatched', bg: 'bg-amber-50',   border: 'border-amber-200',  dot: 'bg-amber-500',   headerBg: 'bg-amber-500',   headerText: 'text-white' },
  { id: 'EXECUTION',  label: 'In Field',   bg: 'bg-orange-50',  border: 'border-orange-200', dot: 'bg-orange-500',  headerBg: 'bg-orange-500',  headerText: 'text-white' },
  { id: 'REVIEW',     label: 'Review',     bg: 'bg-rose-50',    border: 'border-rose-200',   dot: 'bg-rose-500',    headerBg: 'bg-rose-500',    headerText: 'text-white' },
  { id: 'CLOSED',     label: 'Closed',     bg: 'bg-emerald-50', border: 'border-emerald-200',dot: 'bg-emerald-500', headerBg: 'bg-emerald-500', headerText: 'text-white' },
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

  // Search filter
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

  // Group by status
  const groupedJobs = useMemo(() => {
    const groups: Record<string, Job[]> = {};
    for (const s of STATUS_SECTIONS) groups[s.id] = [];
    for (const job of searchFiltered) {
      if (groups[job.status]) groups[job.status].push(job);
    }
    // Sort each group by priority then newest
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => {
        const pa = PRIORITY_ORDER[getPriority(a)];
        const pb = PRIORITY_ORDER[getPriority(b)];
        if (pa !== pb) return pa - pb;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }
    return groups;
  }, [searchFiltered]);

  const urgentCount = jobs.filter(j => getPriority(j) !== 'routine' && j.status !== 'CLOSED').length;
  const activeCount = jobs.filter(j => j.status !== 'CLOSED').length;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* ── Top bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Job Board</h1>
          <p className="text-sm text-slate-500">{activeCount} active jobs{urgentCount > 0 ? ` · ${urgentCount} urgent` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {urgentCount > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-2 bg-red-100 text-red-700 rounded-xl text-sm font-bold animate-pulse">
              <AlertTriangle className="w-4 h-4" />
              {urgentCount} Urgent
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
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search jobs, addresses, tenants, agencies..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-2xl text-base bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
        />
      </div>

      {/* ── Status sections ── */}
      {STATUS_SECTIONS.map(section => {
        const sectionJobs = groupedJobs[section.id] || [];
        // Hide closed by default, hide empty sections
        if (section.id === 'CLOSED' && !showClosed) {
          if (sectionJobs.length === 0) return null;
          return (
            <div key={section.id} className="text-center">
              <button
                onClick={() => setShowClosed(true)}
                className="px-6 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                Show {sectionJobs.length} Closed Job{sectionJobs.length !== 1 ? 's' : ''}
              </button>
            </div>
          );
        }
        if (sectionJobs.length === 0) return null;

        return (
          <div key={section.id}>
            {/* Section header */}
            <div className={cn('flex items-center justify-between px-5 py-3 rounded-t-2xl', section.headerBg)}>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-white/40" />
                <h2 className={cn('text-base font-bold tracking-wide', section.headerText)}>
                  {section.label}
                </h2>
              </div>
              <span className={cn('text-sm font-bold px-3 py-1 rounded-full bg-white/20', section.headerText)}>
                {sectionJobs.length}
              </span>
            </div>

            {/* Job cards */}
            <div className={cn('rounded-b-2xl border border-t-0 divide-y', section.border, section.bg)}>
              {sectionJobs.map(job => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Empty state */}
      {searchFiltered.length === 0 && (
        <div className="text-center py-20 text-slate-400">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-semibold">No jobs found</p>
          <p className="text-sm mt-1">Try a different search term</p>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-slate-400 py-2">
        {searchFiltered.length} jobs total
      </div>
    </div>
  );
}

// ─── Job Card ──────────────────────────────────────────────────
function JobCard({ job }: { job: Job; key?: string }) {
  const priority = getPriority(job);
  const isUrgent = priority !== 'routine';
  const scheduledDate = job.scheduledDate ? new Date(job.scheduledDate) : null;

  return (
    <Link
      to={`/jobs/${job.id}`}
      className={cn(
        'block p-5 transition-all hover:bg-white/80 active:bg-white group',
        priority === 'emergency' && 'bg-red-50/60',
        priority === 'urgent' && 'bg-amber-50/60',
      )}
    >
      {/* Row 1: Priority bar + title */}
      <div className="flex items-start gap-3 mb-3">
        {/* Priority indicator */}
        <div className={cn(
          'w-2 rounded-full mt-1 shrink-0',
          priority === 'emergency' ? 'bg-red-500 h-12' :
          priority === 'urgent' ? 'bg-amber-500 h-12' :
          'bg-slate-300 h-8'
        )} />

        <div className="flex-1 min-w-0">
          {/* Title — large and bold */}
          <h3 className={cn(
            'font-bold text-base leading-tight mb-1',
            priority === 'emergency' ? 'text-red-900' :
            priority === 'urgent' ? 'text-amber-900' :
            'text-slate-900 group-hover:text-amber-700'
          )}>
            {isUrgent && <AlertTriangle className="w-4 h-4 inline mr-1.5 -mt-0.5" />}
            {job.title || 'Untitled Job'}
          </h3>

          {/* Badges row — large, easy to see */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className={cn(
              'text-xs font-bold uppercase px-2.5 py-1 rounded-lg',
              job.type === 'SMOKE_ALARM' ? 'bg-rose-100 text-rose-700' :
              job.type === 'SAFETY_SWITCH' ? 'bg-violet-100 text-violet-700' :
              job.type === 'LIGHTING' ? 'bg-yellow-100 text-yellow-700' :
              job.type === 'GENERAL_REPAIR' ? 'bg-slate-100 text-slate-600' :
              'bg-slate-100 text-slate-600'
            )}>
              <Wrench className="w-3 h-3 inline mr-1 -mt-0.5" />
              {(job.type || 'GENERAL').replace(/_/g, ' ')}
            </span>
            {job.paymentStatus === 'paid' && (
              <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-lg">PAID</span>
            )}
            {job.paymentStatus === 'pending' && job.paymentLinkUrl && (
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-lg">$ DUE</span>
            )}
            {job.aiNeedsReview && (
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-lg">AI REVIEW</span>
            )}
            {job.hasFollowUpEmail && (
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-lg">FOLLOW UP</span>
            )}
            {job.needsReschedule && (
              <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2.5 py-1 rounded-lg">RESCHEDULE</span>
            )}
          </div>
        </div>

        {/* Large arrow button */}
        <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-white border border-slate-200 group-hover:bg-amber-50 group-hover:border-amber-300 transition-colors shadow-sm">
          <ChevronRight className="w-6 h-6 text-slate-400 group-hover:text-amber-600 transition-colors" />
        </div>
      </div>

      {/* Row 2: Key info — large text, easy buttons */}
      <div className="ml-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {job.propertyAddress && (
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">{job.propertyAddress}</span>
          </div>
        )}
        {job.tenantName && (
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <User className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">{job.tenantName}</span>
          </div>
        )}
        {scheduledDate && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            {format(scheduledDate, 'EEE, MMM d · h:mm a')}
          </div>
        )}
        {job.tenantPhone && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Phone className="w-4 h-4 text-slate-400 shrink-0" />
            {job.tenantPhone}
          </div>
        )}
      </div>

      {/* Agency + ID */}
      <div className="ml-5 mt-2 flex items-center gap-3 text-xs text-slate-400">
        {job.agency && <span className="font-medium">{job.agency}</span>}
        <span className="font-mono">{job.id.slice(0, 8)}</span>
      </div>
    </Link>
  );
}
