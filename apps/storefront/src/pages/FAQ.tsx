import { SEOHead } from '@/components/seo/SEOHead';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';

const FAQS = [
  {
    q: 'How do I place an order?',
    a: "Browse our shop, add products to your cart, and proceed to checkout. You'll enter your contact and delivery details, choose a payment method, and confirm your order.",
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept payments via Paystack (debit/credit cards, Mobile Money, USSD) and manual bank transfer. For manual transfers, you will need to upload your payment receipt after placing your order.',
  },
  {
    q: 'How long does delivery take?',
    a: 'Orders within Accra placed before 12:00 PM are eligible for same-day delivery. Orders placed after that are typically delivered the next business day. Delivery to other regions takes 2–4 business days.',
  },
  {
    q: 'Is there a free delivery threshold?',
    a: 'Yes! Orders above GHS 200 qualify for free delivery within Accra. Standard delivery fees apply to orders below this threshold and for delivery outside Accra.',
  },
  {
    q: 'Can I pick up my order instead of having it delivered?',
    a: 'Absolutely. Select "Store Pickup" at checkout and collect your order from our Accra location at your convenience. We will send you a notification when your order is ready.',
  },
  {
    q: 'How does bulk pricing work?',
    a: 'Products with bulk pricing show tiered price tables on their detail pages. The more units you order, the lower the unit price. Prices update automatically as you adjust quantity — no code or minimum order form required.',
  },
  {
    q: 'Can I return or exchange a product?',
    a: 'We accept returns of unopened, undamaged products within 7 days of delivery. Please contact us with your order number and reason for return and we will arrange a collection or exchange.',
  },
  {
    q: 'How do I track my order?',
    a: 'Visit /track and enter your order number and the email address you used at checkout. You can also find the tracking link in the confirmation message we send after your order is confirmed.',
  },
];

export default function FAQ() {
  return (
    <>
      <SEOHead
        title="Frequently Asked Questions"
        description="Answers to common questions about ordering, delivery, bulk pricing, payments, and returns at Skipper Detergents."
      />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'FAQ' }]} />

      <div className="container py-12 max-w-3xl space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-primary mb-3">Frequently Asked Questions</h1>
          <p className="text-muted-foreground">
            Can't find your answer here? <a href="/contact" className="text-primary hover:underline">Contact us</a> and we'll get back to you within a few hours.
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map(({ q, a }) => (
            <details
              key={q}
              className="group rounded-xl border border-border overflow-hidden"
            >
              <summary className="flex cursor-pointer select-none items-center justify-between gap-4 px-5 py-4 font-medium text-sm hover:bg-accent transition-colors list-none">
                {q}
                <span
                  className="text-muted-foreground flex-none transition-transform duration-200 group-open:rotate-45"
                  aria-hidden="true"
                >
                  +
                </span>
              </summary>
              <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
                {a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </>
  );
}
