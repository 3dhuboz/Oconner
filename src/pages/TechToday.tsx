import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Job, Electrician } from '../types';
import { useAuth } from '../context/AuthContext';
import { format, isToday } from 'date-fns';
import { MapPin, Clock, Navigation, ChevronRight, Calendar, CheckCircle2 } from 'lucide-react';
import { cn } from '../utils';

interface TechTodayProps {
  jobs: Job[];
  electricians: Electrician[];
}

export function TechToday({ jobs, electricians }: TechTodayProps) {
  const { user } = useAuth();

  const myElectrician = useMemo(() => {
    return electricians.find(e =>
      e.email?.toLowerCase() === user?.email?.toLowerCase() ||
      e.id === user?.uid
    );
  }, [electricians, user]);

  const todayJobs = useMemo(() => {
    const filtered = myElectrician
      ? jobs.filter(j => j.assignedElectricianId === myElectrician.id)
      : jobs;

    return filtered
      .filter(j => j.scheduledDate && isToday(new Date(j.scheduledDate)))
      .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime());
  }, [jobs, myElectrician]);

  const completed = todayJobs.filter(j => j.status === 'CLOSED' || j.status === 'REVIEW');
  const remaining = todayJobs.filter(j => j.status !== 'CLOSED' && j.status !== 'REVIEW');

  return (
    <div className="px-4 py-5 max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-amber-500" /> Today
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {format(new Date(), 'EEEE, d MMMM yyyy')}
        </p>
      </div>

      {/* Summary strip */}
      <div className="flex gap-3">
        <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-amber-700">{remaining.length}</p>
          <p className="text-[11px] font-medium text-amber-600">Remaining</p>
        </div>
        <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-emerald-700">{completed.length}</p>
          <p className="text-[11px] font-medium text-emerald-600">Done</p>
        </div>
        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-slate-700">{todayJobs.length}</p>
          <p className="text-[11px] font-medium text-slate-500">Total</p>
        </div>
      </div>

      {/* Timeline */}
      {todayJobs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-700 font-semibold">Nothing scheduled today</p>
          <p className="text-sm text-slate-400 mt-1">Check back later or view your full job list</p>
        </div>
      ) : (
        <div className="space-y-3">
          {todayJobs.map((job, i) => {
            const isDone = job.status === 'CLOSED' || job.status === 'REVIEW';
            const isActive = job.status === 'EXECUTION';

            return (
              <Link
                key={job.id}
                to={isActive || job.status === 'DISPATCHED' ? `/field/${job.id}` : `/jobs/${job.id}`}
                className={cn(
                  "block bg-white rounded-xl border shadow-sm overflow-hidden active:bg-slate-50 transition-colors",
                  isActive ? "border-orange-300 ring-2 ring-orange-100" :
                  isDone ? "border-emerald-200 opacity-60" :
                  "border-slate-200"
                )}
              >
                <div className="p-4 flex items-start gap-3">
                  {/* Time column */}
                  <div className="text-center shrink-0 w-14">
                    <p className={cn("text-base font-bold", isDone ? "text-emerald-600" : "text-slate-900")}>
                      {format(new Date(job.scheduledDate!), 'h:mm')}
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase">
                      {format(new Date(job.scheduledDate!), 'a')}
                    </p>
                  </div>

                  {/* Divider */}
                  <div className={cn(
                    "w-0.5 h-12 rounded-full shrink-0 mt-0.5",
                    isActive ? "bg-orange-400" : isDone ? "bg-emerald-400" : "bg-slate-200"
                  )} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={cn("text-sm font-bold truncate", isDone ? "text-slate-500 line-through" : "text-slate-900")}>
                        {job.title}
                      </h3>
                      {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                      {isActive && <span className="text-[9px] font-bold bg-orange-500 text-white px-1.5 py-0.5 rounded-full shrink-0">LIVE</span>}
                    </div>
                    <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 shrink-0" /> {job.propertyAddress}
                    </p>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-1" />
                </div>

                {/* Navigate bar for active jobs */}
                {(isActive || job.status === 'DISPATCHED') && job.propertyAddress && job.propertyAddress !== 'See email body' && (
                  <div className="border-t border-slate-100 px-4 py-2 flex items-center justify-center gap-1.5 bg-blue-50">
                    <Navigation className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-xs font-semibold text-blue-700">Navigate</span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
