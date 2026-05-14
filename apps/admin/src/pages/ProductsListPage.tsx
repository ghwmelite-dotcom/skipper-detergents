import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, ChevronLeft, ChevronRight, EyeOff, Eye, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency } from '@/lib/format';
import type { Category, Product } from '@skipper/shared';

interface AdminProductListItem extends Product {
  category_name: string | null;
  category_slug: string | null;
  primary_image_url: string | null;
  image_count: number;
  bulk_tier_count: number;
}

const PAGE_SIZE = 25;

export function ProductsListPage(): JSX.Element {
  const qc = useQueryClient();
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [category, setCategory] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [confirmPermanent, setConfirmPermanent] = useState<{ id: string; name: string } | null>(
    null,
  );
  const me = useAuthStore((s) => s.user);
  const isSuperAdmin = me?.role === 'super_admin';

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('per_page', String(PAGE_SIZE));
    params.set('status', status);
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    return params.toString();
  }, [page, search, status, category]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-products', queryString],
    queryFn: () =>
      api.getPaginated<AdminProductListItem>(`/api/admin/products?${queryString}`),
  });

  const { data: categories } = useQuery({
    queryKey: ['admin-categories-list'],
    queryFn: () => api.get<(Category & { product_count: number })[]>('/api/admin/categories'),
  });

  const total = data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/api/admin/products/${id}`),
    onSuccess: () => {
      toast.push('Product deactivated', 'success');
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      setConfirmDelete(null);
    },
    onError: (e: Error) => toast.push(e.message, 'error'),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/admin/products/${id}`, { is_active: true }),
    onSuccess: () => {
      toast.push('Product activated', 'success');
      qc.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: (e: Error) => toast.push(e.message, 'error'),
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/api/admin/products/${id}/permanent`),
    onSuccess: (_, id) => {
      toast.push('Product permanently deleted', 'success');
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      setConfirmPermanent(null);
      // The deactivate dialog could still be open on the same product —
      // close it so the UI stays consistent.
      if (confirmDelete?.id === id) setConfirmDelete(null);
    },
    onError: (e: unknown) => {
      const message =
        e instanceof ApiError ? e.message : 'Could not delete — try again';
      toast.push(message, 'error');
    },
  });

  const bulkMutation = useMutation({
    mutationFn: async ({
      ids,
      action,
    }: {
      ids: string[];
      action: 'activate' | 'deactivate';
    }) => {
      const is_active = action === 'activate';
      await Promise.all(
        ids.map((id) => api.patch(`/api/admin/products/${id}`, { is_active })),
      );
    },
    onSuccess: (_d, vars) => {
      toast.push(`${vars.ids.length} product(s) ${vars.action}d`, 'success');
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      setSelected(new Set());
    },
    onError: (e: Error) => toast.push(e.message, 'error'),
  });

  const toggleSelect = (id: string): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = (ids: string[], check: boolean): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (check) ids.forEach((id) => next.add(id));
      else ids.forEach((id) => next.delete(id));
      return next;
    });
  };

  const products = data?.data ?? [];
  const allOnPageSelected = products.length > 0 && products.every((p) => selected.has(p.id));

  return (
    <div>
      <PageHeader
        title="Products"
        description={`${total} product${total === 1 ? '' : 's'}`}
        actions={
          <Link to="/products/new">
            <Button>
              <Plus className="h-3.5 w-3.5" />
              New product
            </Button>
          </Link>
        }
      />

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
            placeholder="Search by name, SKU, or slug"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8"
          />
        </form>
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as 'all' | 'active' | 'inactive');
            setPage(1);
          }}
          className="w-36"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
        <Select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          className="w-48"
        >
          <option value="">All categories</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </Select>
        {selected.size > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-ink-500">{selected.size} selected</span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                bulkMutation.mutate({ ids: Array.from(selected), action: 'activate' })
              }
              disabled={bulkMutation.isPending}
            >
              Activate
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                bulkMutation.mutate({ ids: Array.from(selected), action: 'deactivate' })
              }
              disabled={bulkMutation.isPending}
            >
              Deactivate
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardBody className="p-0">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="pl-4 w-6">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={(e) =>
                      toggleSelectAll(
                        products.map((p) => p.id),
                        e.target.checked,
                      )
                    }
                    className="h-3.5 w-3.5 rounded border-ink-300"
                    aria-label="Select all on page"
                  />
                </th>
                <th className="w-10"></th>
                <th>Name</th>
                <th>Category</th>
                <th className="text-right">Price</th>
                <th className="text-right">Stock</th>
                <th>Status</th>
                <th>Flags</th>
                <th className="pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-ink-500">
                    Loading…
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-ink-500">
                    No products match these filters.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id}>
                    <td className="pl-4">
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        className="h-3.5 w-3.5 rounded border-ink-300"
                        aria-label={`Select ${p.name}`}
                      />
                    </td>
                    <td>
                      <div className="h-8 w-8 rounded border border-ink-200 bg-ink-50 overflow-hidden">
                        {p.primary_image_url && (
                          <img
                            src={p.primary_image_url}
                            alt={p.name}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                    </td>
                    <td>
                      <Link
                        to={`/products/${p.id}`}
                        className="font-medium text-ink-900 hover:text-cyan-600"
                      >
                        {p.name}
                      </Link>
                      <div className="text-xs text-ink-500">
                        {p.sku ?? '—'} · {p.slug}
                      </div>
                    </td>
                    <td className="text-sm text-ink-700">{p.category_name ?? '—'}</td>
                    <td className="text-right tabular-nums">
                      {formatCurrency(p.unit_price)}
                    </td>
                    <td className="text-right tabular-nums">
                      <span
                        className={
                          p.stock_quantity <= p.low_stock_threshold
                            ? 'text-danger-600 font-medium'
                            : 'text-ink-800'
                        }
                      >
                        {p.stock_quantity}
                      </span>
                    </td>
                    <td>
                      {p.is_active ? (
                        <Badge tone="success">Active</Badge>
                      ) : (
                        <Badge tone="neutral">Inactive</Badge>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        {p.is_featured && <Badge tone="info">Featured</Badge>}
                        {p.is_bulk_available && <Badge tone="navy">Bulk</Badge>}
                      </div>
                    </td>
                    <td className="pr-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        {p.is_active ? (
                          <button
                            type="button"
                            onClick={() => setConfirmDelete({ id: p.id, name: p.name })}
                            title="Deactivate (hide from storefront)"
                            aria-label={`Deactivate ${p.name}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded text-ink-600 hover:bg-ink-100 hover:text-ink-900 transition-colors"
                          >
                            <EyeOff className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => activateMutation.mutate(p.id)}
                            disabled={activateMutation.isPending}
                            title="Activate (show on storefront)"
                            aria-label={`Activate ${p.name}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded text-ink-600 hover:bg-ink-100 hover:text-ink-900 transition-colors disabled:opacity-50"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                        {isSuperAdmin && (
                          <button
                            type="button"
                            onClick={() => setConfirmPermanent({ id: p.id, name: p.name })}
                            title="Delete permanently"
                            aria-label={`Delete ${p.name} permanently`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded text-danger-600 hover:bg-danger-50 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
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
            <ChevronLeft className="h-3.5 w-3.5" />
            Prev
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Deactivate this product?"
        description={
          confirmDelete
            ? `${confirmDelete.name} will be hidden from the storefront. You can reactivate it later.`
            : ''
        }
        tone="danger"
        confirmLabel="Deactivate"
        loading={deleteMutation.isPending}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
      />

      <ConfirmDialog
        open={!!confirmPermanent}
        title="Delete this product permanently?"
        description={
          confirmPermanent
            ? `"${confirmPermanent.name}" and all its images and bulk pricing will be removed from the database. This cannot be undone. If the product appears in past orders, the deletion will be blocked — deactivate it instead.`
            : ''
        }
        tone="danger"
        confirmLabel="Delete permanently"
        loading={permanentDeleteMutation.isPending}
        onCancel={() => setConfirmPermanent(null)}
        onConfirm={() => confirmPermanent && permanentDeleteMutation.mutate(confirmPermanent.id)}
      />
    </div>
  );
}
