import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'accent';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-navy text-brand-ivory hover:bg-brand-navy-dark active:scale-[.98] shadow-sm hover:shadow-md',
  secondary:
    'bg-brand-cyan text-white hover:bg-brand-cyan-deep active:scale-[.98] shadow-sm',
  accent:
    'bg-brand-sand text-brand-navy hover:bg-brand-sand-warm active:scale-[.98]',
  outline:
    'border border-brand-navy/20 bg-transparent text-brand-navy hover:bg-brand-navy hover:text-brand-ivory',
  ghost: 'bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground',
  destructive:
    'bg-brand-red text-white hover:bg-brand-red/90 active:scale-[.98] shadow-sm',
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-[13px] rounded-sm',
  md: 'h-11 px-5 text-sm rounded-md',
  lg: 'h-12 px-7 text-[15px] rounded-md',
  xl: 'h-14 px-9 text-base rounded-md',
  icon: 'h-11 w-11 rounded-md',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium',
        'transition-[background-color,color,transform,box-shadow] duration-200 ease-editorial',
        'disabled:pointer-events-none disabled:opacity-50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
