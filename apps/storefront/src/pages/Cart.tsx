import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useQueries } from '@tanstack/react-query';
import { SEOHead } from '@/components/seo/SEOHead';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { CartItemRow } from '@/components/cart/CartItemRow';
import { CartSummary } from '@/components/cart/CartSummary';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCart } from '@/hooks/useCart';
import { api, ApiError } from '@/lib/api';
import { formatCurrency } from '@skipper/shared';
import type { Product } from '@skipper/shared';
import { cn } from '@/lib/cn';

export default function Cart() {
  const { items, removeItem } = useCart();
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const reduced = useReducedMotion();

  const productQueries = useQueries({
    queries: items.map((item) => ({
      queryKey: ['products', 'bySlugOrId', item.product_id],
      queryFn: async (): Promise<Product | null> => {
        try {
          return await api.get<Product>(`/api/products/id/${item.product_id}`);
        } catch (err) {
          // Treat a real 404 as "product deleted/archived" → null (will be
          // pruned). Treat anything else (network, 5xx) as a transient error
          // so the cart isn't silently emptied by an API blip.
          if (err instanceof ApiError && err.status === 404) return null;
          throw err;
        }
      },
      staleTime: 5 * 60_000,
      retry: 1,
    })),
  });

  const isLoading = productQueries.some((q) => q.isLoading);
  const products = productQueries
    .map((q) => q.data)
    .filter((p): p is Product => p !== null && p !== undefined);

  // Auto-prune cart entries whose product has been deleted (404 → null).
  // Skip while loading or while the query is in an error state so a transient
  // outage doesn't wipe the user's cart.
  useEffect(() => {
    items.forEach((item, i) => {
      const q = productQueries[i];
      if (q && q.isFetched && !q.isFetching && !q.isError && q.data === null) {
        removeItem(item.product_id, item.variant_id ?? null);
      }
    });
  }, [items, productQueries, removeItem]);

  const productMap = new Map(products.map((p) => [p.id, p]));
  const subtotal = items.reduce((sum, item) => {
    const p = productMap.get(item.product_id);
    return sum + (p?.unit_price ?? 0) * item.quantity;
  }, 0);
  const canCheckout = !isLoading && products.length > 0 && subtotal > 0;

  if (items.length === 0) {
    return (
      <>
        <SEOHead title="Your cart" noindex />
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Cart' }]} />
        <div className="container py-16 md:py-32 flex flex-col items-center text-center gap-8 max-w-md mx-auto">
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
            <p className="text-brand-navy/60 text-[15px] md:text-[17px] leading-relaxed">
              Nothing added yet &mdash; but we have a lovely shop just waiting for you to
              browse.
            </p>
          </div>
          <Link to="/shop" className="w-full md:w-auto">
            <Button variant="primary" size="lg" className="gap-2 w-full md:w-auto">
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

      <div className="container py-4 md:py-14 pb-40 md:pb-14">
        <div className="mb-6 md:mb-12">
          <span className="editorial-label text-brand-cyan-deep">
            <span className="accent-line mr-3" aria-hidden="true" />
            Your selection
          </span>
          <h1 className="mt-3 md:mt-4 font-display text-[clamp(2rem,8vw,4rem)] md:text-display-md leading-[1] tracking-[-0.03em] text-brand-navy">
            <span className="font-display-italic">Cart.</span>
          </h1>
          <p className="mt-2 md:mt-3 text-sm text-brand-navy/60 tabular-nums">
            {items.length} item{items.length === 1 ? '' : 's'}
          </p>
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
              className="inline-flex items-center gap-1.5 mt-8 md:mt-10 text-sm font-medium text-brand-navy/65 hover:text-brand-navy transition-colors"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Continue shopping
            </Link>
          </div>

          {/* Desktop summary sidebar */}
          <div className="hidden lg:block space-y-5 lg:sticky lg:top-24 lg:self-start">
            <CartSummary items={items} products={products} />
            {canCheckout ? (
              <Link to="/checkout" className="block">
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
            <p className="text-[11px] text-brand-navy/50 text-center tracking-wider uppercase">
              Secure Paystack checkout &middot; Returns within 7 days
            </p>
          </div>
        </div>
      </div>

      {/* =================================================== */}
      {/* MOBILE — sticky bottom checkout bar, above the tab    */}
      {/* bar. Expandable summary (subtotal + delivery).       */}
      {/* =================================================== */}
      <div
        className={cn(
          'lg:hidden fixed inset-x-0 z-30',
          'bottom-[calc(64px+env(safe-area-inset-bottom))]',
          'border-t border-brand-navy/10 bg-brand-ivory/95 backdrop-blur-md',
        )}
        style={{
          WebkitBackdropFilter: 'blur(12px) saturate(1.4)',
          backdropFilter: 'blur(12px) saturate(1.4)',
        }}
      >
        <button
          type="button"
          onClick={() => setSummaryExpanded((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left"
          aria-expanded={summaryExpanded}
          aria-label={summaryExpanded ? 'Collapse summary' : 'Expand summary'}
        >
          <div>
            <span className="editorial-label text-brand-navy/55 text-[9px]">Subtotal</span>
            <p className="font-display text-[22px] leading-none text-brand-navy tabular-nums font-medium mt-0.5">
              {formatCurrency(subtotal)}
            </p>
          </div>
          <span className="text-brand-navy/60 text-[12px] font-medium inline-flex items-center gap-1">
            {summaryExpanded ? 'Hide' : 'Details'}
            {summaryExpanded ? (
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            )}
          </span>
        </button>

        <AnimatePresence initial={false}>
          {summaryExpanded && (
            <motion.div
              initial={reduced ? false : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-3 space-y-1.5 text-sm border-b border-brand-navy/8">
                <div className="flex justify-between">
                  <span className="text-brand-navy/65">Items ({items.length})</span>
                  <span className="font-medium text-brand-navy tabular-nums">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-navy/65">Delivery</span>
                  <span className="text-brand-navy/50 italic text-[12px]">
                    Calculated at checkout
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="px-4 pt-2 pb-3">
          {canCheckout ? (
            <Link to="/checkout" className="block">
              <Button variant="primary" size="lg" className="w-full gap-2 h-12">
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                Checkout &middot;{' '}
                <span className="tabular-nums">{formatCurrency(subtotal)}</span>
                <ArrowRight className="h-4 w-4 ml-auto" aria-hidden="true" />
              </Button>
            </Link>
          ) : (
            <Button variant="primary" size="lg" className="w-full gap-2 h-12" disabled>
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              Checkout &middot;{' '}
              <span className="tabular-nums">{formatCurrency(subtotal)}</span>
              <ArrowRight className="h-4 w-4 ml-auto" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
