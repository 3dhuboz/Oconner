import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Job, JobStatus, ContactAttempt, Electrician } from '../types';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import { PDFDocument, rgb } from 'pdf-lib';
import { 
  ArrowLeft, Phone, Mail, FileText, Calendar as CalendarIcon, 
  CheckCircle2, AlertCircle, Camera, Wrench, DollarSign, Send, Loader2, User,
  Download, Eye, X, MapPin, Trash2, ShieldAlert, Navigation
} from 'lucide-react';
import { cn } from '../utils';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface JobDetailProps {
  jobs: Job[];
  updateJob: (id: string, updates: Partial<Job>) => void;
  deleteJob: (id: string) => Promise<void>;
  electricians: Electrician[];
}

export function JobDetail({ jobs, updateJob, deleteJob, electricians }: JobDetailProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const job = jobs.find(j => j.id === id);
  
  const [newNote, setNewNote] = useState('');
  const [isSyncingXero, setIsSyncingXero] = useState(false);
  const [proposedEntryDate, setProposedEntryDate] = useState('');
  const [showRawEmail, setShowRawEmail] = useState(false);

  // ─── Delete confirmation state (multi-step) ───
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2 | 3>(0);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [resendingSms, setResendingSms] = useState(false);
  const [editingTenant, setEditingTenant] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);
  const isAdmin = user?.role === 'admin' || user?.role === 'dev';

  if (!job) {
    return <div>Job not found</div>;
  }

  const handleStatusChange = async (newStatus: JobStatus) => {
    if (newStatus === 'DISPATCHED') {
      const electrician = electricians.find(e => e.id === job.assignedElectricianId);
      if (!electrician) {
        toast.error('Please assign an electrician before dispatching.');
        return;
      }
      
      updateJob(job.id, { status: newStatus });
      
      try {
        const res = await fetch('/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: electrician.phone,
            message: `Wirez R Us Dispatch: New Job ${job.id} at ${job.propertyAddress}. Scheduled: ${job.scheduledDate ? format(new Date(job.scheduledDate), 'MMM d, h:mm a') : 'TBD'}. Open app: ${window.location.origin}/field/${job.id}`
          })
        });
        const data = await res.json();
        if (data.simulated) {
          toast.success(`Job dispatched — SMS simulated to ${electrician.name} (${electrician.phone})`);
        } else {
          toast.success(`Job dispatched — SMS sent to ${electrician.name}`);
        }
      } catch (e) {
        console.error(e);
        toast(`Job dispatched, but SMS notification failed`, { icon: '⚠️' });
      }
    } else {
      updateJob(job.id, { status: newStatus });
    }
  };

  const handleAddContactAttempt = (successful: boolean) => {
    const attempt: ContactAttempt = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      method: 'CALL',
      successful,
      notes: newNote || (successful ? 'Reached tenant' : 'No answer')
    };
    
    updateJob(job.id, { 
      contactAttempts: [...job.contactAttempts, attempt],
      status: successful ? 'SCHEDULING' : job.status
    });
    setNewNote('');
  };

  const handleGenerateForm9 = async () => {
    if (!proposedEntryDate) {
      toast.error('Please select a proposed entry date and time.');
      return;
    }

    try {
      // Call server-side endpoint to generate Form 9 PDF
      const response = await fetch('/api/form9/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantName: job.tenantName,
          propertyAddress: job.propertyAddress,
          tenantEmail: job.tenantEmail,
          propertyManagerEmail: job.propertyManagerEmail,
          proposedEntryDate,
          jobId: job.id
        })
      });

      if (!response.ok) {
        let errorMsg = 'Failed to generate Form 9';
        try {
          const error = await response.json();
          errorMsg = error.error || errorMsg;
        } catch {
          errorMsg = `Server returned status ${response.status}`;
        }
        throw new Error(errorMsg);
      }

      // Download the PDF
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Form9_${job.id}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      setTimeout(() => {
        toast.success(`Form 9 sent to ${job.tenantEmail} — legal entry time locked in`);
      }, 500);

      updateJob(job.id, { 
        form9Sent: true, 
        form9SentAt: new Date().toISOString(),
        scheduledDate: new Date(proposedEntryDate).toISOString(),
        status: 'SCHEDULING'
      });
    } catch (error: any) {
      console.error("Error generating Form 9:", error);
      toast.error(`Failed to generate Form 9: ${error.message}`);
    }
  };

  const handleGenerateCompliance = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(23, 37, 84); // slate-900
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("SMOKE ALARM COMPLIANCE CERTIFICATE", 20, 25);
    
    // Certificate Details
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Certificate No: COMP-${job.id}`, 150, 20);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 150, 28);

    // Property Details
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Property Details", 20, 60);
    doc.line(20, 63, 190, 63);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Address:`, 20, 75);
    doc.setFont("helvetica", "bold");
    doc.text(job.propertyAddress, 50, 75);
    
    doc.setFont("helvetica", "normal");
    doc.text(`Tenant:`, 20, 85);
    doc.text(job.tenantName, 50, 85);

    // Inspection Results
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Inspection Results", 20, 105);
    doc.line(20, 108, 190, 108);

    const items = [
      "Smoke alarms installed in all required locations",
      "Alarms are less than 10 years old",
      "Alarms interconnected where required",
      "Alarms tested and functioning correctly",
      "Batteries replaced (if applicable)",
      "Decibel level test passed (>85dB)"
    ];

    let y = 120;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    
    items.forEach(item => {
      doc.text(`[ X ]  ${item}`, 20, y);
      y += 10;
    });

    // Technician Declaration
    y += 10;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Technician Declaration", 20, y);
    doc.line(20, y+3, 190, y+3);
    
    y += 15;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("I certify that the smoke alarms at the above address have been tested", 20, y);
    doc.text("and comply with the relevant state legislation and Australian Standards (AS 3786:2014).", 20, y+7);

    y += 25;
    doc.setFont("helvetica", "bold");
    doc.text(`Technician: ${job.assignedElectricianId ? 'John Spark (Lic: 123456)' : 'Wirez R Us Technician'}`, 20, y);
    doc.text(`Signature: __________________________`, 120, y);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Wirez R Us Electrical Services | Lic No. 999999 | Ph: 1300 WIREZ US", 105, 280, { align: "center" });
    
    doc.save(`Compliance_${job.id}.pdf`);

    updateJob(job.id, { complianceReportGenerated: true });
    toast.success(`Compliance certificate generated — Compliance_${job.id}.pdf`);
  };

  const handleSyncXero = async () => {
    setIsSyncingXero(true);
    try {
      const response = await fetch('/api/xero/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync with Xero');
      }

      updateJob(job.id, { xeroInvoiceId: data.invoiceNumber || data.invoiceId });
      toast.success(`Xero invoice ${data.invoiceNumber || data.invoiceId} created`);
    } catch (error: any) {
      toast.error(`Xero sync failed: ${error.message}`);
    } finally {
      setIsSyncingXero(false);
    }
  };


  return (
    <div className="max-w-5xl mx-auto pb-12">
      {/* Header */}
      <button 
        onClick={() => navigate('/jobs')}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Board
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="p-6 sm:p-8 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-bold text-slate-400">{job.id}</span>
              <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                {job.status.replace('_', ' ')}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{job.title}</h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2">
              <p className="text-slate-500 flex items-center gap-2 text-sm sm:text-base">
                <MapPin className="w-4 h-4 shrink-0" /> <span className="break-all">{job.propertyAddress}</span>
              </p>
              {job.propertyAddress && job.propertyAddress !== 'See email body' && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.propertyAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-lg text-xs font-medium transition-colors shrink-0"
                >
                  <Navigation className="w-3.5 h-3.5" /> Navigate
                </a>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {job.status === 'INTAKE' && (
              <button onClick={() => handleStatusChange('SCHEDULING')} className="btn-primary text-xs sm:text-sm">
                Move to Scheduling
              </button>
            )}
            {job.status === 'SCHEDULING' && (
              <button onClick={() => handleStatusChange('DISPATCHED')} className="btn-primary text-xs sm:text-sm">
                Dispatch Electrician
              </button>
            )}
            {job.status === 'DISPATCHED' && !isAdmin && (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => handleStatusChange('EXECUTION')} className="btn-primary text-xs sm:text-sm">
                  Start Execution
                </button>
                <button onClick={() => window.open(`/field/${job.id}`, '_blank')} className="px-3 sm:px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-2">
                  <Camera className="w-4 h-4" /> Field App
                </button>
              </div>
            )}
            {job.status === 'EXECUTION' && !isAdmin && (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => handleStatusChange('REVIEW')} className="btn-primary text-xs sm:text-sm">
                  Submit for Review
                </button>
                <button onClick={() => window.open(`/field/${job.id}`, '_blank')} className="px-3 sm:px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-2">
                  <Camera className="w-4 h-4" /> Field App
                </button>
              </div>
            )}
            {job.status === 'REVIEW' && (
              <button onClick={() => handleStatusChange('CLOSED')} className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-white">
                Close Job
              </button>
            )}
            {/* Admin-only delete button */}
            {isAdmin && (
              <button
                onClick={() => setDeleteStep(1)}
                className="px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                title="Delete this job (Admin only)"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 items-start divide-y md:divide-y-0 md:divide-x divide-slate-200">
          {/* Phase 1: Intake & Coordination */}
          <div className={cn("p-6 sm:p-8", job.status === 'INTAKE' ? "bg-blue-50/30" : "")}>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">1</div>
              <h2 className="text-lg font-semibold text-slate-900">Intake & Contact</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-slate-500">Tenant Details</h3>
                  {isAdmin && (
                    <button
                      onClick={() => setEditingTenant(v => !v)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      {editingTenant ? 'Done' : 'Edit'}
                    </button>
                  )}
                </div>

                {editingTenant ? (
                  <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Full Name</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                        value={job.tenantName}
                        onChange={e => updateJob(job.id, { tenantName: e.target.value })}
                        placeholder="Tenant full name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Phone</label>
                      <input
                        type="tel"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                        value={job.tenantPhone}
                        onChange={e => updateJob(job.id, { tenantPhone: e.target.value })}
                        placeholder="04xx xxx xxx"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                      <input
                        type="email"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                        value={job.tenantEmail}
                        onChange={e => updateJob(job.id, { tenantEmail: e.target.value })}
                        placeholder="tenant@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Property Address</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                        value={job.propertyAddress}
                        onChange={e => updateJob(job.id, { propertyAddress: e.target.value })}
                        placeholder="123 Main St, Suburb, State"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Property Manager Email</label>
                      <input
                        type="email"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                        value={job.propertyManagerEmail || ''}
                        onChange={e => updateJob(job.id, { propertyManagerEmail: e.target.value })}
                        placeholder="manager@agency.com.au"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Job Type</label>
                      <select
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                        value={job.type}
                        onChange={e => updateJob(job.id, { type: e.target.value as any })}
                      >
                        <option value="ELECTRICAL">Electrical</option>
                        <option value="SMOKE_ALARM">Smoke Alarm</option>
                        <option value="EMERGENCY">Emergency</option>
                        <option value="MAINTENANCE">Maintenance</option>
                        <option value="INSPECTION">Inspection</option>
                      </select>
                    </div>
                    <p className="text-[10px] text-slate-400">Changes save automatically to Firestore.</p>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className={cn("font-medium", job.tenantName ? "text-slate-900" : "text-slate-400 italic")}>{job.tenantName || 'No name set'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      {job.tenantPhone
                        ? <a href={`tel:${job.tenantPhone}`} className="text-blue-600 hover:underline">{job.tenantPhone}</a>
                        : <span className="text-slate-400 italic text-sm">No phone set</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                      {job.tenantEmail
                        ? <a href={`mailto:${job.tenantEmail}`} className="text-blue-600 hover:underline">{job.tenantEmail}</a>
                        : <span className="text-slate-400 italic text-sm">No email set</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className={cn("text-sm", job.propertyAddress ? "text-slate-700" : "text-slate-400 italic")}>{job.propertyAddress || 'No address set'}</span>
                    </div>
                    {job.propertyManagerEmail && (
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-slate-300 shrink-0" />
                        <span className="text-xs text-slate-500">PM: {job.propertyManagerEmail}</span>
                      </div>
                    )}
                    {(!job.tenantName || !job.tenantPhone || !job.tenantEmail) && isAdmin && (
                      <button
                        onClick={() => setEditingTenant(true)}
                        className="w-full mt-1 py-1.5 border border-dashed border-amber-300 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-100 transition-colors"
                      >
                        ⚠ Missing details — click to fill in
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Raw Email View/Download — only for email-sourced jobs */}
              {job.source === 'email' && (job.rawEmailBody || job.rawEmailHtml) && (
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-2">Original Email</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-blue-700">
                        <span className="font-medium">From:</span> {job.rawEmailFrom || job.propertyManagerEmail}
                        {job.extractionMethod && (
                          <span className="ml-2 px-1.5 py-0.5 bg-blue-100 rounded text-[10px] font-medium">Extracted: {job.extractionMethod}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowRawEmail(true)}
                        className="flex-1 px-3 py-2 bg-white hover:bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Original Email
                      </button>
                      <button
                        onClick={() => {
                          const content = job.rawEmailHtml || job.rawEmailBody || '';
                          const isHtml = !!job.rawEmailHtml;
                          const blob = new Blob(
                            [isHtml ? content : `From: ${job.rawEmailFrom || ''}\nSubject: ${job.rawEmailSubject || ''}\nDate: ${job.createdAt}\n\n${content}`],
                            { type: isHtml ? 'text/html' : 'text/plain' }
                          );
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `email_${job.id}.${isHtml ? 'html' : 'txt'}`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="flex-1 px-3 py-2 bg-white hover:bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download Email
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Service Request Form Download — always visible to admin */}
              {isAdmin && (
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-2">Service Request Form</h3>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2">
                    <p className="text-xs text-emerald-700">Download a printable tick-and-flick form to give or email to property managers.</p>
                    <button
                      onClick={() => {
                        const addr = job.propertyAddress || '';
                        const tenantName = job.tenantName || '';
                        const tenantPhone = job.tenantPhone || '';
                        const tenantEmail = job.tenantEmail || '';
                        const pmEmail = job.propertyManagerEmail || '';
                        const today = new Date().toLocaleDateString('en-AU');
                        const jobRef = job.id;

                        const checked = (val: boolean) => val ? '&#10003;' : '';
                        const isElec = job.type === 'ELECTRICAL';
                        const isSmoke = job.type === 'SMOKE_ALARM';
                        const isEmerg = job.type === 'EMERGENCY';
                        const isMaint = job.type === 'MAINTENANCE';
                        const isInsp = job.type === 'INSPECTION';
                        const isRoutine = job.urgency === 'Routine' || (!job.urgency && !isEmerg);
                        const isUrgent = job.urgency === 'Urgent';
                        const isEmergency = job.urgency === 'Emergency' || isEmerg;

                        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Service Request Form — Wirez R Us</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #1e293b; background: #fff; }
  .page { max-width: 210mm; margin: 0 auto; padding: 12mm 14mm; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #0f172a; padding-bottom: 10px; margin-bottom: 16px; }
  .brand { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: #0f172a; }
  .brand span { color: #f59e0b; }
  .header-meta { text-align: right; font-size: 11px; color: #64748b; line-height: 1.6; }
  .badge { display: inline-block; background: #0f172a; color: #fff; font-size: 10px; font-weight: bold; padding: 3px 10px; border-radius: 20px; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 14px; }
  h2 { font-size: 15px; font-weight: 800; color: #0f172a; margin-bottom: 10px; border-left: 4px solid #f59e0b; padding-left: 8px; }
  .section { margin-bottom: 18px; }
  .field-row { display: flex; gap: 12px; margin-bottom: 8px; }
  .field { flex: 1; }
  .field label { display: block; font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
  .field .line { border-bottom: 1.5px solid #cbd5e1; min-height: 22px; padding-bottom: 2px; font-size: 13px; color: #0f172a; }
  .field .line.prefilled { color: #1e293b; font-weight: 600; }
  .check-group { display: flex; flex-wrap: wrap; gap: 8px 20px; margin-top: 4px; }
  .check-item { display: flex; align-items: center; gap: 6px; font-size: 13px; }
  .box { width: 16px; height: 16px; border: 2px solid #334155; border-radius: 3px; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: bold; color: #0f172a; flex-shrink: 0; }
  .box.checked { background: #0f172a; color: #fff; border-color: #0f172a; }
  .textarea-field { border: 1.5px solid #cbd5e1; border-radius: 6px; min-height: 70px; padding: 8px; font-size: 13px; width: 100%; color: #0f172a; background: #f8fafc; }
  .access-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .avail-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .avail-item { display: flex; align-items: center; gap: 6px; font-size: 12px; }
  .sig-row { display: flex; gap: 16px; margin-top: 6px; }
  .sig-block { flex: 1; }
  .sig-line { border-bottom: 1.5px solid #334155; height: 36px; margin-bottom: 4px; }
  .footer { margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; }
  .footer-text { font-size: 9px; color: #94a3b8; }
  .important { background: #fef9c3; border: 1px solid #fbbf24; border-radius: 6px; padding: 8px 12px; font-size: 11px; color: #92400e; margin-bottom: 16px; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 8mm 10mm; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div>
      <div class="brand">WIREZ<span> R US</span></div>
      <div style="font-size:11px;color:#64748b;margin-top:2px;">Licensed Electrical Contractors</div>
    </div>
    <div class="header-meta">
      <strong>SERVICE REQUEST FORM</strong><br/>
      Date: ${today}<br/>
      Ref: ${jobRef ? jobRef : '______________'}
    </div>
  </div>

  <div class="important">
    &#9888; Please complete <strong>ALL</strong> fields and tick where applicable. Incomplete forms will delay scheduling.
    Return by email to: <strong>jobs@wireznrus.com.au</strong>
  </div>

  <!-- Section 1: Property Details -->
  <div class="section">
    <h2>1. Property Details</h2>
    <div class="field-row">
      <div class="field" style="flex:2">
        <label>Property Address</label>
        <div class="line ${addr ? 'prefilled' : ''}">${addr || ''}</div>
      </div>
    </div>
    <div class="field-row">
      <div class="field">
        <label>Suburb</label>
        <div class="line"></div>
      </div>
      <div class="field" style="flex:0.4">
        <label>State</label>
        <div class="line"></div>
      </div>
      <div class="field" style="flex:0.6">
        <label>Postcode</label>
        <div class="line"></div>
      </div>
    </div>
  </div>

  <!-- Section 2: Tenant Details -->
  <div class="section">
    <h2>2. Tenant / Occupant Details</h2>
    <div class="field-row">
      <div class="field">
        <label>Full Name</label>
        <div class="line ${tenantName ? 'prefilled' : ''}">${tenantName || ''}</div>
      </div>
      <div class="field">
        <label>Phone</label>
        <div class="line ${tenantPhone ? 'prefilled' : ''}">${tenantPhone || ''}</div>
      </div>
    </div>
    <div class="field-row">
      <div class="field">
        <label>Email</label>
        <div class="line ${tenantEmail ? 'prefilled' : ''}">${tenantEmail || ''}</div>
      </div>
      <div class="field">
        <label>Best time to contact</label>
        <div class="line"></div>
      </div>
    </div>
    <div style="margin-top:6px">
      <label style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Tenant home during work?</label>
      <div class="check-group" style="margin-top:4px">
        <div class="check-item"><div class="box"></div> Yes</div>
        <div class="check-item"><div class="box"></div> No</div>
        <div class="check-item"><div class="box"></div> Key/access provided</div>
      </div>
    </div>
  </div>

  <!-- Section 3: Property Manager -->
  <div class="section">
    <h2>3. Property Manager / Agency Details</h2>
    <div class="field-row">
      <div class="field">
        <label>Contact Name</label>
        <div class="line"></div>
      </div>
      <div class="field">
        <label>Agency Name</label>
        <div class="line"></div>
      </div>
    </div>
    <div class="field-row">
      <div class="field">
        <label>Email</label>
        <div class="line ${pmEmail ? 'prefilled' : ''}">${pmEmail || ''}</div>
      </div>
      <div class="field">
        <label>Phone</label>
        <div class="line"></div>
      </div>
    </div>
  </div>

  <!-- Section 4: Job Type -->
  <div class="section">
    <h2>4. Type of Work Required <span style="font-size:11px;font-weight:400;color:#64748b;">(tick all that apply)</span></h2>
    <div class="check-group">
      <div class="check-item"><div class="box ${isElec ? 'checked' : ''}">${checked(isElec)}</div> Electrical Fault / Repair</div>
      <div class="check-item"><div class="box ${isSmoke ? 'checked' : ''}">${checked(isSmoke)}</div> Smoke Alarm Service</div>
      <div class="check-item"><div class="box ${isEmerg ? 'checked' : ''}">${checked(isEmerg)}</div> Emergency Call-out</div>
      <div class="check-item"><div class="box ${isMaint ? 'checked' : ''}">${checked(isMaint)}</div> General Maintenance</div>
      <div class="check-item"><div class="box ${isInsp ? 'checked' : ''}">${checked(isInsp)}</div> Safety Inspection</div>
      <div class="check-item"><div class="box"></div> Other: ___________________</div>
    </div>
  </div>

  <!-- Section 5: Urgency -->
  <div class="section">
    <h2>5. Urgency Level</h2>
    <div class="check-group">
      <div class="check-item"><div class="box ${isRoutine ? 'checked' : ''}">${checked(isRoutine)}</div> <span><strong>Routine</strong> — within 5–7 business days</span></div>
      <div class="check-item"><div class="box ${isUrgent ? 'checked' : ''}">${checked(isUrgent)}</div> <span><strong>Urgent</strong> — within 24–48 hours</span></div>
      <div class="check-item"><div class="box ${isEmergency ? 'checked' : ''}">${checked(isEmergency)}</div> <span><strong>Emergency</strong> — immediate response required</span></div>
    </div>
  </div>

  <!-- Section 6: Description -->
  <div class="section">
    <h2>6. Description of Issue</h2>
    <div class="textarea-field">${job.description ? job.description.substring(0, 300) : ''}</div>
    <div style="margin-top:10px">
      <label style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Hazards present?</label>
      <div class="check-group" style="margin-top:4px">
        <div class="check-item"><div class="box"></div> Exposed wiring</div>
        <div class="check-item"><div class="box"></div> Burning smell / scorch marks</div>
        <div class="check-item"><div class="box"></div> Tripped circuit breaker</div>
        <div class="check-item"><div class="box"></div> Water near electrical</div>
        <div class="check-item"><div class="box"></div> Smoke alarm beeping</div>
        <div class="check-item"><div class="box"></div> No power to property</div>
        <div class="check-item"><div class="box"></div> None</div>
      </div>
    </div>
  </div>

  <!-- Section 7: Access -->
  <div class="section">
    <h2>7. Access Instructions</h2>
    <div class="field-row">
      <div class="field" style="flex:2">
        <label>Key / Lockbox / Access Code Details</label>
        <div class="line">${job.accessCodes || ''}</div>
      </div>
    </div>
    <div style="margin-top:8px">
      <label style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Access type</label>
      <div class="check-group" style="margin-top:4px">
        <div class="check-item"><div class="box"></div> Lockbox on site</div>
        <div class="check-item"><div class="box"></div> Key at agency</div>
        <div class="check-item"><div class="box"></div> Tenant to provide access</div>
        <div class="check-item"><div class="box"></div> Agent to attend</div>
      </div>
    </div>
  </div>

  <!-- Section 8: Availability -->
  <div class="section">
    <h2>8. Preferred Attendance Time</h2>
    <div class="avail-grid">
      <div class="avail-item"><div class="box"></div> Mon AM</div>
      <div class="avail-item"><div class="box"></div> Mon PM</div>
      <div class="avail-item"><div class="box"></div> Mon Anytime</div>
      <div class="avail-item"><div class="box"></div> Tue AM</div>
      <div class="avail-item"><div class="box"></div> Tue PM</div>
      <div class="avail-item"><div class="box"></div> Tue Anytime</div>
      <div class="avail-item"><div class="box"></div> Wed AM</div>
      <div class="avail-item"><div class="box"></div> Wed PM</div>
      <div class="avail-item"><div class="box"></div> Wed Anytime</div>
      <div class="avail-item"><div class="box"></div> Thu AM</div>
      <div class="avail-item"><div class="box"></div> Thu PM</div>
      <div class="avail-item"><div class="box"></div> Thu Anytime</div>
      <div class="avail-item"><div class="box"></div> Fri AM</div>
      <div class="avail-item"><div class="box"></div> Fri PM</div>
      <div class="avail-item"><div class="box"></div> Fri Anytime</div>
    </div>
    <div class="field-row" style="margin-top:10px">
      <div class="field">
        <label>Specific preferred date (if any)</label>
        <div class="line">${job.scheduledDate ? new Date(job.scheduledDate).toLocaleDateString('en-AU') : ''}</div>
      </div>
      <div class="field">
        <label>Dates / times NOT available</label>
        <div class="line"></div>
      </div>
    </div>
  </div>

  <!-- Section 9: Declaration -->
  <div class="section">
    <h2>9. Declaration</h2>
    <p style="font-size:11px;color:#475569;margin-bottom:10px;line-height:1.5;">
      I confirm that the information provided is accurate and that I am authorised to request the above works on behalf of the property owner / occupant.
      I understand that a call-out fee may apply for emergency attendance outside business hours.
    </p>
    <div class="sig-row">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div style="font-size:10px;color:#64748b;">Signature</div>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div style="font-size:10px;color:#64748b;">Printed Name</div>
      </div>
      <div class="sig-block" style="flex:0.6">
        <div class="sig-line"></div>
        <div style="font-size:10px;color:#64748b;">Date</div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-text">Wirez R Us Electrical Services &bull; Licensed Electrical Contractors &bull; jobs@wireznrus.com.au</div>
    <div class="footer-text">Form version 1.0 &bull; Generated ${today}</div>
  </div>

  <!-- Print button (hidden when printing) -->
  <div class="no-print" style="text-align:center;margin-top:20px">
    <button onclick="window.print()" style="padding:10px 28px;background:#0f172a;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;">
      &#128438; Print / Save as PDF
    </button>
  </div>

</div>
</body>
</html>`;

                        const blob = new Blob([html], { type: 'text/html' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `service_request_${(job.propertyAddress || 'form').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="w-full px-3 py-2 bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Service Request Form
                    </button>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-slate-500 mb-2">Three-Try Contact Rule</h3>
                <div className="space-y-3 mb-4">
                  {job.contactAttempts.map((attempt, idx) => (
                    <div key={attempt.id} className="flex items-start gap-3 text-sm">
                      {attempt.successful ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5" />
                      )}
                      <div>
                        <p className="font-medium text-slate-900">Attempt {idx + 1} <span className="text-slate-500 font-normal">({format(new Date(attempt.date), 'MMM d, h:mm a')})</span></p>
                        <p className="text-slate-600">{attempt.notes}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {job.status === 'INTAKE' && job.contactAttempts.length < 3 && !job.contactAttempts.some(a => a.successful) && (
                  <div className="space-y-3">
                    <input 
                      type="text" 
                      placeholder="Notes on call..." 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      value={newNote}
                      onChange={e => setNewNote(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleAddContactAttempt(false)} className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
                        No Answer
                      </button>
                      <button onClick={() => handleAddContactAttempt(true)} className="flex-1 px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-sm font-medium transition-colors">
                        Connected
                      </button>
                    </div>
                  </div>
                )}

                {job.contactAttempts.length >= 3 && !job.contactAttempts.some(a => a.successful) && !job.form9Sent && (
                  <div className="mt-4 p-4 bg-rose-50 border border-rose-100 rounded-xl">
                    <p className="text-sm text-rose-800 font-medium mb-3">3 attempts failed. Form 9 required.</p>
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-rose-700 mb-1">Proposed Entry Date & Time (Min 24h notice)</label>
                      <input 
                        type="datetime-local" 
                        className="w-full px-3 py-2 border border-rose-200 rounded-lg text-sm bg-white"
                        value={proposedEntryDate}
                        onChange={e => setProposedEntryDate(e.target.value)}
                      />
                    </div>
                    <button 
                      onClick={handleGenerateForm9} 
                      disabled={!proposedEntryDate}
                      className="w-full px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Generate & Send Form 9
                    </button>
                  </div>
                )}
                
                {job.form9Sent && (
                  <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2 text-sm text-emerald-800 font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    Form 9 Sent ({format(new Date(job.form9SentAt!), 'MMM d')})
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Phase 2: Scheduling & Dispatch */}
          <div className={cn("p-6 sm:p-8", ['SCHEDULING', 'DISPATCHED'].includes(job.status) ? "bg-purple-50/30" : "")}>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold">2</div>
              <h2 className="text-lg font-semibold text-slate-900">Schedule & Dispatch</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-2">Assigned Electrician</label>
                <select 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white mb-2"
                  value={job.assignedElectricianId || ''}
                  onChange={e => updateJob(job.id, { assignedElectricianId: e.target.value })}
                  disabled={job.status !== 'SCHEDULING'}
                >
                  <option value="">Select Electrician...</option>
                  {electricians.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
                <button 
                  onClick={() => setShowAvailability(true)}
                  className="w-full px-3 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <CalendarIcon className="w-4 h-4" />
                  Check Availability
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-500 mb-2">Scheduled Time</label>
                <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg bg-white">
                  <CalendarIcon className="w-4 h-4 text-slate-400" />
                  <input 
                    type="datetime-local" 
                    className="w-full text-sm outline-none disabled:bg-transparent disabled:text-slate-500"
                    value={job.scheduledDate ? format(new Date(job.scheduledDate), "yyyy-MM-dd'T'HH:mm") : ''}
                    onChange={e => updateJob(job.id, { scheduledDate: new Date(e.target.value).toISOString() })}
                    disabled={job.status !== 'SCHEDULING' || job.form9Sent}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-500 mb-2">Work Order Details</label>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                  <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">
                    {job.description || `WORK ORDER — ${job.title}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nDate Created: ${format(new Date(job.createdAt), 'EEEE, d MMMM yyyy')}\nTime: ${format(new Date(job.createdAt), 'hh:mm a')}\n\nTENANT: ${job.tenantName}\nPHONE: ${job.tenantPhone}\nEMAIL: ${job.tenantEmail}\nPROPERTY: ${job.propertyAddress}\n${job.propertyManagerEmail ? `PROPERTY MANAGER: ${job.propertyManagerEmail}\n` : ''}\nTYPE: ${job.type.replace('_', ' ')}\nSTATUS: ${job.status}`}
                  </pre>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-500 mb-2">Access Codes / Instructions</label>
                <textarea 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white min-h-[80px]"
                  placeholder="e.g. Gate code 1234, key under mat..."
                  value={job.accessCodes || ''}
                  onChange={e => updateJob(job.id, { accessCodes: e.target.value })}
                  disabled={job.status !== 'SCHEDULING'}
                />
              </div>

              {/* Resend Job Text */}
              {isAdmin && job.assignedElectricianId && ['DISPATCHED', 'EXECUTION'].includes(job.status) && (() => {
                const elec = electricians.find(e => e.id === job.assignedElectricianId);
                return elec ? (
                  <button
                    disabled={resendingSms}
                    onClick={async () => {
                      setResendingSms(true);
                      try {
                        const res = await fetch('/api/sms/send', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            to: elec.phone,
                            message: `Wirez R Us Reminder: Job ${job.id} at ${job.propertyAddress}. Scheduled: ${job.scheduledDate ? format(new Date(job.scheduledDate), 'MMM d, h:mm a') : 'TBD'}. Open app: ${window.location.origin}/field/${job.id}`
                          })
                        });
                        const data = await res.json();
                        if (data.simulated) {
                          toast.success(`SMS resent (simulated) to ${elec.name} at ${elec.phone}`);
                        } else {
                          toast.success(`SMS resent to ${elec.name}`);
                        }
                      } catch (err) {
                        console.error(err);
                        toast.error('Failed to resend SMS');
                      } finally {
                        setResendingSms(false);
                      }
                    }}
                    className="w-full px-4 py-2.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {resendingSms ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Resend Job Text to {elec.name}
                  </button>
                ) : null;
              })()}
            </div>
          </div>

          {/* Phase 3 & 4: Execution & Review */}
          <div className={cn("p-6 sm:p-8", ['EXECUTION', 'REVIEW'].includes(job.status) ? "bg-orange-50/30" : "")}>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold">3</div>
              <h2 className="text-lg font-semibold text-slate-900">Execution & Review</h2>
            </div>

            <div className="space-y-6">
              {/* Field Data */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <Wrench className="w-4 h-4" /> Field Data Capture
                </h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Labor Hours:</span>
                    <span className="font-medium text-slate-900">{job.laborHours ? `${job.laborHours} hrs` : '—'}</span>
                  </div>

                  {/* Time Log from clock on/off system */}
                  {job.timeLog && job.timeLog.length > 0 && (
                    <details className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                      <summary className="px-3 py-2 text-xs font-semibold text-slate-500 cursor-pointer hover:text-slate-700 hover:bg-slate-50">
                        View time log ({job.timeLog.length} entries)
                      </summary>
                      <div className="px-3 pb-2 space-y-1">
                        {job.timeLog.map((entry: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className={cn(
                              "font-semibold capitalize",
                              entry.type === 'clock_on' ? "text-emerald-600" :
                              entry.type === 'clock_off' ? "text-rose-600" :
                              entry.type === 'break_start' ? "text-amber-600" :
                              "text-blue-600"
                            )}>
                              {entry.type.replace(/_/g, ' ')}
                            </span>
                            <span className="text-slate-400 font-mono">
                              {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                  
                  <div>
                    <span className="text-sm text-slate-500 block mb-1">Materials Used:</span>
                    {job.materials.length > 0 ? (
                      <ul className="text-sm space-y-1">
                        {job.materials.map(m => (
                          <li key={m.id} className="flex justify-between">
                            <span>{m.quantity}x {m.name}</span>
                            <span className="text-slate-500">${(m.cost * m.quantity).toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-sm font-medium text-slate-900">—</span>
                    )}
                  </div>

                  <div>
                    <span className="text-sm text-slate-500 block mb-2">Photos:</span>
                    {job.photos.length > 0 ? (
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {job.photos.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="shrink-0 relative group">
                            <img src={url} alt="Job site" className="w-20 h-20 object-cover rounded-lg border border-slate-200" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                              <span className="text-white text-xs font-medium">View</span>
                            </div>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="w-full h-20 bg-slate-100 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 text-sm">
                        <Camera className="w-4 h-4 mr-2" /> No photos
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="text-sm text-slate-500 block mb-2">Technician Notes:</span>
                    {job.status === 'REVIEW' ? (
                      <textarea 
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white min-h-[80px]"
                        value={job.siteNotes || ''}
                        onChange={e => updateJob(job.id, { siteNotes: e.target.value })}
                        placeholder="Review and edit technician notes for clarity before invoicing..."
                      />
                    ) : (
                      <p className="text-sm text-slate-900 bg-white p-3 rounded-lg border border-slate-200 whitespace-pre-wrap">
                        {job.siteNotes || '—'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Admin Actions */}
              {job.status === 'REVIEW' && (
                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <h3 className="text-sm font-bold text-slate-700 mb-3">Admin Actions</h3>
                  
                  <button 
                    onClick={handleSyncXero}
                    disabled={!!job.xeroInvoiceId || isSyncingXero}
                    className="w-full px-4 py-3 bg-[#13B5EA] hover:bg-[#0f9bc9] disabled:bg-slate-200 disabled:text-slate-500 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {isSyncingXero ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                    {job.xeroInvoiceId ? `Synced to Xero (${job.xeroInvoiceId})` : 'Sync to Xero & Invoice'}
                  </button>

                  {job.type === 'SMOKE_ALARM' && (
                    <button 
                      onClick={handleGenerateCompliance}
                      disabled={job.complianceReportGenerated}
                      className="w-full px-4 py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-500 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      {job.complianceReportGenerated ? 'Report Generated' : 'Generate Compliance Report'}
                    </button>
                  )}
                </div>
              )}

              {job.status === 'CLOSED' && (
                <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-bold text-emerald-900">Job Complete & Archived</h3>
                  <p className="text-emerald-700 text-sm mt-1">
                    This job has been successfully closed and filed.
                  </p>
                  {job.xeroInvoiceId && (
                    <p className="text-emerald-600 text-xs mt-2 font-medium">
                      Invoice: {job.xeroInvoiceId}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Availability Popout Modal ─── */}
      {showAvailability && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAvailability(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-purple-500" />
                  Technician Availability
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {job.scheduledDate
                    ? <>Job scheduled: <span className="font-semibold text-slate-700">{format(new Date(job.scheduledDate), 'EEE d MMM, h:mm a')}</span></>
                    : 'No scheduled time set for this job yet'}
                </p>
              </div>
              <button onClick={() => setShowAvailability(false)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tech list */}
            <div className="p-5 space-y-3">
              {electricians.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No technicians found. Add team members in the Team page.</p>
              ) : (
                electricians.map(elec => {
                  const isAssigned = elec.id === job.assignedElectricianId;
                  return (
                    <div
                      key={elec.id}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl border transition-all",
                        isAssigned
                          ? "bg-purple-50 border-purple-200"
                          : "bg-slate-50 border-slate-200"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
                          isAssigned ? "bg-purple-200 text-purple-700" : "bg-slate-200 text-slate-600"
                        )}>
                          {elec.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">{elec.name}</p>
                          <p className="text-xs text-slate-500">{elec.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isAssigned ? (
                          <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">Assigned</span>
                        ) : (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">Available</span>
                        )}
                        {!isAssigned && job.status === 'SCHEDULING' && (
                          <button
                            onClick={() => {
                              updateJob(job.id, { assignedElectricianId: elec.id });
                              toast.success(`${elec.name} assigned to this job`);
                              setShowAvailability(false);
                            }}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors"
                          >
                            Assign
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer hint */}
            <div className="px-5 pb-5">
              <p className="text-[11px] text-slate-400 text-center">
                Full calendar view available in the <button onClick={() => { setShowAvailability(false); navigate('/calendar'); }} className="text-purple-600 hover:underline font-medium">Calendar</button> page.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Raw Email Viewer Modal ─── */}
      {showRawEmail && job.source === 'email' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowRawEmail(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Original Email</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  From: {job.rawEmailFrom || job.propertyManagerEmail || 'Unknown'} &bull; {format(new Date(job.createdAt), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const content = job.rawEmailHtml || job.rawEmailBody || '';
                    const isHtml = !!job.rawEmailHtml;
                    const blob = new Blob(
                      [isHtml ? content : `From: ${job.rawEmailFrom || ''}\nSubject: ${job.rawEmailSubject || ''}\nDate: ${job.createdAt}\n\n${content}`],
                      { type: isHtml ? 'text/html' : 'text/plain' }
                    );
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `email_${job.id}.${isHtml ? 'html' : 'txt'}`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-700"
                  title="Download email"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button onClick={() => setShowRawEmail(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-700">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 text-sm">
              <span className="font-medium text-slate-600">Subject:</span>{' '}
              <span className="text-slate-900">{job.rawEmailSubject || job.title}</span>
              {job.extractionMethod && (
                <span className="ml-3 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium">
                  Extraction: {job.extractionMethod}
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {job.rawEmailHtml ? (
                <div
                  className="prose prose-sm max-w-none text-slate-800"
                  dangerouslySetInnerHTML={{ __html: job.rawEmailHtml }}
                />
              ) : (
                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">
                  {job.rawEmailBody || 'No email content available.'}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Multi-Step Delete Confirmation Modal ─── */}
      {deleteStep > 0 && isAdmin && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => { setDeleteStep(0); setDeleteReason(''); setDeleteConfirmText(''); }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>

            {/* Step 1: Initial Warning */}
            {deleteStep === 1 && (
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <ShieldAlert className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Delete Job?</h3>
                    <p className="text-xs text-slate-500">Admin action — cannot be undone</p>
                  </div>
                </div>

                <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                  <p className="text-sm text-red-800 font-medium mb-1">You are about to permanently delete:</p>
                  <p className="text-sm text-red-700"><strong>{job.id}</strong> — {job.title}</p>
                  <p className="text-xs text-red-600 mt-1">Created: {format(new Date(job.createdAt), 'MMM d, yyyy h:mm a')}</p>
                  {job.source === 'email' && (
                    <p className="text-xs text-red-600 mt-0.5">Source: Inbound email from {job.rawEmailFrom || job.propertyManagerEmail}</p>
                  )}
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-5 text-xs text-amber-800 space-y-1">
                  <p className="font-semibold flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Before deleting, consider:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                    <li>Has this job been assigned to an electrician?</li>
                    <li>Are there any contact attempts or scheduled dates?</li>
                    <li>Could this be a legitimate work order sent in error?</li>
                    <li>Would archiving be more appropriate than deleting?</li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setDeleteStep(0); setDeleteReason(''); setDeleteConfirmText(''); }}
                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setDeleteStep(2)}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
                  >
                    I understand, continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Reason Required */}
            {deleteStep === 2 && (
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Reason for Deletion</h3>
                    <p className="text-xs text-slate-500">Step 2 of 3 — A reason is required for audit purposes</p>
                  </div>
                </div>

                <div className="space-y-3 mb-5">
                  <label className="block text-sm font-medium text-slate-700">Why is this job being deleted?</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Spam / Junk email', 'Duplicate job', 'Test / Accidental entry', 'Client cancelled'].map(reason => (
                      <button
                        key={reason}
                        onClick={() => setDeleteReason(reason)}
                        className={cn(
                          "px-3 py-2 rounded-lg text-xs font-medium border transition-colors text-left",
                          deleteReason === reason
                            ? 'bg-red-50 border-red-300 text-red-700'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        )}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={deleteReason}
                    onChange={e => setDeleteReason(e.target.value)}
                    placeholder="Or type a custom reason..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm min-h-[60px] focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteStep(1)}
                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setDeleteStep(3)}
                    disabled={!deleteReason.trim()}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Continue to final step
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Type to Confirm */}
            {deleteStep === 3 && (
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-red-700">Final Confirmation</h3>
                    <p className="text-xs text-slate-500">Step 3 of 3 — This action is permanent</p>
                  </div>
                </div>

                <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4 text-sm text-red-800">
                  <p className="font-medium mb-1">Deleting: <strong>{job.title}</strong></p>
                  <p className="text-xs text-red-700">Reason: {deleteReason}</p>
                  <p className="text-xs text-red-700">Performed by: {user?.email}</p>
                </div>

                <div className="mb-5">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Type <strong className="text-red-600">DELETE</strong> to confirm:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={e => setDeleteConfirmText(e.target.value)}
                    placeholder="Type DELETE here"
                    className="w-full px-3 py-2 border-2 border-red-200 rounded-lg text-sm font-mono text-center tracking-widest uppercase focus:ring-2 focus:ring-red-300 focus:border-red-400 outline-none"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setDeleteStep(0); setDeleteReason(''); setDeleteConfirmText(''); }}
                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setIsDeleting(true);
                      try {
                        await deleteJob(job.id);
                        toast.success(`Job ${job.id} deleted — ${deleteReason}`);
                        navigate('/jobs');
                      } catch (err) {
                        toast.error('Failed to delete job');
                      } finally {
                        setIsDeleting(false);
                        setDeleteStep(0);
                        setDeleteReason('');
                        setDeleteConfirmText('');
                      }
                    }}
                    disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    {isDeleting ? 'Deleting...' : 'Permanently Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
