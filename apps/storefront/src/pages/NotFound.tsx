import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SEOHead } from '@/components/seo/SEOHead';
import { SplitHeadline } from '@/components/motion/SplitHeadline';

export default function NotFound() {
  return (
    <>
      <SEOHead title="Page not found (404)" noindex />
      <div className="container py-32 flex flex-col items-center text-center gap-8 max-w-xl mx-auto">
        <p className="editorial-label text-brand-cyan-deep">
          <span className="accent-line mr-3" aria-hidden="true" />
          Error 404
        </p>
        <SplitHeadline
          text="This page | _drifted_ off course."
          className="text-display-lg text-brand-navy"
          as="h1"
          stagger={0.08}
        />
        <p className="text-[17px] text-brand-navy/65 leading-relaxed font-light">
          We couldn&rsquo;t find that page. It may have been moved, or the link might be off.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link to="/">
            <Button variant="primary" size="lg">Go home</Button>
          </Link>
          <Link to="/shop">
            <Button variant="outline" size="lg">Browse the shop</Button>
          </Link>
        </div>
      </div>
    </>
  );
}
