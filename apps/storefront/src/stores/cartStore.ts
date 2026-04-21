import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  product_id: string;
  variant_id?: string;
  quantity: number;
}

interface CartStoreState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  updateQuantity: (productId: string, variantId: string | null, quantity: number) => void;
  removeItem: (productId: string, variantId: string | null) => void;
  clear: () => void;
  totalQuantity: () => number;
}

function sameLine(a: CartItem, productId: string, variantId: string | null): boolean {
  return a.product_id === productId && (a.variant_id ?? null) === variantId;
}

export const useCartStore = create<CartStoreState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const variantId = item.variant_id ?? null;
        set((state) => {
          const existing = state.items.find((x) => sameLine(x, item.product_id, variantId));
          if (existing) {
            return {
              items: state.items.map((x) =>
                sameLine(x, item.product_id, variantId)
                  ? { ...x, quantity: x.quantity + item.quantity }
                  : x,
              ),
            };
          }
          return { items: [...state.items, item] };
        });
      },

      updateQuantity: (productId, variantId, quantity) => {
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter((x) => !sameLine(x, productId, variantId)),
            };
          }
          return {
            items: state.items.map((x) =>
              sameLine(x, productId, variantId) ? { ...x, quantity } : x,
            ),
          };
        });
      },

      removeItem: (productId, variantId) => {
        set((state) => ({
          items: state.items.filter((x) => !sameLine(x, productId, variantId)),
        }));
      },

      clear: () => set({ items: [] }),

      totalQuantity: () => get().items.reduce((sum, x) => sum + x.quantity, 0),
    }),
    {
      name: 'skipper-cart',
      version: 1,
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
