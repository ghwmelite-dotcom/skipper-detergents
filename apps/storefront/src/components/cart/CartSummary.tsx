import type { Product } from '@skipper/shared';
import { formatCurrency } from '@skipper/shared';
import type { CartItem } from '@/stores/cartStore';

interface CartSummaryProps {
  items: CartItem[];
  products: Product[];
  deliveryFee?: number | null;
}

export function CartSummary({ items, products, deliveryFee = null }: CartSummaryProps) {
  const productMap = new Map(products.map((p) => [p.id, p]));

  const subtotal = items.reduce((sum, item) => {
    const product = productMap.get(item.product_id);
    return sum + (product?.unit_price ?? 0) * item.quantity;
  }, 0);

  const total = subtotal + (deliveryFee ?? 0);

  return (
    <div className="space-y-3 rounded-lg border border-border p-4 bg-muted/20">
      <h2 className="font-semibold text-base">Order Summary</h2>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Delivery</span>
          <span className="font-medium">
            {deliveryFee === null ? (
              <span className="text-muted-foreground italic">Calculated at checkout</span>
            ) : deliveryFee === 0 ? (
              <span className="text-green-600">Free</span>
            ) : (
              formatCurrency(deliveryFee)
            )}
          </span>
        </div>
        <div className="border-t border-border pt-2 flex justify-between font-semibold text-base">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}
