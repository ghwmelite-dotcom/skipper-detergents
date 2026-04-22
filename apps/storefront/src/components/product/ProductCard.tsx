import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import type { Product } from '@skipper/shared';
import { formatCurrency } from '@skipper/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { cn } from '@/lib/cn';

const PLACEHOLDER = 'https://placehold.co/400x400/e2e8f0/64748b?text=Product';

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const { addItem } = useCart();

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    addItem({ product_id: product.id, quantity: 1 });
  }

  const primaryImage = PLACEHOLDER;
  const hasDiscount = product.compare_at_price !== null && product.compare_at_price > product.unit_price;
  const inStock = product.stock_quantity > 0;

  return (
    <Link to={`/product/${product.slug}`} className="group block" tabIndex={0}>
      <Card
        className={cn(
          'overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200',
          className,
        )}
      >
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-muted/20">
          <img
            src={primaryImage}
            alt={product.name}
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          {product.is_bulk_available && (
            <span className="absolute top-2 left-2 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold px-2 py-0.5">
              BULK
            </span>
          )}
          {hasDiscount && (
            <span className="absolute top-2 right-2 rounded-full bg-destructive text-destructive-foreground text-xs font-semibold px-2 py-0.5">
              SALE
            </span>
          )}
          {!inStock && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <span className="text-sm font-medium text-muted-foreground">Out of stock</span>
            </div>
          )}
        </div>

        {/* Info */}
        <CardContent className="p-4 space-y-3">
          <div className="space-y-1">
            {product.brand && (
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{product.brand}</p>
            )}
            <h3 className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {product.name}
            </h3>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-foreground">{formatCurrency(product.unit_price)}</span>
              {hasDiscount && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatCurrency(product.compare_at_price!)}
                </span>
              )}
            </div>

            <Button
              size="sm"
              variant="primary"
              onClick={handleAddToCart}
              disabled={!inStock}
              aria-label={`Add ${product.name} to cart`}
              className="shrink-0 h-9 px-2.5"
            >
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
