import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OrderItem } from '@butcher/shared';

interface CartStore {
  items: OrderItem[];
  addItem: (item: OrderItem) => void;
  removeItem: (productId: string, weight?: number) => void;
  updateQuantity: (productId: string, quantity: number, weight?: number) => void;
  clearCart: () => void;
  total: () => number;
  itemCount: () => number;
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
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: (updated[existingIndex].quantity ?? 1) + (item.quantity ?? 1),
            lineTotal: updated[existingIndex].lineTotal + item.lineTotal,
          };
          set({ items: updated });
        } else {
          set({ items: [...items, item] });
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
              ? { ...i, quantity, lineTotal: (i.pricePerKg ?? i.fixedPrice ?? 0) * quantity }
              : i,
          ),
        });
      },
      clearCart: () => set({ items: [] }),
      total: () => get().items.reduce((sum, i) => sum + i.lineTotal, 0),
      itemCount: () => get().items.reduce((sum, i) => sum + (i.quantity ?? 1), 0),
    }),
    { name: 'butcher-cart' },
  ),
);
