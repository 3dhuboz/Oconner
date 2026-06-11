import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const pageSource = readFileSync(new URL('./app/delivery-days/page.tsx', import.meta.url), 'utf8');
const checkerSource = readFileSync(new URL('./app/delivery-days/DeliveryAreaChecker.tsx', import.meta.url), 'utf8');
const calendarSource = readFileSync(new URL('./app/delivery-days/DeliveryCalendar.tsx', import.meta.url), 'utf8');

test('delivery days page shows a customer-facing area checker', () => {
  assert.match(pageSource, /DeliveryAreaChecker/);
  assert.match(checkerSource, /Check Your Delivery Area/);
  assert.match(checkerSource, /Enter a suburb or postcode/);
  assert.match(checkerSource, /Current Delivery Regions/);
});

test('delivery area checker matches suburb names and postcodes', () => {
  assert.match(checkerSource, /postcodeMatch/);
  assert.match(checkerSource, /suburb\.includes\(normalizedQuery\)/);
  assert.match(checkerSource, /matchedRegions/);
});

test('calendar detail exposes selected delivery regions', () => {
  assert.match(calendarSource, /MapPin/);
  assert.match(calendarSource, /\.zones/);
});
