import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Package, MapPin, Clock, CheckCircle, Truck, AlertCircle } from 'lucide-react';
import { SEOHead } from '@/components/seo/SEOHead';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { api, ApiError } from '@/lib/api';
import type { OrderWithItems } from '@skipper/shared';
import { formatCurrency } from '@skipper/shared';

const STATUS_STEPS = [
  { key: 'pending', label: 'Order Placed', icon: Package },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'processing', label: 'Processing', icon: Clock },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: MapPin },
] as const;

function getStatusIndex(status: string): number {
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

export default function OrderTracking() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [searchParams] = useSearchParams();

  const savedEmail = localStorage.getItem('skipper-last-email') ?? '';
  const [email, setEmail] = useState(searchParams.get('email') ?? savedEmail);
  const [submittedEmail, setSubmittedEmail] = useState(searchParams.get('email') ?? savedEmail);
  const [formError, setFormError] = useState('');

  const {
    data: order,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['orders', 'track', orderNumber, submittedEmail],
    enabled: Boolean(orderNumber) && Boolean(submittedEmail),
    queryFn: () =>
      api.get<OrderWithItems>(
        `/api/track/${orderNumber}?email=${encodeURIComponent(submittedEmail)}`,
      ),
    retry: false,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }
    setFormError('');
    setSubmittedEmail(email.trim());
  }

  const currentStatusIdx = order ? getStatusIndex(order.status) : -1;

  return (
    <>
      <SEOHead title={`Track Order ${orderNumber ?? ''}`} noindex />
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Track Order' },
        ]}
      />

      <div className="container py-8 max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Track Your Order</h1>
          {orderNumber && (
            <p className="text-muted-foreground mt-1">Order number: {orderNumber}</p>
          )}
        </div>

        {/* Email form */}
        {!submittedEmail || (isError && !order) ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="track-email" className="text-sm font-medium">
                Email address used at checkout
              </label>
              <Input
                id="track-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kwame@example.com"
                autoComplete="email"
                required
              />
              {formError && (
                <p className="text-sm text-destructive">{formError}</p>
              )}
              {isError && submittedEmail && (
                <p className="text-sm text-destructive">
                  {error instanceof ApiError ? error.message : 'Order not found. Check your email address.'}
                </p>
              )}
            </div>
            <Button type="submit" variant="primary" size="md">
              Track Order
            </Button>
          </form>
        ) : null}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        )}

        {/* Order details */}
        {order && (
          <div className="space-y-6">
            {/* Status progress */}
            <div className="rounded-xl border border-border p-6">
              <h2 className="font-semibold mb-6">Order Status</h2>
              <div className="flex items-start justify-between gap-2">
                {STATUS_STEPS.map((step, idx) => {
                  const Icon = step.icon;
                  const done = idx <= currentStatusIdx;
                  const active = idx === currentStatusIdx;
                  return (
                    <div
                      key={step.key}
                      className="flex flex-col items-center gap-1.5 flex-1 text-center"
                    >
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
                          done
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        } ${active ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <span
                        className={`text-xs leading-tight ${
                          done ? 'text-foreground font-medium' : 'text-muted-foreground'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order info */}
            <div className="rounded-xl border border-border p-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Order Number</p>
                  <p className="font-semibold mt-0.5">{order.order_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Payment</p>
                  <p
                    className={`font-semibold mt-0.5 capitalize ${
                      order.payment_status === 'paid' ? 'text-green-600' : 'text-amber-600'
                    }`}
                  >
                    {order.payment_status}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Delivery method</p>
                  <p className="font-semibold mt-0.5 capitalize">{order.delivery_method}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-semibold mt-0.5">{formatCurrency(order.total_amount)}</p>
                </div>
              </div>

              {order.tracking_number && (
                <div className="border-t border-border pt-4">
                  <p className="text-muted-foreground text-sm">Tracking number</p>
                  <p className="font-mono font-medium mt-0.5">{order.tracking_number}</p>
                  {order.tracking_url && (
                    <a
                      href={order.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline mt-1 inline-block"
                    >
                      Track shipment
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Items */}
            <div className="rounded-xl border border-border p-6 space-y-4">
              <h2 className="font-semibold">Items Ordered</h2>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between gap-4 text-sm py-2 border-b border-border last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="font-medium line-clamp-2">{item.product_name}</p>
                      {item.variant_name && (
                        <p className="text-muted-foreground text-xs mt-0.5">{item.variant_name}</p>
                      )}
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Qty: {item.quantity} × {formatCurrency(item.unit_price)}
                      </p>
                    </div>
                    <p className="font-semibold shrink-0">{formatCurrency(item.line_total)}</p>
                  </div>
                ))}
              </div>

              <div className="pt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span>{formatCurrency(order.delivery_fee)}</span>
                </div>
                <div className="flex justify-between font-semibold text-base pt-1 border-t border-border mt-1">
                  <span>Total</span>
                  <span>{formatCurrency(order.total_amount)}</span>
                </div>
              </div>
            </div>

            {/* Change email */}
            <button
              onClick={() => setSubmittedEmail('')}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              Use a different email address
            </button>
          </div>
        )}
      </div>
    </>
  );
}
