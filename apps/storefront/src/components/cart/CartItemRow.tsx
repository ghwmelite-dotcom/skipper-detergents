import { Trash2 } from 'lucide-react';
import type { Product } from '@skipper/shared';
import { formatCurrency } from '@skipper/shared';
import type { CartItem } from '@/stores/cartStore';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { QuantityInput } from '@/components/product/QuantityInput';

const PLACEHOLDER = 'https://placehold.co/80x80/e2e8f0/64748b?text=P';

interface CartItemRowProps {
  item: CartItem;
  product: Product;
}

export function CartItemRow({ item, product }: CartItemRowProps) {
  const { updateQuantity, removeItem } = useCart();
  const variantId = item.variant_id ?? null;

  const lineTotal = product.unit_price * item.quantity;

  return (
    <div className="flex gap-4 py-4 border-b border-border last:border-0">
      {/* Image */}
      <div className="h-16 w-16 flex-none overflow-hidden rounded-md border border-border bg-muted/20">
        <img
          src={PLACEHOLDER}
          alt={product.name}
          className="h-full w-full object-contain"
          loading="lazy"
        />
      </div>

      {/* Details */}
      <div className="flex flex-1 flex-col gap-2 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium leading-snug line-clamp-2">{product.name}</p>
            {item.variant_id && (
              <p className="text-xs text-muted-foreground mt-0.5">Variant selected</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removeItem(product.id, variantId)}
            aria-label={`Remove ${product.name} from cart`}
            className="h-8 w-8 flex-none text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="flex items-center justify-between gap-4">
          <QuantityInput
            value={item.quantity}
            onChange={(qty) => updateQuantity(product.id, variantId, qty)}
            min={1}
            max={product.stock_quantity}
            className="scale-90 origin-left"
          />
          <span className="text-sm font-semibold shrink-0">{formatCurrency(lineTotal)}</span>
        </div>
      </div>
    </div>
  );
}
