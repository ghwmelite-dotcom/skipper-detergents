import { ChevronDown } from 'lucide-react';
import { SEOHead } from '@/components/seo/SEOHead';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { Reveal } from '@/components/motion/Reveal';

const FAQS = [
  {
    q: 'How do I place an order?',
    a: "Browse the shop, add products to your cart, and head to checkout. You'll enter contact and delivery details, choose a payment method, and confirm.",
  },
  {
    q: 'What payment methods do you accept?',
    a: 'Paystack (debit/credit cards, Mobile Money, USSD) and manual bank transfer. For manual transfers, you upload your receipt after placing the order.',
  },
  {
    q: 'How long does delivery take?',
    a: 'Accra orders placed before 12:00 PM are eligible for same-day delivery. After that, next business day. Other regions take 2–4 business days.',
  },
  {
    q: 'Is there a free delivery threshold?',
    a: 'Yes. Orders above GHS 200 qualify for free delivery within Accra. Standard fees apply to orders below this threshold and for delivery outside Accra.',
  },
  {
    q: 'Can I pick up my order instead?',
    a: "Absolutely. Select 'Store Pickup' at checkout and collect from our Accra location. We'll notify you when it's ready.",
  },
  {
    q: 'How does bulk pricing work?',
    a: 'Products with bulk pricing show tiered tables on their detail pages. As your quantity goes up, the unit price goes down — no minimum order forms or quote requests.',
  },
  {
    q: 'Can I return or exchange a product?',
    a: 'Yes — unopened, undamaged products within 7 days of delivery. Contact us with your order number and we\'ll arrange collection or exchange.',
  },
  {
    q: 'How do I track my order?',
    a: 'Visit /track, enter your order number and the email you used at checkout. The tracking link is also in the confirmation message we send after your order is confirmed.',
  },
];

export default function FAQ() {
  return (
    <>
      <SEOHead
        title="Frequently asked questions"
        description="Answers to common questions about ordering, delivery, bulk pricing, payments, and returns at Skipper Detergents."
      />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'FAQ' }]} />

      <section className="container pt-12 pb-10 md:pt-20 md:pb-16 max-w-3xl">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="accent-line" aria-hidden="true" />
            <span className="editorial-label text-brand-cyan-deep">Answers</span>
          </div>
          <h1 className="font-display text-display-md text-brand-navy">
            The <span className="font-display-italic">questions</span> we get most.
          </h1>
          <p className="max-w-[50ch] text-[17px] text-brand-navy/65 leading-relaxed font-light">
            Still stuck?{' '}
            <a href="/contact" className="underline underline-offset-4 text-brand-cyan-deep hover:text-brand-navy transition-colors">
              Contact us
            </a>{' '}
            and we&rsquo;ll get back to you within a few hours.
          </p>
        </div>
      </section>

      <section className="container pb-24 max-w-3xl">
        <Reveal as="div" className="divide-y divide-brand-navy/10 border-y border-brand-navy/10">
          {FAQS.map((item) => (
            <details
              key={item.q}
              className="group open:bg-brand-sand/30 transition-colors duration-300"
            >
              <summary className="flex cursor-pointer select-none items-center justify-between gap-6 py-5 px-1 md:px-4 list-none hover:text-brand-cyan-deep transition-colors">
                <span className="font-display text-lg md:text-xl font-medium text-brand-navy leading-snug flex-1">
                  {item.q}
                </span>
                <span
                  className="flex-none h-8 w-8 rounded-full flex items-center justify-center bg-brand-navy/5 text-brand-navy transition-transform duration-300 ease-editorial group-open:rotate-180"
                  aria-hidden="true"
                >
                  <ChevronDown className="h-4 w-4" strokeWidth={2} />
                </span>
              </summary>
              <div className="pb-6 px-1 md:px-4 text-[16px] text-brand-navy/75 leading-[1.75] font-light max-w-[65ch]">
                {item.a}
              </div>
            </details>
          ))}
        </Reveal>
      </section>
    </>
  );
}
