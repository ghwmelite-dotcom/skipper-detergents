import { motion, useReducedMotion } from 'framer-motion';
import type { BulkPricingTier } from '@skipper/shared';
import { formatCurrency } from '@skipper/shared';
import { cn } from '@/lib/cn';

interface BulkPricingTableProps {
  tiers: BulkPricingTier[];
  currentQuantity?: number;
  basePrice: number;
}

export function BulkPricingTable({
  tiers,
  currentQuantity = 0,
  basePrice,
}: BulkPricingTableProps) {
  const reduced = useReducedMotion();
  if (tiers.length === 0) return null;

  const sorted = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);

  function isActive(tier: BulkPricingTier): boolean {
    if (currentQuantity < tier.min_quantity) return false;
    if (tier.max_quantity !== null && currentQuantity > tier.max_quantity) return false;
    return true;
  }

  const firstTier = sorted[0];
  if (!firstTier) return null;

  const baseActive = currentQuantity > 0 && currentQuantity < firstTier.min_quantity;

  return (
    <div className="overflow-hidden rounded-lg border border-brand-navy/10">
      <div className="grid grid-cols-[1.1fr_1fr_1fr] px-4 py-3 bg-brand-sand/60 text-[11px] font-medium tracking-[0.18em] uppercase text-brand-navy/60">
        <span>Quantity</span>
        <span>Unit price</span>
        <span>Save</span>
      </div>
      <div className="divide-y divide-brand-navy/8 bg-brand-ivory">
        {/* Base row */}
        <Row
          label={`1 – ${firstTier.min_quantity - 1}`}
          price={basePrice}
          discount={null}
          active={baseActive}
          delay={0}
          reduced={reduced}
        />
        {sorted.map((tier, idx) => {
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
            <Row
              key={tier.id}
              label={qtyLabel}
              price={tier.unit_price}
              discount={discountPct}
              active={active}
              delay={(idx + 1) * 0.05}
              reduced={reduced}
            />
          );
        })}
      </div>
    </div>
  );
}

interface RowProps {
  label: string;
  price: number;
  discount: number | null;
  active: boolean;
  delay: number;
  reduced: boolean | null;
}

function Row({ label, price, discount, active, delay, reduced }: RowProps) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, x: -8 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1], delay }}
      className={cn(
        'relative grid grid-cols-[1.1fr_1fr_1fr] px-4 py-3.5 text-[14px] items-center transition-colors duration-200',
        active ? 'bg-brand-cyan/8' : 'hover:bg-brand-navy/[0.015]',
      )}
    >
      {active && (
        <motion.div
          layoutId="bulk-active"
          className="absolute inset-y-0 left-0 w-[3px] bg-brand-cyan"
          aria-hidden="true"
        />
      )}
      <span
        className={cn(
          'tabular-nums',
          active ? 'font-semibold text-brand-navy' : 'text-brand-navy/80',
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'tabular-nums',
          active ? 'font-semibold text-brand-navy' : 'text-brand-navy',
        )}
      >
        {formatCurrency(price)}
      </span>
      <span>
        {discount !== null && discount > 0 ? (
          <span className="inline-flex items-center rounded-full bg-brand-cyan/15 px-2 py-0.5 text-[11px] font-semibold tracking-wider uppercase text-brand-cyan-deep tabular-nums">
            {discount}% off
          </span>
        ) : (
          <span className="text-brand-navy/40">&mdash;</span>
        )}
      </span>
    </motion.div>
  );
}
