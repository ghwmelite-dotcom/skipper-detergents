import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ShoppingCart, Receipt, CheckCircle2, Upload } from 'lucide-react';
import type { AdminNotification, AdminNotificationType } from '@skipper/shared';
import { cn } from '@/lib/cn';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { formatDateTime } from '@/lib/format';

const TYPE_ICON: Record<AdminNotificationType, typeof Bell> = {
  'order.created': ShoppingCart,
  'order.payment_proof_uploaded': Upload,
  'order.paystack_paid': Receipt,
  'order.manual_payment_confirmed': CheckCircle2,
};

const TYPE_TONE: Record<AdminNotificationType, string> = {
  'order.created': 'text-cyan-600 bg-cyan-50',
  'order.payment_proof_uploaded': 'text-warning-600 bg-warning-50',
  'order.paystack_paid': 'text-success-600 bg-success-50',
  'order.manual_payment_confirmed': 'text-success-600 bg-success-50',
};

function relativeTime(iso: string): string {
  try {
    const then = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z').getTime();
    const diffMs = Date.now() - then;
    const sec = Math.round(diffMs / 1000);
    if (sec < 45) return 'just now';
    const min = Math.round(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.round(hr / 24);
    if (day < 7) return `${day}d ago`;
    return formatDateTime(iso);
  } catch {
    return '';
  }
}

export function NotificationBell(): JSX.Element {
  const [open, setOpen] = useState(false);
  const { items, unread, markRead, markAllRead, isMarkingAll } = useAdminNotifications();
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function onSelect(n: AdminNotification): void {
    if (!n.read_at) markRead(n.id);
    if (n.entity_type === 'order' && n.entity_id) {
      navigate(`/orders/${n.entity_id}`);
    }
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-700 hover:bg-ink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.8} />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-semibold text-white tabular-nums"
            aria-hidden="true"
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-[360px] rounded-md border border-ink-200 bg-white shadow-admin-lg overflow-hidden z-50"
          role="dialog"
          aria-label="Notifications"
        >
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-2.5">
            <div className="flex items-baseline gap-2">
              <h3 className="text-sm font-semibold text-ink-900">Notifications</h3>
              {unread > 0 && (
                <span className="text-[11px] text-ink-500 tabular-nums">{unread} unread</span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={() => markAllRead()}
                disabled={isMarkingAll}
                className="text-[11px] text-cyan-600 hover:text-cyan-500 disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell className="mx-auto h-6 w-6 text-ink-300" strokeWidth={1.5} />
                <p className="mt-2 text-xs text-ink-500">You&rsquo;re all caught up.</p>
              </div>
            ) : (
              <ul>
                {items.map((n) => {
                  const Icon = TYPE_ICON[n.type] ?? Bell;
                  const tone = TYPE_TONE[n.type] ?? 'text-ink-700 bg-ink-50';
                  const isUnread = !n.read_at;
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => onSelect(n)}
                        className={cn(
                          'w-full flex gap-3 px-4 py-3 border-b border-ink-100 last:border-b-0 text-left transition-colors',
                          isUnread ? 'bg-cyan-50/30 hover:bg-cyan-50/60' : 'hover:bg-ink-50',
                        )}
                      >
                        <span
                          className={cn(
                            'shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-full',
                            tone,
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <p className="text-sm font-medium text-ink-900 truncate">
                              {n.title}
                            </p>
                            {isUnread && (
                              <span
                                className="shrink-0 h-1.5 w-1.5 rounded-full bg-cyan-500"
                                aria-label="unread"
                              />
                            )}
                          </div>
                          {n.body && (
                            <p className="mt-0.5 text-xs text-ink-600 line-clamp-2">{n.body}</p>
                          )}
                          <p className="mt-1 text-[11px] text-ink-400 tabular-nums">
                            {relativeTime(n.created_at)}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
