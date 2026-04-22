import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Package, ShoppingCart, TrendingUp, Users } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { OrderStatusPill, PaymentStatusPill } from '@/components/ui/StatusPill';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/format';
import type { OrderStatus, PaymentStatus } from '@skipper/shared';

interface DashboardStats {
  today: { revenue: number; orders: number; new_customers: number };
  last_7d: { revenue: number; orders: number };
  last_30d: { revenue: number; orders: number };
  low_stock: Array<{ id: string; name: string; stock_quantity: number; low_stock_threshold: number }>;
  recent_orders: Array<{
    id: string;
    order_number: string;
    created_at: string;
    status: OrderStatus;
    payment_status: PaymentStatus;
    total_amount: number;
    delivery_name: string;
    delivery_email: string;
    payment_method: string;
  }>;
  top_products_30d: Array<{
    product_id: string;
    name: string;
    units_sold: number;
    revenue: number;
  }>;
}

interface RevenueSeries {
  period: string;
  series: Array<{ day: string; revenue: number; orders: number }>;
}

export function DashboardPage(): JSX.Element {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.get<DashboardStats>('/api/admin/dashboard/stats'),
  });
  const { data: revenue } = useQuery({
    queryKey: ['dashboard', 'revenue', '30d'],
    queryFn: () => api.get<RevenueSeries>('/api/admin/dashboard/revenue?period=30d'),
  });

  return (
    <div>
      <PageHeader title="Dashboard" description="Today's activity and recent performance." />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Revenue (today)"
          value={formatCurrency(stats?.today.revenue ?? 0)}
          icon={TrendingUp}
          loading={isLoading}
        />
        <Kpi
          label="Orders (today)"
          value={String(stats?.today.orders ?? 0)}
          icon={ShoppingCart}
          loading={isLoading}
        />
        <Kpi
          label="Revenue (7 days)"
          value={formatCurrency(stats?.last_7d.revenue ?? 0)}
          icon={TrendingUp}
          loading={isLoading}
        />
        <Kpi
          label="Orders (30 days)"
          value={String(stats?.last_30d.orders ?? 0)}
          icon={Package}
          loading={isLoading}
        />
      </div>

      <Card className="mt-5">
        <CardHeader title="Revenue — last 30 days" subtitle="All orders excluding cancelled." />
        <CardBody>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenue?.series ?? []}>
                <CartesianGrid stroke="#EEF0F4" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  tickFormatter={(d: string) => d.slice(5)}
                />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} width={50} />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  labelFormatter={(v: string) => formatDate(v)}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 6,
                    border: '1px solid #DFE3EA',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#0B2545"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#00B4D8', stroke: '#0B2545' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent orders"
            subtitle="Last 10"
            action={
              <Link to="/orders" className="text-xs text-cyan-600 hover:underline">
                View all
              </Link>
            }
          />
          <CardBody className="p-0">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="pl-4">Order</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th className="text-right">Total</th>
                  <th>Payment</th>
                  <th className="pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.recent_orders ?? []).map((o) => (
                  <tr key={o.id}>
                    <td className="pl-4">
                      <Link
                        to={`/orders/${o.id}`}
                        className="font-mono text-xs text-cyan-600 hover:underline"
                      >
                        {o.order_number}
                      </Link>
                    </td>
                    <td className="text-ink-500">{formatDate(o.created_at)}</td>
                    <td>
                      <div className="truncate max-w-[200px]">{o.delivery_name}</div>
                      <div className="text-xs text-ink-500 truncate max-w-[200px]">
                        {o.delivery_email}
                      </div>
                    </td>
                    <td className="text-right tabular-nums">
                      {formatCurrency(o.total_amount)}
                    </td>
                    <td>
                      <PaymentStatusPill status={o.payment_status} />
                    </td>
                    <td className="pr-4">
                      <OrderStatusPill status={o.status} />
                    </td>
                  </tr>
                ))}
                {!isLoading && stats?.recent_orders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-ink-500">
                      No orders yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardBody>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Low stock" subtitle="At or below threshold" />
            <CardBody className="p-0">
              {(stats?.low_stock ?? []).length === 0 ? (
                <p className="p-4 text-sm text-ink-500">All stock is above threshold.</p>
              ) : (
                <ul className="divide-y divide-ink-100">
                  {stats?.low_stock.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between px-4 py-2.5"
                    >
                      <Link
                        to={`/products/${p.id}`}
                        className="text-sm text-ink-800 hover:text-cyan-600 truncate pr-2"
                      >
                        {p.name}
                      </Link>
                      <span className="text-xs text-danger-600 tabular-nums whitespace-nowrap">
                        {p.stock_quantity} / {p.low_stock_threshold}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Top products" subtitle="Last 30 days" />
            <CardBody className="p-0">
              {(stats?.top_products_30d ?? []).length === 0 ? (
                <p className="p-4 text-sm text-ink-500">No sales in the last 30 days.</p>
              ) : (
                <ul className="divide-y divide-ink-100">
                  {stats?.top_products_30d.map((p) => (
                    <li
                      key={p.product_id}
                      className="flex items-center justify-between gap-2 px-4 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-ink-800 truncate">{p.name}</div>
                        <div className="text-xs text-ink-500">{p.units_sold} units</div>
                      </div>
                      <span className="text-xs text-ink-700 tabular-nums whitespace-nowrap">
                        {formatCurrency(p.revenue)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3 text-xs text-ink-500">
        <Users className="h-3.5 w-3.5" />
        <span>{stats?.today.new_customers ?? 0} new customers today</span>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string;
  icon: typeof Package;
  loading?: boolean;
}): JSX.Element {
  return (
    <Card>
      <CardBody className="flex items-center justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-ink-500">
            {label}
          </div>
          <div className="mt-1 text-xl font-semibold text-ink-900 tabular-nums">
            {loading ? <span className="inline-block h-5 w-20 bg-ink-100 rounded animate-pulse" /> : value}
          </div>
        </div>
        <div className="rounded bg-ink-50 p-2">
          <Icon className="h-4 w-4 text-ink-500" />
        </div>
      </CardBody>
    </Card>
  );
}
