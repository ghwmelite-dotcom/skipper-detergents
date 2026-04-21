import { useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  side?: 'left' | 'right';
  children: ReactNode;
  title: string;
}

export function Sheet({ open, onClose, side = 'right', children, title }: SheetProps) {
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className={cn(
          'absolute inset-0 bg-black/50 transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          'relative ml-auto flex h-full w-full max-w-sm flex-col bg-background shadow-lg',
          'transition-transform duration-300 ease-enter',
          side === 'left' && 'mr-auto ml-0',
        )}
      >
        {children}
      </div>
    </div>
  );
}
