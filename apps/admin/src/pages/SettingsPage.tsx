import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Input, Textarea } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';

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
