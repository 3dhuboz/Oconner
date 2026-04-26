-- Targeted indexes flagged by the multi-specialist audit (PR for batch 2).
--
-- Why each:
-- - orders(delivery_day_id, status, created_at DESC)
--     Hot path for the manifest + dashboard filters.
-- - stops(delivery_day_id, sequence)
--     Route generation and the live tracker iterate stops in sequence per day.
-- - delivery_day_stock(delivery_day_id, product_id)
--     reserveDayStock + checkout validation lookup by (day, product) on every
--     incoming order.
-- - driver_sessions(active, delivery_day_id)
--     Live tracker polls "active session for today" every 10 seconds.
-- - notifications(order_id, type)
--     SMS dedupe (alreadySent helper) reads by (order_id, type).
--
-- Applied to the live D1 in the same operation that created this file. Fresh
-- environments will pick them up via `wrangler d1 migrations apply`.
CREATE INDEX IF NOT EXISTS idx_orders_day_status_created ON orders(delivery_day_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stops_day_seq ON stops(delivery_day_id, sequence);
CREATE INDEX IF NOT EXISTS idx_delivery_day_stock_day_product ON delivery_day_stock(delivery_day_id, product_id);
CREATE INDEX IF NOT EXISTS idx_driver_sessions_active_day ON driver_sessions(active, delivery_day_id);
CREATE INDEX IF NOT EXISTS idx_notifications_order_type ON notifications(order_id, type);
