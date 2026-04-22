import { motion, useReducedMotion } from 'framer-motion';

/**
 * TrustMarquee — continuous right-to-left scroll of trust copy pinned to the
 * bottom of the hero. Hover to pause.
 *
 * Items are separated by a bright cyan diamond (✦) — a single visual accent
 * that keeps the otherwise monochrome navy text readable across the sweep.
 */

const ITEMS = [
  'SAME-DAY ACCRA',
  'FREE DELIVERY OVER GHS 200',
  'MOBILE MONEY + CARD',
  'PAYSTACK SECURE',
  'OFFICES · SCHOOLS · HOSPITALITY',
] as const;

function Track() {
  return (
    <div className="flex shrink-0 items-center gap-6 pr-6">
      {ITEMS.map((item) => (
        <span key={item} className="flex items-center gap-6">
          <span className="whitespace-nowrap text-[13px] font-medium tracking-[0.18em] uppercase text-brand-navy/65">
            {item}
          </span>
          <span
            className="text-brand-cyan text-[14px] leading-none"
            aria-hidden="true"
          >
            ✦
          </span>
        </span>
      ))}
    </div>
  );
}

export function TrustMarquee() {
  const reduced = useReducedMotion() ?? false;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1], delay: 2.4 }}
      className="group relative w-full overflow-hidden border-y border-brand-navy/10 bg-brand-ivory/80 backdrop-blur-sm py-3.5"
      style={{
        maskImage:
          'linear-gradient(to right, transparent, black 6%, black 94%, transparent)',
        WebkitMaskImage:
          'linear-gradient(to right, transparent, black 6%, black 94%, transparent)',
      }}
    >
      <div
        className="flex w-max will-change-transform"
        style={{
          animation: reduced
            ? undefined
            : 'hero-trust-marquee 40s linear infinite',
          animationPlayState: reduced ? undefined : undefined,
        }}
      >
        <Track />
        <Track />
      </div>
      <style>{`
        @keyframes hero-trust-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .group:hover [style*="hero-trust-marquee"] {
          animation-play-state: paused;
        }
      `}</style>
    </motion.div>
  );
}
