ALTER TABLE subscriptions ADD COLUMN alternate_box_id TEXT;
ALTER TABLE subscriptions ADD COLUMN alternate_box_name TEXT;
ALTER TABLE subscriptions ADD COLUMN next_is_alternate INTEGER NOT NULL DEFAULT 0;
