import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, ExternalLink, Eye, EyeOff, KeyRound } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Input, Textarea } from '@/components/ui/Input';
import { Label, FieldError } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { API_BASE } from '@/lib/env';

const PAYSTACK_WEBHOOK_URL = `${API_BASE}/webhooks/paystack`;

interface SettingsResponse {
  settings: Record<string, string>;
  allowed_keys: string[];
  public_keys: string[];
  private_keys: string[];
}

const SETTING_GROUPS: { title: string; keys: { key: string; label: string; type?: 'text' | 'textarea' | 'password' }[] }[] = [
  {
    title: 'Store info',
    keys: [
      { key: 'store_name', label: 'Store name' },
      { key: 'store_tagline', label: 'Store tagline' },
      { key: 'store_email', label: 'Store email' },
      { key: 'store_phone', label: 'Store phone' },
      { key: 'currency', label: 'Currency code' },
    ],
  },
  {
    title: 'Delivery',
    keys: [
      { key: 'delivery_fee_accra', label: 'Delivery fee — Accra (GHS)' },
      { key: 'delivery_fee_other', label: 'Delivery fee — other regions (GHS)' },
      { key: 'free_delivery_threshold', label: 'Free delivery threshold (GHS)' },
    ],
  },
  {
    title: 'Pickup',
    keys: [{ key: 'pickup_address', label: 'Pickup address', type: 'textarea' }],
  },
  {
    title: 'Manual transfer',
    keys: [{ key: 'manual_payment_details', label: 'Manual payment details (shown to customers)', type: 'textarea' }],
  },
  {
    title: 'Paystack',
    keys: [
      { key: 'paystack_public_key', label: 'Public key' },
      { key: 'paystack_secret_key', label: 'Secret key', type: 'password' },
      { key: 'paystack_webhook_secret', label: 'Webhook secret', type: 'password' },
    ],
  },
  {
    title: 'Admin notifications',
    keys: [{ key: 'admin_notification_email', label: 'Admin notification email' }],
  },
];

export function SettingsPage(): JSX.Element {
  const qc = useQueryClient();
  const toast = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  const { data } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api.get<SettingsResponse>('/api/admin/settings'),
  });

  useEffect(() => {
    if (data) {
      setValues(data.settings);
      setDirty(false);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (next: Record<string, string>) =>
      api.patch('/api/admin/settings', { settings: next }),
    onSuccess: () => {
      toast.push('Settings saved', 'success');
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      setDirty(false);
    },
    onError: (e: Error) => toast.push(e.message, 'error'),
  });

  const setVal = (k: string, v: string): void => {
    setValues((prev) => ({ ...prev, [k]: v }));
    setDirty(true);
  };

  const copyWebhook = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(PAYSTACK_WEBHOOK_URL);
      toast.push('Webhook URL copied', 'success');
    } catch {
      toast.push('Copy failed — select manually', 'warning');
    }
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Store configuration. Changes take effect immediately."
        actions={
          <Button
            onClick={() => saveMutation.mutate(values)}
            loading={saveMutation.isPending}
            disabled={!dirty}
          >
            Save changes
          </Button>
        }
      />

      <ChangePasswordCard />

      <Card className="mb-5 border-cyan-500/40 bg-cyan-50/30">
        <CardHeader
          title="Paystack webhook"
          subtitle="Paste this into Paystack → Settings → API Keys & Webhooks. We verify each request against your secret key."
        />
        <CardBody className="space-y-3">
          <div>
            <Label>Webhook URL</Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={PAYSTACK_WEBHOOK_URL}
                className="font-mono text-xs"
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button type="button" variant="secondary" onClick={copyWebhook}>
                <Copy className="h-3.5 w-3.5" /> Copy
              </Button>
              <a
                href="https://dashboard.paystack.com/#/settings/developer"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-1 rounded border border-ink-200 bg-white px-3 text-sm font-medium text-ink-800 hover:bg-ink-50"
              >
                Open Paystack <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            <p className="mt-1 text-xs text-ink-500">
              Fill in your Paystack secret + webhook secret below so signatures verify.
            </p>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {SETTING_GROUPS.map((g) => (
          <Card key={g.title}>
            <CardHeader title={g.title} />
            <CardBody className="space-y-3">
              {g.keys.map((k) => (
                <div key={k.key}>
                  <Label htmlFor={k.key}>{k.label}</Label>
                  {k.type === 'textarea' ? (
                    <Textarea
                      id={k.key}
                      rows={3}
                      value={values[k.key] ?? ''}
                      onChange={(e) => setVal(k.key, e.target.value)}
                    />
                  ) : (
                    <Input
                      id={k.key}
                      type={k.type === 'password' ? 'password' : 'text'}
                      value={values[k.key] ?? ''}
                      onChange={(e) => setVal(k.key, e.target.value)}
                      autoComplete="off"
                    />
                  )}
                </div>
              ))}
            </CardBody>
          </Card>
        ))}
      </div>

      {dirty && (
        <div className="mt-5 rounded border border-warning-500/30 bg-warning-50 px-3 py-2 text-xs text-warning-600">
          You have unsaved changes.
        </div>
      )}
    </div>
  );
}

function ChangePasswordCard(): JSX.Element {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordsMatch = next === confirm;
  const longEnough = next.length >= 12;
  const formValid =
    current.length > 0 && next.length > 0 && confirm.length > 0 && passwordsMatch && longEnough;

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/api/admin/users/me/change-password', {
        current_password: current,
        new_password: next,
      }),
    onSuccess: () => {
      toast.push('Password updated', 'success');
      setCurrent('');
      setNext('');
      setConfirm('');
      setError(null);
    },
    onError: (e: unknown) => {
      const message =
        e instanceof ApiError ? e.message : 'Could not update password — try again';
      setError(message);
    },
  });

  const submit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!formValid) {
      if (!longEnough) setError('New password must be at least 12 characters');
      else if (!passwordsMatch) setError('New password and confirmation do not match');
      else setError('Please fill in every field');
      return;
    }
    setError(null);
    mutation.mutate();
  };

  return (
    <Card className="mb-5 border-ink-200">
      <CardHeader
        title="Your password"
        subtitle={
          user
            ? `Signed in as ${user.email}. Change the password for this account.`
            : 'Change the password for this account.'
        }
      />
      <CardBody>
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl">
          <div className="md:col-span-3">
            <Label htmlFor="current-password">Current password</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrent ? 'text' : 'password'}
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                aria-label={showCurrent ? 'Hide current password' : 'Show current password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-700"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="new-password">New password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNext ? 'text' : 'password'}
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                invalid={next.length > 0 && !longEnough}
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowNext((v) => !v)}
                aria-label={showNext ? 'Hide new password' : 'Show new password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-700"
              >
                {showNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-ink-500">Minimum 12 characters.</p>
          </div>

          <div>
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type={showNext ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              invalid={confirm.length > 0 && !passwordsMatch}
            />
            <FieldError
              message={
                confirm.length > 0 && !passwordsMatch ? 'Does not match new password' : undefined
              }
            />
          </div>

          <div className="flex items-end">
            <Button
              type="submit"
              loading={mutation.isPending}
              disabled={!formValid}
              className="gap-1.5"
            >
              <KeyRound className="h-4 w-4" />
              Update password
            </Button>
          </div>

          {error && (
            <div className="md:col-span-3 rounded border border-danger-500/30 bg-danger-50 px-3 py-2 text-xs text-danger-600">
              {error}
            </div>
          )}
        </form>
      </CardBody>
    </Card>
  );
}
