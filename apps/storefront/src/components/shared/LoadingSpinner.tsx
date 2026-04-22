import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn('inline-flex items-center justify-center text-muted-foreground', className)}
    >
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
    </span>
  );
}
