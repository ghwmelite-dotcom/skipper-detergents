import { Link } from 'react-router-dom';
import { ArrowRight, Truck, Clock, ShieldCheck } from 'lucide-react';
import { SEOHead } from '@/components/seo/SEOHead';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductGrid } from '@/components/product/ProductGrid';
import { useFeaturedProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { usePublicSettings } from '@/hooks/useSettings';
import { STORE_NAME } from '@/lib/env';

const TRUST_FACTS = [
  {
    icon: Truck,
    title: 'Free Delivery',
    desc: 'Orders over GHS 200 delivered free within Accra',
  },
  {
    icon: Clock,
    title: 'Same-Day Accra',
    desc: 'Order before 12 PM for same-day delivery in Accra',
  },
  {
    icon: ShieldCheck,
    title: 'Secure Checkout',
    desc: 'Paystack-secured payments — card, MoMo, USSD',
  },
];

export default function Home() {
  const { data: settings } = usePublicSettings();
  const { data: featured, isLoading: featuredLoading } = useFeaturedProducts(12);
  const { data: categories, isLoading: catsLoading } = useCategories();

  const tagline =
    settings?.store_tagline ??
    'Premium cleaning and bathroom essentials, delivered across Ghana.';

  return (
    <>
      <SEOHead
        title={STORE_NAME}
        description={`${tagline} Shop detergents, tissue, bathroom accessories and more with bulk pricing and fast delivery.`}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="container py-20 md:py-28 relative z-10">
          <div className="max-w-2xl space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
              Ghana's Home Cleaning Essentials
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/80 leading-relaxed">
              {tagline}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/shop">
                <Button size="lg" variant="secondary" className="gap-2">
                  Shop Now
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Button>
              </Link>
              <Link to="/bulk">
                <Button size="lg" variant="outline" className="border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10">
                  Bulk Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
        {/* Decorative background */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white" />
          <div className="absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-white" />
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-b border-border bg-muted/30">
        <div className="container py-8">
          <div className="grid gap-6 sm:grid-cols-3">
            {TRUST_FACTS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured products */}
      <section className="container py-12 md:py-16">
        <div className="flex items-baseline justify-between gap-4 mb-8">
          <h2 className="text-2xl md:text-3xl font-semibold">Featured Products</h2>
          <Link to="/shop" className="text-sm text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
        <ProductGrid
          products={featured ?? []}
          loading={featuredLoading}
          skeletonCount={8}
        />
      </section>

      {/* Categories */}
      <section className="container py-12 md:py-16 border-t border-border">
        <h2 className="text-2xl md:text-3xl font-semibold mb-8">Shop by Category</h2>
        {catsLoading ? (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
            {(categories ?? [])
              .filter((c) => c.is_active)
              .map((cat) => (
                <Link
                  key={cat.id}
                  to={`/shop/${cat.slug}`}
                  className="group block"
                >
                  <Card className="overflow-hidden h-32 relative flex items-end hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                    {cat.image_url ? (
                      <img
                        src={cat.image_url}
                        alt={cat.name}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    <CardContent className="relative p-4 z-10">
                      <p className="font-semibold text-white text-sm leading-snug">{cat.name}</p>
                      {(cat as { product_count?: number }).product_count !== undefined && (
                        <p className="text-xs text-white/70 mt-0.5">
                          {(cat as { product_count: number }).product_count} products
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
          </div>
        )}
      </section>
    </>
  );
}
