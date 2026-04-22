import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Package, MapPin, Clock, CheckCircle, Truck } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { SEOHead } from '@/components/seo/SEOHead';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { api, ApiError } from '@/lib/api';
import type { OrderWithItems } from '@skipper/shared';
import { formatCurrency } from '@skipper/shared';
import { cn } from '@/lib/cn';

const STATUS_STEPS = [
  { key: 'pending', label: 'Placed', icon: Package },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'processing', label: 'Processing', icon: Clock },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: MapPin },
] as const;

function getStatusIndex(status: string): number {
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

function looksLikeEmail(s: string): boolean {
  return /@/.test(s);
}

function looksLikePhone(s: string): boolean {
  // At least 7 digits after stripping everything that isn't a number.
  return s.replace(/\D+/g, '').length >= 7;
}

export default function OrderTracking() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [searchParams] = useSearchParams();
  const reduced = useReducedMotion();

  const savedEmail = localStorage.getItem('skipper-last-email') ?? '';
  const initialLookup =
    searchParams.get('email') ?? searchParams.get('phone') ?? savedEmail;
  const [lookup, setLookup] = useState(initialLookup);
  const [submittedLookup, setSubmittedLookup] = useState(initialLookup);
  const [formError, setFormError] = useState('');

  const trackingQuery = (() => {
    const value = submittedLookup.trim();
    if (!value) return '';
    if (looksLikeEmail(value)) return `email=${encodeURIComponent(value)}`;
    return `phone=${encodeURIComponent(value)}`;
  })();

  const {
    data: order,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['orders', 'track', orderNumber, submittedLookup],
    enabled: Boolean(orderNumber) && Boolean(trackingQuery),
    queryFn: () =>
      api.get<OrderWithItems>(`/api/track/${orderNumber}?${trackingQuery}`),
    retry: false,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = lookup.trim();
    if (!value) {
      setFormError('Enter the email or phone you used at checkout.');
      return;
    }
    if (!looksLikeEmail(value) && !looksLikePhone(value)) {
      setFormError('That doesn’t look like an email or phone number.');
      return;
    }
    setFormError('');
    setSubmittedLookup(value);
  }

  const currentStatusIdx = order ? getStatusIndex(order.status) : -1;
  const progressPct =
    currentStatusIdx >= 0 ? (currentStatusIdx / (STATUS_STEPS.length - 1)) * 100 : 0;

  return (
    <>
      <SEOHead title={`Track order ${orderNumber ?? ''}`} noindex />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Track order' }]} />

      <div className="container py-10 md:py-16 max-w-3xl mx-auto">
        <div className="mb-10">
          <span className="editorial-label text-brand-cyan-deep">
            <span className="accent-line mr-3" aria-hidden="true" />
            Tracking
          </span>
          <h1 className="mt-4 font-display text-display-md text-brand-navy">
            <span className="font-display-italic">Where is</span> your order.
          </h1>
          {orderNumber && (
            <p className="mt-2 text-sm text-brand-navy/60 tabular-nums">
              Order {orderNumber}
            </p>
          )}
        </div>

        {/* Lookup form */}
        {!submittedLookup || (isError && !order) ? (
          <form
            onSubmit={handleSubmit}
            className="rounded-lg bg-brand-sand/50 p-6 md:p-8 space-y-5 max-w-lg"
          >
            <div>
              <p className="font-display text-xl font-medium text-brand-navy leading-tight">
                Enter the <span className="font-display-italic">email or phone</span> you
                used at checkout.
              </p>
              <p className="mt-2 text-sm text-brand-navy/60">
                We&apos;ll show you the current status of your order.
              </p>
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="track-lookup"
                className="editorial-label text-brand-navy/60"
              >
                Email or phone
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
              {formError && (
                <p className="text-sm text-brand-red">{formError}</p>
              )}
              {isError && submittedLookup && (
                <p className="text-sm text-brand-red">
                  {error instanceof ApiError
                    ? error.message
                    : 'Order not found. Check your details.'}
                </p>
              )}
            </div>
            <Button type="submit" variant="primary" size="md">
              Look up my order
            </Button>
          </form>
        ) : null}

        {isLoading && (
          <div className="space-y-5">
            <Skeleton className="h-28 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        )}

        {order && (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
            className="space-y-8"
          >
            {/* Stepper */}
            <div className="rounded-lg border border-brand-navy/10 p-6 md:p-8 bg-brand-ivory">
              <div className="flex items-end justify-between gap-3 mb-6">
                <div>
                  <p className="editorial-label text-brand-cyan-deep">Status</p>
                  <p className="font-display text-2xl font-medium text-brand-navy capitalize mt-1">
                    {order.status.replace(/_/g, ' ')}
                  </p>
                </div>
                <p className="text-[11px] text-brand-navy/50 tracking-wider uppercase">
                  Placed {new Date(order.created_at).toLocaleDateString()}
                </p>
              </div>

              {/* Horizontal progress bar */}
              <div className="relative">
                <div className="absolute left-4 right-4 top-[15px] h-[2px] bg-brand-navy/10" aria-hidden="true" />
                <motion.div
                  className="absolute left-4 top-[15px] h-[2px] bg-brand-cyan origin-left"
                  initial={{ scaleX: 0 }}
                  animate={{
                    scaleX: progressPct / 100,
                  }}
                  transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1], delay: 0.3 }}
                  style={{
                    width: `calc(100% - 2rem)`,
                    transformOrigin: 'left center',
                  }}
                  aria-hidden="true"
                />
                <div className="relative grid grid-cols-5 gap-2">
                  {STATUS_STEPS.map((step, idx) => {
                    const Icon = step.icon;
                    const done = idx <= currentStatusIdx;
                    const active = idx === currentStatusIdx;
                    return (
                      <motion.div
                        key={step.key}
                        initial={reduced ? false : { scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                          delay: 0.3 + idx * 0.1,
                          type: 'spring',
                          stiffness: 320,
                          damping: 24,
                        }}
                        className="flex flex-col items-center gap-2"
                      >
                        <div
                          className={cn(
                            'h-8 w-8 rounded-full flex items-center justify-center transition-colors duration-300 ring-4 ring-brand-ivory',
                            done
                              ? 'bg-brand-cyan text-white'
                              : 'bg-brand-navy/10 text-brand-navy/50',
                            active && 'ring-brand-cyan/20',
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={2} />
                        </div>
                        <span
                          className={cn(
                            'text-[11px] tracking-wide uppercase text-center font-medium',
                            done ? 'text-brand-navy' : 'text-brand-navy/50',
                          )}
                        >
                          {step.label}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Order meta */}
            <div className="grid gap-5 sm:grid-cols-2">
              {[
                { label: 'Order number', value: order.order_number, mono: false },
                {
                  label: 'Payment status',
                  value: order.payment_status,
                  mono: false,
                  accent:
                    order.payment_status === 'paid'
                      ? 'text-emerald-600'
                      : 'text-amber-600',
                },
                {
                  label: 'Delivery',
                  value: order.delivery_method,
                  mono: false,
                },
                {
                  label: 'Total',
                  value: formatCurrency(order.total_amount),
                  mono: true,
                },
              ].map((f) => (
                <div key={f.label} className="rounded-lg bg-brand-sand/40 p-5">
                  <p className="editorial-label text-brand-navy/60">{f.label}</p>
                  <p
                    className={cn(
                      'mt-2 font-display text-lg font-medium capitalize',
                      f.mono ? 'tabular-nums text-brand-navy' : '',
                      f.accent ?? 'text-brand-navy',
                    )}
                  >
                    {f.value}
                  </p>
                </div>
              ))}
            </div>

            {order.tracking_number && (
              <div className="rounded-lg border border-brand-navy/10 p-6 bg-brand-ivory space-y-2">
                <p className="editorial-label text-brand-cyan-deep">Courier tracking</p>
                <p className="font-mono text-sm text-brand-navy">{order.tracking_number}</p>
                {order.tracking_url && (
                  <a
                    href={order.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-brand-cyan-deep hover:underline font-medium"
                  >
                    Track shipment &rarr;
                  </a>
                )}
              </div>
            )}

            {/* Items */}
            <div className="rounded-lg bg-brand-sand/40 p-6 md:p-8 space-y-5">
              <h2 className="font-display text-xl font-medium text-brand-navy">
                Items <span className="font-display-italic">ordered</span>
              </h2>
              <div className="divide-y divide-brand-navy/10">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-brand-navy line-clamp-2">
                        {item.product_name}
                      </p>
                      {item.variant_name && (
                        <p className="text-[12px] text-brand-navy/55 mt-0.5">
                          {item.variant_name}
                        </p>
                      )}
                      <p className="text-[12px] text-brand-navy/55 mt-1 tabular-nums">
                        Qty {item.quantity} &middot; {formatCurrency(item.unit_price)}
                      </p>
                    </div>
                    <p className="font-semibold text-brand-navy tabular-nums shrink-0">
                      {formatCurrency(item.line_total)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="pt-5 border-t border-brand-navy/10 space-y-2 text-sm">
                <div className="flex justify-between tabular-nums">
                  <span className="text-brand-navy/65">Subtotal</span>
                  <span className="text-brand-navy">{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between tabular-nums">
                  <span className="text-brand-navy/65">Delivery</span>
                  <span className="text-brand-navy">
                    {formatCurrency(order.delivery_fee)}
                  </span>
                </div>
                <div className="pt-2 border-t border-brand-navy/10 flex justify-between items-baseline">
                  <span className="text-sm text-brand-navy/65 uppercase tracking-wider font-medium">
                    Total
                  </span>
                  <span className="font-display text-2xl font-medium text-brand-navy tabular-nums">
                    {formatCurrency(order.total_amount)}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSubmittedLookup('')}
              className="text-sm text-brand-navy/55 hover:text-brand-navy transition-colors underline"
            >
              Use a different email or phone
            </button>
          </motion.div>
        )}
      </div>
    </>
  );
}
