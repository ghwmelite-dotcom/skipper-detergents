import { Link } from 'react-router-dom';
import { STORE_NAME } from '@/lib/env';
import { usePublicSettings } from '@/hooks/useSettings';

export function Footer() {
  const { data: settings } = usePublicSettings();
  const email = settings?.store_email ?? 'hello@skipperdetergents.com.gh';
  const phone = settings?.store_phone ?? '0302 000 000';

  return (
    <footer
      className="relative mt-24 bg-brand-navy text-brand-ivory noise-texture"
      role="contentinfo"
    >
      <div className="container pt-20 pb-10">
        <div className="grid gap-12 md:grid-cols-12">
          {/* Brand column */}
          <div className="md:col-span-5 space-y-6">
            <Link to="/" className="inline-flex items-center gap-3 text-brand-ivory">
              <img
                src="/logo-mark.svg"
                alt=""
                aria-hidden="true"
                className="h-11 w-11 shrink-0 invert"
                draggable={false}
              />
              <span className="inline-flex items-baseline">
                <span className="font-display text-[32px] leading-none font-medium tracking-[-0.02em]">
                  Skipper
                </span>
                <span className="font-display-italic text-[32px] leading-none font-normal tracking-[-0.02em] ml-1 text-brand-cyan">
                  CleanCare
                </span>
              </span>
            </Link>
            <p className="text-brand-ivory/70 text-[15px] leading-relaxed max-w-sm font-light">
              Premium cleaning and paper essentials for Ghanaian homes. Est. 2026, shipped from
              Accra across the country.
            </p>
            <p className="text-[11px] uppercase tracking-[0.22em] text-brand-ivory/45">
              A Skipper Limited company
            </p>
            <div className="space-y-1.5 text-sm">
              <a
                href={`mailto:${email}`}
                className="block text-brand-ivory/80 hover:text-brand-cyan transition-colors"
              >
                {email}
              </a>
              <a
                href={`tel:${phone.replace(/\s+/g, '')}`}
                className="block text-brand-ivory/80 hover:text-brand-cyan transition-colors tabular-nums"
              >
                {phone}
              </a>
            </div>
          </div>

          {/* Links */}
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8 md:gap-6">
            <div>
              <h3 className="editorial-label text-brand-cyan mb-4">Shop</h3>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link to="/shop" className="text-brand-ivory/75 hover:text-brand-ivory transition-colors">
                    All products
                  </Link>
                </li>
                <li>
                  <Link to="/bulk" className="text-brand-ivory/75 hover:text-brand-ivory transition-colors">
                    Bulk pricing
                  </Link>
                </li>
                <li>
                  <Link to="/cart" className="text-brand-ivory/75 hover:text-brand-ivory transition-colors">
                    Cart
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="editorial-label text-brand-cyan mb-4">Company</h3>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link to="/about" className="text-brand-ivory/75 hover:text-brand-ivory transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="text-brand-ivory/75 hover:text-brand-ivory transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link to="/faq" className="text-brand-ivory/75 hover:text-brand-ivory transition-colors">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="editorial-label text-brand-cyan mb-4">Service</h3>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link to="/faq" className="text-brand-ivory/75 hover:text-brand-ivory transition-colors">
                    Help / FAQ
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="text-brand-ivory/75 hover:text-brand-ivory transition-colors">
                    Privacy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Pull quote */}
        <div className="mt-16 pt-10 border-t border-brand-ivory/15">
          <p className="font-display-italic text-[22px] md:text-[28px] leading-[1.2] text-brand-ivory/90 max-w-2xl font-light">
            Clean homes, honest prices &mdash; <span className="text-brand-cyan">delivered.</span>
          </p>
        </div>
      </div>

      <div className="border-t border-brand-ivory/10">
        <div className="container py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-brand-ivory/55 tracking-wider">
          <p className="uppercase">
            &copy; {new Date().getFullYear()} {STORE_NAME} · A Skipper Limited company · Accra, Ghana
          </p>
          <p className="uppercase">Built with care in Accra</p>
        </div>
      </div>
    </footer>
  );
}
