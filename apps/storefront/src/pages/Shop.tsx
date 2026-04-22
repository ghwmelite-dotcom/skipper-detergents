import { PageStub } from './_PageStub';

export default function Shop() {
  return (
    <PageStub
      title="Shop"
      description="Every Skipper product — detergents, tissue, paper towels, bathroom accessories, and more."
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Shop' }]}
    />
  );
}
