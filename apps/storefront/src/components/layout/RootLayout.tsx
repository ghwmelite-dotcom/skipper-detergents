import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { AnnouncementBar } from './AnnouncementBar';
import { Header } from './Header';
import { Footer } from './Footer';
import { MobileNav } from './MobileNav';
import { MobileTabBar } from './MobileTabBar';
import { ScrollToTop } from './ScrollToTop';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { cn } from '@/lib/cn';

export function RootLayout() {
  const location = useLocation();
  const reduced = useReducedMotion();

  // Detect mobile viewport — we use this only to pick the route-transition
  // style. Under md we want iOS-style horizontal slide; at md+ we keep the
  // existing fade-up so the desktop "editorial" feel doesn't get broken.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const isCheckout = location.pathname.startsWith('/checkout');

  // iOS push-style for mobile: new view slides in from the right, old
  // slides out to the left slightly. Subtle so it doesn't dominate.
  // Desktop: keep the original fade-and-lift.
  const mobileTransition = {
    initial: reduced ? { opacity: 1 } : { opacity: 0, x: 16 },
    animate: { opacity: 1, x: 0 },
    exit: reduced ? { opacity: 1 } : { opacity: 0, x: -8 },
    transition: reduced
      ? { duration: 0 }
      : { duration: 0.3, ease: [0.2, 0.8, 0.2, 1] as [number, number, number, number] },
  };
  const desktopTransition = {
    initial: reduced ? false : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: reduced ? { opacity: 1 } : { opacity: 0, y: -6 },
    transition: {
      duration: 0.45,
      ease: [0.2, 0.8, 0.2, 1] as [number, number, number, number],
    },
  };

  const t = isMobile ? mobileTransition : desktopTransition;

  return (
    <div className="flex min-h-screen flex-col bg-brand-ivory">
      <ScrollToTop />
      <AnnouncementBar />
      <Header />
      <MobileNav />
      <CartDrawer />
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={t.initial}
          animate={t.animate}
          exit={t.exit}
          transition={t.transition}
          className={cn(
            'flex-1',
            // Reserve room for the mobile tab bar (64px + safe area).
            // Checkout hides the bar, so no padding there.
            !isCheckout && 'pb-24 md:pb-0',
          )}
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>
      <Footer />
      <MobileTabBar />
    </div>
  );
}
