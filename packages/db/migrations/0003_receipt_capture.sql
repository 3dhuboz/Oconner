-- Receipt capture mini-app
-- Adds multi-tenant foundation (businesses + business_members) and the
-- receipts table that backs the new admin "Receipts" page.
--
-- Seamus is being chased by his bookkeeper to upload receipts into Hubdoc
-- every quarter for the BAS. He has zero time to sit at a computer. This
-- migration sets up the data model for the in-admin capture flow: snap a
-- photo on phone → save to R2 + receipts table → auto-email it to the
-- business's Hubdoc inbox so it flows into the existing pipeline.
--
-- Multi-tenant is built in from day one (businesses + business_members) so
-- the same app can host a second business later — Steve picked this scope
-- in the planning conversation. Today only one row exists in `businesses`:
-- O'Connor Agriculture, populated by this migration.

CREATE TABLE businesses (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  hubdoc_email  TEXT,
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

CREATE TABLE business_members (
  id          TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  user_id     TEXT NOT NULL REFERENCES users(id),
  role        TEXT NOT NULL DEFAULT 'owner',
  created_at  INTEGER NOT NULL,
  UNIQUE(business_id, user_id)
);

-- Hot path: "what businesses am I in?" runs on every authed request.
CREATE INDEX idx_business_members_user ON business_members(user_id);

CREATE TABLE receipts (
  id                    TEXT PRIMARY KEY,
  business_id           TEXT NOT NULL REFERENCES businesses(id),
  captured_by_uid       TEXT NOT NULL REFERENCES users(id),
  photo_key             TEXT NOT NULL,
  content_type          TEXT NOT NULL DEFAULT 'image/jpeg',
  notes                 TEXT,
  amount_cents          INTEGER,
  merchant              TEXT,
  hubdoc_forwarded_at   INTEGER,
  hubdoc_forward_error  TEXT,
  captured_at           INTEGER NOT NULL,
  created_at            INTEGER NOT NULL,
  updated_at            INTEGER NOT NULL
);

-- Hot path: receipts list in admin pages by (business, recency).
CREATE INDEX idx_receipts_business_created ON receipts(business_id, created_at DESC);

-- Seed: O'Connor Agriculture as the first (and currently only) business.
-- The id stays stable across environments so the admin UI can default to
-- it without an extra lookup. hubdoc_email is NULL until Steve fills it
-- in via admin Settings → Receipts.
INSERT INTO businesses (id, name, slug, hubdoc_email, active, created_at, updated_at)
VALUES (
  'biz-oconnor-agriculture',
  'O''Connor Agriculture',
  'oconnor-agriculture',
  NULL,
  1,
  (strftime('%s','now') * 1000),
  (strftime('%s','now') * 1000)
);

-- Add every existing admin/staff user as a member of O'Connor. Admins become
-- 'owner', staff become 'member'. Drivers are not auto-added — they don't
-- need to upload receipts.
INSERT INTO business_members (id, business_id, user_id, role, created_at)
SELECT
  lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' ||
    lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' ||
    lower(hex(randomblob(6))),
  'biz-oconnor-agriculture',
  id,
  CASE WHEN role = 'admin' THEN 'owner' ELSE 'member' END,
  (strftime('%s','now') * 1000)
FROM users
WHERE role IN ('admin', 'staff');
