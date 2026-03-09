import React, { useState, useMemo } from 'react';
import { Job, Electrician } from '../types';
import { format } from 'date-fns';
import {
  Search, MapPin, Clock, Camera, FileText, ChevronDown, ChevronUp, ExternalLink,
  Pencil, Check, X, Loader2, Navigation, User, Building2, Key,
  Wrench, DollarSign, CalendarDays, Zap, ShieldCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../utils';

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

interface PropertyHistoryProps {
  jobs: Job[];
  updateJob: (id: string, updates: Partial<Job>) => Promise<void>;
  electricians?: Electrician[];
}

interface PropertyGroup {
  address: string;
  normalised: string;
  jobs: Job[];
  lastVisit: string;
  firstVisit: string;
  totalJobs: number;
  hasPhotos: boolean;
  hasSmokeAlarm: boolean;
  tenants: string[];
  agencies: string[];
  totalLabourHours: number;
  totalMaterials: number;
  totalPhotos: number;
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

export function PropertyHistory({ jobs, updateJob, electricians = [] }: PropertyHistoryProps) {
  const [search, setSearch] = useState('');
  const [expandedAddress, setExpandedAddress] = useState<string | null>(null);
  const [editingAddress, setEditingAddress] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const techName = (id?: string) => {
    if (!id) return null;
    const e = electricians.find(el => el.id === id);
    return e ? e.name : null;
  };

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
          firstVisit: job.createdAt,
          totalJobs: 0,
          hasPhotos: false,
          hasSmokeAlarm: false,
          tenants: [],
          agencies: [],
          totalLabourHours: 0,
          totalMaterials: 0,
          totalPhotos: 0,
        });
      }

      const group = grouped.get(normalised)!;
      group.jobs.push(job);
      group.totalJobs++;
      if (job.photos?.length) { group.hasPhotos = true; group.totalPhotos += job.photos.length; }
      if (job.type === 'SMOKE_ALARM') group.hasSmokeAlarm = true;
      if (new Date(job.createdAt) > new Date(group.lastVisit)) group.lastVisit = job.createdAt;
      if (new Date(job.createdAt) < new Date(group.firstVisit)) group.firstVisit = job.createdAt;
      if (job.tenantName && !group.tenants.includes(job.tenantName)) group.tenants.push(job.tenantName);
      if (job.agency && !group.agencies.includes(job.agency)) group.agencies.push(job.agency);
      if (job.laborHours) group.totalLabourHours += job.laborHours;
      if (job.materials?.length) group.totalMaterials += job.materials.length;
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
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F5A623] shadow-sm"
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
                <MapPin className="w-5 h-5 text-[#F5A623] shrink-0" />
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

              {/* Expanded property detail */}
              {isExpanded && (
                <div className="border-t border-slate-200">

                  {/* ── Top row: Map + Property Summary ── */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x divide-slate-200">

                    {/* Google Map */}
                    <div className="bg-slate-100 min-h-[220px] relative">
                      {property.address && property.address !== 'See email body' && GOOGLE_MAPS_KEY ? (
                        <iframe
                          title={`Map of ${property.address}`}
                          className="w-full h-full min-h-[220px] border-0"
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          src={`https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_KEY}&q=${encodeURIComponent(property.address)}&zoom=16`}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full min-h-[220px] text-slate-400">
                          <div className="text-center">
                            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
                            <p className="text-xs font-medium">
                              {!GOOGLE_MAPS_KEY ? 'Google Maps API key not set' : 'No valid address for map'}
                            </p>
                          </div>
                        </div>
                      )}
                      {/* Navigate button overlay */}
                      {property.address && property.address !== 'See email body' && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(property.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute top-3 right-3 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5 transition-colors"
                        >
                          <Navigation className="w-3.5 h-3.5" /> Navigate
                        </a>
                      )}
                    </div>

                    {/* Property summary */}
                    <div className="p-4 sm:p-5 space-y-3">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Property Summary</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          {property.tenants.length > 0 && (
                            <div className="flex items-start gap-2">
                              <User className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-[10px] text-slate-400 font-medium">Tenant{property.tenants.length > 1 ? 's' : ''}</p>
                                {property.tenants.map(t => (
                                  <p key={t} className="text-xs font-medium text-slate-800">{t}</p>
                                ))}
                              </div>
                            </div>
                          )}
                          {property.agencies.length > 0 && (
                            <div className="flex items-start gap-2">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-[10px] text-slate-400 font-medium">Agency</p>
                                {property.agencies.map(a => (
                                  <p key={a} className="text-xs font-medium text-slate-800">{a}</p>
                                ))}
                              </div>
                            </div>
                          )}
                          {(() => {
                            const latestAccess = sortedJobs.find(j => j.accessCodes)?.accessCodes;
                            if (!latestAccess) return null;
                            return (
                              <div className="flex items-start gap-2">
                                <Key className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-[10px] text-slate-400 font-medium">Access</p>
                                  <p className="text-xs font-medium text-slate-800">{latestAccess}</p>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <CalendarDays className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-[10px] text-slate-400 font-medium">Service History</p>
                              <p className="text-xs font-medium text-slate-800">
                                {format(new Date(property.firstVisit), 'MMM d, yyyy')} — {format(new Date(property.lastVisit), 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            <span className="px-2 py-0.5 bg-slate-100 rounded-full text-[10px] font-bold text-slate-600">
                              {property.totalJobs} job{property.totalJobs !== 1 ? 's' : ''}
                            </span>
                            {property.totalLabourHours > 0 && (
                              <span className="px-2 py-0.5 bg-blue-50 rounded-full text-[10px] font-bold text-blue-700">
                                {property.totalLabourHours}h labour
                              </span>
                            )}
                            {property.totalPhotos > 0 && (
                              <span className="px-2 py-0.5 bg-purple-50 rounded-full text-[10px] font-bold text-purple-700">
                                {property.totalPhotos} photos
                              </span>
                            )}
                            {property.totalMaterials > 0 && (
                              <span className="px-2 py-0.5 bg-amber-50 rounded-full text-[10px] font-bold text-[#E8862A]">
                                {property.totalMaterials} materials
                              </span>
                            )}
                            {property.hasSmokeAlarm && (
                              <span className="px-2 py-0.5 bg-rose-50 rounded-full text-[10px] font-bold text-rose-700">
                                Smoke Alarm
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Work Order History ── */}
                  <div className="border-t border-slate-200 px-4 sm:px-5 py-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5" /> Work Order History
                    </h4>
                    <div className="space-y-2">
                      {sortedJobs.map((job, idx) => (
                        <div key={job.id} className="relative pl-6">
                          {/* Timeline connector */}
                          {idx < sortedJobs.length - 1 && (
                            <div className="absolute left-[9px] top-6 bottom-0 w-px bg-slate-200" />
                          )}
                          <div className={cn(
                            'absolute left-0 top-1.5 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center',
                            job.status === 'CLOSED' ? 'bg-emerald-100 border-emerald-400' :
                            job.status === 'EXECUTION' ? 'bg-orange-100 border-orange-400' :
                            job.status === 'REVIEW' ? 'bg-blue-100 border-blue-400' :
                            'bg-slate-100 border-slate-300'
                          )}>
                            <Zap className={cn(
                              'w-2.5 h-2.5',
                              job.status === 'CLOSED' ? 'text-emerald-600' :
                              job.status === 'EXECUTION' ? 'text-orange-600' :
                              'text-slate-500'
                            )} />
                          </div>

                          <div className="bg-white border border-slate-200 rounded-xl p-3 hover:shadow-sm transition-shadow">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                  <span className="text-xs font-bold text-slate-700">{format(new Date(job.createdAt), 'MMM d, yyyy')}</span>
                                  <span className={cn(
                                    "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full",
                                    job.status === 'CLOSED' ? 'bg-emerald-100 text-emerald-700' :
                                    job.status === 'EXECUTION' ? 'bg-orange-100 text-orange-700' :
                                    job.status === 'REVIEW' ? 'bg-blue-100 text-blue-700' :
                                    'bg-slate-100 text-slate-600'
                                  )}>{job.status.replace('_', ' ')}</span>
                                  <span className={cn(
                                    "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full",
                                    job.type === 'SMOKE_ALARM' ? 'bg-rose-100 text-rose-700' :
                                    job.type === 'EMERGENCY' ? 'bg-red-100 text-red-700' :
                                    'bg-slate-100 text-slate-600'
                                  )}>{job.type.replace(/_/g, ' ')}</span>
                                  {job.urgency && job.urgency !== 'Routine' && (
                                    <span className={cn(
                                      "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                                      job.urgency === 'Emergency' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-[#E8862A]'
                                    )}>{job.urgency}</span>
                                  )}
                                </div>
                                <p className="text-sm font-semibold text-slate-900 mb-1">{job.title}</p>
                                {job.description && (
                                  <p className="text-xs text-slate-500 line-clamp-2 mb-1.5">{job.description}</p>
                                )}
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                                  {job.tenantName && (
                                    <span className="flex items-center gap-1">
                                      <User className="w-3 h-3" /> {job.tenantName}
                                    </span>
                                  )}
                                  {techName(job.assignedElectricianId) && (
                                    <span className="flex items-center gap-1">
                                      <Wrench className="w-3 h-3" /> {techName(job.assignedElectricianId)}
                                    </span>
                                  )}
                                  {job.scheduledDate && (
                                    <span className="flex items-center gap-1">
                                      <CalendarDays className="w-3 h-3" /> Scheduled: {format(new Date(job.scheduledDate), 'MMM d, yyyy')}
                                    </span>
                                  )}
                                  {job.laborHours ? (
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" /> {job.laborHours}h
                                    </span>
                                  ) : null}
                                  {job.materials?.length ? (
                                    <span className="flex items-center gap-1">
                                      <DollarSign className="w-3 h-3" /> {job.materials.length} items
                                    </span>
                                  ) : null}
                                  {job.photos?.length ? (
                                    <span className="flex items-center gap-1 text-blue-600">
                                      <Camera className="w-3 h-3" /> {job.photos.length}
                                    </span>
                                  ) : null}
                                  {job.form9Sent && (
                                    <span className="flex items-center gap-1 text-purple-600">
                                      <FileText className="w-3 h-3" /> Form 9
                                    </span>
                                  )}
                                  {job.complianceReportGenerated && (
                                    <span className="flex items-center gap-1 text-emerald-600">
                                      <ShieldCheck className="w-3 h-3" /> Compliance
                                    </span>
                                  )}
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
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Photos gallery ── */}
                  {property.hasPhotos && (
                    <div className="border-t border-slate-200 px-4 sm:px-5 py-4 bg-slate-50">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5" /> Property Photos ({property.totalPhotos})
                      </h4>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {sortedJobs
                          .flatMap(j => (j.photos || []).map(p => ({ url: p, jobId: j.id, date: j.createdAt, title: j.title })))
                          .slice(0, 30)
                          .map((photo, i) => (
                            <a
                              key={i}
                              href={photo.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`${photo.title} — ${format(new Date(photo.date), 'MMM d, yyyy')}`}
                              className="shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-slate-200 hover:ring-2 hover:ring-[#F5A623] transition-all relative group"
                            >
                              <img src={photo.url} alt={`Job ${photo.jobId}`} className="w-full h-full object-cover" />
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <p className="text-[9px] text-white font-medium truncate">{format(new Date(photo.date), 'MMM d, yy')}</p>
                              </div>
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
