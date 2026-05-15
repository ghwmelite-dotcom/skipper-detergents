import { useEffect, useRef, type ReactNode } from 'react';
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

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    // Remember who was focused before we opened so we can restore on close.
    restoreFocusRef.current = (document.activeElement as HTMLElement | null) ?? null;

    const panel = panelRef.current;
    // Defer the initial focus until after Framer Motion mounts the panel.
    const focusTimer = window.setTimeout(() => {
      if (!panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      const target = focusables[0] ?? panel;
      target.focus({ preventScroll: true });
    }, 30);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      // Trap Tab/Shift+Tab inside the sheet so keyboard users can't drift back
      // onto the underlying page (which is aria-hidden behind a backdrop but
      // still focusable by tab order without the trap).
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute('aria-hidden') && el.offsetParent !== null,
      );
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      // Restore focus to the trigger so keyboard users land where they were.
      const toRestore = restoreFocusRef.current;
      if (toRestore && typeof toRestore.focus === 'function') {
        toRestore.focus({ preventScroll: true });
      }
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
            ref={panelRef}
            tabIndex={-1}
            initial={{ x: reduced ? 0 : xHidden, y: reduced ? 0 : yHidden }}
            animate={{ x: 0, y: 0 }}
            exit={{ x: reduced ? 0 : xHidden, y: reduced ? 0 : yHidden }}
            transition={
              reduced
                ? { duration: 0 }
                : { type: 'spring', stiffness: 320, damping: 34, mass: 0.9 }
            }
            className={cn(
              'relative flex flex-col bg-brand-ivory shadow-editorial outline-none',
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
