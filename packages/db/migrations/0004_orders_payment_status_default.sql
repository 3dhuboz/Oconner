-- Flip orders.payment_status default from 'paid' → 'pending_payment'.
--
-- Why: the historical default was 'paid', which made the schema fail-OPEN —
-- any code path that forgot to set paymentStatus would silently mark the
-- order paid. That's exactly how Andrea McDonald's $221 fortnightly box (and
-- $2,210 across 4 customers / 9 deliveries) shipped without ever being
-- charged: the cron job's inline db.insert(orders) omitted paymentStatus,
-- so the column default kicked in.
--
-- PR #117 fixed the three subscription paths to explicitly set
-- paymentStatus='pending_payment', and PR #120 locked down the public
-- mark-paid endpoint. This migration is the third layer: make the schema
-- itself fail-CLOSED so future bugs default to "needs collection" rather
-- than "free delivery."
--
-- SQLite has no ALTER COLUMN SET DEFAULT, so we do the canonical
-- rebuild-and-rename dance. Indexes are recreated below in the same shape
-- they exist on production (confirmed via sqlite_master 2026-05-21).
--
-- No foreign keys point at orders (stops.orderId / audit_log.entityId are
-- plain TEXT references), so the DROP/RENAME is safe without disabling FKs.

CREATE TABLE orders__new (
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
  payment_status TEXT NOT NULL DEFAULT 'pending_payment',
  notes TEXT,
  internal_notes TEXT,
  proof_url TEXT,
  packed_at INTEGER,
  packed_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  fulfillment_type TEXT NOT NULL DEFAULT 'delivery',
  promo_code TEXT,
  promo_discount INTEGER NOT NULL DEFAULT 0
);

-- Explicit column list so a future schema change doesn't accidentally
-- reorder positional copies.
INSERT INTO orders__new (
  id, customer_id, customer_email, customer_name, customer_phone,
  items, subtotal, delivery_fee, gst, total,
  status, delivery_day_id, delivery_address, postcode_zone,
  payment_intent_id, payment_provider, payment_status,
  notes, internal_notes, proof_url, packed_at, packed_by,
  created_at, updated_at, fulfillment_type, promo_code, promo_discount
)
SELECT
  id, customer_id, customer_email, customer_name, customer_phone,
  items, subtotal, delivery_fee, gst, total,
  status, delivery_day_id, delivery_address, postcode_zone,
  payment_intent_id, payment_provider, payment_status,
  notes, internal_notes, proof_url, packed_at, packed_by,
  created_at, updated_at, fulfillment_type, promo_code, promo_discount
FROM orders;

DROP TABLE orders;

ALTER TABLE orders__new RENAME TO orders;

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_delivery_day ON orders(delivery_day_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_day_status_created ON orders(delivery_day_id, status, created_at DESC);
