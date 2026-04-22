import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { SEOHead } from '@/components/seo/SEOHead';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { SplitHeadline } from '@/components/motion/SplitHeadline';
import { Reveal } from '@/components/motion/Reveal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useProducts } from '@/hooks/useProducts';
import { usePublicSettings } from '@/hooks/useSettings';
import { formatCurrency } from '@skipper/shared';
import { cn } from '@/lib/cn';

const PLACEHOLDER = 'https://placehold.co/400x400/F4EDE0/0B2545?text=S&font=Roboto';

const BENEFITS = [
  { label: 'Offices', desc: 'Stock the kitchen and bathrooms without the runaround.' },
  { label: 'Hotels & restaurants', desc: 'Consistent supply, consistent quality.' },
  { label: 'Schools', desc: 'Term-by-term deliveries on a schedule that works.' },
  { label: 'Retailers', desc: 'Case pricing, flexible counts, quick resupply.' },
];

export default function BulkOrder() {
  const { data, isLoading } = useProducts({ bulk_only: true, per_page: 50 });
  const { data: settings } = usePublicSettings();
  const reduced = useReducedMotion();
  const products = data?.data ?? [];

  const email = settings?.store_email ?? 'hello@skipperdetergents.com.gh';

  return (
    <>
      <SEOHead
        title="Bulk orders"
        description="Save 15–30% with tiered bulk pricing for offices, schools, hotels, and retailers across Ghana."
      />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Bulk orders' }]} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-ivory noise-texture">
        <div className="absolute inset-0 gradient-mesh pointer-events-none" aria-hidden="true" />
        <div
          className={cn(
            'absolute -top-20 -right-32 h-[420px] w-[420px] rounded-full bg-brand-cyan/15 blur-3xl pointer-events-none',
            !reduced && 'animate-drift-slow',
          )}
          aria-hidden="true"
        />
        <div className="relative z-10 container py-20 md:py-28">
          <div className="max-w-3xl space-y-8">
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
              className="flex items-center gap-3"
            >
              <span className="accent-line" aria-hidden="true" />
              <span className="editorial-label text-brand-cyan-deep">Bulk pricing</span>
            </motion.div>
            <SplitHeadline
              text="Save 15–30% _in bulk._"
              className="text-display-lg text-brand-navy"
              as="h1"
              stagger={0.09}
              delay={0.1}
            />
            <motion.p
              initial={reduced ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
              className="max-w-[52ch] text-[17px] md:text-[18px] leading-relaxed text-brand-navy/70 font-light"
            >
              Our tiered pricing isn&rsquo;t reserved for the big players. Whether you&rsquo;re
              stocking a small office or a 50-room hotel, the discount shows up automatically in
              the cart as your quantity grows.
            </motion.p>
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.95, ease: [0.2, 0.8, 0.2, 1] }}
              className="flex flex-wrap gap-3"
            >
              <a href={`mailto:${email}?subject=Bulk%20order%20enquiry`}>
                <Button variant="primary" size="xl" className="gap-3">
                  Request a custom quote
                  <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
                </Button>
              </a>
              <a href="#products">
                <Button variant="outline" size="xl">
                  Browse bulk products
                </Button>
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="container py-20 md:py-24">
        <Reveal className="max-w-2xl mb-12">
          <span className="editorial-label text-brand-cyan-deep">
            <span className="accent-line mr-3" aria-hidden="true" />
            Who buys in bulk
          </span>
          <h2 className="mt-5 font-display text-display-sm text-brand-navy">
            Made for the people{' '}
            <span className="font-display-italic">who keep things running.</span>
          </h2>
        </Reveal>
        <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-4">
          {BENEFITS.map((b, i) => (
            <motion.div
              key={b.label}
              initial={reduced ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1], delay: i * 0.08 }}
              className="rounded-lg bg-brand-sand/60 p-6 space-y-2"
            >
              <p className="font-display text-lg font-medium text-brand-navy leading-tight">
                {b.label}
              </p>
              <p className="text-sm text-brand-navy/65 leading-relaxed">{b.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Products */}
      <section id="products" className="bg-brand-sand/40 noise-texture py-20 md:py-24">
        <div className="container">
          <Reveal className="flex items-end justify-between flex-wrap gap-6 mb-12">
            <div>
              <span className="editorial-label text-brand-cyan-deep">
                <span className="accent-line mr-3" aria-hidden="true" />
                Bulk-priced
              </span>
              <h2 className="mt-5 font-display text-display-sm text-brand-navy">
                Everything available{' '}
                <span className="font-display-italic">at volume.</span>
              </h2>
            </div>
          </Reveal>
          {isLoading ? (
            <div className="grid gap-5 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-lg" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-display-italic text-xl text-brand-navy">
                No bulk products available at the moment.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {products.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={reduced ? false : { opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{
                    duration: 0.5,
                    ease: [0.2, 0.8, 0.2, 1],
                    delay: Math.min(i * 0.05, 0.3),
                  }}
                >
                  <Link
                    to={`/product/${product.slug}`}
                    className="group flex gap-5 rounded-lg bg-brand-ivory ring-1 ring-brand-navy/8 p-5 hover:ring-brand-navy/20 hover:shadow-md transition-all duration-300 ease-editorial"
                  >
                    <div className="h-24 w-24 flex-none overflow-hidden rounded-md bg-brand-sand/60 ring-1 ring-brand-navy/8">
                      <img
                        src={PLACEHOLDER}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-500 ease-editorial group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      {product.brand && (
                        <p className="editorial-label text-brand-cyan-deep">
                          {product.brand}
                        </p>
                      )}
                      <h3 className="font-display text-lg font-medium text-brand-navy leading-tight line-clamp-2 group-hover:text-brand-cyan-deep transition-colors">
                        {product.name}
                      </h3>
                      <div className="mt-auto flex items-baseline justify-between gap-3 pt-2">
                        <div>
                          <p className="text-[11px] text-brand-navy/55 tracking-wider uppercase font-medium">
                            From · per unit
                          </p>
                          <p className="text-lg font-semibold text-brand-navy tabular-nums">
                            {formatCurrency(product.unit_price)}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-navy group-hover:text-brand-cyan-deep transition-colors">
                          Min {product.bulk_minimum_qty} units
                          <ArrowRight className="h-3 w-3" aria-hidden="true" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Custom quote CTA */}
      <section className="relative overflow-hidden bg-brand-navy text-brand-ivory noise-texture">
        <div
          className="absolute inset-0 gradient-mesh-dark pointer-events-none"
          aria-hidden="true"
        />
        <div className="relative container py-24 md:py-28">
          <Reveal className="max-w-2xl mx-auto text-center">
            <span className="editorial-label text-brand-cyan">
              <span className="inline-block h-px w-8 bg-brand-cyan mr-3 align-middle" aria-hidden="true" />
              Custom quantities
            </span>
            <h2 className="mt-5 font-display text-display-md text-balance">
              Need something <span className="font-display-italic text-brand-cyan">bigger?</span>
            </h2>
            <p className="mt-5 text-brand-ivory/70 text-[17px] leading-relaxed font-light">
              Institutional orders, recurring deliveries, case-pack pricing &mdash; email us and
              we&rsquo;ll put a package together.
            </p>
            <div className="mt-9">
              <a href={`mailto:${email}?subject=Custom%20bulk%20quote`}>
                <Button variant="secondary" size="xl" className="gap-3">
                  Email us
                  <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
                </Button>
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
