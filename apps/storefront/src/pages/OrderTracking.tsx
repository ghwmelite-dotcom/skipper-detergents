import { useParams } from 'react-router-dom';
import { PageStub } from './_PageStub';

export default function OrderTracking() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  return (
    <PageStub
      title={`Track order ${orderNumber ?? ''}`}
      description="See the status of your order."
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Order tracking' }]}
      noindex
    />
  );
}
