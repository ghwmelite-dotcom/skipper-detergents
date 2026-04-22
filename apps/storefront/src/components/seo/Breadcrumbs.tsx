import { Link } from 'react-router-dom';
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
        <ol className="flex items-center flex-wrap gap-2 text-[11px] tracking-wider uppercase text-brand-navy/55 font-medium">
          {items.map((item, idx) => (
            <li key={`${item.label}-${idx}`} className="flex items-center gap-2">
              {idx > 0 && <span className="text-brand-navy/25" aria-hidden="true">/</span>}
              {item.href && idx < items.length - 1 ? (
                <Link
                  to={item.href}
                  className="hover:text-brand-navy transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={idx === items.length - 1 ? 'text-brand-navy' : ''}
                >
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd data={jsonLd} />
    </>
  );
}
