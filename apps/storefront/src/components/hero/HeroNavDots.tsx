import { cn } from '@/lib/cn';
import type { HeroTheme } from './slides';

interface HeroNavDotsProps {
  count: number;
  active: number;
  onSelect: (index: number) => void;
  theme: HeroTheme;
  className?: string;
}

/**
 * 4-dot slide indicator. The active dot is a filled navy disc wrapped by a
 * wider cyan ring; the others are faint navy. On dark (navy-backdrop) slides,
 * colors invert to ivory.
 */
export function HeroNavDots({
  count,
  active,
  onSelect,
  theme,
  className,
}: HeroNavDotsProps) {
  const isDark = theme === 'dark';
  return (
    <div
      role="tablist"
      aria-label="Hero slides"
      className={cn('flex items-center gap-4', className)}
    >
      {Array.from({ length: count }).map((_, i) => {
        const isActive = i === active;
        return (
          <button
            key={i}
            role="tab"
            type="button"
            aria-selected={isActive}
            aria-label={`Go to slide ${i + 1}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onSelect(i)}
            className={cn(
              'relative flex h-6 w-6 items-center justify-center rounded-full',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2',
              isDark
                ? 'focus-visible:ring-offset-brand-navy'
                : 'focus-visible:ring-offset-brand-ivory',
            )}
          >
            {/* Outer ring (only active) */}
            <span
              aria-hidden="true"
              className={cn(
                'absolute inset-0 rounded-full transition-all duration-300 ease-editorial',
                isActive
                  ? isDark
                    ? 'bg-brand-cyan/25 ring-1 ring-brand-cyan/50'
                    : 'bg-brand-cyan/20 ring-1 ring-brand-cyan/40'
                  : 'bg-transparent ring-0',
              )}
            />
            {/* Inner dot */}
            <span
              aria-hidden="true"
              className={cn(
                'relative block rounded-full transition-all duration-300 ease-editorial',
                isActive
                  ? isDark
                    ? 'h-[10px] w-[10px] bg-brand-ivory'
                    : 'h-[10px] w-[10px] bg-brand-navy'
                  : isDark
                    ? 'h-[6px] w-[6px] bg-brand-ivory/30'
                    : 'h-[6px] w-[6px] bg-brand-navy/25',
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
