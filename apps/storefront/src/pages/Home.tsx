import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { SEOHead } from '@/components/seo/SEOHead';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductGrid } from '@/components/product/ProductGrid';
import { SplitHeadline } from '@/components/motion/SplitHeadline';
import { Reveal } from '@/components/motion/Reveal';
import { useFeaturedProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { usePublicSettings } from '@/hooks/useSettings';
import { formatCurrency } from '@skipper/shared';
import { STORE_NAME } from '@/lib/env';
import { cn } from '@/lib/cn';

const HERO_PRODUCT_PLACEHOLDER =
  'https://placehold.co/800x1000/F4EDE0/0B2545?text=Skipper&font=Roboto';

export default function Home() {
  const { data: settings } = usePublicSettings();
  const { data: featured, isLoading: featuredLoading } = useFeaturedProducts(8);
  const { data: categories } = useCategories();
  const reduced = useReducedMotion();

  const heroProduct = featured?.[0];

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
      <section className="relative overflow-hidden bg-brand-ivory noise-texture">
        {/* Animated gradient mesh */}
        <div className="absolute inset-0 gradient-mesh pointer-events-none" aria-hidden="true" />
        <div
          className={cn(
            'absolute -top-40 -right-20 h-[520px] w-[520px] rounded-full bg-brand-cyan/20 blur-3xl pointer-events-none',
            !reduced && 'animate-drift-slow',
          )}
          aria-hidden="true"
        />
        <div
          className={cn(
            'absolute -bottom-32 -left-32 h-[420px] w-[420px] rounded-full bg-brand-sand-warm/60 blur-3xl pointer-events-none',
            !reduced && 'animate-drift-slow',
          )}
          style={{ animationDelay: '-7s' }}
          aria-hidden="true"
        />

        <div className="relative z-10 container pt-12 pb-20 md:pt-16 md:pb-28 lg:min-h-[calc(100vh-120px)] lg:flex lg:items-center">
          <div className="grid gap-14 lg:grid-cols-12 lg:gap-8 items-center w-full">
            {/* LEFT — headline column */}
            <div className="lg:col-span-7 space-y-8">
              <motion.div
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
                className="flex items-center gap-3"
              >
                <span className="accent-line" aria-hidden="true" />
                <span className="editorial-label text-brand-cyan-deep">
                  Est. 2026 &middot; Accra
                </span>
              </motion.div>

              <SplitHeadline
                text="Clean homes, _honest_ prices."
                className="text-display-xl text-brand-navy"
                as="h1"
                stagger={0.1}
                delay={0.1}
              />

              <motion.p
                initial={reduced ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1], delay: 0.9 }}
                className="max-w-[46ch] text-[17px] md:text-[18px] leading-relaxed text-brand-navy/70 font-light"
              >
                {tagline}
              </motion.p>

              <motion.div
                initial={reduced ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1], delay: 1.05 }}
                className="flex flex-wrap items-center gap-3"
              >
                <Link to="/shop">
                  <Button variant="primary" size="xl" className="gap-3">
                    Shop everything
                    <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
                  </Button>
                </Link>
                <Link to="/bulk">
                  <Button variant="outline" size="xl">
                    Save with bulk
                  </Button>
                </Link>
              </motion.div>

              <motion.div
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 1.25 }}
                className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-6 text-[12px] font-medium text-brand-navy/55 tracking-wider"
              >
                <span className="uppercase">Free delivery GHS 200+</span>
                <span className="h-1 w-1 rounded-full bg-brand-navy/30" aria-hidden="true" />
                <span className="uppercase">Same-day Accra</span>
                <span className="h-1 w-1 rounded-full bg-brand-navy/30" aria-hidden="true" />
                <span className="uppercase">Paystack secure</span>
              </motion.div>
            </div>

            {/* RIGHT — floating product composition */}
            <motion.div
              initial={reduced ? false : { opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1], delay: 0.35 }}
              className="relative lg:col-span-5 order-first lg:order-last mx-auto w-full max-w-md lg:max-w-none"
            >
              {/* Soft cyan backdrop */}
              <div
                className="absolute -left-8 top-8 -z-10 h-56 w-56 rounded-full bg-brand-cyan/25 blur-2xl"
                aria-hidden="true"
              />
              <div
                className="absolute -right-6 -bottom-8 -z-10 h-40 w-40 rounded-full bg-brand-navy/10 blur-2xl"
                aria-hidden="true"
              />

              {/* Main tilted product card */}
              <motion.div
                {...(reduced
                  ? {}
                  : { whileHover: { rotate: -1, y: -4 } })}
                transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                style={{ rotate: reduced ? 0 : -3 }}
                className="relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-brand-sand shadow-editorial ring-1 ring-brand-navy/5"
              >
                <img
                  src={HERO_PRODUCT_PLACEHOLDER}
                  alt={heroProduct?.name ?? 'Skipper featured product'}
                  className="h-full w-full object-cover"
                  loading="eager"
                />

                {/* Price chip top-right */}
                {heroProduct && (
                  <div className="absolute top-4 right-4 rounded-full bg-brand-ivory/95 backdrop-blur px-4 py-2 shadow-md">
                    <p className="text-[9px] font-medium tracking-[0.2em] uppercase text-brand-navy/55">
                      From
                    </p>
                    <p className="text-[15px] font-semibold text-brand-navy tabular-nums leading-none mt-0.5">
                      {formatCurrency(heroProduct.unit_price)}
                    </p>
                  </div>
                )}

                {/* Product name label bottom */}
                {heroProduct && (
                  <div className="absolute left-4 right-4 bottom-4 rounded-md bg-brand-navy/88 backdrop-blur px-4 py-3 text-brand-ivory">
                    <p className="editorial-label text-brand-cyan/90 mb-0.5">
                      {heroProduct.brand ?? 'Skipper'}
                    </p>
                    <p className="font-display text-[17px] leading-tight line-clamp-2">
                      {heroProduct.name}
                    </p>
                  </div>
                )}
              </motion.div>

              {/* Floating secondary accent card */}
              <motion.div
                initial={reduced ? false : { opacity: 0, y: 20, rotate: 4 }}
                animate={{ opacity: 1, y: 0, rotate: 6 }}
                transition={{ duration: 0.9, delay: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
                className="absolute -bottom-6 -left-2 sm:-left-10 w-40 sm:w-48 rounded-lg bg-brand-ivory p-4 shadow-editorial ring-1 ring-brand-navy/5"
              >
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-3xl font-medium text-brand-navy leading-none">
                    15
                  </span>
                  <span className="font-display-italic text-lg text-brand-cyan-deep leading-none">
                    –30%
                  </span>
                </div>
                <p className="mt-2 text-[12px] text-brand-navy/65 leading-snug">
                  Bulk savings on everyday essentials.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FEATURED */}
      <section className="container py-20 md:py-28">
        <Reveal className="max-w-3xl mb-14">
          <span className="editorial-label text-brand-cyan-deep">
            <span className="accent-line mr-3" aria-hidden="true" />
            Featured
          </span>
          <h2 className="mt-5 font-display text-display-md text-brand-navy">
            Skipper originals, <span className="font-display-italic text-brand-cyan-deep">plus the brands you trust.</span>
          </h2>
          <p className="mt-5 text-brand-navy/65 text-[17px] leading-relaxed font-light max-w-[58ch]">
            A tight edit of detergents, tissue, and bathroom essentials we keep in constant
            stock — priced fairly, shipped quickly.
          </p>
        </Reveal>

        <ProductGrid
          products={featured ?? []}
          loading={featuredLoading}
          skeletonCount={8}
          columns={4}
        />

        <Reveal delay={0.2} className="mt-12 flex justify-center">
          <Link to="/shop">
            <Button variant="outline" size="lg" className="gap-2">
              View the full shop
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
        </Reveal>
      </section>

      {/* CATEGORIES BAND */}
      <section className="bg-brand-sand/50 noise-texture py-20 md:py-24">
        <div className="container">
          <Reveal className="flex items-end justify-between flex-wrap gap-6 mb-12">
            <div>
              <span className="editorial-label text-brand-cyan-deep">
                <span className="accent-line mr-3" aria-hidden="true" />
                Browse by category
              </span>
              <h2 className="mt-4 font-display text-display-sm text-brand-navy max-w-xl">
                Everything the household needs &mdash;{' '}
                <span className="font-display-italic text-brand-navy/80">sorted.</span>
              </h2>
            </div>
          </Reveal>

          {!categories ? (
            <div className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[4/3] rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {(categories ?? [])
                .filter((c) => c.is_active)
                .slice(0, 8)
                .map((cat, idx) => (
                  <motion.div
                    key={cat.id}
                    initial={reduced ? false : { opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{
                      duration: 0.55,
                      ease: [0.2, 0.8, 0.2, 1],
                      delay: Math.min(idx * 0.06, 0.3),
                    }}
                  >
                    <Link
                      to={`/shop/${cat.slug}`}
                      className="group block relative overflow-hidden rounded-lg aspect-[4/3] bg-brand-ivory ring-1 ring-brand-navy/8 hover:ring-brand-navy/15 transition-shadow duration-300"
                    >
                      {cat.image_url ? (
                        <img
                          src={cat.image_url}
                          alt={cat.name}
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[600ms] ease-editorial group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-brand-sand via-brand-sand-warm to-brand-mist" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/75 via-brand-navy/20 to-transparent" />
                      <div className="absolute inset-0 flex flex-col justify-end p-5">
                        <p className="font-display text-xl text-brand-ivory leading-tight font-medium">
                          {cat.name}
                        </p>
                        {cat.product_count !== undefined && (
                          <p className="mt-1 text-[11px] text-brand-ivory/70 tracking-widest uppercase">
                            {cat.product_count} items
                          </p>
                        )}
                      </div>
                      <div className="absolute top-4 right-4 rounded-full bg-brand-ivory/95 p-2 opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-editorial">
                        <ArrowUpRight className="h-3.5 w-3.5 text-brand-navy" aria-hidden="true" />
                      </div>
                    </Link>
                  </motion.div>
                ))}
            </div>
          )}
        </div>
      </section>

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
