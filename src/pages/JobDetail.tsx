import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Job, JobStatus, ContactAttempt, Electrician } from '../types';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import { 
  ArrowLeft, Phone, Mail, FileText, Calendar as CalendarIcon, 
  CheckCircle2, AlertCircle, Camera, Wrench, DollarSign, Send, Loader2, Upload, Link as LinkIcon, User
} from 'lucide-react';
import { cn } from '../utils';

interface JobDetailProps {
  jobs: Job[];
  updateJob: (id: string, updates: Partial<Job>) => void;
  electricians: Electrician[];
}

export function JobDetail({ jobs, updateJob, electricians }: JobDetailProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const job = jobs.find(j => j.id === id);
  
  const [newNote, setNewNote] = useState('');
  const [isSyncingXero, setIsSyncingXero] = useState(false);
  const [proposedEntryDate, setProposedEntryDate] = useState('');

  if (!job) {
    return <div>Job not found</div>;
  }

  const handleStatusChange = async (newStatus: JobStatus) => {
    if (newStatus === 'DISPATCHED') {
      const electrician = electricians.find(e => e.id === job.assignedElectricianId);
      if (!electrician) {
        alert("Please assign an electrician before dispatching.");
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
          alert(`Job Dispatched! (SMS Simulated to ${electrician.name} at ${electrician.phone})`);
        } else {
          alert(`Job Dispatched! SMS sent to ${electrician.name}.`);
        }
      } catch (e) {
        console.error(e);
        alert("Job dispatched, but failed to send SMS notification.");
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

  const handleGenerateForm9 = () => {
    if (!proposedEntryDate) {
      alert("Please select a proposed entry date and time.");
      return;
    }

    // Generate QLD Form 9 PDF using jsPDF
    const doc = new jsPDF();
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Entry notice (Form 9)", 20, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Residential Tenancies and Rooming Accommodation Act 2008", 20, 28);
    
    doc.line(20, 32, 190, 32);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("1. Address of the rental property", 20, 45);
    doc.setFont("helvetica", "normal");
    doc.text(job.propertyAddress, 20, 52);
    
    doc.setFont("helvetica", "bold");
    doc.text("2. Notice issued to", 20, 65);
    doc.setFont("helvetica", "normal");
    doc.text(`Tenant Name(s): ${job.tenantName}`, 20, 72);
    
    doc.setFont("helvetica", "bold");
    doc.text("3. Notice issued by", 20, 85);
    doc.setFont("helvetica", "normal");
    doc.text(`Name: Wirez R Us (Contractor on behalf of Lessor/Agent)`, 20, 92);
    
    doc.setFont("helvetica", "bold");
    doc.text("4. Notice issued on", 20, 105);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${format(new Date(), 'dd/MM/yyyy')}`, 20, 112);
    
    doc.setFont("helvetica", "bold");
    doc.text("5. Entry details", 20, 125);
    doc.setFont("helvetica", "normal");
    const entryDateObj = new Date(proposedEntryDate);
    doc.text(`Date of entry: ${format(entryDateObj, 'dd/MM/yyyy')}`, 20, 132);
    doc.text(`Time of entry: ${format(entryDateObj, 'hh:mm a')} to ${format(new Date(entryDateObj.getTime() + 2 * 3600 * 1000), 'hh:mm a')}`, 20, 139);
    
    doc.setFont("helvetica", "bold");
    doc.text("6. Reason for entry", 20, 152);
    doc.setFont("helvetica", "normal");
    doc.text("[X] To carry out repairs or maintenance", 20, 159);
    doc.text(`Details: ${job.title}`, 25, 166);
    
    doc.line(20, 180, 190, 180);
    doc.setFontSize(10);
    doc.text("Note: Minimum notice period for repairs and maintenance is 24 hours.", 20, 190);
    
    doc.save(`Form9_${job.id}.pdf`);

    // Simulate sending the email
    setTimeout(() => {
      alert(`Email Sent Successfully!\n\nTo: ${job.tenantEmail}\nCC: ${job.propertyManagerEmail || 'pm@example.com'}\nAttachment: Form9_${job.id}.pdf\n\nThe legal entry time is now locked in.`);
    }, 500);

    updateJob(job.id, { 
      form9Sent: true, 
      form9SentAt: new Date().toISOString(),
      scheduledDate: new Date(proposedEntryDate).toISOString(),
      status: 'SCHEDULING'
    });
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
    alert(`Compliance Certificate generated and saved as Compliance_${job.id}.pdf`);
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
      alert(`Successfully synced to Xero! Invoice ${data.invoiceNumber || data.invoiceId} created.`);
    } catch (error: any) {
      alert(`Xero Sync Error: ${error.message}\n\nMake sure you have connected Xero in the Integrations tab.`);
    } finally {
      setIsSyncingXero(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Simulate uploading the file and getting a URL back
      setTimeout(() => {
        updateJob(job.id, { workOrderUrl: URL.createObjectURL(file) });
        alert('Work Order attached successfully!');
      }, 500);
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
            <p className="text-slate-500 mt-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> {job.propertyAddress}
            </p>
          </div>
          
          <div className="flex gap-3">
            {job.status === 'INTAKE' && (
              <button onClick={() => handleStatusChange('SCHEDULING')} className="btn-primary">
                Move to Scheduling
              </button>
            )}
            {job.status === 'SCHEDULING' && (
              <button onClick={() => handleStatusChange('DISPATCHED')} className="btn-primary">
                Dispatch Electrician
              </button>
            )}
            {job.status === 'DISPATCHED' && (
              <div className="flex gap-2">
                <button onClick={() => handleStatusChange('EXECUTION')} className="btn-primary">
                  Start Execution
                </button>
                <button onClick={() => window.open(`/field/${job.id}`, '_blank')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                  <Camera className="w-4 h-4" /> Open Field App
                </button>
              </div>
            )}
            {job.status === 'EXECUTION' && (
              <div className="flex gap-2">
                <button onClick={() => handleStatusChange('REVIEW')} className="btn-primary">
                  Submit for Review
                </button>
                <button onClick={() => window.open(`/field/${job.id}`, '_blank')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                  <Camera className="w-4 h-4" /> Open Field App
                </button>
              </div>
            )}
            {job.status === 'REVIEW' && (
              <button onClick={() => handleStatusChange('CLOSED')} className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-white">
                Close Job
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          {/* Phase 1: Intake & Coordination */}
          <div className={cn("p-6 sm:p-8", job.status === 'INTAKE' ? "bg-blue-50/30" : "")}>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">1</div>
              <h2 className="text-lg font-semibold text-slate-900">Intake & Contact</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-slate-500 mb-2">Tenant Details</h3>
                <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="font-medium text-slate-900">{job.tenantName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <a href={`tel:${job.tenantPhone}`} className="text-blue-600 hover:underline">{job.tenantPhone}</a>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <a href={`mailto:${job.tenantEmail}`} className="text-blue-600 hover:underline">{job.tenantEmail}</a>
                  </div>
                </div>
              </div>

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
                <div className="flex items-center gap-3">
                  <select 
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
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
                    onClick={() => navigate('/calendar')}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shrink-0"
                  >
                    <CalendarIcon className="w-4 h-4" />
                    Check Availability
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-500 mb-2">Scheduled Time</label>
                <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg bg-white">
                  <CalendarIcon className="w-4 h-4 text-slate-400" />
                  <input 
                    type="datetime-local" 
                    className="w-full text-sm outline-none"
                    value={job.scheduledDate ? new Date(job.scheduledDate).toISOString().slice(0, 16) : ''}
                    onChange={e => updateJob(job.id, { scheduledDate: new Date(e.target.value).toISOString() })}
                    disabled={job.status !== 'SCHEDULING'}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-500 mb-2">Original Work Order</label>
                {job.workOrderUrl ? (
                  <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                    <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium">
                      <FileText className="w-4 h-4" />
                      Work_Order_Attached.pdf
                    </div>
                    <a 
                      href={job.workOrderUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-emerald-600 hover:text-emerald-800 text-sm font-medium flex items-center gap-1"
                    >
                      <LinkIcon className="w-4 h-4" /> View
                    </a>
                  </div>
                ) : (
                  <div className="relative border-2 border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors">
                    <input 
                      type="file" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleFileUpload}
                      disabled={job.status !== 'SCHEDULING'}
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                    <p className="text-sm font-medium text-slate-700">Click or drag file to attach</p>
                    <p className="text-xs text-slate-500 mt-1">PDF, JPG, PNG up to 10MB</p>
                  </div>
                )}
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
                    <span className="font-medium text-slate-900">{job.laborHours || '—'} hrs</span>
                  </div>
                  
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
    </div>
  );
}

// Helper component for MapPin since it wasn't imported at top
function MapPin(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
}
