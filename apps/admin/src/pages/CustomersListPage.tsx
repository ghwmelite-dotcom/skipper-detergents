import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import {
  CUSTOMER_STATUSES,
  CUSTOMER_STATUS_LABELS,
  type CustomerStatus,
} from '@skipper/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/format';

interface CustomerListRow {
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
}

function statusTone(s: CustomerStatus): 'success' | 'info' | 'warning' | 'danger' | 'neutral' {
  if (s === 'vip') return 'info';
  if (s === 'bulk') return 'success';
  if (s === 'blocked') return 'danger';
  return 'neutral';
}

export function CustomersListPage(): JSX.Element {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<CustomerStatus | ''>('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-customers', q, status],
    queryFn: () => {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (status) params.set('status', status);
      const qs = params.toString();
      return api.get<CustomerListRow[]>(`/api/admin/customers${qs ? `?${qs}` : ''}`);
    },
  });

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Everyone who's placed an order. Status controls bulk pricing eligibility and whether new orders are accepted."
      />

      <Card className="mb-5">
        <CardBody className="flex flex-wrap items-end gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email, phone…"
              className="pl-7"
            />
          </div>
          <div className="w-[180px]">
            <Select value={status} onChange={(e) => setStatus(e.target.value as CustomerStatus | '')}>
              <option value="">All statuses</option>
              {CUSTOMER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {CUSTOMER_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-0">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="pl-4">Customer</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th className="text-right">Orders</th>
                <th className="text-right">Total spent</th>
                <th className="text-right">Paid</th>
                <th className="pr-4">Last order</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-ink-500">
                    Loading…
                  </td>
                </tr>
              ) : data && data.length > 0 ? (
                data.map((c) => (
                  <tr
                    key={c.email}
                    className="cursor-pointer hover:bg-ink-50/60 transition-colors"
                  >
                    <td className="pl-4 font-medium text-ink-900">
                      <Link
                        to={`/customers/${encodeURIComponent(c.email)}`}
                        className="hover:text-cyan-600"
                      >
                        {c.name || '—'}
                      </Link>
                      {c.city && (
                        <div className="text-2xs text-ink-500 mt-0.5">
                          {c.city}
                          {c.region ? `, ${c.region}` : ''}
                        </div>
                      )}
                    </td>
                    <td className="text-ink-700">{c.email}</td>
                    <td className="font-mono text-xs text-ink-700">{c.phone}</td>
                    <td>
                      <Badge tone={statusTone(c.status)}>
                        {CUSTOMER_STATUS_LABELS[c.status]}
                      </Badge>
                    </td>
                    <td className="text-right tabular-nums">{c.total_orders}</td>
                    <td className="text-right tabular-nums font-medium">
                      {formatCurrency(c.total_spent)}
                    </td>
                    <td className="text-right tabular-nums text-success-600">
                      {formatCurrency(c.paid_spent)}
                    </td>
                    <td className="pr-4 text-xs text-ink-600">
                      {new Date(c.last_order_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-ink-500">
                    No customers yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
