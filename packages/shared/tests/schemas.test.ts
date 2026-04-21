import { describe, it, expect } from 'vitest';
import {
  createOrderSchema,
  cartItemSchema,
  adminLoginSchema,
  productCreateSchema,
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
    expect(() =>
      createOrderSchema.parse({ ...validOrder, delivery_address: undefined }),
    ).toThrow();
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
    expect(() =>
      adminLoginSchema.parse({ email: 'a@b.com', password: 'hunter2xx' }),
    ).not.toThrow();
  });

  it('rejects password shorter than 8 chars', () => {
    expect(() =>
      adminLoginSchema.parse({ email: 'a@b.com', password: 'short' }),
    ).toThrow();
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
    expect(() =>
      productCreateSchema.parse({ ...validProduct, unit_price: -1 }),
    ).toThrow();
  });

  it('requires a slug', () => {
    expect(() => productCreateSchema.parse({ ...validProduct, slug: '' })).toThrow();
  });
});
