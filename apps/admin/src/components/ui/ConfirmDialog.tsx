import { useEffect, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Optional content rendered between description and buttons (e.g., a reason textarea). */
  children?: ReactNode;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  loading,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps): JSX.Element | null {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-md border border-ink-200 bg-white p-5 shadow-admin-lg"
      >
        <div className="flex items-start gap-3">
          {tone === 'danger' && (
            <div className="rounded-full bg-danger-50 p-2">
              <AlertTriangle className="h-4 w-4 text-danger-500" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
            {description && <p className="mt-1 text-sm text-ink-600">{description}</p>}
          </div>
        </div>
        {children && <div className="mt-4">{children}</div>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading ?? false}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
