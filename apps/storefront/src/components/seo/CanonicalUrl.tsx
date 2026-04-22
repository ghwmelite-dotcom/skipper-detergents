import { Helmet } from 'react-helmet-async';

export function CanonicalUrl({ path }: { path: string }) {
  const origin =
    typeof window === 'undefined' ? 'https://skipperdetergents.com.gh' : window.location.origin;
  return (
    <Helmet>
      <link rel="canonical" href={`${origin}${path}`} />
    </Helmet>
  );
}
