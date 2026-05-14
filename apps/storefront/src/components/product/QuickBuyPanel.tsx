import { useState } from 'react';
import { Plus, Minus, Check, ShoppingBag } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { Product } from '@skipper/shared';
import { useCart } from '@/hooks/useCart';
import { cn } from '@/lib/cn';

interface QuickBuyPanelProps {
  product: Pick<Product, 'id' | 'name' | 'stock_quantity'>;
  className?: string;
  /** Tighter sizing for very compact card layouts (mobile category grid). */
  compact?: boolean;
}

/**
 * QuickBuyPanel — round cyan stepper + full-width navy "Add to cart" pill,
 * stacked. Always renders at full opacity; the caller is responsible for any
 * hover-reveal animation (so the panel can live inside the card content
 * flow instead of overlapping the image).
 */
export function QuickBuyPanel({ product, className, compact = false }: QuickBuyPanelProps) {
  const { addItem } = useCart();
  const reduced = useReducedMotion();
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const inStock = product.stock_quantity > 0;
  const maxQty = inStock ? product.stock_quantity : 1;

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

  // Touch targets are larger on small screens (where the panel is always
  // visible and finger taps need room) and collapse to tighter dimensions
  // on md+ where it's a hover affordance and cards are denser.
  const round = compact
    ? 'h-10 w-10 md:h-8 md:w-8'
    : 'h-11 w-11 md:h-10 md:w-10';
  const icon = compact
    ? 'h-4 w-4 md:h-3.5 md:w-3.5'
    : 'h-[18px] w-[18px] md:h-4 md:w-4';
  const qtyText = compact
    ? 'text-[15px] md:text-[14px]'
    : 'text-[17px] md:text-[16px]';
  const addH = compact ? 'h-11 md:h-9' : 'h-12 md:h-11';
  const addText = compact ? 'text-[13px] md:text-[12px]' : 'text-[14px] md:text-[13px]';

  return (
    <div
      onClick={stop}
      aria-label={`Quick add ${product.name}`}
      className={cn(
        'flex flex-col gap-1.5',
        className,
      )}
    >
      {/* Stepper row */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={decrement}
          disabled={qty <= 1 || !inStock}
          aria-label="Decrease quantity"
          className={cn(
            'inline-flex items-center justify-center rounded-full transition-colors duration-150',
            'bg-brand-cyan-deep hover:bg-brand-cyan active:bg-brand-cyan text-brand-ivory shadow-sm',
            'disabled:opacity-40 disabled:pointer-events-none',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan-deep focus-visible:ring-offset-1',
            round,
          )}
        >
          <Minus className={icon} strokeWidth={3} aria-hidden="true" />
        </button>
        <div
          className={cn(
            'flex-1 inline-flex items-center justify-center font-bold text-brand-navy tabular-nums select-none',
            qtyText,
          )}
          aria-live="polite"
          aria-atomic="true"
        >
          <AnimatePresence mode="popLayout">
            <motion.span
              key={qty}
              initial={reduced ? false : { y: 5, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduced ? { opacity: 0 } : { y: -5, opacity: 0 }}
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
          className={cn(
            'inline-flex items-center justify-center rounded-full transition-colors duration-150',
            'bg-brand-cyan-deep hover:bg-brand-cyan active:bg-brand-cyan text-brand-ivory shadow-sm',
            'disabled:opacity-40 disabled:pointer-events-none',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan-deep focus-visible:ring-offset-1',
            round,
          )}
        >
          <Plus className={icon} strokeWidth={3} aria-hidden="true" />
        </button>
      </div>

      {/* Add-to-cart button */}
      <button
        type="button"
        onClick={handleAdd}
        disabled={!inStock}
        aria-label={`Add ${qty} of ${product.name} to cart`}
        className={cn(
          'w-full inline-flex items-center justify-center gap-1.5 rounded-full font-semibold tracking-wide transition-colors duration-200 shadow-sm',
          addH,
          addText,
          justAdded
            ? 'bg-brand-cyan-deep text-brand-ivory'
            : 'bg-brand-navy hover:bg-brand-navy/90 active:bg-brand-navy/80 text-brand-ivory',
          !inStock && 'opacity-50 cursor-not-allowed',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy focus-visible:ring-offset-1',
        )}
      >
        {justAdded ? (
          <>
            <Check className="h-3.5 w-3.5" strokeWidth={2.75} aria-hidden="true" />
            Added
          </>
        ) : (
          <>
            <ShoppingBag className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
            Add to cart
          </>
        )}
      </button>
    </div>
  );
}
