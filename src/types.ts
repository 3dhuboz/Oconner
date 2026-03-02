export type JobStatus = 
  | 'INTAKE' 
  | 'SCHEDULING' 
  | 'DISPATCHED' 
  | 'EXECUTION' 
  | 'REVIEW' 
  | 'CLOSED';

export type JobType = 'GENERAL_REPAIR' | 'SMOKE_ALARM' | 'INSTALLATION' | 'ELECTRICAL' | 'EMERGENCY' | 'MAINTENANCE' | 'INSPECTION' | 'SAFETY_SWITCH' | 'LIGHTING' | 'POWER_POINT' | 'HOT_WATER' | 'FAN' | 'APPLIANCE' | 'SWITCHBOARD';

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

export interface TimeEntry {
  type: 'clock_on' | 'break_start' | 'break_end' | 'clock_off';
  timestamp: string; // ISO string
}

export interface CatalogPart {
  id: string;
  name: string;
  defaultCost: number;
  category?: string;
}


export interface Job {
  id: string;
  title: string;
  type: JobType;
  status: JobStatus;
  createdAt: string;
  
  description?: string; // auto-populated work order details

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
  timeLog?: TimeEntry[];
  materials: Material[];
  photos: string[]; // URLs
  siteNotes?: string;
  hazardsFound?: string;

  // Phase 4: Office Admin & Close-out
  xeroInvoiceId?: string;
  complianceReportGenerated?: boolean;

  // Billing Configuration (admin-controlled)
  hourlyRate?: number; // Admin-set rate for this job
  miscCharges?: Array<{ id: string; description: string; amount: number }>;

  // Payment (Stripe Payment Links for field collection)
  paymentLinkUrl?: string;
  paymentLinkId?: string;
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  amountDue?: number;
  paidAt?: string;
  paymentIntentId?: string;

  // Email source data (when job created from inbound email)
  source?: string;
  extractionMethod?: string;
  detectedSoftware?: string;
  urgency?: string;
  rawEmailFrom?: string;
  rawEmailSubject?: string;
  rawEmailBody?: string;
  rawEmailHtml?: string;

  // AI parse review
  aiNeedsReview?: boolean;
  aiConfidence?: {
    tenantName: number;
    tenantPhone: number;
    tenantEmail: number;
    propertyAddress: number;
    issueDescription: number;
    overall: number;
  };

  // Extended contact info from AI
  propertyManagerName?: string;
  agency?: string;

  // Email processing tracking
  emailProcessed?: boolean;
  emailProcessedAt?: string;
  hasFollowUpEmail?: boolean;
  lastFollowUpAt?: string;

  // Pause/resume
  pausedAt?: string;
  pauseReason?: string;
  needsReschedule?: boolean;
  completionOverrideReason?: string;
}

export interface Electrician {
  id: string;
  name: string;
  phone: string;
  email: string;
}

// Licensing & User Management Types

export type UserRole = 'dev' | 'admin' | 'user';

export type LicenseType = 'admin' | 'technician';
export type LicenseStatus = 'active' | 'suspended' | 'expired' | 'pending';

export interface License {
  id: string;
  tenantId: string; // the customer org this license belongs to
  type: LicenseType;
  assignedTo?: string; // uid of the user assigned to this license
  assignedEmail?: string;
  assignedName?: string;
  status: LicenseStatus;
  createdAt: string;
  expiresAt?: string;
  stripeSubscriptionId?: string;
  isIncluded: boolean; // true if part of the base package (1 admin + 1 tech)
}

export interface Tenant {
  id: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  createdAt: string;
  stripeCustomerId?: string;
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'pending_payment';
  adminLicenses: number; // total admin licenses (always 1 in starter)
  techLicenses: number;  // total tech licenses (1 included, extra charged)
  maxTechLicenses: number; // limit based on plan
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  tenantId?: string; // links to Tenant.id (customers)
  licenseId?: string; // links to License.id
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
}
