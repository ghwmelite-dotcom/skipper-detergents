import { motion, useReducedMotion } from 'framer-motion';
import { usePurchaseModeStore, type PurchaseMode } from '@/stores/purchaseModeStore';
import { cn } from '@/lib/cn';

type Size = 'sm' | 'md' | 'lg';

interface ModeToggleProps {
  size?: Size;
  className?: string;
  /** Visual tint — ivory (default) reads well on sand, dark for navy sections. */
  tone?: 'ivory' | 'dark';
  /** Override the layoutId if multiple toggles share a page (they need unique ids
   *  so Framer Motion doesn't try to animate across them). */
  layoutIdPrefix?: string;
  /** Fired after switching. */
  onChange?: (mode: PurchaseMode) => void;
}

const OPTIONS: { value: PurchaseMode; label: string }[] = [
  { value: 'single', label: 'Single' },
  { value: 'bulk', label: 'Bulk' },
];

const SIZE_MAP: Record<Size, { pad: string; text: string; height: string }> = {
  sm: { pad: 'px-3', text: 'text-[11px]', height: 'h-8' },
  md: { pad: 'px-4', text: 'text-[12px]', height: 'h-9' },
  lg: { pad: 'px-5', text: 'text-[13px]', height: 'h-11' },
};

export function ModeToggle({
  size = 'md',
  className,
  tone = 'ivory',
  layoutIdPrefix = 'mode-toggle',
  onChange,
}: ModeToggleProps) {
  const mode = usePurchaseModeStore((s) => s.mode);
  const setMode = usePurchaseModeStore((s) => s.setMode);
  const reduced = useReducedMotion();
  const s = SIZE_MAP[size];

  const isDark = tone === 'dark';
  const pillId = `${layoutIdPrefix}-pill`;

  function select(next: PurchaseMode) {
    if (mode === next) return;
    setMode(next);
    onChange?.(next);
  }

  return (
    <div
      role="tablist"
      aria-label="Purchase mode"
      className={cn(
        'relative inline-flex items-center rounded-full p-1 select-none',
        'border',
        isDark
          ? 'border-brand-ivory/15 bg-brand-ivory/5'
          : 'border-brand-navy/10 bg-brand-ivory',
        s.height,
        className,
      )}
    >
      {OPTIONS.map((opt) => {
        const active = mode === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={`panel-${opt.value}`}
            onClick={() => select(opt.value)}
            className={cn(
              'relative z-10 inline-flex items-center justify-center rounded-full font-medium tracking-wide transition-colors duration-200',
              s.pad,
              s.text,
              'h-full min-w-[64px]',
              active
                ? isDark
                  ? 'text-brand-navy'
                  : 'text-brand-ivory'
                : isDark
                  ? 'text-brand-ivory/70 hover:text-brand-ivory'
                  : 'text-brand-navy/65 hover:text-brand-navy',
            )}
          >
            <span className="relative z-10">{opt.label}</span>
            {active && (
              <motion.span
                layoutId={pillId}
                aria-hidden="true"
                className={cn(
                  'absolute inset-0 rounded-full',
                  isDark ? 'bg-brand-cyan' : 'bg-brand-navy',
                )}
                transition={
                  reduced
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 420, damping: 32 }
                }
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
