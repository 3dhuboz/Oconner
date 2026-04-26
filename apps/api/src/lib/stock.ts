import { and, eq, isNull, or, sql } from 'drizzle-orm';
import { products, stockMovements, deliveryDays, deliveryDayStock, promoCodes } from '@butcher/db';

/** Resolve the effective stock day ID — if this day belongs to a pool, return the pool source ID */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getStockDayId(db: any, deliveryDayId: string): Promise<string> {
  const [day] = await db.select({ stockPoolId: deliveryDays.stockPoolId }).from(deliveryDays).where(eq(deliveryDays.id, deliveryDayId)).limit(1);
  return day?.stockPoolId ?? deliveryDayId;
}

interface OrderItem {
  productId: string;
  productName: string;
  isMeatPack?: boolean;
  weight?: number;    // grams (storefront format)
  weightKg?: number;  // kg (admin format)
  quantity?: number;   // units (for packs)
  lineTotal: number;
}

/** Get the kg delta for an item, handling both storefront (weight in grams) and admin (weightKg) formats */
function getKgDelta(item: OrderItem, product: { isMeatPack?: boolean }): { delta: number; unit: string } {
  const isPack = item.isMeatPack ?? product.isMeatPack ?? false;
  if (isPack) {
    return { delta: item.quantity ?? 1, unit: 'units' };
  }
  // Weight-based: try weightKg first (admin), then weight in grams (storefront)
  const kg = item.weightKg ?? (item.weight ? item.weight / 1000 : 0);
  return { delta: kg, unit: 'kg' };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function deductStock(db: any, items: OrderItem[], orderId: string, now: number) {
  for (const item of items) {
    const [product] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
    if (!product) continue;

    const { delta: absDelta, unit } = getKgDelta(item, product);
    if (absDelta === 0) continue;
    const delta = -absDelta;

    // Atomic SQL delta — without this, a refund webhook running concurrently
    // with a new-order checkout would both read the same `stockOnHand`,
    // compute their respective new values, and one of them would clobber the
    // other. `MAX(...)` clamps at zero so we never write a negative.
    await db.update(products)
      .set({
        stockOnHand: sql`MAX(0, ${products.stockOnHand} + ${delta})`,
        updatedAt: now,
      })
      .where(eq(products.id, item.productId));
    await db.insert(stockMovements).values({
      id: crypto.randomUUID(),
      productId: item.productId,
      productName: item.productName,
      type: 'sale',
      qty: delta,
      unit,
      reason: `Order ${orderId}`,
      orderId,
      createdBy: 'system',
      createdAt: now,
    });
  }
}

/**
 * Reserve allocated day stock for a list of items atomically per-item.
 *
 * Uses a conditional UPDATE (`SET sold = sold + qty WHERE sold + qty <= allocated`)
 * with `.returning()` so two concurrent checkouts cannot both pass a stale
 * read-then-write check and oversell. If any item fails the conditional
 * update, previously-reserved items are reverted (compensation rollback) and
 * the helper returns `{ ok: false, error }` for the caller to surface.
 *
 * `allocations` is the result of selecting all `delivery_day_stock` rows for
 * the (pool-aware) day — used to map each order item to its allocation row
 * and skip items that aren't allocated for the day.
 */
interface AllocationRow {
  id: string;
  productId: string;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function reserveDayStock(db: any, allocations: AllocationRow[], items: OrderItem[]): Promise<{ ok: true } | { ok: false; error: string }> {
  if (allocations.length === 0) return { ok: true };

  const reserved: Array<{ allocId: string; qty: number }> = [];
  for (const item of items) {
    const alloc = allocations.find((a) => a.productId === item.productId);
    if (!alloc) {
      // Strict enforcement: products without an allocation are blocked when any allocations exist for the day.
      // Compensate any prior reservations before bailing.
      await rollbackReservations(db, reserved);
      return { ok: false, error: `${item.productName} is not allocated for this delivery day` };
    }

    const qty = item.weight ? item.weight / 1000 : (item.weightKg ?? item.quantity ?? 1);
    if (qty <= 0) continue;

    const updated = await db.update(deliveryDayStock)
      .set({ sold: sql`${deliveryDayStock.sold} + ${qty}` })
      .where(and(
        eq(deliveryDayStock.id, alloc.id),
        sql`${deliveryDayStock.sold} + ${qty} <= ${deliveryDayStock.allocated}`,
      ))
      .returning({ id: deliveryDayStock.id });

    if (!updated || updated.length === 0) {
      await rollbackReservations(db, reserved);
      return { ok: false, error: `${item.productName} is sold out for this delivery day` };
    }
    reserved.push({ allocId: alloc.id, qty });
  }

  return { ok: true };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function rollbackReservations(db: any, reserved: Array<{ allocId: string; qty: number }>): Promise<void> {
  for (const r of reserved) {
    try {
      await db.update(deliveryDayStock)
        .set({ sold: sql`${deliveryDayStock.sold} - ${r.qty}` })
        .where(eq(deliveryDayStock.id, r.allocId));
    } catch {
      // best-effort rollback; the read-side will recover via overall reconcile
    }
  }
}

/**
 * Atomically consume one usage of a promo code. Returns the promo row on
 * success, null if the code is invalid, inactive, expired, or already at its
 * max uses. Conditional UPDATE prevents two concurrent checkouts from both
 * passing a stale `usedCount < maxUses` check.
 *
 * Caller should still read the promo first to compute the discount; this
 * helper just performs the increment-with-guard.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function consumePromoCode(db: any, promoId: string, now: number): Promise<{ ok: true } | { ok: false; error: string }> {
  const updated = await db.update(promoCodes)
    .set({ usedCount: sql`${promoCodes.usedCount} + 1` })
    .where(and(
      eq(promoCodes.id, promoId),
      eq(promoCodes.active, true),
      or(
        isNull(promoCodes.maxUses),
        sql`${promoCodes.usedCount} < ${promoCodes.maxUses}`,
      ),
      or(
        isNull(promoCodes.expiresAt),
        sql`${promoCodes.expiresAt} > ${now}`,
      ),
    ))
    .returning({ id: promoCodes.id });

  if (!updated || updated.length === 0) {
    return { ok: false, error: 'This promo code is no longer valid (expired, inactive, or fully redeemed).' };
  }
  return { ok: true };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function restoreStock(db: any, items: OrderItem[], orderId: string, now: number) {
  for (const item of items) {
    const [product] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
    if (!product) continue;

    const { delta, unit } = getKgDelta(item, product);
    if (delta === 0) continue;

    // Atomic SQL delta — see deductStock for rationale.
    await db.update(products)
      .set({
        stockOnHand: sql`${products.stockOnHand} + ${delta}`,
        updatedAt: now,
      })
      .where(eq(products.id, item.productId));
    await db.insert(stockMovements).values({
      id: crypto.randomUUID(),
      productId: item.productId,
      productName: item.productName,
      type: 'refund',
      qty: delta,
      unit,
      reason: `Refund for order ${orderId}`,
      orderId,
      createdBy: 'system',
      createdAt: now,
    });
  }
}
