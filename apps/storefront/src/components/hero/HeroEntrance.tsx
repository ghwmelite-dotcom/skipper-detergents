import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

/**
 * HeroEntrance — the one-time cinematic overlay that plays on mount.
 *
 * Timeline:
 *   t=0        full-viewport brand-navy overlay covers everything
 *   0-400      "SKIPPER" types character-by-character in ivory Fraunces
 *   400-700    a thin cyan line draws underneath (0 -> 100% width)
 *   700-900    the overlay splits vertically and the halves slide off-screen
 *   900+       the hero is fully revealed; this component unmounts
 *
 * Reduced-motion: skip the typewriter + split; just fade the overlay from
 * full-opacity navy to transparent over 400ms, then unmount.
 */

const WORD = 'SKIPPER';

export function HeroEntrance() {
  const reduced = useReducedMotion() ?? false;
  const [typed, setTyped] = useState('');
  const [showLine, setShowLine] = useState(false);
  const [split, setSplit] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (reduced) {
      // Simple fade out
      const t = window.setTimeout(() => setDone(true), 500);
      return () => window.clearTimeout(t);
    }

    const timers: number[] = [];

    // Typewriter: reveal one char every ~55ms (7 chars = ~385ms)
    WORD.split('').forEach((_, i) => {
      timers.push(
        window.setTimeout(() => {
          setTyped(WORD.slice(0, i + 1));
        }, 60 + i * 55),
      );
    });

    // Draw the line
    timers.push(window.setTimeout(() => setShowLine(true), 440));

    // Split the overlay
    timers.push(window.setTimeout(() => setSplit(true), 720));

    // Unmount once the split animation finishes
    timers.push(window.setTimeout(() => setDone(true), 1150));

    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [reduced]);

  if (done) return null;

  if (reduced) {
    return (
      <motion.div
        className="fixed inset-0 z-[60] bg-brand-navy"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
        aria-hidden="true"
      />
    );
  }

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[60] pointer-events-none"
        aria-hidden="true"
      >
        {/* LEFT HALF */}
        <motion.div
          className="absolute top-0 bottom-0 left-0 w-1/2 bg-brand-navy will-change-transform"
          initial={{ x: 0 }}
          animate={{ x: split ? '-100%' : 0 }}
          transition={{
            duration: 0.85,
            ease: [0.76, 0, 0.24, 1], // cubic ease-in-out
          }}
        />
        {/* RIGHT HALF */}
        <motion.div
          className="absolute top-0 bottom-0 right-0 w-1/2 bg-brand-navy will-change-transform"
          initial={{ x: 0 }}
          animate={{ x: split ? '100%' : 0 }}
          transition={{
            duration: 0.85,
            ease: [0.76, 0, 0.24, 1],
          }}
        />

        {/* Typed word + line — lives above both halves, centered */}
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center"
          initial={{ opacity: 1 }}
          animate={{ opacity: split ? 0 : 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <h2
            className="font-display font-bold text-brand-ivory text-[56px] leading-none tracking-[0.04em] tabular-nums"
            style={{ fontVariationSettings: "'opsz' 144" }}
          >
            {typed}
            <motion.span
              className="inline-block w-[2px] bg-brand-cyan ml-1 align-middle"
              style={{ height: '0.8em' }}
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            />
          </h2>
          <motion.div
            className="mt-5 h-[2px] bg-brand-cyan"
            initial={{ width: 0 }}
            animate={{ width: showLine ? 160 : 0 }}
            transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
          />
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
