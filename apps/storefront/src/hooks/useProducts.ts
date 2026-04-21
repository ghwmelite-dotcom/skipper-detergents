import { useQuery } from '@tanstack/react-query';
import type { Product, ProductWithRelations, ProductListQuery } from '@skipper/shared';
import { api } from '@/lib/api';

export function useProducts(query: Partial<ProductListQuery> = {}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  }
  return useQuery({
    queryKey: ['products', 'list', query],
    queryFn: () =>
      api.getPaginated<Product>(`/api/products${params.toString() ? `?${params}` : ''}`),
  });
}

export function useFeaturedProducts(limit = 12) {
  return useQuery({
    queryKey: ['products', 'featured', limit],
    queryFn: () => api.get<Product[]>(`/api/products/featured?limit=${limit}`),
  });
}

export function useProduct(slug: string | undefined) {
  return useQuery({
    queryKey: ['products', 'bySlug', slug],
    enabled: Boolean(slug),
    queryFn: () => api.get<ProductWithRelations>(`/api/products/${slug}`),
  });
}

export function useProductSearch(q: string, limit = 20) {
  return useQuery({
    queryKey: ['products', 'search', q, limit],
    enabled: q.trim().length >= 2,
    queryFn: () =>
      api.get<Product[]>(`/api/products/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  });
}
