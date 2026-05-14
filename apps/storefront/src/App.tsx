import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { RootLayout } from '@/components/layout/RootLayout';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

const Home = lazy(() => import('@/pages/Home'));
const Shop = lazy(() => import('@/pages/Shop'));
const Category = lazy(() => import('@/pages/Category'));
const ProductDetail = lazy(() => import('@/pages/ProductDetail'));
const BulkOrder = lazy(() => import('@/pages/BulkOrder'));
const Cart = lazy(() => import('@/pages/Cart'));
const Checkout = lazy(() => import('@/pages/Checkout'));
const OrderConfirmation = lazy(() => import('@/pages/OrderConfirmation'));
const OrderTracking = lazy(() => import('@/pages/OrderTracking'));
const TrackOrderLookup = lazy(() => import('@/pages/TrackOrderLookup'));
const About = lazy(() => import('@/pages/About'));
const Contact = lazy(() => import('@/pages/Contact'));
const FAQ = lazy(() => import('@/pages/FAQ'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const NotFound = lazy(() => import('@/pages/NotFound'));

export default function App() {
  return (
    <Routes>
      <Route
        element={
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-[60vh]">
                <LoadingSpinner />
              </div>
            }
          >
            <RootLayout />
          </Suspense>
        }
      >
        <Route index element={<Home />} />
        <Route path="shop" element={<Shop />} />
        <Route path="shop/:slug" element={<Category />} />
        <Route path="product/:slug" element={<ProductDetail />} />
        <Route path="bulk" element={<BulkOrder />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="order/:orderNumber" element={<OrderConfirmation />} />
        <Route path="track" element={<TrackOrderLookup />} />
        <Route path="track/:orderNumber" element={<OrderTracking />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="faq" element={<FAQ />} />
        <Route path="privacy" element={<PrivacyPolicy />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
