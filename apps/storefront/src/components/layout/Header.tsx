import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, ShoppingBag, Search, ArrowLeft, Package } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { useUiStore } from '@/stores/uiStore';
import { STORE_NAME } from '@/lib/env';
import { cn } from '@/lib/cn';

interface NavLink {
  to: string;
  label: string;
  icon?: LucideIcon;
}

const NAV_LINKS: NavLink[] = [
  { to: '/shop', label: 'Shop' },
  { to: '/bulk', label: 'Bulk' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
  { to: '/track', label: 'Track order', icon: Package },
];

export function Header() {
  const { totalQuantity } = useCart();
  const openMobileNav = useUiStore((s) => s.openMobileNav);
  const openCartDrawer = useUiStore((s) => s.openCartDrawer);
  const reduced = useReducedMotion();
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const isCheckoutPage = location.pathname.startsWith('/checkout');

  const [scrolled, setScrolled] = useState(false);
  const prevQtyRef = useRef(totalQuantity);
  const [badgePulse, setBadgePulse] = useState(0);

  // Hide-on-scroll-down, reveal-on-scroll-up for mobile. We don't apply
  // this on the home page (hero already renders full-bleed and looks odd
  // without a chrome cue) or on checkout (back-button visual lock).
  const [hidden, setHidden] = useState(false);
  const { scrollY } = useScroll();
  const lastY = useRef(0);

  useMotionValueEvent(scrollY, 'change', (y) => {
    const diff = y - lastY.current;
    if (isHomePage || isCheckoutPage) {
      setHidden(false);
      lastY.current = y;
      return;
    }
    if (y < 80) {
      setHidden(false);
      lastY.current = y;
      return;
    }
    if (diff > 6) {
      setHidden(true);
    } else if (diff < -10) {
      setHidden(false);
    }
    lastY.current = y;
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (totalQuantity > prevQtyRef.current) {
      setBadgePulse((n) => n + 1);
    }
    prevQtyRef.current = totalQuantity;
  }, [totalQuantity]);

  return (
    <motion.header
      initial={false}
      animate={{ y: hidden ? '-100%' : '0%' }}
      transition={
        reduced
          ? { duration: 0 }
          : { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 }
      }
      className={cn(
        'sticky top-0 z-40 w-full border-b bg-brand-ivory/85 backdrop-blur-md',
        'transition-[height,border-color,box-shadow] duration-300 ease-editorial',
        'pt-[env(safe-area-inset-top)]',
        scrolled
          ? 'border-brand-navy/10 shadow-sm'
          : 'border-transparent',
      )}
    >
      <div
        className={cn(
          'container flex items-center gap-3 md:gap-4 transition-[height] duration-300 ease-editorial',
          scrolled ? 'h-14' : 'h-[60px] md:h-[68px]',
        )}
      >
        {/* Checkout mode — show a "Back to cart" button in place of the menu button */}
        {isCheckoutPage ? (
          <Link
            to="/cart"
            className="inline-flex items-center gap-1.5 h-11 -ml-1 pr-2 pl-1 rounded-md text-[14px] font-medium text-brand-navy/80 hover:text-brand-navy transition-colors"
            aria-label="Back to cart"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" strokeWidth={1.75} />
            <span className="hidden sm:inline">Back to cart</span>
            <span className="sm:hidden">Back</span>
          </Link>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden -ml-2 hidden"
            onClick={openMobileNav}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>
        )}

        <Link
          to="/"
          className={cn(
            'group inline-flex items-center gap-2 text-brand-navy',
            isCheckoutPage && 'md:inline-flex hidden',
          )}
          aria-label={`${STORE_NAME} — home`}
        >
          <img
            src="/logo-mark.svg"
            alt=""
            aria-hidden="true"
            className="h-8 w-8 md:h-9 md:w-9 shrink-0 transition-transform duration-300 ease-editorial group-hover:rotate-[6deg]"
            draggable={false}
          />
          <span className="inline-flex items-baseline">
            <span className="font-display text-[19px] md:text-[25px] leading-none font-medium tracking-[-0.015em]">
              Skipper
            </span>
            <span className="font-display-italic text-[19px] md:text-[25px] leading-none font-normal tracking-[-0.02em] ml-[3px] text-brand-cyan-deep">
              CleanCare
            </span>
          </span>
        </Link>

        <nav
          className="hidden md:flex items-center justify-center gap-7 flex-1"
          aria-label="Primary"
        >
          {NAV_LINKS.map((link) => {
            const isActive =
              link.to === '/'
                ? location.pathname === '/'
                : location.pathname === link.to || location.pathname.startsWith(`${link.to}/`);
            return (
              <Link
                key={link.to}
                to={link.to}
                data-active={isActive ? 'true' : 'false'}
                className={cn(
                  'nav-underline inline-flex items-center gap-1.5 text-[13px] font-medium tracking-wide transition-colors duration-200',
                  isActive ? 'text-brand-navy' : 'text-brand-navy/65 hover:text-brand-navy',
                )}
              >
                {link.icon && (
                  <link.icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                )}
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 md:gap-2">
          {/* Mobile: search icon (navigates to /shop as a search jump-point). No cart icon — moves to tab bar. */}
          {!isCheckoutPage && (
            <Link
              to="/shop"
              aria-label="Search products"
              className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-md text-brand-navy transition-colors hover:bg-brand-navy/5"
            >
              <Search className="h-[19px] w-[19px]" aria-hidden="true" strokeWidth={1.75} />
            </Link>
          )}

          {/* Desktop cart icon (mobile uses tab bar) */}
          {!isCheckoutPage && (
            <button
              type="button"
              onClick={openCartDrawer}
              aria-label={`Cart (${totalQuantity} items)`}
              className="hidden md:inline-flex relative h-11 w-11 items-center justify-center rounded-md text-brand-navy transition-colors duration-200 ease-editorial hover:bg-brand-navy/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <ShoppingBag className="h-[19px] w-[19px]" aria-hidden="true" strokeWidth={1.75} />
              <AnimatePresence>
                {totalQuantity > 0 && (
                  <motion.span
                    key={`badge-${badgePulse}`}
                    initial={reduced ? false : { scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                    className="absolute top-1.5 right-1.5 inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-brand-red px-1 text-[10px] font-semibold text-white tabular-nums"
                    aria-hidden="true"
                  >
                    {totalQuantity}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          )}
        </div>
      </div>
    </motion.header>
  );
}
