import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  Check,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { SEOHead } from '@/components/seo/SEOHead';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ModeToggle } from '@/components/shared/ModeToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { usePurchaseModeStore } from '@/stores/purchaseModeStore';
import { formatCurrency } from '@skipper/shared';
import type { Product } from '@skipper/shared';
import { ProductIllustration, shouldUseRealImage } from '@/lib/productIllustration';
import { haptic } from '@/lib/haptic';
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
  const [mobileSortOpen, setMobileSortOpen] = useState(false);
  const mode = usePurchaseModeStore((s) => s.mode);

  const page = parseInt(params.get('page') ?? '1', 10);
  const sort = (params.get('sort') ?? 'newest') as SortValue;
  const category = params.get('category') ?? undefined;
  const brand = params.get('brand') ?? undefined;
  const urlBulkOnly = params.get('bulk_only') === 'true';
  const bulkOnly = urlBulkOnly || mode === 'bulk';
  const minPrice = params.get('min_price') ? Number(params.get('min_price')) : undefined;
  const maxPrice = params.get('max_price') ? Number(params.get('max_price')) : undefined;

  useEffect(() => {
    if (mode === 'bulk' && !urlBulkOnly) {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('bulk_only', 'true');
          next.delete('page');
          return next;
        },
        { replace: true },
      );
    }
    if (mode === 'single' && urlBulkOnly) {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('bulk_only');
          next.delete('page');
          return next;
        },
        { replace: true },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

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

  // Mobile "Load more" support — accumulate pages without navigating.
  // We keep the URL `page` param in sync with the last-loaded page so
  // back/forward still works, but render an accumulated list.
  const [accumulated, setAccumulated] = useState<Product[]>([]);
  const [accumulatedKey, setAccumulatedKey] = useState('');
  useEffect(() => {
    // When any filter/sort/mode changes, reset accumulated list
    const key = JSON.stringify({ sort, category, brand, bulkOnly, minPrice, maxPrice });
    if (key !== accumulatedKey) {
      setAccumulatedKey(key);
      setAccumulated([]);
    }
  }, [sort, category, brand, bulkOnly, minPrice, maxPrice, accumulatedKey]);

  useEffect(() => {
    if (!products.length) return;
    setAccumulated((prev) => {
      // If we're on page 1 (fresh), replace. Otherwise, merge unique.
      if (page === 1) return products;
      const ids = new Set(prev.map((p) => p.id));
      const merged = [...prev];
      for (const p of products) {
        if (!ids.has(p.id)) merged.push(p);
      }
      return merged;
    });
  }, [products, page]);

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

  function loadMore() {
    haptic(6);
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(page + 1));
      return next;
    });
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
      {/* Purchase mode */}
      <div className="space-y-3">
        <h3 className="editorial-label text-brand-navy/60">Buying for</h3>
        <ModeToggle size="lg" layoutIdPrefix="shop-filter-mode" className="w-full" />
        <p className="text-[12px] text-brand-navy/55 leading-relaxed">
          {mode === 'bulk'
            ? 'Showing wholesale-priced items. Minimum quantities apply.'
            : 'Single-unit retail prices. Switch to bulk for wholesale tiers.'}
        </p>
      </div>

      {/* Category */}
      <div className="space-y-3">
        <h3 className="editorial-label text-brand-navy/60">Category</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => updateParam('category', undefined)}
            className={cn(
              'inline-flex h-10 items-center rounded-full border px-4 text-[13px] font-medium tracking-wide transition-colors duration-200',
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
                  'inline-flex h-10 items-center rounded-full border px-4 text-[13px] font-medium tracking-wide transition-colors duration-200',
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
          className="h-12"
        />
      </div>

      {/* Price */}
      <div className="space-y-3">
        <h3 className="editorial-label text-brand-navy/60">Price (GHS)</h3>
        <div className="flex gap-2 items-center">
          <Input
            type="number"
            inputMode="numeric"
            placeholder="Min"
            min={0}
            value={minPrice ?? ''}
            onChange={(e) => updateParam('min_price', e.target.value || undefined)}
            className="w-full h-12"
          />
          <span className="text-brand-navy/40 text-sm flex-none">&mdash;</span>
          <Input
            type="number"
            inputMode="numeric"
            placeholder="Max"
            min={0}
            value={maxPrice ?? ''}
            onChange={(e) => updateParam('max_price', e.target.value || undefined)}
            className="w-full h-12"
          />
        </div>
      </div>

      {/* Bulk toggle */}
      <div className="space-y-3">
        <h3 className="editorial-label text-brand-navy/60">Availability</h3>
        <label className="flex items-center justify-between gap-3 py-2 cursor-pointer group min-h-12">
          <span className="text-sm font-medium text-brand-navy">
            Bulk-priced products only
          </span>
          <span
            className={cn(
              'relative inline-flex h-7 w-12 flex-none rounded-full transition-colors duration-300',
              bulkOnly ? 'bg-brand-cyan' : 'bg-brand-navy/20',
            )}
          >
            <input
              type="checkbox"
              checked={bulkOnly}
              onChange={(e) => {
                haptic(6);
                updateParam('bulk_only', e.target.checked ? 'true' : undefined);
              }}
              className="sr-only"
              aria-label="Bulk-priced products only"
            />
            <span
              className={cn(
                'absolute top-0.5 h-6 w-6 rounded-full bg-brand-ivory shadow transition-transform duration-300 ease-editorial',
                bulkOnly ? 'translate-x-[22px]' : 'translate-x-0.5',
              )}
            />
          </span>
        </label>
      </div>

      {activeFilters.length > 0 && (
        <Button variant="ghost" size="md" onClick={clearAll} className="w-full justify-center">
          Clear all filters
        </Button>
      )}
    </div>
  );

  // Mobile product list uses `accumulated`; desktop uses `products` (per page).
  const mobileProducts = accumulated.length > 0 ? accumulated : products;
  const hasMore = accumulated.length < total;

  return (
    <>
      <SEOHead
        title={mode === 'bulk' ? 'Wholesale catalog' : 'Shop all products'}
        description="Browse Skipper CleanCare' full range — detergents, tissue, bathroom accessories, and more."
      />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Shop' }]} />

      {mode === 'bulk' && (
        <div
          className="h-[3px] w-full bg-gradient-to-r from-brand-navy via-brand-cyan-deep to-brand-navy"
          aria-hidden="true"
        />
      )}

      {/* Page header */}
      <header className="container pt-4 pb-6 md:pt-10 md:pb-14">
        <div className="flex items-end justify-between flex-wrap gap-6">
          <div>
            <span className="editorial-label text-brand-cyan-deep">
              <span className="accent-line mr-3" aria-hidden="true" />
              {mode === 'bulk' ? 'Wholesale' : 'The shop'}
            </span>
            <h1 className="mt-3 md:mt-4 font-display text-[clamp(2rem,8vw,4rem)] md:text-display-md leading-[1] tracking-[-0.03em] text-brand-navy">
              {mode === 'bulk' ? (
                <>
                  <span className="font-display-italic">Wholesale</span> catalog.
                </>
              ) : (
                <>
                  <span className="font-display-italic">Everything</span> we make &amp; carry.
                </>
              )}
            </h1>
            <p className="mt-2 md:mt-3 text-sm text-brand-navy/60 tabular-nums">
              {isLoading ? 'Loading...' : `${total} product${total === 1 ? '' : 's'}`}
              {activeFilters.length > 0
                ? ` · ${activeFilters.length} filter${activeFilters.length === 1 ? '' : 's'} applied`
                : ''}
            </p>
          </div>

          {/* Desktop sort */}
          <div className="hidden md:flex items-center gap-2">
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
            className="mt-4 md:mt-6 flex flex-wrap items-center gap-2"
          >
            {activeFilters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={f.onRemove}
                className="group inline-flex items-center gap-1.5 rounded-full bg-brand-navy/5 hover:bg-brand-navy/10 px-3 py-1.5 text-[12px] font-medium text-brand-navy tracking-wide transition-colors"
              >
                {f.label}
                <X
                  className="h-3 w-3 text-brand-navy/60 group-hover:text-brand-navy"
                  aria-hidden="true"
                />
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

      {/* Mobile sticky filter + sort pills */}
      <div className="md:hidden sticky top-[60px] z-20 bg-brand-ivory/90 backdrop-blur-md border-y border-brand-navy/10 py-2.5 px-4 flex gap-2">
        <button
          type="button"
          onClick={() => {
            haptic(6);
            setMobileFilterOpen(true);
          }}
          className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-full border border-brand-navy/15 bg-brand-ivory text-[13px] font-semibold text-brand-navy"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" strokeWidth={1.75} />
          Filters
          {activeFilters.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-brand-navy text-brand-ivory text-[11px] font-semibold tabular-nums px-1.5">
              {activeFilters.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            haptic(6);
            setMobileSortOpen(true);
          }}
          className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-full border border-brand-navy/15 bg-brand-ivory text-[13px] font-semibold text-brand-navy"
        >
          <ArrowUpDown className="h-4 w-4" aria-hidden="true" strokeWidth={1.75} />
          {SORT_OPTIONS.find((o) => o.value === sort)?.label.split(' · ')[0] ?? 'Sort'}
        </button>
      </div>

      {/* Content */}
      <div className="container py-5 md:py-0 md:pb-28">
        <div className="grid gap-10 md:grid-cols-[240px_1fr] lg:gap-14">
          {/* Sidebar (desktop only) */}
          <aside className="hidden md:block sticky top-24 h-fit">{filterPanel}</aside>

          {/* Main */}
          <div className="min-w-0">
            {/* DESKTOP grid — original 3-col */}
            <div className="hidden md:block">
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

            {/* MOBILE — 2-col compact grid + Load more */}
            <div className="md:hidden">
              {isLoading && accumulated.length === 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-square w-full rounded-md" />
                  ))}
                </div>
              ) : mobileProducts.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <p className="font-display-italic text-2xl text-brand-navy">
                    Nothing here yet.
                  </p>
                  <p className="text-sm text-brand-navy/60">
                    Try a different filter, or clear all filters.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {mobileProducts.map((p, i) => (
                      <MobileProductCard key={p.id} product={p} index={i} />
                    ))}
                  </div>

                  {hasMore && (
                    <div className="pt-10 pb-6 flex justify-center">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={loadMore}
                        className="w-full"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Loading...' : `Load more (${total - accumulated.length} left)`}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile filter sheet — bottom-rise */}
      <Sheet
        open={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        side="bottom"
        title="Filter products"
        maxHeight="88vh"
      >
        <div className="pt-2 pb-1 flex justify-center" aria-hidden="true">
          <span className="block h-[5px] w-10 rounded-full bg-brand-navy/20" />
        </div>
        <div className="flex items-center justify-between px-5 pt-1 pb-3">
          <span className="font-display text-xl font-medium text-brand-navy">Filter</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileFilterOpen(false)}
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto scroll-touch px-5 py-2">{filterPanel}</div>
        <div className="border-t border-brand-navy/10 px-4 pt-3 pb-3">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => setMobileFilterOpen(false)}
          >
            Show {total} product{total === 1 ? '' : 's'}
          </Button>
        </div>
      </Sheet>

      {/* Mobile sort sheet — bottom-rise */}
      <Sheet
        open={mobileSortOpen}
        onClose={() => setMobileSortOpen(false)}
        side="bottom"
        title="Sort products"
        maxHeight="60vh"
      >
        <div className="pt-2 pb-1 flex justify-center" aria-hidden="true">
          <span className="block h-[5px] w-10 rounded-full bg-brand-navy/20" />
        </div>
        <div className="flex items-center justify-between px-5 pt-1 pb-3">
          <span className="font-display text-xl font-medium text-brand-navy">Sort by</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileSortOpen(false)}
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto scroll-touch pb-4">
          {SORT_OPTIONS.map((opt) => {
            const active = sort === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  haptic(6);
                  updateParam('sort', opt.value);
                  setMobileSortOpen(false);
                }}
                className={cn(
                  'w-full flex items-center justify-between gap-3 px-5 py-4 border-b border-brand-navy/5 text-left transition-colors',
                  'active:bg-brand-navy/5',
                  active && 'bg-brand-navy/[0.03]',
                )}
              >
                <span
                  className={cn(
                    'font-display text-[17px]',
                    active ? 'text-brand-navy font-medium' : 'text-brand-navy/80',
                  )}
                >
                  {opt.label}
                </span>
                {active && (
                  <Check
                    className="h-5 w-5 text-brand-cyan-deep"
                    aria-hidden="true"
                    strokeWidth={2.25}
                  />
                )}
              </button>
            );
          })}
        </div>
      </Sheet>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Mobile-specific compact product card (2-column grid)                */
