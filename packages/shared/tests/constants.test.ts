import { describe, it, expect } from 'vitest';
import {
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  DELIVERY_METHODS,
  CURRENCY,
  ADMIN_ROLES,
} from '../src/constants';

describe('constants', () => {
  it('ORDER_STATUSES contains the full v1 lifecycle', () => {
    expect(ORDER_STATUSES).toEqual([
      'pending',
      'confirmed',
      'processing',
      'shipped',
      'delivered',
      'completed',
      'cancelled',
      'refunded',
    ]);
  });

  it('PAYMENT_METHODS contains paystack and manual_transfer', () => {
    expect(PAYMENT_METHODS).toEqual(['paystack', 'manual_transfer']);
  });

  it('PAYMENT_STATUSES contains the full state set', () => {
    expect(PAYMENT_STATUSES).toEqual(['unpaid', 'paid', 'refunded']);
  });

  it('DELIVERY_METHODS contains pickup and delivery', () => {
    expect(DELIVERY_METHODS).toEqual(['pickup', 'delivery']);
  });

  it('CURRENCY is GHS', () => {
    expect(CURRENCY).toBe('GHS');
  });

  it('ADMIN_ROLES contains super_admin, admin, and store_manager', () => {
    expect(ADMIN_ROLES).toEqual(['super_admin', 'admin', 'store_manager']);
  });
});
