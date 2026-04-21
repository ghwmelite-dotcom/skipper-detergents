import { describe, it, expect } from 'vitest';
import { formatCurrency, slugify, generateOrderNumber, resolveBulkPrice } from '../src/utils';
import type { BulkPricingTier } from '../src/types';

describe('formatCurrency', () => {
  it('formats whole numbers with 2 decimal places', () => {
    expect(formatCurrency(45)).toBe('GHS 45.00');
  });

  it('formats fractional values', () => {
    expect(formatCurrency(12.5)).toBe('GHS 12.50');
  });

  it('separates thousands', () => {
    expect(formatCurrency(1234.5)).toBe('GHS 1,234.50');
  });

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('GHS 0.00');
  });
});

describe('slugify', () => {
  it('lowercases and replaces spaces', () => {
    expect(slugify('Skipper Liquid Detergent')).toBe('skipper-liquid-detergent');
  });

  it('strips punctuation', () => {
    expect(slugify('Bounty 6-Roll (Kitchen)')).toBe('bounty-6-roll-kitchen');
  });

  it('collapses repeated hyphens', () => {
    expect(slugify('a  --  b')).toBe('a-b');
  });

  it('trims leading/trailing hyphens', () => {
    expect(slugify('  hello  ')).toBe('hello');
  });

  it('handles non-ascii by stripping', () => {
    expect(slugify('Café Crème')).toBe('caf-crme');
  });
});

describe('generateOrderNumber', () => {
  it('uses SK prefix and includes the date', () => {
    const now = new Date('2026-04-21T10:00:00Z');
    const n = generateOrderNumber(now, 7);
    expect(n).toBe('SK-20260421-0007');
  });

  it('zero-pads the sequence to 4 digits', () => {
    const now = new Date('2026-04-21T10:00:00Z');
    expect(generateOrderNumber(now, 1)).toBe('SK-20260421-0001');
    expect(generateOrderNumber(now, 12)).toBe('SK-20260421-0012');
    expect(generateOrderNumber(now, 1234)).toBe('SK-20260421-1234');
  });
});

describe('resolveBulkPrice', () => {
  const tiers: BulkPricingTier[] = [
    {
      id: 't1',
      product_id: 'p1',
      min_quantity: 10,
      max_quantity: 49,
      unit_price: 38,
      discount_percent: 15,
      label: 'Bulk',
      created_at: '',
    },
    {
      id: 't2',
      product_id: 'p1',
      min_quantity: 50,
      max_quantity: null,
      unit_price: 30,
      discount_percent: 33,
      label: 'Wholesale',
      created_at: '',
    },
  ];

  it('returns base price when no tier matches', () => {
    expect(resolveBulkPrice(5, 45, tiers)).toEqual({ unit_price: 45, tier: null });
  });

  it('returns tier price when quantity falls inside a bounded tier', () => {
    expect(resolveBulkPrice(20, 45, tiers)).toEqual({ unit_price: 38, tier: tiers[0] });
  });

  it('returns the unbounded tier when quantity exceeds all max_quantity', () => {
    expect(resolveBulkPrice(100, 45, tiers)).toEqual({ unit_price: 30, tier: tiers[1] });
  });

  it('returns base price when tier list is empty', () => {
    expect(resolveBulkPrice(100, 45, [])).toEqual({ unit_price: 45, tier: null });
  });

  it('respects the lower bound of the first tier', () => {
    expect(resolveBulkPrice(10, 45, tiers)).toEqual({ unit_price: 38, tier: tiers[0] });
  });
});
