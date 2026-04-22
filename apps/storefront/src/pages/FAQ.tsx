import { PageStub } from './_PageStub';

export default function FAQ() {
  return (
    <PageStub
      title="Frequently Asked Questions"
      description="Answers to common questions about ordering, delivery, returns, and bulk pricing."
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'FAQ' }]}
    />
  );
}
