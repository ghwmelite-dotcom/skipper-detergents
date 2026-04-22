import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AnnouncementBar } from './AnnouncementBar';
import { Header } from './Header';
import { Footer } from './Footer';
import { MobileNav } from './MobileNav';
import { CartDrawer } from '@/components/cart/CartDrawer';

export function RootLayout() {
  const location = useLocation();
  const reduced = useReducedMotion();

  return (
    <div className="flex min-h-screen flex-col bg-brand-ivory">
      <AnnouncementBar />
      <Header />
      <MobileNav />
      <CartDrawer />
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 1 } : { opacity: 0, y: -6 }}
          transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
          className="flex-1"
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>
      <Footer />
    </div>
  );
}
