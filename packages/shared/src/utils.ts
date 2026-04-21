import type { BulkPricingTier } from './types';
import { CURRENCY } from './constants';

export function formatCurrency(amount: number): string {
  const formatted = new Intl.NumberFormat('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${CURRENCY} ${formatted}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateOrderNumber(date: Date, sequence: number): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const seq = String(sequence).padStart(4, '0');
  return `SK-${y}${m}${d}-${seq}`;
}

export interface ResolvedBulkPrice {
  unit_price: number;
  tier: BulkPricingTier | null;
}

export function resolveBulkPrice(
  quantity: number,
  basePrice: number,
  tiers: BulkPricingTier[],
): ResolvedBulkPrice {
  const sorted = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);
  for (const tier of sorted) {
    const withinLower = quantity >= tier.min_quantity;
    const withinUpper = tier.max_quantity === null || quantity <= tier.max_quantity;
    if (withinLower && withinUpper) {
      return { unit_price: tier.unit_price, tier };
    }
  }
  return { unit_price: basePrice, tier: null };
}