/* ------------------------------------------------------------------ */

interface MobileProductCardProps {
  product: Product;
  index: number;
}

function MobileProductCard({ product, index }: MobileProductCardProps) {
  const primaryImageUrl = (product as unknown as { images?: { url: string }[] }).images?.[0]?.url;
  const useRealImage = shouldUseRealImage(primaryImageUrl);
  const inStock = product.stock_quantity > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: Math.min(index * 0.02, 0.15),
        ease: [0.2, 0.8, 0.2, 1],
      }}
    >
      <Link
        to={`/product/${product.slug}`}
        className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan-deep/60 rounded-md"
      >
        <div className="relative aspect-square w-full overflow-hidden rounded-md bg-brand-sand/50 ring-1 ring-brand-navy/8">
          {useRealImage && primaryImageUrl ? (
            <img
              src={primaryImageUrl}
              alt={product.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <ProductIllustration product={product} className="h-full w-full" />
          )}
          {!inStock && (
            <div className="absolute inset-0 bg-brand-ivory/75 backdrop-blur-[1px] flex items-center justify-center">
              <span className="font-display-italic text-sm text-brand-navy">Out of stock</span>
            </div>
          )}
          {product.is_bulk_available && (
            <span className="absolute top-2 left-2 inline-flex items-center rounded-full bg-brand-navy/90 px-2 py-0.5 text-[9px] font-semibold tracking-wider text-brand-ivory uppercase">
              Bulk
            </span>
          )}
        </div>
        <div className="pt-2 px-0.5 space-y-0.5">
          <h3 className="font-sans text-[14px] font-semibold leading-[1.25] text-brand-navy line-clamp-2">
            {product.name}
          </h3>
          <p className="text-[14px] font-bold text-brand-navy tabular-nums">
            {formatCurrency(product.unit_price)}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
