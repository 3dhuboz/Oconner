import { eq } from 'drizzle-orm';
import { products, stockMovements } from '@butcher/db';

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
    const newStock = Math.max(0, product.stockOnHand + delta);

    await db.update(products).set({ stockOnHand: newStock, updatedAt: now }).where(eq(products.id, item.productId));
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function restoreStock(db: any, items: OrderItem[], orderId: string, now: number) {
  for (const item of items) {
    const [product] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
    if (!product) continue;

    const { delta, unit } = getKgDelta(item, product);
    if (delta === 0) continue;
    const newStock = product.stockOnHand + delta;

    await db.update(products).set({ stockOnHand: newStock, updatedAt: now }).where(eq(products.id, item.productId));
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
