import { motion, useReducedMotion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';
import { revealUp, staggerContainer, EASE_EDITORIAL } from '@/lib/motion';

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Override the default reveal variants. */
  variants?: Variants;
  /** Wrap as a section or div, etc. */
  as?: 'div' | 'section' | 'article' | 'header' | 'aside';
  /** Threshold for triggering — 0.15 means 15% of element visible. */
  amount?: number;
  /** Re-trigger each time element enters viewport. */
  once?: boolean;
}

/**
 * Reveals its children on scroll-in. Respects prefers-reduced-motion.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  variants,
  as = 'div',
  amount = 0.15,
  once = true,
}: RevealProps) {
  const reduced = useReducedMotion();
  const MotionTag = motion[as];

  if (reduced) {
    return <MotionTag className={className}>{children}</MotionTag>;
  }

  const defaultVariants: Variants = {
    hidden: { opacity: 0, y: 28 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.7,
        ease: EASE_EDITORIAL,
        delay,
      },
    },
  };
  const v: Variants = variants ?? defaultVariants;
  // revealUp exists to anchor docs; ensure it's referenced
  void revealUp;

  return (
    <MotionTag
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      variants={v}
      className={className}
    >
      {children}
    </MotionTag>
  );
}

interface StaggerGroupProps {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
  amount?: number;
  as?: 'div' | 'section' | 'ul' | 'ol';
}

/**
 * Container for staggered child reveals. Children should use motion components
 * with variants="visible" state driven by parent.
 */
export function StaggerGroup({
  children,
  className,
  stagger = 0.08,
  delay = 0,
  amount = 0.15,
  as = 'div',
}: StaggerGroupProps) {
  const reduced = useReducedMotion();
  const MotionTag = motion[as];

  if (reduced) {
    return <MotionTag className={className}>{children}</MotionTag>;
  }

  return (
    <MotionTag
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      variants={staggerContainer(stagger, delay)}
      className={className}
    >
      {children}
    </MotionTag>
  );
}
