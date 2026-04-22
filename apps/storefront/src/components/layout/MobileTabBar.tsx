import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { House, LayoutGrid, Package, ShoppingBag, Menu } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCart } from '@/hooks/useCart';
import { useUiStore } from '@/stores/uiStore';
import { haptic } from '@/lib/haptic';
import { cn } from '@/lib/cn';

type TabId = 'home' | 'shop' | 'bulk' | 'cart' | 'menu';

interface Tab {
  id: TabId;
  label: string;
  to?: string;
  Icon: typeof House;
  action?: 'menu';
}

const TABS: Tab[] = [
  { id: 'home', label: 'Home', to: '/', Icon: House },
  { id: 'shop', label: 'Shop', to: '/shop', Icon: LayoutGrid },
  { id: 'bulk', label: 'Bulk', to: '/bulk', Icon: Package },
  { id: 'cart', label: 'Cart', to: '/cart', Icon: ShoppingBag },
  { id: 'menu', label: 'Menu', Icon: Menu, action: 'menu' },
];

/**
 * MobileTabBar — persistent, app-like tab bar that sits at the bottom of
 * the viewport on small screens. Hidden on md+ (where the desktop header
 * carries the primary navigation) and on /checkout (where we want no
 * distractions inside the conversion flow).
 *
 * The active indicator is a 2px cyan pill at the TOP of the tab — it
 * animates smoothly between tabs via a shared layoutId, giving a subtle
 * app-like continuity on route change.
 */
export function MobileTabBar() {
  const location = useLocation();
  const { totalQuantity } = useCart();
  const openMobileNav = useUiStore((s) => s.openMobileNav);
  const mobileNavOpen = useUiStore((s) => s.mobileNavOpen);
  const reduced = useReducedMotion();

  const prevQtyRef = useRef(totalQuantity);
  const [badgePulse, setBadgePulse] = useState(0);

  useEffect(() => {
    if (totalQuantity > prevQtyRef.current) {
      setBadgePulse((n) => n + 1);
    }
    prevQtyRef.current = totalQuantity;
  }, [totalQuantity]);

  // Hide entirely on /checkout — a focused conversion flow should not
  // tempt the user away. Same pattern as most app checkouts.
  const hidden = location.pathname.startsWith('/checkout');
  if (hidden) return null;

  function isTabActive(tab: Tab): boolean {
    if (tab.action === 'menu') {
      return mobileNavOpen;
    }
    if (!tab.to) return false;
    if (tab.to === '/') {
      return location.pathname === '/';
    }
    return location.pathname === tab.to || location.pathname.startsWith(`${tab.to}/`);
  }

  return (
    <nav
      className={cn(
        'md:hidden fixed inset-x-0 bottom-0 z-40',
        'bg-brand-ivory/85 backdrop-blur-[20px]',
        'border-t border-brand-navy/10',
        'pb-[env(safe-area-inset-bottom)]',
      )}
      aria-label="Primary mobile navigation"
      style={{
        // iOS-safe saturation boost so the frosted effect feels alive on
        // busy pages behind it (e.g. a gradient hero peeking under).
        WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
        backdropFilter: 'blur(20px) saturate(1.4)',
      }}
    >
      <div className="flex items-stretch justify-around h-16 px-2">
        {TABS.map((tab) => {
          const active = isTabActive(tab);
          const Icon = tab.Icon;
          const isCart = tab.id === 'cart';

          const inner = (
            <>
              {/* Active indicator pill — animated via shared layoutId */}
              {active && (
                <motion.span
                  layoutId="mobile-tab-active"
                  aria-hidden="true"
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full bg-brand-cyan-deep"
                  transition={
                    reduced
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 420, damping: 36 }
                  }
                />
              )}

              <div className="relative">
                <Icon
                  className={cn(
                    'h-6 w-6 transition-colors duration-200',
                    active ? 'text-brand-navy' : 'text-brand-navy/45',
                  )}
                  strokeWidth={active ? 2 : 1.75}
                  aria-hidden="true"
                />
                {isCart && totalQuantity > 0 && (
                  <AnimatePresence>
                    <motion.span
                      key={`tab-badge-${badgePulse}`}
                      initial={reduced ? false : { scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                      className="absolute -top-1.5 -right-2 inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-brand-red px-1 text-[10px] font-semibold text-white tabular-nums shadow-sm"
                      aria-hidden="true"
                    >
                      {totalQuantity > 99 ? '99+' : totalQuantity}
                    </motion.span>
                  </AnimatePresence>
                )}
              </div>

              <span
                className={cn(
                  'mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors duration-200',
                  active ? 'text-brand-navy' : 'text-brand-navy/50',
                )}
              >
                {tab.label}
              </span>
            </>
          );

          const sharedProps = {
            className: cn(
              'relative flex flex-1 flex-col items-center justify-center px-1 py-1.5 min-h-[48px]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan-deep/60 focus-visible:rounded-md',
            ),
            'aria-current': active ? ('page' as const) : undefined,
            'aria-label':
              isCart && totalQuantity > 0
                ? `${tab.label} (${totalQuantity} item${totalQuantity === 1 ? '' : 's'})`
                : tab.label,
          };

          if (tab.action === 'menu') {
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  haptic(6);
                  openMobileNav();
                }}
                {...sharedProps}
              >
                {inner}
              </button>
            );
          }

          return (
            <Link
              key={tab.id}
              to={tab.to ?? '/'}
              onClick={() => haptic(6)}
              {...sharedProps}
            >
              {inner}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
