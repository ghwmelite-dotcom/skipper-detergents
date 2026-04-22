import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductIllustration } from '@/lib/productIllustration';
import { cn } from '@/lib/cn';
import { EASE_EDITORIAL } from '@/lib/motion';
import {
  ACCENT_HEX,
  AUTO_ADVANCE_MS,
  HERO_SLIDES,
  type HeroSlide,
} from './slides';
import { HeroNavDots } from './HeroNavDots';
import { HeroProgressBar } from './HeroProgressBar';

/* ------------------------------------------------------------------ */
/* Headline tokenization                                               */
/* ------------------------------------------------------------------ */

type HeadlineToken =
  | { kind: 'plain'; text: string }
  | { kind: 'italic'; text: string }
  | { kind: 'highlight'; text: string }
  | { kind: 'space' };

/**
 * Parse headline syntax:
 *   *word* → italic display
 *   _word_ → italic + brand-red
 */
function tokenize(input: string): HeadlineToken[] {
  const out: HeadlineToken[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i]!;
    if (ch === ' ') {
      out.push({ kind: 'space' });
      i++;
      continue;
    }
    if (ch === '*' || ch === '_') {
      const end = input.indexOf(ch, i + 1);
      if (end === -1) {
        // Unterminated marker — treat as plain text.
        let j = i;
        let word = '';
        while (j < input.length && input[j] !== ' ') {
          word += input[j];
          j++;
        }
        out.push({ kind: 'plain', text: word });
        i = j;
        continue;
      }
      const content = input.slice(i + 1, end);
      const kind = ch === '*' ? 'italic' : 'highlight';
      const parts = content.split(/(\s+)/).filter(Boolean);
      for (const part of parts) {
        if (/^\s+$/.test(part)) out.push({ kind: 'space' });
        else out.push({ kind: kind, text: part });
      }
      i = end + 1;
      continue;
    }
    // Plain word
    let j = i;
    let word = '';
    while (
      j < input.length &&
      input[j] !== ' ' &&
      input[j] !== '*' &&
      input[j] !== '_'
    ) {
      word += input[j];
      j++;
    }
    out.push({ kind: 'plain', text: word });
    i = j;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Animated headline (word-by-word, per slide)                         */
/* ------------------------------------------------------------------ */

interface AnimatedHeadlineProps {
  text: string;
  theme: 'light' | 'dark';
  reduced: boolean;
}

function AnimatedHeadline({ text, theme, reduced }: AnimatedHeadlineProps) {
  const tokens = useMemo(() => tokenize(text), [text]);
  const baseColor = theme === 'dark' ? 'text-brand-ivory' : 'text-brand-navy';

  let wordIndex = 0;

  return (
    <h1
      className={cn(
        'font-display font-medium text-balance text-display-xl leading-[0.95]',
        baseColor,
      )}
    >
      {tokens.map((token, idx) => {
        if (token.kind === 'space') {
          return <span key={`s-${idx}`}>{' '}</span>;
        }

        const cls =
          token.kind === 'italic'
            ? 'font-display-italic'
            : token.kind === 'highlight'
              ? 'font-display-italic text-brand-red'
              : '';

        const thisWordIndex = wordIndex++;
        const delay = reduced ? 0 : 0.18 + thisWordIndex * 0.06;

        if (reduced) {
          return (
            <span key={`w-${idx}`} className={cls}>
              {token.text}
            </span>
          );
        }

        return (
          <span
            key={`w-${idx}`}
            className="inline-block overflow-hidden align-baseline"
          >
            <motion.span
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.8,
                ease: EASE_EDITORIAL,
                delay,
              }}
              className={cn('inline-block will-change-transform', cls)}
            >
              {token.text}
            </motion.span>
          </span>
        );
      })}
    </h1>
  );
}

/* ------------------------------------------------------------------ */
/* Background gradient picker                                          */
/* ------------------------------------------------------------------ */

function backgroundGradient(slide: HeroSlide): string {
  if (slide.theme === 'dark') {
    return 'linear-gradient(135deg, #091C38 0%, #0B2545 45%, #1B3358 100%)';
  }
  if (slide.id === 'wholesale' || slide.id === 'delivery') {
    return 'linear-gradient(135deg, #FCFBF7 0%, #F0F8FA 55%, #E4F3F6 100%)';
  }
  return 'linear-gradient(135deg, #F4EDE0 0%, #FCFBF7 55%, #EEE3D0 100%)';
}

/* ------------------------------------------------------------------ */
/* Accent blob (drifts inside its slide)                               */
/* ------------------------------------------------------------------ */

