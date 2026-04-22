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
    (slug ? slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Category');

  function goToPage(p: number) {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <>
      <SEOHead
        title={category?.seo_title ?? catName}
        description={
          category?.seo_description ??
          category?.description ??
          `Shop ${catName} from Skipper Detergents.`
        }
      />
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Shop', href: '/shop' },
          { label: catName },
        ]}
      />

      <header className="container pt-8 pb-10 md:pt-12 md:pb-14">
        {isLoading && !category ? (
          <div className="space-y-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-14 w-96 rounded-sm" />
            <Skeleton className="h-5 w-full max-w-xl" />
          </div>
        ) : (
          <div className="max-w-3xl space-y-5">
            <div className="flex items-center gap-3">
              <span className="accent-line" aria-hidden="true" />
              <span className="editorial-label text-brand-cyan-deep">Category</span>
            </div>
            <h1 className="font-display text-display-md text-brand-navy">
              <span className="font-display-italic">{catName}.</span>
            </h1>
            {category?.description && (
              <p className="max-w-[60ch] text-[17px] text-brand-navy/65 leading-relaxed font-light">
                {category.description}
              </p>
            )}
            <p className="text-sm text-brand-navy/55 tabular-nums">
              {isLoading ? 'Loading...' : `${total} product${total !== 1 ? 's' : ''}`}
            </p>
          </div>
        )}
      </header>

      <div className="container pb-20">
        {isError ? (
          <div className="py-16 text-center">
            <p className="font-display-italic text-xl text-brand-navy">
              Failed to load products. Please try again.
            </p>
          </div>
        ) : (
          <ProductGrid
            products={products}
            loading={isLoading}
            skeletonCount={PER_PAGE}
            columns={4}
          />
        )}

        {totalPages > 1 && (
          <nav
            className="flex items-center justify-center gap-4 pt-16"
            aria-label="Pagination"
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
              className="gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Prev
            </Button>
            <span className="font-display text-sm text-brand-navy tabular-nums">
              Page <span className="font-display-italic">{page}</span> of{' '}
              <span className="font-display-italic">{totalPages}</span>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              aria-label="Next page"
              className="gap-1.5"
            >
              Next
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </nav>
        )}
      </div>
    </>
  );
}
