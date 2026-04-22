import { forwardRef, useEffect, useRef, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

/**
 * MagneticButton — a Link-wrapped button that smoothly translates toward the
 * cursor when the cursor is within a 80px radius of the element.
 *
 * Implementation: we listen to pointer events on `window` (so we catch motion
 * from anywhere, including the hero surface). Each frame we measure the
 * bounding box via the ref, compute the distance to the cursor, and set the
 * motion values — which are spring-smoothed so the translation feels buttery.
 *
 * Reduced-motion: effect is disabled (button is static). Keyboard navigation
 * is unaffected in either case.
 */

interface MagneticButtonProps {
  to: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  className?: string;
  /** px radius within which the magnetism kicks in. */
  radius?: number;
  /** max translation toward cursor in px. */
  strength?: number;
}

export const MagneticButton = forwardRef<HTMLAnchorElement, MagneticButtonProps>(
  (
    {
      to,
      children,
      variant = 'primary',
      className,
      radius = 80,
      strength = 8,
    },
    forwardedRef,
  ) => {
    const reduced = useReducedMotion() ?? false;
    const innerRef = useRef<HTMLAnchorElement | null>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const sx = useSpring(x, { stiffness: 200, damping: 18, mass: 0.5 });
    const sy = useSpring(y, { stiffness: 200, damping: 18, mass: 0.5 });

    useEffect(() => {
      if (reduced) return;

      function onMove(e: PointerEvent) {
        const el = innerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.hypot(dx, dy);

        if (dist < radius) {
          // Linear falloff — closer = stronger.
          const factor = (1 - dist / radius) * strength;
          // Normalize direction
          const norm = dist === 0 ? 0 : 1;
          x.set((dx / (dist || 1)) * factor * norm);
          y.set((dy / (dist || 1)) * factor * norm);
        } else {
          x.set(0);
          y.set(0);
        }
      }

      function onLeave() {
        x.set(0);
        y.set(0);
      }

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerleave', onLeave);
      return () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerleave', onLeave);
      };
    }, [reduced, radius, strength, x, y]);

    const baseClass =
      'relative inline-flex items-center justify-center gap-2 h-14 rounded-full font-medium transition-[background-color,color,box-shadow] duration-200 ease-editorial focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-brand-ivory';

    const variantClass =
      variant === 'primary'
        ? 'bg-brand-navy text-brand-ivory px-8 text-[15px] hover:bg-brand-navy-dark shadow-lg hover:shadow-xl'
        : 'bg-transparent text-brand-navy px-6 text-[15px] hover:bg-brand-navy/5';

    return (
      <motion.div
        {...(reduced ? {} : { style: { x: sx, y: sy } })}
        className="inline-block"
      >
        <Link
          to={to}
          ref={(node) => {
            innerRef.current = node;
            if (typeof forwardedRef === 'function') forwardedRef(node);
            else if (forwardedRef)
              (forwardedRef as React.MutableRefObject<HTMLAnchorElement | null>).current = node;
          }}
          className={cn(baseClass, variantClass, className)}
        >
          {children}
        </Link>
      </motion.div>
    );
  },
);
MagneticButton.displayName = 'MagneticButton';
