import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShoppingBag, Check, AlertCircle, Truck, Zap, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { SEOHead } from '@/components/seo/SEOHead';
import { JsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { ProductImageGallery } from '@/components/product/ProductImageGallery';
import { BulkPricingTable } from '@/components/product/BulkPricingTable';
import { QuantityInput } from '@/components/product/QuantityInput';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ModeToggle } from '@/components/shared/ModeToggle';
import { Reveal } from '@/components/motion/Reveal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useProduct } from '@/hooks/useProducts';
import { useCategoryProducts } from '@/hooks/useCategories';
import { useCart } from '@/hooks/useCart';
import { useUiStore } from '@/stores/uiStore';
import { usePurchaseModeStore } from '@/stores/purchaseModeStore';
import { formatCurrency, resolveBulkPrice } from '@skipper/shared';
import type { Product } from '@skipper/shared';
import { cn } from '@/lib/cn';

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: product, isLoading, isError } = useProduct(slug);
  const { addItem } = useCart();
  const openCartDrawer = useUiStore((s) => s.openCartDrawer);
  const reduced = useReducedMotion();

  const mode = usePurchaseModeStore((s) => s.mode);

  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(undefined);
  const [addedToCart, setAddedToCart] = useState(false);

  const bulkTiers = product?.bulk_tiers ?? [];
  const bulkCapable = Boolean(product?.is_bulk_available);
  const inBulkMode = mode === 'bulk' && bulkCapable;

  // When switching into bulk mode (and the product supports it), bump the
  // quantity to the minimum bulk qty — but never below the user's choice.
  useEffect(() => {
    if (!product) return;
    if (inBulkMode && quantity < (product.bulk_minimum_qty ?? 1)) {
      setQuantity(product.bulk_minimum_qty ?? 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inBulkMode, product?.id]);

  const resolved = product ? resolveBulkPrice(quantity, product.unit_price, bulkTiers) : null;
  const displayPrice = resolved ? resolved.unit_price : 0;
  const variantAdjustment =
    product?.variants?.find((v) => v.id === selectedVariantId)?.price_adjustment ?? 0;
  const finalPrice = displayPrice + variantAdjustment;
  const singlePriceReference = product
    ? product.unit_price + variantAdjustment
    : 0;

  const inStock = (product?.stock_quantity ?? 0) > 0;

  // Related products from same category
  const { data: categoryData } = useCategoryProducts(product?.category?.slug, 1, 8);
  const relatedRaw = categoryData?.data;
  let relatedProducts: Product[] = [];
  if (relatedRaw) {
    const first = Array.isArray(relatedRaw) ? relatedRaw[0] : relatedRaw;
    if (first && typeof first === 'object' && 'products' in (first as object)) {
      relatedProducts = (first as { products: Product[] }).products ?? [];
    } else {
      relatedProducts = (relatedRaw as unknown as Product[]) ?? [];
    }
  }
  relatedProducts = relatedProducts.filter((p) => p.id !== product?.id).slice(0, 4);

  function handleAddToCart() {
    if (!product) return;
    addItem({
      product_id: product.id,
      ...(selectedVariantId ? { variant_id: selectedVariantId } : {}),
      quantity,
    });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 1800);
    setTimeout(() => openCartDrawer(), 200);
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
      <div className="container py-10 md:py-16">
        <Skeleton className="h-5 w-48 mb-10" />
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
          <Skeleton className="aspect-square w-full rounded-lg lg:col-span-7" />
          <div className="space-y-5 lg:col-span-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-7 w-1/3" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="container py-24 text-center space-y-5 max-w-md mx-auto">
        <AlertCircle className="h-12 w-12 text-brand-navy/40 mx-auto" aria-hidden="true" />
        <h1 className="font-display text-3xl text-brand-navy">
          This <span className="font-display-italic">page</span> went overboard.
        </h1>
        <p className="text-brand-navy/60">
          The product may have been removed or the link is incorrect.
        </p>
        <Link to="/shop">
          <Button variant="primary" size="md">Back to the shop</Button>
        </Link>
      </div>
    );
  }

  const hasCompare = product.compare_at_price && product.compare_at_price > product.unit_price;
  const savings = hasCompare ? product.compare_at_price! - product.unit_price : 0;

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

      <div className="container py-8 md:py-12">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          {/* Gallery */}
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
            className="lg:col-span-7"
          >
            <ProductImageGallery
              images={product.images ?? []}
              productName={product.name}
              productBrand={product.brand}
              categoryId={product.category_id}
            />
          </motion.div>

          {/* Info */}
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1], delay: 0.12 }}
            className="lg:col-span-5 space-y-7"
          >
            {/* Brand + name + mode toggle */}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-2">
                  {product.brand && (
                    <p className="editorial-label text-brand-cyan-deep">
                      <span className="accent-line mr-2" aria-hidden="true" />
                      {product.brand}
                    </p>
                  )}
                </div>
                {bulkCapable && (
                  <ModeToggle size="sm" layoutIdPrefix="pdp-mode" />
                )}
              </div>
              <h1 className="font-display text-display-sm text-brand-navy">
                {product.name}
              </h1>
            </div>

            {/* Price */}
            <div className="space-y-2 pt-2 border-t border-brand-navy/10">
              <div className="flex items-baseline gap-3 flex-wrap pt-4">
                {inBulkMode && (
                  <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-brand-red">
                    From
                  </span>
                )}
                <span className="text-4xl font-semibold text-brand-navy tabular-nums tracking-tight">
                  {formatCurrency(finalPrice * quantity)}
                </span>
                {quantity > 1 && (
                  <span className="text-sm text-brand-navy/55 tabular-nums">
                    {formatCurrency(finalPrice)} / unit
                  </span>
                )}
              </div>
              {inBulkMode && finalPrice < singlePriceReference && (
                <div className="flex items-center gap-2 flex-wrap text-sm">
                  <span className="text-brand-navy/45 line-through tabular-nums">
                    {formatCurrency(singlePriceReference)} / single
                  </span>
                  <span className="inline-flex items-center rounded-full bg-brand-red/10 text-brand-red px-2 py-0.5 text-[11px] font-medium tracking-wider uppercase tabular-nums">
                    Bulk save {Math.round(((singlePriceReference - finalPrice) / singlePriceReference) * 100)}%
                  </span>
                </div>
              )}
              {hasCompare && !inBulkMode && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[15px] text-brand-navy/45 line-through tabular-nums">
                    {formatCurrency(product.compare_at_price!)}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-brand-red/10 text-brand-red px-2 py-0.5 text-[11px] font-medium tracking-wider uppercase">
                    Save {formatCurrency(savings)}
                  </span>
                </div>
              )}
            </div>

            {/* Stock */}
            <div className="flex items-center gap-2 text-sm">
              {inStock ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inset-0 rounded-full bg-emerald-500/50 animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-brand-navy/70">
                    In stock &middot; {product.stock_quantity} available
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-brand-red" aria-hidden="true" />
                  <span className="text-brand-red font-medium">Currently out of stock</span>
                </>
              )}
            </div>

            {product.short_description && (
              <p className="text-[15px] text-brand-navy/70 leading-relaxed">
                {product.short_description}
              </p>
            )}

            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
              <div className="space-y-2.5">
                <label
                  htmlFor="variant"
                  className="editorial-label text-brand-navy/60 block"
                >
                  Variant
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.variants
                    .filter((v) => v.is_active)
                    .map((variant) => {
                      const active = variant.id === selectedVariantId;
                      const disabled = variant.stock_quantity === 0;
                      return (
                        <button
                          key={variant.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => setSelectedVariantId(active ? undefined : variant.id)}
                          className={cn(
                            'inline-flex items-center gap-2 rounded-full border px-4 h-10 text-[13px] font-medium transition-all duration-200 ease-editorial',
                            active
                              ? 'border-brand-navy bg-brand-navy text-brand-ivory'
                              : 'border-brand-navy/15 text-brand-navy hover:border-brand-navy/40',
                            disabled && 'opacity-50 cursor-not-allowed line-through',
                          )}
                        >
                          {variant.name}
                          {variant.price_adjustment !== 0 && (
                            <span className="tabular-nums text-[12px] opacity-80">
                              +{formatCurrency(variant.price_adjustment)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Quantity + add */}
            <div className="flex flex-wrap gap-3 items-center pt-2">
              <QuantityInput
                value={quantity}
                onChange={setQuantity}
                min={inBulkMode ? product.bulk_minimum_qty : 1}
                max={product.stock_quantity}
              />
              <motion.div
                className="flex-1 min-w-[220px]"
                {...(reduced ? {} : { whileTap: { scale: 0.98 } })}
              >
                <Button
                  variant="primary"
                  size="xl"
                  className="w-full gap-2 relative overflow-hidden"
                  onClick={handleAddToCart}
                  disabled={!inStock}
                  aria-label={`Add ${product.name} to cart`}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {addedToCart ? (
                      <motion.span
                        key="added"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25 }}
                        className="flex items-center gap-2"
                      >
                        <Check className="h-5 w-5" aria-hidden="true" />
                        Added to cart
                      </motion.span>
                    ) : (
                      <motion.span
                        key="add"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.25 }}
                        className="flex items-center gap-2"
                      >
                        <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                        Add to cart &middot; {formatCurrency(finalPrice * quantity)}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </motion.div>
            </div>

            {/* Trust inline row */}
            <div className="flex flex-wrap items-center gap-4 text-[12px] text-brand-navy/60 pt-2 border-t border-brand-navy/10">
              <div className="flex items-center gap-1.5 pt-4">
                <Truck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Free delivery GHS 200+</span>
              </div>
              <div className="flex items-center gap-1.5 pt-4">
                <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Same-day Accra dispatch</span>
              </div>
              <div className="flex items-center gap-1.5 pt-4">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Paystack secure</span>
              </div>
            </div>

            {/* Bulk pricing */}
            {bulkTiers.length > 0 && (
              <div>
                <h2 className="editorial-label text-brand-navy/60 mb-3">
                  Save more when you buy more
                </h2>
                <BulkPricingTable
                  tiers={bulkTiers}
                  currentQuantity={quantity}
                  basePrice={product.unit_price}
                />
              </div>
            )}
          </motion.div>
        </div>

        {/* Long description */}
        {product.description && (
          <Reveal className="mt-24 md:mt-32 max-w-3xl">
            <span className="editorial-label text-brand-cyan-deep mb-4 block">
              <span className="accent-line mr-3" aria-hidden="true" />
              About this product
            </span>
            <h2 className="font-display text-display-sm text-brand-navy mb-6">
              The details.
            </h2>
            <div className="font-light text-brand-navy/75 leading-[1.75] text-[17px] whitespace-pre-line drop-cap">
              {product.description}
            </div>
          </Reveal>
        )}

        {/* Related */}
        {relatedProducts.length > 0 && (
          <section className="mt-24 md:mt-32 pt-16 border-t border-brand-navy/10">
            <Reveal className="flex items-end justify-between flex-wrap gap-6 mb-12">
              <div>
                <span className="editorial-label text-brand-cyan-deep">
                  <span className="accent-line mr-3" aria-hidden="true" />
                  More to consider
                </span>
                <h2 className="mt-4 font-display text-display-sm text-brand-navy">
                  More from{' '}
                  <span className="font-display-italic">
                    {product.category?.name ?? 'this category'}
                  </span>
                  .
                </h2>
              </div>
              {product.category && (
                <Link
                  to={`/shop/${product.category.slug}`}
                  className="text-sm font-medium text-brand-cyan-deep hover:text-brand-navy transition-colors"
                >
                  View all &rarr;
                </Link>
              )}
            </Reveal>
            <ProductGrid products={relatedProducts} columns={4} />
          </section>
        )}
      </div>
    </>
  );
}
