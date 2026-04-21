import { useCartStore } from '@/stores/cartStore';

export function useCart() {
  const items = useCartStore((s) => s.items);
  const totalQuantity = useCartStore((s) => s.totalQuantity());
  return {
    items,
    totalQuantity,
    addItem: useCartStore.getState().addItem,
    removeItem: useCartStore.getState().removeItem,
    updateQuantity: useCartStore.getState().updateQuantity,
    clear: useCartStore.getState().clear,
  };
}
