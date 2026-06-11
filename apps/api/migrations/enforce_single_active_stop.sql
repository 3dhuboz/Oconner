-- Guardrail for live driver routing: only one stop may be active
-- (`en_route` or `arrived`) for a delivery day at any time.
CREATE UNIQUE INDEX IF NOT EXISTS idx_stops_one_active_per_day
ON stops(delivery_day_id)
WHERE status IN ('en_route', 'arrived');
