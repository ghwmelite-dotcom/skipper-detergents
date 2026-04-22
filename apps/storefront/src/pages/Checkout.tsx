import { PageStub } from './_PageStub';

export default function Checkout() {
  return (
    <PageStub
      title="Checkout"
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Cart', href: '/cart' },
        { label: 'Checkout' },
      ]}
      noindex
    />
  );
}
