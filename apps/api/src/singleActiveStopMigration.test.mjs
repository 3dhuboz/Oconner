import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const apiMigration = readFileSync(new URL('../migrations/enforce_single_active_stop.sql', import.meta.url), 'utf8');
const dbMigration = readFileSync(new URL('../../../packages/db/migrations/0010_single_active_stop.sql', import.meta.url), 'utf8');

for (const [name, source] of [
  ['api migration', apiMigration],
  ['package migration', dbMigration],
]) {
  test(`${name} creates a partial unique index for active stops`, () => {
    assert.match(source, /CREATE UNIQUE INDEX IF NOT EXISTS idx_stops_one_active_per_day/);
    assert.match(source, /ON stops\(delivery_day_id\)/);
    assert.match(source, /WHERE status IN \('en_route', 'arrived'\)/);
  });
}
