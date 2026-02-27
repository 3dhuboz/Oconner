import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Job, Material, TimeEntry, CatalogPart } from '../types';
import { MapPin, Clock, Camera, Plus, Trash2, CheckCircle2, FileText, ArrowLeft, Navigation, Play, Square, Coffee, Package, Search, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGpsTracking } from '../hooks/useGpsTracking';
import { cn } from '../utils';
import { storage } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface FieldPortalProps {
  jobs: Job[];
  updateJob: (id: string, updates: Partial<Job>) => void;
  partsCatalog?: CatalogPart[];
}

// ─── Timer helpers ───────────────────────────────────────────
const TIMER_STORAGE_KEY = (jobId: string) => `wirez_timer_${jobId}`;

function loadTimerState(jobId: string): TimeEntry[] {
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY(jobId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveTimerState(jobId: string, entries: TimeEntry[]) {
  localStorage.setItem(TIMER_STORAGE_KEY(jobId), JSON.stringify(entries));
}

function clearTimerState(jobId: string) {
  localStorage.removeItem(TIMER_STORAGE_KEY(jobId));
}

type ClockStatus = 'idle' | 'working' | 'on_break' | 'clocked_off';

function getClockStatus(entries: TimeEntry[]): ClockStatus {
  if (entries.length === 0) return 'idle';
  const last = entries[entries.length - 1];
  if (last.type === 'clock_off') return 'clocked_off';
  if (last.type === 'break_start') return 'on_break';
  return 'working'; // clock_on or break_end
}

function calcWorkedMs(entries: TimeEntry[], now: Date = new Date()): number {
  let total = 0;
  let workStart: Date | null = null;

  for (const entry of entries) {
    const t = new Date(entry.timestamp);
    if (entry.type === 'clock_on' || entry.type === 'break_end') {
      workStart = t;
    } else if ((entry.type === 'break_start' || entry.type === 'clock_off') && workStart) {
      total += t.getTime() - workStart.getTime();
      workStart = null;
    }
  }
  // If still working (no clock_off, no break_start after last work start), add live time
  if (workStart) {
    total += now.getTime() - workStart.getTime();
  }
  return total;
}

function formatDuration(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatHoursDecimal(ms: number): string {
  return (ms / 3600000).toFixed(2);
}

function calcBreakMs(entries: TimeEntry[]): number {
  let total = 0;
  let breakStart: Date | null = null;
  for (const entry of entries) {
    const t = new Date(entry.timestamp);
    if (entry.type === 'break_start') {
      breakStart = t;
    } else if (entry.type === 'break_end' && breakStart) {
      total += t.getTime() - breakStart.getTime();
      breakStart = null;
    }
  }
  return total;
}

// ─── Component ───────────────────────────────────────────────
export function FieldPortal({ jobs, updateJob, partsCatalog = [] }: FieldPortalProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const job = jobs.find(j => j.id === id);

  // Background GPS tracking
  useGpsTracking({
    uid: user?.uid || '',
    enabled: !!user?.uid && !!job && ['DISPATCHED', 'EXECUTION'].includes(job?.status || ''),
    intervalMs: 30_000,
  });

  // Timer state — persisted to localStorage
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(() => job ? loadTimerState(job.id) : []);
  const [now, setNow] = useState(new Date());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clockStatus = getClockStatus(timeEntries);
  const workedMs = calcWorkedMs(timeEntries, now);
  const breakMs = calcBreakMs(timeEntries);

  // Tick the live timer every second when working
  useEffect(() => {
    if (clockStatus === 'working') {
      tickRef.current = setInterval(() => setNow(new Date()), 1000);
    } else {
      if (tickRef.current) clearInterval(tickRef.current);
    }
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [clockStatus]);

  // Persist entries to localStorage on change
  useEffect(() => {
    if (job) saveTimerState(job.id, timeEntries);
  }, [timeEntries, job]);

  const addEntry = useCallback((type: TimeEntry['type']) => {
    setTimeEntries(prev => [...prev, { type, timestamp: new Date().toISOString() }]);
    setNow(new Date());
  }, []);

  // Form state
  const [materials, setMaterials] = useState<Material[]>(job?.materials || []);
  const [photos, setPhotos] = useState<string[]>(job?.photos || []);
  const [siteNotes, setSiteNotes] = useState(job?.siteNotes || '');
  const [partSearch, setPartSearch] = useState('');
  const [showPartPicker, setShowPartPicker] = useState(false);

  if (!job) {
    return <div className="p-8 text-center text-slate-500">Job not found.</div>;
  }

  const handleAddMaterial = () => {
    setMaterials([...materials, { id: Math.random().toString(36).substr(2, 9), name: '', quantity: 1, cost: 0 }]);
  };

  const addFromCatalog = (part: CatalogPart) => {
    setMaterials(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      name: part.name,
      quantity: 1,
      cost: part.defaultCost,
    }]);
    setPartSearch('');
    setShowPartPicker(false);
  };

  const filteredCatalog = partsCatalog.filter(p =>
    p.name.toLowerCase().includes(partSearch.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(partSearch.toLowerCase())
  );

  const handleUpdateMaterial = (mid: string, field: keyof Material, value: any) => {
    setMaterials(materials.map(m => m.id === mid ? { ...m, [field]: value } : m));
  };

  const handleRemoveMaterial = (mid: string) => {
    setMaterials(materials.filter(m => m.id !== mid));
  };

  const [uploading, setUploading] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !job) return;

    if (!storage) {
      // Fallback: if storage not configured, use blob URL (won't persist to admin)
      setPhotos(prev => [...prev, URL.createObjectURL(file)]);
      return;
    }

    setUploading(true);
    try {
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storageRef = ref(storage, `job-photos/${job.id}/${timestamp}_${safeName}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      setPhotos(prev => [...prev, downloadUrl]);
    } catch (err: any) {
      console.error('Photo upload failed:', err);
      // Fallback to blob URL if upload fails (offline etc)
      setPhotos(prev => [...prev, URL.createObjectURL(file)]);
      alert('Photo saved locally. It will be visible to you but may not sync to the office until you have network.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (clockStatus !== 'clocked_off') {
      alert("⚠️ Please clock off before submitting the job.");
      return;
    }
    const finalMs = calcWorkedMs(timeEntries);
    const laborHours = parseFloat(formatHoursDecimal(finalMs));
    if (laborHours <= 0) {
      alert("⚠️ No time recorded. Please check your clock entries.");
      return;
    }
    if (photos.length === 0) {
      alert("⚠️ Required: Please upload at least one clear photo.");
      return;
    }
    if (!siteNotes.trim()) {
      alert("⚠️ Required: Please enter site notes.");
      return;
    }

    updateJob(job.id, {
      laborHours,
      timeLog: timeEntries,
      materials,
      photos,
      siteNotes,
      status: 'REVIEW'
    });
    
    clearTimerState(job.id);
    alert("Job submitted successfully! The office has been notified.");
    navigate('/');
  };

  // ─── Clock-on timestamp for display
  const clockOnTime = timeEntries.find(e => e.type === 'clock_on');

  return (
    <div className="bg-slate-50 pb-4">
      <div className="max-w-lg mx-auto px-4 py-4 space-y-5">
        {/* Back button */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Job Info Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              {job.status.replace('_', ' ')}
            </span>
            <span className="text-sm font-bold text-slate-400">{job.id}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">{job.title}</h2>
          
          <div className="space-y-3 mt-4 text-sm">
            <div className="flex items-start gap-3 text-slate-600">
              <MapPin className="w-5 h-5 shrink-0 text-slate-400" />
              <span>{job.propertyAddress}</span>
            </div>
            {job.scheduledDate && (
              <div className="flex items-start gap-3 text-slate-600">
                <Clock className="w-5 h-5 shrink-0 text-slate-400" />
                <span>{new Date(job.scheduledDate).toLocaleString()}</span>
              </div>
            )}
            {job.accessCodes && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
                <strong className="block text-xs uppercase tracking-wider mb-1">Access Instructions</strong>
                {job.accessCodes}
              </div>
            )}
            {job.workOrderUrl && (
              <a href={job.workOrderUrl} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors">
                <FileText className="w-4 h-4" /> View Work Order PDF
              </a>
            )}
            {job.propertyAddress && job.propertyAddress !== 'See email body' && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.propertyAddress)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors shadow-md shadow-blue-600/20 active:scale-[0.98]"
              >
                <Navigation className="w-5 h-5" /> Navigate to Job
              </a>
            )}
          </div>
        </div>

        {/* Start Job (Dispatched state) */}
        {job.status === 'DISPATCHED' && (
          <button 
            onClick={() => updateJob(job.id, { status: 'EXECUTION' })}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98]"
          >
            Start Job (Check-In)
          </button>
        )}

        {/* ─── EXECUTION / REVIEW / CLOSED ─── */}
        {['EXECUTION', 'REVIEW', 'CLOSED'].includes(job.status) && (
          <div className="space-y-5">

            {/* ════════ TIME CLOCK CARD ════════ */}
            <div className={cn(
              "rounded-2xl border shadow-sm overflow-hidden",
              clockStatus === 'working' ? "bg-emerald-50 border-emerald-200" :
              clockStatus === 'on_break' ? "bg-amber-50 border-amber-200" :
              clockStatus === 'clocked_off' ? "bg-slate-50 border-slate-200" :
              "bg-white border-slate-200"
            )}>
              {/* Timer display */}
              <div className="p-5 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                  {clockStatus === 'idle' && 'Ready to Start'}
                  {clockStatus === 'working' && 'Working'}
                  {clockStatus === 'on_break' && 'On Break'}
                  {clockStatus === 'clocked_off' && 'Clocked Off'}
                </p>
                <p className={cn(
                  "text-5xl font-mono font-bold tracking-tight",
                  clockStatus === 'working' ? "text-emerald-700" :
                  clockStatus === 'on_break' ? "text-amber-600" :
                  clockStatus === 'clocked_off' ? "text-slate-700" :
                  "text-slate-300"
                )}>
                  {formatDuration(workedMs)}
                </p>
                {clockOnTime && (
                  <p className="text-xs text-slate-400 mt-2">
                    Clocked on at {new Date(clockOnTime.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {breakMs > 0 && <span className="ml-2">| Break: {formatDuration(breakMs)}</span>}
                  </p>
                )}
                {clockStatus === 'clocked_off' && (
                  <p className="text-sm font-semibold text-slate-600 mt-2">
                    Total: {formatHoursDecimal(workedMs)} hours
                  </p>
                )}
              </div>

              {/* Clock action buttons */}
              {job.status === 'EXECUTION' && (
                <div className="border-t border-slate-200/60 p-4">
                  {clockStatus === 'idle' && (
                    <button
                      onClick={() => addEntry('clock_on')}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all"
                    >
                      <Play className="w-5 h-5" /> Clock On
                    </button>
                  )}

                  {clockStatus === 'working' && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => addEntry('break_start')}
                        className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                      >
                        <Coffee className="w-4 h-4" /> Break
                      </button>
                      <button
                        onClick={() => addEntry('clock_off')}
                        className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                      >
                        <Square className="w-4 h-4" /> Clock Off
                      </button>
                    </div>
                  )}

                  {clockStatus === 'on_break' && (
                    <button
                      onClick={() => addEntry('break_end')}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all"
                    >
                      <Play className="w-5 h-5" /> Resume Work
                    </button>
                  )}

                  {clockStatus === 'clocked_off' && (
                    <p className="text-center text-xs text-slate-500">
                      Time recorded. Complete the sections below and submit.
                    </p>
                  )}
                </div>
              )}

              {/* Time log summary (collapsed) */}
              {timeEntries.length > 0 && (
                <details className="border-t border-slate-200/60">
                  <summary className="px-4 py-2.5 text-xs font-semibold text-slate-500 cursor-pointer hover:text-slate-700">
                    View time log ({timeEntries.length} entries)
                  </summary>
                  <div className="px-4 pb-3 space-y-1">
                    {timeEntries.map((entry, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className={cn(
                          "font-semibold capitalize",
                          entry.type === 'clock_on' ? "text-emerald-600" :
                          entry.type === 'clock_off' ? "text-rose-600" :
                          entry.type === 'break_start' ? "text-amber-600" :
                          "text-blue-600"
                        )}>
                          {entry.type.replace('_', ' ')}
                        </span>
                        <span className="text-slate-400 font-mono">
                          {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>

            {/* ════════ MATERIALS / CONSUMABLES ════════ */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-slate-400" /> Materials / Consumables
                  </label>
                  {materials.length > 0 && (
                    <span className="text-xs font-bold text-slate-400">{materials.length} item{materials.length !== 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>

              {/* Added materials list */}
              {materials.length > 0 && (
                <div className="px-5 pb-3 space-y-2">
                  {materials.map((material) => (
                    <div key={material.id} className="flex gap-2 items-start bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex-1 space-y-2">
                        <input 
                          type="text" placeholder="Part name/description" 
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                          value={material.name}
                          onChange={e => handleUpdateMaterial(material.id, 'name', e.target.value)}
                          disabled={job.status !== 'EXECUTION'}
                        />
                        <div className="flex gap-2">
                          <div className="flex-1 flex items-center gap-2">
                            <span className="text-xs text-slate-500 font-medium">Qty:</span>
                            <input 
                              type="number" min="1"
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                              value={material.quantity}
                              onChange={e => handleUpdateMaterial(material.id, 'quantity', Number(e.target.value))}
                              disabled={job.status !== 'EXECUTION'}
                            />
                          </div>
                          <div className="flex-1 flex items-center gap-2">
                            <span className="text-xs text-slate-500 font-medium">$:</span>
                            <input 
                              type="number" min="0" step="0.01"
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                              value={material.cost}
                              onChange={e => handleUpdateMaterial(material.id, 'cost', Number(e.target.value))}
                              disabled={job.status !== 'EXECUTION'}
                            />
                          </div>
                        </div>
                      </div>
                      {job.status === 'EXECUTION' && (
                        <button onClick={() => handleRemoveMaterial(material.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg mt-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add parts section — only during EXECUTION */}
              {job.status === 'EXECUTION' && (
                <div className="border-t border-slate-100 p-4 space-y-3">
                  {!showPartPicker ? (
                    <div className="flex gap-2">
                      {partsCatalog.length > 0 && (
                        <button
                          onClick={() => setShowPartPicker(true)}
                          className="flex-1 py-2.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
                        >
                          <Package className="w-4 h-4" /> From Catalog
                        </button>
                      )}
                      <button
                        onClick={handleAddMaterial}
                        className="flex-1 py-2.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
                      >
                        <Plus className="w-4 h-4" /> Custom Item
                      </button>
                    </div>
                  ) : (
                    /* Catalog picker */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select from Catalog</span>
                        <button onClick={() => { setShowPartPicker(false); setPartSearch(''); }} className="text-xs text-slate-400 hover:text-slate-600">
                          Close
                        </button>
                      </div>

                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={partSearch}
                          onChange={e => setPartSearch(e.target.value)}
                          placeholder="Search parts..."
                          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          autoFocus
                        />
                      </div>

                      {/* Catalog items */}
                      <div className="max-h-48 overflow-y-auto space-y-1 -mx-1 px-1">
                        {filteredCatalog.length === 0 ? (
                          <p className="text-xs text-slate-400 text-center py-3">
                            {partSearch ? 'No matching parts' : 'No parts in catalog yet'}
                          </p>
                        ) : (
                          filteredCatalog.map(part => (
                            <button
                              key={part.id}
                              onClick={() => addFromCatalog(part)}
                              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-amber-50 active:bg-amber-100 transition-colors text-left"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-800 truncate">{part.name}</p>
                                {part.category && (
                                  <p className="text-[10px] text-slate-400">{part.category}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs font-bold text-slate-500">${part.defaultCost.toFixed(2)}</span>
                                <Plus className="w-4 h-4 text-amber-500" />
                              </div>
                            </button>
                          ))
                        )}
                      </div>

                      {/* Still allow custom */}
                      <button
                        onClick={() => { handleAddMaterial(); setShowPartPicker(false); setPartSearch(''); }}
                        className="w-full py-2 text-xs text-slate-500 hover:text-slate-700 font-medium flex items-center justify-center gap-1 border-t border-slate-100 pt-3"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add custom item instead
                      </button>
                    </div>
                  )}

                  {materials.length === 0 && !showPartPicker && (
                    <p className="text-xs text-slate-400 text-center">No materials added yet</p>
                  )}
                </div>
              )}
            </div>

            {/* ════════ PHOTOS ════════ */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Site Photos <span className="text-rose-500">*</span>
              </label>
              <p className="text-xs text-slate-500 mb-3">Switchboard, the fix, or smoke alarm location.</p>
              <div className="grid grid-cols-3 gap-3">
                {photos.map((url, i) => (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden border border-slate-200 relative group">
                    <img src={url} alt="Site" className="w-full h-full object-cover" />
                  </div>
                ))}
                {job.status === 'EXECUTION' && (
                  uploading ? (
                    <div className="aspect-square rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 flex flex-col items-center justify-center text-amber-500">
                      <Loader2 className="w-6 h-6 mb-1 animate-spin" />
                      <span className="text-[10px] font-medium">Uploading...</span>
                    </div>
                  ) : (
                    <label className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 hover:border-slate-400 transition-colors cursor-pointer">
                      <Camera className="w-6 h-6 mb-1" />
                      <span className="text-xs font-medium">Add Photo</span>
                      <input type="file" className="hidden" accept="image/*" capture="environment" onChange={handlePhotoUpload} />
                    </label>
                  )
                )}
              </div>
            </div>

            {/* ════════ NOTES ════════ */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Site Notes <span className="text-rose-500">*</span>
              </label>
              <p className="text-xs text-slate-500 mb-3">Hazards, recommendations, or 'All clear'.</p>
              <textarea 
                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm min-h-[100px]"
                placeholder="Enter your site notes here..."
                value={siteNotes}
                onChange={e => setSiteNotes(e.target.value)}
                disabled={job.status !== 'EXECUTION'}
              />
            </div>

            {/* ════════ SUBMIT ════════ */}
            {job.status === 'EXECUTION' && (
              <button 
                onClick={handleSubmit}
                disabled={clockStatus !== 'clocked_off'}
                className={cn(
                  "w-full py-4 rounded-2xl font-bold text-lg shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2",
                  clockStatus === 'clocked_off'
                    ? "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                )}
              >
                <CheckCircle2 className="w-6 h-6" />
                {clockStatus === 'clocked_off' ? 'Submit Job to Office' : 'Clock off to submit'}
              </button>
            )}
            
            {job.status === 'REVIEW' && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-center font-medium flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> Job submitted for Admin Review
              </div>
            )}

            {/* ════════ PAYMENT COLLECTION ════════ */}
            {['REVIEW', 'CLOSED'].includes(job.status) && job.paymentLinkUrl && (
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    💳 Collect Payment
                  </h3>
                  <span className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-bold',
                    job.paymentStatus === 'paid' ? 'bg-emerald-600 text-white' :
                    job.paymentStatus === 'failed' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  )}>
                    {job.paymentStatus === 'paid' ? '✓ PAID' :
                     job.paymentStatus === 'failed' ? '✗ FAILED' :
                     '⏳ PENDING'}
                  </span>
                </div>

                {job.paymentStatus !== 'paid' && (
                  <>
                    {job.amountDue && (
                      <div className="text-center py-3 bg-white/60 rounded-xl border border-emerald-200">
                        <div className="text-4xl font-black text-slate-900">${job.amountDue.toFixed(2)}</div>
                        <div className="text-sm text-slate-600 font-medium mt-1">Amount Due</div>
                      </div>
                    )}

                    <div className="bg-white rounded-xl p-4 border border-emerald-200 space-y-3">
                      <p className="text-sm text-slate-600 text-center font-medium">
                        Show this QR code to the customer to pay with their phone
                      </p>
                      
                      {/* QR Code */}
                      <div className="flex justify-center">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(job.paymentLinkUrl)}`}
                          alt="Payment QR Code"
                          className="w-48 h-48 border-4 border-slate-900 rounded-xl"
                        />
                      </div>

                      <div className="text-xs text-slate-500 text-center space-y-1">
                        <p>Customer can tap their phone to the QR code</p>
                        <p className="font-semibold">or</p>
                      </div>

                      <button
                        onClick={() => {
                          window.open(job.paymentLinkUrl, '_blank');
                        }}
                        className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        📱 Open Payment Page
                      </button>

                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(job.paymentLinkUrl!);
                          alert('Payment link copied! You can now send it to the customer via SMS or email.');
                        }}
                        className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-sm transition-colors"
                      >
                        📋 Copy Payment Link
                      </button>
                    </div>

                    <div className="text-xs text-slate-500 text-center leading-relaxed bg-white/40 rounded-lg p-3 border border-emerald-100">
                      💡 <strong>Tip:</strong> Customer can pay with Apple Pay, Google Pay, or any credit/debit card. Payment is instant and secure via Stripe.
                    </div>
                  </>
                )}

                {job.paymentStatus === 'paid' && job.paidAt && (
                  <div className="text-center py-6 bg-white/60 rounded-xl border border-emerald-200">
                    <div className="text-5xl mb-3">✅</div>
                    <div className="text-lg font-bold text-emerald-900">Payment Received!</div>
                    <div className="text-sm text-slate-600 mt-2">
                      Paid on {new Date(job.paidAt).toLocaleString('en-AU', { 
                        dateStyle: 'medium', 
                        timeStyle: 'short' 
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
