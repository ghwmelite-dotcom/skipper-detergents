import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/cn';

/**
 * KineticWord — cycles through a list of words on a fixed cadence.
 * Each transition blooms letter-by-letter so the word assembles into place.
 *
 * Respects prefers-reduced-motion: in that case we just crossfade.
 */

interface KineticWordProps {
  words: readonly string[];
  /** ms between word changes. */
  intervalMs?: number;
  className?: string;
}

export function KineticWord({
  words,
  intervalMs = 2800,
  className,
}: KineticWordProps) {
  const reduced = useReducedMotion() ?? false;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % words.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [words.length, intervalMs]);

  const current = words[index] ?? '';

  return (
    <span
      className={cn(
        'relative inline-flex items-baseline align-baseline',
        className,
      )}
    >
      {/* Reserve width using the longest word so the rest of the line doesn't jump. */}
      <span className="invisible" aria-hidden="true">
        {words.reduce((a, b) => (a.length >= b.length ? a : b))}
      </span>
      <span
        className="absolute inset-0 flex items-baseline"
        aria-live="polite"
        aria-atomic="true"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={current}
            className="inline-flex whitespace-nowrap"
            initial={
              reduced
                ? { opacity: 0 }
                : {
                    opacity: 0,
                    y: 24,
                    scaleY: 0.5,
                  }
            }
            animate={
              reduced
                ? { opacity: 1 }
                : {
                    opacity: 1,
                    y: 0,
                    scaleY: 1,
                    transition: {
                      type: 'spring',
                      stiffness: 280,
                      damping: 28,
                      opacity: { duration: 0.45, ease: [0.2, 0.8, 0.2, 1] },
                    },
                  }
            }
            exit={
              reduced
                ? { opacity: 0, transition: { duration: 0.28 } }
                : {
                    opacity: 0,
                    y: -24,
                    scaleY: 0.5,
                    transition: { duration: 0.32, ease: [0.4, 0, 1, 1] },
                  }
            }
            style={{ transformOrigin: 'bottom center' }}
          >
            {Array.from(current).map((char, i) => (
              <motion.span
                key={`${current}-${i}`}
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.36,
                  ease: [0.2, 0.8, 0.2, 1],
                  delay: reduced ? 0 : i * 0.03,
                }}
                className="inline-block will-change-transform"
                style={{
                  // Force red pulse: start slightly dim, bloom to full
                  filter: 'brightness(1)',
                }}
              >
                {char}
              </motion.span>
            ))}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
}
