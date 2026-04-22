import { useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle, Package, MapPin, ArrowRight } from 'lucide-react';
import { SEOHead } from '@/components/seo/SEOHead';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';

export default function OrderConfirmation() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference');
  const { clear } = useCart();

  useEffect(() => {
    clear();
  }, []);

  return (
    <>
      <SEOHead title={`Order ${orderNumber ?? ''} Confirmed`} noindex />

      <div className="container py-16 max-w-2xl mx-auto text-center space-y-8">
        {/* Success icon */}
        <div className="flex items-center justify-center">
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-600" aria-hidden="true" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Thank You!</h1>
          <p className="text-muted-foreground text-lg">
            Your order has been placed successfully.
          </p>
        </div>

        {/* Order details card */}
        <div className="rounded-xl border border-border p-6 text-left space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <Package className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <p className="text-sm text-muted-foreground">Order Number</p>
              <p className="font-bold text-lg tracking-wide">{orderNumber}</p>
            </div>
          </div>

          {reference && (
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" aria-hidden="true" />
              <div>
                <p className="text-sm text-muted-foreground">Payment Reference</p>
                <p className="font-medium text-sm font-mono">{reference}</p>
              </div>
            </div>
          )}

          <div className="text-sm text-muted-foreground leading-relaxed">
            <p>
              We've received your order and will begin processing it shortly. You'll receive
              updates via the phone number provided at checkout.
            </p>
          </div>
        </div>

        {/* Next steps */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            to={`/track/${orderNumber}`}
            className="flex items-center justify-center gap-2 rounded-lg border border-border p-4 hover:bg-accent transition-colors text-sm font-medium"
          >
            <MapPin className="h-4 w-4" aria-hidden="true" />
            Track this order
          </Link>
          <Link
            to="/shop"
            className="flex items-center justify-center gap-2 rounded-lg border border-border p-4 hover:bg-accent transition-colors text-sm font-medium"
          >
            Continue shopping
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <Link to="/">
          <Button variant="primary" size="lg">Back to home</Button>
        </Link>
      </div>
    </>
  );
}
