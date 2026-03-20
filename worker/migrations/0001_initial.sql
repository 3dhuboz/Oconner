-- Wirez R Us — D1 Schema Migration
-- Converts 10 Firestore collections to relational tables

-- ─── Tenants (customer organisations) ─────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(12)))),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  contact_phone TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  stripe_customer_id TEXT,
  plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'professional', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending_payment')),
  admin_licenses INTEGER NOT NULL DEFAULT 1,
  tech_licenses INTEGER NOT NULL DEFAULT 1,
  max_tech_licenses INTEGER NOT NULL DEFAULT 5
);

-- ─── User Profiles ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  uid TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('dev', 'admin', 'user')),
  tenant_id TEXT REFERENCES tenants(id),
  license_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login TEXT,
  is_active INTEGER NOT NULL DEFAULT 1
);

-- ─── Licenses ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS licenses (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(12)))),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  type TEXT NOT NULL CHECK (type IN ('admin', 'technician')),
  assigned_to TEXT REFERENCES user_profiles(uid),
  assigned_email TEXT,
  assigned_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired', 'pending')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,
  stripe_subscription_id TEXT,
  is_included INTEGER NOT NULL DEFAULT 0
);

-- ─── Electricians (technician directory) ──────────────────────
CREATE TABLE IF NOT EXISTS electricians (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(12)))),
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT ''
);

-- ─── Jobs (core work orders) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY DEFAULT ('WO-' || strftime('%s', 'now') || '-' || lower(hex(randomblob(4)))),
  title TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'GENERAL_REPAIR',
  status TEXT NOT NULL DEFAULT 'INTAKE',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  description TEXT DEFAULT '',

  -- Intake
  tenant_name TEXT NOT NULL DEFAULT '',
  tenant_phone TEXT NOT NULL DEFAULT '',
  tenant_email TEXT NOT NULL DEFAULT '',
  property_address TEXT NOT NULL DEFAULT '',
  property_manager_email TEXT DEFAULT '',
  property_manager_name TEXT DEFAULT '',
  agency TEXT DEFAULT '',
  form9_sent INTEGER DEFAULT 0,
  form9_sent_at TEXT,

  -- Scheduling
  assigned_electrician_id TEXT REFERENCES electricians(id),
  scheduled_date TEXT,
  access_codes TEXT DEFAULT '',
  work_order_url TEXT DEFAULT '',

  -- Field execution
  labor_hours REAL DEFAULT 0,
  site_notes TEXT DEFAULT '',
  hazards_found TEXT DEFAULT '',

  -- Close-out
  xero_invoice_id TEXT,
  compliance_report_generated INTEGER DEFAULT 0,

  -- Billing
  hourly_rate REAL,

  -- Payment (Stripe)
  payment_link_url TEXT,
  payment_link_id TEXT,
  payment_status TEXT DEFAULT 'pending',
  amount_due REAL,
  paid_at TEXT,
  payment_intent_id TEXT,

  -- Email source
  source TEXT,
  extraction_method TEXT,
  detected_software TEXT,
  urgency TEXT DEFAULT 'NORMAL',
  raw_email_from TEXT,
  raw_email_subject TEXT,
  raw_email_body TEXT,
  raw_email_html TEXT,
  gmail_message_id TEXT,
  email_processed INTEGER DEFAULT 0,
  email_processed_at TEXT,
  has_follow_up_email INTEGER DEFAULT 0,
  last_follow_up_at TEXT,

  -- AI parse
  ai_needs_review INTEGER DEFAULT 0,
  ai_confidence TEXT,  -- JSON string

  -- Pause/resume
  paused_at TEXT,
  pause_reason TEXT,
  needs_reschedule INTEGER DEFAULT 0,
  completion_override_reason TEXT,

  -- Finish job email
  finished_job_email_sent INTEGER DEFAULT 0,
  finished_job_email_sent_at TEXT,
  finished_job_email_to TEXT,
  finished_job_doc_type TEXT,

  -- Tenant notification
  tenant_notified_at TEXT,
  tenant_notification_type TEXT,

  -- Running late
  running_late_notified INTEGER DEFAULT 0,
  running_late_notified_at TEXT,

  -- Compliance
  compliance_notes TEXT DEFAULT '',
  compliance_notes2 TEXT DEFAULT '',
  compliance_inspector_name TEXT DEFAULT '',
  compliance_licence_no TEXT DEFAULT '',
  compliance_date TEXT,
  compliance_email_sent_to TEXT,
  compliance_email_sent_at TEXT,
  compliance_wo_number TEXT,
  compliance_client_ref TEXT,
  compliance_smoke_alarms_tick INTEGER DEFAULT 0,
  compliance_safety_switch_tick INTEGER DEFAULT 0
);

