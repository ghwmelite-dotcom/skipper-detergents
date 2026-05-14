import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import type { Product } from '@skipper/shared';
import { formatCurrency } from '@skipper/shared';
import { ProductIllustration } from '@/lib/productIllustration';
import { QuickBuyPanel } from './QuickBuyPanel';
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
  const reduced = useReducedMotion();

  const bulkCapable = product.is_bulk_available;
  const firstTier = lowestBulkUnitPrice(product);
  const hasDiscount =
    product.compare_at_price !== null && product.compare_at_price > product.unit_price;
  const inStock = product.stock_quantity > 0;
  const savings = hasDiscount ? product.compare_at_price! - product.unit_price : 0;
  const bulkSavingsPct =
    bulkCapable && firstTier && product.unit_price > 0
      ? Math.round(((product.unit_price - firstTier.unit_price) / product.unit_price) * 100)
      : 0;

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
      className={cn('group h-full flex flex-col', className)}
    >
      <Link
        to={`/product/${product.slug}`}
        className="flex flex-col flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg"
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

          {!inStock && (
            <div className="absolute inset-0 bg-brand-ivory/75 backdrop-blur-[1px] flex items-center justify-center">
              <span className="font-display-italic text-lg text-brand-navy">Out of stock</span>
            </div>
          )}
        </motion.div>

        {/* Info — flex column with the price pushed to the bottom so every
            card in a row aligns regardless of name length. */}
        <div className="pt-4 px-0.5 flex flex-col flex-1">
          <div className="space-y-1">
            {product.brand && (
              <p className="editorial-label text-brand-cyan-deep">{product.brand}</p>
            )}
            <h3 className="font-display text-[17px] leading-[1.2] text-brand-navy line-clamp-2 group-hover:text-brand-cyan-deep transition-colors duration-200 font-medium min-h-[2.4em]">
              {product.name}
            </h3>
          </div>
          <div className="mt-auto">
            <div className="pt-2 flex items-baseline gap-2 flex-wrap">
              <span className="text-[16px] font-bold text-brand-cyan-deep tabular-nums">
                {formatCurrency(product.unit_price)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-[13px] text-brand-navy/45 line-through tabular-nums">
                    {formatCurrency(product.compare_at_price!)}
                  </span>
                  <span className="text-[11px] font-medium text-brand-red tracking-wide uppercase">
                    Save {formatCurrency(savings)}
                  </span>
                </>
              )}
              {!hasDiscount && bulkCapable && firstTier && (
                <span className="text-[11px] text-brand-navy/55 tabular-nums">
                  · {formatCurrency(firstTier.unit_price)}/ea @ {firstTier.min_quantity}+
                </span>
              )}
            </div>
            <div className="pt-3 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 md:transition-opacity md:duration-300 md:ease-editorial">
              <QuickBuyPanel product={product} />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
