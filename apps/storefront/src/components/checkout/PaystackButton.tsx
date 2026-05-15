import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useCart } from '@/hooks/useCart';

interface PaystackButtonProps {
  orderId: string;
  orderNumber: string;
  email: string;
  publicKey: string;
}

interface PaystackInitResult {
  access_code: string;
  authorization_url: string;
  reference: string;
}

export function PaystackButton({ orderId, orderNumber, email, publicKey }: PaystackButtonProps) {
  const navigate = useNavigate();
  const { clear } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    if (!publicKey) {
      setError(
        'Online payment is not configured yet. Please use Bank/MoMo transfer, or contact the store to complete payment.',
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await api.post<PaystackInitResult>('/api/payments/paystack/init', {
        order_id: orderId,
      });

      // Dynamically import Paystack inline JS
      const PaystackPop = (await import('@paystack/inline-js')).default;
      const popup = new PaystackPop();

      popup.newTransaction({
        key: publicKey,
        email,
        reference: result.reference,
        accessCode: result.access_code,
        onSuccess: () => {
          setLoading(false);
          clear();
          navigate(`/order/${orderNumber}?reference=${result.reference}`);
        },
        onCancel: () => {
          alert('Payment cancelled. You can try again from your order page.');
          setLoading(false);
        },
        // onClose fires whenever the iframe closes, including the user
        // closing the X. Without it, neither onSuccess nor onCancel may
        // fire in some browsers and the Pay button stays disabled forever.
        onClose: () => {
          setLoading(false);
        },
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Could not initialise payment. Please try again.');
      }
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-brand-sand/50 p-5 space-y-2">
        <p className="editorial-label text-brand-cyan-deep">Secure checkout</p>
        <p className="text-sm text-brand-navy/75 leading-relaxed">
          You&rsquo;ll complete payment via Paystack — card, Mobile Money, or USSD. We never see
          or store your card details.
        </p>
      </div>
      <Button
        variant="primary"
        size="xl"
        className="w-full"
        onClick={handlePay}
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? (
          <>
            <LoadingSpinner className="h-5 w-5" />
            Launching payment...
          </>
        ) : (
          'Pay with Paystack'
        )}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-brand-red text-center">
          {error}
        </p>
      )}
    </div>
  );
}
