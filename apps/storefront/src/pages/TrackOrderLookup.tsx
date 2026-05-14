import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, ArrowRight, HelpCircle } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { SEOHead } from '@/components/seo/SEOHead';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function looksLikeEmail(s: string): boolean {
  return /@/.test(s);
}

function looksLikePhone(s: string): boolean {
  return s.replace(/\D+/g, '').length >= 7;
}

export default function TrackOrderLookup() {
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  const [orderNumber, setOrderNumber] = useState('');
  const [lookup, setLookup] = useState(
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('skipper-last-email') ?? ''
      : '',
  );
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const orderTrim = orderNumber.trim();
    const lookupTrim = lookup.trim();

    if (!orderTrim) {
      setError('Enter your order number.');
      return;
    }
    if (!lookupTrim) {
      setError('Enter the email or phone you used at checkout.');
      return;
    }
    if (!looksLikeEmail(lookupTrim) && !looksLikePhone(lookupTrim)) {
      setError('That doesn’t look like an email or phone number.');
      return;
    }
    setError(null);

    const param = looksLikeEmail(lookupTrim) ? 'email' : 'phone';
    navigate(`/track/${encodeURIComponent(orderTrim)}?${param}=${encodeURIComponent(lookupTrim)}`);
  }

  return (
    <>
      <SEOHead
        title="Track your order"
        description="Check the status of your Skipper CleanCare order with your order number and the email or phone you used at checkout."
      />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Track order' }]} />

      <div className="container py-10 md:py-16 max-w-3xl mx-auto">
        <div className="mb-10">
          <span className="editorial-label text-brand-cyan-deep">
            <span className="accent-line mr-3" aria-hidden="true" />
            Order tracking
          </span>
          <h1 className="mt-4 font-display text-display-md text-brand-navy leading-[1]">
            <span className="font-display-italic">Where is</span> your order.
          </h1>
          <p className="mt-4 max-w-[52ch] text-brand-navy/65 text-[15px] md:text-[16px] leading-relaxed font-light">
            Enter your order number along with the email or phone you used at checkout. We&apos;ll
            pull up its current status straight away.
          </p>
        </div>

        <motion.form
          onSubmit={handleSubmit}
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
          className="rounded-2xl bg-brand-sand/50 p-6 md:p-8 space-y-5"
        >
          <div className="space-y-1.5">
            <label htmlFor="track-order-number" className="editorial-label text-brand-navy/60">
              Order number
            </label>
            <Input
              id="track-order-number"
              type="text"
              inputMode="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="SKP-A1B2C3"
              autoComplete="off"
              autoCapitalize="characters"
              required
            />
            <p className="text-[12px] text-brand-navy/55">
              Starts with <span className="font-mono">SKP-</span>. You&apos;ll find it in your
              order confirmation email.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="track-lookup" className="editorial-label text-brand-navy/60">
              Email or phone you used
            </label>
            <Input
              id="track-lookup"
              type="text"
              inputMode="text"
              value={lookup}
              onChange={(e) => setLookup(e.target.value)}
              placeholder="kwame@example.com  ·  0244 123 456"
              autoComplete="email"
              required
            />
          </div>

          {error && (
            <p className="rounded border border-brand-red/30 bg-brand-red/5 px-3 py-2 text-sm text-brand-red">
              {error}
            </p>
          )}

          <div className="pt-2">
            <Button type="submit" variant="primary" size="lg" className="gap-2">
              <Package className="h-4 w-4" aria-hidden="true" />
              Look up my order
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </motion.form>

        <motion.div
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8 flex items-start gap-3 rounded-lg border border-brand-navy/10 bg-brand-ivory p-5"
        >
          <HelpCircle className="h-5 w-5 text-brand-cyan-deep shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-sm text-brand-navy/75 leading-relaxed">
            Can&apos;t find your order number? Check the inbox where you received your order
            confirmation (look for the subject line beginning with &quot;Order confirmation&quot;).
            If you still can&apos;t locate it, reach out via the{' '}
            <Link to="/contact" className="text-brand-cyan-deep hover:underline font-medium">
              contact page
            </Link>{' '}
            and we&apos;ll help you find it.
          </div>
        </motion.div>
      </div>
    </>
  );
}
