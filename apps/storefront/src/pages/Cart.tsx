import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { useQueries } from '@tanstack/react-query';
import { SEOHead } from '@/components/seo/SEOHead';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { CartItemRow } from '@/components/cart/CartItemRow';
import { CartSummary } from '@/components/cart/CartSummary';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCart } from '@/hooks/useCart';
import { api } from '@/lib/api';
import type { Product } from '@skipper/shared';

export default function Cart() {
  const { items } = useCart();

  const productQueries = useQueries({
    queries: items.map((item) => ({
      queryKey: ['products', 'bySlugOrId', item.product_id],
      queryFn: async (): Promise<Product | null> => {
        // Try fetching by id — API might not support it; catch and return null
        try {
          return await api.get<Product>(`/api/products/id/${item.product_id}`);
        } catch {
          return null;
        }
      },
      staleTime: 5 * 60_000,
    })),
  });

  const isLoading = productQueries.some((q) => q.isLoading);
  const products = productQueries
    .map((q) => q.data)
    .filter((p): p is Product => p !== null && p !== undefined);

  if (items.length === 0) {
    return (
      <>
        <SEOHead title="Your Cart" noindex />
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Cart' }]} />
        <div className="container py-20 flex flex-col items-center text-center gap-6">
          <ShoppingBag className="h-16 w-16 text-muted-foreground/30" aria-hidden="true" />
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Your cart is empty</h1>
            <p className="text-muted-foreground">
              Looks like you haven't added anything yet.
            </p>
          </div>
          <Link to="/shop">
            <Button variant="primary" size="lg">Start shopping</Button>
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead title="Your Cart" noindex />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Cart' }]} />

      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">Your Cart</h1>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Item list */}
          <div>
            {isLoading ? (
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.product_id} className="flex gap-4 py-4 border-b border-border">
                    <Skeleton className="h-16 w-16 rounded-md" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                {items.map((item) => {
                  const product = products.find((p) => p.id === item.product_id);
                  if (!product) return null;
                  return (
                    <CartItemRow
                      key={`${item.product_id}-${item.variant_id ?? ''}`}
                      item={item}
                      product={product}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="space-y-4">
            <CartSummary items={items} products={products} />
            <Link to="/checkout" className="block">
              <Button variant="primary" size="lg" className="w-full">
                Proceed to Checkout
              </Button>
            </Link>
            <Link to="/shop" className="block">
              <Button variant="outline" size="md" className="w-full">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
