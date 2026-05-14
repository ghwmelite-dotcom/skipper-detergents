import { useState } from 'react';
import { Plus, Minus, Check, ShoppingBag } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { Product } from '@skipper/shared';
import { useCart } from '@/hooks/useCart';
import { cn } from '@/lib/cn';

interface QuickBuyPanelProps {
  product: Pick<Product, 'id' | 'name' | 'stock_quantity'>;
  /** Tailwind classes for absolute-positioning the panel inside its parent
   *  (the parent must be position: relative). Defaults to bottom-center. */
  className?: string;
  /** When true, the panel is always visible. Otherwise it slides up on hover
   *  on devices that support hover and is always visible on touch devices. */
  alwaysVisible?: boolean;
  /** Smaller stepper/button heights for cramped layouts (e.g. mobile grids). */
  compact?: boolean;
}

export function QuickBuyPanel({
  product,
  className,
  alwaysVisible = false,
  compact = false,
}: QuickBuyPanelProps) {
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

  // Touch targets are larger on small screens for easier tapping, then shrink
  // on md+ where the panel is a hover affordance and density matters more.
  const btnH = compact ? 'h-10 md:h-7' : 'h-11 md:h-8';
  const stepW = compact ? 'w-10 md:w-7' : 'w-11 md:w-8';
  const stepIcon = compact ? 'h-[18px] w-[18px] md:h-3 md:w-3' : 'h-5 w-5 md:h-3.5 md:w-3.5';
  const stroke = 2.75;

  return (
    <div
      onClick={stop}
      aria-label={`Quick add ${product.name}`}
      className={cn(
        'rounded-md bg-brand-ivory/95 backdrop-blur-sm border border-brand-navy/8 shadow-md',
        compact ? 'px-1.5 py-1 gap-1' : 'px-2 py-1.5 gap-1.5',
        'flex items-center',
        alwaysVisible
          ? 'opacity-100 translate-y-0'
          : [
              'opacity-100 translate-y-0',
              'md:opacity-0 md:translate-y-2 md:transition-all md:duration-300 md:ease-editorial',
              'md:group-hover:opacity-100 md:group-hover:translate-y-0',
              'md:focus-within:opacity-100 md:focus-within:translate-y-0',
            ].join(' '),
        className,
      )}
    >
      <div className="inline-flex items-center rounded border border-brand-navy/15 bg-brand-ivory overflow-hidden">
        <button
          type="button"
          onClick={decrement}
          disabled={qty <= 1 || !inStock}
          aria-label="Decrease quantity"
          className={cn(
            'inline-flex items-center justify-center text-brand-navy hover:bg-brand-navy/5 disabled:opacity-30 disabled:pointer-events-none',
            btnH,
            stepW,
          )}
        >
          <Minus className={stepIcon} strokeWidth={stroke} aria-hidden="true" />
        </button>
        <div
          className={cn(
            'inline-flex items-center justify-center text-brand-navy tabular-nums font-semibold',
            btnH,
            compact
              ? 'min-w-[28px] md:min-w-[20px] px-1 md:px-0.5 text-[15px] md:text-[12px]'
              : 'min-w-[32px] md:min-w-[26px] px-1.5 md:px-1 text-[16px] md:text-[13px]',
          )}
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
          className={cn(
            'inline-flex items-center justify-center text-brand-navy hover:bg-brand-navy/5 disabled:opacity-30 disabled:pointer-events-none',
            btnH,
            stepW,
          )}
        >
          <Plus className={stepIcon} strokeWidth={stroke} aria-hidden="true" />
        </button>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={!inStock}
        aria-label={`Add ${qty} of ${product.name} to cart`}
        className={cn(
          'flex-1 inline-flex items-center justify-center gap-1.5 rounded font-semibold tracking-wide transition-colors duration-200',
          btnH,
          compact ? 'text-[13px] md:text-[11px]' : 'text-[14px] md:text-[12px]',
          justAdded
            ? 'bg-brand-cyan text-white'
            : 'bg-brand-navy text-brand-ivory hover:bg-brand-navy/90',
          !inStock && 'opacity-50 cursor-not-allowed',
        )}
      >
        {justAdded ? (
          <>
            <Check className={stepIcon} strokeWidth={2.5} aria-hidden="true" />
            Added
          </>
        ) : (
          <>
            <ShoppingBag className={stepIcon} strokeWidth={2} aria-hidden="true" />
            Add
          </>
        )}
      </button>
    </div>
  );
}
