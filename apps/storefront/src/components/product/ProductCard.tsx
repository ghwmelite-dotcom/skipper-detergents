import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Minus, Check, ShoppingBag } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { Product } from '@skipper/shared';
import { formatCurrency } from '@skipper/shared';
import { useCart } from '@/hooks/useCart';
import { ProductIllustration } from '@/lib/productIllustration';
import { cn } from '@/lib/cn';

interface ProductCardProps {
  product: Product & { bulk_tiers?: { unit_price: number; min_quantity: number }[] };
  className?: string;
  index?: number;
}

function lowestBulkUnitPrice(
  product: ProductCardProps['product'],
): { unit_price: number; min_quantity: number } | null {
  const tiers = product.bulk_tiers ?? [];
  if (!tiers.length) return null;
  const sorted = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);
  return sorted[0] ?? null;
}

export function ProductCard({ product, className, index = 0 }: ProductCardProps) {
  const { addItem } = useCart();
  const reduced = useReducedMotion();
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const bulkCapable = product.is_bulk_available;
  const firstTier = lowestBulkUnitPrice(product);
  const hasDiscount =
    product.compare_at_price !== null && product.compare_at_price > product.unit_price;
  const inStock = product.stock_quantity > 0;
  const maxQty = product.stock_quantity > 0 ? product.stock_quantity : 1;
  const savings = hasDiscount ? product.compare_at_price! - product.unit_price : 0;

  const minBulkQty = firstTier?.min_quantity ?? product.bulk_minimum_qty ?? 0;
  const reachedBulkTier = bulkCapable && firstTier !== null && qty >= minBulkQty;
  const effectiveUnitPrice = reachedBulkTier ? firstTier.unit_price : product.unit_price;
  const bulkSavingsPct =
    bulkCapable && firstTier && product.unit_price > 0
      ? Math.round(((product.unit_price - firstTier.unit_price) / product.unit_price) * 100)
      : 0;

  function stop(e: React.MouseEvent | React.PointerEvent | React.TouchEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleAdd(e: React.MouseEvent) {
    stop(e);
    if (!inStock) return;
    addItem({ product_id: product.id, quantity: qty });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1400);
  }

  function decrement(e: React.MouseEvent) {
    stop(e);
    setQty((q) => Math.max(1, q - 1));
  }
  function increment(e: React.MouseEvent) {
    stop(e);
    setQty((q) => Math.min(maxQty, q + 1));
  }

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{
        duration: 0.55,
        ease: [0.2, 0.8, 0.2, 1],
        delay: Math.min(index * 0.04, 0.3),
      }}
      className={cn('group', className)}
    >
      <Link
        to={`/product/${product.slug}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg"
        tabIndex={0}
      >
        {/* Image card */}
        <motion.div
          {...(reduced ? {} : { whileHover: { y: -6 } })}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="relative aspect-square overflow-hidden rounded-lg border border-brand-navy/8 bg-brand-sand/60 transition-shadow duration-300 ease-editorial group-hover:shadow-editorial"
        >
          <ProductIllustration
            product={product}
            className="h-full w-full object-cover transition-transform duration-[600ms] ease-editorial group-hover:scale-[1.04]"
          />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {bulkCapable && bulkSavingsPct > 0 && (
              <motion.span
                initial={reduced ? false : { scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 24 }}
                className="inline-flex items-center rounded-full bg-brand-navy px-2 py-0.5 text-[10px] font-medium tracking-wider text-brand-ivory uppercase"
              >
                Bulk -{bulkSavingsPct}%
              </motion.span>
            )}
            {hasDiscount && (
              <motion.span
                initial={reduced ? false : { scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 400, damping: 24 }}
                className="inline-flex items-center rounded-full bg-brand-red px-2 py-0.5 text-[10px] font-medium tracking-wider text-white uppercase"
              >
                Sale
              </motion.span>
            )}
          </div>

          {/* Quick-buy panel — slides up from bottom on hover (desktop),
              always visible on touch devices. */}
          <div
            onClick={stop}
            className={cn(
              'absolute inset-x-2 bottom-2 rounded-md bg-brand-ivory/95 backdrop-blur-sm border border-brand-navy/8 shadow-md',
              'px-2 py-1.5 flex items-center gap-1.5',
              // On screens that support hover (desktop), hide-then-reveal.
              // Mobile / touch keeps the panel always visible.
              'opacity-100 translate-y-0',
              'md:opacity-0 md:translate-y-2 md:transition-all md:duration-300 md:ease-editorial',
              'md:group-hover:opacity-100 md:group-hover:translate-y-0',
              'md:focus-within:opacity-100 md:focus-within:translate-y-0',
            )}
            aria-label={`Quick add ${product.name}`}
          >
            {/* Compact qty stepper */}
            <div className="inline-flex items-center rounded border border-brand-navy/15 bg-brand-ivory overflow-hidden">
              <button
                type="button"
                onClick={decrement}
                disabled={qty <= 1 || !inStock}
                aria-label="Decrease quantity"
                className="h-8 w-8 inline-flex items-center justify-center text-brand-navy hover:bg-brand-navy/5 disabled:opacity-30 disabled:pointer-events-none"
              >
                <Minus className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
              </button>
              <div
                className="h-8 min-w-[26px] px-1 flex items-center justify-center text-[13px] font-semibold text-brand-navy tabular-nums"
                aria-live="polite"
                aria-atomic="true"
              >
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={qty}
                    initial={reduced ? false : { y: 4, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={reduced ? { opacity: 0 } : { y: -4, opacity: 0 }}
                    transition={{ duration: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
                  >
                    {qty}
                  </motion.span>
                </AnimatePresence>
              </div>
              <button
                type="button"
                onClick={increment}
                disabled={qty >= maxQty || !inStock}
                aria-label="Increase quantity"
                className="h-8 w-8 inline-flex items-center justify-center text-brand-navy hover:bg-brand-navy/5 disabled:opacity-30 disabled:pointer-events-none"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleAdd}
              disabled={!inStock}
              aria-label={`Add ${qty} of ${product.name} to cart`}
              className={cn(
                'flex-1 h-8 inline-flex items-center justify-center gap-1 rounded text-[12px] font-semibold tracking-wide transition-colors duration-200',
                justAdded
                  ? 'bg-brand-cyan text-white'
                  : 'bg-brand-navy text-brand-ivory hover:bg-brand-navy/90',
                !inStock && 'opacity-50 cursor-not-allowed',
              )}
            >
              {justAdded ? (
                <>
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
                  Added
                </>
              ) : (
                <>
                  <ShoppingBag className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                  Add
                </>
              )}
            </button>
          </div>

          {!inStock && (
            <div className="absolute inset-0 bg-brand-ivory/75 backdrop-blur-[1px] flex items-center justify-center">
              <span className="font-display-italic text-lg text-brand-navy">Out of stock</span>
            </div>
          )}
        </motion.div>

        {/* Info */}
        <div className="pt-4 px-0.5 space-y-1">
          {product.brand && (
            <p className="editorial-label text-brand-cyan-deep">{product.brand}</p>
          )}
          <h3 className="font-display text-[17px] leading-[1.2] text-brand-navy line-clamp-2 group-hover:text-brand-cyan-deep transition-colors duration-200 font-medium">
            {product.name}
          </h3>
          <div className="flex items-baseline gap-2 pt-1 flex-wrap">
            <span className="text-[15px] font-semibold text-brand-navy tabular-nums">
              {formatCurrency(effectiveUnitPrice)}
            </span>
            {reachedBulkTier && (
              <span className="text-[11px] font-medium text-brand-cyan-deep tracking-wide uppercase">
                Bulk price
              </span>
            )}
            {!reachedBulkTier && hasDiscount && (
              <>
                <span className="text-[13px] text-brand-navy/45 line-through tabular-nums">
                  {formatCurrency(product.compare_at_price!)}
                </span>
                <span className="text-[11px] font-medium text-brand-red tracking-wide uppercase">
                  Save {formatCurrency(savings)}
                </span>
              </>
            )}
            {!reachedBulkTier && bulkCapable && firstTier && (
              <span className="text-[11px] text-brand-navy/55 tabular-nums">
                · {formatCurrency(firstTier.unit_price)}/ea @ {firstTier.min_quantity}+
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
