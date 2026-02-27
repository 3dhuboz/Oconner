import React, { useMemo } from 'react';
import { Job, Electrician } from '../types';
import { Link } from 'react-router-dom';
import { format, isToday, isSameDay } from 'date-fns';
import {
  ClipboardList, CheckCircle2, Clock, AlertCircle, ArrowRight, Calendar,
  Users, Plus, Zap, TrendingUp, MapPin, DollarSign, Wrench, Phone,
  FileText, BarChart3, CircleDot, Activity, ExternalLink
} from 'lucide-react';
import { cn } from '../utils';
import { useSyncStatus } from '../hooks/useOfflineSync';

interface DashboardProps {
  jobs: Job[];
  electricians: Electrician[];
}

// ─── Pipeline status config ─────────────────────────────────────
const PIPELINE = [
  { key: 'INTAKE', label: 'Intake', color: 'bg-blue-500', ring: 'ring-blue-200' },
  { key: 'SCHEDULING', label: 'Scheduling', color: 'bg-purple-500', ring: 'ring-purple-200' },
  { key: 'DISPATCHED', label: 'Dispatched', color: 'bg-amber-500', ring: 'ring-amber-200' },
  { key: 'EXECUTION', label: 'In Field', color: 'bg-orange-500', ring: 'ring-orange-200' },
  { key: 'REVIEW', label: 'Review', color: 'bg-rose-500', ring: 'ring-rose-200' },
  { key: 'CLOSED', label: 'Closed', color: 'bg-emerald-500', ring: 'ring-emerald-200' },
] as const;

