import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// ── Auth / Staff ─────────────────────────────────────────────────────────────
// Mirrors Clerk users; clerkId is the Clerk user ID
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),            // Clerk user ID
  email: text('email').notNull().unique(),
  name: text('name').notNull().default(''),
  role: text('role').notNull().default('staff'), // 'admin' | 'staff' | 'driver'
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// ── Customers ─────────────────────────────────────────────────────────────────
export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),            // UUID
  email: text('email').notNull().unique(),
  phone: text('phone').notNull().default(''),
  name: text('name').notNull(),
  addresses: text('addresses').notNull().default('[]'), // JSON: Address[]
  accountType: text('account_type').notNull().default('registered'), // 'registered' | 'guest'
  orderCount: integer('order_count').notNull().default(0),
  totalSpent: integer('total_spent').notNull().default(0), // cents
  blacklisted: integer('blacklisted', { mode: 'boolean' }).notNull().default(false),
  blacklistReason: text('blacklist_reason'),
  notes: text('notes').notNull().default(''),
  clerkId: text('clerk_id').unique(),     // set when customer creates an account
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// ── Suppliers ─────────────────────────────────────────────────────────────────
export const suppliers = sqliteTable('suppliers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  contactName: text('contact_name').notNull().default(''),
  phone: text('phone').notNull().default(''),
  email: text('email').notNull().default(''),
  abn: text('abn').notNull().default(''),
  paymentTerms: text('payment_terms').notNull().default(''),
  notes: text('notes').notNull().default(''),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull(),
});

// ── Products ──────────────────────────────────────────────────────────────────
export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  category: text('category').notNull(),  // 'beef' | 'lamb' | 'pork' | 'chicken' | 'packs'
  isMeatPack: integer('is_meat_pack', { mode: 'boolean' }).notNull().default(false),
  pricePerKg: integer('price_per_kg'),   // cents/kg, null for packs
  fixedPrice: integer('fixed_price'),    // cents, null for loose cuts
  weightOptions: text('weight_options'), // JSON: number[] (grams), null for packs
  packContents: text('pack_contents'),
  imageUrl: text('image_url').notNull().default(''),
  stockOnHand: real('stock_on_hand').notNull().default(0), // kg or units
  minThreshold: real('min_threshold').notNull().default(0),
  maxStock: real('max_stock'),
  supplierId: text('supplier_id').references(() => suppliers.id),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  displayOrder: integer('display_order').notNull().default(0),
  gstApplicable: integer('gst_applicable', { mode: 'boolean' }).notNull().default(true),
  seasonalStart: integer('seasonal_start'), // unix ms
  seasonalEnd: integer('seasonal_end'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// ── Delivery Days ─────────────────────────────────────────────────────────────
export const deliveryDays = sqliteTable('delivery_days', {
  id: text('id').primaryKey(),
  date: integer('date').notNull(),       // unix ms (start of day)
  dayOfWeek: integer('day_of_week').notNull(), // 0=Sun
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  frozen: integer('frozen', { mode: 'boolean' }).notNull().default(false),
  cutoffTime: integer('cutoff_time').notNull(), // unix ms
  maxOrders: integer('max_orders').notNull().default(50),
  orderCount: integer('order_count').notNull().default(0),
  notes: text('notes'),
  routeGenerated: integer('route_generated', { mode: 'boolean' }).notNull().default(false),
  routeGeneratedAt: integer('route_generated_at'),
  deliveryWindowStart: text('delivery_window_start').default('09:00'), // HH:MM 24-hr
  driverUid: text('driver_uid').references(() => users.id),
  runStartedAt: integer('run_started_at'),
  runCompletedAt: integer('run_completed_at'),
  createdAt: integer('created_at').notNull(),
});

// ── Orders ────────────────────────────────────────────────────────────────────
export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id),
  customerEmail: text('customer_email').notNull(),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull().default(''),
  items: text('items').notNull(),        // JSON: OrderItem[]
  subtotal: integer('subtotal').notNull(),        // cents
  deliveryFee: integer('delivery_fee').notNull(), // cents
  gst: integer('gst').notNull(),                  // cents
  total: integer('total').notNull(),              // cents
  status: text('status').notNull().default('pending_payment'),
  deliveryDayId: text('delivery_day_id').notNull().references(() => deliveryDays.id),
  deliveryAddress: text('delivery_address').notNull(), // JSON: Address
  postcodeZone: text('postcode_zone').notNull().default(''),
  paymentIntentId: text('payment_intent_id').notNull().default(''),
  paymentProvider: text('payment_provider').notNull().default('stripe'),
  paymentStatus: text('payment_status').notNull().default('paid'),
  notes: text('notes'),
  internalNotes: text('internal_notes'),
  proofUrl: text('proof_url'),
  packedAt: integer('packed_at'),
  packedBy: text('packed_by'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// ── Delivery Runs ─────────────────────────────────────────────────────────────
// A "run" is a geographic grouping of stops for one driver on one delivery day.
// One delivery day can have multiple runs (e.g. Rockhampton + Gladstone).
export const deliveryRuns = sqliteTable('delivery_runs', {
  id: text('id').primaryKey(),
  deliveryDayId: text('delivery_day_id').notNull().references(() => deliveryDays.id),
  name: text('name').notNull(),           // e.g. "Rockhampton North"
  zone: text('zone'),                     // postcode zone label
  color: text('color').notNull().default('#1B3A2E'), // hex for map/UI
  driverUid: text('driver_uid').references(() => users.id),
  status: text('status').notNull().default('pending'), // 'pending'|'in_progress'|'completed'
  sequence: integer('sequence').notNull().default(0),
  notes: text('notes'),
  createdAt: integer('created_at').notNull(),
});

// ── Stops ─────────────────────────────────────────────────────────────────────
export const stops = sqliteTable('stops', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id),
  deliveryDayId: text('delivery_day_id').notNull().references(() => deliveryDays.id),
  runId: text('run_id').references(() => deliveryRuns.id), // nullable; null = unassigned
  customerId: text('customer_id').notNull().references(() => customers.id),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull().default(''),
  address: text('address').notNull(),    // JSON: Address
  items: text('items').notNull(),        // JSON: OrderItem[]
  sequence: integer('sequence').notNull().default(0),
  status: text('status').notNull().default('pending'),
  estimatedArrival: integer('estimated_arrival'),
  completedAt: integer('completed_at'),
  proofUrl: text('proof_url'),
  lat: real('lat'),
  lng: real('lng'),
  customerNote: text('customer_note'),
  driverNote: text('driver_note'),
  flagReason: text('flag_reason'),
  createdAt: integer('created_at').notNull(),
});

