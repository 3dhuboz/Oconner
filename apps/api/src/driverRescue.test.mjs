import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const routeSource = readFileSync(new URL('./routes/driverRescue.ts', import.meta.url), 'utf8');
const indexSource = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');
const typesSource = readFileSync(new URL('./types.ts', import.meta.url), 'utf8');

test('driver rescue endpoints require a secret pin and are mounted before Clerk auth', () => {
  assert.match(typesSource, /DRIVER_RESCUE_PIN\?:\s*string/);
  assert.match(routeSource, /DRIVER_RESCUE_PIN/);
  assert.match(routeSource, /X-Driver-Rescue-Pin/);
  assert.match(routeSource, /Cache-Control',\s*'no-store'/);
  assert.match(indexSource, /X-Driver-Rescue-Pin/);
  assert.match(indexSource, /app\.route\('\/api\/driver-rescue',\s*driverRescueRouter\)/);
  assert.match(indexSource, /app\.route\('\/api\/driver-rescue'[\s\S]+app\.use\('\/api\/\*', requireAuth\)/);
});

test('driver rescue status updates keep the active stop moving', () => {
  assert.match(routeSource, /app\.patch\('\/stops\/:id\/status'/);
  assert.match(routeSource, /status === 'delivered'/);
  assert.match(routeSource, /eq\(orders\.id,\s*currentStop\.orderId\)/);
  assert.match(routeSource, /gt\(stops\.sequence,\s*currentStop\.sequence\)/);
  assert.match(routeSource, /status:\s*'en_route'/);
});

test('driver rescue includes linked order payment details', () => {
  assert.match(routeSource, /function serializeStop\([\s\S]*order\?: typeof orders\.\$inferSelect/);
  assert.match(routeSource, /orderPaymentStatus:\s*order\?\.paymentStatus/);
  assert.match(routeSource, /orderPaymentProvider:\s*order\?\.paymentProvider/);
  assert.match(routeSource, /orderPaymentIntentId:\s*order\?\.paymentIntentId/);
  assert.match(routeSource, /attachOrderPaymentDetails/);
  assert.match(routeSource, /inArray\(orders\.id,\s*orderIds\)/);
});

test('driver rescue can text the emergency access instructions', () => {
  assert.match(routeSource, /app\.post\('\/sms-access'/);
  assert.match(routeSource, /sendSms\(c\.env,\s*to,\s*message\)/);
  assert.match(routeSource, /oconnoragriculture@gmail\.com/);
  assert.match(routeSource, /Emergency driver access PIN/);
});
