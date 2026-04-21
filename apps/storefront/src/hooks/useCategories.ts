import { useQuery } from '@tanstack/react-query';
import type { Category, Product } from '@skipper/shared';
import { api } from '@/lib/api';

export interface CategoryWithCount extends Category {
  product_count: number;
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories', 'list'],
    queryFn: () => api.get<CategoryWithCount[]>('/api/categories'),
  });
}

export function useCategoryProducts(slug: string | undefined, page = 1, per_page = 20) {
  return useQuery({
    queryKey: ['categories', 'products', slug, page, per_page],
    enabled: Boolean(slug),
    queryFn: () =>
      api.getPaginated<{ category: Category; products: Product[] } | unknown>(
        `/api/categories/${slug}/products?page=${page}&per_page=${per_page}`,
      ),
  });
}
