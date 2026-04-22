import { Link } from 'react-router-dom';
import { STORE_NAME } from '@/lib/env';

export function Footer() {
  return (
    <footer className="border-t border-border bg-accent/30 mt-16" role="contentinfo">
      <div className="container py-12 grid gap-10 md:grid-cols-4">
        <div>
          <h2 className="font-semibold text-lg mb-2">{STORE_NAME}</h2>
          <p className="text-sm text-muted-foreground">
            Premium cleaning &amp; bathroom essentials, delivered across Ghana.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide">Shop</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/shop" className="hover:text-primary">
                All Products
              </Link>
            </li>
            <li>
              <Link to="/bulk" className="hover:text-primary">
                Bulk Orders
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide">Company</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/about" className="hover:text-primary">
                About
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-primary">
                Contact
              </Link>
            </li>
            <li>
              <Link to="/faq" className="hover:text-primary">
                FAQ
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide">Legal</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/privacy" className="hover:text-primary">
                Privacy
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container py-4 text-xs text-muted-foreground text-center">
          &copy; {new Date().getFullYear()} {STORE_NAME} Ltd. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
