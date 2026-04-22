import { SEOHead } from '@/components/seo/SEOHead';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';

const SECTIONS = [
  {
    n: '01',
    heading: 'Information we collect',
    body: `When you place an order with Skipper CleanCare, we collect the personal information you provide: your name, email address, phone number, and delivery address. We also collect technical information such as IP address and browser type to operate the platform securely. We do not collect payment card numbers — all payment processing is handled directly by Paystack, our certified payment processor.`,
  },
  {
    n: '02',
    heading: 'How we use your information',
    body: `We use your information exclusively to fulfil and manage your orders, communicate order status and updates, and — with your consent — send you promotional messages about new products or offers. We do not sell, rent, or trade your personal information to third parties. We may share your delivery details with courier partners solely for the purpose of delivering your order.`,
    list: [
      'Order processing and fulfilment',
      'Customer support and dispute resolution',
      'Fraud prevention and platform security',
      'Compliance with applicable Ghanaian law',
    ],
  },
  {
    n: '03',
    heading: 'Data security and retention',
    body: `We use industry-standard security practices including HTTPS encryption, access controls, and regular security reviews to protect your data. Order records are retained for a minimum of 3 years to comply with business and tax regulations. You may request deletion of your personal data at any time by contacting us at privacy@skipperdetergents.com.gh. Requests will be fulfilled within 30 days except where retention is required by law.`,
  },
  {
    n: '04',
    heading: 'Cookies',
    body: `We use cookies solely to maintain your shopping cart across sessions and to remember your preferences. We do not use advertising or tracking cookies from third-party ad networks. You can disable cookies in your browser settings, but this may affect the functionality of the cart.`,
  },
  {
    n: '05',
    heading: 'Contact',
    body: `If you have questions about this policy or wish to exercise your data rights, please contact us at privacy@skipperdetergents.com.gh or write to us at our registered address in Accra, Ghana.`,
  },
];

export default function PrivacyPolicy() {
  return (
    <>
      <SEOHead
        title="Privacy Policy"
        description="How Skipper CleanCare collects, uses, and protects your personal information."
      />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Privacy Policy' }]} />

      <section className="container pt-12 pb-8 md:pt-20 md:pb-12 max-w-3xl">
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <span className="accent-line" aria-hidden="true" />
            <span className="editorial-label text-brand-cyan-deep">Legal</span>
          </div>
          <h1 className="font-display text-display-md text-brand-navy">
            <span className="font-display-italic">Privacy</span> policy.
          </h1>
          <p className="text-sm text-brand-navy/55 tracking-wider uppercase">
            Last updated April 2026
          </p>
        </div>
      </section>

      <section className="container pb-24 max-w-3xl">
        <div className="space-y-14">
          {SECTIONS.map((section) => (
            <article key={section.n} className="grid gap-5 md:grid-cols-[80px_1fr] md:gap-8">
              <p className="font-display text-4xl text-brand-cyan-deep tabular-nums leading-none">
                {section.n}
              </p>
              <div>
                <h2 className="font-display text-2xl font-medium text-brand-navy mb-4">
                  {section.heading}
                </h2>
                <p className="text-[16px] text-brand-navy/75 leading-[1.75] font-light">
                  {section.body}
                </p>
                {section.list && (
                  <ul className="mt-5 space-y-2 text-[15px] text-brand-navy/75 font-light">
                    {section.list.map((li) => (
                      <li key={li} className="flex gap-3 items-start">
                        <span className="mt-[10px] inline-block h-px w-3 bg-brand-cyan flex-none" aria-hidden="true" />
                        <span>{li}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
