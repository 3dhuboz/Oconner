import React, { useState } from 'react';
import { Job, Electrician } from '../types';
import { format, addHours, startOfDay, parseISO } from 'date-fns';
import { MapPin, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CalendarProps {
  jobs: Job[];
  electricians: Electrician[];
}

export function Calendar({ jobs, electricians }: CalendarProps) {
  // Simple daily view
  const [currentDate, setCurrentDate] = useState(new Date());
  const hours = Array.from({ length: 10 }, (_, i) => i + 8); // 8 AM to 5 PM

  const getJobsForElectricianAndHour = (electricianId: string, hour: number) => {
    return jobs.filter(job => {
      if (!job.scheduledDate || job.assignedElectricianId !== electricianId) return false;
      const jobDate = new Date(job.scheduledDate);
      return (
        jobDate.getDate() === currentDate.getDate() &&
        jobDate.getMonth() === currentDate.getMonth() &&
        jobDate.getFullYear() === currentDate.getFullYear() &&
        jobDate.getHours() === hour
      );
    });
  };

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dispatch Calendar</h1>
          <p className="text-slate-500 mt-1">Allocate jobs based on location and time slots.</p>
        </div>
        <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
          <button 
            onClick={() => setCurrentDate(d => new Date(d.getTime() - 86400000))}
            className="p-1 hover:bg-slate-100 rounded-lg text-slate-600"
          >
            &larr;
          </button>
          <span className="font-semibold text-slate-800 min-w-[120px] text-center">
            {format(currentDate, 'EEEE, MMM d')}
          </span>
          <button 
            onClick={() => setCurrentDate(d => new Date(d.getTime() + 86400000))}
            className="p-1 hover:bg-slate-100 rounded-lg text-slate-600"
          >
            &rarr;
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Header Row */}
        <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="p-4 border-r border-slate-200 flex items-center justify-center font-medium text-slate-500 text-sm">
            Time
          </div>
          {electricians.map(electrician => (
            <div key={electrician.id} className="p-4 border-r border-slate-200 last:border-0 text-center">
              <h3 className="font-bold text-slate-900">{electrician.name}</h3>
              <p className="text-xs text-slate-500">{electrician.phone}</p>
            </div>
          ))}
        </div>

        {/* Grid Body */}
        <div className="flex-1 overflow-y-auto">
          {hours.map(hour => (
            <div key={hour} className="grid grid-cols-4 border-b border-slate-100 min-h-[100px] group">
              {/* Time Column */}
              <div className="p-4 border-r border-slate-200 flex items-start justify-center text-sm font-medium text-slate-400 bg-slate-50/50">
                {format(new Date().setHours(hour, 0, 0, 0), 'h:mm a')}
              </div>
              
              {/* Electrician Columns */}
              {electricians.map(electrician => {
                const hourJobs = getJobsForElectricianAndHour(electrician.id, hour);
                
                return (
                  <div key={`${electrician.id}-${hour}`} className="p-2 border-r border-slate-200 last:border-0 relative hover:bg-slate-50 transition-colors">
                    {hourJobs.map(job => (
                      <Link 
                        key={job.id} 
                        to={`/jobs/${job.id}`}
                        className="block bg-amber-100 border border-amber-300 rounded-lg p-3 shadow-sm hover:shadow-md hover:border-amber-400 transition-all mb-2 last:mb-0"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold text-amber-800">{job.id}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200 text-amber-800">
                            {job.status}
                          </span>
                        </div>
                        <h4 className="font-semibold text-slate-900 text-sm mb-2 line-clamp-1">{job.title}</h4>
                        <div className="flex items-start gap-1 text-xs text-slate-600">
                          <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{job.propertyAddress}</span>
                        </div>
                      </Link>
                    ))}
                    
                    {/* Empty slot placeholder for drag/drop (visual only for now) */}
                    {hourJobs.length === 0 && (
                      <div className="absolute inset-2 border-2 border-dashed border-transparent group-hover:border-slate-200 rounded-lg transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="text-xs font-medium text-slate-400">+ Assign Job</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
