import { useState } from 'react';
import { Navigate } from 'react-router-dom';
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

  // Redirect if cart is empty and no pending order
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

      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Form / payment step */}
          <div>
            {!orderResult ? (
              <CheckoutForm
                cartItems={items}
                settings={settings ?? {}}
                onOrderCreated={(result) => {
                  // Extract email from localStorage (CheckoutForm stores it there)
                  const email = localStorage.getItem('skipper-last-email') ?? '';
                  handleOrderCreated(result, email);
                }}
              />
            ) : (
              <div className="space-y-6">
                <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                  <p className="font-semibold text-green-800">
                    Order {orderResult.order.order_number} created successfully!
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    Complete your payment below to confirm your order.
                  </p>
                </div>

                {orderResult.next.action === 'paystack_init' ? (
                  <div className="space-y-3">
                    <h2 className="text-lg font-semibold">Complete Payment</h2>
                    <PaystackButton
                      orderId={orderResult.order.id}
                      orderNumber={orderResult.order.order_number}
                      email={customerEmail}
                      publicKey={settings?.paystack_public_key ?? ''}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h2 className="text-lg font-semibold">Upload Payment Proof</h2>
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
              </div>
            )}
          </div>

          {/* Order summary */}
          <div className="space-y-4">
            <CartSummary items={items} products={products} />
            {items.length > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                By placing your order you agree to our terms of service.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
