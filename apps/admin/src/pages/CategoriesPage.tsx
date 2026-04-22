import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Check, X } from 'lucide-react';
import type { Category } from '@skipper/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/api';
import { slugify } from '@/lib/format';

interface CategoryWithCount extends Category {
  product_count: number;
}

export function CategoriesPage(): JSX.Element {
  const qc = useQueryClient();
  const toast = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-categories-full'],
    queryFn: () => api.get<CategoryWithCount[]>('/api/admin/categories'),
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const createMutation = useMutation({
    mutationFn: (v: { name: string; slug: string }) => api.post('/api/admin/categories', v),
    onSuccess: () => {
      toast.push('Category created', 'success');
      qc.invalidateQueries({ queryKey: ['admin-categories-full'] });
      qc.invalidateQueries({ queryKey: ['admin-categories-list'] });
      setNewName('');
      setNewSlug('');
    },
    onError: (e: Error) => toast.push(e.message, 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: (v: { id: string; name: string }) =>
      api.patch(`/api/admin/categories/${v.id}`, { name: v.name }),
    onSuccess: () => {
      toast.push('Category updated', 'success');
      qc.invalidateQueries({ queryKey: ['admin-categories-full'] });
      setEditingId(null);
    },
    onError: (e: Error) => toast.push(e.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/api/admin/categories/${id}`),
    onSuccess: () => {
      toast.push('Category deleted', 'success');
      qc.invalidateQueries({ queryKey: ['admin-categories-full'] });
      setConfirmDelete(null);
    },
    onError: (e: Error) => {
      if (e instanceof ApiError && e.code === 'CONFLICT') {
        toast.push(e.message, 'warning');
      } else {
        toast.push(e.message, 'error');
      }
    },
  });

  return (
    <div>
      <PageHeader title="Categories" description="Group products for the storefront navigation." />

      <Card className="mb-5">
        <CardBody>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newName.trim() || !newSlug.trim()) return;
              createMutation.mutate({ name: newName.trim(), slug: newSlug.trim() });
            }}
            className="flex items-end gap-2"
          >
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-ink-700">Name</label>
              <Input
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  if (!newSlug || newSlug === slugify(newName))
                    setNewSlug(slugify(e.target.value));
                }}
                placeholder="Detergents"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-ink-700">Slug</label>
              <Input
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                placeholder="detergents"
              />
            </div>
            <Button type="submit" loading={createMutation.isPending}>
              <Plus className="h-3.5 w-3.5" /> Add category
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-0">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="pl-4">Name</th>
                <th>Slug</th>
                <th className="text-right">Products</th>
                <th>Status</th>
                <th className="pr-4 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-ink-500">
                    Loading…
                  </td>
                </tr>
              ) : (
                data?.map((c) => (
                  <tr key={c.id}>
                    <td className="pl-4">
                      {editingId === c.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-7"
                            autoFocus
                          />
                          <button
                            onClick={() =>
                              updateMutation.mutate({ id: c.id, name: editName.trim() })
                            }
                            className="text-success-600 hover:text-success-500"
                            disabled={!editName.trim() || updateMutation.isPending}
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-ink-500 hover:text-ink-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(c.id);
                            setEditName(c.name);
                          }}
                          className="text-ink-900 hover:text-cyan-600 font-medium"
                        >
                          {c.name}
                        </button>
                      )}
                    </td>
                    <td className="font-mono text-xs text-ink-600">{c.slug}</td>
                    <td className="text-right tabular-nums">{c.product_count}</td>
                    <td>
                      {c.is_active ? (
                        <Badge tone="success">Active</Badge>
                      ) : (
                        <Badge tone="neutral">Inactive</Badge>
                      )}
                    </td>
                    <td className="pr-4">
                      <button
                        onClick={() => setConfirmDelete({ id: c.id, name: c.name })}
                        className="text-danger-500 hover:text-danger-600 disabled:opacity-30"
                        disabled={c.product_count > 0}
                        title={
                          c.product_count > 0
                            ? 'Cannot delete — products still reference this category'
                            : 'Delete'
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete this category?"
        description={
          confirmDelete
            ? `${confirmDelete.name} will be removed. This cannot be undone.`
            : ''
        }
        tone="danger"
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
      />
    </div>
  );
}
