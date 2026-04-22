import { Helmet } from 'react-helmet-async';

export interface JsonLdProps<T> {
  data: T;
}

export function JsonLd<T>({ data }: JsonLdProps<T>) {
  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(data)}</script>
    </Helmet>
  );
}
