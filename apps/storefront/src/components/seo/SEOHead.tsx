import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { STORE_NAME } from '@/lib/env';

export interface SEOHeadProps {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  noindex?: boolean;
}

const CANONICAL_ORIGIN =
  (import.meta.env.VITE_STOREFRONT_ORIGIN as string | undefined)?.replace(/\/$/, '') ||
  'https://skipperdetergents.pages.dev';

export function SEOHead({
  title,
  description,
  image,
  url,
  type = 'website',
  noindex = false,
}: SEOHeadProps) {
  const fullTitle = title.includes(STORE_NAME) ? title : `${title} | ${STORE_NAME}`;
  // Strip query strings / hash from the canonical so ?sort=, ?page=, and
  // UTM permutations don't crawl as duplicate pages.
  const location = useLocation();
  const canonical = `${CANONICAL_ORIGIN}${location.pathname}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      {noindex && <meta name="robots" content="noindex,follow" />}
      {!noindex && <link rel="canonical" href={canonical} />}

      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      {image && <meta property="og:image" content={image} />}
      <meta property="og:url" content={url ?? canonical} />
      <meta property="og:site_name" content={STORE_NAME} />

      <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      {image && <meta name="twitter:image" content={image} />}
    </Helmet>
  );
}
