import { PageStub } from './_PageStub';

export default function About() {
  return (
    <PageStub
      title="About Skipper Detergents"
      description="A Ghanaian household-essentials brand. Our story, our products, our commitment to quality."
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'About' }]}
    />
  );
}
