import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/cn';

export type SheetSide = 'left' | 'right' | 'bottom';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  side?: SheetSide;
  children: ReactNode;
  title: string;
  /** For bottom sheets only — cap the height. Defaults to "85vh". */
  maxHeight?: string;
  /** Extra classes for the inner panel. */
  className?: string;
}

export function Sheet({
  open,
  onClose,
  side = 'right',
  children,
  title,
  maxHeight = '85vh',
  className,
}: SheetProps) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const isBottom = side === 'bottom';
  const xHidden = side === 'right' ? '100%' : side === 'left' ? '-100%' : 0;
  const yHidden = isBottom ? '100%' : 0;

  return (
    <AnimatePresence>
      {open && (
        <div
          className={cn(
            'fixed inset-0 z-50 flex',
            isBottom && 'items-end',
          )}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            className="absolute inset-0 bg-brand-navy/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.25 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            initial={{ x: reduced ? 0 : xHidden, y: reduced ? 0 : yHidden }}
            animate={{ x: 0, y: 0 }}
            exit={{ x: reduced ? 0 : xHidden, y: reduced ? 0 : yHidden }}
            transition={
              reduced
                ? { duration: 0 }
                : { type: 'spring', stiffness: 320, damping: 34, mass: 0.9 }
            }
            className={cn(
              'relative flex flex-col bg-brand-ivory shadow-editorial',
              isBottom
                ? 'w-full rounded-t-2xl mx-auto max-w-[640px] pb-[env(safe-area-inset-bottom)]'
                : 'h-full w-full max-w-md',
              !isBottom && (side === 'right' ? 'ml-auto' : 'mr-auto'),
              className,
            )}
            style={isBottom ? { maxHeight } : {}}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
