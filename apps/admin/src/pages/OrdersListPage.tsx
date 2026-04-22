import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  type Order,
} from '@skipper/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { OrderStatusPill, PaymentStatusPill } from '@/components/ui/StatusPill';
import { api } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/format';

interface AdminOrder extends Order {
  customer_email: string | null;
  customer_first_name: string | null;
  customer_last_name: string | null;
  item_count: number;
}

const PAGE_SIZE = 25;

export function OrdersListPage(): JSX.Element {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set('page', String(page));
    p.set('per_page', String(PAGE_SIZE));
    if (search) p.set('search', search);
    if (status) p.set('status', status);
    if (paymentMethod) p.set('payment_method', paymentMethod);
    if (paymentStatus) p.set('payment_status', paymentStatus);
    return p.toString();
  }, [page, search, status, paymentMethod, paymentStatus]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-orders', queryString],
    queryFn: () => api.getPaginated<AdminOrder>(`/api/admin/orders?${queryString}`),
  });

  const total = data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const orders = data?.data ?? [];

  return (
    <div>
      <PageHeader title="Orders" description={`${total} order${total === 1 ? '' : 's'}`} />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(searchInput.trim());
          }}
          className="relative flex-1 min-w-[260px] max-w-md"
        >
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-400 pointer-events-none" />
          <Input
            placeholder="Search order number, name, email"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8"
          />
        </form>
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="w-36"
        >
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select
          value={paymentMethod}
          onChange={(e) => {
            setPaymentMethod(e.target.value);
            setPage(1);
          }}
          className="w-40"
        >
          <option value="">All methods</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
        <Select
          value={paymentStatus}
          onChange={(e) => {
            setPaymentStatus(e.target.value);
            setPage(1);
          }}
          className="w-32"
        >
          <option value="">All payments</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        <CardBody className="p-0">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="pl-4">Order</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Method</th>
                <th>Payment</th>
                <th>Status</th>
                <th className="text-right pr-4">Total</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-ink-500">
                    Loading…
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-ink-500">
                    No orders match.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id}>
                    <td className="pl-4">
                      <Link
                        to={`/orders/${o.id}`}
                        className="font-mono text-xs text-cyan-600 hover:underline"
                      >
                        {o.order_number}
                      </Link>
                      <div className="text-xs text-ink-500">{o.item_count} items</div>
                    </td>
                    <td className="text-ink-500 text-xs whitespace-nowrap">
                      {formatDateTime(o.created_at)}
                    </td>
                    <td>
                      <div className="truncate max-w-[200px]">{o.delivery_name}</div>
                      <div className="text-xs text-ink-500 truncate max-w-[200px]">
                        {o.delivery_email}
                      </div>
                    </td>
                    <td className="text-xs text-ink-700">{o.payment_method}</td>
                    <td>
                      <PaymentStatusPill status={o.payment_status} />
                    </td>
                    <td>
                      <OrderStatusPill status={o.status} />
                    </td>
                    <td className="text-right pr-4 tabular-nums font-medium">
                      {formatCurrency(o.total_amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-ink-500">
          Page {page} of {totalPages} · {total} total
          {isFetching && <span className="ml-2">(updating…)</span>}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
