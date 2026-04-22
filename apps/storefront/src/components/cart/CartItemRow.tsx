import { X } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import type { Product } from '@skipper/shared';
import { formatCurrency } from '@skipper/shared';
import type { CartItem } from '@/stores/cartStore';
import { useCart } from '@/hooks/useCart';
import { QuantityInput } from '@/components/product/QuantityInput';
import { ProductIllustration, shouldUseRealImage } from '@/lib/productIllustration';

interface CartItemRowProps {
  item: CartItem;
  product: Product & { images?: { url: string }[] };
  compact?: boolean;
}

export function CartItemRow({ item, product, compact = false }: CartItemRowProps) {
  const { updateQuantity, removeItem } = useCart();
  const reduced = useReducedMotion();
  const variantId = item.variant_id ?? null;

  const lineTotal = product.unit_price * item.quantity;
  const primaryUrl = product.images?.[0]?.url;
  const useRealImage = shouldUseRealImage(primaryUrl);

  return (
    <motion.div
      layout
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, x: 40, transition: { duration: 0.3 } }}
      transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
      className="flex gap-4 py-5 border-b border-brand-navy/8 last:border-0"
    >
      <div
        className={`${
          compact ? 'h-16 w-16' : 'h-24 w-24'
        } flex-none overflow-hidden rounded-md bg-brand-sand/60 ring-1 ring-brand-navy/10`}
      >
        {useRealImage && primaryUrl ? (
          <img
            src={primaryUrl}
            alt={product.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <ProductIllustration
            product={product}
            className="h-full w-full"
            hideLabel={compact}
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 min-w-0 justify-between">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            {product.brand && !compact && (
              <p className="editorial-label text-brand-cyan-deep">{product.brand}</p>
            )}
            <p className="font-display text-[17px] leading-tight text-brand-navy line-clamp-2 font-medium">
              {product.name}
            </p>
            {item.variant_id && (
              <p className="text-xs text-brand-navy/55 mt-1">Variant selected</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => removeItem(product.id, variantId)}
            aria-label={`Remove ${product.name} from cart`}
            className="flex-none inline-flex h-7 w-7 items-center justify-center rounded-full text-brand-navy/50 hover:bg-brand-navy/5 hover:text-brand-red transition-colors"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <QuantityInput
            value={item.quantity}
            onChange={(qty) => updateQuantity(product.id, variantId, qty)}
            min={1}
            max={product.stock_quantity}
            className="scale-[0.92] origin-left"
          />
          <div className="text-right">
            <p className="text-[15px] font-semibold text-brand-navy tabular-nums">
              {formatCurrency(lineTotal)}
            </p>
            {item.quantity > 1 && (
              <p className="text-[11px] text-brand-navy/50 tabular-nums">
                {formatCurrency(product.unit_price)} each
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
