import React, { useState, useMemo } from 'react';
import { Job, Electrician } from '../types';
import { format, startOfWeek, addDays, isSameDay, isToday, addWeeks, subWeeks } from 'date-fns';
import { MapPin, ChevronLeft, ChevronRight, CalendarDays, LayoutGrid } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../utils';

interface CalendarProps {
  jobs: Job[];
  electricians: Electrician[];
}

// Per-technician color palette (Google Calendar inspired)
const TECH_COLORS = [
  { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800', dot: 'bg-blue-500', hover: 'hover:bg-blue-200', ring: 'ring-blue-400' },
  { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-800', dot: 'bg-emerald-500', hover: 'hover:bg-emerald-200', ring: 'ring-emerald-400' },
  { bg: 'bg-violet-100', border: 'border-violet-300', text: 'text-violet-800', dot: 'bg-violet-500', hover: 'hover:bg-violet-200', ring: 'ring-violet-400' },
  { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-800', dot: 'bg-[#F5A623]', hover: 'hover:bg-amber-200', ring: 'ring-[#F5A623]' },
  { bg: 'bg-rose-100', border: 'border-rose-300', text: 'text-rose-800', dot: 'bg-rose-500', hover: 'hover:bg-rose-200', ring: 'ring-rose-400' },
  { bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-800', dot: 'bg-cyan-500', hover: 'hover:bg-cyan-200', ring: 'ring-cyan-400' },
  { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800', dot: 'bg-orange-500', hover: 'hover:bg-orange-200', ring: 'ring-orange-400' },
  { bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-800', dot: 'bg-indigo-500', hover: 'hover:bg-indigo-200', ring: 'ring-indigo-400' },
];

// Unassigned job color
const UNASSIGNED_COLOR = { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-700', dot: 'bg-slate-400', hover: 'hover:bg-slate-200', ring: 'ring-slate-400' };

// Status badge colors
const STATUS_COLORS: Record<string, string> = {
  INTAKE: 'bg-blue-500',
  SCHEDULING: 'bg-purple-500',
  DISPATCHED: 'bg-[#F5A623]',
  EXECUTION: 'bg-orange-500',
  REVIEW: 'bg-rose-500',
  CLOSED: 'bg-emerald-500',
};

type ViewMode = 'day' | 'week';

export function Calendar({ jobs, electricians }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const hours = Array.from({ length: 12 }, (_, i) => i + 6); // 6 AM to 5 PM

  // Build technician color map
  const techColorMap = useMemo(() => {
    const map = new Map<string, typeof TECH_COLORS[0]>();
    electricians.forEach((e, i) => {
      map.set(e.id, TECH_COLORS[i % TECH_COLORS.length]);
    });
    return map;
  }, [electricians]);

  // Week days
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
  const weekDays = viewMode === 'week'
    ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    : [currentDate];

  // Navigate
  const goNext = () => {
    if (viewMode === 'week') setCurrentDate(d => addWeeks(d, 1));
    else setCurrentDate(d => addDays(d, 1));
  };
  const goPrev = () => {
    if (viewMode === 'week') setCurrentDate(d => subWeeks(d, 1));
    else setCurrentDate(d => addDays(d, -1));
  };
  const goToday = () => setCurrentDate(new Date());

  // Get scheduled jobs for a given day
  const getJobsForDay = (day: Date) => {
    return jobs.filter(job => {
      if (!job.scheduledDate) return false;
      return isSameDay(new Date(job.scheduledDate), day);
    });
  };

  // Get jobs for a specific hour on a specific day
  const getJobsForHour = (day: Date, hour: number) => {
    return getJobsForDay(day).filter(job => {
      const jobDate = new Date(job.scheduledDate!);
      return jobDate.getHours() === hour;
    });
  };

  // Header date range label
  const headerLabel = viewMode === 'week'
    ? `${format(weekDays[0], 'MMM d')} — ${format(weekDays[6], 'MMM d, yyyy')}`
    : format(currentDate, 'EEEE, MMMM d, yyyy');

  return (
    <div className="h-full flex flex-col gap-4">
      {/* ─── Top Bar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Calendar</h1>
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-sm font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            Today
          </button>
          <div className="flex items-center">
            <button onClick={goPrev} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={goNext} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <span className="text-lg font-semibold text-slate-700">{headerLabel}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
            <button
              onClick={() => setViewMode('day')}
              className={cn("px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 transition-colors",
                viewMode === 'day' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              <CalendarDays className="w-4 h-4" /> Day
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={cn("px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 transition-colors",
                viewMode === 'week' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              <LayoutGrid className="w-4 h-4" /> Week
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* ─── Main Calendar Grid ────────────────────────────── */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
          {/* Day Headers */}
          <div className={cn("grid border-b border-slate-200 bg-slate-50/80 shrink-0",
            viewMode === 'week' ? 'grid-cols-[64px_repeat(7,1fr)]' : 'grid-cols-[64px_1fr]'
          )}>
            <div className="p-2 border-r border-slate-200" /> {/* time gutter */}
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className={cn(
                  "p-3 text-center border-r border-slate-200 last:border-0",
                  isToday(day) && "bg-blue-50/60"
                )}
              >
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {format(day, 'EEE')}
                </p>
                <p className={cn(
                  "text-xl font-bold mt-0.5",
                  isToday(day) ? "bg-blue-600 text-white w-9 h-9 rounded-full flex items-center justify-center mx-auto" : "text-slate-800"
                )}>
                  {format(day, 'd')}
                </p>
              </div>
            ))}
          </div>

          {/* Time Grid Body */}
          <div className="flex-1 overflow-y-auto">
            {hours.map(hour => (
              <div
                key={hour}
                className={cn("grid border-b border-slate-100",
                  viewMode === 'week' ? 'grid-cols-[64px_repeat(7,1fr)]' : 'grid-cols-[64px_1fr]'
                )}
                style={{ minHeight: '72px' }}
              >
                {/* Time gutter */}
                <div className="px-2 pt-1 border-r border-slate-200 text-right">
                  <span className="text-[11px] font-medium text-slate-400">
                    {format(new Date(2000, 0, 1, hour), 'h a')}
                  </span>
                </div>

                {/* Day columns */}
                {weekDays.map((day) => {
                  const hourJobs = getJobsForHour(day, hour);

                  return (
                    <div
                      key={`${day.toISOString()}-${hour}`}
                      className={cn(
                        "border-r border-slate-100 last:border-0 p-0.5 relative group",
                        isToday(day) && "bg-blue-50/20"
                      )}
                    >
                      {hourJobs.map(job => {
                        const color = job.assignedElectricianId
                          ? (techColorMap.get(job.assignedElectricianId) || UNASSIGNED_COLOR)
                          : UNASSIGNED_COLOR;
                        const techName = electricians.find(e => e.id === job.assignedElectricianId)?.name;
                        const estimatedHours = job.laborHours || 1;

                        return (
                          <Link
                            key={job.id}
                            to={`/jobs/${job.id}`}
                            className={cn(
                              "block rounded-md px-2 py-1 mb-0.5 border-l-[3px] transition-all",
                              color.bg, color.border, color.hover,
                              "hover:shadow-md hover:ring-1", color.ring
                            )}
                            style={{ minHeight: `${Math.max(estimatedHours, 1) * 68 - 4}px` }}
                          >
                            <div className="flex items-center gap-1 mb-0.5">
                              <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", STATUS_COLORS[job.status] || 'bg-slate-400')} />
                              <span className={cn("text-[11px] font-bold truncate", color.text)}>
                                {job.scheduledDate && format(new Date(job.scheduledDate), 'h:mm a')}
                              </span>
                            </div>
                            <p className={cn("text-xs font-semibold truncate", color.text)}>
                              {job.title}
                            </p>
                            {viewMode === 'day' && (
                              <div className="flex items-start gap-1 mt-0.5">
                                <MapPin className={cn("w-3 h-3 shrink-0 mt-0.5", color.text)} />
                                <span className={cn("text-[10px] truncate", color.text)}>{job.propertyAddress}</span>
                              </div>
                            )}
                            {techName && viewMode === 'day' && (
                              <p className={cn("text-[10px] mt-0.5 font-medium opacity-70", color.text)}>
                                {techName}
                              </p>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* ─── Sidebar: Tech Legend + Unscheduled Jobs ────────── */}
        <div className="w-64 shrink-0 space-y-4 hidden lg:block">
          {/* Technician Legend */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-sm font-bold text-slate-700 mb-3">Technicians</h3>
            <div className="space-y-2">
              {electricians.map((elec) => {
                const color = techColorMap.get(elec.id) || UNASSIGNED_COLOR;
                const jobCount = jobs.filter(j => j.assignedElectricianId === elec.id && j.scheduledDate).length;
                return (
                  <div key={elec.id} className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-sm shrink-0", color.dot)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{elec.name}</p>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">{jobCount}</span>
                  </div>
                );
              })}
              {electricians.length === 0 && (
                <p className="text-xs text-slate-400 italic">No technicians added yet</p>
              )}
            </div>
          </div>

          {/* Status Legend */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-sm font-bold text-slate-700 mb-3">Status</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(STATUS_COLORS).map(([status, color]) => (
                <div key={status} className="flex items-center gap-1.5">
                  <div className={cn("w-2 h-2 rounded-full", color)} />
                  <span className="text-[11px] text-slate-600 capitalize">{status.toLowerCase().replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Unscheduled Jobs */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-sm font-bold text-slate-700 mb-3">
              Unscheduled
              <span className="ml-1.5 text-xs font-normal text-slate-400">
                ({jobs.filter(j => !j.scheduledDate && j.status !== 'CLOSED').length})
              </span>
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {jobs.filter(j => !j.scheduledDate && j.status !== 'CLOSED').map(job => {
                const color = job.assignedElectricianId
                  ? (techColorMap.get(job.assignedElectricianId) || UNASSIGNED_COLOR)
                  : UNASSIGNED_COLOR;
                return (
                  <Link
                    key={job.id}
                    to={`/jobs/${job.id}`}
                    className={cn(
                      "block p-2 rounded-lg border-l-[3px] text-xs transition-all",
                      color.bg, color.border, color.hover
                    )}
                  >
                    <p className={cn("font-semibold truncate", color.text)}>{job.title}</p>
                    <p className="text-slate-500 truncate mt-0.5">{job.propertyAddress}</p>
                  </Link>
                );
              })}
              {jobs.filter(j => !j.scheduledDate && j.status !== 'CLOSED').length === 0 && (
                <p className="text-xs text-slate-400 italic text-center py-2">All jobs scheduled</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