// ── Driver Sessions ───────────────────────────────────────────────────────────
export const driverSessions = sqliteTable('driver_sessions', {
  id: text('id').primaryKey(),
  driverUid: text('driver_uid').notNull().references(() => users.id),
  driverName: text('driver_name').notNull(),
  deliveryDayId: text('delivery_day_id').notNull().references(() => deliveryDays.id),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  startedAt: integer('started_at').notNull(),
  completedAt: integer('completed_at'),
  lastLat: real('last_lat').notNull().default(0),
  lastLng: real('last_lng').notNull().default(0),
  lastUpdated: integer('last_updated').notNull(),
  breadcrumb: text('breadcrumb').notNull().default('[]'), // JSON: {lat,lng,ts}[]
  totalStops: integer('total_stops').notNull().default(0),
  completedStops: integer('completed_stops').notNull().default(0),
  flaggedStops: integer('flagged_stops').notNull().default(0),
});

// ── Stock Movements ───────────────────────────────────────────────────────────
export const stockMovements = sqliteTable('stock_movements', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id),
  productName: text('product_name').notNull(),
  type: text('type').notNull(), // 'sale' | 'adjustment' | 'stocktake_correction' | 'wastage' | 'supplier_delivery'
  qty: real('qty').notNull(),   // positive = in, negative = out
  unit: text('unit').notNull(), // 'kg' | 'units'
  reason: text('reason'),
  orderId: text('order_id'),
  supplierId: text('supplier_id'),
  stocktakeSessionId: text('stocktake_session_id'),
  createdBy: text('created_by').notNull(),
  createdAt: integer('created_at').notNull(),
});

// ── Stocktake Sessions ────────────────────────────────────────────────────────
export const stocktakeSessions = sqliteTable('stocktake_sessions', {
  id: text('id').primaryKey(),
  date: integer('date').notNull(),
  status: text('status').notNull().default('in_progress'), // 'in_progress' | 'completed'
  categories: text('categories').notNull().default('[]'), // JSON: string[]
  items: text('items').notNull().default('[]'),           // JSON: StocktakeItem[]
  totalVarianceKg: real('total_variance_kg').notNull().default(0),
  totalVarianceValue: integer('total_variance_value').notNull().default(0), // cents
  approvedBy: text('approved_by'),
  approvedAt: integer('approved_at'),
  createdBy: text('created_by').notNull(),
  createdAt: integer('created_at').notNull(),
});

// ── Subscriptions ─────────────────────────────────────────────────────────────
export const subscriptions = sqliteTable('subscriptions', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').references(() => customers.id),
  email: text('email').notNull(),
  boxId: text('box_id').notNull(),
  boxName: text('box_name').notNull(),
  alternateBoxId: text('alternate_box_id'),
  alternateBoxName: text('alternate_box_name'),
  nextIsAlternate: integer('next_is_alternate', { mode: 'boolean' }).notNull().default(false),
  frequency: text('frequency').notNull(), // 'weekly' | 'fortnightly' | 'monthly'
  status: text('status').notNull().default('active'), // 'active' | 'paused' | 'cancelled'
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// ── Push Subscriptions ────────────────────────────────────────────────────────
export const pushSubscriptions = sqliteTable('push_subscriptions', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: integer('created_at').notNull(),
});

// ── Notification Log ──────────────────────────────────────────────────────────
export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  orderId: text('order_id'),
  customerId: text('customer_id'),
  type: text('type').notNull(), // 'order_confirmation' | 'day_before' | 'out_for_delivery' | etc.
  status: text('status').notNull().default('sent'), // 'sent' | 'failed'
  recipientEmail: text('recipient_email').notNull(),
  resendId: text('resend_id'),
  error: text('error'),
  sentAt: integer('sent_at').notNull(),
});

// ── Audit Log ─────────────────────────────────────────────────────────────────
export const auditLog = sqliteTable('audit_log', {
  id: text('id').primaryKey(),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id').notNull(),
  before: text('before').notNull().default('{}'), // JSON
  after: text('after').notNull().default('{}'),   // JSON
  adminUid: text('admin_uid').notNull(),
  adminEmail: text('admin_email').notNull(),
  timestamp: integer('timestamp').notNull(),
});

// ── Config (key/value store for BusinessConfig, DeliveryZones, etc.) ──────────
export const config = sqliteTable('config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(), // JSON
  updatedAt: integer('updated_at').notNull(),
  updatedBy: text('updated_by').notNull().default('system'),
});
