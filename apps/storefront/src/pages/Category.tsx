import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SEOHead } from '@/components/seo/SEOHead';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCategoryProducts } from '@/hooks/useCategories';
import type { Category as CategoryType, Product } from '@skipper/shared';

const PER_PAGE = 20;

export default function Category() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useCategoryProducts(slug, page, PER_PAGE);

  const rawData = data?.data;

  let category: CategoryType | undefined;
  let products: Product[] = [];
  let total = data?.meta?.total ?? 0;

  if (rawData) {
    const first = Array.isArray(rawData) ? rawData[0] : rawData;
    if (first && typeof first === 'object' && 'category' in (first as object)) {
      const typed = first as { category: CategoryType; products: Product[] };
      category = typed.category;
      products = typed.products ?? [];
      if (total === 0) total = products.length;
    } else {
      products = (rawData as unknown as Product[]) ?? [];
      total = data?.meta?.total ?? products.length;
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const catName =
    category?.name ??
    (slug
      ? slug
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
      : 'Category');

  function goToPage(p: number) {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <>
      <SEOHead
        title={category?.seo_title ?? catName}
        description={
          category?.seo_description ?? category?.description ?? `Shop ${catName} from Skipper Detergents.`
        }
      />
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Shop', href: '/shop' },
          { label: catName },
        ]}
      />

      <div className="container py-8 space-y-8">
        <div className="space-y-2">
          {isLoading && !category ? (
            <>
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-5 w-96" />
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-primary">{catName}</h1>
              {category?.description && (
                <p className="text-muted-foreground max-w-2xl">{category.description}</p>
              )}
              <p className="text-sm text-muted-foreground">
                {isLoading ? '...' : `${total} product${total !== 1 ? 's' : ''}`}
              </p>
            </>
          )}
        </div>

        {isError ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">Failed to load products. Please try again.</p>
          </div>
        ) : (
          <ProductGrid products={products} loading={isLoading} skeletonCount={PER_PAGE} />
        )}

        {totalPages > 1 && (
          <nav className="flex items-center justify-center gap-2 py-4" aria-label="Pagination">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <span className="text-sm text-muted-foreground px-3">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </nav>
        )}
      </div>
    </>
  );
}
