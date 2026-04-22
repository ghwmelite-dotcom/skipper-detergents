import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, KeyRound, UserCheck, UserX, Copy, X } from 'lucide-react';
import {
  ADMIN_ROLES,
  ADMIN_ROLE_LABELS,
  type AdminRole,
  type AdminUser,
} from '@skipper/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

type AdminUserRow = Omit<AdminUser, 'password_hash'>;

function generatePassword(length = 16): string {
  const alphabet =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) {
    const byte = bytes[i] ?? 0;
    out += alphabet.charAt(byte % alphabet.length);
  }
  return out;
}

export function TeamPage(): JSX.Element {
  const qc = useQueryClient();
  const toast = useToast();
  const me = useAuthStore((s) => s.user);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get<AdminUserRow[]>('/api/admin/users'),
  });

  // Add user modal state
  const [addOpen, setAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addName, setAddName] = useState('');
  const [addRole, setAddRole] = useState<AdminRole>('store_manager');
  const [addPassword, setAddPassword] = useState('');
  const [newlyCreated, setNewlyCreated] = useState<{ email: string; password: string } | null>(
    null,
  );

  // Reset password state
  const [resetTarget, setResetTarget] = useState<AdminUserRow | null>(null);
  const [resetPassword, setResetPassword] = useState('');

  // Deactivate/reactivate confirm state
  const [toggleTarget, setToggleTarget] = useState<AdminUserRow | null>(null);

  // Change own password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const createMutation = useMutation({
    mutationFn: (v: { email: string; name: string; role: AdminRole; password: string }) =>
      api.post<AdminUserRow>('/api/admin/users', v),
    onSuccess: (_created, vars) => {
      toast.push('User created', 'success');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setAddOpen(false);
      setNewlyCreated({ email: vars.email, password: vars.password });
      setAddEmail('');
      setAddName('');
      setAddRole('store_manager');
      setAddPassword('');
    },
    onError: (e: Error) => toast.push(e.message, 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: (v: { id: string; patch: { role?: AdminRole; is_active?: boolean } }) =>
      api.patch<AdminUserRow>(`/api/admin/users/${v.id}`, v.patch),
    onSuccess: () => {
      toast.push('User updated', 'success');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setToggleTarget(null);
    },
    onError: (e: Error) => toast.push(e.message, 'error'),
  });

  const resetMutation = useMutation({
    mutationFn: (v: { id: string; password: string }) =>
      api.post(`/api/admin/users/${v.id}/reset-password`, { password: v.password }),
    onSuccess: () => {
      toast.push('Password reset', 'success');
      if (resetTarget) {
        setNewlyCreated({ email: resetTarget.email, password: resetPassword });
      }
      setResetTarget(null);
      setResetPassword('');
    },
    onError: (e: Error) => toast.push(e.message, 'error'),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (v: { current_password: string; new_password: string }) =>
      api.post('/api/admin/users/me/change-password', v),
    onSuccess: () => {
      toast.push('Password changed', 'success');
      setCurrentPassword('');
      setNewPassword('');
    },
    onError: (e: Error) => toast.push(e.message, 'error'),
  });

  const copy = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      toast.push('Copied', 'success');
    } catch {
      toast.push('Copy failed — select manually', 'warning');
    }
  };

  return (
    <div>
      <PageHeader
        title="Team"
        description="Invite admins and store managers. Only super admins can manage users."
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Add user
          </Button>
        }
      />

      <Card className="mb-5">
        <CardBody className="p-0">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="pl-4">Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last login</th>
                <th className="pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-ink-500">
                    Loading…
                  </td>
                </tr>
              ) : users && users.length > 0 ? (
                users.map((u) => {
                  const isSelf = u.id === me?.id;
                  return (
                    <tr key={u.id}>
                      <td className="pl-4 font-medium text-ink-900">
                        {u.name}
                        {isSelf && (
                          <span className="ml-2 text-2xs uppercase tracking-wide text-ink-400">
                            you
                          </span>
                        )}
                      </td>
                      <td className="text-ink-700">{u.email}</td>
                      <td>
                        <Select
                          className="h-7 w-[150px] text-xs"
                          value={u.role}
                          disabled={isSelf || updateMutation.isPending}
                          onChange={(e) =>
                            updateMutation.mutate({
                              id: u.id,
                              patch: { role: e.target.value as AdminRole },
                            })
                          }
                        >
                          {ADMIN_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ADMIN_ROLE_LABELS[r]}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td>
                        {u.is_active ? (
                          <Badge tone="success">Active</Badge>
                        ) : (
                          <Badge tone="neutral">Inactive</Badge>
                        )}
                      </td>
                      <td className="text-xs text-ink-600">
                        {u.last_login
                          ? new Date(u.last_login).toLocaleString()
                          : 'Never'}
                      </td>
                      <td className="pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-ink-700 hover:bg-ink-100"
                            onClick={() => {
                              setResetTarget(u);
                              setResetPassword(generatePassword());
                            }}
                            title="Reset password"
                          >
                            <KeyRound className="h-3.5 w-3.5" /> Reset
                          </button>
                          <button
                            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-ink-700 hover:bg-ink-100 disabled:opacity-30 disabled:cursor-not-allowed"
                            disabled={isSelf}
                            onClick={() => setToggleTarget(u)}
                            title={
                              isSelf
                                ? 'Cannot change your own status'
                                : u.is_active
                                  ? 'Deactivate'
                                  : 'Reactivate'
                            }
                          >
                            {u.is_active ? (
                              <>
                                <UserX className="h-3.5 w-3.5" /> Deactivate
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-3.5 w-3.5" /> Reactivate
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-ink-500">
                    No users yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Change your password"
          subtitle="Everyone should change their bootstrap password on first login."
        />
        <CardBody>
          <form
            className="grid grid-cols-1 gap-3 md:grid-cols-3 md:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              if (!currentPassword || newPassword.length < 12) return;
              changePasswordMutation.mutate({
                current_password: currentPassword,
                new_password: newPassword,
              });
            }}
          >
            <div>
              <Label htmlFor="current_password">Current password</Label>
              <Input
                id="current_password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div>
              <Label htmlFor="new_password">New password (min 12 chars)</Label>
              <Input
                id="new_password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <Button
              type="submit"
              loading={changePasswordMutation.isPending}
              disabled={!currentPassword || newPassword.length < 12}
            >
              Change password
            </Button>
          </form>
        </CardBody>
      </Card>

      {/* Add user modal */}
      {addOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4"
          onClick={() => setAddOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-md border border-ink-200 bg-white shadow-admin-lg"
          >
            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-ink-900">Add user</h3>
              <button onClick={() => setAddOpen(false)} className="text-ink-500 hover:text-ink-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form
              className="p-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!addEmail || !addName || addPassword.length < 12) return;
                createMutation.mutate({
                  email: addEmail.trim().toLowerCase(),
                  name: addName.trim(),
                  role: addRole,
                  password: addPassword,
                });
              }}
            >
              <div>
                <Label htmlFor="add_name">Name</Label>
                <Input
                  id="add_name"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="Ama Mensah"
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="add_email">Email</Label>
                <Input
                  id="add_email"
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="ama@skipperdetergents.com.gh"
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="add_role">Role</Label>
                <Select
                  id="add_role"
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value as AdminRole)}
                >
                  {ADMIN_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ADMIN_ROLE_LABELS[r]}
                    </option>
                  ))}
                </Select>
                <p className="mt-1 text-xs text-ink-500">
                  Super admins can manage users. Admins and store managers can work on products
                  and orders.
                </p>
              </div>
              <div>
                <Label htmlFor="add_password">Temporary password (min 12 chars)</Label>
                <div className="flex gap-2">
                  <Input
                    id="add_password"
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    autoComplete="off"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setAddPassword(generatePassword())}
                  >
                    Generate
                  </Button>
                </div>
                <p className="mt-1 text-xs text-ink-500">
                  Share securely. The new user should change it on first login.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={createMutation.isPending}
                  disabled={!addEmail || !addName || addPassword.length < 12}
                >
                  Create user
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {resetTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4"
          onClick={() => setResetTarget(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-md border border-ink-200 bg-white shadow-admin-lg"
          >
            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-ink-900">
                Reset password — {resetTarget.name}
              </h3>
              <button
                onClick={() => setResetTarget(null)}
                className="text-ink-500 hover:text-ink-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form
              className="p-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (resetPassword.length < 12) return;
                resetMutation.mutate({ id: resetTarget.id, password: resetPassword });
              }}
            >
              <div>
                <Label htmlFor="reset_password">New password (min 12 chars)</Label>
                <div className="flex gap-2">
                  <Input
                    id="reset_password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    autoComplete="off"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setResetPassword(generatePassword())}
                  >
                    Generate
                  </Button>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setResetTarget(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  loading={resetMutation.isPending}
                  disabled={resetPassword.length < 12}
                >
                  Reset password
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Show-once credentials banner */}
      {newlyCreated && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-md border border-ink-200 bg-white shadow-admin-lg">
            <div className="border-b border-ink-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-ink-900">
                Copy these credentials now
              </h3>
              <p className="mt-1 text-xs text-ink-500">
                The password is shown only once. Share it securely.
              </p>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <Label>Email</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={newlyCreated.email} />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => copy(newlyCreated.email)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div>
                <Label>Password</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={newlyCreated.password} className="font-mono" />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => copy(newlyCreated.password)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={() => setNewlyCreated(null)}>Done</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!toggleTarget}
        title={toggleTarget?.is_active ? 'Deactivate this user?' : 'Reactivate this user?'}
        description={
          toggleTarget?.is_active
            ? `${toggleTarget.name} will not be able to log in until reactivated.`
            : toggleTarget
              ? `${toggleTarget.name} will be able to log in again.`
              : ''
        }
        tone={toggleTarget?.is_active ? 'danger' : 'primary'}
        confirmLabel={toggleTarget?.is_active ? 'Deactivate' : 'Reactivate'}
        loading={updateMutation.isPending}
        onCancel={() => setToggleTarget(null)}
        onConfirm={() =>
          toggleTarget &&
          updateMutation.mutate({
            id: toggleTarget.id,
            patch: { is_active: !toggleTarget.is_active },
          })
        }
      />
    </div>
  );
}
