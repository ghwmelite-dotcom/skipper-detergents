import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/cn';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  side?: 'left' | 'right';
  children: ReactNode;
  title: string;
}

export function Sheet({ open, onClose, side = 'right', children, title }: SheetProps) {
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

  const xHidden = side === 'right' ? '100%' : '-100%';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label={title}>
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
            initial={{ x: reduced ? 0 : xHidden }}
            animate={{ x: 0 }}
            exit={{ x: reduced ? 0 : xHidden }}
            transition={
              reduced
                ? { duration: 0 }
                : { type: 'spring', stiffness: 320, damping: 34, mass: 0.9 }
            }
            className={cn(
              'relative flex h-full w-full max-w-md flex-col bg-brand-ivory shadow-editorial',
              side === 'right' ? 'ml-auto' : 'mr-auto',
            )}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
