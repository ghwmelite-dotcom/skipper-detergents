import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowRight, ArrowLeft } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
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
        <SEOHead title="Your cart" noindex />
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Cart' }]} />
        <div className="container py-24 md:py-32 flex flex-col items-center text-center gap-8 max-w-md mx-auto">
          <div className="h-20 w-20 rounded-full bg-brand-sand/70 flex items-center justify-center">
            <ShoppingBag
              className="h-9 w-9 text-brand-navy/50"
              aria-hidden="true"
              strokeWidth={1.5}
            />
          </div>
          <div className="space-y-4">
            <h1 className="font-display text-display-sm text-brand-navy">
              Your cart is <span className="font-display-italic">quiet.</span>
            </h1>
            <p className="text-brand-navy/60 text-[17px] leading-relaxed">
              Nothing added yet &mdash; but we have a lovely shop just waiting for you to
              browse.
            </p>
          </div>
          <Link to="/shop">
            <Button variant="primary" size="lg" className="gap-2">
              Start shopping
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead title="Your cart" noindex />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Cart' }]} />

      <div className="container py-8 md:py-14">
        <div className="mb-12">
          <span className="editorial-label text-brand-cyan-deep">
            <span className="accent-line mr-3" aria-hidden="true" />
            Your selection
          </span>
          <h1 className="mt-4 font-display text-display-md text-brand-navy">
            <span className="font-display-italic">Cart.</span>
          </h1>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1fr_400px] lg:gap-16">
          <div>
            {isLoading ? (
              <div className="space-y-6">
                {items.map((item) => (
                  <div
                    key={item.product_id}
                    className="flex gap-4 py-4 border-b border-brand-navy/8"
                  >
                    <Skeleton className="h-24 w-24 rounded-md flex-none" />
                    <div className="flex-1 space-y-2 py-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2 mt-4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <AnimatePresence initial={false}>
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
              </AnimatePresence>
            )}

            <Link
              to="/shop"
              className="inline-flex items-center gap-1.5 mt-10 text-sm font-medium text-brand-navy/65 hover:text-brand-navy transition-colors"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Continue shopping
            </Link>
          </div>

          <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <CartSummary items={items} products={products} />
            <Link to="/checkout" className="block">
              <Button variant="primary" size="lg" className="w-full gap-2">
                Proceed to checkout
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
            <p className="text-[11px] text-brand-navy/50 text-center tracking-wider uppercase">
              Secure Paystack checkout &middot; Returns within 7 days
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
