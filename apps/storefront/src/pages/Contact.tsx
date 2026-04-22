import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import { SEOHead } from '@/components/seo/SEOHead';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { usePublicSettings } from '@/hooks/useSettings';

export default function Contact() {
  const { data: settings } = usePublicSettings();

  const email = settings?.store_email ?? 'hello@skipperdetergents.com.gh';
  const phone = settings?.store_phone ?? '0302 000 000';
  const address = settings?.pickup_address ?? 'Accra, Ghana';

  return (
    <>
      <SEOHead
        title="Contact Us"
        description="Get in touch with Skipper Detergents. We're here to help with orders, bulk enquiries, and general questions."
      />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Contact' }]} />

      <div className="container py-12 max-w-3xl space-y-10">
        <div>
          <h1 className="text-4xl font-bold text-primary mb-3">Contact Us</h1>
          <p className="text-muted-foreground text-lg">
            Have a question about an order, a bulk enquiry, or just want to say hello? We'd love
            to hear from you.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <a
            href={`mailto:${email}`}
            className="flex items-start gap-4 rounded-xl border border-border p-5 hover:bg-accent transition-colors"
          >
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-none">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold text-sm">Email</p>
              <p className="text-muted-foreground text-sm mt-0.5">{email}</p>
              <p className="text-primary text-xs mt-1">Send us a message</p>
            </div>
          </a>

          <a
            href={`tel:${phone.replace(/\s+/g, '')}`}
            className="flex items-start gap-4 rounded-xl border border-border p-5 hover:bg-accent transition-colors"
          >
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-none">
              <Phone className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold text-sm">Phone</p>
              <p className="text-muted-foreground text-sm mt-0.5">{phone}</p>
              <p className="text-primary text-xs mt-1">Call or WhatsApp</p>
            </div>
          </a>

          <div className="flex items-start gap-4 rounded-xl border border-border p-5">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-none">
              <MapPin className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold text-sm">Address</p>
              <p className="text-muted-foreground text-sm mt-0.5 whitespace-pre-line">{address}</p>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-xl border border-border p-5">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-none">
              <Clock className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold text-sm">Business Hours</p>
              <p className="text-muted-foreground text-sm mt-0.5">
                Monday – Friday: 8:00 AM – 6:00 PM
                <br />
                Saturday: 9:00 AM – 4:00 PM
                <br />
                Sunday: Closed
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-primary/5 border border-primary/20 p-6 space-y-2">
          <h2 className="font-semibold">Bulk Order Enquiries</h2>
          <p className="text-sm text-muted-foreground">
            For large or regular bulk orders, restaurants, hotels, or institutional purchasing,
            please email us or call directly. We can arrange custom pricing, credit terms, and
            scheduled deliveries.
          </p>
          <a
            href={`mailto:${email}?subject=Bulk%20Order%20Enquiry`}
            className="text-sm text-primary hover:underline font-medium"
          >
            Send bulk enquiry
          </a>
        </div>
      </div>
    </>
  );
}
