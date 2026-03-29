import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Job, Material, TimeEntry, CatalogPart } from '../types';
import {
  MapPin, Clock, Camera, Plus, Trash2, CheckCircle2, FileText,
  Navigation, Play, Square, Coffee, Package, Search, Loader2,
  ChevronDown, ChevronUp, DollarSign, X, AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils';
import { uploadsApi } from '../services/api';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';

// ─── Types ────────────────────────────────────────────────────
interface FieldPortalProps {
  jobs: Job[];
  updateJob: (id: string, updates: Partial<Job>) => void;
  partsCatalog?: CatalogPart[];
}

type ClockStatus = 'idle' | 'working' | 'on_break' | 'clocked_off';
type ActiveTab = 'overview' | 'clock' | 'materials' | 'photos' | 'invoice';

// ─── Timer helpers ────────────────────────────────────────────
function loadTimerState(jobId: string): TimeEntry[] {
  try {
    const raw = localStorage.getItem(`wirez_timer_${jobId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveTimerState(jobId: string, entries: TimeEntry[]) {
  localStorage.setItem(`wirez_timer_${jobId}`, JSON.stringify(entries));
}

function getClockStatus(entries: TimeEntry[]): ClockStatus {
  if (entries.length === 0) return 'idle';
  const last = entries[entries.length - 1];
  if (last.type === 'clock_off') return 'clocked_off';
  if (last.type === 'break_start') return 'on_break';
  return 'working';
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
  if (workStart) total += now.getTime() - workStart.getTime();
  return total;
}

function calcBreakMs(entries: TimeEntry[]): number {
  let total = 0;
  let breakStart: Date | null = null;
  for (const entry of entries) {
    const t = new Date(entry.timestamp);
    if (entry.type === 'break_start') breakStart = t;
    else if (entry.type === 'break_end' && breakStart) {
      total += t.getTime() - breakStart.getTime();
      breakStart = null;
    }
  }
  return total;
}

function formatDuration(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const h = Math.floor(secs / 3600).toString().padStart(2, '0');
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function msToHours(ms: number): number {
  return ms / 3600000;
}

// ─── Invoice PDF generator ────────────────────────────────────
function generateInvoicePDF(job: Job, materials: Material[], timeEntries: TimeEntry[]): jsPDF {
  const doc = new jsPDF();
  const hourlyRate = job.hourlyRate ?? 95;
  const workedMs = calcWorkedMs(timeEntries);
  const laborHours = msToHours(workedMs);
  const laborCost = laborHours * hourlyRate;
  const materialsCost = materials.reduce((sum, m) => sum + m.cost * m.quantity, 0);
  const subtotal = laborCost + materialsCost;
  const gst = subtotal * 0.1;
  const total = subtotal + gst;
  const invoiceNo = `INV-${job.id.slice(-8).toUpperCase()}`;
  const dateStr = new Date().toLocaleDateString('en-AU');

  // ── Header bar ──
  doc.setFillColor(26, 26, 46); // #1a1a2e
  doc.rect(0, 0, 210, 30, 'F');
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(245, 166, 35); // amber
  doc.text('WIREZ R US', 15, 19);
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('Licensed Electrical Contractor', 15, 25);
  doc.setFont('helvetica', 'normal');
  doc.text('QLD Licence No. XXXXX', 115, 19);
  doc.text('ABN: XX XXX XXX XXX', 115, 25);

  // ── Invoice title & number ──
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('TAX INVOICE', 105, 45, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice No: ${invoiceNo}`, 140, 53);
  doc.text(`Date: ${dateStr}`, 140, 59);
  doc.text(`Due: On completion`, 140, 65);

  // ── Bill To ──
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 15, 53);
  doc.setFont('helvetica', 'normal');
  doc.text(job.tenantName || '—', 15, 59);
  const addrLines = doc.splitTextToSize(job.propertyAddress || '—', 70);
  doc.text(addrLines, 15, 65);
  if (job.tenantPhone) doc.text(`Ph: ${job.tenantPhone}`, 15, 65 + addrLines.length * 5 + 2);
  if (job.tenantEmail) doc.text(`Email: ${job.tenantEmail}`, 15, 65 + addrLines.length * 5 + 8);

  // ── Job description ──
  let y = 83;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(13, y - 5, 184, 18, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('Job Description:', 15, y);
  doc.setFont('helvetica', 'normal');
  const descLines = doc.splitTextToSize(job.title || job.type || '—', 170);
  doc.text(descLines, 15, y + 6);
  y += 20;

  // ── Line items header ──
  doc.setFillColor(26, 26, 46);
  doc.rect(13, y, 184, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Description', 16, y + 5.5);
  doc.text('Qty', 130, y + 5.5, { align: 'center' });
  doc.text('Unit Price', 158, y + 5.5, { align: 'right' });
  doc.text('Amount', 195, y + 5.5, { align: 'right' });
  y += 10;

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  const drawRow = (desc: string, qty: string, unit: string, amount: string, shade: boolean) => {
    if (shade) {
      doc.setFillColor(248, 250, 252);
      doc.rect(13, y - 4, 184, 7, 'F');
    }
    doc.text(desc, 16, y);
    doc.text(qty, 130, y, { align: 'center' });
    doc.text(unit, 158, y, { align: 'right' });
    doc.text(amount, 195, y, { align: 'right' });
    y += 7;
  };

  let rowIdx = 0;
  if (laborHours > 0.01) {
    drawRow(
      `Labour — ${job.title || 'Electrical Work'}`,
      `${laborHours.toFixed(2)} hrs`,
      `$${hourlyRate.toFixed(2)}/hr`,
      `$${laborCost.toFixed(2)}`,
      rowIdx++ % 2 === 0
    );
  }
  for (const m of materials) {
    const name = m.name.length > 55 ? m.name.slice(0, 52) + '…' : m.name;
    drawRow(name, String(m.quantity), `$${m.cost.toFixed(2)}`, `$${(m.cost * m.quantity).toFixed(2)}`, rowIdx++ % 2 === 0);
  }

  // ── Totals ──
  y += 4;
  const totalsX = 130;
  const amtX = 195;
  doc.setDrawColor(203, 213, 225);
  doc.line(totalsX, y, 197, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal (ex. GST):', totalsX, y);
  doc.text(`$${subtotal.toFixed(2)}`, amtX, y, { align: 'right' });
  y += 6;
  doc.text('GST (10%):', totalsX, y);
  doc.text(`$${gst.toFixed(2)}`, amtX, y, { align: 'right' });
  y += 4;
  doc.line(totalsX, y, 197, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TOTAL DUE:', totalsX, y);
  doc.text(`$${total.toFixed(2)}`, amtX, y, { align: 'right' });

  // ── Footer ──
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Payment due upon completion of works. Thank you for choosing Wirez R Us.', 105, 280, { align: 'center' });
  doc.text('Questions? Contact us at admin@wirezapp.au', 105, 285, { align: 'center' });

  return doc;
}

// ─── Main Component ───────────────────────────────────────────
export function FieldPortal({ jobs, updateJob, partsCatalog = [] }: FieldPortalProps) {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  // ── ALL hooks unconditionally at top ──────────────────────────
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [now, setNow] = useState(() => new Date());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [siteNotes, setSiteNotes] = useState('');
  const [partSearch, setPartSearch] = useState('');
  const [showPartPicker, setShowPartPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [invoiceGenerated, setInvoiceGenerated] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const prevJobIdRef = useRef<string | undefined>(undefined);

  // Derive job from props — no hook
  const job = jobs.find(j => j.id === id);

  // Initialise form state when job first loads (or changes)
  useEffect(() => {
    if (!job) return;
    if (prevJobIdRef.current === job.id) return;
    prevJobIdRef.current = job.id;
    setMaterials(job.materials ?? []);
    setSiteNotes(job.siteNotes ?? '');
    setPhotos(job.photos ?? []);
    const saved = loadTimerState(job.id);
    setTimeEntries(saved);
  }, [job]);

  // Derived timer values (safe to compute even when job is undefined)
  const clockStatus: ClockStatus = getClockStatus(timeEntries);
  const workedMs = calcWorkedMs(timeEntries, now);
  const breakMs = calcBreakMs(timeEntries);

  // Live tick — runs only when working
  useEffect(() => {
    if (clockStatus === 'working') {
      tickRef.current = setInterval(() => setNow(new Date()), 1000);
    } else {
      if (tickRef.current) clearInterval(tickRef.current);
    }
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [clockStatus]);

  // Persist timer to localStorage
  useEffect(() => {
    if (job?.id) saveTimerState(job.id, timeEntries);
  }, [timeEntries, job?.id]);

  // ── GUARD: render only after all hooks ───────────────────────
  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-slate-500 text-sm">Loading job…</p>
      </div>
    );
  }

  // ── Handlers ─────────────────────────────────────────────────
  const addTimeEntry = (type: TimeEntry['type']) => {
    const entry: TimeEntry = { type, timestamp: new Date().toISOString() };
    setTimeEntries(prev => [...prev, entry]);
    setNow(new Date());

    // Auto-update job status
    if (type === 'clock_on' && job.status === 'DISPATCHED') {
      updateJob(job.id, { status: 'EXECUTION' });
    }
    if (type === 'clock_off' && job.status === 'EXECUTION') {
      updateJob(job.id, {
        laborHours: parseFloat(msToHours(calcWorkedMs([...timeEntries, entry])).toFixed(2)),
        timeLog: [...timeEntries, entry],
      });
    }

    const labels: Record<TimeEntry['type'], string> = {
      clock_on: '⏱ Clocked on',
      break_start: '☕ Break started',
      break_end: '▶ Back on site',
      clock_off: '✅ Clocked off',
    };
    toast.success(labels[type]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateJob(job.id, {
        materials,
        photos,
        siteNotes,
        laborHours: parseFloat(msToHours(workedMs).toFixed(2)),
        timeLog: timeEntries,
      });
      toast.success('Saved');
    } catch {
      toast.error('Save failed');
    }
    setSaving(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const filename = `job-photos/${job.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { url, key } = await uploadsApi.getPresignedUrl(filename, file.type);
      await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      const photoUrl = uploadsApi.getUrl(key);
      setPhotos(prev => [...prev, photoUrl]);
      toast.success('Photo uploaded');
    } catch {
      toast.error('Photo upload failed');
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleAddMaterial = () => {
    setMaterials(prev => [...prev, { id: crypto.randomUUID(), name: '', quantity: 1, cost: 0 }]);
  };

  const handleAddFromCatalog = (part: CatalogPart) => {
    setMaterials(prev => [...prev, {
      id: crypto.randomUUID(),
      name: part.name,
      quantity: 1,
      cost: part.sellPrice ?? part.defaultCost,
    }]);
    setPartSearch('');
    setShowPartPicker(false);
    toast.success(`Added: ${part.name}`);
  };

  const handleRemoveMaterial = (mid: string) => {
    setMaterials(prev => prev.filter(m => m.id !== mid));
  };

  const handleDownloadInvoice = () => {
    const doc = generateInvoicePDF(job, materials, timeEntries);
    doc.save(`Invoice-${job.id.slice(-8).toUpperCase()}.pdf`);
    setInvoiceGenerated(true);
    toast.success('Invoice downloaded');
  };

  const handleFinishJob = async () => {
    setSaving(true);
    try {
      await updateJob(job.id, {
        status: 'REVIEW',
        materials,
        photos,
        siteNotes,
        laborHours: parseFloat(msToHours(workedMs).toFixed(2)),
        timeLog: timeEntries,
      });
      localStorage.removeItem(`wirez_timer_${job.id}`);
      toast.success('Job submitted for review');
    } catch {
      toast.error('Failed to submit job');
    }
    setSaving(false);
  };

  // ── Computed values ──────────────────────────────────────────
  const materialsCost = materials.reduce((sum, m) => sum + m.cost * m.quantity, 0);
  const hourlyRate = job.hourlyRate ?? 95;
  const laborCost = msToHours(workedMs) * hourlyRate;
  const subtotal = laborCost + materialsCost;
  const total = subtotal * 1.1;

  const filteredCatalog = partsCatalog.filter(p =>
    p.name.toLowerCase().includes(partSearch.toLowerCase()) ||
    (p.category ?? '').toLowerCase().includes(partSearch.toLowerCase())
  );

  const mapsUrl = `https://maps.google.com/maps?q=${encodeURIComponent(job.propertyAddress)}`;

  const statusColour: Record<string, string> = {
    INTAKE: 'bg-slate-100 text-slate-700',
    SCHEDULING: 'bg-blue-100 text-blue-700',
    DISPATCHED: 'bg-amber-100 text-amber-700',
    EXECUTION: 'bg-green-100 text-green-700',
    REVIEW: 'bg-purple-100 text-purple-700',
    CLOSED: 'bg-slate-200 text-slate-600',
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-[calc(100vh-120px)] bg-slate-50">

      {/* ── Job header ── */}
      <div className="bg-[#1a1a2e] text-white px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide',
                statusColour[job.status] ?? 'bg-slate-100 text-slate-700')}>
                {job.status}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">{job.id.slice(-8)}</span>
            </div>
            <h1 className="text-sm font-bold leading-snug line-clamp-2">{job.title}</h1>
            <div className="flex items-center gap-1 mt-1 text-slate-300 text-xs">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{job.propertyAddress}</span>
            </div>
          </div>
          {/* Navigate button */}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 flex flex-col items-center gap-0.5 bg-amber-500 hover:bg-amber-400 text-white rounded-xl px-3 py-2 text-[10px] font-bold transition-colors"
          >
            <Navigation className="w-5 h-5" />
            Navigate
          </a>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="bg-white border-b border-slate-200 flex overflow-x-auto no-scrollbar">
        {([
          { key: 'overview', label: 'Overview', icon: FileText },
          { key: 'clock', label: 'Time', icon: Clock },
          { key: 'materials', label: 'Materials', icon: Package },
          { key: 'photos', label: 'Photos', icon: Camera },
          { key: 'invoice', label: 'Invoice', icon: DollarSign },
        ] as { key: ActiveTab; label: string; icon: React.ElementType }[]).map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-4 py-2.5 text-[10px] font-semibold whitespace-nowrap flex-shrink-0 border-b-2 transition-colors',
                isActive
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-auto p-4 space-y-4">

        {/* ════ OVERVIEW ════ */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Tenant details */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-3">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Tenant / Client</h2>
              <div className="space-y-2">
                <p className="font-semibold text-slate-800">{job.tenantName || 'Unknown'}</p>
                {job.tenantPhone && (
                  <a href={`tel:${job.tenantPhone}`} className="flex items-center gap-2 text-amber-600 text-sm font-medium">
                    📞 {job.tenantPhone}
                  </a>
                )}
                {job.tenantEmail && (
                  <a href={`mailto:${job.tenantEmail}`} className="flex items-center gap-2 text-amber-600 text-sm">
                    ✉️ {job.tenantEmail}
                  </a>
                )}
              </div>
            </div>

            {/* Property */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-3">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Property</h2>
              <p className="text-slate-800 text-sm">{job.propertyAddress}</p>
              {job.accessCodes && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Access Codes</p>
                  <p className="text-sm text-amber-900 font-mono">{job.accessCodes}</p>
                </div>
              )}
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-[#1a1a2e] text-white rounded-xl py-3 text-sm font-bold"
              >
                <Navigation className="w-4 h-4" />
                Open in Google Maps
              </a>
            </div>

            {/* Job description */}
            {job.description && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-2">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Work Description</h2>
                <p className="text-sm text-slate-700 whitespace-pre-line">{job.description}</p>
              </div>
            )}

            {/* Scheduled date */}
            {job.scheduledDate && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Scheduled</h2>
                <p className="text-sm text-slate-800">
                  {new Date(job.scheduledDate).toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            )}

            {/* Quick clock-on shortcut if not started */}
            {clockStatus === 'idle' && (
              <button
                onClick={() => { setActiveTab('clock'); addTimeEntry('clock_on'); }}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl py-4 font-bold text-base flex items-center justify-center gap-2 shadow-lg"
              >
                <Play className="w-5 h-5" />
                Clock On — Start Job
              </button>
            )}
            {clockStatus === 'working' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                <p className="text-xs text-emerald-600 font-bold uppercase tracking-wide mb-1">Currently Working</p>
                <p className="text-3xl font-mono font-black text-emerald-700">{formatDuration(workedMs)}</p>
              </div>
            )}
          </div>
        )}

        {/* ════ CLOCK ════ */}
        {activeTab === 'clock' && (
          <div className="space-y-4">
            {/* Live timer display */}
            <div className={cn(
              'rounded-2xl p-6 text-center shadow-sm border',
              clockStatus === 'working' ? 'bg-emerald-50 border-emerald-200' :
              clockStatus === 'on_break' ? 'bg-amber-50 border-amber-200' :
              clockStatus === 'clocked_off' ? 'bg-slate-100 border-slate-200' :
              'bg-white border-slate-100'
            )}>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">
                {clockStatus === 'working' ? '⏱ On Site' :
                 clockStatus === 'on_break' ? '☕ On Break' :
                 clockStatus === 'clocked_off' ? '✅ Job Complete' : 'Ready to Start'}
              </p>
              <p className={cn(
                'text-5xl font-mono font-black',
                clockStatus === 'working' ? 'text-emerald-700' :
                clockStatus === 'on_break' ? 'text-amber-600' :
                'text-slate-600'
              )}>
                {formatDuration(workedMs)}
              </p>
              {breakMs > 0 && (
                <p className="text-xs text-slate-400 mt-2">Break: {formatDuration(breakMs)}</p>
              )}
              <p className="text-xs text-slate-400 mt-1">
                ≈ {msToHours(workedMs).toFixed(2)} hrs @ ${hourlyRate}/hr = ${(msToHours(workedMs) * hourlyRate).toFixed(2)}
              </p>
            </div>

            {/* Clock controls */}
            <div className="grid grid-cols-2 gap-3">
              {clockStatus === 'idle' && (
                <button
                  onClick={() => addTimeEntry('clock_on')}
                  className="col-span-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl py-5 font-bold text-lg flex items-center justify-center gap-2 shadow"
                >
                  <Play className="w-6 h-6" /> Clock On
                </button>
              )}
              {clockStatus === 'working' && (
                <>
                  <button
                    onClick={() => addTimeEntry('break_start')}
                    className="bg-amber-500 hover:bg-amber-600 text-white rounded-2xl py-4 font-bold flex items-center justify-center gap-2"
                  >
                    <Coffee className="w-5 h-5" /> Break
                  </button>
                  <button
                    onClick={() => addTimeEntry('clock_off')}
                    className="bg-rose-500 hover:bg-rose-600 text-white rounded-2xl py-4 font-bold flex items-center justify-center gap-2"
                  >
                    <Square className="w-5 h-5" /> Clock Off
                  </button>
                </>
              )}
              {clockStatus === 'on_break' && (
                <button
                  onClick={() => addTimeEntry('break_end')}
                  className="col-span-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl py-5 font-bold text-lg flex items-center justify-center gap-2"
                >
                  <Play className="w-6 h-6" /> Back on Site
                </button>
              )}
              {clockStatus === 'clocked_off' && (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="col-span-2 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-2xl py-4 font-semibold text-sm flex items-center justify-center gap-2"
                >
                  <AlertCircle className="w-4 h-4" /> Reset Timer
                </button>
              )}
            </div>

            {/* Time log */}
            {timeEntries.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-50">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Time Log</p>
                </div>
                <div className="divide-y divide-slate-50">
                  {timeEntries.map((entry, i) => {
                    const labels: Record<TimeEntry['type'], string> = {
                      clock_on: '▶ Clocked On',
                      break_start: '☕ Break Start',
                      break_end: '▶ Break End',
                      clock_off: '■ Clocked Off',
                    };
                    return (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-sm text-slate-700">{labels[entry.type]}</span>
                        <span className="text-xs text-slate-400 font-mono">
                          {new Date(entry.timestamp).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reset confirm modal */}
            {showClearConfirm && (
              <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                  <h3 className="font-bold text-slate-800 mb-2">Reset Timer?</h3>
                  <p className="text-sm text-slate-500 mb-5">This will clear all time entries for this job. Are you sure?</p>
                  <div className="flex gap-3">
                    <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm">Cancel</button>
                    <button
                      onClick={() => {
                        setTimeEntries([]);
                        setShowClearConfirm(false);
                        toast('Timer reset');
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white font-bold text-sm"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════ MATERIALS ════ */}
        {activeTab === 'materials' && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-[#1a1a2e] text-white rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Materials Total</p>
                <p className="text-2xl font-black text-amber-400">${materialsCost.toFixed(2)}</p>
              </div>
              <Package className="w-8 h-8 text-slate-600" />
            </div>

            {/* Add buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowPartPicker(!showPartPicker)}
                className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-3 font-bold text-sm"
              >
                <Search className="w-4 h-4" /> Catalogue
              </button>
              <button
                onClick={handleAddMaterial}
                className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl py-3 font-bold text-sm"
              >
                <Plus className="w-4 h-4" /> Manual
              </button>
            </div>

            {/* Catalogue picker */}
            {showPartPicker && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow overflow-hidden">
                <div className="p-3 border-b border-slate-100 flex items-center gap-2">
                  <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <input
                    autoFocus
                    placeholder="Search parts catalogue…"
                    value={partSearch}
                    onChange={e => setPartSearch(e.target.value)}
                    className="flex-1 text-sm outline-none text-slate-700 placeholder-slate-400"
                  />
                  <button onClick={() => { setShowPartPicker(false); setPartSearch(''); }}>
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
                  {filteredCatalog.length === 0 ? (
                    <p className="text-center text-slate-400 text-sm py-6">No parts found</p>
                  ) : filteredCatalog.slice(0, 40).map(part => (
                    <button
                      key={part.id}
                      onClick={() => handleAddFromCatalog(part)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 text-left"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">{part.name}</p>
                        {part.category && <p className="text-xs text-slate-400">{part.category}</p>}
                      </div>
                      <span className="text-sm font-bold text-amber-600">
                        ${(part.sellPrice ?? part.defaultCost).toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Materials list */}
            {materials.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                No materials added yet
              </div>
            ) : (
              <div className="space-y-2">
                {materials.map(m => (
                  <div key={m.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0 space-y-2">
                        <input
                          placeholder="Part / material name"
                          value={m.name}
                          onChange={e => setMaterials(prev => prev.map(x => x.id === m.id ? { ...x, name: e.target.value } : x))}
                          className="w-full text-sm font-medium text-slate-800 bg-transparent outline-none border-b border-slate-100 pb-1"
                        />
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-400">Qty</span>
                            <input
                              type="number"
                              min={1}
                              value={m.quantity}
                              onChange={e => setMaterials(prev => prev.map(x => x.id === m.id ? { ...x, quantity: Number(e.target.value) } : x))}
                              className="w-14 text-sm font-bold text-slate-700 bg-slate-50 rounded-lg px-2 py-1 text-center outline-none"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-400">$</span>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={m.cost}
                              onChange={e => setMaterials(prev => prev.map(x => x.id === m.id ? { ...x, cost: Number(e.target.value) } : x))}
                              className="w-20 text-sm font-bold text-slate-700 bg-slate-50 rounded-lg px-2 py-1 text-center outline-none"
                            />
                          </div>
                          <span className="text-xs text-slate-400 ml-auto">
                            = ${(m.cost * m.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => handleRemoveMaterial(m.id)} className="p-1 text-rose-400 hover:text-rose-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-[#1a1a2e] text-white rounded-2xl py-3.5 font-bold text-sm disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Materials'}
            </button>
          </div>
        )}

        {/* ════ PHOTOS ════ */}
        {activeTab === 'photos' && (
          <div className="space-y-4">
            {/* Upload button */}
            <label className={cn(
              'flex flex-col items-center justify-center w-full border-2 border-dashed rounded-2xl py-8 cursor-pointer transition-colors',
              uploading ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white hover:border-amber-400'
            )}>
              {uploading ? (
                <>
                  <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-2" />
                  <p className="text-sm text-amber-600 font-semibold">Uploading…</p>
                </>
              ) : (
                <>
                  <Camera className="w-8 h-8 text-slate-400 mb-2" />
                  <p className="text-sm font-semibold text-slate-600">Tap to take or upload photo</p>
                  <p className="text-xs text-slate-400 mt-1">JPG, PNG, HEIC supported</p>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={uploading}
              />
            </label>

            {/* Photo grid */}
            {photos.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-4">No photos yet</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {photos.map((url, i) => (
                  <div key={i} className="relative group rounded-xl overflow-hidden aspect-square bg-slate-100">
                    <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-2 right-2 bg-rose-500 text-white rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[10px] py-1 px-2">
                      Photo {i + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Site notes */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Site Notes</label>
              <textarea
                rows={4}
                placeholder="Document any hazards, access issues, work completed…"
                value={siteNotes}
                onChange={e => setSiteNotes(e.target.value)}
                className="w-full text-sm text-slate-700 bg-slate-50 rounded-xl p-3 outline-none resize-none focus:ring-2 ring-amber-300"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-[#1a1a2e] text-white rounded-2xl py-3.5 font-bold text-sm disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}

        {/* ════ INVOICE ════ */}
        {activeTab === 'invoice' && (
          <div className="space-y-4">
            {/* Summary card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="bg-[#1a1a2e] px-4 py-3">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Invoice Summary</p>
              </div>
              <div className="divide-y divide-slate-50">
                <div className="flex justify-between px-4 py-3">
                  <span className="text-sm text-slate-600">Labour ({msToHours(workedMs).toFixed(2)} hrs @ ${hourlyRate}/hr)</span>
                  <span className="text-sm font-bold text-slate-800">${laborCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-sm text-slate-600">Materials ({materials.length} items)</span>
                  <span className="text-sm font-bold text-slate-800">${materialsCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-sm text-slate-600">Subtotal (ex. GST)</span>
                  <span className="text-sm font-bold text-slate-800">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-sm text-slate-600">GST (10%)</span>
                  <span className="text-sm font-bold text-slate-800">${(subtotal * 0.1).toFixed(2)}</span>
                </div>
                <div className="flex justify-between px-4 py-3 bg-slate-50">
                  <span className="text-base font-bold text-slate-800">TOTAL DUE</span>
                  <span className="text-base font-black text-amber-600">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Materials preview */}
            {materials.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-50">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Materials</p>
                </div>
                <div className="divide-y divide-slate-50">
                  {materials.map(m => (
                    <div key={m.id} className="flex justify-between px-4 py-2.5">
                      <span className="text-sm text-slate-700">{m.name || '—'} ×{m.quantity}</span>
                      <span className="text-sm font-bold text-slate-800">${(m.cost * m.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Download Invoice */}
            <button
              onClick={handleDownloadInvoice}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-2xl py-4 font-bold text-base flex items-center justify-center gap-2 shadow"
            >
              <FileText className="w-5 h-5" />
              Download Invoice PDF
            </button>

            {/* Finish Job */}
            {job.status !== 'REVIEW' && job.status !== 'CLOSED' && clockStatus === 'clocked_off' && (
              <button
                onClick={handleFinishJob}
                disabled={saving}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl py-4 font-bold text-base flex items-center justify-center gap-2 shadow disabled:opacity-50"
              >
                <CheckCircle2 className="w-5 h-5" />
                {saving ? 'Submitting…' : 'Submit Job for Review'}
              </button>
            )}

            {(job.status === 'REVIEW' || job.status === 'CLOSED') && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                <p className="font-bold text-emerald-700">Job Submitted</p>
                <p className="text-xs text-emerald-600 mt-1">Admin has been notified for review</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
