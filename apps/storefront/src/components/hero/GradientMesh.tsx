import { motion, useReducedMotion } from 'framer-motion';

/**
 * Kinetic gradient mesh — three oversized, heavily blurred blobs that slowly
 * orbit their anchor points on different cycle lengths, so they never phase-
 * align. Sits below the hero content as the living backdrop.
 *
 * Performance note: we intentionally use `filter: blur()` on divs (not
 * backdrop-filter) and avoid animating filter properties — only transform +
 * opacity — so this stays GPU-friendly on mobile.
 */

interface Blob {
  /** Radial gradient background (pre-computed). */
  background: string;
  /** Base position (x%, y%). */
  anchor: { x: string; y: string };
  /** Size in vmax (so it scales with viewport). */
  size: number;
  /** Seconds for one full orbit. Each unique to avoid phase alignment. */
  duration: number;
  /** Maximum orbital radius in px. */
  drift: number;
  /** Starting phase (radians). */
  phase: number;
  blur: number;
}

const BLOBS: Blob[] = [
  {
    // Cyan glow — top-right, large, dominant
    background:
      'radial-gradient(circle, rgba(0, 180, 216, 0.42) 0%, rgba(0, 180, 216, 0.18) 40%, transparent 70%)',
    anchor: { x: '78%', y: '22%' },
    size: 90,
    duration: 28,
    drift: 120,
    phase: 0,
    blur: 100,
  },
  {
    // Sand glow — bottom-left, warm counterweight
    background:
      'radial-gradient(circle, rgba(244, 237, 224, 0.85) 0%, rgba(238, 227, 208, 0.55) 45%, transparent 72%)',
    anchor: { x: '14%', y: '82%' },
    size: 85,
    duration: 36,
    drift: 100,
    phase: Math.PI * 0.6,
    blur: 110,
  },
  {
    // Red glow — dead center, barely perceptible warmth
    background:
      'radial-gradient(circle, rgba(230, 57, 70, 0.18) 0%, rgba(230, 57, 70, 0.06) 45%, transparent 72%)',
    anchor: { x: '50%', y: '55%' },
    size: 70,
    duration: 22,
    drift: 90,
    phase: Math.PI * 1.1,
    blur: 120,
  },
];

export function GradientMesh() {
  const reduced = useReducedMotion() ?? false;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden bg-brand-ivory"
      aria-hidden="true"
    >
      {BLOBS.map((blob, i) => {
        // Build circular drift path using cos/sin anchored by `phase`.
        const steps = 12;
        const xPath: number[] = [];
        const yPath: number[] = [];
        for (let s = 0; s <= steps; s++) {
          const t = (s / steps) * Math.PI * 2 + blob.phase;
          xPath.push(Math.cos(t) * blob.drift);
          yPath.push(Math.sin(t) * blob.drift);
        }

        const motionProps = reduced
          ? {}
          : {
              animate: { x: xPath, y: yPath },
              transition: {
                duration: blob.duration,
                ease: 'linear' as const,
                repeat: Infinity,
                repeatType: 'loop' as const,
              },
            };

        return (
          <motion.div
            key={i}
            className="absolute rounded-full will-change-transform"
            style={{
              width: `${blob.size}vmax`,
              height: `${blob.size}vmax`,
              left: blob.anchor.x,
              top: blob.anchor.y,
              marginLeft: `-${blob.size / 2}vmax`,
              marginTop: `-${blob.size / 2}vmax`,
              background: blob.background,
              filter: `blur(${blob.blur}px)`,
            }}
            {...motionProps}
          />
        );
      })}

      {/* Film grain — subtle SVG noise overlay */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.05] mix-blend-multiply"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <filter id="hero-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#hero-grain)" />
      </svg>
    </div>
  );
}
