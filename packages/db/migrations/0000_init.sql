CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'staff',
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  addresses TEXT NOT NULL DEFAULT '[]',
  account_type TEXT NOT NULL DEFAULT 'registered',
  order_count INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,
  blacklisted INTEGER NOT NULL DEFAULT 0,
  blacklist_reason TEXT,
  notes TEXT NOT NULL DEFAULT '',
  clerk_id TEXT UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  abn TEXT NOT NULL DEFAULT '',
  payment_terms TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  is_meat_pack INTEGER NOT NULL DEFAULT 0,
  price_per_kg INTEGER,
  fixed_price INTEGER,
  weight_options TEXT,
  pack_contents TEXT,
  image_url TEXT NOT NULL DEFAULT '',
  stock_on_hand REAL NOT NULL DEFAULT 0,
  min_threshold REAL NOT NULL DEFAULT 0,
  max_stock REAL,
  supplier_id TEXT REFERENCES suppliers(id),
  active INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  gst_applicable INTEGER NOT NULL DEFAULT 1,
  seasonal_start INTEGER,
  seasonal_end INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS delivery_days (
  id TEXT PRIMARY KEY,
  date INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  frozen INTEGER NOT NULL DEFAULT 0,
  cutoff_time INTEGER NOT NULL,
  max_orders INTEGER NOT NULL DEFAULT 50,
  order_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  route_generated INTEGER NOT NULL DEFAULT 0,
  route_generated_at INTEGER,
  driver_uid TEXT REFERENCES users(id),
  run_started_at INTEGER,
  run_completed_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL DEFAULT '',
  items TEXT NOT NULL,
  subtotal INTEGER NOT NULL,
  delivery_fee INTEGER NOT NULL,
  gst INTEGER NOT NULL,
  total INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_payment',
  delivery_day_id TEXT NOT NULL REFERENCES delivery_days(id),
  delivery_address TEXT NOT NULL,
  postcode_zone TEXT NOT NULL DEFAULT '',
  payment_intent_id TEXT NOT NULL DEFAULT '',
  payment_provider TEXT NOT NULL DEFAULT 'stripe',
  payment_status TEXT NOT NULL DEFAULT 'paid',
  notes TEXT,
  internal_notes TEXT,
  proof_url TEXT,
  packed_at INTEGER,
  packed_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS stops (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  delivery_day_id TEXT NOT NULL REFERENCES delivery_days(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL,
  items TEXT NOT NULL,
  sequence INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  estimated_arrival INTEGER,
  completed_at INTEGER,
  proof_url TEXT,
  lat REAL,
  lng REAL,
  customer_note TEXT,
  driver_note TEXT,
  flag_reason TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS driver_sessions (
  id TEXT PRIMARY KEY,
  driver_uid TEXT NOT NULL REFERENCES users(id),
  driver_name TEXT NOT NULL,
  delivery_day_id TEXT NOT NULL REFERENCES delivery_days(id),
  active INTEGER NOT NULL DEFAULT 1,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  last_lat REAL NOT NULL DEFAULT 0,
  last_lng REAL NOT NULL DEFAULT 0,
  last_updated INTEGER NOT NULL,
  breadcrumb TEXT NOT NULL DEFAULT '[]',
  total_stops INTEGER NOT NULL DEFAULT 0,
  completed_stops INTEGER NOT NULL DEFAULT 0,
  flagged_stops INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  type TEXT NOT NULL,
  qty REAL NOT NULL,
  unit TEXT NOT NULL,
  reason TEXT,
  order_id TEXT,
  supplier_id TEXT,
  stocktake_session_id TEXT,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS stocktake_sessions (
  id TEXT PRIMARY KEY,
  date INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress',
  categories TEXT NOT NULL DEFAULT '[]',
  items TEXT NOT NULL DEFAULT '[]',
  total_variance_kg REAL NOT NULL DEFAULT 0,
  total_variance_value INTEGER NOT NULL DEFAULT 0,
  approved_by TEXT,
  approved_at INTEGER,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id),
  email TEXT NOT NULL,
  box_id TEXT NOT NULL,
  box_name TEXT NOT NULL,
  frequency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  customer_id TEXT,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  recipient_email TEXT NOT NULL,
  resend_id TEXT,
  error TEXT,
  sent_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before TEXT NOT NULL DEFAULT '{}',
  after TEXT NOT NULL DEFAULT '{}',
  admin_uid TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT 'system'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_day ON orders(delivery_day_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stops_delivery_day ON stops(delivery_day_id);
CREATE INDEX IF NOT EXISTS idx_stops_order ON stops(order_id);
CREATE INDEX IF NOT EXISTS idx_driver_sessions_active ON driver_sessions(active);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active, display_order);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_delivery_days_date ON delivery_days(date, active);
