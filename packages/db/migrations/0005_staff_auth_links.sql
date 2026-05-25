-- Durable staff auth links
--
-- Staff users are the app's permission records. Clerk ids are auth-provider
-- identifiers and can drift when a Clerk user is recreated, a browser keeps an
-- older customer/admin identity, or a project accidentally mixes test/live
-- Clerk apps. This table lets one active staff user have multiple trusted
-- Clerk ids without changing the users primary key or breaking references.

CREATE TABLE IF NOT EXISTS staff_auth_links (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  clerk_id    TEXT NOT NULL UNIQUE,
  email       TEXT NOT NULL,
  source      TEXT NOT NULL DEFAULT 'manual',
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_staff_auth_links_user
  ON staff_auth_links(user_id);

CREATE INDEX IF NOT EXISTS idx_staff_auth_links_email
  ON staff_auth_links(email);

-- Seed direct staff Clerk ids.
INSERT OR IGNORE INTO staff_auth_links (
  id, user_id, clerk_id, email, source, active, created_at, updated_at
)
SELECT
  lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' ||
    lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' ||
    lower(hex(randomblob(6))),
  id,
  id,
  email,
  'users.id',
  active,
  (strftime('%s','now') * 1000),
  (strftime('%s','now') * 1000)
FROM users;

-- Seed known customer-side Clerk ids for emails that also have active staff
-- access. This preserves Seamus' older customer identity while his admin user
-- remains the stable staff record.
INSERT OR IGNORE INTO staff_auth_links (
  id, user_id, clerk_id, email, source, active, created_at, updated_at
)
SELECT
  lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' ||
    lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' ||
    lower(hex(randomblob(6))),
  users.id,
  customers.clerk_id,
  users.email,
  'customer.email',
  users.active,
  (strftime('%s','now') * 1000),
  (strftime('%s','now') * 1000)
FROM customers
INNER JOIN users ON lower(users.email) = lower(customers.email)
WHERE customers.clerk_id IS NOT NULL
  AND customers.clerk_id != '';
