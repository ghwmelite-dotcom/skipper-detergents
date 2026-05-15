import { Link } from 'react-router-dom';
import { Home, ChevronRight } from 'lucide-react';
import { JsonLd } from './JsonLd';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  origin?: string;
}

export function Breadcrumbs({ items, origin }: BreadcrumbsProps) {
  const base =
    origin ??
    (typeof window === 'undefined'
      ? 'https://skipperdetergents.com.gh'
      : window.location.origin);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.label,
      ...(item.href ? { item: `${base}${item.href}` } : {}),
    })),
  };

  return (
    <>
      <nav aria-label="Breadcrumb" className="container pt-5">
        <ol className="inline-flex items-center flex-wrap gap-1.5 rounded-full border border-brand-navy/12 bg-brand-ivory/80 backdrop-blur-sm px-3 py-1.5 shadow-[0_2px_10px_rgba(11,37,69,0.04)]">
          {items.map((item, idx) => {
            const isLast = idx === items.length - 1;
            const isFirst = idx === 0;
            const labelEl = (
              <span className="inline-flex items-center gap-1.5">
                {isFirst && (
                  <Home className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                )}
                <span className="text-[11px] tracking-[0.18em] uppercase font-semibold">
                  {item.label}
                </span>
              </span>
            );
            return (
              <li key={`${item.label}-${idx}`} className="inline-flex items-center gap-1.5">
                {idx > 0 && (
                  <ChevronRight
                    className="h-3.5 w-3.5 text-brand-cyan-deep/70"
                    strokeWidth={2.25}
                    aria-hidden="true"
                  />
                )}
                {item.href && !isLast ? (
                  <Link
                    to={item.href}
                    className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-brand-navy/70 hover:text-brand-navy hover:bg-brand-navy/5 transition-colors"
                  >
                    {labelEl}
                  </Link>
                ) : (
                  <span
                    aria-current={isLast ? 'page' : undefined}
                    className={
                      isLast
                        ? 'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-brand-navy text-brand-ivory shadow-sm'
                        : 'inline-flex items-center gap-1.5 h-7 px-2.5 text-brand-navy/70'
                    }
                  >
                    {labelEl}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <JsonLd data={jsonLd} />
    </>
  );
}
