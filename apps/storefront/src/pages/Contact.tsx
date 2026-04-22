import { PageStub } from './_PageStub';

export default function Contact() {
  return (
    <PageStub
      title="Contact Us"
      description="Get in touch with the Skipper Detergents team."
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Contact' }]}
    />
  );
}
