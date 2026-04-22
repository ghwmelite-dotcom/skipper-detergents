import { SEOHead } from '@/components/seo/SEOHead';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';

export default function PrivacyPolicy() {
  return (
    <>
      <SEOHead
        title="Privacy Policy"
        description="How Skipper Detergents collects, uses, and protects your personal information."
      />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Privacy Policy' }]} />

      <div className="container py-12 max-w-3xl space-y-10">
        <div>
          <h1 className="text-4xl font-bold text-primary mb-2">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: April 2026</p>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">1. Information We Collect</h2>
          <p className="text-muted-foreground leading-relaxed">
            When you place an order with Skipper Detergents, we collect the personal information
            you provide: your name, email address, phone number, and delivery address. We also
            collect technical information such as IP address and browser type to operate the
            platform securely. We do not collect payment card numbers — all payment processing is
            handled directly by Paystack, our certified payment processor.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">2. How We Use Your Information</h2>
          <p className="text-muted-foreground leading-relaxed">
            We use your information exclusively to fulfil and manage your orders, communicate
            order status and updates, and — with your consent — send you promotional messages
            about new products or offers. We do not sell, rent, or trade your personal information
            to third parties. We may share your delivery details with courier partners solely for
            the purpose of delivering your order.
          </p>
          <ul className="list-disc list-inside text-muted-foreground text-sm space-y-1 leading-relaxed">
            <li>Order processing and fulfilment</li>
            <li>Customer support and dispute resolution</li>
            <li>Fraud prevention and platform security</li>
            <li>Compliance with applicable Ghanaian law</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">3. Data Security and Retention</h2>
          <p className="text-muted-foreground leading-relaxed">
            We use industry-standard security practices including HTTPS encryption, access
            controls, and regular security reviews to protect your data. Order records are
            retained for a minimum of 3 years to comply with business and tax regulations. You
            may request deletion of your personal data at any time by contacting us at{' '}
            <a href="mailto:privacy@skipperdetergents.com.gh" className="text-primary hover:underline">
              privacy@skipperdetergents.com.gh
            </a>
            . Requests will be fulfilled within 30 days except where retention is required by law.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">4. Cookies</h2>
          <p className="text-muted-foreground leading-relaxed">
            We use cookies solely to maintain your shopping cart across sessions and to remember
            your preferences. We do not use advertising or tracking cookies from third-party ad
            networks. You can disable cookies in your browser settings, but this may affect the
            functionality of the cart.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">5. Contact</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you have questions about this policy or wish to exercise your data rights, please
            contact us at{' '}
            <a href="mailto:privacy@skipperdetergents.com.gh" className="text-primary hover:underline">
              privacy@skipperdetergents.com.gh
            </a>{' '}
            or write to us at our registered address in Accra, Ghana.
          </p>
        </section>
      </div>
    </>
  );
}
