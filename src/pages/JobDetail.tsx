import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Job, JobStatus, ContactAttempt, Electrician } from '../types';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import { PDFDocument, rgb } from 'pdf-lib';
import DOMPurify from 'dompurify';
import { 
  ArrowLeft, Phone, Mail, FileText, Calendar as CalendarIcon, 
  CheckCircle2, AlertCircle, Camera, Wrench, DollarSign, Send, Loader2, User,
  Download, Eye, X, MapPin, Trash2, ShieldAlert, Navigation, Plus
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
  const [sendingTenantNotif, setSendingTenantNotif] = useState(false);
  const [editingTenant, setEditingTenant] = useState(false);
  const [editingProps, setEditingProps] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);
  const [generatingPaymentLink, setGeneratingPaymentLink] = useState(false);
  const [editingBilling, setEditingBilling] = useState(false);
  const [billingRate, setBillingRate] = useState<number>(120);
  const [miscCharges, setMiscCharges] = useState<Array<{ id: string; description: string; amount: number }>>([]);
  const isAdmin = user?.role === 'admin' || user?.role === 'dev';

  // ─── Tab-based workflow ───
  type WorkflowTab = 'details' | 'schedule' | 'fieldwork' | 'invoice';
  const statusToTab = (s: string): WorkflowTab => {
    if (s === 'INTAKE') return 'details';
    if (s === 'SCHEDULING' || s === 'DISPATCHED') return 'schedule';
    if (s === 'EXECUTION') return 'fieldwork';
    return 'invoice'; // REVIEW, CLOSED
  };
  const [activeTab, setActiveTab] = useState<WorkflowTab>(statusToTab(job?.status || 'INTAKE'));

  // ─── AI Parse Review state ───
  const [reviewFields, setReviewFields] = useState({
    tenantName: '',
    tenantPhone: '',
    tenantEmail: '',
    propertyAddress: '',
    description: '',
    urgency: '',
    jobType: '',
    accessCodes: '',
    propertyManagerEmail: '',
    propertyManagerName: '',
    agency: '',
  });
  const [confirmingReview, setConfirmingReview] = useState(false);

  React.useEffect(() => {
    if (job?.aiNeedsReview) {
      setReviewFields({
        tenantName: job.tenantName || '',
        tenantPhone: job.tenantPhone || '',
        tenantEmail: job.tenantEmail || '',
        propertyAddress: job.propertyAddress || '',
        description: job.description || '',
        urgency: job.urgency || 'NORMAL',
        jobType: job.type || 'GENERAL_REPAIR',
        accessCodes: job.accessCodes || '',
        propertyManagerEmail: job.propertyManagerEmail || '',
        propertyManagerName: (job as any).propertyManagerName || '',
        agency: (job as any).agency || '',
      });
    }
  }, [job?.id]);

  // Initialize billing state from job
  React.useEffect(() => {
    if (job) {
      setBillingRate(job.hourlyRate || 120);
      setMiscCharges(job.miscCharges || []);
    }
  }, [job.id]);

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

  const handleConfirmReview = async () => {
    setConfirmingReview(true);
    try {
      await updateJob(job.id, {
        tenantName: reviewFields.tenantName,
        tenantPhone: reviewFields.tenantPhone,
        tenantEmail: reviewFields.tenantEmail,
        propertyAddress: reviewFields.propertyAddress,
        description: reviewFields.description,
        urgency: reviewFields.urgency,
        type: reviewFields.jobType,
        accessCodes: reviewFields.accessCodes,
        propertyManagerEmail: reviewFields.propertyManagerEmail,
        propertyManagerName: reviewFields.propertyManagerName,
        agency: reviewFields.agency,
        aiNeedsReview: false,
      } as any);
      toast.success('Work order confirmed — job is ready to proceed.');
    } catch {
      toast.error('Failed to save review');
    } finally {
      setConfirmingReview(false);
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
    const alarms = job.smokeAlarms || [];
    const inspDate = format(new Date(), 'dd/MM/yyyy');
    const techName = job.complianceInspectorName || (job.assignedElectricianId
      ? electricians.find(e => e.id === job.assignedElectricianId)?.name || 'N. Cakovan'
      : 'N. Cakovan');
    const smokeTick = job.complianceSmokeAlarmsTick !== false;
    const safetyTick = job.complianceSafetySwitchTick !== false;
    const woNumber = job.complianceWoNumber || job.id.slice(0, 8).toUpperCase();
    const clientRef = job.complianceClientRef || job.agency || '';

    // ═══════════════════════════════════════════════════
    // PAGE 1 — Inspection Details
    // ═══════════════════════════════════════════════════

    // Yellow header bar
    doc.setFillColor(255, 215, 0);
    doc.rect(0, 0, 210, 25, 'F');
    doc.setTextColor(200, 30, 30);
    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    doc.text("COMPLIANCE REPORT", 75, 18);

    // Wirez R Us text in header
    doc.setFontSize(10);
    doc.setTextColor(100, 50, 0);
    doc.text("WIREZ R US", 15, 12);
    doc.setFontSize(6);
    doc.text("ELECTRICAL & SMOKE ALARMS", 15, 17);

    // ── Name & Address box ──
    doc.setTextColor(200, 30, 30);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Name & Address", 15, 33);

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.rect(15, 36, 80, 30); // address box

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    // Client name / agency
    const addrLines = [];
    if (job.agency) addrLines.push(job.agency);
    if (job.tenantName && job.tenantName !== job.agency) addrLines.push(job.tenantName);
    addrLines.push(job.propertyAddress || '');
    addrLines.push('AUSTRALIA');
    addrLines.forEach((line, i) => {
      doc.text(line, 18, 43 + i * 6);
    });

    // ── WO Number & Client Reference ──
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("WO Number", 110, 33);
    doc.rect(110, 35, 35, 8);
    doc.setFontSize(9);
    doc.text(woNumber, 112, 41);

    doc.setFontSize(8);
    doc.text("Client Reference", 155, 33);
    doc.rect(155, 35, 40, 8);
    doc.setFontSize(9);
    doc.text(clientRef, 157, 41);

    // ── Inspection Address ──
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text("Inspection Address (Address where smoke alarms were inspected)", 110, 50);
    doc.setDrawColor(0, 0, 0);
    doc.rect(110, 52, 85, 8);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(job.propertyAddress || '', 112, 58);

    // ── Inspection Date ──
    doc.setFontSize(8);
    doc.text("Inspection Date:", 155, 65);
    doc.rect(155, 67, 40, 8);
    doc.setFontSize(9);
    doc.text(inspDate, 157, 73);

    // ── Inspected By ──
    doc.setFontSize(8);
    doc.text("Inspected By", 110, 80);
    doc.rect(110, 82, 85, 8);
    doc.setFontSize(9);
    doc.text(techName, 112, 88);

    // ── Tick / Cross explanation ──
    let y = 100;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text("A tick in a box below indicates that on the Inspection Date and at the Inspection Address, the smoke alarms, smoke alarm", 15, y);
    doc.text("installations and safety switch/s were inspected and tested and met the requirements of the relevant legislation.", 15, y + 4);
    y += 10;
    doc.text("A cross in a box below indicates that on the Inspection Date and at the Inspection Address, the smoke alarms, smoke alarm", 15, y);
    doc.text("installations and safety switch/s were inspected and did not meet the requirements of the relevant legislation.", 15, y + 4);

    // ── Smoke Alarms compliance box (yellow highlight) ──
    y += 14;
    doc.setFillColor(255, 255, 0);
    doc.rect(25, y, 160, 12, 'F');
    doc.setDrawColor(0, 0, 0);
    doc.rect(25, y, 160, 12);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    const smokeLabel = smokeTick ? '[  /  ]' : '[  X  ]';
    doc.text(`${smokeLabel}   On the Inspection Date smoke alarms were present and tested.`, 30, y + 8);

    // ── Safety Switch compliance box ──
    y += 22;
    doc.rect(25, y, 160, 12);
    const safetyLabel = safetyTick ? '[  /  ]' : '[  X  ]';
    doc.text(`${safetyLabel}   On the Inspection Date a Safety Switch was present and tested.`, 30, y + 8);

    // ── COMMENTS ──
    y += 22;
    doc.setTextColor(200, 30, 30);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("COMMENTS", 15, y);
    y += 4;
    doc.setDrawColor(0, 0, 0);
    doc.rect(15, y, 180, 14);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const comments1 = job.complianceNotes || job.siteNotes || '';
    if (comments1) {
      const cLines = doc.splitTextToSize(comments1, 175);
      doc.text(cLines.slice(0, 2), 18, y + 5);
    }

    // ── SMOKE ALARMS section ──
    y += 22;
    doc.setTextColor(200, 30, 30);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("SMOKE ALARMS", 15, y);
    y += 5;
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("At this inspection, the following alarms were present or installed.", 15, y);

    // ── Alarm Table ──
    y += 5;
    // Table header
    doc.setFillColor(220, 220, 220);
    doc.rect(15, y, 180, 8, 'F');
    doc.setDrawColor(0, 0, 0);
    doc.rect(15, y, 180, 8);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    const tCols = [17, 42, 67, 92, 127, 145];
    const tHeaders = ['VOLTAGE', 'TYPE', 'EXPIRES', 'LOCATION', 'LEVEL', 'INSTALL REASON'];
    tHeaders.forEach((h, i) => doc.text(h, tCols[i], y + 5));
    y += 8;

    // Table rows
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const maxRows = 8;
    for (let r = 0; r < maxRows; r++) {
      doc.rect(15, y, 180, 8);
      if (r < alarms.length) {
        const a = alarms[r];
        doc.text(a.voltage || '', tCols[0], y + 5);
        doc.text(a.type || '', tCols[1], y + 5);
        doc.text(a.expires || '', tCols[2], y + 5);
        doc.text((a.location || '').substring(0, 18), tCols[3], y + 5);
        doc.text(a.level || '', tCols[4], y + 5);
        doc.text((a.installReason || '').substring(0, 22), tCols[5], y + 5);
      }
      y += 8;
    }

    // ── Bottom COMMENTS ──
    y += 4;
    doc.setTextColor(200, 30, 30);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("COMMENTS", 15, y);
    y += 4;
    doc.setDrawColor(0, 0, 0);
    doc.rect(15, y, 180, 12);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const comments2 = job.complianceNotes2 || '';
    if (comments2) {
      const c2Lines = doc.splitTextToSize(comments2, 175);
      doc.text(c2Lines.slice(0, 2), 18, y + 5);
    }

    // ── Licence footer ──
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);
    doc.text("Electrical Contractor Licence No: 80075", 15, 285);

    // ═══════════════════════════════════════════════════
    // PAGE 2 — Important Notes & Disclaimers
    // ═══════════════════════════════════════════════════
    doc.addPage();

    // Yellow header bar (same as page 1)
    doc.setFillColor(255, 215, 0);
    doc.rect(0, 0, 210, 25, 'F');
    doc.setTextColor(200, 30, 30);
    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    doc.text("COMPLIANCE REPORT", 75, 18);
    doc.setFontSize(10);
    doc.setTextColor(100, 50, 0);
    doc.text("WIREZ R US", 15, 12);
    doc.setFontSize(6);
    doc.text("ELECTRICAL & SMOKE ALARMS", 15, 17);

    // ── IMPORTANT NOTES ──
    y = 35;
    doc.setTextColor(200, 30, 30);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("IMPORTANT NOTES", 15, y);
    y += 6;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");

    const importantNotes = [
      'Current Requirements means the legislative requirements stipulated by the Queensland Fire and Emergency Services Act 1990; Building Fire',
      'Safety Regulation 2008; and the Electrical Safety Act 2002 applicable to existent (pre-2022) smoke alarms and smoke alarm installations and related',
      'electrical work (if applicable). Considerations around compliance of the smoke alarms at the Inspection Address are the types of smoke alarms and',
      'smoke alarm installations.',
      'New Requirements means the legislative requirements stipulated by the Queensland Fire and Emergency Services Act 1990; Building Fire Safety',
      'Regulation 2008; and the Electrical Safety Act 2002 to be in place by 1st January 2022 for rental properties and related electrical work (if applicable).',
      'Considerations around compliance of the smoke alarms at the Inspection Address are the types of smoke alarms and smoke alarm installations.',
    ];
    importantNotes.forEach(line => {
      doc.text(line, 15, y);
      y += 3.5;
    });

    // ── This is not a building compliance certificate ──
    y += 6;
    doc.setTextColor(200, 30, 30);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("This is not a building compliance certificate.", 15, y);
    y += 6;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");

    const notBuildingLines = [
      'Wirez R Us is not a building certifier. Building compliance certificates relate to compliance with building plans and approvals granted by local, state',
      'and federal governments under various Building Acts and related construction and renovation requirements. Building certificates, and other types of',
      'certificates relating to construction and renovation safety (including automated fire suppression systems), issued by building certifiers, or other',
      'safety officials, refer to different points in time and different regulations. A building certificate issued at the end of construction, for example, may',
      'certify compliance with a building approval. The building approval may have been granted prior to a change in standards or regulations for smoke',
      'alarms and the installation of smoke alarms. The approval or the building certificate, or other such certificates, may have been granted or issued',
      'during a grace period allowed by legislation to ensure the orderly implementation of a new standard or regulation. A building compliance certificate,',
      'or other construction or renovation safety certificate, does not necessarily mean that the smoke alarms and smoke alarm installations are compliant',
      'with the standards and regulations for smoke alarms and smoke alarm installations in force in the State or Territory where the Inspection Address is',
      'situated. Similarly, a report indicating that the smoke alarms or smoke alarm installations are not compliant does not necessarily mean that a',
      'building compliance certificate, or other such certificate, is not valid. Please check with your building certifier or other safety officials with regard to',
      'the compliance requirements for your building or property, and the relevant dates, and exemptions or exceptions you may be entitled to under their',
      'governing laws and regulations.',
    ];
    notBuildingLines.forEach(line => {
      doc.text(line, 15, y);
      y += 3.5;
    });

    // ── Qualified Compliance Report ──
    y += 6;
    doc.setTextColor(200, 30, 30);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Qualified Compliance Report", 15, y);
    y += 6;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");

    const qualifiedLines = [
      'In certain instances there may be legislation that is current and in force, but stipulates the introduction of new compliance requirements. These',
      'requirements may be phased in over time and the legislation may allow a grace period or periods to facilitate the introduction of the new compliance',
      'requirements. Owing to changes in legislation (including legislation other than the various Building Acts) subsequent to the Build Date certain smoke',
      'alarms and smoke alarm installations already installed may become not required for compliance, and certain now smoke alarms and smoke alarm',
      'installations may become required for compliance. If a smoke alarm or smoke alarm installation is not required for compliance the property owner',
      'may remove the smoke alarm. If you choose to leave a not required for compliance smoke alarm installed you must ensure the smoke alarm is',
      'functional in accordance with current legislation. Wirez R Us: (i) may service smoke alarms or smoke alarm installations that are not required for',
      'compliance, if those smoke alarms or smoke alarm installations are not faulty and not expired; (ii) will remove smoke alarms and smoke alarm',
      'installations that are not required for compliance, if those smoke alarms or smoke alarm installations are faulty or are expired; and (iii) does not',
      'replace smoke alarms and smoke alarm installations that are not required for compliance, if those smoke alarms or smoke alarm installations are',
      'faulty or are expired, as part of your package. Replacing an expired or faulty not required for compliance smoke alarm with a new compliant smoke',
      'alarm does not constitute a so-called "replacement" and separate charges apply.',
    ];
    qualifiedLines.forEach(line => {
      doc.text(line, 15, y);
      y += 3.5;
    });

    // ── This is a smoke alarm compliance certificate ──
    y += 6;
    doc.setTextColor(200, 30, 30);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("This is a smoke alarm compliance certificate", 15, y);
    y += 6;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");

    const saCompLines = [
      'This compliance report or non-compliance of the abovementioned smoke alarms and smoke alarm installations at the abovementioned Inspection',
      'Address with the abovementioned legislative requirements for smoke alarms and smoke alarm installations for the Building Class building in force on',
      'the Inspection Date in the State or Territory where the abovementioned Inspection Address is situated. If an electrical contractor license number',
      'appears on the face hereof, this report also certifies that insofar as the relevant smoke alarm installations and smoke alarms are electrical',
      'installations or electrical equipment and their installation, removal, repair, inspection or testing are electrical work as defined in the relevant',
      'legislation, at the Inspection Address and on the Inspection Date: (i) such electrical installation, to the extent that it is affected by the electrical work,',
      'has been tested to ensure it is electrically safe and is in accordance with the requirements of the wiring rules and any other standard applying to the',
      'electrical installation under the Current Requirements; and (ii) such electrical equipment, to the extent it is affected by the electrical work, is',
      'electrically safe in terms of the Current Requirements. Wirez R Us is not a building surveyor and does not know the relevant date that a property',
      'was built or renovated. Wirez R Us\' trained technicians use reasonable efforts to estimate the Building Class and, if relevant, the Build date and is not',
      'aware of any substantial, or other, renovation. If applicable, it is the property owner or its agent\'s responsibility to notify Wirez R Us of the date when',
      'the property was built or substantially renovated and its classification.',
    ];
    saCompLines.forEach(line => {
      doc.text(line, 15, y);
      y += 3.5;
    });

    // ── Company footer ──
    y = 268;
    doc.setDrawColor(200, 200, 200);
    doc.line(15, y, 195, y);
    y += 5;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text("12 Richmont Drive, Bouldercombe,", 15, y);
    doc.text("QLD, 4702", 15, y + 4);
    doc.text("PO Box 353,", 15, y + 8);
    doc.text("GRACEMERE, QLD 4012", 15, y + 12);

    doc.text("wirezrus@outlook.com", 80, y);
    doc.text("N.Cakovan ABN 47 869 614 212", 80, y + 4);

    doc.setFontSize(7);
    doc.text("Electrical Contractor Licence No: 80075", 15, y + 18);

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("0493 210 536", 155, y + 4);

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("WIREZ R US", 160, y + 10);
    doc.text("Facebook @WirezRUs", 155, y + 14);

    doc.save(`Compliance_${job.id}.pdf`);

    updateJob(job.id, { 
      complianceReportGenerated: true,
      complianceDate: new Date().toISOString(),
      complianceInspectorName: techName,
    });
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

  const handleSaveBilling = () => {
    updateJob(job.id, {
      hourlyRate: billingRate,
      miscCharges: miscCharges,
    });
    setEditingBilling(false);
    toast.success('Billing configuration saved');
  };

  const handleAddMiscCharge = () => {
    const newCharge = {
      id: `mc${Date.now()}`,
      description: '',
      amount: 0,
    };
    setMiscCharges([...miscCharges, newCharge]);
  };

  const handleUpdateMiscCharge = (id: string, field: 'description' | 'amount', value: string | number) => {
    setMiscCharges(miscCharges.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleRemoveMiscCharge = (id: string) => {
    setMiscCharges(miscCharges.filter(c => c.id !== id));
  };

  const calculateTotal = () => {
    const materialsCost = job.materials.reduce((sum, m) => sum + (m.cost * m.quantity), 0);
    const laborCost = (job.laborHours || 0) * (job.hourlyRate || billingRate);
    const miscTotal = (job.miscCharges || miscCharges).reduce((sum, c) => sum + c.amount, 0);
    return materialsCost + laborCost + miscTotal;
  };

  const handleGeneratePaymentLink = async () => {
    const total = calculateTotal();

    if (total <= 0) {
      toast.error('Cannot generate payment link - no charges recorded');
      return;
    }

    setGeneratingPaymentLink(true);
    try {
      const response = await fetch('/api/stripe/create-payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          amount: total,
          description: `${job.title} - ${job.propertyAddress}`,
          customerEmail: job.tenantEmail || undefined,
          lineItems: [
            ...(job.materials.length > 0 ? [{
              name: 'Materials',
              amount: job.materials.reduce((sum, m) => sum + (m.cost * m.quantity), 0),
            }] : []),
            ...((job.laborHours || 0) > 0 ? [{
              name: `Labor (${job.laborHours} hrs @ $${job.hourlyRate || billingRate}/hr)`,
              amount: (job.laborHours || 0) * (job.hourlyRate || billingRate),
            }] : []),
            ...(job.miscCharges || miscCharges).map(c => ({
              name: c.description,
              amount: c.amount,
            })),
          ],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment link');
      }

      updateJob(job.id, {
        paymentLinkUrl: data.paymentLinkUrl,
        paymentLinkId: data.paymentLinkId,
        paymentStatus: 'pending',
        amountDue: total,
      });

      toast.success('Payment link generated! Tech can now collect payment on-site.');
    } catch (error: any) {
      toast.error(`Payment link failed: ${error.message}`);
    } finally {
      setGeneratingPaymentLink(false);
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
        <div className="p-6 sm:p-8 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-bold text-slate-400">{job.id}</span>
                <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                  {job.status.replace('_', ' ')}
                </span>
                <button
                  onClick={() => setEditingProps(p => !p)}
                  className={cn(
                    'ml-auto text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5',
                    editingProps
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-white border-slate-200 text-blue-600 hover:bg-blue-50 hover:border-blue-200'
                  )}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  {editingProps ? 'Done Editing' : 'Edit Properties'}
                </button>
              </div>
              {editingProps ? (
                <input
                  type="text"
                  value={job.title}
                  onChange={e => updateJob(job.id, { title: e.target.value })}
                  className="w-full text-2xl sm:text-3xl font-bold text-slate-900 bg-white border-2 border-blue-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 mb-2"
                  placeholder="Job title..."
                />
              ) : (
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{job.title}</h1>
              )}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2">
                {editingProps ? (
                  <input
                    type="text"
                    value={job.propertyAddress}
                    onChange={e => updateJob(job.id, { propertyAddress: e.target.value })}
                    className="flex-1 min-w-[200px] text-sm bg-white border-2 border-blue-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                    placeholder="Property address..."
                  />
                ) : (
                  <p className="text-slate-500 flex items-center gap-2 text-sm sm:text-base">
                    <MapPin className="w-4 h-4 shrink-0" /> <span className="break-all">{job.propertyAddress}</span>
                  </p>
                )}
                {job.propertyAddress && job.propertyAddress !== 'See email body' && !editingProps && (
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
          </div>

          {/* ── Expanded edit panel ── */}
          {editingProps && (
            <div className="bg-blue-50/50 border-2 border-blue-200 rounded-2xl p-5 space-y-4 mb-4">
              <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2">
                <Wrench className="w-4 h-4" /> Edit Job Properties
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tenant Name</label>
                  <input type="text" value={job.tenantName} onChange={e => updateJob(job.id, { tenantName: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-400"
                    placeholder="Tenant full name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tenant Phone</label>
                  <input type="tel" value={job.tenantPhone} onChange={e => updateJob(job.id, { tenantPhone: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-400"
                    placeholder="04xx xxx xxx" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tenant Email</label>
                  <input type="email" value={job.tenantEmail} onChange={e => updateJob(job.id, { tenantEmail: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-400"
                    placeholder="tenant@email.com" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Agency</label>
                  <input type="text" value={(job as any).agency || ''} onChange={e => updateJob(job.id, { agency: e.target.value } as any)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-400"
                    placeholder="Agency name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Property Manager Email</label>
                  <input type="email" value={job.propertyManagerEmail || ''} onChange={e => updateJob(job.id, { propertyManagerEmail: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-400"
                    placeholder="pm@agency.com.au" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Scheduled Date</label>
                  <input type="datetime-local" value={job.scheduledDate ? new Date(job.scheduledDate).toISOString().slice(0, 16) : ''}
                    onChange={e => updateJob(job.id, { scheduledDate: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Job Type</label>
                  <select title="Job Type" value={job.type} onChange={e => updateJob(job.id, { type: e.target.value as any })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-400">
                    <option value="ELECTRICAL">Electrical</option>
                    <option value="SMOKE_ALARM">Smoke Alarm</option>
                    <option value="SAFETY_SWITCH">Safety Switch</option>
                    <option value="EMERGENCY">Emergency</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="INSPECTION">Inspection</option>
                    <option value="GENERAL_REPAIR">General Repair</option>
                    <option value="INSTALLATION">Installation</option>
                    <option value="POWER_POINT">Power Point</option>
                    <option value="HOT_WATER">Hot Water</option>
                    <option value="FAN">Fan</option>
                    <option value="APPLIANCE">Appliance</option>
                    <option value="SWITCHBOARD">Switchboard</option>
                    <option value="LIGHTING">Lighting</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Urgency</label>
                  <select title="Urgency" value={job.urgency || 'Routine'} onChange={e => updateJob(job.id, { urgency: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-400">
                    <option value="Emergency">Emergency</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Routine">Routine</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Access / Entry Instructions</label>
                  <input type="text" value={job.accessCodes || ''} onChange={e => updateJob(job.id, { accessCodes: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-400"
                    placeholder="Key safe code, lockbox, access notes..." />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                  <textarea value={job.description || ''} onChange={e => updateJob(job.id, { description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-400 resize-none"
                    placeholder="Describe the job or issue..." />
                </div>
              </div>
              <p className="text-[10px] text-slate-400">Changes save automatically.</p>
            </div>
          )}
          
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

        {/* ─── Duplicate / Follow-up Banner ────────────────────────── */}
        {isAdmin && job.propertyAddress && (() => {
          const otherJobsAtAddress = jobs.filter(
            j => j.id !== job.id
              && j.propertyAddress === job.propertyAddress
              && j.status !== 'CLOSED'
          );
          if (otherJobsAtAddress.length === 0 && !job.hasFollowUpEmail) return null;
          return (
            <div className="border-b border-purple-200 bg-purple-50 px-6 py-4">
              {job.hasFollowUpEmail && (
                <div className="flex items-center gap-2 text-purple-800 mb-2">
                  <span className="text-lg">📩</span>
                  <span className="text-sm font-semibold">Follow-up email received</span>
                  {job.lastFollowUpAt && (
                    <span className="text-xs text-purple-600 ml-1">
                      ({format(new Date(job.lastFollowUpAt), 'MMM d, h:mm a')})
                    </span>
                  )}
                </div>
              )}
              {otherJobsAtAddress.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-purple-800 mb-2">
                    <span className="text-lg">⚠️</span>
                    <span className="text-sm font-semibold">
                      {otherJobsAtAddress.length} other active job{otherJobsAtAddress.length > 1 ? 's' : ''} at this address
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {otherJobsAtAddress.map(oj => (
                      <Link
                        key={oj.id}
                        to={`/jobs/${oj.id}`}
                        className="flex items-center justify-between gap-2 px-3 py-2 bg-white border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                            oj.status === 'EXECUTION' ? 'bg-orange-100 text-orange-700' :
                            oj.status === 'DISPATCHED' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-600'
                          )}>{oj.status}</span>
                          <span className="text-sm font-medium text-slate-700 truncate">{oj.title}</span>
                          <span className="text-xs text-slate-400">{oj.id.slice(0, 8)}</span>
                        </div>
                        <span className="text-xs text-purple-600 font-medium shrink-0">View →</span>
                      </Link>
                    ))}
                  </div>
                  <p className="text-xs text-purple-600 mt-2">
                    Consider merging these jobs if they relate to the same issue.
                  </p>
                </div>
              )}
            </div>
          );
        })()}

        {/* ─── AI Parse Review Panel ─────────────────────────────── */}
        {job.source === 'email' && job.aiNeedsReview && isAdmin && (() => {
          const conf = job.aiConfidence;
          const confColor = (v?: number) =>
            !v ? 'text-slate-400' :
            v >= 0.8 ? 'text-emerald-600' :
            v >= 0.5 ? 'text-amber-500' : 'text-red-500';
          const confLabel = (v?: number) =>
            !v ? '?' : v >= 0.8 ? '✓' : v >= 0.5 ? '~' : '✗';
          const confBg = (v?: number) =>
            !v ? 'bg-slate-100' :
            v >= 0.8 ? 'bg-emerald-50 border-emerald-200' :
            v >= 0.5 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';

          return (
            <div className="border-b border-amber-200 bg-amber-50">
              {/* Header */}
              <div className="px-6 py-4 flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldAlert className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-amber-900">AI Work Order Review Required</h2>
                      {job.detectedSoftware && (
                        <span className="text-xs font-semibold bg-white border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full">
                          {job.detectedSoftware}
                        </span>
                      )}
                      {conf?.overall !== undefined && (
                        <span className={cn(
                          'text-xs font-bold px-2 py-0.5 rounded-full border',
                          conf.overall >= 0.8 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                          conf.overall >= 0.5 ? 'bg-amber-50 border-amber-300 text-amber-700' :
                          'bg-red-50 border-red-200 text-red-700'
                        )}>
                          {Math.round((conf.overall || 0) * 100)}% confidence
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-amber-700 mt-0.5">
                      This job was auto-populated from an inbound email. Review each field below, correct any errors, then confirm.
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      <span className="font-semibold">From:</span> {job.rawEmailFrom} &nbsp;·&nbsp;
                      <span className="font-semibold">Subject:</span> {job.rawEmailSubject}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setShowRawEmail(true)}
                    className="px-3 py-2 bg-white border border-amber-200 text-amber-700 hover:bg-amber-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Email
                  </button>
                </div>
              </div>

              {/* Editable fields grid */}
              <div className="px-6 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Property Address */}
                <div className={cn('rounded-xl border p-3 col-span-1 sm:col-span-2 lg:col-span-2', confBg(conf?.propertyAddress))}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Property Address</label>
                    <span className={cn('text-xs font-bold', confColor(conf?.propertyAddress))}>
                      {confLabel(conf?.propertyAddress)} {conf?.propertyAddress !== undefined ? `${Math.round((conf.propertyAddress) * 100)}%` : ''}
                    </span>
                  </div>
                  <input
                    value={reviewFields.propertyAddress}
                    onChange={e => setReviewFields(f => ({ ...f, propertyAddress: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="Full property address..."
                  />
                </div>

                {/* Job Type */}
                <div className="rounded-xl border bg-white border-slate-200 p-3">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-1.5">Job Type</label>
                  <select
                    value={reviewFields.jobType}
                    onChange={e => setReviewFields(f => ({ ...f, jobType: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="SMOKE_ALARM">🔥 Smoke Alarm</option>
                    <option value="SAFETY_SWITCH">⚡ Safety Switch</option>
                    <option value="LIGHTING">💡 Lighting</option>
                    <option value="POWER_POINT">🔌 Power Point</option>
                    <option value="HOT_WATER">🚿 Hot Water</option>
                    <option value="FAN">🌀 Fan / Ventilation</option>
                    <option value="APPLIANCE">🍳 Appliance</option>
                    <option value="EMERGENCY">🚨 Emergency</option>
                    <option value="SWITCHBOARD">⚙️ Switchboard</option>
                    <option value="GENERAL_REPAIR">🔧 General Repair</option>
                  </select>
                </div>

                {/* Urgency */}
                <div className="rounded-xl border bg-white border-slate-200 p-3">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-1.5">Urgency</label>
                  <select
                    value={reviewFields.urgency}
                    onChange={e => setReviewFields(f => ({ ...f, urgency: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="URGENT">🚨 URGENT</option>
                    <option value="HIGH">⚡ HIGH</option>
                    <option value="NORMAL">✅ NORMAL</option>
                    <option value="LOW">🕐 LOW</option>
                  </select>
                </div>

                {/* Tenant Name */}
                <div className={cn('rounded-xl border p-3', confBg(conf?.tenantName))}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Tenant Name</label>
                    <span className={cn('text-xs font-bold', confColor(conf?.tenantName))}>
                      {confLabel(conf?.tenantName)} {conf?.tenantName !== undefined ? `${Math.round((conf.tenantName) * 100)}%` : ''}
                    </span>
                  </div>
                  <input
                    value={reviewFields.tenantName}
                    onChange={e => setReviewFields(f => ({ ...f, tenantName: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="Tenant full name..."
                  />
                </div>

                {/* Tenant Phone */}
                <div className={cn('rounded-xl border p-3', confBg(conf?.tenantPhone))}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Tenant Phone</label>
                    <span className={cn('text-xs font-bold', confColor(conf?.tenantPhone))}>
                      {confLabel(conf?.tenantPhone)} {conf?.tenantPhone !== undefined ? `${Math.round((conf.tenantPhone) * 100)}%` : ''}
                    </span>
                  </div>
                  <input
                    value={reviewFields.tenantPhone}
                    onChange={e => setReviewFields(f => ({ ...f, tenantPhone: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="04xx xxx xxx"
                  />
                </div>

                {/* Tenant Email */}
                <div className={cn('rounded-xl border p-3', confBg(conf?.tenantEmail))}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Tenant Email</label>
                    <span className={cn('text-xs font-bold', confColor(conf?.tenantEmail))}>
                      {confLabel(conf?.tenantEmail)} {conf?.tenantEmail !== undefined ? `${Math.round((conf.tenantEmail) * 100)}%` : ''}
                    </span>
                  </div>
                  <input
                    value={reviewFields.tenantEmail}
                    onChange={e => setReviewFields(f => ({ ...f, tenantEmail: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="tenant@email.com"
                  />
                </div>

                {/* PM Email */}
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-1.5">Property Manager Email</label>
                  <input
                    value={reviewFields.propertyManagerEmail}
                    onChange={e => setReviewFields(f => ({ ...f, propertyManagerEmail: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="pm@agency.com.au"
                  />
                </div>

                {/* Agency */}
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-1.5">Agency / PM Name</label>
                  <input
                    value={reviewFields.agency || reviewFields.propertyManagerName}
                    onChange={e => setReviewFields(f => ({ ...f, agency: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="Real estate agency name..."
                  />
                </div>

                {/* Access Instructions */}
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-1.5">Access / Entry Instructions</label>
                  <input
                    value={reviewFields.accessCodes}
                    onChange={e => setReviewFields(f => ({ ...f, accessCodes: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="Key safe code, access instructions..."
                  />
                </div>

                {/* Description — full width */}
                <div className={cn('rounded-xl border p-3 col-span-1 sm:col-span-2 lg:col-span-3', confBg(conf?.issueDescription))}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Issue Description</label>
                    <span className={cn('text-xs font-bold', confColor(conf?.issueDescription))}>
                      {confLabel(conf?.issueDescription)} {conf?.issueDescription !== undefined ? `${Math.round((conf.issueDescription) * 100)}%` : ''}
                    </span>
                  </div>
                  <textarea
                    value={reviewFields.description}
                    onChange={e => setReviewFields(f => ({ ...f, description: e.target.value }))}
                    rows={3}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                    placeholder="Describe the electrical issue in detail..."
                  />
                </div>
              </div>

              {/* Confirm bar */}
              <div className="px-6 py-4 bg-amber-100/50 border-t border-amber-200 flex items-center justify-between gap-4 flex-wrap">
                <p className="text-xs text-amber-700 font-medium">
                  ✏️ Correct any fields above, then click <strong>Confirm Work Order</strong> to clear this review flag and proceed.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleConfirmReview}
                    disabled={confirmingReview || !reviewFields.propertyAddress}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2 shadow-sm"
                  >
                    {confirmingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {confirmingReview ? 'Saving…' : 'Confirm Work Order'}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ─── Compact Job Summary ─── */}
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span className="font-medium text-slate-700">{job.propertyAddress || 'No address'}</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600">{job.tenantName || 'No tenant'}</span>
          </div>
          {job.tenantPhone && (
            <a href={`tel:${job.tenantPhone}`} className="text-blue-600 hover:underline text-sm">{job.tenantPhone}</a>
          )}
          <span className={cn(
            "px-2 py-0.5 rounded text-xs font-bold",
            job.type === 'SMOKE_ALARM' ? 'bg-red-100 text-red-700' :
            job.type === 'EMERGENCY' ? 'bg-rose-100 text-rose-700' :
            'bg-slate-100 text-slate-600'
          )}>
            {job.type?.replace(/_/g, ' ') || 'GENERAL'}
          </span>
        </div>

        {/* ─── Workflow Tabs ─── */}
        <div className="border-b border-slate-200">
          <div className="flex px-4 sm:px-6 gap-1 overflow-x-auto">
            {([
              { id: 'details' as WorkflowTab, label: 'Details' },
              { id: 'schedule' as WorkflowTab, label: 'Schedule & Dispatch' },
              { id: 'fieldwork' as WorkflowTab, label: 'Field Work' },
              { id: 'invoice' as WorkflowTab, label: 'Close Out' },
            ]).map(tab => {
              const isActive = activeTab === tab.id;
              const isCurrentPhase = statusToTab(job.status) === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  title={tab.label}
                  className={cn(
                    "px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2",
                    isActive
                      ? "border-slate-900 text-slate-900"
                      : isCurrentPhase
                        ? "border-amber-400 text-amber-600 hover:text-amber-700"
                        : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  {tab.label}
                  {isCurrentPhase && !isActive && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Tab Content ─── */}
        <div>
          {activeTab === 'details' && (
          <div className="p-6 sm:p-8 max-w-4xl">
            
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

                {/* Form 9 — always available (no 3-contact rule), 2hr window */}
                {!job.form9Sent && (
                  <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="text-sm text-slate-700 font-medium mb-1">Form 9 — Entry Notice</p>
                    <p className="text-xs text-slate-500 mb-3">
                      {job.type === 'SMOKE_ALARM'
                        ? 'SA check — Form 9 will be auto-sent to tenant on generation.'
                        : 'Non-SA job — Form 9 generated for download. Click "Send" separately when ready.'}
                    </p>
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Proposed Entry Date & Time (Min 24h notice, 2hr window)</label>
                      <input 
                        type="datetime-local" 
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                        value={proposedEntryDate}
                        onChange={e => setProposedEntryDate(e.target.value)}
                      />
                      {proposedEntryDate && (
                        <p className="text-xs text-slate-500 mt-1">
                          Window: {format(new Date(proposedEntryDate), 'h:mm a')} – {format(new Date(new Date(proposedEntryDate).getTime() + 2 * 60 * 60 * 1000), 'h:mm a')}
                        </p>
                      )}
                    </div>
                    <button 
                      onClick={handleGenerateForm9} 
                      disabled={!proposedEntryDate}
                      className={cn(
                        "w-full px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed",
                        job.type === 'SMOKE_ALARM'
                          ? "bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300"
                          : "bg-slate-700 hover:bg-slate-800 disabled:bg-slate-300"
                      )}
                    >
                      <FileText className="w-4 h-4" />
                      {job.type === 'SMOKE_ALARM' ? 'Generate & Send Form 9 to Tenant' : 'Generate Form 9 (Download Only)'}
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

          )}

          {activeTab === 'schedule' && (
          <div className="p-6 sm:p-8 max-w-4xl">

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

              {/* ── Tenant Notifications ── */}
              {isAdmin && job.status === 'SCHEDULING' && job.scheduledDate && (
                <div className="space-y-2">
                  <button
                    disabled={sendingTenantNotif}
                    onClick={async () => {
                      if (!job.tenantPhone && !job.tenantEmail) {
                        toast.error('No tenant phone or email — add contact details first');
                        return;
                      }
                      setSendingTenantNotif(true);
                      try {
                        const schedDate = new Date(job.scheduledDate!);
                        const endTime = new Date(schedDate.getTime() + 2 * 60 * 60 * 1000);
                        const res = await fetch('/api/notifications/send-tenant', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            type: 'schedule_confirmation',
                            tenantPhone: job.tenantPhone || '',
                            tenantEmail: job.tenantEmail || '',
                            tenantName: job.tenantName || '',
                            propertyAddress: job.propertyAddress || '',
                            scheduledDate: format(schedDate, 'EEEE d MMMM yyyy'),
                            scheduledTime: `${format(schedDate, 'h:mm a')} – ${format(endTime, 'h:mm a')}`,
                            jobId: job.id,
                          }),
                        });
                        const data = await res.json();
                        updateJob(job.id, { 
                          status: 'DISPATCHED' as any,
                          tenantNotifiedAt: new Date().toISOString(),
                          tenantNotificationType: 'schedule_confirmation',
                        } as any);
                        toast.success(`Tenant notified${data.sms?.simulated || data.email?.simulated ? ' (simulated)' : ''} — job moved to Dispatched`);
                      } catch (err) {
                        console.error(err);
                        toast.error('Failed to send tenant notification');
                      } finally {
                        setSendingTenantNotif(false);
                      }
                    }}
                    className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-600/20"
                  >
                    {sendingTenantNotif ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Schedule & Notify Tenant (SMS + Email)
                  </button>
                  <p className="text-xs text-slate-500 text-center">
                    Sends booking confirmation to tenant, moves job to Dispatched. Reminders auto-sent day-before and 1hr-before.
                  </p>
                </div>
              )}

              {/* Send reminder manually */}
              {isAdmin && ['DISPATCHED', 'EXECUTION'].includes(job.status) && (job.tenantPhone || job.tenantEmail) && (
                <div className="flex gap-2">
                  {(['reminder_day_before', 'reminder_1hr_before', 'running_late'] as const).map(type => (
                    <button
                      key={type}
                      disabled={sendingTenantNotif}
                      onClick={async () => {
                        setSendingTenantNotif(true);
                        try {
                          const schedDate = job.scheduledDate ? new Date(job.scheduledDate) : new Date();
                          const endTime = new Date(schedDate.getTime() + 2 * 60 * 60 * 1000);
                          await fetch('/api/notifications/send-tenant', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              type,
                              tenantPhone: job.tenantPhone || '',
                              tenantEmail: job.tenantEmail || '',
                              tenantName: job.tenantName || '',
                              propertyAddress: job.propertyAddress || '',
                              scheduledDate: format(schedDate, 'EEEE d MMMM yyyy'),
                              scheduledTime: `${format(schedDate, 'h:mm a')} – ${format(endTime, 'h:mm a')}`,
                              jobId: job.id,
                              ...(type === 'running_late' ? { newEta: 'approximately 30 minutes later than scheduled' } : {}),
                            }),
                          });
                          toast.success(`${type.replace(/_/g, ' ')} sent to tenant`);
                        } catch (err) {
                          toast.error('Failed to send');
                        } finally {
                          setSendingTenantNotif(false);
                        }
                      }}
                      className={cn(
                        "flex-1 px-2 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 disabled:opacity-50",
                        type === 'running_late'
                          ? 'bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700'
                          : 'bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700'
                      )}
                    >
                      {type === 'reminder_day_before' ? '📅 Day Before' : type === 'reminder_1hr_before' ? '⏰ 1hr Before' : '🏃 Running Late'}
                    </button>
                  ))}
                </div>
              )}

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

          )}

          {(activeTab === 'fieldwork' || activeTab === 'invoice') && (
          <div className="p-6 sm:p-8 max-w-4xl">

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

                  {/* Billing Configuration */}
                  {job.xeroInvoiceId && !job.paymentLinkUrl && (
                    <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-700">Invoice Configuration</h4>
                        {!editingBilling ? (
                          <button
                            onClick={() => setEditingBilling(true)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                          >
                            Edit Billing
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveBilling}
                              className="text-xs px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setBillingRate(job.hourlyRate || 120);
                                setMiscCharges(job.miscCharges || []);
                                setEditingBilling(false);
                              }}
                              className="text-xs px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
                        {/* Labor */}
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-600">Labor:</span>
                            <span className="font-medium text-slate-900">{job.laborHours || 0} hrs</span>
                            {editingBilling ? (
                              <div className="flex items-center gap-1">
                                <span className="text-slate-500">@</span>
                                <span className="text-slate-500">$</span>
                                <input
                                  type="number"
                                  value={billingRate}
                                  onChange={e => setBillingRate(Number(e.target.value))}
                                  className="w-20 px-2 py-1 border border-slate-300 rounded text-sm"
                                  step="10"
                                />
                                <span className="text-slate-500">/hr</span>
                              </div>
                            ) : (
                              <span className="text-slate-500">@ ${job.hourlyRate || billingRate}/hr</span>
                            )}
                          </div>
                          <span className="font-bold text-slate-900">${((job.laborHours || 0) * (job.hourlyRate || billingRate)).toFixed(2)}</span>
                        </div>

                        {/* Materials */}
                        {job.materials.length > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Materials ({job.materials.length} items)</span>
                            <span className="font-bold text-slate-900">${job.materials.reduce((sum, m) => sum + (m.cost * m.quantity), 0).toFixed(2)}</span>
                          </div>
                        )}

                        {/* Misc Charges */}
                        {(job.miscCharges || miscCharges).length > 0 && (
                          <div className="space-y-2">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Additional Charges</div>
                            {(editingBilling ? miscCharges : (job.miscCharges || [])).map(charge => (
                              <div key={charge.id} className="flex items-center gap-2">
                                {editingBilling ? (
                                  <>
                                    <input
                                      type="text"
                                      value={charge.description}
                                      onChange={e => handleUpdateMiscCharge(charge.id, 'description', e.target.value)}
                                      placeholder="Description"
                                      className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm"
                                    />
                                    <div className="flex items-center gap-1">
                                      <span className="text-slate-500">$</span>
                                      <input
                                        type="number"
                                        value={charge.amount}
                                        onChange={e => handleUpdateMiscCharge(charge.id, 'amount', Number(e.target.value))}
                                        className="w-24 px-2 py-1 border border-slate-300 rounded text-sm"
                                        step="0.01"
                                      />
                                    </div>
                                    <button
                                      onClick={() => handleRemoveMiscCharge(charge.id)}
                                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <span className="flex-1 text-sm text-slate-600">{charge.description}</span>
                                    <span className="font-bold text-slate-900 text-sm">${charge.amount.toFixed(2)}</span>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {editingBilling && (
                          <button
                            onClick={handleAddMiscCharge}
                            className="w-full px-3 py-2 border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-lg text-sm text-slate-600 hover:text-slate-700 font-medium transition-colors flex items-center justify-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Add Misc Charge
                          </button>
                        )}

                        {/* Total */}
                        <div className="pt-3 border-t border-slate-300 flex items-center justify-between">
                          <span className="font-bold text-slate-900">Total Invoice</span>
                          <span className="text-2xl font-black text-slate-900">${calculateTotal().toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payment Link Generation */}
                  {job.xeroInvoiceId && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <button
                        onClick={handleGeneratePaymentLink}
                        disabled={!!job.paymentLinkUrl || generatingPaymentLink}
                        className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-500 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        {generatingPaymentLink ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                        {job.paymentLinkUrl ? 'Payment Link Generated' : 'Generate Payment Link for Tech'}
                      </button>

                      {job.paymentLinkUrl && (
                        <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Payment Status</span>
                            <span className={cn(
                              'px-2.5 py-1 rounded-full text-xs font-bold',
                              job.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                              job.paymentStatus === 'failed' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            )}>
                              {job.paymentStatus === 'paid' ? '✓ Paid' :
                               job.paymentStatus === 'failed' ? '✗ Failed' :
                               '⏳ Pending'}
                            </span>
                          </div>
                          {job.amountDue && (
                            <div className="text-center">
                              <div className="text-2xl font-bold text-slate-900">${job.amountDue.toFixed(2)}</div>
                              <div className="text-xs text-slate-500">Amount Due</div>
                            </div>
                          )}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={job.paymentLinkUrl}
                                readOnly
                                className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-mono"
                              />
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(job.paymentLinkUrl!);
                                  toast.success('Payment link copied!');
                                }}
                                className="px-3 py-2 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors"
                              >
                                Copy
                              </button>
                            </div>
                            <button
                              onClick={async () => {
                                const elec = electricians.find(e => e.id === job.assignedElectricianId);
                                if (!elec?.phone) {
                                  toast.error('No phone number for assigned tech');
                                  return;
                                }
                                try {
                                  const res = await fetch('/api/sms/send', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      to: elec.phone,
                                      message: `Payment link ready for job ${job.id} at ${job.propertyAddress}. Amount: $${job.amountDue?.toFixed(2)}. Link: ${job.paymentLinkUrl}`,
                                    }),
                                  });
                                  if (res.ok) {
                                    toast.success(`Payment link sent to ${elec.name}`);
                                  } else {
                                    throw new Error('SMS failed');
                                  }
                                } catch (e) {
                                  toast.error('Failed to send SMS');
                                }
                              }}
                              disabled={!job.assignedElectricianId}
                              className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                            >
                              <Send className="w-3 h-3" />
                              Send Link to Tech via SMS
                            </button>
                          </div>
                          {job.paidAt && (
                            <div className="text-xs text-emerald-600 text-center pt-2 border-t border-slate-200">
                              Paid on {new Date(job.paidAt).toLocaleString('en-AU')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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
          )}
        </div>
      </div>

      {/* ─── Availability Popout Modal ─── */}
      {showAvailability && (() => {
        // For each tech, find their active jobs (not CLOSED) excluding this one
        const BUSY_STATUSES: JobStatus[] = ['SCHEDULING', 'DISPATCHED', 'EXECUTION', 'REVIEW'];
        const techJobs = (techId: string) =>
          jobs.filter(j => j.id !== job.id && j.assignedElectricianId === techId && BUSY_STATUSES.includes(j.status as JobStatus));

        // Check overlap with this job's scheduled time (±4 hours window)
        const isTimeConflict = (techId: string) => {
          if (!job.scheduledDate) return false;
          const jobTime = new Date(job.scheduledDate).getTime();
          return techJobs(techId).some(j => {
            if (!j.scheduledDate) return false;
            const diff = Math.abs(new Date(j.scheduledDate).getTime() - jobTime);
            return diff < 4 * 60 * 60 * 1000; // within 4 hours
          });
        };

        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAvailability(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-200 shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-purple-500" />
                    Technician Availability
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {job.scheduledDate
                      ? <>Checking against: <span className="font-semibold text-slate-700">{format(new Date(job.scheduledDate), 'EEE d MMM, h:mm a')}</span></>
                      : <span className="text-amber-600 font-medium">⚠ No scheduled time set — set a time to detect conflicts</span>}
                  </p>
                </div>
                <button onClick={() => setShowAvailability(false)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tech list */}
              <div className="p-5 space-y-3 overflow-y-auto">
                {electricians.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">No technicians found. Add team members in the Team page.</p>
                ) : (
                  electricians.map(elec => {
                    const isAssigned = elec.id === job.assignedElectricianId;
                    const activeJobs = techJobs(elec.id);
                    const conflict = isTimeConflict(elec.id);
                    const isBusy = activeJobs.length > 0;

                    let statusBadge: React.ReactNode;
                    let cardClass: string;
                    if (isAssigned) {
                      statusBadge = <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">Assigned</span>;
                      cardClass = 'bg-purple-50 border-purple-200';
                    } else if (conflict) {
                      statusBadge = <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">⚠ Time Conflict</span>;
                      cardClass = 'bg-red-50 border-red-200';
                    } else if (isBusy) {
                      statusBadge = <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">Busy ({activeJobs.length} job{activeJobs.length > 1 ? 's' : ''})</span>;
                      cardClass = 'bg-amber-50 border-amber-200';
                    } else {
                      statusBadge = <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">✓ Free</span>;
                      cardClass = 'bg-emerald-50 border-emerald-200';
                    }

                    return (
                      <div key={elec.id} className={cn('rounded-xl border transition-all', cardClass)}>
                        <div className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0',
                              isAssigned ? 'bg-purple-200 text-purple-700'
                              : conflict ? 'bg-red-200 text-red-700'
                              : isBusy ? 'bg-amber-200 text-amber-700'
                              : 'bg-emerald-200 text-emerald-700'
                            )}>
                              {elec.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 text-sm">{elec.name}</p>
                              <p className="text-xs text-slate-500">{elec.phone}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {statusBadge}
                            {!isAssigned && (
                              <button
                                onClick={() => {
                                  updateJob(job.id, { assignedElectricianId: elec.id });
                                  toast.success(`${elec.name} assigned`);
                                  setShowAvailability(false);
                                }}
                                className={cn(
                                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors text-white',
                                  conflict ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-slate-700'
                                )}
                              >
                                {conflict ? 'Assign Anyway' : 'Assign'}
                              </button>
                            )}
                            {isAssigned && (
                              <button
                                onClick={() => {
                                  updateJob(job.id, { assignedElectricianId: '' });
                                  toast.success(`${elec.name} unassigned`);
                                }}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                              >
                                Unassign
                              </button>
                            )}
                          </div>
                        </div>
                        {/* Show conflicting jobs */}
                        {(isBusy || conflict) && !isAssigned && (
                          <div className="px-4 pb-3 space-y-1">
                            {activeJobs.map(aj => (
                              <div key={aj.id} className="flex items-center justify-between text-xs bg-white/70 rounded-lg px-3 py-1.5 border border-slate-200">
                                <span className="font-medium text-slate-700 truncate max-w-[200px]">{aj.propertyAddress || aj.title}</span>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                  <span className={cn(
                                    'px-1.5 py-0.5 rounded text-[10px] font-bold uppercase',
                                    aj.status === 'DISPATCHED' ? 'bg-blue-100 text-blue-700'
                                    : aj.status === 'EXECUTION' ? 'bg-orange-100 text-orange-700'
                                    : 'bg-slate-100 text-slate-600'
                                  )}>{aj.status}</span>
                                  {aj.scheduledDate && <span className="text-slate-400">{format(new Date(aj.scheduledDate), 'MMM d h:mm a')}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="px-5 pb-5 shrink-0">
                <p className="text-[11px] text-slate-400 text-center">
                  Full calendar view in the <button onClick={() => { setShowAvailability(false); navigate('/calendar'); }} className="text-purple-600 hover:underline font-medium">Calendar</button> page.
                </p>
              </div>
            </div>
          </div>
        );
      })()}

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
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(job.rawEmailHtml) }}
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
                    disabled={deleteConfirmText.trim().toUpperCase() !== 'DELETE' || isDeleting}
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
