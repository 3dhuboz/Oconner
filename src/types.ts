export type JobStatus = 
  | 'INTAKE' 
  | 'SCHEDULING' 
  | 'DISPATCHED' 
  | 'EXECUTION' 
  | 'REVIEW' 
  | 'CLOSED';

export type JobType = 'GENERAL_REPAIR' | 'SMOKE_ALARM' | 'INSTALLATION';

export interface ContactAttempt {
  id: string;
  date: string;
  method: 'CALL' | 'EMAIL' | 'SMS';
  successful: boolean;
  notes: string;
}

export interface Material {
  id: string;
  name: string;
  quantity: number;
  cost: number;
}

export interface Job {
  id: string;
  title: string;
  type: JobType;
  status: JobStatus;
  createdAt: string;
  
  // Phase 1: Intake & Coordination
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string;
  propertyAddress: string;
  propertyManagerEmail?: string;
  contactAttempts: ContactAttempt[];
  form9Sent?: boolean;
  form9SentAt?: string;

  // Phase 2: Scheduling & Dispatch
  assignedElectricianId?: string;
  scheduledDate?: string;
  accessCodes?: string;
  workOrderUrl?: string;

  // Phase 3: Field Execution
  laborHours?: number;
  materials: Material[];
  photos: string[]; // URLs
  siteNotes?: string;
  hazardsFound?: string;

  // Phase 4: Office Admin & Close-out
  xeroInvoiceId?: string;
  complianceReportGenerated?: boolean;
}

export interface Electrician {
  id: string;
  name: string;
  phone: string;
  email: string;
}
