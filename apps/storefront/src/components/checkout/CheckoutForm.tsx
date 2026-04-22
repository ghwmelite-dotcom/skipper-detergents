import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CreateOrderInput } from '@skipper/shared';
import { formatCurrency } from '@skipper/shared';
import { api, ApiError } from '@/lib/api';
import type { CartItem } from '@/stores/cartStore';
import type { PublicSettings } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface OrderResult {
  order: { id: string; order_number: string };
  next: {
    action: 'paystack_init' | 'upload_proof';
    manual_payment_details?: string;
    upload_endpoint?: string;
  };
}

interface CheckoutFormProps {
  cartItems: CartItem[];
  settings: PublicSettings;
  onOrderCreated: (result: OrderResult) => void;
}

export function CheckoutForm({ cartItems, settings, onOrderCreated }: CheckoutFormProps) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    deliveryMethod: 'delivery' as 'delivery' | 'pickup',
    address: '',
    city: '',
    region: '',
    gps: '',
    notes: '',
    paymentMethod: 'paystack' as 'paystack' | 'manual_transfer',
  });

  const feeAccra = parseFloat(settings.delivery_fee_accra ?? '0');
  const feeOther = parseFloat(settings.delivery_fee_other ?? '0');
  const freeThreshold = parseFloat(settings.free_delivery_threshold ?? '0');

  function set(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function getDeliveryFeeEstimate(): string {
    if (form.deliveryMethod === 'pickup') return 'Free (pickup)';
    const city = form.city.toLowerCase();
    const fee = city.includes('accra') ? feeAccra : feeOther;
    return fee === 0 ? 'Free' : formatCurrency(fee);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError('Please fill in all required contact fields.');
      return;
    }
    if (form.deliveryMethod === 'delivery' && (!form.address.trim() || !form.city.trim() || !form.region.trim())) {
      setError('Please fill in all delivery address fields.');
      return;
    }

    const body: CreateOrderInput = {
      items: cartItems.map((item) => ({
        product_id: item.product_id,
        ...(item.variant_id ? { variant_id: item.variant_id } : {}),
        quantity: item.quantity,
      })),
      delivery_method: form.deliveryMethod,
      delivery_name: form.name.trim(),
      delivery_email: form.email.trim(),
      delivery_phone: form.phone.trim(),
      ...(form.deliveryMethod === 'delivery'
        ? {
            delivery_address: form.address.trim(),
            delivery_city: form.city.trim(),
            delivery_region: form.region.trim(),
            ...(form.gps.trim() ? { delivery_gps: form.gps.trim() } : {}),
            ...(form.notes.trim() ? { delivery_notes: form.notes.trim() } : {}),
          }
        : {}),
      payment_method: form.paymentMethod,
    };

    setIsSubmitting(true);
    try {
      const result = await api.post<OrderResult>('/api/orders', body);
      // Store email for order tracking
      localStorage.setItem('skipper-last-email', form.email.trim());
      onOrderCreated(result);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      {/* Contact */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b border-border pb-2">Contact Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium">
              Full Name <span className="text-destructive">*</span>
            </label>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Kwame Asante"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="phone" className="text-sm font-medium">
              Phone <span className="text-destructive">*</span>
            </label>
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="0244 123 456"
              required
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email Address <span className="text-destructive">*</span>
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="kwame@example.com"
            required
          />
        </div>
      </section>

      {/* Delivery method */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b border-border pb-2">Delivery Method</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              {
                value: 'delivery',
                label: 'Home Delivery',
                desc: `${getDeliveryFeeEstimate()} delivery fee`,
              },
              {
                value: 'pickup',
                label: 'Store Pickup',
                desc: settings.pickup_address ?? 'Collect from our store',
              },
            ] as const
          ).map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer gap-3 rounded-lg border-2 p-4 transition-all ${
                form.deliveryMethod === opt.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <input
                type="radio"
                name="deliveryMethod"
                value={opt.value}
                checked={form.deliveryMethod === opt.value}
                onChange={() => set('deliveryMethod', opt.value)}
                className="mt-1 h-4 w-4 accent-primary"
              />
              <div>
                <p className="font-medium text-sm">{opt.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>

        {form.deliveryMethod === 'delivery' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1.5">
              <label htmlFor="address" className="text-sm font-medium">
                Street Address <span className="text-destructive">*</span>
              </label>
              <Input
                id="address"
                type="text"
                autoComplete="street-address"
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                placeholder="House no. / Street"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="city" className="text-sm font-medium">
                City <span className="text-destructive">*</span>
              </label>
              <Input
                id="city"
                type="text"
                autoComplete="address-level2"
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
                placeholder="Accra"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="region" className="text-sm font-medium">
                Region <span className="text-destructive">*</span>
              </label>
              <Input
                id="region"
                type="text"
                autoComplete="address-level1"
                value={form.region}
                onChange={(e) => set('region', e.target.value)}
                placeholder="Greater Accra"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="gps" className="text-sm font-medium">
                GPS Address <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Input
                id="gps"
                type="text"
                value={form.gps}
                onChange={(e) => set('gps', e.target.value)}
                placeholder="GA-123-4567"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="notes" className="text-sm font-medium">
                Delivery Notes <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Input
                id="notes"
                type="text"
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Near the blue gate..."
              />
            </div>
          </div>
        )}
      </section>

      {/* Payment method */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b border-border pb-2">Payment Method</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              {
                value: 'paystack',
                label: 'Pay with Paystack',
                desc: 'Card, Mobile Money, USSD',
              },
              {
                value: 'manual_transfer',
                label: 'Bank / MoMo Transfer',
                desc: 'Transfer and upload proof',
              },
            ] as const
          ).map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer gap-3 rounded-lg border-2 p-4 transition-all ${
                form.paymentMethod === opt.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={opt.value}
                checked={form.paymentMethod === opt.value}
                onChange={() => set('paymentMethod', opt.value)}
                className="mt-1 h-4 w-4 accent-primary"
              />
              <div>
                <p className="font-medium text-sm">{opt.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </section>

      {error && (
        <div role="alert" className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <LoadingSpinner className="h-5 w-5" />
            Placing order...
          </>
        ) : (
          'Place Order'
        )}
      </Button>
    </form>
  );
}
