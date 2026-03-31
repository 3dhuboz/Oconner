-- Add delivery_runs table: groups stops by geographic zone per driver per day
CREATE TABLE IF NOT EXISTS delivery_runs (
  id TEXT PRIMARY KEY,
  delivery_day_id TEXT NOT NULL REFERENCES delivery_days(id),
  name TEXT NOT NULL,
  zone TEXT,
  color TEXT NOT NULL DEFAULT '#1B3A2E',
  driver_uid TEXT REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  sequence INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at INTEGER NOT NULL
);

-- Add run_id to stops (nullable — null means stop is not yet assigned to a run)
ALTER TABLE stops ADD COLUMN run_id TEXT REFERENCES delivery_runs(id);
