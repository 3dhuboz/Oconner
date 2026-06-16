import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./StockAllocationTab.tsx', import.meta.url), 'utf8');

test('stock allocation screen surfaces API save errors to admins', () => {
  assert.match(source, /function readableError\(error: unknown, fallback: string\): string/);
  assert.match(source, /catch \(error\) \{\s*toast\(readableError\(error, 'Failed to save allocations'\), 'error'\);/);
  assert.doesNotMatch(source, /catch \{\s*toast\('Failed to save allocations', 'error'\);/);
});

test('stock allocation screen explains stock and delivery spots are separate', () => {
  assert.match(source, /Delivery spots are controlled separately\./);
});

test('stock allocation screen separates paid sales from awaiting-payment reservations', () => {
  assert.match(source, /paidSold\?: number/);
  assert.match(source, /awaitingPayment\?: number/);
  assert.match(source, /\{totalSold\} reserved/);
  assert.match(source, /\{paidSold\} paid\{awaitingPayment > 0 \? ` \+ \$\{awaitingPayment\} awaiting` : ''\}/);
});
