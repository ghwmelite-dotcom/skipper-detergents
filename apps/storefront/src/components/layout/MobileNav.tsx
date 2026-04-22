import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/stores/uiStore';

const NAV_LINKS = [
  { to: '/shop', label: 'Shop' },
  { to: '/bulk', label: 'Bulk' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
  { to: '/faq', label: 'FAQ' },
];

export function MobileNav() {
  const open = useUiStore((s) => s.mobileNavOpen);
  const close = useUiStore((s) => s.closeMobileNav);
  const reduced = useReducedMotion();

  return (
    <Sheet open={open} onClose={close} side="left" title="Navigation">
      <div className="flex items-center justify-between px-5 py-4 border-b border-brand-navy/10">
        <span className="font-display text-xl font-medium text-brand-navy tracking-tight">
          Menu
        </span>
        <Button variant="ghost" size="icon" onClick={close} aria-label="Close menu">
          <X className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>
      <nav className="flex flex-col p-5 gap-1" aria-label="Mobile">
        {NAV_LINKS.map((link, idx) => (
          <motion.div
            key={link.to}
            initial={reduced ? false : { opacity: 0, x: -12 }}
            animate={open ? { opacity: 1, x: 0 } : { opacity: 0, x: -12 }}
            transition={{ delay: 0.1 + idx * 0.05, duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <Link
              to={link.to}
              onClick={close}
              className="block py-3 px-2 font-display text-[28px] leading-tight font-medium text-brand-navy hover:text-brand-cyan-deep transition-colors tracking-tight"
            >
              {link.label}
            </Link>
          </motion.div>
        ))}
      </nav>
      <div className="mt-auto px-5 py-5 border-t border-brand-navy/10">
        <p className="editorial-label text-brand-navy/60">Est. 2026 · Accra, Ghana</p>
      </div>
    </Sheet>
  );
}
