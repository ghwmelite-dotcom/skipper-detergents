import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Save } from 'lucide-react';
import {
  CUSTOMER_STATUSES,
  CUSTOMER_STATUS_LABELS,
  type CustomerStatus,
} from '@skipper/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select, Textarea } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { useAuthStore } from '@/stores/authStore';

interface CustomerDetail {
  email: string;
  name: string;
  phone: string;
  city: string | null;
  region: string | null;
  total_orders: number;
  total_spent: number;
  paid_spent: number;
  last_order_at: string;
  first_order_at: string;
  status: CustomerStatus;
  notes: string | null;
  orders: Array<{
    id: string;
    order_number: string;
    status: string;
    payment_status: string;
    total_amount: number;
    created_at: string;
  }>;
}

function statusTone(s: CustomerStatus): 'success' | 'info' | 'warning' | 'danger' | 'neutral' {
  if (s === 'vip') return 'info';
  if (s === 'bulk') return 'success';
  if (s === 'blocked') return 'danger';
  return 'neutral';
}

export function CustomerDetailPage(): JSX.Element {
  const { email: rawEmail } = useParams<{ email: string }>();
  const email = rawEmail ?? '';
  const qc = useQueryClient();
  const toast = useToast();
  const me = useAuthStore((s) => s.user);
  const canEdit = me?.role === 'super_admin' || me?.role === 'admin';

  const { data, isLoading } = useQuery({
    queryKey: ['admin-customer', email],
    queryFn: () => api.get<CustomerDetail>(`/api/admin/customers/${encodeURIComponent(email)}`),
    enabled: !!email,
  });

  const [status, setStatus] = useState<CustomerStatus>('regular');
  const [notes, setNotes] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data) {
      setStatus(data.status);
      setNotes(data.notes ?? '');
      setDirty(false);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: (v: { status: CustomerStatus; notes: string }) =>
      api.patch(`/api/admin/customers/${encodeURIComponent(email)}`, v),
    onSuccess: () => {
      toast.push('Customer updated', 'success');
      qc.invalidateQueries({ queryKey: ['admin-customer', email] });
      qc.invalidateQueries({ queryKey: ['admin-customers'] });
      setDirty(false);
    },
    onError: (e: Error) => toast.push(e.message, 'error'),
  });

  if (isLoading) {
    return <div className="text-sm text-ink-500">Loading…</div>;
  }

  if (!data) {
    return <div className="text-sm text-ink-500">Customer not found.</div>;
  }

  return (
    <div>
      <Link
        to="/customers"
        className="mb-3 inline-flex items-center gap-1 text-xs text-ink-500 hover:text-ink-700"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to customers
      </Link>

      <PageHeader
        title={data.name || data.email}
        description={data.email}
        actions={
          canEdit ? (
            <Button
              onClick={() => mutation.mutate({ status, notes })}
              loading={mutation.isPending}
              disabled={!dirty}
            >
              <Save className="h-3.5 w-3.5" /> Save changes
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader title="Order history" subtitle={`${data.total_orders} total`} />
            <CardBody className="p-0">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="pl-4">Order</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th className="text-right">Total</th>
                    <th className="pr-4">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-ink-500">
                        No orders.
                      </td>
                    </tr>
                  ) : (
                    data.orders.map((o) => (
                      <tr key={o.id}>
                        <td className="pl-4">
                          <Link
                            to={`/orders/${o.id}`}
                            className="font-mono text-xs text-cyan-600 hover:underline"
                          >
                            {o.order_number}
                          </Link>
                        </td>
                        <td>
                          <Badge tone="neutral">{o.status}</Badge>
                        </td>
                        <td>
                          <Badge tone={o.payment_status === 'paid' ? 'success' : 'warning'}>
                            {o.payment_status}
                          </Badge>
                        </td>
                        <td className="text-right tabular-nums font-medium">
                          {formatCurrency(o.total_amount)}
                        </td>
                        <td className="pr-4 text-xs text-ink-600">
                          {formatDateTime(o.created_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Summary" />
            <CardBody className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-ink-500">Status</span>
                <Badge tone={statusTone(data.status)}>
                  {CUSTOMER_STATUS_LABELS[data.status]}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">Total orders</span>
                <span className="tabular-nums font-medium">{data.total_orders}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">Total spent</span>
                <span className="tabular-nums font-medium">
                  {formatCurrency(data.total_spent)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">Paid</span>
                <span className="tabular-nums text-success-600 font-medium">
                  {formatCurrency(data.paid_spent)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">Phone</span>
                <span className="font-mono text-xs">{data.phone}</span>
              </div>
              {(data.city || data.region) && (
                <div className="flex items-center justify-between">
                  <span className="text-ink-500">Location</span>
                  <span className="text-xs">
                    {data.city}
                    {data.region ? `, ${data.region}` : ''}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-ink-500">Customer since</span>
                <span className="text-xs">{formatDateTime(data.first_order_at)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">Last order</span>
                <span className="text-xs">{formatDateTime(data.last_order_at)}</span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Admin controls"
              subtitle={canEdit ? undefined : 'Read-only for your role.'}
            />
            <CardBody className="space-y-3">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  id="status"
                  disabled={!canEdit}
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value as CustomerStatus);
                    setDirty(true);
                  }}
                >
                  {CUSTOMER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {CUSTOMER_STATUS_LABELS[s]}
                    </option>
                  ))}
                </Select>
                <p className="mt-1 text-xs text-ink-500">
                  <strong>Bulk buyer</strong> grants tiered pricing at checkout.{' '}
                  <strong>VIP</strong> is a flag for priority handling.{' '}
                  <strong>Blocked</strong> prevents new orders.
                </p>
              </div>
              <div>
                <Label htmlFor="notes">Internal notes</Label>
                <Textarea
                  id="notes"
                  rows={4}
                  disabled={!canEdit}
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="Not shown to the customer."
                />
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