-- ─── Job nested arrays → separate tables ─────────────────────

CREATE TABLE IF NOT EXISTS job_contact_attempts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(12)))),
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('CALL', 'EMAIL', 'SMS')),
  successful INTEGER NOT NULL DEFAULT 0,
  notes TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS job_time_entries (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(12)))),
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('clock_on', 'break_start', 'break_end', 'clock_off')),
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS job_materials (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(12)))),
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  cost REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS job_photos (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(12)))),
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS job_misc_charges (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(12)))),
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS job_smoke_alarms (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(12)))),
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  voltage TEXT DEFAULT 'unknown',
  type TEXT DEFAULT 'unknown',
  expires TEXT DEFAULT '',
  location TEXT DEFAULT '',
  level TEXT DEFAULT '',
  install_reason TEXT DEFAULT '',
  tested INTEGER DEFAULT 0,
  passed INTEGER DEFAULT 0,
  replaced INTEGER DEFAULT 0,
  notes TEXT DEFAULT ''
);

-- ─── Parts Catalog ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parts_catalog (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(12)))),
  name TEXT NOT NULL,
  default_cost REAL NOT NULL DEFAULT 0,
  category TEXT DEFAULT '',
  barcode TEXT DEFAULT '',
  supplier TEXT DEFAULT '',
  cost_price REAL DEFAULT 0,
  sell_price REAL DEFAULT 0,
  synced_from_pricing INTEGER DEFAULT 0
);

-- ─── Tech Stock (per-technician inventory) ────────────────────
CREATE TABLE IF NOT EXISTS tech_stock (
  id TEXT PRIMARY KEY,  -- compound: {locationId}_{partId}
  part_id TEXT NOT NULL REFERENCES parts_catalog(id),
  part_name TEXT NOT NULL DEFAULT '',
  barcode TEXT DEFAULT '',
  technician_id TEXT NOT NULL,
  technician_name TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 0,
  sell_price REAL DEFAULT 0,
  cost_price REAL DEFAULT 0,
  last_updated TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Stock Movements (audit trail) ────────────────────────────
CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(12)))),
  part_id TEXT NOT NULL,
  part_name TEXT NOT NULL DEFAULT '',
  barcode TEXT DEFAULT '',
  technician_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('stock_in', 'stock_out', 'adjust', 'transfer')),
  quantity INTEGER NOT NULL,
  job_id TEXT,
  reason TEXT DEFAULT '',
  from_location TEXT DEFAULT '',
  to_location TEXT DEFAULT '',
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Tech Locations (GPS tracking) ────────────────────────────
CREATE TABLE IF NOT EXISTS tech_locations (
  uid TEXT PRIMARY KEY,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  accuracy REAL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Settings (key-value config store) ────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '{}'  -- JSON blob
);

-- ─── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_address ON jobs(property_address);
CREATE INDEX IF NOT EXISTS idx_jobs_assigned ON jobs(assigned_electrician_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant ON user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_licenses_tenant ON licenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tech_stock_tech ON tech_stock(technician_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_part ON stock_movements(part_id);
CREATE INDEX IF NOT EXISTS idx_job_materials_job ON job_materials(job_id);
CREATE INDEX IF NOT EXISTS idx_job_photos_job ON job_photos(job_id);
CREATE INDEX IF NOT EXISTS idx_job_contact_attempts_job ON job_contact_attempts(job_id);
CREATE INDEX IF NOT EXISTS idx_job_time_entries_job ON job_time_entries(job_id);
