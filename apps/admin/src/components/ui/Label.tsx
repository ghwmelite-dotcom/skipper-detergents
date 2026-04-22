import type { LabelHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Label({
  className,
  children,
  ...rest
}: LabelHTMLAttributes<HTMLLabelElement>): JSX.Element {
  return (
    <label
      className={cn('mb-1 block text-xs font-medium text-ink-700', className)}
      {...rest}
    >
      {children}
    </label>
  );
}

export function FieldError({ message }: { message?: string | undefined }): JSX.Element | null {
  if (!message) return null;
  return <p className="mt-1 text-xs text-danger-500">{message}</p>;
}
