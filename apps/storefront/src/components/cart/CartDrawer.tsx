import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, ShoppingBag, ArrowRight } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
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
  const { items, totalQuantity, removeItem } = useCart();

  const productQueries = useQueries({
    queries: items.map((item) => ({
      queryKey: ['products', 'byId', item.product_id],
      queryFn: () =>
        api.get<Product>(`/api/products/id/${item.product_id}`).catch(() => null),
      enabled: open,
    })),
  });

  const products = productQueries
    .map((q) => q.data)
    .filter((p): p is Product => p !== null && p !== undefined);

  // Prune items whose product no longer exists, once the lookup has settled.
  useEffect(() => {
    if (!open) return;
    items.forEach((item, i) => {
      const q = productQueries[i];
      if (q && q.isFetched && !q.isFetching && q.data === null) {
        removeItem(item.product_id, item.variant_id ?? null);
      }
    });
  }, [open, items, productQueries, removeItem]);

  const productMap = new Map(products.map((p) => [p.id, p]));

  const subtotal = items.reduce((sum, item) => {
    const p = productMap.get(item.product_id);
    return sum + (p?.unit_price ?? 0) * item.quantity;
  }, 0);
  const canCheckout = products.length > 0 && subtotal > 0;

  return (
    <Sheet open={open} onClose={closeCartDrawer} side="right" title="Your cart">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-navy/10">
          <div>
            <span className="editorial-label text-brand-cyan-deep">Your selection</span>
            <h2 className="font-display text-2xl font-medium text-brand-navy leading-tight mt-0.5">
              Cart{' '}
              {totalQuantity > 0 && (
                <span className="font-display-italic text-brand-navy/55 tabular-nums">
                  · {totalQuantity}
                </span>
              )}
            </h2>
          </div>
          <Button variant="ghost" size="icon" onClick={closeCartDrawer} aria-label="Close cart">
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 text-center py-16">
              <div className="h-16 w-16 rounded-full bg-brand-sand/70 flex items-center justify-center">
                <ShoppingBag className="h-7 w-7 text-brand-navy/50" aria-hidden="true" strokeWidth={1.5} />
              </div>
              <div className="space-y-2">
                <p className="font-display text-2xl text-brand-navy">
                  Your cart is <span className="font-display-italic">quiet.</span>
                </p>
                <p className="text-sm text-brand-navy/60">
                  Browse the shop and add something lovely.
                </p>
              </div>
              <Link to="/shop" onClick={closeCartDrawer}>
                <Button variant="primary" size="md" className="gap-2">
                  Start shopping
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="py-2">
              <AnimatePresence initial={false}>
                {items.map((item) => {
                  const product = productMap.get(item.product_id);
                  if (!product) return null;
                  return (
                    <CartItemRow
                      key={`${item.product_id}-${item.variant_id ?? ''}`}
                      item={item}
                      product={product}
                      compact
                    />
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-brand-navy/10 px-6 py-5 space-y-4 bg-brand-ivory">
            <div className="flex items-baseline justify-between">
              <span className="text-sm uppercase tracking-wider text-brand-navy/60 font-medium">
                Subtotal
              </span>
              <span className="font-display text-2xl font-medium text-brand-navy tabular-nums">
                {formatCurrency(subtotal)}
              </span>
            </div>
            <p className="text-[11px] text-brand-navy/50 tracking-wide">
              Delivery + discounts calculated at checkout.
            </p>
            {canCheckout ? (
              <Link to="/checkout" onClick={closeCartDrawer} className="block w-full">
                <Button variant="primary" size="lg" className="w-full gap-2">
                  Proceed to checkout
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
            ) : (
              <Button variant="primary" size="lg" className="w-full gap-2" disabled>
                Proceed to checkout
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
            <Link to="/cart" onClick={closeCartDrawer} className="block w-full">
              <Button variant="ghost" size="sm" className="w-full">
                View full cart
              </Button>
            </Link>
          </div>
        )}
      </div>
    </Sheet>
  );
}
