import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClass: Record<Variant, string> = {
  primary:
    'bg-navy-700 text-white hover:bg-navy-600 border border-navy-700 shadow-admin-sm disabled:bg-ink-400 disabled:border-ink-400',
  secondary:
    'bg-white text-ink-800 border border-ink-200 hover:bg-ink-50 shadow-admin-sm',
  ghost: 'bg-transparent text-ink-700 hover:bg-ink-100 border border-transparent',
  danger:
    'bg-danger-500 text-white hover:bg-danger-600 border border-danger-500 shadow-admin-sm disabled:bg-ink-400 disabled:border-ink-400',
  outline: 'bg-transparent text-ink-800 border border-ink-300 hover:bg-ink-50',
};

const sizeClass: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-xs rounded',
  md: 'h-9 px-3 text-sm rounded',
  lg: 'h-10 px-4 text-sm rounded-md',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading = false, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-1',
        'disabled:cursor-not-allowed disabled:opacity-80',
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  );
});
