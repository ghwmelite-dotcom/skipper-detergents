import { describe, it, expect } from 'vitest';
import {
  createOrderSchema,
  cartItemSchema,
  adminLoginSchema,
  productCreateSchema,
  productListQuerySchema,
  productSearchQuerySchema,
} from '../src/schemas';

describe('createOrderSchema', () => {
  const validOrder = {
    items: [{ product_id: 'abc123', quantity: 2 }],
    delivery_method: 'delivery' as const,
    delivery_name: 'Ama Owusu',
    delivery_email: 'ama@example.com',
    delivery_phone: '+233241234567',
    delivery_address: '14 Independence Ave',
    delivery_city: 'Accra',
    delivery_region: 'Greater Accra',
    payment_method: 'paystack' as const,
  };

  it('accepts a valid paystack delivery order', () => {
    expect(() => createOrderSchema.parse(validOrder)).not.toThrow();
  });

  it('requires at least one item', () => {
    expect(() => createOrderSchema.parse({ ...validOrder, items: [] })).toThrow();
  });

  it('requires delivery_address when delivery_method is delivery', () => {
    expect(() => createOrderSchema.parse({ ...validOrder, delivery_address: undefined })).toThrow();
  });

  it('does not require delivery_address for pickup', () => {
    const pickup = {
      ...validOrder,
      delivery_method: 'pickup' as const,
      delivery_address: undefined,
      delivery_city: undefined,
      delivery_region: undefined,
    };
    expect(() => createOrderSchema.parse(pickup)).not.toThrow();
  });

  it('rejects invalid email format', () => {
    expect(() =>
      createOrderSchema.parse({ ...validOrder, delivery_email: 'not-an-email' }),
    ).toThrow();
  });

  it('rejects non-positive quantity', () => {
    expect(() =>
      createOrderSchema.parse({
        ...validOrder,
        items: [{ product_id: 'abc123', quantity: 0 }],
      }),
    ).toThrow();
  });
});

describe('cartItemSchema', () => {
  it('accepts a valid cart item', () => {
    expect(() => cartItemSchema.parse({ product_id: 'x', quantity: 1 })).not.toThrow();
  });

  it('accepts optional variant_id', () => {
    expect(() =>
      cartItemSchema.parse({ product_id: 'x', variant_id: 'v', quantity: 1 }),
    ).not.toThrow();
  });
});

describe('adminLoginSchema', () => {
  it('accepts valid credentials', () => {
    expect(() => adminLoginSchema.parse({ email: 'a@b.com', password: 'hunter2xx' })).not.toThrow();
  });

  it('rejects password shorter than 8 chars', () => {
    expect(() => adminLoginSchema.parse({ email: 'a@b.com', password: 'short' })).toThrow();
  });
});

describe('productCreateSchema', () => {
  const validProduct = {
    name: 'Skipper Liquid Detergent',
    slug: 'skipper-liquid-detergent',
    description: 'A fresh clean for daily laundry.',
    category_id: 'cat123',
    unit_price: 45,
    stock_quantity: 100,
  };

  it('accepts a minimal valid product', () => {
    expect(() => productCreateSchema.parse(validProduct)).not.toThrow();
  });

  it('rejects negative price', () => {
    expect(() => productCreateSchema.parse({ ...validProduct, unit_price: -1 })).toThrow();
  });

  it('requires a slug', () => {
    expect(() => productCreateSchema.parse({ ...validProduct, slug: '' })).toThrow();
  });
});

describe('productListQuerySchema', () => {
  it('accepts an empty query (all defaults)', () => {
    const parsed = productListQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.per_page).toBe(20);
    expect(parsed.sort).toBe('newest');
  });

  it('coerces string query params to numbers', () => {
    const parsed = productListQuerySchema.parse({ page: '2', per_page: '30' });
    expect(parsed.page).toBe(2);
    expect(parsed.per_page).toBe(30);
  });

  it('rejects per_page above max', () => {
    expect(() => productListQuerySchema.parse({ per_page: '500' })).toThrow();
  });

  it('rejects unknown sort values', () => {
    expect(() => productListQuerySchema.parse({ sort: 'trending' })).toThrow();
  });

  it('accepts filter fields', () => {
    const parsed = productListQuerySchema.parse({
      category: 'detergents-laundry',
      brand: 'Skipper',
      bulk_only: 'true',
      min_price: '10',
      max_price: '100',
    });
    expect(parsed.category).toBe('detergents-laundry');
    expect(parsed.brand).toBe('Skipper');
    expect(parsed.bulk_only).toBe(true);
    expect(parsed.min_price).toBe(10);
    expect(parsed.max_price).toBe(100);
  });
});

describe('productSearchQuerySchema', () => {
  it('requires q with at least 2 chars', () => {
    expect(() => productSearchQuerySchema.parse({ q: '' })).toThrow();
    expect(() => productSearchQuerySchema.parse({ q: 'a' })).toThrow();
    expect(() => productSearchQuerySchema.parse({ q: 'ab' })).not.toThrow();
  });

  it('caps q at 100 chars', () => {
    const long = 'a'.repeat(101);
    expect(() => productSearchQuerySchema.parse({ q: long })).toThrow();
  });

  it('defaults limit to 20, max 50', () => {
    expect(productSearchQuerySchema.parse({ q: 'omo' }).limit).toBe(20);
    expect(() => productSearchQuerySchema.parse({ q: 'omo', limit: '200' })).toThrow();
  });
});
