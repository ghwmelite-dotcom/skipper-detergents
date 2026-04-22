import { PageStub } from './_PageStub';

export default function BulkOrder() {
  return (
    <PageStub
      title="Bulk Orders"
      description="Save more when you order in quantity. Tiered pricing for offices, schools, retailers, and events."
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Bulk' }]}
    />
  );
}
