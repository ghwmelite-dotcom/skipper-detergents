import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-9 w-full rounded border bg-white px-2.5 text-sm text-ink-900 transition-colors',
        'placeholder:text-ink-400',
        'focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/25',
        'disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-500',
        invalid ? 'border-danger-500' : 'border-ink-200',
        className,
      )}
      {...rest}
    />
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded border bg-white px-2.5 py-2 text-sm text-ink-900 transition-colors',
        'placeholder:text-ink-400',
        'focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/25',
        'disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-500',
        invalid ? 'border-danger-500' : 'border-ink-200',
        className,
      )}
      {...rest}
    />
  );
});

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        'h-9 w-full rounded border bg-white px-2.5 text-sm text-ink-900 transition-colors',
        'focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/25',
        'disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-500',
        invalid ? 'border-danger-500' : 'border-ink-200',
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
});
