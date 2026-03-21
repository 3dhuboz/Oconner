import { eq } from 'drizzle-orm';
import { products, stockMovements } from '@butcher/db';

interface OrderItem {
  productId: string;
  productName: string;
  isMeatPack: boolean;
  weight?: number;   // grams
  quantity?: number;  // units (for packs)
  lineTotal: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function deductStock(db: any, items: OrderItem[], orderId: string, now: number) {
  for (const item of items) {
    const [product] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
    if (!product) continue;

    // Packs: deduct by quantity (units). Loose cuts: deduct by weight (grams → kg).
    const delta = item.isMeatPack ? -(item.quantity ?? 1) : -((item.weight ?? 0) / 1000);
    const newStock = Math.max(0, product.stockOnHand + delta);

    await db.update(products).set({ stockOnHand: newStock, updatedAt: now }).where(eq(products.id, item.productId));
    await db.insert(stockMovements).values({
      id: crypto.randomUUID(),
      productId: item.productId,
      productName: item.productName,
      type: 'sale',
      qty: delta,
      unit: item.isMeatPack ? 'units' : 'kg',
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

    const delta = item.isMeatPack ? (item.quantity ?? 1) : (item.weight ?? 0) / 1000;
    const newStock = product.stockOnHand + delta;

    await db.update(products).set({ stockOnHand: newStock, updatedAt: now }).where(eq(products.id, item.productId));
    await db.insert(stockMovements).values({
      id: crypto.randomUUID(),
      productId: item.productId,
      productName: item.productName,
      type: 'refund',
      qty: delta,
      unit: item.isMeatPack ? 'units' : 'kg',
      reason: `Refund for order ${orderId}`,
      orderId,
      createdBy: 'system',
      createdAt: now,
    });
  }
}
