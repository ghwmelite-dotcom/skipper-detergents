import type { Product } from '@skipper/shared';
import { ProductCard } from './ProductCard';
import { SkeletonCard } from '@/components/shared/SkeletonCard';
import { cn } from '@/lib/cn';

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  skeletonCount?: number;
  className?: string;
  columns?: 2 | 3 | 4;
}

export function ProductGrid({
  products,
  loading = false,
  skeletonCount = 8,
  className,
  columns = 4,
}: ProductGridProps) {
  const colClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  }[columns];

  const gridClass = cn('grid gap-x-5 gap-y-10', colClasses, className);

  if (loading) {
    return (
      <div className={gridClass} aria-busy="true" aria-label="Loading products">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-24 text-center space-y-3">
        <p className="font-display-italic text-2xl text-brand-navy">Nothing here yet.</p>
        <p className="text-sm text-brand-navy/60">Try a different filter, or clear all filters.</p>
      </div>
    );
  }

  return (
    <div className={gridClass}>
      {products.map((product, i) => (
        <ProductCard key={product.id} product={product} index={i} />
      ))}
    </div>
  );
}
