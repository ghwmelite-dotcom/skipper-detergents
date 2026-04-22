import { useParams } from 'react-router-dom';
import { PageStub } from './_PageStub';

export default function OrderConfirmation() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  return (
    <PageStub
      title={`Order ${orderNumber ?? ''}`}
      description="Thank you for your order."
      noindex
    />
  );
}
