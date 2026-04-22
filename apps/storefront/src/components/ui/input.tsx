import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-11 w-full rounded-md border border-input bg-background/70 px-3.5 py-2',
        'text-base md:text-[15px] font-medium text-foreground',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'placeholder:text-muted-foreground placeholder:font-normal',
        'transition-colors duration-200 ease-editorial',
        'hover:border-brand-navy/30',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background focus-visible:border-transparent',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
