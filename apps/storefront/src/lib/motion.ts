import type { Transition, Variants } from 'framer-motion';

/**
 * Editorial motion primitives. Springs are calibrated to feel natural —
 * confident but not bouncy. Duration-based tweens use the editorial ease-out curve.
 */

export const SPRING_SOFT: Transition = {
  type: 'spring',
  stiffness: 220,
  damping: 28,
  mass: 0.9,
};

export const SPRING_STANDARD: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
};

export const SPRING_SNAPPY: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 32,
};

export const EASE_EDITORIAL: [number, number, number, number] = [0.2, 0.8, 0.2, 1];

/** Scroll-triggered fade + rise used for section reveals. */
export const revealUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE_EDITORIAL },
  },
};

/** Staggered container for child reveals. */
export function staggerContainer(stagger = 0.08, delay = 0): Variants {
  return {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: stagger,
        delayChildren: delay,
      },
    },
  };
}

/** Word-by-word reveal for editorial headlines. */
export const wordReveal: Variants = {
  hidden: { opacity: 0, y: '0.6em', filter: 'blur(6px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.8, ease: EASE_EDITORIAL },
  },
};

/** Card enters. */
export const cardReveal: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE_EDITORIAL },
  },
};

/** Drift-in from the right for hero accent visuals. */
export const driftInRight: Variants = {
  hidden: { opacity: 0, x: 40, scale: 0.96 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.9, ease: EASE_EDITORIAL, delay: 0.15 },
  },
};

/** Drift-in from the left. */
export const driftInLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.9, ease: EASE_EDITORIAL },
  },
};

/** Page transition (wrap route outlet in AnimatePresence). */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE_EDITORIAL },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.3, ease: EASE_EDITORIAL },
  },
};

/** Whole headline reveal config — stagger each word. */
export const headlineWords = staggerContainer(0.09, 0.05);
