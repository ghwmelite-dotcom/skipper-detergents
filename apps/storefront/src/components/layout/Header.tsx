import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, ShoppingBag } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { useUiStore } from '@/stores/uiStore';
import { STORE_NAME } from '@/lib/env';
import { cn } from '@/lib/cn';

const NAV_LINKS = [
  { to: '/shop', label: 'Shop' },
  { to: '/bulk', label: 'Bulk' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export function Header() {
  const { totalQuantity } = useCart();
  const openMobileNav = useUiStore((s) => s.openMobileNav);
  const openCartDrawer = useUiStore((s) => s.openCartDrawer);
  const reduced = useReducedMotion();
  const location = useLocation();

  const [scrolled, setScrolled] = useState(false);
  const prevQtyRef = useRef(totalQuantity);
  const [badgePulse, setBadgePulse] = useState(0);

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
      className={cn(
        'sticky top-0 z-40 w-full border-b bg-brand-ivory/85 backdrop-blur-md',
        'transition-[height,border-color,box-shadow] duration-300 ease-editorial',
        scrolled
          ? 'border-brand-navy/10 shadow-sm'
          : 'border-transparent',
      )}
    >
      <div
        className={cn(
          'container flex items-center gap-4 transition-[height] duration-300 ease-editorial',
          scrolled ? 'h-14' : 'h-[68px]',
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden -ml-2"
          onClick={openMobileNav}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>

        <Link
          to="/"
          className="group inline-flex items-center gap-0 text-brand-navy"
          aria-label={`${STORE_NAME} — home`}
        >
          <span className="font-display text-[22px] md:text-[26px] leading-none font-medium tracking-[-0.015em]">
            Skipper
          </span>
          <span className="font-display-italic text-[22px] md:text-[26px] leading-none font-normal tracking-[-0.02em] ml-[3px] text-brand-cyan-deep">
            detergents
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 ml-10" aria-label="Primary">
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
                  'nav-underline text-[13px] font-medium tracking-wide transition-colors duration-200',
                  isActive ? 'text-brand-navy' : 'text-brand-navy/65 hover:text-brand-navy',
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={openCartDrawer}
            aria-label={`Cart (${totalQuantity} items)`}
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-md text-brand-navy transition-colors duration-200 ease-editorial hover:bg-brand-navy/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
        </div>
      </div>
    </motion.header>
  );
}
