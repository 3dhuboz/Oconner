-- Auth support-code trace
--
-- Stores diagnostic metadata for rejected Clerk sessions. This is deliberately
-- token-free: support can look up a code shown in the UI and see the Clerk id,
-- issuer, email hints, route, and timestamp that caused the denial.

CREATE TABLE IF NOT EXISTS auth_failures (
  id           TEXT PRIMARY KEY,
  support_id   TEXT NOT NULL UNIQUE,
  code         TEXT NOT NULL,
  clerk_id     TEXT,
  issuer       TEXT,
  token_emails TEXT NOT NULL DEFAULT '[]',
  path         TEXT NOT NULL DEFAULT '',
  user_agent   TEXT NOT NULL DEFAULT '',
  created_at   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_failures_created_at
  ON auth_failures(created_at);

CREATE INDEX IF NOT EXISTS idx_auth_failures_clerk_id
  ON auth_failures(clerk_id);
