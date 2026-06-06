-- Privacy-safe in-house analytics for the admin Insights page.
-- Stores page and product-view events without raw IP addresses or PII.

CREATE TABLE IF NOT EXISTS page_events (
  id            TEXT PRIMARY KEY,
  path          TEXT NOT NULL,
  item_id       TEXT,
  session_hash  TEXT NOT NULL,
  referrer_host TEXT,
  country_code  TEXT,
  device_type   TEXT,
  browser       TEXT,
  os            TEXT,
  created_at    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_page_events_created_at
  ON page_events(created_at);

CREATE INDEX IF NOT EXISTS idx_page_events_path_created
  ON page_events(path, created_at);

CREATE INDEX IF NOT EXISTS idx_page_events_item_created
  ON page_events(item_id, created_at);

CREATE INDEX IF NOT EXISTS idx_page_events_session_created
  ON page_events(session_hash, created_at);
