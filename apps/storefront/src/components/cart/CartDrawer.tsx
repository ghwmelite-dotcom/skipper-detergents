import { Link } from 'react-router-dom';
import { X, ShoppingBag } from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/stores/uiStore';
import { useCart } from '@/hooks/useCart';
import { useQueries } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Product } from '@skipper/shared';
import { formatCurrency } from '@skipper/shared';
import { CartItemRow } from './CartItemRow';

export function CartDrawer() {
  const open = useUiStore((s) => s.cartDrawerOpen);
  const closeCartDrawer = useUiStore((s) => s.closeCartDrawer);
  const { items, totalQuantity } = useCart();

  const productQueries = useQueries({
    queries: items.map((item) => ({
      queryKey: ['products', 'byId', item.product_id],
      queryFn: () => api.get<Product>(`/api/products/id/${item.product_id}`).catch(() => null),
      enabled: open,
    })),
  });

  const products = productQueries
    .map((q) => q.data)
    .filter((p): p is Product => p !== null && p !== undefined);

  const productMap = new Map(products.map((p) => [p.id, p]));

  const subtotal = items.reduce((sum, item) => {
    const p = productMap.get(item.product_id);
    return sum + (p?.unit_price ?? 0) * item.quantity;
  }, 0);

  return (
    <Sheet open={open} onClose={closeCartDrawer} side="right" title="Your cart">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-lg">
            Cart{totalQuantity > 0 && <span className="text-muted-foreground font-normal ml-2 text-base">({totalQuantity})</span>}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={closeCartDrawer}
            aria-label="Close cart"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-12">
              <ShoppingBag className="h-12 w-12 text-muted-foreground/40" aria-hidden="true" />
              <div>
                <p className="font-medium">Your cart is empty</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add some products to get started
                </p>
              </div>
              <Link to="/shop" onClick={closeCartDrawer}>
                <Button variant="primary" size="md">Shop now</Button>
              </Link>
            </div>
          ) : (
            <div className="py-2">
              {items.map((item) => {
                const product = productMap.get(item.product_id);
                if (!product) return null;
                return <CartItemRow key={`${item.product_id}-${item.variant_id ?? ''}`} item={item} product={product} />;
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-border px-5 py-4 space-y-3">
            <div className="flex justify-between text-sm font-semibold text-base">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <Link to="/checkout" onClick={closeCartDrawer} className="block w-full">
              <Button variant="primary" size="lg" className="w-full">
                Proceed to Checkout
              </Button>
            </Link>
            <Link to="/cart" onClick={closeCartDrawer} className="block w-full">
              <Button variant="outline" size="md" className="w-full">
                View full cart
              </Button>
            </Link>
          </div>
        )}
      </div>
    </Sheet>
  );
}
