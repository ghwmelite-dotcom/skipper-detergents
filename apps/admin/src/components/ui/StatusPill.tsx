import type { OrderStatus, PaymentStatus } from '@skipper/shared';
import { Badge } from './Badge';

export function OrderStatusPill({ status }: { status: OrderStatus }): JSX.Element {
  switch (status) {
    case 'pending':
      return <Badge tone="warning">Pending</Badge>;
    case 'confirmed':
      return <Badge tone="info">Confirmed</Badge>;
    case 'processing':
      return <Badge tone="info">Processing</Badge>;
    case 'shipped':
      return <Badge tone="navy">Shipped</Badge>;
    case 'delivered':
      return <Badge tone="success">Delivered</Badge>;
    case 'completed':
      return <Badge tone="success">Completed</Badge>;
    case 'cancelled':
      return <Badge tone="danger">Cancelled</Badge>;
    case 'refunded':
      return <Badge tone="danger">Refunded</Badge>;
    default:
      return <Badge tone="neutral">{status}</Badge>;
  }
}

export function PaymentStatusPill({ status }: { status: PaymentStatus }): JSX.Element {
  switch (status) {
    case 'paid':
      return <Badge tone="success">Paid</Badge>;
    case 'unpaid':
      return <Badge tone="warning">Unpaid</Badge>;
    case 'refunded':
      return <Badge tone="danger">Refunded</Badge>;
    default:
      return <Badge tone="neutral">{status}</Badge>;
  }
}
