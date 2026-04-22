import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, Check, X } from 'lucide-react';
import {
  ORDER_STATUSES,
  type Order,
  type OrderItem,
  type Customer,
  type ActivityLogEntry,
  type OrderStatus,
} from '@skipper/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select, Input, Textarea } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { OrderStatusPill, PaymentStatusPill } from '@/components/ui/StatusPill';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency, formatDateTime } from '@/lib/format';

interface OrderDetail extends Order {
  items: Array<OrderItem & { primary_image_url: string | null }>;
  customer: Customer | null;
  activity: ActivityLogEntry[];
}

export function OrderDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const toast = useToast();
  const { token } = useAuthStore();

  const { data: order, isLoading } = useQuery({
    queryKey: ['admin-order', id],
    queryFn: () => api.get<OrderDetail>(`/api/admin/orders/${id}`),
    enabled: !!id,
  });

  const [newStatus, setNewStatus] = useState<OrderStatus>('pending');
  const [tracking, setTracking] = useState('');
  const [note, setNote] = useState('');
  const [confirmReject, setConfirmReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [editingFee, setEditingFee] = useState(false);
  const [feeInput, setFeeInput] = useState('');

  const statusMutation = useMutation({
    mutationFn: () =>
      api.patch(`/api/admin/orders/${id}/status`, {
        status: newStatus,
        ...(newStatus === 'shipped' && tracking ? { tracking_number: tracking } : {}),
      }),
    onSuccess: () => {
      toast.push('Status updated', 'success');
      qc.invalidateQueries({ queryKey: ['admin-order', id] });
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (e: Error) => toast.push(e.message, 'error'),
  });

  const paymentMutation = useMutation({
    mutationFn: (vars: { action: 'confirm' | 'reject'; reason?: string }) =>
      api.patch(`/api/admin/orders/${id}/payment`, vars),
    onSuccess: (_d, vars) => {
      toast.push(
        vars.action === 'confirm' ? 'Payment confirmed' : 'Payment rejected',
        vars.action === 'confirm' ? 'success' : 'warning',
      );
      qc.invalidateQueries({ queryKey: ['admin-order', id] });
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      setConfirmReject(false);
      setRejectReason('');
    },
    onError: (e: Error) => toast.push(e.message, 'error'),
  });

  const deliveryFeeMutation = useMutation({
    mutationFn: (fee: number) =>
      api.patch(`/api/admin/orders/${id}/delivery-fee`, { delivery_fee: fee }),
    onSuccess: () => {
      toast.push('Delivery fee updated', 'success');
      qc.invalidateQueries({ queryKey: ['admin-order', id] });
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      setEditingFee(false);
    },
    onError: (e: Error) => toast.push(e.message, 'error'),
  });

  const noteMutation = useMutation({
    mutationFn: () => api.post(`/api/admin/orders/${id}/notes`, { text: note }),
    onSuccess: () => {
      toast.push('Note added', 'success');
      setNote('');
      qc.invalidateQueries({ queryKey: ['admin-order', id] });
    },
    onError: (e: Error) => toast.push(e.message, 'error'),
  });

  if (isLoading || !order) {
    return (
      <div>
        <Link to="/orders" className="inline-flex items-center gap-1 text-xs text-ink-500">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to orders
        </Link>
        <p className="mt-4 text-ink-500">Loading…</p>
      </div>
    );
  }

  const isManual = order.payment_method === 'manual_transfer';
  const canConfirmManual = isManual && order.payment_status === 'unpaid';

  return (
    <div>
      <div className="mb-3">
        <Link to="/orders" className="inline-flex items-center gap-1 text-xs text-ink-500 hover:text-ink-800">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to orders
        </Link>
      </div>
      <PageHeader
        title={`Order ${order.order_number}`}
        description={`Placed ${formatDateTime(order.created_at)}`}
        actions={
          <div className="flex items-center gap-2">
            <OrderStatusPill status={order.status} />
            <PaymentStatusPill status={order.payment_status} />
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader title="Items" subtitle={`${order.items.length} line items`} />
            <CardBody className="p-0">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="pl-4 w-10"></th>
                    <th>Product</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Unit</th>
                    <th className="text-right pr-4">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((it) => (
                    <tr key={it.id}>
                      <td className="pl-4">
                        <div className="h-8 w-8 rounded border border-ink-200 bg-ink-50 overflow-hidden">
                          {it.primary_image_url && (
                            <img
                              src={it.primary_image_url}
                              alt={it.product_name}
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                      </td>
                      <td>
                        <Link
                          to={`/products/${it.product_id}`}
                          className="font-medium text-ink-900 hover:text-cyan-600"
                        >
                          {it.product_name}
                        </Link>
                        <div className="text-xs text-ink-500">
                          {it.sku ?? '—'}
                          {it.is_bulk_order && (
                            <>
                              {' · '}
                              <Badge tone="navy">Bulk</Badge>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="text-right tabular-nums">{it.quantity}</td>
                      <td className="text-right tabular-nums">{formatCurrency(it.unit_price)}</td>
                      <td className="text-right pr-4 tabular-nums font-medium">
                        {formatCurrency(it.line_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Totals" />
            <CardBody>
              <dl className="space-y-1.5 text-sm">
                <Row label="Subtotal" value={formatCurrency(order.subtotal)} />
                {order.bulk_discount > 0 && (
                  <Row
                    label="Bulk discount"
                    value={`- ${formatCurrency(order.bulk_discount)}`}
                    tone="success"
                  />
                )}
                {order.delivery_method === 'delivery' && order.payment_status === 'unpaid' ? (
                  editingFee ? (
                    <div className="flex items-center justify-between gap-2 py-1">
                      <span className="text-ink-600">Delivery</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-ink-500">GHS</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={feeInput}
                          onChange={(e) => setFeeInput(e.target.value)}
                          autoFocus
                          className="h-7 w-24 text-right tabular-nums"
                        />
                        <button
                          className="text-success-600 hover:text-success-500 disabled:opacity-40"
                          disabled={deliveryFeeMutation.isPending}
                          onClick={() => {
                            const n = Number.parseFloat(feeInput);
                            if (!Number.isFinite(n) || n < 0) {
                              toast.push('Enter a valid fee', 'warning');
                              return;
                            }
                            deliveryFeeMutation.mutate(n);
                          }}
                          title="Save"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          className="text-ink-500 hover:text-ink-800"
                          onClick={() => setEditingFee(false)}
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2 py-1">
                      <span className="text-ink-600">Delivery</span>
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums">{formatCurrency(order.delivery_fee)}</span>
                        <button
                          className="text-xs text-cyan-600 hover:text-cyan-500"
                          onClick={() => {
                            setFeeInput(String(order.delivery_fee));
                            setEditingFee(true);
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  <Row label="Delivery" value={formatCurrency(order.delivery_fee)} />
                )}
                {order.tax_amount > 0 && (
                  <Row label="Tax" value={formatCurrency(order.tax_amount)} />
                )}
                <div className="h-px bg-ink-100 my-2" />
                <Row
                  label={<span className="font-semibold">Total</span>}
                  value={<span className="font-semibold">{formatCurrency(order.total_amount)}</span>}
                />
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Payment" subtitle={order.payment_method} />
            <CardBody className="space-y-3">
              {order.paystack_reference && (
                <div className="text-xs">
                  <span className="text-ink-500">Paystack ref:</span>{' '}
                  <span className="font-mono text-ink-800">{order.paystack_reference}</span>
                </div>
              )}
              {order.manual_payment_proof_url && (
                <div>
                  <div className="text-xs text-ink-500 mb-1">Proof of payment</div>
                  <a
                    href={
                      token
                        ? `${order.manual_payment_proof_url}${
                            order.manual_payment_proof_url.includes('?') ? '&' : '?'
                          }token=${encodeURIComponent(token)}`
                        : order.manual_payment_proof_url
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-cyan-600 hover:underline"
                  >
                    Open proof image
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              {canConfirmManual && (
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    onClick={() => paymentMutation.mutate({ action: 'confirm' })}
                    loading={paymentMutation.isPending}
                  >
                    Confirm payment
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setConfirmReject(true)}
                  >
                    Reject
                  </Button>
                </div>
              )}
              {order.manual_payment_confirmed_at && (
                <p className="text-xs text-success-600">
                  Confirmed {formatDateTime(order.manual_payment_confirmed_at)}
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Status controls" />
            <CardBody className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="new-status">New status</Label>
                  <Select
                    id="new-status"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                  >
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </div>
                {newStatus === 'shipped' && (
                  <div>
                    <Label htmlFor="tracking">Tracking number</Label>
                    <Input
                      id="tracking"
                      value={tracking}
                      onChange={(e) => setTracking(e.target.value)}
                      placeholder="Required for shipped"
                    />
                  </div>
                )}
              </div>
              <Button
                onClick={() => statusMutation.mutate()}
                loading={statusMutation.isPending}
                disabled={newStatus === 'shipped' && !tracking}
              >
                Update status
              </Button>
              {order.tracking_number && (
                <p className="text-xs text-ink-500">
                  Tracking: <span className="font-mono">{order.tracking_number}</span>
                </p>
              )}
              {order.delivered_at && (
                <p className="text-xs text-success-600">
                  Delivered {formatDateTime(order.delivered_at)}
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Notes" />
            <CardBody className="space-y-3">
              {order.notes && (
                <pre className="whitespace-pre-wrap rounded border border-ink-100 bg-ink-50 p-3 text-xs text-ink-700 font-sans">
                  {order.notes}
                </pre>
              )}
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Add a note (visible to admins only)"
              />
              <Button
                size="sm"
                disabled={!note.trim() || noteMutation.isPending}
                loading={noteMutation.isPending}
                onClick={() => noteMutation.mutate()}
              >
                Add note
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Activity" />
            <CardBody className="p-0">
              {order.activity.length === 0 ? (
                <p className="p-4 text-sm text-ink-500">No activity recorded for this order.</p>
              ) : (
                <ul className="divide-y divide-ink-100">
                  {order.activity.map((a) => (
                    <li key={a.id} className="px-4 py-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-mono text-ink-800">{a.action}</span>
                        <span className="text-xs text-ink-500">
                          {formatDateTime(a.created_at)}
                        </span>
                      </div>
                      {a.details && (
                        <pre className="mt-1 text-xs text-ink-500 whitespace-pre-wrap font-mono">
                          {a.details}
                        </pre>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Customer" />
            <CardBody className="space-y-1 text-sm">
              <div className="font-medium text-ink-900">{order.delivery_name}</div>
              <div className="text-ink-600">{order.delivery_email}</div>
              <div className="text-ink-600">{order.delivery_phone}</div>
              {order.customer && (
                <div className="mt-2 text-xs text-ink-500">
                  Customer: {order.customer.total_orders} orders ·{' '}
                  {formatCurrency(order.customer.total_spent)} lifetime
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Delivery" />
            <CardBody className="space-y-1 text-sm">
              <div>
                <span className="text-ink-500">Method:</span>{' '}
                <span className="font-medium">{order.delivery_method}</span>
              </div>
              {order.delivery_method === 'delivery' && (
                <>
                  <div className="text-ink-800">{order.delivery_address}</div>
                  <div className="text-ink-600 text-xs">
                    {order.delivery_city}
                    {order.delivery_region && ` · ${order.delivery_region}`}
                  </div>
                  {order.delivery_gps && (
                    <div className="text-xs text-ink-500">GPS: {order.delivery_gps}</div>
                  )}
                </>
              )}
              {order.delivery_notes && (
                <p className="mt-1 text-xs text-ink-600">Notes: {order.delivery_notes}</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReject}
        title="Reject this payment?"
        description="Order stays unpaid. Add a reason — it's saved to the activity log."
        tone="danger"
        confirmLabel="Reject"
        loading={paymentMutation.isPending}
        onCancel={() => setConfirmReject(false)}
        onConfirm={() => {
          const reason = rejectReason.trim();
          paymentMutation.mutate(reason ? { action: 'reject', reason } : { action: 'reject' });
        }}
      >
        <div>
          <Label htmlFor="reject-reason">Reason (optional)</Label>
          <Textarea
            id="reject-reason"
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g., proof image is unreadable, amount doesn't match order total"
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  tone?: 'success';
}): JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-600">{label}</dt>
      <dd className={tone === 'success' ? 'text-success-600 tabular-nums' : 'tabular-nums'}>
        {value}
      </dd>
    </div>
  );
}
