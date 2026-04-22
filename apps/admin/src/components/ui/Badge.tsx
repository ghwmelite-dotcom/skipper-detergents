import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'navy';

const toneClass: Record<Tone, string> = {
  neutral: 'bg-ink-100 text-ink-700 border-ink-200',
  success: 'bg-success-50 text-success-600 border-success-500/30',
  warning: 'bg-warning-50 text-warning-600 border-warning-500/40',
  danger: 'bg-danger-50 text-danger-600 border-danger-500/30',
  info: 'bg-cyan-50 text-cyan-600 border-cyan-500/30',
  navy: 'bg-navy-50 text-navy-700 border-navy-500/20',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-2xs font-medium uppercase tracking-wide',
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
