-- Wirez R Us — Cloudflare D1 schema
-- Run via: wrangler d1 execute wirez-r-us-db --file=migrations/001_initial.sql

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'INTAKE',
  type TEXT,
  urgency TEXT,
  assigned_electrician_id TEXT,
  property_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS electricians (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL DEFAULT '{}',
  name TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS parts_catalog (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,   -- Clerk user ID
  data TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS tech_locations (
  uid TEXT PRIMARY KEY,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  accuracy REAL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tech_stock (
  id TEXT PRIMARY KEY,            -- {techId}_{partId}
  data TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL DEFAULT '{}',
  technician_id TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_movements_tech ON stock_movements(technician_id);
CREATE INDEX IF NOT EXISTS idx_movements_ts ON stock_movements(timestamp);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_assigned ON jobs(assigned_electrician_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_property ON jobs(property_address);
