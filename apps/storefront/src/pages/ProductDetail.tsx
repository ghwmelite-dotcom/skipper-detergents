import { useParams } from 'react-router-dom';
import { PageStub } from './_PageStub';

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <PageStub
      title={slug?.replace(/-/g, ' ') ?? 'Product'}
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Shop', href: '/shop' },
        { label: slug ?? 'Product' },
      ]}
    />
  );
}
