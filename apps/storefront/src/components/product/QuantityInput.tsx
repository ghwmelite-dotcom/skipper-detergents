import { Minus, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/cn';

interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

export function QuantityInput({
  value,
  onChange,
  min = 1,
  max,
  className,
}: QuantityInputProps) {
  const decrement = () => onChange(Math.max(min, value - 1));
  const increment = () =>
    onChange(max !== undefined ? Math.min(max, value + 1) : value + 1);

  const btn =
    'inline-flex h-12 w-12 items-center justify-center text-brand-navy transition-colors duration-200 ease-editorial hover:bg-brand-navy/5 disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:bg-brand-navy/10';

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md border border-brand-navy/15 bg-brand-ivory overflow-hidden',
        className,
      )}
      role="group"
      aria-label="Quantity"
    >
      <button
        type="button"
        onClick={decrement}
        disabled={value <= min}
        aria-label="Decrease quantity"
        className={cn(btn, 'border-r border-brand-navy/10')}
      >
        <Minus className="h-4 w-4" aria-hidden="true" strokeWidth={2} />
      </button>
      <div
        className="h-12 w-14 flex items-center justify-center text-[15px] font-semibold text-brand-navy tabular-nums"
        aria-live="polite"
        aria-atomic="true"
      >
        <AnimatePresence mode="popLayout">
          <motion.span
            key={value}
            initial={{ y: 6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -6, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>
      <button
        type="button"
        onClick={increment}
        disabled={max !== undefined && value >= max}
        aria-label="Increase quantity"
        className={cn(btn, 'border-l border-brand-navy/10')}
      >
        <Plus className="h-4 w-4" aria-hidden="true" strokeWidth={2} />
      </button>
    </div>
  );
}
