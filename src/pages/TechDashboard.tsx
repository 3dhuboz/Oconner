import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Job, Electrician } from '../types';
import { useAuth } from '../context/AuthContext';
import { format, isToday, isTomorrow } from 'date-fns';
import {
  MapPin, Clock, Navigation, ChevronRight,
  CheckCircle2, Wrench, Phone, Calendar, Camera, DollarSign
} from 'lucide-react';
import { cn } from '../utils';

interface TechDashboardProps {
  jobs: Job[];
  electricians: Electrician[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  DISPATCHED: { label: 'Dispatched', color: 'text-[#E8862A]', bg: 'bg-amber-50 border-amber-200' },
  EXECUTION: { label: 'In Progress', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  SCHEDULING: { label: 'Scheduled', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  REVIEW: { label: 'Under Review', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' },
  CLOSED: { label: 'Completed', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
};

export function TechDashboard({ jobs, electricians }: TechDashboardProps) {
  const { user } = useAuth();

  // Find electrician record matching this user
  const myElectrician = useMemo(() => {
    return electricians.find(e =>
      e.email?.toLowerCase() === user?.email?.toLowerCase() ||
      e.id === user?.uid
    );
  }, [electricians, user]);

  // My assigned jobs (active — not closed)
  const myJobs = useMemo(() => {
    if (!myElectrician) return jobs.filter(j => j.status !== 'CLOSED');
    return jobs.filter(j => j.assignedElectricianId === myElectrician.id && j.status !== 'CLOSED');
  }, [jobs, myElectrician]);

  // Priority sort: EXECUTION first, then DISPATCHED, then rest
  const sortedJobs = useMemo(() => {
    const priority: Record<string, number> = { EXECUTION: 0, DISPATCHED: 1, SCHEDULING: 2, REVIEW: 3 };
    return [...myJobs].sort((a, b) => (priority[a.status] ?? 9) - (priority[b.status] ?? 9));
  }, [myJobs]);

  // Today's jobs
  const todayJobs = useMemo(() => {
    return myJobs.filter(j => j.scheduledDate && isToday(new Date(j.scheduledDate)))
      .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime());
  }, [myJobs]);

  // Active (in progress)
  const inProgress = myJobs.filter(j => j.status === 'EXECUTION');
  const dispatched = myJobs.filter(j => j.status === 'DISPATCHED');

  return (
    <div className="px-4 py-5 max-w-lg mx-auto space-y-5">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          G'day, {user?.name?.split(' ')[0] || 'Tech'} 👋
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {format(new Date(), 'EEEE, d MMM')} &bull; {myJobs.length} active job{myJobs.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Quick stats */}
      <div className="flex gap-3">
        <div className="flex-1 bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-orange-700">{inProgress.length}</p>
          <p className="text-[11px] font-medium text-orange-600">In Progress</p>
        </div>
        <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-[#E8862A]">{dispatched.length}</p>
          <p className="text-[11px] font-medium text-[#E8862A]">Dispatched</p>
        </div>
        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-slate-700">{todayJobs.length}</p>
          <p className="text-[11px] font-medium text-slate-500">Today</p>
        </div>
      </div>

      {/* Active job banner — if currently executing */}
      {inProgress.length > 0 && (
        <div className="space-y-3">
          {inProgress.map(job => (
            <Link
              key={job.id}
              to={`/field/${job.id}`}
              className="block bg-orange-500 text-white rounded-2xl p-4 shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">IN PROGRESS</span>
                <span className="text-xs opacity-80">{job.id}</span>
              </div>
              <h3 className="font-bold text-lg leading-tight mb-2">{job.title}</h3>
              <div className="flex items-center gap-2 text-sm opacity-90 mb-3">
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="truncate">{job.propertyAddress}</span>
              </div>
              {/* Action hints */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[11px] bg-white/15 px-2 py-1 rounded-lg flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Log Time
                </span>
                <span className="text-[11px] bg-white/15 px-2 py-1 rounded-lg flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Materials
                </span>
                <span className="text-[11px] bg-white/15 px-2 py-1 rounded-lg flex items-center gap-1">
                  <Camera className="w-3 h-3" /> Photos
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-white/20 pt-3">
                <span className="text-sm font-medium flex items-center gap-1.5">
                  <Wrench className="w-4 h-4" /> Continue Working
                </span>
                <ChevronRight className="w-5 h-5" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Today's Schedule */}
      {todayJobs.length > 0 && inProgress.length === 0 && (
        <div>
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-[#F5A623]" /> Today's Schedule
          </h2>
          <div className="space-y-2">
            {todayJobs.map(job => (
              <Link
                key={job.id}
                to={job.status === 'EXECUTION' || job.status === 'DISPATCHED' ? `/field/${job.id}` : `/jobs/${job.id}`}
                className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm active:bg-slate-50 transition-colors"
              >
                <div className="text-center shrink-0 w-12">
                  <p className="text-sm font-bold text-slate-900">
                    {format(new Date(job.scheduledDate!), 'h:mm')}
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase">
                    {format(new Date(job.scheduledDate!), 'a')}
                  </p>
                </div>
                <div className="w-0.5 h-10 bg-[#F5A623] rounded-full shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{job.title}</p>
                  <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3 shrink-0" /> {job.propertyAddress}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* All My Jobs */}
      <div>
        <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
          <Wrench className="w-4 h-4 text-slate-400" /> All Jobs
        </h2>

        {sortedJobs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <p className="text-slate-700 font-semibold">No active jobs</p>
            <p className="text-sm text-slate-400 mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {sortedJobs.map(job => {
              const cfg = STATUS_CONFIG[job.status] || { label: job.status, color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' };
              const isActive = job.status === 'EXECUTION' || job.status === 'DISPATCHED';

              return (
                <Link
                  key={job.id}
                  to={isActive ? `/field/${job.id}` : `/jobs/${job.id}`}
                  className="block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden active:bg-slate-50 transition-colors"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 truncate">{job.title}</h3>
                        <p className="text-xs text-slate-400">{job.id}</p>
                      </div>
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0", cfg.bg, cfg.color)}>
                        {cfg.label}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{job.propertyAddress}</span>
                      </div>
                      {job.scheduledDate && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                          <span>
                            {isToday(new Date(job.scheduledDate)) ? 'Today' :
                             isTomorrow(new Date(job.scheduledDate)) ? 'Tomorrow' :
                             format(new Date(job.scheduledDate), 'EEE, d MMM')
                            } at {format(new Date(job.scheduledDate), 'h:mm a')}
                          </span>
                        </div>
                      )}
                      {job.tenantName && job.tenantName !== 'See email body' && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                          <span>{job.tenantName} {job.tenantPhone && job.tenantPhone !== 'TBD' ? `• ${job.tenantPhone}` : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action bar for active jobs */}
                  {isActive && (
                    <div className="border-t border-slate-100 px-4 py-2.5 flex items-center justify-between bg-blue-50">
                      <div className="flex items-center gap-3">
                        {job.propertyAddress && job.propertyAddress !== 'See email body' && (
                          <span className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                            <Navigation className="w-3.5 h-3.5" /> Navigate
                          </span>
                        )}
                        <span className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Time
                        </span>
                        <span className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                          <Camera className="w-3.5 h-3.5" /> Photo
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-blue-400" />
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
