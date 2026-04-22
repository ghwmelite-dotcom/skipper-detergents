import { Mail, Phone, MapPin, Clock, ArrowUpRight } from 'lucide-react';
import { SEOHead } from '@/components/seo/SEOHead';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { SplitHeadline } from '@/components/motion/SplitHeadline';
import { Reveal } from '@/components/motion/Reveal';
import { Button } from '@/components/ui/button';
import { usePublicSettings } from '@/hooks/useSettings';

export default function Contact() {
  const { data: settings } = usePublicSettings();

  const email = settings?.store_email ?? 'hello@skipperdetergents.com.gh';
  const phone = settings?.store_phone ?? '0302 000 000';
  const address = settings?.pickup_address ?? 'Accra, Ghana';

  return (
    <>
      <SEOHead
        title="Contact Skipper CleanCare"
        description="Reach us by email, phone, or visit our Accra pickup location. Bulk enquiries welcome."
      />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Contact' }]} />

      <section className="container pt-12 pb-10 md:pt-20 md:pb-16">
        <div className="max-w-4xl space-y-7">
          <div className="flex items-center gap-3">
            <span className="accent-line" aria-hidden="true" />
            <span className="editorial-label text-brand-cyan-deep">Get in touch</span>
          </div>
          <SplitHeadline
            text="Say hello, ask anything. | We're _listening._"
            className="text-display-lg text-brand-navy"
            as="h1"
            stagger={0.08}
            delay={0.1}
          />
          <p className="max-w-[52ch] text-[17px] text-brand-navy/70 leading-relaxed font-light">
            Orders, bulk enquiries, partnership ideas &mdash; whatever brings you here, we aim to
            reply within a few hours.
          </p>
        </div>
      </section>

      <section className="container pb-24">
        <div className="grid gap-6 md:grid-cols-12">
          {/* Left: contact cards */}
          <div className="md:col-span-7 grid gap-4 sm:grid-cols-2">
            <Reveal className="h-full">
              <a
                href={`mailto:${email}`}
                className="group flex flex-col justify-between gap-6 h-full rounded-lg bg-brand-sand/50 p-6 hover:bg-brand-sand/80 transition-colors duration-300"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-navy text-brand-ivory">
                  <Mail className="h-4 w-4" aria-hidden="true" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="editorial-label text-brand-cyan-deep">Email</p>
                  <p className="mt-2 font-display text-xl font-medium text-brand-navy break-words leading-tight">
                    {email}
                  </p>
                  <p className="mt-3 text-[12px] font-medium tracking-wider uppercase text-brand-navy/60 inline-flex items-center gap-1">
                    Send a message
                    <ArrowUpRight
                      className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      aria-hidden="true"
                    />
                  </p>
                </div>
              </a>
            </Reveal>
            <Reveal delay={0.08} className="h-full">
              <a
                href={`tel:${phone.replace(/\s+/g, '')}`}
                className="group flex flex-col justify-between gap-6 h-full rounded-lg bg-brand-sand/50 p-6 hover:bg-brand-sand/80 transition-colors duration-300"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-navy text-brand-ivory">
                  <Phone className="h-4 w-4" aria-hidden="true" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="editorial-label text-brand-cyan-deep">Phone / WhatsApp</p>
                  <p className="mt-2 font-display text-xl font-medium text-brand-navy tabular-nums">
                    {phone}
                  </p>
                  <p className="mt-3 text-[12px] font-medium tracking-wider uppercase text-brand-navy/60 inline-flex items-center gap-1">
                    Call us now
                    <ArrowUpRight
                      className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      aria-hidden="true"
                    />
                  </p>
                </div>
              </a>
            </Reveal>
            <Reveal delay={0.16} className="h-full">
              <div className="flex flex-col justify-between gap-6 h-full rounded-lg bg-brand-sand/50 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-navy text-brand-ivory">
                  <MapPin className="h-4 w-4" aria-hidden="true" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="editorial-label text-brand-cyan-deep">Pickup</p>
                  <p className="mt-2 font-display text-xl font-medium text-brand-navy leading-tight whitespace-pre-line">
                    {address}
                  </p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.24} className="h-full">
              <div className="flex flex-col justify-between gap-6 h-full rounded-lg bg-brand-sand/50 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-navy text-brand-ivory">
                  <Clock className="h-4 w-4" aria-hidden="true" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="editorial-label text-brand-cyan-deep">Hours</p>
                  <div className="mt-2 space-y-0.5 text-[15px] text-brand-navy font-light">
                    <p>Mon &ndash; Fri &middot; 8 AM &ndash; 6 PM</p>
                    <p>Saturday &middot; 9 AM &ndash; 4 PM</p>
                    <p className="text-brand-navy/50">Sunday &middot; Closed</p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Right: CTA panel */}
          <Reveal delay={0.15} className="md:col-span-5">
            <div className="relative overflow-hidden h-full rounded-lg bg-brand-navy noise-texture text-brand-ivory p-8 md:p-10 flex flex-col justify-between gap-8">
              <div
                className="absolute inset-0 gradient-mesh-dark pointer-events-none"
                aria-hidden="true"
              />
              <div className="relative">
                <span className="editorial-label text-brand-cyan">
                  <span
                    className="inline-block h-px w-8 bg-brand-cyan mr-3 align-middle"
                    aria-hidden="true"
                  />
                  Bulk enquiries
                </span>
                <p className="mt-6 font-display text-3xl md:text-4xl leading-[1.1] font-medium">
                  Need a bigger <span className="font-display-italic text-brand-cyan">plan?</span>
                </p>
                <p className="mt-5 text-brand-ivory/70 leading-relaxed font-light max-w-sm">
                  For large orders, restaurants, hotels, institutional purchasing, or regular
                  deliveries &mdash; email us directly. We&rsquo;ll build a package that works.
                </p>
              </div>
              <a
                href={`mailto:${email}?subject=Bulk%20Order%20Enquiry`}
                className="relative self-start"
              >
                <Button variant="secondary" size="lg" className="gap-3">
                  Send bulk enquiry
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