export function Dashboard({ jobs, electricians }: DashboardProps) {
  const syncStatus = useSyncStatus();

  // ─── Computed stats ──────────────────────────────────────────
  const totalActive = jobs.filter(j => j.status !== 'CLOSED').length;
  const closedThisMonth = useMemo(() => {
    const now = new Date();
    return jobs.filter(j => {
      if (j.status !== 'CLOSED') return false;
      const d = new Date(j.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [jobs]);

  const todayJobs = useMemo(() => {
    const today = new Date();
    return jobs.filter(j => j.scheduledDate && isToday(new Date(j.scheduledDate)));
  }, [jobs]);

  const actionRequired = jobs.filter(j => ['INTAKE', 'REVIEW'].includes(j.status));
  const urgentCount = jobs.filter(j => j.status === 'INTAKE' && j.contactAttempts.length === 0).length;

  const materialsCost = useMemo(() => {
    return jobs.reduce((sum, j) => sum + j.materials.reduce((s, m) => s + m.cost * m.quantity, 0), 0);
  }, [jobs]);

  const totalLaborHours = useMemo(() => {
    return jobs.reduce((sum, j) => sum + (j.laborHours || 0), 0);
  }, [jobs]);

  // Per-tech job counts
  const techStats = useMemo(() => {
    return electricians.map(e => ({
      ...e,
      active: jobs.filter(j => j.assignedElectricianId === e.id && !['CLOSED', 'REVIEW'].includes(j.status)).length,
      today: jobs.filter(j => j.assignedElectricianId === e.id && j.scheduledDate && isToday(new Date(j.scheduledDate))).length,
      total: jobs.filter(j => j.assignedElectricianId === e.id).length,
    }));
  }, [electricians, jobs]);

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* ─── Header Row ──────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            {format(new Date(), 'EEEE, d MMMM yyyy')}
            {!syncStatus.isOnline && <span className="ml-2 text-rose-500 font-medium">• Offline Mode</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const w = 380;
              const h = 720;
              const left = window.screen.width - w - 20;
              const top = 40;
              window.open(
                window.location.origin + '/widget',
                'wirezrus_widget',
                `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=no`
              );
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ExternalLink className="w-4 h-4" /> Open as Widget
          </button>
          <Link to="/jobs/new" className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> New Work Order
          </Link>
        </div>
      </div>

      {/* ─── Row 1: KPI Stat Widgets ─────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Link to="/jobs" className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md transition-all group">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalActive}</p>
          <p className="text-xs font-medium text-slate-500 group-hover:text-blue-600">Active Jobs</p>
        </Link>

        <Link to="/jobs" className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md transition-all group">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-rose-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{actionRequired.length}</p>
          <p className="text-xs font-medium text-slate-500 group-hover:text-rose-600">Needs Action</p>
        </Link>

        <Link to="/calendar" className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md transition-all group">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{todayJobs.length}</p>
          <p className="text-xs font-medium text-slate-500 group-hover:text-amber-600">Today's Jobs</p>
        </Link>

        <Link to="/team" className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md transition-all group">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{electricians.length}</p>
          <p className="text-xs font-medium text-slate-500 group-hover:text-emerald-600">Technicians</p>
        </Link>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{closedThisMonth}</p>
          <p className="text-xs font-medium text-slate-500">Closed (Month)</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
              <Clock className="w-4 h-4 text-violet-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalLaborHours.toFixed(1)}</p>
          <p className="text-xs font-medium text-slate-500">Labor Hrs (Total)</p>
        </div>
      </div>

      {/* ─── Row 2: Pipeline + Quick Actions ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pipeline Widget */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-400" /> Job Pipeline
            </h2>
            <Link to="/jobs" className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              View Board <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex items-end gap-2">
            {PIPELINE.map(stage => {
              const count = jobs.filter(j => j.status === stage.key).length;
              const pct = jobs.length > 0 ? Math.max((count / jobs.length) * 100, 4) : 4;
              return (
                <Link
                  key={stage.key}
                  to="/jobs"
                  className="flex-1 group"
                >
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-bold text-slate-800 mb-1">{count}</span>
                    <div
                      className={cn("w-full rounded-t-lg transition-all group-hover:ring-2", stage.color, stage.ring)}
                      style={{ height: `${Math.max(pct * 1.2, 12)}px` }}
                    />
                    <div className="w-full bg-slate-100 rounded-b-lg px-1 py-1.5 text-center">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider leading-tight block">
                        {stage.label}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick Actions Widget */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-amber-500" /> Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <Link to="/jobs/new" className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors group">
              <Plus className="w-5 h-5 text-slate-600 group-hover:text-slate-900" />
              <span className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-900">New Job</span>
            </Link>
            <Link to="/calendar" className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors group">
              <Calendar className="w-5 h-5 text-slate-600 group-hover:text-slate-900" />
              <span className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-900">Schedule</span>
            </Link>
            <Link to="/team" className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors group">
              <Users className="w-5 h-5 text-slate-600 group-hover:text-slate-900" />
              <span className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-900">Team</span>
            </Link>
            <Link to="/integrations" className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors group">
              <Wrench className="w-5 h-5 text-slate-600 group-hover:text-slate-900" />
              <span className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-900">Integrations</span>
            </Link>
            <Link to="/billing" className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors group">
              <DollarSign className="w-5 h-5 text-slate-600 group-hover:text-slate-900" />
              <span className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-900">Billing</span>
            </Link>
            <Link to="/jobs" className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors group">
              <ClipboardList className="w-5 h-5 text-slate-600 group-hover:text-slate-900" />
              <span className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-900">Job Board</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Row 3: Action Required + Today's Schedule + Team ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Action Required Widget */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500" /> Action Required
              {urgentCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full">{urgentCount} new</span>
              )}
            </h2>
            <Link to="/jobs" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">View All</Link>
          </div>
          <div className="flex-1 overflow-y-auto max-h-72">
            {actionRequired.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {actionRequired.slice(0, 6).map(job => (
                  <Link key={job.id} to={`/jobs/${job.id}`} className="block px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{job.title}</p>
                        <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0" /> {job.propertyAddress}
                        </p>
                      </div>
                      <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap',
                        job.status === 'INTAKE' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'
                      )}>
                        {job.status === 'INTAKE' ? 'Contact' : 'Invoice'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
                <p className="text-sm font-medium">All caught up!</p>
              </div>
            )}
          </div>
        </div>

        {/* Today's Schedule Widget */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500" /> Today's Schedule
            </h2>
            <Link to="/calendar" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">Calendar</Link>
          </div>
          <div className="flex-1 overflow-y-auto max-h-72">
            {todayJobs.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {todayJobs
                  .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime())
                  .map(job => {
                    const tech = electricians.find(e => e.id === job.assignedElectricianId);
                    return (
                      <Link key={job.id} to={`/jobs/${job.id}`} className="block px-4 py-3 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="text-center shrink-0 w-12">
                            <p className="text-sm font-bold text-slate-900">
                              {format(new Date(job.scheduledDate!), 'h:mm')}
                            </p>
                            <p className="text-[10px] text-slate-500 uppercase">
                              {format(new Date(job.scheduledDate!), 'a')}
                            </p>
                          </div>
                          <div className="w-0.5 h-10 bg-amber-400 rounded-full shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{job.title}</p>
                            <p className="text-xs text-slate-500 truncate">{tech?.name || 'Unassigned'} • {job.propertyAddress}</p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400">
                <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-medium">No jobs scheduled today</p>
              </div>
            )}
          </div>
        </div>

        {/* Team Status Widget */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" /> Team Status
            </h2>
            <Link to="/team" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">Manage</Link>
          </div>
          <div className="flex-1 overflow-y-auto max-h-72">
            {techStats.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {techStats.map(tech => (
                  <div key={tech.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600 shrink-0">
                      {tech.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{tech.name}</p>
                      <p className="text-xs text-slate-500">
                        <a href={`tel:${tech.phone}`} className="hover:text-blue-600">{tech.phone}</a>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {tech.today > 0 && (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">
                          {tech.today} today
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full">
                        {tech.active} active
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400">
                <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-medium">No technicians added</p>
                <Link to="/team" className="text-xs text-indigo-600 mt-1 inline-block hover:text-indigo-700">+ Add Technician</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Row 4: Revenue Summary + Recent Closed ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Summary Widget */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-emerald-500" /> Revenue Snapshot
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-emerald-50 rounded-lg">
              <p className="text-xl font-bold text-emerald-700">{closedThisMonth}</p>
              <p className="text-[11px] text-emerald-600 font-medium">Completed</p>
              <p className="text-[10px] text-emerald-500">this month</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-xl font-bold text-blue-700">{totalLaborHours.toFixed(0)}h</p>
              <p className="text-[11px] text-blue-600 font-medium">Labor Hours</p>
              <p className="text-[10px] text-blue-500">all time</p>
            </div>
            <div className="text-center p-3 bg-violet-50 rounded-lg">
              <p className="text-xl font-bold text-violet-700">${materialsCost.toFixed(0)}</p>
              <p className="text-[11px] text-violet-600 font-medium">Materials</p>
              <p className="text-[10px] text-violet-500">total cost</p>
            </div>
          </div>
        </div>

        {/* Recently Closed Widget */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Recently Completed
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto max-h-40">
            {jobs.filter(j => j.status === 'CLOSED').length > 0 ? (
              <div className="divide-y divide-slate-100">
                {jobs.filter(j => j.status === 'CLOSED').slice(0, 4).map(job => (
                  <Link key={job.id} to={`/jobs/${job.id}`} className="block px-4 py-2.5 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{job.title}</p>
                        <p className="text-xs text-slate-400">{job.propertyAddress}</p>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400 text-xs">No closed jobs yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
