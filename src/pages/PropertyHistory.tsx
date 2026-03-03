import React, { useState, useMemo } from 'react';
import { Job } from '../types';
import { format } from 'date-fns';
import { Search, MapPin, Clock, Camera, FileText, ChevronDown, ChevronUp, ExternalLink, Pencil, Check, X, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../utils';

interface PropertyHistoryProps {
  jobs: Job[];
  updateJob: (id: string, updates: Partial<Job>) => Promise<void>;
}

interface PropertyGroup {
  address: string;
  normalised: string;
  jobs: Job[];
  lastVisit: string;
  totalJobs: number;
  hasPhotos: boolean;
  hasSmokeAlarm: boolean;
}

function normaliseAddress(addr: string): string {
  return addr
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/,\s*/g, ', ')
    .replace(/\bunit\b/gi, 'unit')
    .replace(/\bst\b/gi, 'street')
    .replace(/\brd\b/gi, 'road')
    .replace(/\bdr\b/gi, 'drive')
    .replace(/\bave\b/gi, 'avenue')
    .replace(/\bcres\b/gi, 'crescent')
    .replace(/\bct\b/gi, 'court')
    .replace(/\bpl\b/gi, 'place')
    .trim();
}

export function PropertyHistory({ jobs, updateJob }: PropertyHistoryProps) {
  const [search, setSearch] = useState('');
  const [expandedAddress, setExpandedAddress] = useState<string | null>(null);
  const [editingAddress, setEditingAddress] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSaveAddress = async (property: PropertyGroup) => {
    const newAddress = editValue.trim();
    if (!newAddress || newAddress === property.address) {
      setEditingAddress(null);
      return;
    }
    setSaving(true);
    try {
      await Promise.all(
        property.jobs.map(job => updateJob(job.id, { propertyAddress: newAddress }))
      );
    } catch (err) {
      console.error('Failed to update address:', err);
    }
    setSaving(false);
    setEditingAddress(null);
  };

  const properties = useMemo(() => {
    const grouped = new Map<string, PropertyGroup>();

    for (const job of jobs) {
      if (!job.propertyAddress) continue;
      const normalised = normaliseAddress(job.propertyAddress);
      
      if (!grouped.has(normalised)) {
        grouped.set(normalised, {
          address: job.propertyAddress,
          normalised,
          jobs: [],
          lastVisit: job.createdAt,
          totalJobs: 0,
          hasPhotos: false,
          hasSmokeAlarm: false,
        });
      }

      const group = grouped.get(normalised)!;
      group.jobs.push(job);
      group.totalJobs++;
      if (job.photos?.length) group.hasPhotos = true;
      if (job.type === 'SMOKE_ALARM') group.hasSmokeAlarm = true;
      if (new Date(job.createdAt) > new Date(group.lastVisit)) {
        group.lastVisit = job.createdAt;
      }
    }

    // Sort by most recent
    return Array.from(grouped.values()).sort(
      (a, b) => new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime()
    );
  }, [jobs]);

  const filtered = useMemo(() => {
    if (!search.trim()) return properties;
    const q = search.toLowerCase();
    return properties.filter(p =>
      p.address.toLowerCase().includes(q) ||
      p.jobs.some(j => j.tenantName?.toLowerCase().includes(q)) ||
      p.jobs.some(j => j.agency?.toLowerCase().includes(q))
    );
  }, [properties, search]);

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Property Database</h1>
        <p className="text-sm text-slate-500">Search by address to view all job history, photos, and compliance reports for any property.</p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by address, tenant name, or agency..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-sm"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
          {filtered.length} {filtered.length === 1 ? 'property' : 'properties'}
        </span>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-slate-900">{properties.length}</div>
          <div className="text-xs text-slate-500 font-medium">Total Properties</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-slate-900">{jobs.length}</div>
          <div className="text-xs text-slate-500 font-medium">Total Jobs</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-rose-600">{properties.filter(p => p.hasSmokeAlarm).length}</div>
          <div className="text-xs text-slate-500 font-medium">SA Check Properties</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-blue-600">{properties.filter(p => p.hasPhotos).length}</div>
          <div className="text-xs text-slate-500 font-medium">With Photos</div>
        </div>
      </div>

      {/* Property list */}
      <div className="space-y-3">
        {filtered.map(property => {
          const isExpanded = expandedAddress === property.normalised;
          const sortedJobs = [...property.jobs].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          return (
            <div key={property.normalised} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              {/* Property header */}
              <div className="w-full px-4 sm:px-5 py-4 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left">
                <MapPin className="w-5 h-5 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  {editingAddress === property.normalised ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveAddress(property);
                          if (e.key === 'Escape') setEditingAddress(null);
                        }}
                        className="flex-1 px-3 py-1.5 border-2 border-blue-300 rounded-lg text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
                        placeholder="Enter correct address..."
                        autoFocus
                        disabled={saving}
                      />
                      <button
                        onClick={() => handleSaveAddress(property)}
                        disabled={saving}
                        className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors"
                        title="Save address"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setEditingAddress(null)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <span className="text-[10px] text-blue-600 font-medium whitespace-nowrap">
                        Updates {property.totalJobs} job{property.totalJobs > 1 ? 's' : ''}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900 truncate">{property.address}</h3>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setEditingAddress(property.normalised);
                          setEditValue(property.address);
                        }}
                        className="p-1 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded transition-colors shrink-0"
                        title="Edit address"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                    <span>{property.totalJobs} job{property.totalJobs > 1 ? 's' : ''}</span>
                    <span>Last: {format(new Date(property.lastVisit), 'MMM d, yyyy')}</span>
                    {property.hasSmokeAlarm && <span className="text-rose-600 font-medium">SA</span>}
                    {property.hasPhotos && <span className="text-blue-600 font-medium">📷</span>}
                  </div>
                </div>
                <button
                  onClick={() => setExpandedAddress(isExpanded ? null : property.normalised)}
                  className="flex items-center gap-2 shrink-0"
                >
                  <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded-full">
                    {property.totalJobs}
                  </span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
              </div>

              {/* Expanded job list */}
              {isExpanded && (
                <div className="border-t border-slate-200 divide-y divide-slate-100">
                  {sortedJobs.map(job => (
                    <div key={job.id} className="px-4 sm:px-5 py-3 hover:bg-slate-50 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full",
                            job.status === 'CLOSED' ? 'bg-emerald-100 text-emerald-700' :
                            job.status === 'EXECUTION' ? 'bg-orange-100 text-orange-700' :
                            'bg-slate-100 text-slate-600'
                          )}>{job.status}</span>
                          <span className={cn(
                            "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full",
                            job.type === 'SMOKE_ALARM' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                          )}>{job.type.replace(/_/g, ' ')}</span>
                          {job.photos?.length ? (
                            <span className="text-[10px] text-blue-600 font-medium flex items-center gap-0.5">
                              <Camera className="w-3 h-3" /> {job.photos.length}
                            </span>
                          ) : null}
                          {job.form9Sent && (
                            <span className="text-[10px] text-purple-600 font-medium flex items-center gap-0.5">
                              <FileText className="w-3 h-3" /> Form 9
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-900 truncate">{job.title}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(job.createdAt), 'MMM d, yyyy')}
                          </span>
                          {job.tenantName && <span>Tenant: {job.tenantName}</span>}
                          {job.laborHours ? <span>{job.laborHours}h labour</span> : null}
                        </div>
                      </div>
                      <Link
                        to={`/jobs/${job.id}`}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 shrink-0"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open
                      </Link>
                    </div>
                  ))}

                  {/* Photos gallery for this property */}
                  {property.hasPhotos && (
                    <div className="px-4 sm:px-5 py-3 bg-slate-50">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Property Photos</p>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {sortedJobs
                          .flatMap(j => (j.photos || []).map(p => ({ url: p, jobId: j.id, date: j.createdAt })))
                          .slice(0, 20)
                          .map((photo, i) => (
                            <a
                              key={i}
                              href={photo.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-slate-200 hover:ring-2 hover:ring-amber-400 transition-all"
                            >
                              <img src={photo.url} alt={`Job ${photo.jobId}`} className="w-full h-full object-cover" />
                            </a>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No properties found</p>
            <p className="text-sm mt-1">
              {search ? 'Try a different search term.' : 'Properties will appear here once jobs are created.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
