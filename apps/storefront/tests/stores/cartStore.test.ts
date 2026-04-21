import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '../../src/stores/cartStore';

beforeEach(() => {
  useCartStore.setState({ items: [] });
});

describe('cartStore', () => {
  it('starts empty', () => {
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().totalQuantity()).toBe(0);
  });

  it('addItem adds a new line', () => {
    useCartStore.getState().addItem({ product_id: 'p1', quantity: 2 });
    expect(useCartStore.getState().items).toEqual([{ product_id: 'p1', quantity: 2 }]);
    expect(useCartStore.getState().totalQuantity()).toBe(2);
  });

  it('addItem increments quantity when the same product is added again', () => {
    useCartStore.getState().addItem({ product_id: 'p1', quantity: 2 });
    useCartStore.getState().addItem({ product_id: 'p1', quantity: 3 });
    expect(useCartStore.getState().items).toEqual([{ product_id: 'p1', quantity: 5 }]);
  });

  it('distinguishes variants on the same product', () => {
    useCartStore.getState().addItem({ product_id: 'p1', variant_id: 'v1', quantity: 1 });
    useCartStore.getState().addItem({ product_id: 'p1', variant_id: 'v2', quantity: 1 });
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it('updateQuantity replaces the quantity', () => {
    useCartStore.getState().addItem({ product_id: 'p1', quantity: 1 });
    useCartStore.getState().updateQuantity('p1', null, 7);
    expect(useCartStore.getState().items[0]?.quantity).toBe(7);
  });

  it('updateQuantity to 0 removes the item', () => {
    useCartStore.getState().addItem({ product_id: 'p1', quantity: 3 });
    useCartStore.getState().updateQuantity('p1', null, 0);
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('removeItem drops a line', () => {
    useCartStore.getState().addItem({ product_id: 'p1', quantity: 1 });
    useCartStore.getState().addItem({ product_id: 'p2', quantity: 1 });
    useCartStore.getState().removeItem('p1', null);
    expect(useCartStore.getState().items).toEqual([{ product_id: 'p2', quantity: 1 }]);
  });

  it('clear empties everything', () => {
    useCartStore.getState().addItem({ product_id: 'p1', quantity: 1 });
    useCartStore.getState().clear();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('totalQuantity sums all lines', () => {
    useCartStore.getState().addItem({ product_id: 'p1', quantity: 2 });
    useCartStore.getState().addItem({ product_id: 'p2', quantity: 3 });
    expect(useCartStore.getState().totalQuantity()).toBe(5);
  });
});
