import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X, SlidersHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import { SEOHead } from '@/components/seo/SEOHead';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { useState } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { cn } from '@/lib/cn';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest arrivals' },
  { value: 'price_asc', label: 'Price · Low to high' },
  { value: 'price_desc', label: 'Price · High to low' },
  { value: 'name_asc', label: 'Name · A to Z' },
  { value: 'popular', label: 'Most popular' },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]['value'];

const PER_PAGE = 20;

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const page = parseInt(params.get('page') ?? '1', 10);
  const sort = (params.get('sort') ?? 'newest') as SortValue;
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

  function clearAll() {
    setParams(new URLSearchParams());
  }

  function goToPage(p: number) {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(p));
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const activeFilters = useMemo(() => {
    const filters: { key: string; label: string; onRemove: () => void }[] = [];
    if (category) {
      const cat = categories?.find((c) => c.slug === category);
      filters.push({
        key: 'category',
        label: cat?.name ?? category,
        onRemove: () => updateParam('category', undefined),
      });
    }
    if (brand) {
      filters.push({
        key: 'brand',
        label: `Brand: ${brand}`,
        onRemove: () => updateParam('brand', undefined),
      });
    }
    if (bulkOnly) {
      filters.push({
        key: 'bulk',
        label: 'Bulk only',
        onRemove: () => updateParam('bulk_only', undefined),
      });
    }
    if (minPrice !== undefined) {
      filters.push({
        key: 'min',
        label: `Min GHS ${minPrice}`,
        onRemove: () => updateParam('min_price', undefined),
      });
    }
    if (maxPrice !== undefined) {
      filters.push({
        key: 'max',
        label: `Max GHS ${maxPrice}`,
        onRemove: () => updateParam('max_price', undefined),
      });
    }
    return filters;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, brand, bulkOnly, minPrice, maxPrice, categories]);

  const filterPanel = (
    <div className="space-y-8">
      {/* Category */}
      <div className="space-y-3">
        <h3 className="editorial-label text-brand-navy/60">Category</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => updateParam('category', undefined)}
            className={cn(
              'inline-flex h-8 items-center rounded-full border px-3.5 text-[12px] font-medium tracking-wide transition-colors duration-200',
              !category
                ? 'border-brand-navy bg-brand-navy text-brand-ivory'
                : 'border-brand-navy/15 text-brand-navy/75 hover:border-brand-navy/35',
            )}
          >
            All
          </button>
          {(categories ?? [])
            .filter((c) => c.is_active)
            .map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => updateParam('category', cat.slug)}
                className={cn(
                  'inline-flex h-8 items-center rounded-full border px-3.5 text-[12px] font-medium tracking-wide transition-colors duration-200',
                  category === cat.slug
                    ? 'border-brand-navy bg-brand-navy text-brand-ivory'
                    : 'border-brand-navy/15 text-brand-navy/75 hover:border-brand-navy/35',
                )}
              >
                {cat.name}
              </button>
            ))}
        </div>
      </div>

      {/* Brand */}
      <div className="space-y-3">
        <h3 className="editorial-label text-brand-navy/60">Brand</h3>
        <Input
          type="text"
          placeholder="e.g. Skipper"
          value={brand ?? ''}
          onChange={(e) => updateParam('brand', e.target.value || undefined)}
        />
      </div>

      {/* Price */}
      <div className="space-y-3">
        <h3 className="editorial-label text-brand-navy/60">Price (GHS)</h3>
        <div className="flex gap-2 items-center">
          <Input
            type="number"
            placeholder="Min"
            min={0}
            value={minPrice ?? ''}
            onChange={(e) => updateParam('min_price', e.target.value || undefined)}
            className="w-full"
          />
          <span className="text-brand-navy/40 text-sm flex-none">&mdash;</span>
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

      {/* Bulk toggle */}
      <div className="space-y-3">
        <h3 className="editorial-label text-brand-navy/60">Availability</h3>
        <label className="flex items-center justify-between gap-3 py-2 cursor-pointer group">
          <span className="text-sm font-medium text-brand-navy">
            Bulk-priced products only
          </span>
          <span
            className={cn(
              'relative inline-flex h-6 w-11 flex-none rounded-full transition-colors duration-300',
              bulkOnly ? 'bg-brand-cyan' : 'bg-brand-navy/20',
            )}
          >
            <input
              type="checkbox"
              checked={bulkOnly}
              onChange={(e) => updateParam('bulk_only', e.target.checked ? 'true' : undefined)}
              className="sr-only"
              aria-label="Bulk-priced products only"
            />
            <span
              className={cn(
                'absolute top-0.5 h-5 w-5 rounded-full bg-brand-ivory shadow transition-transform duration-300 ease-editorial',
                bulkOnly ? 'translate-x-[22px]' : 'translate-x-0.5',
              )}
            />
          </span>
        </label>
      </div>

      {activeFilters.length > 0 && (
        <Button variant="ghost" size="sm" onClick={clearAll} className="w-full justify-center">
          Clear all filters
        </Button>
      )}
    </div>
  );

  return (
    <>
      <SEOHead
        title="Shop all products"
        description="Browse Skipper Detergents' full range — detergents, tissue, bathroom accessories, and more."
      />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Shop' }]} />

      {/* Page header */}
      <header className="container pt-6 pb-10 md:pt-10 md:pb-14">
        <div className="flex items-end justify-between flex-wrap gap-6">
          <div>
            <span className="editorial-label text-brand-cyan-deep">
              <span className="accent-line mr-3" aria-hidden="true" />
              The shop
            </span>
            <h1 className="mt-4 font-display text-display-md text-brand-navy">
              <span className="font-display-italic">Everything</span> we make &amp; carry.
            </h1>
            <p className="mt-3 text-sm text-brand-navy/60 tabular-nums">
              {isLoading ? 'Loading...' : `${total} product${total === 1 ? '' : 's'}`}
              {activeFilters.length > 0 ? ` · ${activeFilters.length} filter${activeFilters.length === 1 ? '' : 's'} applied` : ''}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => setMobileFilterOpen(true)}
              className="md:hidden gap-2"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              Filter
            </Button>
            <div className="inline-flex h-11 items-center rounded-md border border-brand-navy/15 bg-brand-ivory px-1">
              <label htmlFor="sort" className="sr-only">
                Sort by
              </label>
              <select
                id="sort"
                value={sort}
                onChange={(e) => updateParam('sort', e.target.value)}
                className="h-9 bg-transparent border-0 pl-3 pr-8 text-[13px] font-medium text-brand-navy focus:outline-none cursor-pointer"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {activeFilters.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 flex flex-wrap items-center gap-2"
          >
            {activeFilters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={f.onRemove}
                className="group inline-flex items-center gap-1.5 rounded-full bg-brand-navy/5 hover:bg-brand-navy/10 px-3 py-1 text-[12px] font-medium text-brand-navy tracking-wide transition-colors"
              >
                {f.label}
                <X className="h-3 w-3 text-brand-navy/60 group-hover:text-brand-navy" aria-hidden="true" />
              </button>
            ))}
            <button
              type="button"
              onClick={clearAll}
              className="text-[12px] font-medium text-brand-cyan-deep hover:underline ml-1"
            >
              Clear all
            </button>
          </motion.div>
        )}
      </header>

      {/* Content */}
      <div className="container pb-20 md:pb-28">
        <div className="grid gap-10 md:grid-cols-[240px_1fr] lg:gap-14">
          {/* Sidebar */}
          <aside className="hidden md:block sticky top-24 h-fit">
            {filterPanel}
          </aside>

          {/* Main */}
          <div className="min-w-0">
            <ProductGrid
              products={products}
              loading={isLoading}
              skeletonCount={PER_PAGE}
              columns={3}
            />

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
        </div>
      </div>

      {/* Mobile filter sheet */}
      <Sheet open={mobileFilterOpen} onClose={() => setMobileFilterOpen(false)} side="left" title="Filter products">
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-navy/10">
          <span className="font-display text-xl font-medium text-brand-navy">Filter</span>
          <Button variant="ghost" size="icon" onClick={() => setMobileFilterOpen(false)} aria-label="Close">
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-6">{filterPanel}</div>
        <div className="border-t border-brand-navy/10 px-5 py-4">
          <Button
            variant="primary"
            size="md"
            className="w-full"
            onClick={() => setMobileFilterOpen(false)}
          >
            Show {total} product{total === 1 ? '' : 's'}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
