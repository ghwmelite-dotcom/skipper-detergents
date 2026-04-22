import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
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
    (typeof window === 'undefined' ? 'https://skipperdetergents.com.gh' : window.location.origin);

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
      <nav aria-label="Breadcrumb" className="container py-3">
        <ol className="flex items-center flex-wrap gap-1 text-sm text-muted-foreground">
          {items.map((item, idx) => (
            <li key={`${item.label}-${idx}`} className="flex items-center gap-1">
              {idx > 0 && <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
              {item.href && idx < items.length - 1 ? (
                <Link to={item.href} className="hover:text-foreground">
                  {item.label}
                </Link>
              ) : (
                <span className={idx === items.length - 1 ? 'text-foreground font-medium' : ''}>
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
