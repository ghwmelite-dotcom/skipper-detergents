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
    <div className="rounded-lg border border-brand-navy/10 bg-brand-ivory p-6 space-y-5">
      <div>
        <span className="editorial-label text-brand-cyan-deep">Order summary</span>
      </div>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-brand-navy/65">Subtotal</span>
          <span className="font-medium text-brand-navy tabular-nums">
            {formatCurrency(subtotal)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-brand-navy/65">Delivery</span>
          <span className="font-medium tabular-nums">
            {deliveryFee === null ? (
              <span className="text-brand-navy/50 italic">Calculated at checkout</span>
            ) : deliveryFee === 0 ? (
              <span className="text-emerald-600">Free</span>
            ) : (
              <span className="text-brand-navy">{formatCurrency(deliveryFee)}</span>
            )}
          </span>
        </div>
      </div>
      <div className="pt-4 border-t border-brand-navy/10">
        <div className="flex justify-between items-baseline">
          <span className="text-sm text-brand-navy/60 tracking-wide uppercase font-medium">
            Total
          </span>
          <span className="font-display text-[34px] leading-none font-medium text-brand-navy tabular-nums">
            {formatCurrency(total)}
          </span>
        </div>
      </div>
    </div>
  );
}
