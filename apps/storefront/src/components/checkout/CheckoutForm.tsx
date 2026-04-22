import { useState } from 'react';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import type { CreateOrderInput } from '@skipper/shared';
import { formatCurrency } from '@skipper/shared';
import { api, ApiError } from '@/lib/api';
import type { CartItem } from '@/stores/cartStore';
import type { PublicSettings } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { cn } from '@/lib/cn';

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

  function set(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function getDeliveryFeeEstimate(): string {
    if (form.deliveryMethod === 'pickup') return 'Free pickup';
    const city = form.city.toLowerCase();
    const fee = city.includes('accra') ? feeAccra : feeOther;
    return fee === 0 ? 'Free' : formatCurrency(fee);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError('Please fill in all required contact fields.');
      return;
    }
    if (
      form.deliveryMethod === 'delivery' &&
      (!form.address.trim() || !form.city.trim() || !form.region.trim())
    ) {
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
    <form onSubmit={handleSubmit} className="space-y-12" noValidate>
      {/* Contact */}
      <section className="rounded-lg bg-brand-sand/40 p-6 md:p-8 space-y-6">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-3xl font-medium text-brand-cyan-deep leading-none tabular-nums">
            01
          </span>
          <h2 className="font-display text-2xl font-medium text-brand-navy">
            Contact <span className="font-display-italic">details</span>
          </h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="name"
            label="Full name"
            required
            value={form.name}
            onChange={(v) => set('name', v)}
            autoComplete="name"
            placeholder="Kwame Asante"
          />
          <Field
            id="phone"
            type="tel"
            label="Phone"
            required
            value={form.phone}
            onChange={(v) => set('phone', v)}
            autoComplete="tel"
            placeholder="0244 123 456"
          />
        </div>
        <Field
          id="email"
          type="email"
          label="Email address"
          required
          value={form.email}
          onChange={(v) => set('email', v)}
          autoComplete="email"
          placeholder="kwame@example.com"
        />
      </section>

      {/* Delivery */}
      <section className="rounded-lg bg-brand-sand/40 p-6 md:p-8 space-y-6">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-3xl font-medium text-brand-cyan-deep leading-none tabular-nums">
            02
          </span>
          <h2 className="font-display text-2xl font-medium text-brand-navy">
            How do we get it <span className="font-display-italic">to you?</span>
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              {
                value: 'delivery',
                label: 'Home delivery',
                desc: `${getDeliveryFeeEstimate()} · fast dispatch`,
              },
              {
                value: 'pickup',
                label: 'Store pickup',
                desc: settings.pickup_address ?? 'Collect from our Accra store',
              },
            ] as const
          ).map((opt) => (
            <OptionCard
              key={opt.value}
              label={opt.label}
              desc={opt.desc}
              active={form.deliveryMethod === opt.value}
              onSelect={() => set('deliveryMethod', opt.value)}
            />
          ))}
        </div>

        {form.deliveryMethod === 'delivery' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="grid gap-5 sm:grid-cols-2 pt-2">
              <div className="sm:col-span-2">
                <Field
                  id="address"
                  label="Street address"
                  required
                  value={form.address}
                  onChange={(v) => set('address', v)}
                  autoComplete="street-address"
                  placeholder="House no. / Street"
                />
              </div>
              <Field
                id="city"
                label="City"
                required
                value={form.city}
                onChange={(v) => set('city', v)}
                autoComplete="address-level2"
                placeholder="Accra"
              />
              <Field
                id="region"
                label="Region"
                required
                value={form.region}
                onChange={(v) => set('region', v)}
                autoComplete="address-level1"
                placeholder="Greater Accra"
              />
              <Field
                id="gps"
                label="GPS address"
                optional
                value={form.gps}
                onChange={(v) => set('gps', v)}
                placeholder="GA-123-4567"
              />
              <Field
                id="notes"
                label="Delivery notes"
                optional
                value={form.notes}
                onChange={(v) => set('notes', v)}
                placeholder="Near the blue gate..."
              />
            </div>
          </motion.div>
        )}
      </section>

      {/* Payment */}
      <section className="rounded-lg bg-brand-sand/40 p-6 md:p-8 space-y-6">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-3xl font-medium text-brand-cyan-deep leading-none tabular-nums">
            03
          </span>
          <h2 className="font-display text-2xl font-medium text-brand-navy">
            Payment <span className="font-display-italic">method</span>
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              {
                value: 'paystack',
                label: 'Pay with Paystack',
                desc: 'Card · Mobile Money · USSD',
              },
              {
                value: 'manual_transfer',
                label: 'Bank / MoMo transfer',
                desc: 'Transfer and upload proof',
              },
            ] as const
          ).map((opt) => (
            <OptionCard
              key={opt.value}
              label={opt.label}
              desc={opt.desc}
              active={form.paymentMethod === opt.value}
              onSelect={() => set('paymentMethod', opt.value)}
            />
          ))}
        </div>
      </section>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
          className="rounded-md bg-brand-red/10 border border-brand-red/25 px-4 py-3 text-sm text-brand-red"
        >
          {error}
        </motion.div>
      )}

      <Button
        type="submit"
        variant="primary"
        size="xl"
        className="w-full"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <LoadingSpinner className="h-5 w-5" />
            Placing your order...
          </>
        ) : (
          'Place order'
        )}
      </Button>
    </form>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  optional?: boolean;
  placeholder?: string;
  autoComplete?: string;
}

function Field({
  id,
  label,
  value,
  onChange,
  type = 'text',
  required,
  optional,
  placeholder,
  autoComplete,
}: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="editorial-label text-brand-navy/60 flex items-center gap-1">
        {label}
        {required && <span className="text-brand-red">*</span>}
        {optional && <span className="text-brand-navy/40 normal-case tracking-normal">(optional)</span>}
      </label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        {...(autoComplete ? { autoComplete } : {})}
        {...(required ? { required: true } : {})}
      />
    </div>
  );
}

interface OptionCardProps {
  label: string;
  desc: string;
  active: boolean;
  onSelect: () => void;
}

function OptionCard({ label, desc, active, onSelect }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'relative flex gap-3 items-start text-left rounded-lg p-4 border transition-all duration-250 ease-editorial',
        active
          ? 'border-brand-navy bg-brand-ivory shadow-md'
          : 'border-brand-navy/15 bg-brand-ivory/40 hover:border-brand-navy/35 hover:bg-brand-ivory',
      )}
      aria-pressed={active}
    >
      <span
        className={cn(
          'mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors duration-200',
          active ? 'border-brand-navy bg-brand-navy text-brand-ivory' : 'border-brand-navy/30',
        )}
        aria-hidden="true"
      >
        {active && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      <div className="flex-1">
        <p className="font-medium text-[14px] text-brand-navy">{label}</p>
        <p className="text-[12px] text-brand-navy/60 mt-1 whitespace-pre-line">{desc}</p>
      </div>
    </button>
  );
}
