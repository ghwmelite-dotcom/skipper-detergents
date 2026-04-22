import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Resets scroll position to the top of the page whenever the route pathname
 * changes. React Router does not do this by default — on a mobile app this
 * is essential; nothing feels worse than tapping a nav item and landing
 * halfway down the next page.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // `scroll` is slightly wider support than `scrollTo` on old WebViews,
    // but both work in every browser we care about. Use `instant` — the
    // route transition itself provides the visual continuity.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  return null;
}
