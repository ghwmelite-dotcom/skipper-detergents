import { motion, useSpring, useTransform, useReducedMotion, type MotionValue } from 'framer-motion';
import { ProductIllustration } from '@/lib/productIllustration';
import { cn } from '@/lib/cn';

/**
 * ProductDiorama — a three-layer floating composition of product illustrations
 * with mouse parallax, independent breathing motion per layer, and a floating
 * price chip on the foreground card.
 *
 * Mouse parallax: each layer translates in opposition to the cursor, with
 * deeper (back) layers moving less than shallow (front) layers — classic
 * stereoscopic depth cue. The foreground card also acquires a small extra
 * tilt based on horizontal cursor position.
 *
 * Reduced-motion: breathing + tilt are killed, parallax is disabled.
 * Mobile: parent passes `compact` to render only the middle layer, centered,
 * at a smaller scale.
 */

interface ProductDioramaProps {
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  compact?: boolean;
}

const BACK_PRODUCT = {
  category_id: 'cat_toilet',
  name: 'Skipper Toilet Roll 24-Pack',
  brand: 'Skipper',
};

const MIDDLE_PRODUCT = {
  category_id: 'cat_detergents',
  name: 'Skipper Liquid Detergent 2L',
  brand: 'Skipper',
};

const FRONT_PRODUCT = {
  category_id: 'cat_surface',
  name: 'Skipper Glass Cleaner 500ml',
  brand: 'Skipper',
};