function AccentBlob({
  color,
  reduced,
}: {
  color: string;
  reduced: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{
        opacity: 0.45,
        scale: 1,
        ...(reduced ? {} : { y: [0, -12, 0] }),
      }}
      transition={{
        opacity: { duration: 0.9, ease: EASE_EDITORIAL, delay: 0.25 },
        scale: { duration: 1.1, ease: EASE_EDITORIAL, delay: 0.25 },
        y: reduced
          ? undefined
          : { duration: 6, ease: 'easeInOut', repeat: Infinity },
      }}
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      aria-hidden="true"
      style={{
        width: 340,
        height: 340,
        borderRadius: '50%',
        background: color,
        filter: 'blur(100px)',
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Slide content (left column text + right column illustration)       */
/* ------------------------------------------------------------------ */

interface SlideContentProps {
  slide: HeroSlide;
  reduced: boolean;
}

function SlideContent({ slide, reduced }: SlideContentProps) {
  const subColor = slide.theme === 'dark' ? 'text-brand-ivory/70' : 'text-brand-navy/70';
  const eyebrowColor =
    slide.theme === 'dark' ? 'text-brand-cyan' : 'text-brand-cyan-deep';
  const accentColor = ACCENT_HEX[slide.accent];

  const tiltDeg = -3;

  return (
    <div className="relative grid w-full items-center gap-10 md:gap-12 lg:grid-cols-12 lg:gap-8">
      {/* LEFT — Copy column */}
      <div className="order-2 lg:order-1 lg:col-span-7 space-y-8">
        {/* Eyebrow */}
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.7,
            ease: EASE_EDITORIAL,
            delay: reduced ? 0 : 0.12,
          }}
          className="flex items-center gap-3"
        >
          <span
            aria-hidden="true"
            className={cn(
              'inline-block h-px w-8',
              slide.theme === 'dark' ? 'bg-brand-cyan/70' : 'bg-brand-cyan-deep',
            )}
          />
          <span
            className={cn(
              'text-[11px] font-semibold uppercase tracking-[0.22em]',
              eyebrowColor,
            )}
          >
            {slide.eyebrow}
          </span>
        </motion.div>

        {/* Headline — word-by-word */}
        <AnimatedHeadline text={slide.headline} theme={slide.theme} reduced={reduced} />

        {/* Subhead */}
        <motion.p
          initial={reduced ? { opacity: 0 } : { opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: 0.75,
            ease: EASE_EDITORIAL,
            delay: reduced ? 0 : 0.7,
          }}
          className={cn(
            'max-w-[48ch] text-[17px] md:text-[18px] leading-relaxed font-light',
            subColor,
          )}
        >
          {slide.subhead}
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 0.6,
            ease: EASE_EDITORIAL,
            delay: reduced ? 0 : 0.9,
          }}
          className="flex flex-wrap items-center gap-3 pt-2"
        >
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.55,
              ease: EASE_EDITORIAL,
              delay: reduced ? 0 : 0.9,
            }}
          >
            <Link to={slide.primary.to}>
              <Button
                variant={slide.theme === 'dark' ? 'secondary' : 'primary'}
                size="xl"
                className="gap-3"
              >
                {slide.primary.label}
                <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
              </Button>
            </Link>
          </motion.div>
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.55,
              ease: EASE_EDITORIAL,
              delay: reduced ? 0 : 0.98,
            }}
          >
            <Link to={slide.secondary.to}>
              <Button
                variant={slide.theme === 'dark' ? 'outline' : 'outline'}
                size="xl"
                className={cn(
                  slide.theme === 'dark' &&
                    'border-brand-ivory/30 text-brand-ivory hover:bg-brand-ivory hover:text-brand-navy',
                )}
              >
                {slide.secondary.label}
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* RIGHT — Illustration column */}
      <div className="order-1 lg:order-2 lg:col-span-5 relative">
        <motion.div
          initial={
            reduced
              ? { opacity: 0 }
              : { opacity: 0, x: 60, rotate: -3 }
          }
          animate={{ opacity: 1, x: 0, rotate: tiltDeg }}
          transition={{
            type: 'spring',
            stiffness: 280,
            damping: 30,
            delay: reduced ? 0 : 0.4,
            opacity: { duration: 0.7, ease: EASE_EDITORIAL, delay: reduced ? 0 : 0.4 },
          }}
          className={cn(
            'relative mx-auto aspect-[4/5] overflow-hidden rounded-lg shadow-editorial',
            'w-[320px] sm:w-[360px] md:w-[400px] lg:w-[420px]',
            'ring-1',
            slide.theme === 'dark' ? 'ring-brand-ivory/10' : 'ring-brand-navy/5',
          )}
          style={{
            background:
              slide.theme === 'dark' ? 'rgba(252, 251, 247, 0.04)' : '#F4EDE0',
          }}
        >
          <ProductIllustration
            product={{
              category_id: slide.product.category_id,
              name: slide.product.name,
              brand: slide.product.brand,
            }}
            className="h-full w-full"
          />

          {/* Product name label bottom */}
          <div
            className={cn(
              'absolute left-4 right-4 bottom-4 rounded-md px-4 py-3 backdrop-blur',
              slide.theme === 'dark'
                ? 'bg-brand-ivory/92 text-brand-navy'
                : 'bg-brand-navy/88 text-brand-ivory',
            )}
          >
            <p
              className={cn(
                'text-[10px] font-semibold tracking-[0.22em] uppercase mb-0.5',
                slide.theme === 'dark' ? 'text-brand-cyan-deep' : 'text-brand-cyan/90',
              )}
            >
              {slide.product.brand}
            </p>
            <p className="font-display text-[17px] leading-tight line-clamp-2">
              {slide.product.name}
            </p>
          </div>
        </motion.div>

        {/* Accent blob behind the card */}
        <div className="absolute inset-0 -z-10 flex items-center justify-center">
          <AccentBlob color={accentColor} reduced={reduced} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function CinematicHero() {
  const reduced = useReducedMotion() ?? false;
  const [index, setIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const containerRef = useRef<HTMLElement>(null);

  const slide = HERO_SLIDES[index]!;
  const slideCount = HERO_SLIDES.length;
  const paused = isHovered || isTabHidden || userPaused;

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % slideCount);
  }, [slideCount]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + slideCount) % slideCount);
  }, [slideCount]);

  const goTo = useCallback(
    (i: number) => {
      setIndex(((i % slideCount) + slideCount) % slideCount);
    },
    [slideCount],
  );

  // Page Visibility API — pause when tab hidden.
  useEffect(() => {
    function onVis() {
      setIsTabHidden(document.hidden);
    }
    document.addEventListener('visibilitychange', onVis);
    onVis();
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Keyboard nav — only when focus is within the hero.
  useEffect(() => {
    if (!focusWithin) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setUserPaused((p) => !p);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusWithin, next, prev]);

  const accentHex = ACCENT_HEX[slide.accent];

  return (
    <section
      ref={containerRef}
      aria-roledescription="carousel"
      aria-label="Featured stories"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setFocusWithin(true)}
      onBlur={(e) => {
        // Only clear focusWithin when focus actually leaves the hero.
        if (!containerRef.current?.contains(e.relatedTarget as Node | null)) {
          setFocusWithin(false);
        }
      }}
      tabIndex={-1}
      className={cn(
        'group relative overflow-hidden noise-texture',
        'min-h-[80vh] md:min-h-[90vh]',
        'flex flex-col',
      )}
    >
      {/* Background crossfade — keyed motion.div directly under AnimatePresence */}
      <AnimatePresence initial={false}>
        <motion.div
          key={`bg-${slide.id}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: EASE_EDITORIAL }}
          className="absolute inset-0"
          style={{ background: backgroundGradient(slide), zIndex: 0 }}
          aria-hidden="true"
        />
      </AnimatePresence>

      {/* Slide content (fills most of the hero) */}
      <div className="relative z-10 flex-1 flex items-center">
        <div className="container py-16 md:py-24 w-full">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={slide.id}
              initial={{ opacity: reduced ? 0 : 1 }}
              animate={{ opacity: 1 }}
              exit={
                reduced
                  ? { opacity: 0, transition: { duration: 0.25 } }
                  : {
                      opacity: 0,
                      y: -12,
                      transition: { duration: 0.28, ease: EASE_EDITORIAL },
                    }
              }
            >
              <SlideContent slide={slide} reduced={reduced} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom controls — nav dots + progress bar + side arrows */}
      <div className="relative z-10 container pb-6 md:pb-8 space-y-4">
        {/* Nav dots row (centered) + subtle side arrows (right-aligned) */}
        <div className="flex items-center justify-between">
          {/* Spacer for symmetric centering */}
          <div className="w-[88px] hidden md:block" aria-hidden="true" />

          <HeroNavDots
            count={slideCount}
            active={index}
            onSelect={goTo}
            theme={slide.theme}
            className="mx-auto"
          />

          <div className="hidden md:flex items-center gap-2 opacity-0 transition-opacity duration-300 ease-editorial group-hover:opacity-100 group-focus-within:opacity-100">
            <button
              type="button"
              onClick={prev}
              aria-label="Previous slide"
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full border transition-colors duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan',
                slide.theme === 'dark'
                  ? 'border-brand-ivory/20 text-brand-ivory hover:bg-brand-ivory/10'
                  : 'border-brand-navy/15 text-brand-navy hover:bg-brand-navy hover:text-brand-ivory',
              )}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next slide"
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full border transition-colors duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan',
                slide.theme === 'dark'
                  ? 'border-brand-ivory/20 text-brand-ivory hover:bg-brand-ivory/10'
                  : 'border-brand-navy/15 text-brand-navy hover:bg-brand-navy hover:text-brand-ivory',
              )}
            >
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <HeroProgressBar
          slideKey={slide.id}
          durationMs={AUTO_ADVANCE_MS}
          paused={paused}
          color={accentHex === '#F4EDE0' ? '#00B4D8' : accentHex}
          trackColor={
            slide.theme === 'dark'
              ? 'rgba(252, 251, 247, 0.12)'
              : 'rgba(11, 37, 69, 0.08)'
          }
          onComplete={next}
        />

        {/* Pause indicator (subtle, a11y) */}
        <p className="sr-only" aria-live="polite">
          {paused ? 'Slide paused' : `Slide ${index + 1} of ${slideCount}`}
        </p>
      </div>
    </section>
  );
}
