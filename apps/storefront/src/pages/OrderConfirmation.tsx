import { useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Check, MapPin, Mail, ArrowRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { SEOHead } from '@/components/seo/SEOHead';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';

const NEXT_STEPS = [
  {
    icon: Mail,
    label: 'Check your email',
    body: "We've sent confirmation to the address you provided.",
  },
  {
    icon: MapPin,
    label: "We'll prepare your order",
    body: 'Accra dispatches same day before 12 PM. Other regions 2–4 business days.',
  },
];

export default function OrderConfirmation() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference');
  const { clear } = useCart();
  const reduced = useReducedMotion();

  useEffect(() => {
    clear();
  }, []);

  return (
    <>
      <SEOHead title={`Order ${orderNumber ?? ''} confirmed`} noindex />

      <div className="container py-20 md:py-28 max-w-2xl mx-auto text-center">
        <motion.div
          initial={reduced ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 20, delay: 0.1 }}
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-cyan/15 ring-1 ring-brand-cyan/30"
        >
          <motion.div
            initial={reduced ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.35, type: 'spring', stiffness: 360, damping: 18 }}
          >
            <Check className="h-10 w-10 text-brand-cyan-deep" strokeWidth={1.75} aria-hidden="true" />
          </motion.div>
        </motion.div>

        <motion.h1
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
          className="mt-8 font-display text-display-md text-brand-navy"
        >
          <span className="font-display-italic">Thank you.</span>
        </motion.h1>

        <motion.p
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.65, ease: [0.2, 0.8, 0.2, 1] }}
          className="mt-4 text-brand-navy/65 text-[17px] leading-relaxed max-w-md mx-auto"
        >
          Your order is in &mdash; we&rsquo;ll take it from here. A quiet notification email is on
          its way.
        </motion.p>

        <motion.div
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.85, ease: [0.2, 0.8, 0.2, 1] }}
          className="mt-10 rounded-lg bg-brand-sand/60 p-6 md:p-8 text-left space-y-5"
        >
          <div>
            <p className="editorial-label text-brand-cyan-deep">Order number</p>
            <p className="font-display text-3xl font-medium text-brand-navy mt-2 tracking-tight">
              {orderNumber}
            </p>
          </div>
          {reference && (
            <div className="pt-4 border-t border-brand-navy/10">
              <p className="editorial-label text-brand-cyan-deep">Payment reference</p>
              <p className="font-mono text-sm text-brand-navy mt-2 break-all">{reference}</p>
            </div>
          )}
          <div className="pt-4 border-t border-brand-navy/10">
            <p className="editorial-label text-brand-cyan-deep">Status</p>
            <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-brand-ivory px-3 py-1 text-sm font-medium text-brand-navy">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-brand-cyan/50 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-cyan" />
              </span>
              {reference ? 'Confirmed · Paid' : 'Awaiting payment confirmation'}
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0, ease: [0.2, 0.8, 0.2, 1] }}
          className="mt-10 grid gap-4 sm:grid-cols-2 text-left"
        >
          {NEXT_STEPS.map(({ icon: Icon, label, body }) => (
            <div
              key={label}
              className="rounded-lg border border-brand-navy/10 p-5 bg-brand-ivory space-y-2"
            >
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-brand-cyan/10 text-brand-cyan-deep">
                <Icon className="h-4 w-4" aria-hidden="true" strokeWidth={1.75} />
              </div>
              <p className="font-display text-base font-medium text-brand-navy leading-tight">
                {label}
              </p>
              <p className="text-[13px] text-brand-navy/60 leading-relaxed">{body}</p>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.15, ease: [0.2, 0.8, 0.2, 1] }}
          className="mt-12 flex flex-wrap items-center justify-center gap-3"
        >
          <Link to={`/track/${orderNumber}`}>
            <Button variant="primary" size="lg" className="gap-2">
              Track my order
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
          <Link to="/shop">
            <Button variant="outline" size="lg">
              Keep shopping
            </Button>
          </Link>
        </motion.div>
      </div>
    </>
  );
}
