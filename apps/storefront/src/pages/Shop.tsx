import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { SEOHead } from '@/components/seo/SEOHead';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name_asc', label: 'Name A-Z' },
  { value: 'popular', label: 'Most Popular' },
] as const;

const PER_PAGE = 20;

export default function Shop() {
  const [params, setParams] = useSearchParams();

  const page = parseInt(params.get('page') ?? '1', 10);
  const sort = (params.get('sort') ?? 'newest') as 'newest' | 'price_asc' | 'price_desc' | 'name_asc' | 'popular';
  const category = params.get('category') ?? undefined;
  const brand = params.get('brand') ?? undefined;
  const bulkOnly = params.get('bulk_only') === 'true';
  const minPrice = params.get('min_price') ? Number(params.get('min_price')) : undefined;
  const maxPrice = params.get('max_price') ? Number(params.get('max_price')) : undefined;

  const { data: productsData, isLoading } = useProducts({
    page,
    per_page: PER_PAGE,
    sort,
    ...(category ? { category } : {}),
    ...(brand ? { brand } : {}),
    ...(bulkOnly ? { bulk_only: true } : {}),
    ...(minPrice !== undefined ? { min_price: minPrice } : {}),
    ...(maxPrice !== undefined ? { max_price: maxPrice } : {}),
  });

  const { data: categories } = useCategories();

  const products = productsData?.data ?? [];
  const total = productsData?.meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  function updateParam(key: string, value: string | undefined) {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === undefined || value === '') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      next.delete('page');
      return next;
    });
  }

  function goToPage(p: number) {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(p));
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <>
      <SEOHead
        title="Shop All Products"
        description="Browse Skipper Detergents' full range — detergents, tissue, bathroom accessories, and more."
      />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Shop' }]} />

      <div className="container py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-primary">Shop All Products</h1>
          <p className="text-muted-foreground mt-1">
            {isLoading ? 'Loading...' : `${total} product${total !== 1 ? 's' : ''} found`}
          </p>
        </div>

        <div className="flex gap-8">
          {/* Sidebar filters */}
          <aside className="hidden md:flex flex-col gap-6 w-56 flex-none">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Category
              </h3>
              <div className="space-y-1">
                <button
                  onClick={() => updateParam('category', undefined)}
                  className={`block w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors ${
                    !category ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                  }`}
                >
                  All categories
                </button>
                {(categories ?? [])
                  .filter((c) => c.is_active)
                  .map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => updateParam('category', cat.slug)}
                      className={`block w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors ${
                        category === cat.slug
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Brand
              </h3>
              <Input
                type="text"
                placeholder="Search brand..."
                value={brand ?? ''}
                onChange={(e) => updateParam('brand', e.target.value || undefined)}
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Price (GHS)
              </h3>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  placeholder="Min"
                  min={0}
                  value={minPrice ?? ''}
                  onChange={(e) => updateParam('min_price', e.target.value || undefined)}
                  className="w-full"
                />
                <span className="text-muted-foreground text-sm flex-none">—</span>
                <Input
                  type="number"
                  placeholder="Max"
                  min={0}
                  value={maxPrice ?? ''}
                  onChange={(e) => updateParam('max_price', e.target.value || undefined)}
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bulkOnly}
                  onChange={(e) => updateParam('bulk_only', e.target.checked ? 'true' : undefined)}
                  className="h-4 w-4 rounded accent-primary"
                />
                <span className="text-sm font-medium">Bulk pricing only</span>
              </label>
            </div>

            {(category || brand || bulkOnly || minPrice !== undefined || maxPrice !== undefined) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setParams(new URLSearchParams())}
              >
                Clear all filters
              </Button>
            )}
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Top bar */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 ml-auto">
                <label htmlFor="sort" className="text-sm text-muted-foreground whitespace-nowrap">
                  Sort by
                </label>
                <select
                  id="sort"
                  value={sort}
                  onChange={(e) => updateParam('sort', e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mobile category chips */}
            <div className="md:hidden flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => updateParam('category', undefined)}
                className={`shrink-0 rounded-full px-3 py-1 text-sm border transition-colors ${
                  !category
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border hover:bg-accent'
                }`}
              >
                All
              </button>
              {(categories ?? [])
                .filter((c) => c.is_active)
                .map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => updateParam('category', cat.slug)}
                    className={`shrink-0 rounded-full px-3 py-1 text-sm border transition-colors ${
                      category === cat.slug
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
            </div>

            <ProductGrid products={products} loading={isLoading} skeletonCount={PER_PAGE} />

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
        </div>
      </div>
    </>
  );
}
