# O'Connor Agriculture — Code Audit Report

## Summary

Full audit of `apps/admin`, `apps/driver`, `apps/storefront`, and `apps/api`. **Nine bugs fixed across two audit rounds.** Three additional issues noted as recommendations. Two prior login-loop fixes also applied.

---

## ✅ Bugs Fixed This Session

### 1. Cart page shows wrong delivery fee and misleading GST
**File:** `apps/storefront/src/app/cart/page.tsx`

**What was wrong:**
- Delivery fee was hardcoded to `$15` (`1500` cents), but the actual checkout charges `$10` (`1000` cents). Customer sees a different total in cart vs checkout — very visible.
- Cart displayed a "GST (inc.)" line calculated at 10% of subtotal. The actual API stores `gst = 0` and doesn't charge GST separately. This was a phantom line misleading customers.
- Free delivery threshold ($100) was not applied in the cart at all, so orders over $100 still showed the $15 fee.

**Fix applied:** Aligned fee to `$1000`, removed GST line, applied free-delivery threshold with the same "Spend $X more" nudge that checkout already shows.

---

### 2. Creating a pickup/market-day delivery day silently dropped its type
**File:** `apps/admin/src/pages/DeliveryDays.tsx`

**What was wrong:**
- `handleCreate` called `api.deliveryDays.create(...)` without passing `type` or `marketLocation` from the form state.
- Result: any day created as "Market Day Pickup" was saved to the database as a regular delivery day — no pickup badge, wrong checkout behaviour for customers.
- `handleBulkCreate` had the same omission.
- The optimistic local-state update after create also didn't include `type`/`marketLocation`, so the list looked wrong until a page refresh.

**Fix applied:** Added `type` and `marketLocation` to both create API calls and to the optimistic state object.

---

### 3. Driver stop detail showed wrong delivery progress count
**File:** `apps/driver/src/pages/StopDetail.tsx`

**What was wrong:**
```js
// Before — counts remaining PENDING stops, not completed ones
const deliveredCount = allStops.filter(
  (s) => s.id !== stop.id && s.status !== 'delivered' && s.status !== 'failed'
).length;
```
Displayed as `"Delivered (X / Y)"` at the bottom of the screen. On a 5-stop run with 3 already done, it would show `"Delivered (1/5)"` instead of `"Delivered (3/5)"`. 

**Fix applied:**
```js
const deliveredCount = allStops.filter(
  (s) => s.status === 'delivered' || s.status === 'failed'
).length;
```

---

### 4. Subscription detail popup never showed customer delivery address
**File:** `apps/admin/src/pages/Subscriptions.tsx`

**What was wrong:**
```js
const addrs = JSON.parse(cust?.addresses ?? '[]');
```
The `GET /api/customers/:id` endpoint already returns `addresses` as a parsed JavaScript array. Calling `JSON.parse()` on an array coerces it to `"[object Object]"` first, which throws a `SyntaxError`. The surrounding `catch {}` swallowed it silently — so clicking a subscriber's name in the Subscriptions page always showed a blank address.

**Fix applied:**
```js
const addrs = Array.isArray(cust?.addresses) ? cust.addresses : [];
```

---

## ✅ Bugs Fixed — Round 2 (Continuation Audit)

### 5. Driver app showed "Stop #0" for the first delivery stop
**File:** `apps/driver/src/pages/StopDetail.tsx`

**What was wrong:**
Stop sequences are stored 0-based (`sequence: 0, 1, 2…`). The header displayed `Stop #{stop.sequence}` directly, so the first stop showed "Stop #0" rather than "Stop #1".

**Fix applied:** Changed to `Stop #{stop.sequence + 1}`.

---

### 6. Subscribe page showed wrong annual spend when alternating boxes
**File:** `apps/storefront/src/app/subscribe/page.tsx`

**What was wrong:**
When a customer chose to alternate between two boxes (e.g. $290 Family Box and $550 Double Box, fortnightly), the "approx. $X/year" summary only multiplied the primary box price by all deliveries, ignoring the alternate box entirely. For example: $290 × 26 = $7,540/yr shown, but the correct figure for alternating boxes is ~$11,440/yr.

**Fix applied:** When an alternate box is selected, the annual spend is now calculated as the average of both box prices times the number of deliveries.

---

### 7. Subscribe page silently failed on payment redirect errors
**File:** `apps/storefront/src/app/subscribe/page.tsx`

**What was wrong:**
If the `/api/subscriptions/checkout` call threw any error (API down, Square issue, etc.), the `catch` block only set `saving(false)` — re-enabling the button with no feedback. The customer would see the form become interactive again with no explanation.

**Fix applied:** Added an `alert()` in the catch block to tell the user something went wrong.

---

### 8. Route optimisation set sequences 1-based, causing off-by-one stop numbers
**File:** `apps/admin/src/pages/DeliveryRunsTab.tsx`

