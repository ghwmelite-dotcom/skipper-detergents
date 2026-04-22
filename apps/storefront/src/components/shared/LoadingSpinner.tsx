import { cn } from '@/lib/cn';

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-flex items-center justify-center',
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 animate-spin"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeOpacity="0.2"
          strokeWidth="2.5"
          fill="none"
        />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </span>
  );
}
