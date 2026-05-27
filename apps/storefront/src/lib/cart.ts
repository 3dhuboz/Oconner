import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { OrderItem, Product } from '@butcher/shared';

const safeStorage = {
  getItem: (name: string): string | null => {
    try { return localStorage.getItem(name); } catch { return null; }
  },
  setItem: (name: string, value: string): void => {
    try { localStorage.setItem(name, value); } catch {}
  },
  removeItem: (name: string): void => {
    try { localStorage.removeItem(name); } catch {}
  },
};

interface CartStore {
  items: OrderItem[];
  addItem: (item: OrderItem) => void;
  removeItem: (productId: string, weight?: number) => void;
  updateQuantity: (productId: string, quantity: number, weight?: number) => void;
  syncPrices: (products: Product[]) => void;
  clearCart: () => void;
  total: () => number;
  itemCount: () => number;
}

function calculateLineTotal(item: OrderItem): number {
  const quantity = item.quantity ?? 1;
  if (item.isMeatPack) return (item.fixedPrice ?? 0) * quantity;

  const pricePerKg = item.pricePerKg ?? 0;
  const weightKg = item.weight ? item.weight / 1000 : (item.weightKg ?? 1);
  return Math.round(pricePerKg * weightKg * quantity);
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const items = get().items;
        const existingIndex = items.findIndex(
          (i) => i.productId === item.productId && i.weight === item.weight,
        );
        if (existingIndex >= 0) {
          const updated = [...items];
          const merged = {
            ...updated[existingIndex],
            ...item,
            quantity: (updated[existingIndex].quantity ?? 1) + (item.quantity ?? 1),
          };
          updated[existingIndex] = { ...merged, lineTotal: calculateLineTotal(merged) };
          set({ items: updated });
        } else {
          set({ items: [...items, { ...item, lineTotal: calculateLineTotal(item) }] });
        }
      },
      removeItem: (productId, weight) => {
        set({
          items: get().items.filter(
            (i) => !(i.productId === productId && i.weight === weight),
          ),
        });
      },
      updateQuantity: (productId, quantity, weight) => {
        if (quantity <= 0) {
          get().removeItem(productId, weight);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.productId === productId && i.weight === weight
              ? { ...i, quantity, lineTotal: calculateLineTotal({ ...i, quantity }) }
              : i,
          ),
        });
      },
      syncPrices: (products) => {
        const productMap = new Map(products.map((product) => [product.id, product]));
        set({
          items: get().items.map((item) => {
            const product = productMap.get(item.productId);
            if (!product) return item;
            const repriced = {
              ...item,
              productName: product.name,
              category: product.category,
              isMeatPack: product.isMeatPack,
              pricePerKg: product.pricePerKg,
              fixedPrice: product.fixedPrice,
            };
            return { ...repriced, lineTotal: calculateLineTotal(repriced) };
          }),
        });
      },
      clearCart: () => set({ items: [] }),
      total: () => get().items.reduce((sum, i) => sum + i.lineTotal, 0),
      itemCount: () => get().items.reduce((sum, i) => sum + (i.quantity ?? 1), 0),
    }),
    { name: 'butcher-cart', storage: createJSONStorage(() => safeStorage), skipHydration: true },
  ),
);
