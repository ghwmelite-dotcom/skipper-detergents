import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import type { Product } from '@skipper/shared';
import { SEOHead } from '@/components/seo/SEOHead';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/motion/Reveal';
import LivingHero from '@/components/hero/LivingHero';
import { useFeaturedProducts, useProducts } from '@/hooks/useProducts';
import { usePublicSettings } from '@/hooks/useSettings';
import { formatCurrency } from '@skipper/shared';
import { ProductIllustration } from '@/lib/productIllustration';
import { QuickBuyPanel } from '@/components/product/QuickBuyPanel';
import { STORE_NAME } from '@/lib/env';
import { cn } from '@/lib/cn';

const LEFT_CATEGORIES = ['cat_detergents', 'cat_surface'];
const RIGHT_CATEGORIES = ['cat_toilet', 'cat_tissue', 'cat_paper_towels'];
const ACCESSORY_CATEGORY = 'cat_bathroom';

interface MobileSection {
  key: string;
  label: string;
  products: Product[];
}

export default function Home() {
  const { data: settings } = usePublicSettings();
  const { data: featured } = useFeaturedProducts(12);

  const { data: allProducts } = useProducts({ per_page: 48, sort: 'popular' });
  const allProductList = allProducts?.data ?? [];

  // New arrivals: latest active products regardless of featured flag.
  // Why: admin-added products that aren't toggled featured still need a home
  // on the landing page so they don't feel invisible.
  const { data: newestProducts } = useProducts({ per_page: 8, sort: 'newest' });
  const newArrivals = newestProducts?.data ?? [];

  const leftProducts = useMemo(
    () =>
      allProductList.filter((p) => LEFT_CATEGORIES.includes(p.category_id)).slice(0, 4),
    [allProductList],
  );
  const rightProducts = useMemo(
    () =>
      allProductList.filter((p) => RIGHT_CATEGORIES.includes(p.category_id)).slice(0, 4),
    [allProductList],
  );
  const accessoryProducts = useMemo(
    () => allProductList.filter((p) => p.category_id === ACCESSORY_CATEGORY).slice(0, 6),
    [allProductList],
  );

  // Mobile-only: group by category for a section-stacked layout with
  // a sticky horizontal chip bar for quick jump navigation.
  const mobileSections = useMemo<MobileSection[]>(() => {
    const groups: MobileSection[] = [
      {
        key: 'cat_detergents',
        label: 'Detergents',
        products: allProductList.filter((p) => p.category_id === 'cat_detergents').slice(0, 6),
      },
      {
        key: 'cat_toilet',
        label: 'Toilets',
        products: allProductList.filter((p) => p.category_id === 'cat_toilet').slice(0, 6),
      },
      {
        key: 'cat_tissue',
        label: 'Tissues',
        products: allProductList.filter((p) => p.category_id === 'cat_tissue').slice(0, 6),
      },
      {
        key: 'cat_paper_towels',
        label: 'Towels',
        products: allProductList
          .filter((p) => p.category_id === 'cat_paper_towels')
          .slice(0, 6),
      },
      {
        key: 'cat_bathroom',
        label: 'Bathroom',
        products: allProductList.filter((p) => p.category_id === 'cat_bathroom').slice(0, 6),
      },
      {
        key: 'cat_surface',
        label: 'Cleaners',
        products: allProductList.filter((p) => p.category_id === 'cat_surface').slice(0, 6),
      },
    ];
    return groups.filter((g) => g.products.length > 0);
  }, [allProductList]);

  const tagline =
    settings?.store_tagline ??
    'Detergents, paper goods, and bathroom essentials, made for Ghanaian households and delivered across the country.';

  return (
    <>
      <SEOHead
        title={STORE_NAME}
        description={`${tagline} Shop detergents, tissue, bathroom accessories and more with bulk pricing and fast delivery.`}
      />

      {/* HERO */}
      <LivingHero />

      {/* New arrivals — latest products regardless of featured */}
      {newArrivals.length > 0 && <NewArrivalsStrip products={newArrivals} />}

      {/* ========================================================= */}
      {/* DESKTOP — The Spread (original editorial layout)           */}
      {/* ========================================================= */}
      <div className="hidden md:block">
        <SpreadSection
          leftProducts={leftProducts}
          rightProducts={rightProducts}
        />
      </div>

      {/* ========================================================= */}
      {/* MOBILE — category-stacked layout with chip nav             */}
      {/* ========================================================= */}
      <MobileCategoriesSection sections={mobileSections} />

      {/* Best for your week — marquee */}
      <MarqueeSection products={featured ?? allProductList.slice(0, 8)} />

      {/* Accessories strip — works on both; already a horizontal scroller */}
      {accessoryProducts.length > 0 && <AccessoriesStrip products={accessoryProducts} />}

      {/* BULK CTA */}
      <section className="relative overflow-hidden bg-brand-navy text-brand-ivory noise-texture">
        <div
          className="absolute inset-0 gradient-mesh-dark pointer-events-none"
          aria-hidden="true"
        />
        <div className="relative container py-16 md:py-32 text-center">
          <Reveal>
            <span className="editorial-label text-brand-cyan">
              <span className="inline-block h-px w-8 bg-brand-cyan mr-3 align-middle" aria-hidden="true" />
              Bulk pricing
            </span>
            <h2 className="mt-5 md:mt-6 font-display text-display-md md:text-display-lg max-w-3xl mx-auto text-balance leading-[1]">
              Buy in bulk,{' '}
              <span className="font-display-italic text-brand-cyan">save 15&ndash;30%.</span>
            </h2>
            <p className="mt-5 md:mt-6 text-brand-ivory/70 max-w-xl mx-auto text-[15px] md:text-[17px] leading-relaxed font-light">
              Offices, schools, hotels, retailers &mdash; our tiered bulk pricing is open to
              everyone. The more you buy, the more you save.
            </p>
            <div className="mt-8 md:mt-10">
              <Link to="/bulk" className="inline-block">
                <Button variant="secondary" size="xl" className="gap-3 w-full sm:w-auto">
                  Explore bulk
                  <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* MOBILE CATEGORIES — stacked sections + sticky chip bar              */
/* ------------------------------------------------------------------ */

function MobileCategoriesSection({ sections }: { sections: MobileSection[] }) {
  const [activeKey, setActiveKey] = useState<string>(sections[0]?.key ?? '');
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const chipsRef = useRef<HTMLDivElement>(null);

  // Observe which section is in view to drive the active chip.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry whose top is closest to the chip bar's bottom
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));
        const first = visible[0];
        if (first) {
          const key = (first.target as HTMLElement).dataset.key;
          if (key) setActiveKey(key);
        }
      },
      { rootMargin: '-140px 0px -55% 0px', threshold: 0 },
    );
    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  // Auto-scroll the chip bar so the active chip is visible
  useEffect(() => {
    const chip = chipsRef.current?.querySelector<HTMLElement>(
      `[data-chip="${activeKey}"]`,
    );
    if (chip && chipsRef.current) {
      chip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeKey]);

  if (sections.length === 0) return null;

  const scrollToSection = (key: string) => {
    const el = sectionRefs.current[key];
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 120;
    window.scrollTo({ top: y, behavior: 'smooth' });
  };

  return (
    <section className="md:hidden relative bg-brand-sand/30 noise-texture">
      <div className="container pt-10 pb-4">
        <span className="editorial-label text-brand-cyan-deep">
          <span className="accent-line mr-3" aria-hidden="true" />
          The Skipper catalog
        </span>
        <h2 className="mt-3 font-display text-[clamp(2rem,9vw,3rem)] leading-[1] tracking-[-0.03em] text-brand-navy">
          The <span className="font-display-italic text-brand-cyan-deep">Spread.</span>
        </h2>
        <p className="mt-3 text-brand-navy/65 text-[15px] leading-relaxed font-light">
          Browse every aisle from the palm of your hand.
        </p>
      </div>

      {/* Sticky chip bar */}
      <div
        ref={chipsRef}
        className="sticky top-[60px] z-20 bg-brand-ivory/90 backdrop-blur-md border-y border-brand-navy/10 overflow-x-auto scroll-touch scrollbar-none"
      >
        <div className="flex gap-2 px-4 py-2.5 w-max">
          {sections.map((s) => {
            const active = s.key === activeKey;
            return (
              <button
                key={s.key}
                type="button"
                data-chip={s.key}
                onClick={() => scrollToSection(s.key)}
                className={cn(
                  'inline-flex h-9 items-center rounded-full border px-4 text-[12px] font-semibold tracking-wide transition-colors',
                  active
                    ? 'border-brand-navy bg-brand-navy text-brand-ivory'
                    : 'border-brand-navy/15 bg-brand-ivory text-brand-navy/75',
                )}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sections */}
      <div className="container py-6 space-y-10">
        {sections.map((s) => (
          <section
            key={s.key}
            data-key={s.key}
            ref={(el) => {
              sectionRefs.current[s.key] = el;
            }}
            className="scroll-mt-[140px]"
            aria-labelledby={`mobile-sec-${s.key}`}
          >
            <div className="flex items-baseline justify-between mb-4">
              <h3
                id={`mobile-sec-${s.key}`}
                className="font-display text-[22px] leading-tight text-brand-navy font-medium"
              >
                {s.label}
              </h3>
              <Link
                to={`/shop/${s.key.replace('cat_', '')}`}
                className="text-[12px] font-medium text-brand-cyan-deep"
              >
                See all →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {s.products.map((p) => (
                <Link
                  key={p.id}
                  to={`/product/${p.slug}`}
                  className="group flex flex-col h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan-deep/60 rounded-md"
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-md bg-brand-sand/50 ring-1 ring-brand-navy/8">
                    <ProductIllustration product={p} className="h-full w-full" />
                  </div>
                  <div className="pt-2 px-0.5 flex flex-col flex-1">
                    <h4 className="font-sans text-[14px] font-semibold leading-[1.25] text-brand-navy line-clamp-2 min-h-[2.5em]">
                      {p.name}
                    </h4>
                    <div className="mt-auto">
                      <p className="text-[15px] font-bold text-brand-cyan-deep tabular-nums pt-1">
                        {formatCurrency(p.unit_price)}
                      </p>
                      <div className="pt-2">
                        <QuickBuyPanel product={p} compact />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {/* View everything link */}
        <div className="pt-4 pb-2 flex justify-center">
          <Link to="/shop" className="w-full">
            <Button variant="outline" size="lg" className="gap-2 w-full">
              View the full shop
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* THE SPREAD — desktop only                                           */
/* ------------------------------------------------------------------ */

interface SpreadSectionProps {
  leftProducts: Product[];
  rightProducts: Product[];
}

function SpreadSection({ leftProducts, rightProducts }: SpreadSectionProps) {
  const reduced = useReducedMotion();

  return (
    <section
      className="relative overflow-hidden noise-texture"
      aria-labelledby="spread-heading"
    >
      <div className="container pt-20 md:pt-28 pb-6">
        <div className="flex items-end justify-between flex-wrap gap-6">
          <div>
            <span className="editorial-label text-brand-cyan-deep">
              <span className="accent-line mr-3" aria-hidden="true" />
              The Skipper catalog
            </span>
            <h2
              id="spread-heading"
              className="mt-4 font-display text-display-md text-brand-navy"
            >
              The <span className="font-display-italic text-brand-cyan-deep">Spread.</span>
            </h2>
            <p className="mt-4 max-w-[50ch] text-brand-navy/65 text-[16px] leading-relaxed font-light">
              Wet goods on one side, paper goods on the other. A catalog laid out like
              an editorial &mdash; and priced like a wholesaler.
            </p>
          </div>
        </div>
      </div>

      <div className="relative mt-8 md:mt-12 grid grid-cols-1 md:grid-cols-[1fr_80px_1fr] min-h-[720px]">
        <SpreadColumn
          side="left"
          label="Wet goods"
          meta="Detergents & cleaners"
          products={leftProducts}
        />

        <div className="hidden md:flex relative items-stretch justify-center">
          <div
            className="absolute inset-y-0 left-1/2 w-px bg-brand-navy/60"
            aria-hidden="true"
          />
          <div
            className="relative z-10 flex flex-col items-center justify-between py-16 text-brand-navy"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            <span className="editorial-label tracking-[0.4em] text-[10px]">Est. 2026</span>
            <span
              className="font-display-italic text-[44px] md:text-[56px] leading-none tracking-tight"
              style={{ transform: 'rotate(180deg)' }}
            >
              The&nbsp;Spread
            </span>
            <span className="editorial-label tracking-[0.4em] text-[10px]">Vol. 01</span>
          </div>
        </div>

        <SpreadColumn
          side="right"
          label="Paper goods"
          meta="Tissue, toilet roll, kitchen"
          products={rightProducts}
        />

        <div
          className="hidden md:block absolute inset-y-0 left-0 right-[calc(50%+40px)] -z-10 bg-gradient-to-br from-brand-sand-warm/70 via-brand-sand/70 to-brand-sand/40"
          aria-hidden="true"
        />
        <div
          className="hidden md:block absolute inset-y-0 left-[calc(50%+40px)] right-0 -z-10 bg-brand-ivory"
          aria-hidden="true"
        />
      </div>

      <div className="container pt-10 md:pt-14 pb-16 flex justify-center">
        <Link to="/shop">
          <Button variant="outline" size="lg" className="gap-2">
            View the full shop
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </Link>
      </div>

      {reduced && <span className="sr-only">Reduced-motion active</span>}
    </section>
  );
}

interface SpreadColumnProps {
  side: 'left' | 'right';
  label: string;
  meta: string;
  products: Product[];
}

function SpreadColumn({ side, label, meta, products }: SpreadColumnProps) {
  const reduced = useReducedMotion();
  const isLeft = side === 'left';

  return (
    <div
      className={cn(
        'relative flex flex-col px-5',
        isLeft ? 'md:items-end md:pr-8 md:pl-5' : 'md:items-start md:pl-8 md:pr-5',
        'py-10 md:py-16 gap-8 md:gap-10',
      )}
    >
      <div
        className={cn(
          'w-full max-w-[480px] space-y-1.5',
          isLeft ? 'md:text-right' : 'md:text-left',
        )}
      >
        <p className="editorial-label text-brand-cyan-deep">{label}</p>
        <p className="font-display-italic text-brand-navy/60 text-lg">{meta}</p>
      </div>

      <div className={cn('w-full max-w-[480px] space-y-8 md:space-y-10')}>
        {products.length === 0
          ? Array.from({ length: 3 }).map((_, i) => (
              <SpreadCardSkeleton key={i} side={side} index={i} />
            ))
          : products.map((p, i) => (
              <SpreadCard
                key={p.id}
                product={p}
                side={side}
                index={i}
                reduced={Boolean(reduced)}
              />
            ))}
      </div>
    </div>
  );
}

function SpreadCardSkeleton({ side, index }: { side: 'left' | 'right'; index: number }) {
  const tilt = index % 2 === 0 ? -1.5 : 1.5;
  return (
    <div
      className={cn(
        'relative w-full bg-brand-sand/40 rounded-lg aspect-[4/5]',
        side === 'left' ? 'ml-0 mr-0 md:-mr-10' : 'mr-0 ml-0 md:-ml-10',
      )}
      style={{ transform: `rotate(${tilt}deg)` }}
      aria-hidden="true"
    />
  );
}

interface SpreadCardProps {
  product: Product;
  side: 'left' | 'right';
  index: number;
  reduced: boolean;
}

function SpreadCard({ product, side, index, reduced }: SpreadCardProps) {
  const tilt = index % 2 === 0 ? -1.5 : 1.5;
  const isLeft = side === 'left';
  const bulkAvailable = product.is_bulk_available;

  return (
    <motion.div
      initial={
        reduced
          ? false
          : {
              opacity: 0,
              x: isLeft ? -40 : 40,
              rotate: tilt,
            }
      }
      whileInView={{ opacity: 1, x: 0, rotate: tilt }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: 0.75,
        ease: [0.2, 0.8, 0.2, 1],
        delay: Math.min(index * 0.08, 0.35),
      }}
      style={{ transform: reduced ? undefined : `rotate(${tilt}deg)` }}
      className={cn(
        'group relative w-full',
        isLeft ? 'md:-mr-10' : 'md:-ml-10',
      )}
    >
      <Link
        to={`/product/${product.slug}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg"
      >
        <motion.div
          {...(reduced ? {} : { whileHover: { rotate: 0, y: -4 } })}
          transition={{ type: 'spring', stiffness: 220, damping: 24 }}
          className="relative aspect-square w-full overflow-hidden rounded-lg shadow-editorial ring-1 ring-brand-navy/10 bg-brand-ivory"
        >
          <ProductIllustration product={product} className="h-full w-full" />
        </motion.div>
        <div
          className={cn(
            'mt-4 space-y-1',
            isLeft ? 'md:text-right md:pl-4' : 'md:text-left md:pr-4',
          )}
        >
          {product.brand && (
            <p className="editorial-label text-brand-cyan-deep">{product.brand}</p>
          )}
          <h3 className="font-display text-[19px] md:text-[22px] leading-tight text-brand-navy font-medium">
            {product.name}
          </h3>
          <div
            className={cn(
              'pt-1 flex items-baseline gap-2 flex-wrap',
              isLeft ? 'md:justify-end' : 'md:justify-start',
            )}
          >
            <span className="text-[17px] font-bold text-brand-cyan-deep tabular-nums">
              {formatCurrency(product.unit_price)}
            </span>
            {bulkAvailable && (
              <span className="text-[11px] text-brand-navy/55 tabular-nums">
                bulk available
              </span>
            )}
          </div>
          <div className={cn('pt-3 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 md:transition-opacity md:duration-300 md:ease-editorial', isLeft ? 'md:pl-0' : 'md:pr-0')}>
            <QuickBuyPanel product={product} />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* MARQUEE                                                             */
/* ------------------------------------------------------------------ */

function MarqueeSection({ products }: { products: Product[] }) {
  const reduced = useReducedMotion();
  if (!products.length) return null;
  const track = [...products, ...products];

  return (
    <section className="py-12 md:py-24 bg-brand-navy text-brand-ivory noise-texture overflow-hidden">
      <div className="container">
        <Reveal className="max-w-2xl mb-8 md:mb-10">
          <span className="editorial-label text-brand-cyan">
            <span className="inline-block h-px w-8 bg-brand-cyan mr-3 align-middle" aria-hidden="true" />
            Best for your week
          </span>
          <h2 className="mt-4 font-display text-display-sm text-brand-ivory">
            What everyone's{' '}
            <span className="font-display-italic text-brand-cyan">restocking.</span>
          </h2>
          <p className="mt-4 text-brand-ivory/65 text-[15px] md:text-[16px] leading-relaxed font-light max-w-[52ch]">
            A drifting strip of this week's favorites. Tap anything to see details.
          </p>
        </Reveal>
      </div>

      <div
        className="relative group"
        style={{
          maskImage:
            'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
        }}
      >
        <div
          className={cn(
            'flex gap-4 md:gap-6 px-4 md:px-6 w-max',
            !reduced &&
              'animate-marquee md:[animation-duration:30s] [animation-duration:50s] group-hover:[animation-play-state:paused]',
          )}
          aria-hidden={reduced ? undefined : 'true'}
        >
          {track.map((p, i) => (
            <Link
              key={`${p.id}-${i}`}
              to={`/product/${p.slug}`}
              className="flex-none w-[180px] md:w-[260px] flex flex-col group"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-brand-sand ring-1 ring-brand-ivory/10">
                <ProductIllustration product={p} className="h-full w-full" />
              </div>
              <div className="pt-3 flex flex-col flex-1">
                <p className="editorial-label text-brand-cyan/80">{p.brand ?? 'Skipper'}</p>
                <p className="font-display text-[15px] md:text-[17px] leading-tight text-brand-ivory font-medium line-clamp-2 min-h-[2.4em] mt-1">
                  {p.name}
                </p>
                <div className="mt-auto">
                  <p className="text-[15px] font-bold text-brand-cyan tabular-nums pt-2">
                    {formatCurrency(p.unit_price)}
                  </p>
                  <div className="pt-2 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 md:transition-opacity md:duration-300 md:ease-editorial">
                    <QuickBuyPanel product={p} compact />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* ACCESSORIES STRIP                                                   */
/* ------------------------------------------------------------------ */

function NewArrivalsStrip({ products }: { products: Product[] }) {
  const reduced = useReducedMotion();

  return (
    <section className="bg-brand-ivory noise-texture py-10 md:py-16 border-b border-brand-navy/10">
      <div className="container">
        <div className="flex items-end justify-between gap-6 mb-5 md:mb-8">
          <Reveal className="max-w-2xl">
            <span className="editorial-label text-brand-cyan-deep">
              <span className="accent-line mr-3" aria-hidden="true" />
              Just arrived
            </span>
            <h2 className="mt-3 md:mt-4 font-display text-display-sm md:text-display-md text-brand-navy leading-[1.05]">
              Fresh on the{' '}
              <span className="font-display-italic text-brand-cyan-deep">shelf</span>
            </h2>
          </Reveal>
          <Link
            to="/shop?sort=newest"
            className="hidden md:inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-navy hover:text-brand-cyan-deep transition-colors whitespace-nowrap"
          >
            View all
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
      <div
        className="container overflow-x-auto scroll-touch scrollbar-none -mx-5 md:-mx-8 px-5 md:px-8"
        style={{ scrollbarWidth: 'thin' }}
      >
        <div className="flex gap-4 md:gap-5 pb-3 w-max">
          {products.map((p, i) => (
            <motion.div
              key={p.id}
              initial={reduced ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: 0.5,
                delay: Math.min(i * 0.05, 0.2),
                ease: [0.2, 0.8, 0.2, 1],
              }}
              className="w-[180px] md:w-[240px] flex-none snap-start"
            >
              <Link to={`/product/${p.slug}`} className="flex flex-col h-full group">
                <div className="relative aspect-square w-full overflow-hidden rounded-lg ring-1 ring-brand-navy/10 bg-brand-sand/40 shadow-sm group-hover:shadow-editorial transition-shadow duration-300">
                  <ProductIllustration product={p} className="h-full w-full" />
                  <span className="absolute top-2 left-2 inline-flex items-center rounded-full bg-brand-navy text-brand-ivory text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5">
                    New
                  </span>
                </div>
                <div className="pt-3 flex flex-col flex-1">
                  <p className="editorial-label text-brand-cyan-deep">{p.brand ?? 'Skipper'}</p>
                  <p className="font-display text-[15px] md:text-[16px] leading-tight text-brand-navy font-medium line-clamp-2 min-h-[2.4em] mt-1">
                    {p.name}
                  </p>
                  <div className="mt-auto">
                    <p className="text-[15px] font-bold text-brand-cyan-deep tabular-nums pt-2">
                      {formatCurrency(p.unit_price)}
                    </p>
                    <div className="pt-2 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 md:transition-opacity md:duration-300 md:ease-editorial">
                      <QuickBuyPanel product={p} compact />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="container mt-4 md:hidden">
        <Link
          to="/shop?sort=newest"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-navy"
        >
          View all
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

function AccessoriesStrip({ products }: { products: Product[] }) {
  const reduced = useReducedMotion();

  return (
    <section className="bg-brand-sand/50 noise-texture py-12 md:py-24">
      <div className="container">
        <Reveal className="max-w-2xl mb-6 md:mb-10">
          <span className="editorial-label text-brand-cyan-deep">
            <span className="accent-line mr-3" aria-hidden="true" />
            Accessories for the bath
          </span>
          <h2 className="mt-3 md:mt-4 font-display text-display-sm text-brand-navy">
            Little <span className="font-display-italic text-brand-navy/80">upgrades</span>, real
            impact.
          </h2>
        </Reveal>
      </div>
      <div
        className="container overflow-x-auto scroll-touch scrollbar-none -mx-5 md:-mx-8 px-5 md:px-8"
        style={{ scrollbarWidth: 'thin' }}
      >
        <div className="flex gap-4 md:gap-5 pb-3 w-max">
          {products.map((p, i) => (
            <motion.div
              key={p.id}
              initial={reduced ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: 0.5,
                delay: Math.min(i * 0.05, 0.2),
                ease: [0.2, 0.8, 0.2, 1],
              }}
              className="w-[180px] md:w-[240px] flex-none snap-start"
            >
              <Link to={`/product/${p.slug}`} className="flex flex-col h-full group">
                <div className="relative aspect-square w-full overflow-hidden rounded-lg ring-1 ring-brand-navy/10 bg-brand-ivory shadow-sm group-hover:shadow-editorial transition-shadow duration-300">
                  <ProductIllustration product={p} className="h-full w-full" />
                </div>
                <div className="pt-3 flex flex-col flex-1">
                  <p className="editorial-label text-brand-cyan-deep">{p.brand ?? 'Skipper'}</p>
                  <p className="font-display text-[15px] md:text-[16px] leading-tight text-brand-navy font-medium line-clamp-2 min-h-[2.4em] mt-1">
                    {p.name}
                  </p>
                  <div className="mt-auto">
                    <p className="text-[15px] font-bold text-brand-cyan-deep tabular-nums pt-2">
                      {formatCurrency(p.unit_price)}
                    </p>
                    <div className="pt-2 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 md:transition-opacity md:duration-300 md:ease-editorial">
                      <QuickBuyPanel product={p} compact />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
