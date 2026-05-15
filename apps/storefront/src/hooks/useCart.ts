import { useCartStore } from '@/stores/cartStore';

export function useCart() {
  // Subscribe to `items` directly (a stable array reference managed by Zustand)
  // and derive totalQuantity in the component. Subscribing to the return of a
  // method like `s.totalQuantity()` is fragile — Zustand compares the returned
  // primitive each render and can miss updates if the method captures `get()`
  // lazily inside a function reference, which is what we had before.
  const items = useCartStore((s) => s.items);
  const totalQuantity = items.reduce((sum, x) => sum + x.quantity, 0);
  return {
    items,
    totalQuantity,
    addItem: useCartStore.getState().addItem,
    removeItem: useCartStore.getState().removeItem,
    updateQuantity: useCartStore.getState().updateQuantity,
    clear: useCartStore.getState().clear,
  };
}
