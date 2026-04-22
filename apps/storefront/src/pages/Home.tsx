import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import type { Product } from '@skipper/shared';
import { SEOHead } from '@/components/seo/SEOHead';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/motion/Reveal';
import CinematicHero from '@/components/hero/CinematicHero';
import { useFeaturedProducts, useProducts } from '@/hooks/useProducts';
import { usePublicSettings } from '@/hooks/useSettings';
import { usePurchaseModeStore } from '@/stores/purchaseModeStore';
import { formatCurrency } from '@skipper/shared';
import { ProductIllustration } from '@/lib/productIllustration';
import { STORE_NAME } from '@/lib/env';
import { cn } from '@/lib/cn';

const LEFT_CATEGORIES = ['cat_detergents', 'cat_surface'];
const RIGHT_CATEGORIES = ['cat_toilet', 'cat_tissue', 'cat_paper_towels'];
const ACCESSORY_CATEGORY = 'cat_bathroom';

export default function Home() {
  const { data: settings } = usePublicSettings();
  const { data: featured } = useFeaturedProducts(12);
  const mode = usePurchaseModeStore((s) => s.mode);

  // Fetch a decent slice of the catalog for the spread. One call, filter client side.
  const { data: allProducts } = useProducts({ per_page: 48, sort: 'popular' });
  const allProductList = allProducts?.data ?? [];

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

  const tagline =
    settings?.store_tagline ??
    'Detergents, paper goods, and bathroom essentials, made for Ghanaian households and delivered across the country.';

  return (
    <>
      <SEOHead
        title={STORE_NAME}
        description={`${tagline} Shop detergents, tissue, bathroom accessories and more with bulk pricing and fast delivery.`}
      />

      {/* HERO — cinematic narrative slider */}
      <CinematicHero />

      {/* THE SPREAD — signature editorial catalog spread */}
      <SpreadSection
        leftProducts={leftProducts}
        rightProducts={rightProducts}
        mode={mode}
      />

      {/* Best for your week — marquee */}
      <MarqueeSection products={featured ?? allProductList.slice(0, 8)} />

      {/* Accessories strip */}
      {accessoryProducts.length > 0 && (
        <AccessoriesStrip products={accessoryProducts} />
      )}

      {/* BULK CTA */}
      <section className="relative overflow-hidden bg-brand-navy text-brand-ivory noise-texture">
        <div
          className="absolute inset-0 gradient-mesh-dark pointer-events-none"
          aria-hidden="true"
        />
        <div className="relative container py-24 md:py-32 text-center">
          <Reveal>
            <span className="editorial-label text-brand-cyan">
              <span className="inline-block h-px w-8 bg-brand-cyan mr-3 align-middle" aria-hidden="true" />
              Bulk pricing
            </span>
            <h2 className="mt-6 font-display text-display-lg max-w-3xl mx-auto text-balance">
              Buy in bulk,{' '}
              <span className="font-display-italic text-brand-cyan">save 15&ndash;30%.</span>
            </h2>
            <p className="mt-6 text-brand-ivory/70 max-w-xl mx-auto text-[17px] leading-relaxed font-light">
              Offices, schools, hotels, retailers &mdash; our tiered bulk pricing is open to
              everyone. The more you buy, the more you save.
            </p>
            <div className="mt-10">
              <Link to="/bulk">
                <Button variant="secondary" size="xl" className="gap-3">
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
/* THE SPREAD                                                          */
/* ------------------------------------------------------------------ */

interface SpreadSectionProps {
  leftProducts: Product[];
  rightProducts: Product[];
  mode: 'single' | 'bulk';
}

function SpreadSection({ leftProducts, rightProducts, mode }: SpreadSectionProps) {
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

      {/* Split canvas */}
      <div className="relative mt-8 md:mt-12 grid grid-cols-1 md:grid-cols-[1fr_80px_1fr] min-h-[720px]">
        {/* LEFT — WET GOODS */}
        <SpreadColumn
          side="left"
          label="Wet goods"
          meta="Detergents & cleaners"
          products={leftProducts}
          mode={mode}
        />

        {/* GUTTER */}
        <div className="hidden md:flex relative items-stretch justify-center">
          <div
            className="absolute inset-y-0 left-1/2 w-px bg-brand-navy/60"
            aria-hidden="true"
          />
          <div
            className="relative z-10 flex flex-col items-center justify-between py-16 text-brand-navy"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            <span className="editorial-label tracking-[0.4em] text-[10px]">
              Est. 2026
            </span>
            <span
              className="font-display-italic text-[44px] md:text-[56px] leading-none tracking-tight"
              style={{ transform: 'rotate(180deg)' }}
            >
              The&nbsp;Spread
            </span>
            <span className="editorial-label tracking-[0.4em] text-[10px]">
              Vol. 01
            </span>
          </div>
        </div>

        {/* RIGHT — PAPER GOODS */}
        <SpreadColumn
          side="right"
          label="Paper goods"
          meta="Tissue, toilet roll, kitchen"
          products={rightProducts}
          mode={mode}
        />

        {/* Background fills (pseudo — keep behind everything) */}
        <div
          className="hidden md:block absolute inset-y-0 left-0 right-[calc(50%+40px)] -z-10 bg-gradient-to-br from-brand-sand-warm/70 via-brand-sand/70 to-brand-sand/40"
          aria-hidden="true"
        />
        <div
          className="hidden md:block absolute inset-y-0 left-[calc(50%+40px)] right-0 -z-10 bg-brand-ivory"
          aria-hidden="true"
        />
        {/* Mobile background — full-width sand with alternating band on stacked column */}
        <div
          className="md:hidden absolute inset-0 -z-10 bg-gradient-to-b from-brand-sand-warm/60 via-brand-sand/40 to-brand-ivory"
          aria-hidden="true"
        />
      </div>

      {/* View everything link */}
      <div className="container pt-10 md:pt-14 pb-16 flex justify-center">
        <Link to="/shop">
          <Button variant="outline" size="lg" className="gap-2">
            View the full shop
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </Link>
      </div>

      {/* Tweak: disable animations on reduced motion (noop, but doc-anchor) */}
      {reduced && <span className="sr-only">Reduced-motion active</span>}
    </section>
  );
}

interface SpreadColumnProps {
  side: 'left' | 'right';
  label: string;
  meta: string;
  products: Product[];
  mode: 'single' | 'bulk';
}

function SpreadColumn({ side, label, meta, products, mode }: SpreadColumnProps) {
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
      {/* Column label */}
      <div
        className={cn(
          'w-full max-w-[480px] space-y-1.5',
          isLeft ? 'md:text-right' : 'md:text-left',
        )}
      >
        <p className="editorial-label text-brand-cyan-deep">{label}</p>
        <p className="font-display-italic text-brand-navy/60 text-lg">{meta}</p>
      </div>

      {/* Product stack */}
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
                mode={mode}
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
  mode: 'single' | 'bulk';
  reduced: boolean;
}

function SpreadCard({ product, side, index, mode, reduced }: SpreadCardProps) {
  const tilt = index % 2 === 0 ? -1.5 : 1.5;
  const isLeft = side === 'left';
  const bulkAvailable = product.is_bulk_available;
  const inBulk = mode === 'bulk' && bulkAvailable;

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
        // overlap the gutter inward for editorial rhythm
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
          {bulkAvailable && (
            <span
              className={cn(
                'absolute top-3 left-3 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase',
                inBulk
                  ? 'bg-brand-red text-white'
                  : 'bg-brand-navy text-brand-ivory',
              )}
            >
              {inBulk ? 'Save bulk' : 'Bulk-ready'}
            </span>
          )}
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
            {inBulk && (
              <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-brand-red">
                From
              </span>
            )}
            <span className="text-[15px] font-semibold text-brand-navy tabular-nums">
              {formatCurrency(product.unit_price)}
            </span>
            {bulkAvailable && (
              <span className="text-[11px] text-brand-navy/55 tabular-nums">
                {mode === 'bulk' ? `min ${product.bulk_minimum_qty}` : 'bulk available'}
              </span>
            )}
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
  // Duplicate the list so the CSS marquee has something to wrap to.
  const track = [...products, ...products];

  return (
    <section className="py-20 md:py-24 bg-brand-navy text-brand-ivory noise-texture overflow-hidden">
      <div className="container">
        <Reveal className="max-w-2xl mb-10">
          <span className="editorial-label text-brand-cyan">
            <span className="inline-block h-px w-8 bg-brand-cyan mr-3 align-middle" aria-hidden="true" />
            Best for your week
          </span>
          <h2 className="mt-4 font-display text-display-sm text-brand-ivory">
            What everyone's{' '}
            <span className="font-display-italic text-brand-cyan">restocking.</span>
          </h2>
          <p className="mt-4 text-brand-ivory/65 text-[16px] leading-relaxed font-light max-w-[52ch]">
            A drifting strip of this week's favorites. Tap anything to see details.
          </p>
        </Reveal>
      </div>

      <div
        className="relative group"
        style={{ maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)' }}
      >
        <div
          className={cn(
            'flex gap-6 px-6 w-max',
            !reduced && 'animate-marquee group-hover:[animation-play-state:paused]',
          )}
          aria-hidden={reduced ? undefined : 'true'}
        >
          {track.map((p, i) => (
            <Link
              key={`${p.id}-${i}`}
              to={`/product/${p.slug}`}
              className="flex-none w-[240px] md:w-[260px]"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-brand-sand ring-1 ring-brand-ivory/10">
                <ProductIllustration product={p} className="h-full w-full" />
              </div>
              <div className="pt-3 space-y-1">
                <p className="editorial-label text-brand-cyan/80">{p.brand ?? 'Skipper'}</p>
                <p className="font-display text-[17px] leading-tight text-brand-ivory font-medium line-clamp-2">
                  {p.name}
                </p>
                <p className="text-[13px] font-semibold text-brand-ivory/90 tabular-nums">
                  {formatCurrency(p.unit_price)}
                </p>
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

function AccessoriesStrip({ products }: { products: Product[] }) {
  const reduced = useReducedMotion();

  return (
    <section className="bg-brand-sand/50 noise-texture py-20 md:py-24">
      <div className="container">
        <Reveal className="max-w-2xl mb-10">
          <span className="editorial-label text-brand-cyan-deep">
            <span className="accent-line mr-3" aria-hidden="true" />
            Accessories for the bath
          </span>
          <h2 className="mt-4 font-display text-display-sm text-brand-navy">
            Little <span className="font-display-italic text-brand-navy/80">upgrades</span>, real impact.
          </h2>
        </Reveal>
      </div>
      <div
        className="container overflow-x-auto -mx-5 md:-mx-8 px-5 md:px-8"
        style={{ scrollbarWidth: 'thin' }}
      >
        <div className="flex gap-5 pb-3 w-max">
          {products.map((p, i) => (
            <motion.div
              key={p.id}
              initial={reduced ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: Math.min(i * 0.05, 0.2), ease: [0.2, 0.8, 0.2, 1] }}
              className="w-[220px] md:w-[240px] flex-none"
            >
              <Link
                to={`/product/${p.slug}`}
                className="block group"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-lg ring-1 ring-brand-navy/10 bg-brand-ivory shadow-sm group-hover:shadow-editorial transition-shadow duration-300">
                  <ProductIllustration product={p} className="h-full w-full" />
                </div>
                <div className="pt-3 space-y-1">
                  <p className="editorial-label text-brand-cyan-deep">{p.brand ?? 'Skipper'}</p>
                  <p className="font-display text-[16px] leading-tight text-brand-navy font-medium line-clamp-2">
                    {p.name}
                  </p>
                  <p className="text-[13px] font-semibold text-brand-navy tabular-nums">
                    {formatCurrency(p.unit_price)}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
