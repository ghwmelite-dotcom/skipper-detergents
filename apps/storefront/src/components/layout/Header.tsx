import { Link, NavLink } from 'react-router-dom';
import { Menu, Search, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { useUiStore } from '@/stores/uiStore';
import { STORE_NAME } from '@/lib/env';

const NAV_LINKS = [
  { to: '/shop', label: 'Shop' },
  { to: '/bulk', label: 'Bulk' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export function Header() {
  const { totalQuantity } = useCart();
  const openMobileNav = useUiStore((s) => s.openMobileNav);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={openMobileNav}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>

        <Link
          to="/"
          className="font-semibold text-lg tracking-tight text-primary"
          aria-label={`${STORE_NAME} — home`}
        >
          {STORE_NAME}
        </Link>

        <nav className="hidden md:flex items-center gap-6 ml-8" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Search" className="hidden sm:inline-flex">
            <Search className="h-5 w-5" aria-hidden="true" />
          </Button>

          <Link to="/cart" aria-label={`Cart (${totalQuantity} items)`}>
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" aria-hidden="true" />
              {totalQuantity > 0 && (
                <span
                  className="absolute -top-1 -right-1 bg-secondary text-secondary-foreground text-xs min-w-[1.25rem] h-5 rounded-full flex items-center justify-center px-1"
                  aria-hidden="true"
                >
                  {totalQuantity}
                </span>
              )}
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
