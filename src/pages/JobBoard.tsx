import React from 'react';
import { Job, JobStatus } from '../types';
import { format } from 'date-fns';
import { Clock, MapPin, User, ArrowRight } from 'lucide-react';
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

export function JobBoard({ jobs }: JobBoardProps) {
  return (
    <div className="h-full flex gap-6 overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const columnJobs = jobs.filter(j => j.status === col.id);
        
        return (
          <div key={col.id} className="flex-shrink-0 w-80 flex flex-col bg-slate-100/50 rounded-2xl border border-slate-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-100 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <div className={cn("w-3 h-3 rounded-full", col.color)} />
                <h3 className="font-semibold text-slate-700">{col.label}</h3>
              </div>
              <span className="bg-white text-slate-500 text-xs font-medium px-2 py-1 rounded-full shadow-sm">
                {columnJobs.length}
              </span>
            </div>
            
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {columnJobs.map(job => (
                <Link 
                  key={job.id} 
                  to={`/jobs/${job.id}`}
                  className="block bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-slate-400">{job.id}</span>
                    <div className="flex gap-1">
                      {job.status === 'CLOSED' && (
                        <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </span>
                      )}
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                        job.type === 'SMOKE_ALARM' ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"
                      )}>
                        {job.type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  
                  <h4 className="font-semibold text-slate-900 mb-3 line-clamp-2 group-hover:text-amber-600 transition-colors">
                    {job.title}
                  </h4>
                  
                  <div className="space-y-2 text-sm text-slate-500">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{job.propertyAddress}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 shrink-0" />
                      <span className="line-clamp-1">{job.tenantName}</span>
                    </div>
                    {job.description && (
                      <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 mt-1">
                        <p className="text-[11px] text-slate-500 line-clamp-2 whitespace-pre-wrap">{job.description.split('\n').filter(l => l.includes('ISSUE REPORTED') || l.includes('ORIGINAL EMAIL')).length > 0 ? job.description.split('ISSUE REPORTED:\n')[1]?.split('\n')[0] || job.description.substring(0, 100) : job.description.substring(0, 100)}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 shrink-0" />
                      <span>{format(new Date(job.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                </Link>
              ))}
              
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
  );
}
