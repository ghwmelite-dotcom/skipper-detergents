import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { SEOHead } from '@/components/seo/SEOHead';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { SplitHeadline } from '@/components/motion/SplitHeadline';
import { Reveal } from '@/components/motion/Reveal';
import { Button } from '@/components/ui/button';

const PROMISES = [
  {
    n: '01',
    title: 'Honest pricing',
    body: 'Fair prices you can read without a magnifying glass. Bulk discounts applied automatically in the cart.',
  },
  {
    n: '02',
    title: 'Same-day dispatch',
    body: 'Accra orders before 12 PM are on their way the same day. Regional deliveries land within 2–4 business days.',
  },
  {
    n: '03',
    title: 'Sourced with care',
    body: 'We work with established manufacturers and verify every batch before it reaches your door.',
  },
];

export default function About() {
  return (
    <>
      <SEOHead
        title="About Skipper CleanCare"
        description="Skipper CleanCare is a Ghanaian household essentials brand — honest prices, same-day Accra delivery, bulk pricing open to all."
      />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'About' }]} />

      {/* Hero */}
      <section className="container pt-12 pb-16 md:pt-20 md:pb-24">
        <div className="max-w-4xl space-y-8">
          <div className="flex items-center gap-3">
            <span className="accent-line" aria-hidden="true" />
            <span className="editorial-label text-brand-cyan-deep">Our story</span>
          </div>
          <SplitHeadline
            text="A small Accra operation | with _big_ plans."
            className="text-display-lg text-brand-navy"
            as="h1"
            stagger={0.08}
            delay={0.1}
          />
        </div>
      </section>

      {/* Story — drop cap */}
      <section className="container pb-16 md:pb-24">
        <div className="grid gap-12 md:grid-cols-12">
          <Reveal className="md:col-span-7 space-y-5 text-[17px] leading-[1.75] text-brand-navy/80 font-light">
            <p className="drop-cap">
              Skipper CleanCare started with a simple idea: that premium household essentials
              shouldn&rsquo;t be a luxury. We began as a small distribution operation in Accra,
              working directly with manufacturers to keep costs low and quality consistently high.
            </p>
            <p>
              Word spread quickly. Our customers told their neighbours, their offices, their
              churches. Today we serve homes, hotels, schools, restaurants, and retailers across
              Greater Accra, with shipping options reaching all regions of Ghana.
            </p>
            <p>
              Bulk pricing is at the heart of what we do. We believe that buying in quantity
              shouldn&rsquo;t only be a privilege for large businesses &mdash; our tiered pricing is
              open to every buyer, automatically applied in the cart as quantity grows.
            </p>
          </Reveal>

          <aside className="md:col-span-5 space-y-6">
            <Reveal className="rounded-lg bg-brand-sand/60 p-8">
              <p className="font-display-italic text-2xl md:text-[26px] leading-[1.25] text-brand-navy">
                &ldquo;Clean homes shouldn&rsquo;t be a luxury. Honest prices shouldn&rsquo;t be a
                campaign.&rdquo;
              </p>
              <p className="mt-5 text-[11px] tracking-[0.22em] uppercase text-brand-navy/55">
                &mdash; Founding note, 2026
              </p>
            </Reveal>
          </aside>
        </div>
      </section>

      {/* The promise */}
      <section className="bg-brand-sand/40 noise-texture py-20 md:py-28">
        <div className="container">
          <Reveal className="max-w-2xl mb-14">
            <span className="editorial-label text-brand-cyan-deep">
              <span className="accent-line mr-3" aria-hidden="true" />
              The promise
            </span>
            <h2 className="mt-5 font-display text-display-sm text-brand-navy">
              Three things we <span className="font-display-italic">won&rsquo;t compromise on.</span>
            </h2>
          </Reveal>
          <div className="grid gap-8 md:grid-cols-3">
            {PROMISES.map((p, i) => (
              <Reveal key={p.n} delay={i * 0.1}>
                <span className="font-display text-5xl text-brand-cyan-deep tabular-nums leading-none">
                  {p.n}
                </span>
                <h3 className="mt-5 font-display text-2xl font-medium text-brand-navy leading-tight">
                  {p.title}
                </h3>
                <p className="mt-3 text-brand-navy/70 leading-relaxed font-light">{p.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-20 md:py-28">
        <Reveal className="max-w-3xl">
          <span className="editorial-label text-brand-cyan-deep">
            <span className="accent-line mr-3" aria-hidden="true" />
            What&rsquo;s next
          </span>
          <h2 className="mt-5 font-display text-display-sm text-brand-navy">
            Take a look at what we carry.
          </h2>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/shop">
              <Button variant="primary" size="lg" className="gap-3">
                Shop the full range
                <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button variant="outline" size="lg">
                Get in touch
              </Button>
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
