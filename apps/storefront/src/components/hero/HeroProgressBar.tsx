import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

interface HeroProgressBarProps {
  /** Unique key that resets the progress bar to 0 when it changes. */
  slideKey: string | number;
  /** Total duration in ms. */
  durationMs: number;
  /** Pause the timer when true. */
  paused: boolean;
  /** CSS color for the filling bar. */
  color: string;
  /** Track color (base). */
  trackColor?: string;
  /** Called once when the bar reaches 100% — triggers auto-advance. */
  onComplete: () => void;
  className?: string;
}

/**
 * rAF-driven progress bar. Elapsed time is tracked in refs so `paused`
 * freezes cleanly without restarting. On slide change (`slideKey`), the
 * bar resets to zero.
 */
export function HeroProgressBar({
  slideKey,
  durationMs,
  paused,
  color,
  trackColor = 'rgba(11, 37, 69, 0.08)',
  onComplete,
  className,
}: HeroProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const elapsedRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Reset whenever slide changes.
  useEffect(() => {
    elapsedRef.current = 0;
    lastTsRef.current = null;
    completedRef.current = false;
    setProgress(0);
  }, [slideKey]);

  useEffect(() => {
    function tick(ts: number) {
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const delta = ts - lastTsRef.current;
      lastTsRef.current = ts;
      elapsedRef.current += delta;
      const pct = Math.min(100, (elapsedRef.current / durationMs) * 100);
      setProgress(pct);
      if (pct >= 100) {
        if (!completedRef.current) {
          completedRef.current = true;
          onCompleteRef.current();
        }
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    if (paused) {
      // Break the lastTs reference so resuming doesn't count the paused delta.
      lastTsRef.current = null;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      // Preserve elapsed so resume continues, but reset lastTs.
      lastTsRef.current = null;
    };
  }, [paused, durationMs, slideKey]);

  return (
    <div
      className={cn('relative h-[2px] w-full overflow-hidden', className)}
      style={{ backgroundColor: trackColor }}
      aria-hidden="true"
    >
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          backgroundColor: color,
          transition: paused ? 'none' : 'width 80ms linear',
        }}
      />
    </div>
  );
}
