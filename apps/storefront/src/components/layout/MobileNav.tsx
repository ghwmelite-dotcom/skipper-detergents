import { Link } from 'react-router-dom';
import { X, User, ChevronRight, Package } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/stores/uiStore';
import { useCategories } from '@/hooks/useCategories';
import { haptic } from '@/lib/haptic';
import { cn } from '@/lib/cn';

interface NavLink {
  to: string;
  label: string;
  icon?: LucideIcon;
}

const NAV_LINKS: NavLink[] = [
  { to: '/', label: 'Home' },
  { to: '/shop', label: 'Shop' },
  { to: '/track', label: 'Track order', icon: Package },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
  { to: '/faq', label: 'FAQ' },
];

/**
 * MobileNav — bottom-rise sheet driven from the Menu tab. Chosen over a
 * side-drawer because bottom sheets feel distinctly app-native on phones
 * (the reachable thumb zone) while side drawers read as web-legacy.
 *
 * Contents, top to bottom:
 *   1. Drag handle + close button (v1: handle is decorative)
 *   2. Sign-in placeholder row (disabled until auth lands)
 *   3. Purchase mode row (Single / Bulk)
 *   4. Primary nav links, large tap targets, Fraunces display
 *   5. Dominant categories quick-links
 *   6. Est. stamp
 */
export function MobileNav() {
  const open = useUiStore((s) => s.mobileNavOpen);
  const close = useUiStore((s) => s.closeMobileNav);
  const reduced = useReducedMotion();
  const { data: categories } = useCategories();

  const topCategories = (categories ?? [])
    .filter((c) => c.is_active)
    .slice(0, 6);

  return (
    <Sheet open={open} onClose={close} side="bottom" title="Navigation" maxHeight="85vh">
      {/* Drag handle */}
      <div className="pt-2 pb-1 flex justify-center" aria-hidden="true">
        <span className="block h-[5px] w-10 rounded-full bg-brand-navy/20" />
      </div>

      <div className="flex items-center justify-between px-5 pt-2 pb-3">
        <span className="font-display text-xl font-medium text-brand-navy tracking-tight">
          Menu
        </span>
        <Button variant="ghost" size="icon" onClick={close} aria-label="Close menu">
          <X className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto scroll-touch px-5 pb-6">
        {/* Sign-in row (placeholder) */}
        <button
          type="button"
          disabled
          className="w-full flex items-center justify-between gap-3 h-16 rounded-lg border border-brand-navy/10 bg-brand-sand/40 px-4 mb-5 text-left opacity-80 cursor-not-allowed"
          aria-label="Sign in — coming soon"
        >
          <span className="inline-flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-navy/5">
              <User className="h-5 w-5 text-brand-navy/70" aria-hidden="true" strokeWidth={1.75} />
            </span>
            <span className="flex flex-col text-[14px]">
              <span className="font-medium text-brand-navy">Sign in</span>
              <span className="text-[11px] text-brand-navy/55 tracking-wide uppercase">
                Coming soon
              </span>
            </span>
          </span>
          <ChevronRight className="h-4 w-4 text-brand-navy/40" aria-hidden="true" />
        </button>

        {/* Primary nav */}
        <nav className="flex flex-col gap-0.5 mb-6" aria-label="Mobile">
          {NAV_LINKS.map((link, idx) => (
            <motion.div
              key={link.to}
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={open ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
              transition={{
                delay: 0.05 + idx * 0.04,
                duration: 0.35,
                ease: [0.2, 0.8, 0.2, 1],
              }}
            >
              <Link
                to={link.to}
                onClick={() => {
                  haptic(6);
                  close();
                }}
                className={cn(
                  'group flex items-center justify-between gap-3 min-h-16 py-3 px-3 -mx-3 rounded-md',
                  'font-display text-[22px] leading-none font-medium text-brand-navy',
                  'transition-colors active:bg-brand-navy/5 hover:text-brand-cyan-deep',
                )}
              >
                <span className="inline-flex items-center gap-2.5">
                  {link.icon && (
                    <link.icon
                      className="h-5 w-5 text-brand-cyan-deep"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  )}
                  {link.label}
                </span>
                <ChevronRight
                  className="h-4 w-4 text-brand-navy/30 group-hover:text-brand-cyan-deep group-hover:translate-x-0.5 transition-all"
                  aria-hidden="true"
                />
              </Link>
            </motion.div>
          ))}
        </nav>

        {/* Categories */}
        {topCategories.length > 0 && (
          <div className="mb-6">
            <p className="editorial-label text-brand-navy/60 mb-3">Shop by category</p>
            <div className="flex flex-wrap gap-2">
              {topCategories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/shop/${cat.slug}`}
                  onClick={close}
                  className="inline-flex h-9 items-center rounded-full border border-brand-navy/15 bg-brand-ivory px-3.5 text-[12px] font-medium text-brand-navy/80 hover:border-brand-navy/40 hover:text-brand-navy transition-colors"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Footer note */}
        <p className="editorial-label text-brand-navy/50 pt-4 border-t border-brand-navy/10">
          Est. 2026 · Accra, Ghana
        </p>
      </div>
    </Sheet>
  );
}
