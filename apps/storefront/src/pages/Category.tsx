import { useParams } from 'react-router-dom';
import { PageStub } from './_PageStub';

export default function Category() {
  const { slug } = useParams<{ slug: string }>();
  const label = slug ? slug.replace(/-/g, ' ') : 'Category';
  const title = label.replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <PageStub
      title={title}
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Shop', href: '/shop' },
        { label: title },
      ]}
    />
  );
}
