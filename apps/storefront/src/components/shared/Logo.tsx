import { cn } from '@/lib/cn';

type LogoVariant = 'mark' | 'seal' | 'wordmark';

interface LogoProps {
  variant?: LogoVariant;
  className?: string;
  /** When using variant="wordmark", sets the font size of the wordmark text. */
  textClassName?: string;
  mono?: boolean;
}

/**
 * Skipper CleanCare brand logo. Three variants:
 *
 *   - mark: just the circular emblem (for headers, cards, favicons-large).
 *   - seal: full circular seal with arched wordmark (for hero, footer, about).
 *   - wordmark: horizontal mark + typographic wordmark (for navigation).
 *
 * The underlying SVGs live in /public so they can be referenced by meta tags,
 * social previews, and the admin app with no bundler coupling.
 */
export function Logo({
  variant = 'mark',
  className,
  textClassName,
  mono = false,
}: LogoProps) {
  if (variant === 'mark') {
    return (
      <img
        src="/logo-mark.svg"
        alt="Skipper CleanCare"
        className={cn('block select-none', mono && 'grayscale contrast-150', className)}
        draggable={false}
      />
    );
  }
  if (variant === 'seal') {
    return (
      <img
        src="/logo-seal.svg"
        alt="Skipper CleanCare"
        className={cn('block select-none', mono && 'grayscale contrast-150', className)}
        draggable={false}
      />
    );
  }
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <img
        src="/logo-mark.svg"
        alt=""
        aria-hidden="true"
        className={cn('h-7 w-7 shrink-0', mono && 'grayscale contrast-150')}
        draggable={false}
      />
      <span
        className={cn(
          'inline-flex items-baseline leading-none',
          textClassName,
        )}
      >
        <span className="font-display font-medium tracking-[-0.015em] text-brand-navy">
          Skipper
        </span>
        <span className="font-display-italic font-normal tracking-[-0.02em] ml-[3px] text-brand-cyan-deep">
          CleanCare
        </span>
      </span>
    </span>
  );
}
