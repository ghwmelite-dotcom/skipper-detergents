import { Link } from 'react-router-dom';
import { ArrowRight, Package2 } from 'lucide-react';
import { SEOHead } from '@/components/seo/SEOHead';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BulkPricingTable } from '@/components/product/BulkPricingTable';
import { useProducts } from '@/hooks/useProducts';
import { formatCurrency } from '@skipper/shared';

const PLACEHOLDER = 'https://placehold.co/300x300/e2e8f0/64748b?text=Product';

export default function BulkOrder() {
  const { data, isLoading } = useProducts({ bulk_only: true, per_page: 50 });
  const products = data?.data ?? [];

  return (
    <>
      <SEOHead
        title="Bulk Orders"
        description="Save more with tiered pricing for offices, schools, retailers, and events. Order in quantity and unlock better prices."
      />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Bulk Orders' }]} />

      {/* Hero */}
      <section className="bg-secondary/10 border-b border-border">
        <div className="container py-12 md:py-16">
          <div className="max-w-2xl space-y-4">
            <div className="flex items-center gap-2 text-secondary font-medium text-sm uppercase tracking-wide">
              <Package2 className="h-4 w-4" aria-hidden="true" />
              Bulk Pricing
            </div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight">
              Save More on Bulk Orders
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Whether you're stocking up for your office, school, hotel, or retail shop — unlock
              exclusive tiered pricing when you order in quantity. The more you buy, the more you
              save.
            </p>
            <Link to="/contact">
              <Button variant="secondary" size="lg" className="gap-2">
                Request a custom quote
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Products with bulk tiers */}
      <section className="container py-12">
        <h2 className="text-2xl font-semibold mb-8">Bulk-Priced Products</h2>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-muted-foreground">No bulk products available at the moment.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {products.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                <div className="flex gap-4 p-4">
                  <div className="h-20 w-20 flex-none overflow-hidden rounded-lg border border-border bg-muted/20">
                    <img
                      src={PLACEHOLDER}
                      alt={product.name}
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    {product.brand && (
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                        {product.brand}
                      </p>
                    )}
                    <h3 className="font-semibold leading-snug line-clamp-2">{product.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      From{' '}
                      <span className="font-semibold text-foreground">
                        {formatCurrency(product.unit_price)}
                      </span>
                    </p>
                  </div>
                </div>
                <CardContent className="px-4 pb-4 pt-0 space-y-3">
                  {/* We don't have bulk_tiers on list view; link to detail */}
                  <p className="text-sm text-muted-foreground">
                    Minimum bulk order: {product.bulk_minimum_qty} units
                  </p>
                  <Link to={`/product/${product.slug}`}>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      View bulk pricing
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="container pb-16">
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-8 text-center space-y-4">
          <h2 className="text-2xl font-semibold">Need a Custom Quantity?</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Contact us directly for large or custom orders, restaurant & hospitality supplies, or
            regular bulk deliveries. We'll build a package that works for you.
          </p>
          <Link to="/contact">
            <Button variant="primary" size="lg">Contact us</Button>
          </Link>
        </div>
      </section>
    </>
  );
}
