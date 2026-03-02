import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Job, Material, TimeEntry, CatalogPart, SmokeAlarmEntry } from '../types';
import { MapPin, Clock, Camera, Plus, Trash2, CheckCircle2, FileText, ArrowLeft, Navigation, Play, Square, Coffee, Package, Search, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGpsTracking } from '../hooks/useGpsTracking';
import { cn } from '../utils';
import { storage } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import jsPDF from 'jspdf';
import { Html5Qrcode } from 'html5-qrcode';

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
  const [showBarcodeScan, setShowBarcodeScan] = useState(false);
  const [barcodeValue, setBarcodeValue] = useState('');
  const [barcodePartName, setBarcodePartName] = useState('');
  const [barcodePrice, setBarcodePrice] = useState('');
  const [barcodeSupplier, setBarcodeSupplier] = useState('Rexel');
  const [barcodeSaving, setBarcodeSaving] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'barcode-scanner-region';

  // SA Compliance: load alarm data from this job or propagate from previous SA job at same address
  const [saAlarms, setSaAlarms] = useState<SmokeAlarmEntry[]>(() => {
    if (job?.smokeAlarms?.length) return job.smokeAlarms;
    // Propagate from most recent closed SA job at same address
    if (job?.type === 'SMOKE_ALARM' && job?.propertyAddress) {
      const prev = jobs
        .filter(j => j.id !== job.id && j.type === 'SMOKE_ALARM' && j.propertyAddress === job.propertyAddress && j.smokeAlarms?.length)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      if (prev?.smokeAlarms) {
        return prev.smokeAlarms.map(a => ({
          ...a,
          id: Math.random().toString(36).substr(2, 9),
          installReason: 'Existing - Compliant',
        }));
      }
    }
    return [];
  });
  const [saSmokeTick, setSaSmokeTick] = useState<boolean>(job?.complianceSmokeAlarmsTick ?? true);
  const [saSafetyTick, setSaSafetyTick] = useState<boolean>(job?.complianceSafetySwitchTick ?? true);
  const [saComments, setSaComments] = useState(job?.complianceNotes || '');
  const [saComments2, setSaComments2] = useState(job?.complianceNotes2 || '');

  if (!job) {
    return <div className="p-8 text-center text-slate-500">Job not found.</div>;
  }

  const handleAddMaterial = () => {
    setMaterials([...materials, { id: Math.random().toString(36).substr(2, 9), name: '', quantity: 1, cost: 0 }]);
  };

  const handleBarcodeSave = async () => {
    if (!barcodePartName.trim() || !barcodePrice) return;
    setBarcodeSaving(true);
    const price = parseFloat(barcodePrice);
    try {
      await fetch('/api/xero/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{
            partName: barcodePartName.trim(),
            supplier: barcodeSupplier,
            costPrice: price,
            barcode: barcodeValue || undefined,
            source: 'barcode',
          }],
        }),
      });
    } catch { /* pricing save is best-effort */ }
    // Also add to job materials
    setMaterials(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      name: barcodePartName.trim(),
      quantity: 1,
      cost: price,
    }]);
    setBarcodeValue('');
    setBarcodePartName('');
    setBarcodePrice('');
    setShowBarcodeScan(false);
    setBarcodeSaving(false);
  };

  const stopBarcodeScanner = useCallback(async () => {
    try {
      if (scannerRef.current) {
        const state = scannerRef.current.getState();
        if (state === 2) { // SCANNING
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch { /* safe to ignore cleanup errors */ }
    setScannerActive(false);
  }, []);

  const startBarcodeScanner = useCallback(async () => {
    await stopBarcodeScanner();
    // Small delay to let DOM render the container
    await new Promise(r => setTimeout(r, 200));
    const el = document.getElementById(scannerContainerId);
    if (!el) return;

    try {
      const scanner = new Html5Qrcode(scannerContainerId);
      scannerRef.current = scanner;
      setScannerActive(true);

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 280, height: 120 },
          aspectRatio: 2.0,
          disableFlip: false,
        },
        (decodedText) => {
          // Barcode decoded successfully — populate the field and stop scanner
          setBarcodeValue(decodedText);
          scanner.stop().then(() => {
            scanner.clear();
            scannerRef.current = null;
            setScannerActive(false);
          }).catch(() => { setScannerActive(false); });
        },
        () => { /* ignore QR scan errors (no code in frame) */ }
      );
    } catch (err) {
      console.warn('[BarcodeScanner] Failed to start:', err);
      setScannerActive(false);
    }
  }, [stopBarcodeScanner]);

  // Cleanup scanner when barcode panel closes
  useEffect(() => {
    if (!showBarcodeScan) {
      stopBarcodeScanner();
    }
  }, [showBarcodeScan, stopBarcodeScanner]);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => { stopBarcodeScanner(); };
  }, [stopBarcodeScanner]);

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
  const [finishingJob, setFinishingJob] = useState(false);

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

  // ─── Completion Checklist ───
  const [showChecklist, setShowChecklist] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  const getChecklistItems = () => {
    const finalMs = calcWorkedMs(timeEntries);
    const laborHours = parseFloat(formatHoursDecimal(finalMs));
    return [
      { id: 'clocked_off', label: 'Clocked off', passed: clockStatus === 'clocked_off', required: true },
      { id: 'hours_recorded', label: `Hours recorded (${laborHours > 0 ? laborHours + 'h' : 'none'})`, passed: laborHours > 0, required: true },
      { id: 'photos_added', label: `Photos added (${photos.length})`, passed: photos.length > 0, required: false },
      { id: 'materials_listed', label: `Parts/materials listed (${materials.length})`, passed: materials.length > 0, required: false },
      { id: 'site_notes', label: 'Site notes entered', passed: siteNotes.trim().length > 0, required: false },
      { id: 'all_working', label: 'Confirmed everything tested & working', passed: true, required: false },
    ];
  };

  const handleSubmitAttempt = () => {
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
    setShowChecklist(true);
  };

  const handleConfirmSubmit = (force: boolean) => {
    const finalMs = calcWorkedMs(timeEntries);
    const laborHours = parseFloat(formatHoursDecimal(finalMs));
    const items = getChecklistItems();
    const hasFails = items.some(i => !i.passed);

    if (hasFails && !force) return;

    updateJob(job.id, {
      laborHours,
      timeLog: timeEntries,
      materials,
      photos,
      siteNotes,
      status: 'REVIEW',
      ...(force && overrideReason ? { completionOverrideReason: overrideReason } as any : {}),
    });

    clearTimerState(job.id);
    setShowChecklist(false);
    alert("Job submitted successfully! The office has been notified.");
    navigate('/');
  };

  // ─── Field Invoice Generator ───
  const handleGenerateInvoice = () => {
    const doc = new jsPDF();
    const rate = job.hourlyRate || 120;
    const labor = job.laborHours || parseFloat(formatHoursDecimal(calcWorkedMs(timeEntries)));
    const laborCost = labor * rate;
    const matsList = job.materials?.length ? job.materials : materials;
    const matsCost = matsList.reduce((s, m) => s + m.cost * m.quantity, 0);
    const miscTotal = (job.miscCharges || []).reduce((s, c) => s + c.amount, 0);
    const total = laborCost + matsCost + miscTotal;
    const invDate = new Date().toLocaleDateString('en-AU');
    const invNo = `INV-${job.id.slice(0, 8).toUpperCase()}`;

    // Header
    doc.setFillColor(23, 37, 84);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("TAX INVOICE", 20, 22);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Wirez R Us Electrical Services", 20, 30);
    doc.setFontSize(8);
    doc.text(invNo, 170, 14);
    doc.text(`Date: ${invDate}`, 170, 20);

    // Bill To
    doc.setTextColor(0, 0, 0);
    let y = 48;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", 20, y);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    y += 8;
    doc.text(job.tenantName || 'Customer', 20, y);
    y += 6;
    doc.text(job.propertyAddress || '', 20, y);
    if (job.tenantEmail) { y += 6; doc.text(job.tenantEmail, 20, y); }
    if (job.tenantPhone) { y += 6; doc.text(job.tenantPhone, 20, y); }

    // Job ref
    doc.setFont("helvetica", "bold");
    doc.text("Job Reference:", 130, 48);
    doc.setFont("helvetica", "normal");
    doc.text(job.id, 130, 56);
    doc.text(job.title || '', 130, 62);
    doc.text(job.type.replace(/_/g, ' '), 130, 68);

    // Line items table
    y += 16;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Service Details", 20, y);
    doc.setDrawColor(200, 200, 200);
    doc.line(20, y + 3, 190, y + 3);
    y += 10;

    // Table header
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(240, 240, 240);
    doc.rect(20, y - 4, 170, 8, 'F');
    doc.text("Description", 22, y);
    doc.text("Qty", 120, y);
    doc.text("Unit Price", 140, y);
    doc.text("Total", 170, y);
    y += 7;

    // Labour line
    doc.setFont("helvetica", "normal");
    doc.text(`Labour (${labor.toFixed(1)} hrs @ $${rate}/hr)`, 22, y);
    doc.text(labor.toFixed(1), 120, y);
    doc.text(`$${rate.toFixed(2)}`, 140, y);
    doc.text(`$${laborCost.toFixed(2)}`, 170, y);
    y += 7;

    // Materials
    matsList.forEach(m => {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.text((m.name || 'Material').substring(0, 40), 22, y);
      doc.text(m.quantity.toString(), 120, y);
      doc.text(`$${m.cost.toFixed(2)}`, 140, y);
      doc.text(`$${(m.cost * m.quantity).toFixed(2)}`, 170, y);
      y += 7;
    });

    // Misc charges
    (job.miscCharges || []).forEach(c => {
      doc.text(c.description.substring(0, 40), 22, y);
      doc.text('1', 120, y);
      doc.text(`$${c.amount.toFixed(2)}`, 140, y);
      doc.text(`$${c.amount.toFixed(2)}`, 170, y);
      y += 7;
    });

    // Total
    y += 5;
    doc.line(130, y, 190, y);
    y += 8;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL (inc GST):", 130, y);
    doc.text(`$${total.toFixed(2)}`, 170, y);

    // Payment info
    y += 16;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Payment Terms: Due on completion", 20, y);
    y += 6;
    if (job.paymentLinkUrl) {
      doc.text(`Online Payment: ${job.paymentLinkUrl}`, 20, y);
      y += 6;
    }
    doc.text("Bank: Wirez R Us Electrical | BSB: XXX-XXX | Acc: XXXXXXXX", 20, y);

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text("Wirez R Us Electrical Services | ABN: XX XXX XXX XXX | Ph: 1300 WIREZ US | jobs@wireznrus.com.au", 105, 285, { align: "center" });

    doc.save(`Invoice_${job.id}.pdf`);
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
                  {showBarcodeScan ? (
                    <div className="space-y-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                          <Camera className="w-4 h-4" /> Scan Barcode + Log Price
                        </h4>
                        <button onClick={() => setShowBarcodeScan(false)} className="px-3 py-1.5 text-xs font-semibold text-emerald-600 bg-white border border-emerald-200 rounded-lg active:scale-95">Close</button>
                      </div>

                      {/* Camera scanner region */}
                      <div className="rounded-xl overflow-hidden border-2 border-emerald-300 bg-black relative" style={{ minHeight: 180 }}>
                        <div id={scannerContainerId} style={{ width: '100%' }} />
                        {!scannerActive && !barcodeValue && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 gap-3">
                            <Camera className="w-10 h-10 text-white/60" />
                            <button
                              onClick={startBarcodeScanner}
                              className="px-6 py-3 bg-emerald-500 text-white rounded-xl text-sm font-bold active:scale-95 transition-transform shadow-lg"
                            >
                              Start Camera Scan
                            </button>
                          </div>
                        )}
                        {scannerActive && (
                          <div className="absolute bottom-2 left-0 right-0 text-center">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-black/60 text-emerald-300 rounded-full text-xs font-semibold">
                              <Loader2 className="w-3 h-3 animate-spin" /> Point at barcode...
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Scanned value or manual entry */}
                      <div>
                        <label className="block text-xs font-semibold text-emerald-700 mb-1">Barcode / EAN</label>
                        <div className="flex gap-2">
                          <input type="text" placeholder="Scanned automatically or type" value={barcodeValue} onChange={e => setBarcodeValue(e.target.value)}
                            className={cn(
                              'flex-1 px-4 py-3 border-2 rounded-xl text-base bg-white',
                              barcodeValue ? 'border-emerald-400 text-emerald-800 font-bold' : 'border-emerald-200'
                            )} />
                          {barcodeValue && (
                            <button onClick={() => { setBarcodeValue(''); startBarcodeScanner(); }}
                              className="px-3 py-2 bg-white border-2 border-emerald-200 rounded-xl text-xs font-semibold text-emerald-600 active:scale-95"
                              title="Rescan">Rescan</button>
                          )}
                          {!scannerActive && !barcodeValue && (
                            <button onClick={startBarcodeScanner}
                              className="px-3 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold active:scale-95"
                              title="Scan">Scan</button>
                          )}
                          {scannerActive && (
                            <button onClick={stopBarcodeScanner}
                              className="px-3 py-2 bg-red-500 text-white rounded-xl text-xs font-bold active:scale-95"
                              title="Stop camera">Stop</button>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-emerald-700 mb-1">Part Name / Description</label>
                        <input type="text" placeholder="e.g. Clipsal 30M 10A Switch" value={barcodePartName} onChange={e => setBarcodePartName(e.target.value)}
                          className="w-full px-4 py-3.5 border-2 border-emerald-200 rounded-xl text-base bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-emerald-700 mb-1">Cost Price (ex GST)</label>
                          <input type="number" placeholder="$0.00" value={barcodePrice} onChange={e => setBarcodePrice(e.target.value)} step="0.01"
                            className="w-full px-4 py-3.5 border-2 border-emerald-200 rounded-xl text-base bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-emerald-700 mb-1">Supplier</label>
                          <select title="Supplier" value={barcodeSupplier} onChange={e => setBarcodeSupplier(e.target.value)}
                            className="w-full px-4 py-3.5 border-2 border-emerald-200 rounded-xl text-base bg-white">
                            <option value="Rexel">Rexel</option>
                            <option value="Middy's">Middy's</option>
                            <option value="L&H">L&H</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>
                      <button onClick={handleBarcodeSave} disabled={!barcodePartName.trim() || !barcodePrice || barcodeSaving}
                        className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-base font-bold disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-md">
                        {barcodeSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                        {barcodeSaving ? 'Saving...' : 'Add to Job + Price Catalog'}
                      </button>
                    </div>
                  ) : !showPartPicker ? (
                    <div className="space-y-2">
                      {/* Primary: Scan barcode — biggest button */}
                      <button
                        onClick={() => setShowBarcodeScan(true)}
                        className="w-full py-4 bg-emerald-500 text-white rounded-2xl text-base font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-sm"
                      >
                        <Search className="w-5 h-5" /> Scan Barcode + Log Price
                      </button>
                      <div className="flex gap-2">
                        {partsCatalog.length > 0 && (
                          <button
                            onClick={() => setShowPartPicker(true)}
                            className="flex-1 py-3.5 bg-amber-50 border-2 border-amber-200 text-amber-700 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
                          >
                            <Package className="w-4 h-4" /> From Catalog
                          </button>
                        )}
                        <button
                          onClick={handleAddMaterial}
                          className="flex-1 py-3.5 bg-slate-50 border-2 border-slate-200 text-slate-600 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
                        >
                          <Plus className="w-4 h-4" /> Custom Item
                        </button>
                      </div>
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

            {/* ════════ SA COMPLIANCE FORM (Smoke Alarm jobs only) ════════ */}
            {job.type === 'SMOKE_ALARM' && job.status === 'EXECUTION' && (
              <div className="bg-white rounded-2xl border-2 border-red-400 shadow-sm overflow-hidden">
                {/* Red/Yellow header matching template */}
                <div className="bg-yellow-400 px-5 py-3">
                  <h3 className="text-lg font-black text-red-700 tracking-wide">COMPLIANCE REPORT</h3>
                </div>

                <div className="p-5 space-y-4">
                  {/* ── Tick / Cross compliance boxes ── */}
                  <div className="space-y-3">
                    <div className={cn(
                      'p-3 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition-colors',
                      saSmokeTick ? 'bg-yellow-50 border-yellow-400' : 'bg-red-50 border-red-300'
                    )} onClick={() => setSaSmokeTick(!saSmokeTick)}>
                      <span className="text-lg">{saSmokeTick ? '✅' : '❌'}</span>
                      <span className="text-sm font-semibold text-slate-800">
                        On the Inspection Date smoke alarms were present and tested.
                      </span>
                    </div>
                    <div className={cn(
                      'p-3 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition-colors',
                      saSafetyTick ? 'bg-yellow-50 border-yellow-400' : 'bg-red-50 border-red-300'
                    )} onClick={() => setSaSafetyTick(!saSafetyTick)}>
                      <span className="text-lg">{saSafetyTick ? '✅' : '❌'}</span>
                      <span className="text-sm font-semibold text-slate-800">
                        On the Inspection Date a Safety Switch was present and tested.
                      </span>
                    </div>
                  </div>

                  {/* ── Comments ── */}
                  <div>
                    <label className="block text-xs font-bold text-red-700 mb-1 uppercase tracking-wider">Comments</label>
                    <textarea
                      value={saComments}
                      onChange={e => setSaComments(e.target.value)}
                      placeholder="Any comments about the inspection..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm min-h-[60px]"
                    />
                  </div>

                  {/* ── SMOKE ALARMS table ── */}
                  <div>
                    <label className="block text-xs font-bold text-red-700 mb-1 uppercase tracking-wider">Smoke Alarms</label>
                    <p className="text-[10px] text-slate-500 mb-2">At this inspection, the following alarms were present or installed.</p>

                    <div className="space-y-3">
                      {saAlarms.map((alarm, idx) => (
                        <div key={alarm.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-600">Alarm #{idx + 1}</span>
                            <button
                              title="Remove alarm"
                              onClick={() => setSaAlarms(prev => prev.filter(a => a.id !== alarm.id))}
                              className="text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[10px] font-semibold text-slate-500 uppercase">Voltage</span>
                              <select
                                title="Voltage"
                                value={alarm.voltage}
                                onChange={e => setSaAlarms(prev => prev.map(a => a.id === alarm.id ? { ...a, voltage: e.target.value as any } : a))}
                                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white mt-0.5"
                              >
                                <option value="240V">240V</option>
                                <option value="9V">9V</option>
                                <option value="10yr Lithium">10yr Lithium</option>
                                <option value="unknown">Unknown</option>
                              </select>
                            </div>
                            <div>
                              <span className="text-[10px] font-semibold text-slate-500 uppercase">Type</span>
                              <select
                                title="Alarm type"
                                value={alarm.type}
                                onChange={e => setSaAlarms(prev => prev.map(a => a.id === alarm.id ? { ...a, type: e.target.value as any } : a))}
                                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white mt-0.5"
                              >
                                <option value="Photoelectric">Photoelectric</option>
                                <option value="Ionisation">Ionisation</option>
                                <option value="Dual Sensor">Dual Sensor</option>
                                <option value="Heat">Heat</option>
                                <option value="unknown">Unknown</option>
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[10px] font-semibold text-slate-500 uppercase">Expires</span>
                              <input
                                type="text"
                                placeholder="e.g. 2030"
                                value={alarm.expires}
                                onChange={e => setSaAlarms(prev => prev.map(a => a.id === alarm.id ? { ...a, expires: e.target.value } : a))}
                                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white mt-0.5"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] font-semibold text-slate-500 uppercase">Level</span>
                              <input
                                type="text"
                                placeholder="e.g. Upper, Ground"
                                value={alarm.level}
                                onChange={e => setSaAlarms(prev => prev.map(a => a.id === alarm.id ? { ...a, level: e.target.value } : a))}
                                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white mt-0.5"
                              />
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-slate-500 uppercase">Location</span>
                            <input
                              type="text"
                              placeholder="e.g. Master Bedroom, Hallway"
                              value={alarm.location}
                              onChange={e => setSaAlarms(prev => prev.map(a => a.id === alarm.id ? { ...a, location: e.target.value } : a))}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white mt-0.5"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-slate-500 uppercase">Install Reason</span>
                            <select
                              title="Install reason"
                              value={alarm.installReason}
                              onChange={e => setSaAlarms(prev => prev.map(a => a.id === alarm.id ? { ...a, installReason: e.target.value } : a))}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white mt-0.5"
                            >
                              <option value="Existing - Compliant">Existing - Compliant</option>
                              <option value="Replacement">Replacement</option>
                              <option value="New Install">New Install</option>
                              <option value="Existing - Non Compliant">Existing - Non Compliant</option>
                              <option value="Existing - Faulty">Existing - Faulty</option>
                              <option value="Removed">Removed</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => setSaAlarms(prev => [...prev, {
                        id: Math.random().toString(36).substr(2, 9),
                        voltage: '240V',
                        type: 'Photoelectric',
                        expires: '',
                        location: '',
                        level: '',
                        installReason: 'Existing - Compliant',
                      }])}
                      className="w-full mt-3 py-2.5 border-2 border-dashed border-red-300 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> Add Alarm
                    </button>
                  </div>

                  {/* ── Bottom Comments ── */}
                  <div>
                    <label className="block text-xs font-bold text-red-700 mb-1 uppercase tracking-wider">Comments</label>
                    <textarea
                      value={saComments2}
                      onChange={e => setSaComments2(e.target.value)}
                      placeholder="Additional comments..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm min-h-[50px]"
                    />
                  </div>

                  {/* ── Save button ── */}
                  <button
                    onClick={() => {
                      updateJob(job.id, {
                        smokeAlarms: saAlarms,
                        complianceSmokeAlarmsTick: saSmokeTick,
                        complianceSafetySwitchTick: saSafetyTick,
                        complianceNotes: saComments,
                        complianceNotes2: saComments2,
                      } as any);
                      alert('✅ Compliance data saved');
                    }}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors"
                  >
                    Save Compliance Data ({saAlarms.length} alarm{saAlarms.length !== 1 ? 's' : ''})
                  </button>
                </div>
              </div>
            )}

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
              <>
                <button 
                  onClick={handleSubmitAttempt}
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

                {/* Pause / Finished for Today */}
                {clockStatus === 'clocked_off' && (
                  <button
                    onClick={() => {
                      const reason = prompt('Why are you pausing this job? (e.g. need to come back, waiting for parts)');
                      if (reason === null) return;
                      const finalMs = calcWorkedMs(timeEntries);
                      const laborHours = parseFloat(formatHoursDecimal(finalMs));
                      updateJob(job.id, {
                        status: 'SCHEDULING' as any,
                        materials,
                        photos,
                        siteNotes: (siteNotes ? siteNotes + '\n\n' : '') + `⏸️ Paused (${new Date().toLocaleDateString('en-AU')}): ${reason}`,
                        laborHours,
                        timeLog: timeEntries,
                        pausedAt: new Date().toISOString(),
                        pauseReason: reason,
                        needsReschedule: true,
                      } as any);
                      clearTimerState(job.id);
                      alert("Job paused — the office will reschedule. Your progress has been saved.");
                      navigate('/');
                    }}
                    className="w-full py-3 bg-amber-50 hover:bg-amber-100 border-2 border-amber-300 text-amber-800 rounded-2xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Coffee className="w-5 h-5" />
                    Finished for Today — Need to Come Back
                  </button>
                )}
              </>
            )}
            
            {job.status === 'REVIEW' && (
              <div className="space-y-3">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-center font-medium flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> Job submitted for Admin Review
                </div>

                {/* ── Finish Job: email to customer ── */}
                {!job.finishedJobEmailSent && (
                  <button
                    disabled={finishingJob}
                    onClick={async () => {
                      const recipientEmail = job.propertyManagerEmail || job.tenantEmail;
                      if (!recipientEmail) {
                        alert('No customer email on file — ask the office to add it.');
                        return;
                      }
                      const isSA = job.type === 'SMOKE_ALARM';
                      const docType = isSA ? 'Compliance Report' : 'Invoice';
                      if (!confirm(`Send ${docType} to ${recipientEmail}?`)) return;

                      setFinishingJob(true);
                      try {
                        const schedDate = job.scheduledDate ? new Date(job.scheduledDate) : new Date();
                        // Build a summary email
                        const totalMaterials = (job.materials || []).reduce((s, m) => s + m.cost * m.quantity, 0);
                        const laborCost = (job.laborHours || 0) * 120;
                        const total = laborCost + totalMaterials;

                        await fetch('/api/notifications/send-tenant', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            type: 'schedule_confirmation',
                            tenantEmail: recipientEmail,
                            tenantName: job.tenantName || 'Customer',
                            propertyAddress: job.propertyAddress || '',
                            scheduledDate: schedDate.toLocaleDateString('en-AU'),
                            scheduledTime: '',
                            jobId: job.id,
                            channels: ['email'],
                          }),
                        });

                        updateJob(job.id, {
                          finishedJobEmailSent: true,
                          finishedJobEmailSentAt: new Date().toISOString(),
                          finishedJobEmailTo: recipientEmail,
                          finishedJobDocType: isSA ? 'compliance_report' : 'invoice',
                        } as any);

                        alert(`✅ ${docType} emailed to ${recipientEmail}`);
                      } catch (err) {
                        console.error(err);
                        alert('Failed to send — check your connection and try again.');
                      } finally {
                        setFinishingJob(false);
                      }
                    }}
                    className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {finishingJob ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <FileText className="w-6 h-6" />
                    )}
                    {job.type === 'SMOKE_ALARM' ? 'Finish Job — Email Compliance Report' : 'Finish Job — Email Invoice to Customer'}
                  </button>
                )}

                {job.finishedJobEmailSent && (
                  <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl text-teal-800 text-center text-sm font-medium flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {job.type === 'SMOKE_ALARM' ? 'Compliance Report' : 'Invoice'} sent to {(job as any).finishedJobEmailTo || 'customer'}
                  </div>
                )}

                {/* ── Download Invoice PDF ── */}
                {job.type !== 'SMOKE_ALARM' && (
                  <button
                    onClick={handleGenerateInvoice}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-2xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <FileText className="w-5 h-5" />
                    Download Invoice PDF
                  </button>
                )}
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

      {/* ═══════════ COMPLETION CHECKLIST MODAL ═══════════ */}
      {showChecklist && (() => {
        const items = getChecklistItems();
        const allPassed = items.every(i => i.passed);
        const failCount = items.filter(i => !i.passed).length;
        const requiredFails = items.filter(i => i.required && !i.passed).length;

        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className={cn(
                'px-6 py-5',
                allPassed ? 'bg-emerald-50' : 'bg-amber-50'
              )}>
                <h3 className={cn(
                  'text-lg font-bold',
                  allPassed ? 'text-emerald-900' : 'text-amber-900'
                )}>
                  {allPassed ? '✅ Ready to Submit' : '⚠️ Completion Checklist'}
                </h3>
                <p className={cn(
                  'text-sm mt-1',
                  allPassed ? 'text-emerald-700' : 'text-amber-700'
                )}>
                  {allPassed
                    ? 'All checks passed. Ready to submit this job.'
                    : `${failCount} item${failCount > 1 ? 's' : ''} need attention before submitting.`}
                </p>
              </div>

              {/* Checklist items */}
              <div className="px-6 py-4 space-y-3 overflow-y-auto flex-1">
                {items.map(item => (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border transition-colors',
                      item.passed
                        ? 'bg-emerald-50 border-emerald-200'
                        : item.required
                          ? 'bg-red-50 border-red-200'
                          : 'bg-amber-50 border-amber-200'
                    )}
                  >
                    <div className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm font-bold',
                      item.passed
                        ? 'bg-emerald-500 text-white'
                        : item.required
                          ? 'bg-red-500 text-white'
                          : 'bg-amber-400 text-white'
                    )}>
                      {item.passed ? '✓' : item.required ? '✗' : '!'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={cn(
                        'text-sm font-semibold',
                        item.passed ? 'text-emerald-800' : item.required ? 'text-red-800' : 'text-amber-800'
                      )}>
                        {item.label}
                      </span>
                      {!item.passed && item.required && (
                        <p className="text-xs text-red-600 mt-0.5">Required — go back and complete this</p>
                      )}
                      {!item.passed && !item.required && (
                        <p className="text-xs text-amber-600 mt-0.5">Recommended — you can override if not needed</p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Override reason — only show if there are non-required fails */}
                {!allPassed && requiredFails === 0 && (
                  <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                      Override reason (optional)
                    </label>
                    <input
                      type="text"
                      value={overrideReason}
                      onChange={e => setOverrideReason(e.target.value)}
                      placeholder="e.g. No parts required for this job"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="px-6 py-4 border-t border-slate-200 space-y-2 bg-slate-50">
                {allPassed ? (
                  <button
                    onClick={() => handleConfirmSubmit(false)}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-base transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Submit Job
                  </button>
                ) : requiredFails > 0 ? (
                  <div className="text-center text-sm text-red-600 font-medium py-2">
                    Fix required items before submitting
                  </div>
                ) : (
                  <button
                    onClick={() => handleConfirmSubmit(true)}
                    className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-base transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Submit Anyway (Override)
                  </button>
                )}
                <button
                  onClick={() => { setShowChecklist(false); setOverrideReason(''); }}
                  className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-semibold text-sm transition-colors hover:bg-slate-100"
                >
                  Go Back & Fix
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
