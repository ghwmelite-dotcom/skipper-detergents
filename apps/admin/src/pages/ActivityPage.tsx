import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ActivityLogEntry } from '@skipper/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';

interface ActivityEntry extends ActivityLogEntry {
  admin_name: string | null;
  admin_email: string | null;
}

const ENTITY_TYPES = ['product', 'order', 'category', 'admin_user', 'settings'];
const PAGE_SIZE = 50;

export function ActivityPage(): JSX.Element {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState('');
  const [adminId, setAdminId] = useState('');

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set('limit', String(PAGE_SIZE));
    p.set('offset', String((page - 1) * PAGE_SIZE));
    if (entityType) p.set('entity_type', entityType);
    if (adminId) p.set('admin_id', adminId);
    return p.toString();
  }, [page, entityType, adminId]);

  const { data } = useQuery({
    queryKey: ['admin-activity', queryString],
    queryFn: () => api.getPaginated<ActivityEntry>(`/api/admin/activity?${queryString}`),
  });

  const total = data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const entries = data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Activity log"
        description={`${total} action${total === 1 ? '' : 's'} recorded`}
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select
          value={entityType}
          onChange={(e) => {
            setEntityType(e.target.value);
            setPage(1);
          }}
          className="w-48"
        >
          <option value="">All entity types</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Input
          placeholder="Admin ID (exact)"
          value={adminId}
          onChange={(e) => {
            setAdminId(e.target.value);
            setPage(1);
          }}
          className="w-56"
        />
      </div>

      <Card>
        <CardBody className="p-0">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="pl-4">When</th>
                <th>Admin</th>
                <th>Action</th>
                <th>Entity</th>
                <th className="pr-4">Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-ink-500">
                    No activity recorded.
                  </td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id}>
                    <td className="pl-4 text-xs text-ink-500 whitespace-nowrap">
                      {formatDateTime(e.created_at)}
                    </td>
                    <td>
                      <div className="text-sm">{e.admin_name ?? '—'}</div>
                      <div className="text-xs text-ink-500">{e.admin_email ?? ''}</div>
                    </td>
                    <td>
                      <span className="font-mono text-xs text-ink-800">{e.action}</span>
                    </td>
                    <td className="text-xs text-ink-700">
                      {e.entity_type ?? '—'}
                      {e.entity_id && (
                        <div className="font-mono text-2xs text-ink-500">{e.entity_id}</div>
                      )}
                    </td>
                    <td className="pr-4 max-w-md">
                      {e.details ? (
                        <pre className="text-2xs text-ink-500 whitespace-pre-wrap break-words font-mono">
                          {e.details}
                        </pre>
                      ) : (
                        '—'
                      )}
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