**What was wrong:**
The `optimiseRun` function called `api.stops.updateSequence(s.id!, i + 1)`, setting sequences to 1, 2, 3… After optimisation, both the driver app header (`stop.sequence + 1`) and the track page map pins (`s.sequence + 1`) would show 2, 3, 4… instead of 1, 2, 3…

Freshly generated stops are 0-based (sequence = 0, 1, 2…), so the `+ 1` in the display layer is correct — but the optimiser was breaking that convention.

**Fix applied:** Changed to `api.stops.updateSequence(s.id!, i)` to keep sequences 0-based.

---

### 9. Driver invite email had a space in a CSS hex colour
**File:** `apps/api/src/routes/drivers.ts`

**What was wrong:**
The driver invite email HTML contained `color:#a3c e8f` (space in the middle of the hex code). This is an invalid CSS value — the subtitle text "Driver App Access" would render in the browser's default colour rather than the intended light green.

**Fix applied:** Corrected to `color:#a3ce8f`.

---

### 10. Auto-assign by postcode could steal stops already assigned to other runs
**File:** `apps/api/src/routes/deliveryRuns.ts`

**What was wrong:**
The `POST /:id/auto-assign` endpoint fetched **all** stops for the delivery day without filtering by `runId IS NULL`. If a stop was already assigned to Run A and its postcode matched a new auto-assign for Run B, it would be silently reassigned — removing it from Run A with no warning.

**Fix applied:** Added `isNull(stops.runId)` to the query so only unassigned stops are candidates for auto-assignment.

---

## ⚠️ Recommendations (Not Yet Fixed)

### R1. Public order creation accepts client-supplied pricing
**File:** `apps/api/src/index.ts` lines 155–184

The public `POST /api/orders` route (used by the storefront checkout) inserts `body.total`, `body.subtotal`, and `body.deliveryFee` directly from the request without server-side recalculation. A savvy user could craft a request with `total: 1` and create a valid order for $0.01.

**Current risk:** Low — payment is arranged on delivery, not charged online. But it's worth server-side validating pricing before orders go live with online payments.

**Recommended fix:** Recalculate `subtotal`, `deliveryFee`, and `total` from the product catalogue on the server, similar to how the authenticated `ordersRouter` already does it.

---

### R2. Scheduled subscription order generation has no duplicate-order guard
**File:** `apps/api/src/index.ts` lines 558–651 (cron handler)

The daily cron at `0 8 * * *` auto-generates subscription orders. The "due" check has a 20% grace window:
```js
if (now < nextDueDate - interval * 0.2) continue;
```
For a fortnightly subscription this means orders can be triggered after ~11 days rather than 14. There is no check for whether an order was already generated for this interval — if the cron runs twice in the grace window (e.g. due to a retry or worker restart) it will create duplicate orders for the same customer.

**Recommended fix:** Before inserting, check whether an order with `subscriptionId = sub.id` already exists with `createdAt >= lastOrderGeneratedAt`.

---

### R3. Fragile admin URL construction in staff invite email
**File:** `apps/api/src/index.ts` line 292

```js
const adminUrl = c.env.STOREFRONT_URL?.replace('butcher-storefront', 'butcher-admin')
  || 'https://admin.oconnoragriculture.com.au';
```
If `STOREFRONT_URL` is the production domain (`https://oconnoragriculture.com.au`) the replace is a no-op and falls back correctly. But if `STOREFRONT_URL` is ever set to a staging URL that doesn't contain `butcher-storefront`, the invite email will link to the wrong URL. 

**Recommended fix:** Hardcode the admin URL or add a dedicated `ADMIN_URL` environment variable.

---

## Previously Fixed (Prior Session)

| Bug | File | Fix |
|-----|------|-----|
| Login loop — wrong Clerk key | `apps/admin/.env.production`, `apps/driver/.env.production` | Switched from `pk_test_` to `pk_live_` |
| Login loop — hash routing | `apps/admin/src/pages/Login.tsx`, `apps/driver/src/pages/Login.tsx` | Changed `routing="hash"` → `routing="virtual"` |

---

### R4. Subscription is marked 'active' before payment is confirmed
**File:** `apps/api/src/routes/subscriptions.ts` line 204

The public subscription checkout endpoint creates a Square payment link and immediately inserts the subscription record with `status: 'active'`. If the customer clicks away from the Square checkout page without paying, they will have an active subscription record in the database (and a linked order) that was never paid for.

**Current risk:** Medium — subscriptions are managed manually at delivery time, so a non-paying record would likely be caught before a box is packed. There is no Square webhook handler to flip subscriptions from `pending` → `active` after payment.

**Recommended fix:** Create the subscription with `status: 'pending'` and activate it via a Square webhook on `payment.completed`. This requires setting up a Square webhook endpoint that calls `PATCH /api/subscriptions/:id` with `{ status: 'active' }` on successful payment.

---

*Audit completed. All files under `apps/admin`, `apps/driver`, `apps/storefront`, and `apps/api` were reviewed. **10 bugs fixed total.***
