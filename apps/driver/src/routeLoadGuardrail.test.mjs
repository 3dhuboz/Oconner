import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const stopsSource = readFileSync(new URL('./pages/Stops.tsx', import.meta.url), 'utf8');

test('driver route loading prefers rescue access and surfaces load errors', () => {
  assert.match(stopsSource, /const isRescueMode = hasRescueAccess\(\)/);
  assert.match(stopsSource, /const \[loadError, setLoadError\]/);
  assert.match(stopsSource, /Route could not load/);
  assert.match(stopsSource, /handleEmergencyAccess/);
  assert.match(stopsSource, /saveRescuePin\(cleaned\)/);
  assert.match(stopsSource, /Use emergency driver access/);
  assert.match(stopsSource, /!\s*loadError && \(/);
  assert.doesNotMatch(stopsSource, /api\.deliveryDays\.today\(\)[\s\S]{0,140}\.catch\(\(\) => \{\}\)/);
});
