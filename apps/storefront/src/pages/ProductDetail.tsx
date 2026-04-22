import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShoppingCart, CheckCircle, AlertCircle } from 'lucide-react';
import { SEOHead } from '@/components/seo/SEOHead';
import { JsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { ProductImageGallery } from '@/components/product/ProductImageGallery';
import { BulkPricingTable } from '@/components/product/BulkPricingTable';
import { QuantityInput } from '@/components/product/QuantityInput';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useProduct } from '@/hooks/useProducts';
import { useCart } from '@/hooks/useCart';
import { formatCurrency, resolveBulkPrice } from '@skipper/shared';

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: product, isLoading, isError } = useProduct(slug);
  const { addItem } = useCart();

  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(undefined);
  const [addedToCart, setAddedToCart] = useState(false);

  const bulkTiers = product?.bulk_tiers ?? [];
  const resolved = product ? resolveBulkPrice(quantity, product.unit_price, bulkTiers) : null;
  const displayPrice = resolved ? resolved.unit_price : 0;
  const variantAdjustment =
    product?.variants?.find((v) => v.id === selectedVariantId)?.price_adjustment ?? 0;
  const finalPrice = displayPrice + variantAdjustment;

  const inStock = (product?.stock_quantity ?? 0) > 0;

  function handleAddToCart() {
    if (!product) return;
    addItem({
      product_id: product.id,
      ...(selectedVariantId ? { variant_id: selectedVariantId } : {}),
      quantity,
    });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  }

  const jsonLdData = product
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description,
        sku: product.sku,
        brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
        offers: {
          '@type': 'Offer',
          price: product.unit_price,
          priceCurrency: product.currency,
          availability: inStock
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
          url: typeof window !== 'undefined' ? window.location.href : '',
        },
      }
    : null;

  if (isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid gap-8 md:grid-cols-2">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="container py-20 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" aria-hidden="true" />
        <p className="text-lg font-medium">Product not found</p>
        <p className="text-muted-foreground">
          This product may have been removed or the link is incorrect.
        </p>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title={product.seo_title ?? product.name}
        description={
          product.seo_description ??
          product.short_description ??
          product.description.slice(0, 160)
        }
        type="product"
      />
      {jsonLdData && <JsonLd data={jsonLdData} />}
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Shop', href: '/shop' },
          ...(product.category
            ? [{ label: product.category.name, href: `/shop/${product.category.slug}` }]
            : []),
          { label: product.name },
        ]}
      />

      <div className="container py-8">
        <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
          <ProductImageGallery images={product.images ?? []} productName={product.name} />

          <div className="space-y-6">
            <div className="space-y-1">
              {product.brand && (
                <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium">
                  {product.brand}
                </p>
              )}
              <h1 className="text-2xl md:text-3xl font-bold leading-tight">{product.name}</h1>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-primary">
                {formatCurrency(finalPrice * quantity)}
              </span>
              {quantity > 1 && (
                <span className="text-sm text-muted-foreground">
                  {formatCurrency(finalPrice)} each
                </span>
              )}
              {product.compare_at_price && product.compare_at_price > product.unit_price && (
                <span className="text-lg text-muted-foreground line-through">
                  {formatCurrency(product.compare_at_price)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {inStock ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
                  <span className="text-sm text-green-600 font-medium">
                    In stock ({product.stock_quantity} available)
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
                  <span className="text-sm text-destructive font-medium">Out of stock</span>
                </>
              )}
            </div>

            {product.short_description && (
              <p className="text-muted-foreground leading-relaxed">{product.short_description}</p>
            )}

            {product.variants && product.variants.length > 0 && (
              <div className="space-y-2">
                <label htmlFor="variant" className="text-sm font-medium">
                  Variant
                </label>
                <select
                  id="variant"
                  value={selectedVariantId ?? ''}
                  onChange={(e) => setSelectedVariantId(e.target.value || undefined)}
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select variant</option>
                  {product.variants
                    .filter((v) => v.is_active)
                    .map((variant) => (
                      <option
                        key={variant.id}
                        value={variant.id}
                        disabled={variant.stock_quantity === 0}
                      >
                        {variant.name}
                        {variant.price_adjustment !== 0
                          ? ` (+${formatCurrency(variant.price_adjustment)})`
                          : ''}
                        {variant.stock_quantity === 0 ? ' — Out of stock' : ''}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="flex flex-wrap gap-3 items-center">
              <QuantityInput
                value={quantity}
                onChange={setQuantity}
                min={product.is_bulk_available ? product.bulk_minimum_qty : 1}
                max={product.stock_quantity}
              />
              <Button
                variant="primary"
                size="lg"
                className="flex-1 min-w-40 gap-2"
                onClick={handleAddToCart}
                disabled={!inStock}
                aria-label={`Add ${product.name} to cart`}
              >
                {addedToCart ? (
                  <>
                    <CheckCircle className="h-5 w-5" aria-hidden="true" />
                    Added to Cart
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                    Add to Cart
                  </>
                )}
              </Button>
            </div>

            {bulkTiers.length > 0 && (
              <BulkPricingTable
                tiers={bulkTiers}
                currentQuantity={quantity}
                basePrice={product.unit_price}
              />
            )}
          </div>
        </div>

        {product.description && (
          <div className="mt-12 max-w-3xl">
            <h2 className="text-xl font-semibold mb-4">Product Description</h2>
            <div className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {product.description}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
