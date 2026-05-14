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
 * QuickBuyPanel — round stepper buttons + full-width Add-to-cart button,
 * stacked vertically. Lives below the product info, never on top of the
 * image. Buttons stop their own click propagation so callers can wrap the
 * card text in a Link to the PDP without the buy controls navigating.
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

  const round = compact ? 'h-9 w-9' : 'h-11 w-11';
  const icon = compact ? 'h-4 w-4' : 'h-[18px] w-[18px]';
  const qtyText = compact ? 'text-[16px]' : 'text-[18px]';
  const addH = compact ? 'h-10' : 'h-12';
  const addText = compact ? 'text-[13px]' : 'text-[14px]';

  return (
    <div
      onClick={stop}
      aria-label={`Quick add ${product.name}`}
      className={cn('flex flex-col gap-2', className)}
    >
      {/* Stepper row */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={decrement}
          disabled={qty <= 1 || !inStock}
          aria-label="Decrease quantity"
          className={cn(
            'inline-flex items-center justify-center rounded-full transition-colors duration-150',
            'bg-amber-400 hover:bg-amber-500 active:bg-amber-500 text-brand-navy shadow-sm',
            'disabled:opacity-40 disabled:pointer-events-none',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1',
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
              initial={reduced ? false : { y: 6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduced ? { opacity: 0 } : { y: -6, opacity: 0 }}
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
            'bg-amber-400 hover:bg-amber-500 active:bg-amber-500 text-brand-navy shadow-sm',
            'disabled:opacity-40 disabled:pointer-events-none',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1',
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
          'w-full inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-wide transition-colors duration-200 shadow-sm',
          addH,
          addText,
          justAdded
            ? 'bg-emerald-700 text-white'
            : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-700 text-white',
          !inStock && 'opacity-50 cursor-not-allowed',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1',
        )}
      >
        {justAdded ? (
          <>
            <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
            Added
          </>
        ) : (
          <>
            <ShoppingBag className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
            Add to cart
          </>
        )}
      </button>
    </div>
  );
}
