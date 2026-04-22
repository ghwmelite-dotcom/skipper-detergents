import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
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

  return (
    <Sheet open={open} onClose={close} side="left" title="Navigation">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="font-semibold">Menu</h2>
        <Button variant="ghost" size="icon" onClick={close} aria-label="Close menu">
          <X className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>
      <nav className="flex flex-col p-4 gap-1" aria-label="Mobile">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            onClick={close}
            className="py-3 px-3 rounded-sm text-base font-medium hover:bg-accent hover:text-accent-foreground"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </Sheet>
  );
}
