import { useEffect, useRef, useState } from 'react';
import {
  motion,
  useMotionValue,
  useScroll,
  useTransform,
  useReducedMotion,
} from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { GradientMesh } from './GradientMesh';
import { EditorialChrome } from './EditorialChrome';
import { KineticWord } from './KineticWord';
import { ProductDiorama } from './ProductDiorama';
import { MagneticButton } from './MagneticButton';
import { TrustMarquee } from './TrustMarquee';
import { HeroEntrance } from './HeroEntrance';

/**
 * LivingHero — The Living Editorial.
 *
 * A single composition, not a slideshow. Five overlapping animation systems
 * run simultaneously:
 *
 *   1. Kinetic gradient mesh — three blobs orbit at different periods
 *   2. Kinetic headline word — cycles through adjectives every 2.8s
 *   3. Product diorama — three layers, each with independent breath + parallax
 *   4. Trust marquee — continuous horizontal scroll pinned to the bottom
 *   5. Editorial chrome — slowly rotating compass, static trim, tick marks
 *
 * Entrance (one time, ~3s): a navy overlay types "SKIPPER", draws a cyan
 * line, then splits vertically and retreats — revealing the hero, which
 * then cascades its own elements in on a choreographed timeline.
 *
 * Scroll: once the user scrolls past ~40% of the hero height the *content*
 * fades out (background mesh continues animating), so the transition into
 * The Spread below feels like emerging from a mist.
 */

const CYCLE_WORDS = ['honest', 'bold', 'fresh', 'local', 'premium'] as const;

export default function LivingHero() {
  const reduced = useReducedMotion() ?? false;
  const containerRef = useRef<HTMLElement>(null);

  // Mouse tracking, normalized to [-1, 1] for both axes, measured relative
  // to the hero bounding box. Feeds parallax for the product diorama.
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Detect viewport size for the compact (mobile) switch.
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    function check() {
      setCompact(window.innerWidth < 768);
    }
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (reduced || compact) return;
    const el = containerRef.current;
    if (!el) return;

    function onMove(e: PointerEvent) {
      const elNow = el as HTMLElement;
      const rect = elNow.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1; // -1..1
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      mouseX.set(Math.max(-1, Math.min(1, nx)));
      mouseY.set(Math.max(-1, Math.min(1, ny)));
    }

    function onLeave() {
      mouseX.set(0);
      mouseY.set(0);
    }

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [reduced, compact, mouseX, mouseY]);

  // Scroll-driven fade. Content fades out from 40%→70% of hero height so
  // the scroll into the next section feels like a curtain lifting.
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });
  const contentOpacity = useTransform(scrollYProgress, [0, 0.4, 0.7], [1, 1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 0.7], [0, -40]);

  return (
    <>
      <HeroEntrance />
      <motion.section
        ref={containerRef}
        aria-label="Skipper hero"
        className={cn(
          'relative isolate w-full overflow-hidden',
          'min-h-[85svh] md:min-h-[100svh]',
          'flex flex-col',
        )}
      >
        {/* LAYER 1 — kinetic gradient mesh (background) + film grain */}
        <GradientMesh />

        {/* LAYER 3 — editorial chrome (trim, ticks, compass, stamp) */}
        <EditorialChrome />

        {/* LAYER 4 + 5 + 6 — the actual content, faded on scroll */}
        <motion.div
          className="relative z-10 flex flex-1 items-center"
          style={{ opacity: contentOpacity, y: contentY }}
        >
          <div className="container pt-28 pb-32 md:pt-32 md:pb-40 w-full">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8 items-center">
              {/* LEFT COLUMN — copy + CTAs */}
              <div className="md:col-span-7 relative">
                {/* Eyebrow */}
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.7,
                    ease: [0.2, 0.8, 0.2, 1],
                    delay: 0.9,
                  }}
                  className="flex items-center gap-3 mb-8"
                >
                  <span
                    aria-hidden="true"
                    className="inline-block h-px w-8 bg-brand-cyan-deep"
                  />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-cyan-deep">
                    EST. 2026 · ACCRA · GHANA
                  </span>
                </motion.div>

                {/* Headline — two lines */}
                <h1
                  className={cn(
                    'font-display font-normal text-brand-navy',
                    'text-[clamp(2.5rem,7vw,6rem)] leading-[0.95] tracking-[-0.02em]',
                  )}
                  style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 50" }}
                >
                  {/* Line 1 */}
                  <HeadlineLine1 reduced={reduced} />

                  <br />

                  {/* Line 2 */}
                  <HeadlineLine2 reduced={reduced} />
                </h1>

                {/* Subhead */}
                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.75,
                    ease: [0.2, 0.8, 0.2, 1],
                    delay: 1.6,
                  }}
                  className="mt-8 max-w-[48ch] text-[17px] md:text-[18px] leading-relaxed font-light text-brand-navy/70"
                >
                  Premium cleaning and bathroom essentials, delivered across Ghana
                  with the same care we put into making them.
                </motion.p>

                {/* CTAs */}
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.6,
                    ease: [0.2, 0.8, 0.2, 1],
                    delay: 1.8,
                  }}
                  className="mt-10 flex flex-wrap items-center gap-3"
                >
                  <MagneticButton to="/shop" variant="primary">
                    Shop everything
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </MagneticButton>
                  <MagneticButton to="/shop" variant="secondary">
                    Browse the catalog
                  </MagneticButton>
                </motion.div>
              </div>

              {/* RIGHT COLUMN — product diorama */}
              <div className="md:col-span-5 relative">
                <div
                  className={cn(
                    'relative mx-auto',
                    compact
                      ? 'w-full max-w-[320px] min-h-[380px]'
                      : 'w-full aspect-[4/5] max-w-[520px] min-h-[460px]',
                  )}
                >
                  <ProductDiorama
                    mouseX={mouseX}
                    mouseY={mouseY}
                    compact={compact}
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* LAYER 7 — trust marquee pinned to the bottom, overlapping into the next section */}
        <motion.div
          className="relative z-20 mt-auto"
          style={{ opacity: contentOpacity }}
        >
          <TrustMarquee />
        </motion.div>
      </motion.section>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Headline pieces                                                     */
/* ------------------------------------------------------------------ */

interface HeadlineProps {
  reduced: boolean;
}

function HeadlineLine1({ reduced }: HeadlineProps) {
  const words = ['Clean', 'homes,'];
  return (
    <span className="inline-block">
      {words.map((w, i) => (
        <span
          key={i}
          className="inline-block overflow-hidden align-baseline mr-[0.25em]"
        >
          <motion.span
            className="inline-block will-change-transform"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.85,
              ease: [0.2, 0.8, 0.2, 1],
              delay: 1.05 + i * 0.06,
            }}
          >
            {w}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

function HeadlineLine2({ reduced }: HeadlineProps) {
  return (
    <span className="inline-flex items-baseline">
      {/* Cycling word — italic red */}
      <motion.span
        className="inline-block overflow-hidden align-baseline mr-[0.25em]"
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.85,
          ease: [0.2, 0.8, 0.2, 1],
          delay: 1.3,
        }}
      >
        <span
          className="inline-block font-display-italic text-brand-red"
          style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 80" }}
        >
          <KineticWord words={CYCLE_WORDS} />
        </span>
      </motion.span>

      {/* Static trailing "prices." */}
      <span className="inline-block overflow-hidden align-baseline">
        <motion.span
          className="inline-block font-display-italic will-change-transform"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.85,
            ease: [0.2, 0.8, 0.2, 1],
            delay: 1.42,
          }}
          style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 80" }}
        >
          prices.
        </motion.span>
      </span>
    </span>
  );
}
