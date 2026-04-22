import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { SEOHead } from '@/components/seo/SEOHead';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import { PaystackButton } from '@/components/checkout/PaystackButton';
import { ManualPaymentUpload } from '@/components/checkout/ManualPaymentUpload';
import { CartSummary } from '@/components/cart/CartSummary';
import { useCart } from '@/hooks/useCart';
import { usePublicSettings } from '@/hooks/useSettings';
import { useQueries } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Product } from '@skipper/shared';

interface OrderResult {
  order: { id: string; order_number: string };
  next: {
    action: 'paystack_init' | 'upload_proof';
    manual_payment_details?: string;
    upload_endpoint?: string;
  };
}

export default function Checkout() {
  const { items } = useCart();
  const { data: settings } = usePublicSettings();
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null);
  const [customerEmail, setCustomerEmail] = useState('');

  const productQueries = useQueries({
    queries: items.map((item) => ({
      queryKey: ['products', 'byId', item.product_id],
      queryFn: async (): Promise<Product | null> => {
        try {
          return await api.get<Product>(`/api/products/id/${item.product_id}`);
        } catch {
          return null;
        }
      },
      staleTime: 5 * 60_000,
    })),
  });

  const products = productQueries
    .map((q) => q.data)
    .filter((p): p is Product => p !== null && p !== undefined);

  if (items.length === 0 && !orderResult) {
    return <Navigate to="/cart" replace />;
  }

  function handleOrderCreated(result: OrderResult, email: string) {
    setOrderResult(result);
    setCustomerEmail(email);
  }

  return (
    <>
      <SEOHead title="Checkout" noindex />
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Cart', href: '/cart' },
          { label: 'Checkout' },
        ]}
      />

      <div className="container py-8 md:py-14">
        <div className="mb-10">
          <span className="editorial-label text-brand-cyan-deep">
            <span className="accent-line mr-3" aria-hidden="true" />
            Final step
          </span>
          <h1 className="mt-4 font-display text-display-md text-brand-navy">
            <span className="font-display-italic">Checkout.</span>
          </h1>
          <p className="mt-3 text-brand-navy/60 max-w-lg">
            Almost there. A few details and your order is on its way.
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1fr_400px] lg:gap-16">
          <div>
            <AnimatePresence mode="wait">
              {!orderResult ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  <CheckoutForm
                    cartItems={items}
                    settings={settings ?? {}}
                    onOrderCreated={(result) => {
                      const email = localStorage.getItem('skipper-last-email') ?? '';
                      handleOrderCreated(result, email);
                    }}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="payment"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
                  className="space-y-8"
                >
                  <div className="rounded-lg border border-emerald-600/20 bg-emerald-50/50 p-5 flex gap-4 items-start">
                    <CheckCircle2
                      className="h-5 w-5 text-emerald-600 flex-none mt-0.5"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-display text-lg text-brand-navy font-medium">
                        Order{' '}
                        <span className="font-display-italic">
                          {orderResult.order.order_number}
                        </span>{' '}
                        created.
                      </p>
                      <p className="text-sm text-brand-navy/65 mt-1">
                        Complete your payment below to confirm.
                      </p>
                    </div>
                  </div>

                  {orderResult.next.action === 'paystack_init' ? (
                    <div className="space-y-4">
                      <h2 className="font-display text-2xl font-medium text-brand-navy">
                        Complete <span className="font-display-italic">payment</span>.
                      </h2>
                      <PaystackButton
                        orderId={orderResult.order.id}
                        orderNumber={orderResult.order.order_number}
                        email={customerEmail}
                        publicKey={settings?.paystack_public_key ?? ''}
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h2 className="font-display text-2xl font-medium text-brand-navy">
                        Upload <span className="font-display-italic">proof</span> of payment.
                      </h2>
                      <ManualPaymentUpload
                        orderId={orderResult.order.id}
                        orderNumber={orderResult.order.order_number}
                        manualPaymentDetails={
                          orderResult.next.manual_payment_details ??
                          settings?.manual_payment_details ??
                          'Contact us for transfer details.'
                        }
                      />
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <CartSummary items={items} products={products} />
            {items.length > 0 && (
              <p className="text-[11px] text-brand-navy/50 text-center tracking-wider uppercase">
                By placing your order you agree to our terms
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