export function ProductDiorama({ mouseX, mouseY, compact }: ProductDioramaProps) {
  const reduced = useReducedMotion() ?? false;

  // Spring-smoothed parallax. Deeper layers get smaller offsets.
  const springCfg = { stiffness: 80, damping: 25, mass: 0.8 };

  // Back layer: inverted motion, max 6px.
  const backX = useSpring(useTransform(mouseX, [-1, 1], [6, -6]), springCfg);
  const backY = useSpring(useTransform(mouseY, [-1, 1], [6, -6]), springCfg);

  // Middle layer: inverted motion, max 12px.
  const midX = useSpring(useTransform(mouseX, [-1, 1], [12, -12]), springCfg);
  const midY = useSpring(useTransform(mouseY, [-1, 1], [12, -12]), springCfg);

  // Front layer: inverted motion, max 20px, plus tilt based on mouseX.
  const frontX = useSpring(useTransform(mouseX, [-1, 1], [20, -20]), springCfg);
  const frontY = useSpring(useTransform(mouseY, [-1, 1], [20, -20]), springCfg);
  const frontTilt = useSpring(useTransform(mouseX, [-1, 1], [-2, 2]), springCfg);

  if (compact) {
    // Mobile — single product, no parallax, centered.
    // Square aspect matches the SVG viewBox (400×400) so the full illustration
    // renders — including the brand label text at the left edge.
    return (
      <div className="relative mx-auto aspect-square w-full max-w-[260px] px-2">
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 20, rotate: -2 }}
          animate={{ opacity: 1, y: 0, rotate: -2 }}
          transition={{
            type: 'spring',
            stiffness: 220,
            damping: 28,
            delay: 2.1,
          }}
          className="relative h-full w-full overflow-hidden rounded-lg shadow-editorial ring-1 ring-brand-navy/10 bg-brand-ivory"
        >
          <ProductIllustration product={MIDDLE_PRODUCT} className="h-full w-full" />
        </motion.div>

        {/* Floating price chip */}
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.85, rotate: 6 }}
          animate={{ opacity: 1, scale: 1, rotate: 4 }}
          transition={{
            type: 'spring',
            stiffness: 280,
            damping: 24,
            delay: 2.4,
          }}
          className="absolute top-0 right-0 rounded-full bg-brand-red px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] uppercase text-brand-ivory shadow-lg"
        >
          From GHS 45
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="relative mx-auto h-full w-full"
      style={{ perspective: 1200 }}
    >
      {/* BACK LAYER — Toilet roll 24-pack. Soft, blurred, far away. */}
      <motion.div
        className="absolute will-change-transform"
        style={{
          top: '-4%',
          right: '-8%',
          width: '62%',
          x: backX,
          y: backY,
        }}
        initial={reduced ? { opacity: 0 } : { opacity: 0, x: 60, scale: 1.4 }}
        animate={{ opacity: 0.38, scale: 1.35 }}
        transition={{
          type: 'spring',
          stiffness: 180,
          damping: 28,
          delay: 2.1,
          opacity: { duration: 0.9, ease: [0.2, 0.8, 0.2, 1], delay: 2.1 },
        }}
      >
        <motion.div
          className="aspect-[4/5] w-full overflow-hidden rounded-lg"
          {...(reduced
            ? {}
            : {
                animate: { y: [0, -8, 0] },
                transition: {
                  duration: 14,
                  ease: 'easeInOut' as const,
                  repeat: Infinity,
                },
              })}
          style={{ filter: 'blur(2.5px)' }}
        >
          <ProductIllustration product={BACK_PRODUCT} className="h-full w-full" />
        </motion.div>
      </motion.div>

      {/* MIDDLE LAYER — Liquid detergent. Centerpiece. */}
      <motion.div
        className="absolute will-change-transform"
        style={{
          top: '12%',
          right: '14%',
          width: '54%',
          x: midX,
          y: midY,
        }}
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.92 }}
        animate={{ opacity: 0.78, scale: 1 }}
        transition={{
          type: 'spring',
          stiffness: 220,
          damping: 28,
          delay: 2.2,
          opacity: { duration: 0.85, ease: [0.2, 0.8, 0.2, 1], delay: 2.2 },
        }}
      >
        <motion.div
          className={cn(
            'aspect-[4/5] w-full overflow-hidden rounded-lg shadow-xl ring-1 ring-brand-navy/10 bg-brand-ivory',
          )}
          {...(reduced
            ? {}
            : {
                animate: { y: [0, -12, 0] },
                transition: {
                  duration: 10,
                  ease: 'easeInOut' as const,
                  repeat: Infinity,
                  delay: 1.2,
                },
              })}
          style={{ filter: 'blur(0.8px)' }}
        >
          <ProductIllustration product={MIDDLE_PRODUCT} className="h-full w-full" />
        </motion.div>
      </motion.div>

      {/* FRONT LAYER — Glass cleaner. Crisp, tilted, foreground. */}
      <motion.div
        className="absolute will-change-transform"
        style={{
          top: '30%',
          left: '4%',
          width: '46%',
          x: frontX,
          y: frontY,
          rotate: reduced ? -4 : frontTilt,
        }}
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 60, scale: 0.8, rotate: -8 }}
        animate={{ opacity: 1, scale: 0.88 }}
        transition={{
          type: 'spring',
          stiffness: 240,
          damping: 26,
          delay: 2.35,
          opacity: { duration: 0.9, ease: [0.2, 0.8, 0.2, 1], delay: 2.35 },
        }}
      >
        <motion.div
          className="relative aspect-[4/5] w-full overflow-hidden rounded-lg shadow-editorial ring-1 ring-brand-navy/15 bg-brand-ivory"
          {...(reduced
            ? {}
            : {
                animate: { rotate: [-4, -2, -4] },
                transition: {
                  duration: 8,
                  ease: 'easeInOut' as const,
                  repeat: Infinity,
                },
              })}
          style={{ transformOrigin: 'center' }}
        >
          <ProductIllustration product={FRONT_PRODUCT} className="h-full w-full" />
        </motion.div>

        {/* Floating "FROM GHS 45" chip with its own bob */}
        <motion.div
          className="absolute -top-3 -right-3 rounded-full bg-brand-red px-3 py-1.5 text-[11px] font-semibold tracking-[0.14em] uppercase text-brand-ivory shadow-lg will-change-transform"
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.7, rotate: 8 }}
          animate={{ opacity: 1, scale: 1, rotate: 6 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 22,
            delay: 2.6,
          }}
        >
          <motion.span
            className="inline-block"
            {...(reduced
              ? {}
              : {
                  animate: { y: [0, -4, 0] },
                  transition: {
                    duration: 6,
                    ease: 'easeInOut' as const,
                    repeat: Infinity,
                  },
                })}
          >
            From GHS 45
          </motion.span>
        </motion.div>
      </motion.div>
    </div>
  );
}

