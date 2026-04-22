import { PageStub } from './_PageStub';

export default function Cart() {
  return (
    <PageStub
      title="Your Cart"
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Cart' }]}
      noindex
    />
  );
}
