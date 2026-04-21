import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, ApiError } from '../../src/lib/api';

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('api.get', () => {
  it('returns data from a successful envelope', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { id: 'x' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const result = await api.get<{ id: string }>('/api/products/x');
    expect(result).toEqual({ id: 'x' });
  });

  it('returns meta on a paginated envelope', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: [{ id: 'a' }],
          meta: { page: 1, per_page: 20, total: 1 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const result = await api.getPaginated<{ id: string }>('/api/products');
    expect(result.data).toEqual([{ id: 'a' }]);
    expect(result.meta).toEqual({ page: 1, per_page: 20, total: 1 });
  });

  it('throws ApiError when envelope success is false', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Product not found' },
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    await expect(api.get('/api/products/nope')).rejects.toThrow(ApiError);
    await expect(api.get('/api/products/nope')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
  });

  it('throws ApiError on non-JSON 500', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Bad', { status: 500 }));
    await expect(api.get('/api/products')).rejects.toThrow(ApiError);
  });
});

describe('api.post', () => {
  it('sends JSON body and returns data', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { order_id: 'o1' } }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const result = await api.post<{ order_id: string }>('/api/orders', { items: [] });
    expect(result).toEqual({ order_id: 'o1' });
    const init = fetchSpy.mock.calls[0]![1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(init.body).toBe(JSON.stringify({ items: [] }));
  });
});
