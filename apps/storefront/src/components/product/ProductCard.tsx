import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Check } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import type { Product } from '@skipper/shared';
import { formatCurrency } from '@skipper/shared';
import { useCart } from '@/hooks/useCart';
import { cn } from '@/lib/cn';

const PLACEHOLDER = 'https://placehold.co/600x600/F4EDE0/0B2545?text=Skipper&font=Roboto';

interface ProductCardProps {
  product: Product;
  className?: string;
  index?: number;
}

export function ProductCard({ product, className, index = 0 }: ProductCardProps) {
  const { addItem } = useCart();
  const reduced = useReducedMotion();
  const [justAdded, setJustAdded] = useState(false);

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    addItem({ product_id: product.id, quantity: 1 });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1400);
  }

  const primaryImage = PLACEHOLDER;
  const hasDiscount =
    product.compare_at_price !== null && product.compare_at_price > product.unit_price;
  const inStock = product.stock_quantity > 0;
  const savings = hasDiscount ? product.compare_at_price! - product.unit_price : 0;

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1], delay: Math.min(index * 0.04, 0.3) }}
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
          <img
            src={primaryImage}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-[600ms] ease-editorial group-hover:scale-[1.04]"
            loading="lazy"
          />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {product.is_bulk_available && (
              <motion.span
                initial={reduced ? false : { scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 24 }}
                className="inline-flex items-center rounded-full bg-brand-navy px-2 py-0.5 text-[10px] font-medium tracking-wider text-brand-ivory uppercase"
              >
                Bulk
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

          {/* Quick-add button — appears on hover */}
          <motion.button
            type="button"
            onClick={handleAddToCart}
            disabled={!inStock}
            aria-label={`Add ${product.name} to cart`}
            initial={{ opacity: 0, y: 10 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            {...(reduced ? { animate: { opacity: 1, y: 0 } } : {})}
            className={cn(
              'absolute bottom-3 right-3 inline-flex h-10 w-10 items-center justify-center rounded-full',
              'bg-brand-ivory text-brand-navy shadow-lg',
              'transition-opacity duration-300 ease-editorial',
              !reduced && 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
              justAdded ? 'bg-brand-cyan text-white' : '',
              !inStock ? 'opacity-50 cursor-not-allowed' : '',
            )}
          >
            {justAdded ? (
              <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
            ) : (
              <Plus className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            )}
          </motion.button>

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
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-[15px] font-semibold text-brand-navy tabular-nums">
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
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
