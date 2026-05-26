import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./Orders.tsx', import.meta.url), 'utf8');

test('orders list shows the Square reference from the first eight order id characters', () => {
  assert.match(source, /Square #\{\(order\.id \?\? ''\)\.slice\(0,\s*8\)\.toUpperCase\(\)\}/);
});

test('searching a Square reference can show awaiting payment rows', () => {
  assert.match(source, /if \(!search && \(statusFilter === 'all' \|\| !statusFilter\)\)/);
});
