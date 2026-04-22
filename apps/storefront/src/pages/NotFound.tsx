import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SEOHead } from '@/components/seo/SEOHead';

export default function NotFound() {
  return (
    <>
      <SEOHead title="Page not found (404)" noindex />
      <div className="container py-24 flex flex-col items-center text-center gap-4 max-w-md">
        <h1 className="text-5xl font-semibold text-primary">404</h1>
        <p className="text-muted-foreground">
          We couldn&apos;t find that page. Try heading back to the shop.
        </p>
        <div className="flex gap-2">
          <Link to="/">
            <Button>Go home</Button>
          </Link>
          <Link to="/shop">
            <Button variant="outline">Browse products</Button>
          </Link>
        </div>
      </div>
    </>
  );
}
