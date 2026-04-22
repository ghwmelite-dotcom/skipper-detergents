import type { BulkPricingTier } from '@skipper/shared';
import { formatCurrency } from '@skipper/shared';
import { cn } from '@/lib/cn';

interface BulkPricingTableProps {
  tiers: BulkPricingTier[];
  currentQuantity?: number;
  basePrice: number;
}

export function BulkPricingTable({ tiers, currentQuantity = 0, basePrice }: BulkPricingTableProps) {
  if (tiers.length === 0) return null;

  const sorted = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);

  function isActive(tier: BulkPricingTier): boolean {
    if (currentQuantity < tier.min_quantity) return false;
    if (tier.max_quantity !== null && currentQuantity > tier.max_quantity) return false;
    return true;
  }

  const firstTier = sorted[0];
  if (!firstTier) return null;

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="bg-muted/50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Bulk Pricing
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="py-2 px-4 text-left font-medium text-muted-foreground">Qty</th>
            <th className="py-2 px-4 text-left font-medium text-muted-foreground">Unit Price</th>
            <th className="py-2 px-4 text-left font-medium text-muted-foreground">Discount</th>
          </tr>
        </thead>
        <tbody>
          {/* Base price row */}
          <tr
            className={cn(
              'border-b border-border last:border-0 transition-colors',
              currentQuantity > 0 && currentQuantity < firstTier.min_quantity
                ? 'bg-secondary/10 font-medium'
                : '',
            )}
          >
            <td className="py-2.5 px-4 text-muted-foreground">
              1 – {firstTier.min_quantity - 1}
            </td>
            <td className="py-2.5 px-4">{formatCurrency(basePrice)}</td>
            <td className="py-2.5 px-4 text-muted-foreground">—</td>
          </tr>
          {sorted.map((tier) => {
            const active = isActive(tier);
            const qtyLabel =
              tier.max_quantity === null
                ? `${tier.min_quantity}+`
                : `${tier.min_quantity} – ${tier.max_quantity}`;
            const discountPct =
              tier.discount_percent !== null
                ? tier.discount_percent
                : basePrice > 0
                  ? Math.round(((basePrice - tier.unit_price) / basePrice) * 100)
                  : null;

            return (
              <tr
                key={tier.id}
                className={cn(
                  'border-b border-border last:border-0 transition-colors',
                  active ? 'bg-secondary/10 font-semibold' : '',
                )}
              >
                <td className="py-2.5 px-4">
                  <span className={active ? 'text-secondary' : ''}>{qtyLabel}</span>
                  {active && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-secondary/20 px-1.5 py-0.5 text-xs font-medium text-secondary">
                      Active
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-4">{formatCurrency(tier.unit_price)}</td>
                <td className="py-2.5 px-4">
                  {discountPct !== null && discountPct > 0 ? (
                    <span className="text-green-600 font-medium">{discountPct}% off</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
