import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import type { AdminNotification } from '@skipper/shared';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/components/ui/Toast';

const POLL_INTERVAL_MS = 30_000;
const HIDDEN_POLL_INTERVAL_MS = 120_000;

export interface AdminNotificationsFeed {
  items: AdminNotification[];
  unread: number;
}

// Short two-note "ding" synthesised with Web Audio — no asset to ship.
function playChime(): void {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const now = ctx.currentTime;
    const play = (freq: number, startOffset: number, duration: number): void => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + startOffset);
      gain.gain.setValueAtTime(0.0001, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(0.15, now + startOffset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration + 0.02);
    };
    play(880, 0, 0.18);
    play(1318, 0.12, 0.22);
  } catch {
    /* autoplay blocked — silent fail */
  }
}

/**
 * The single source of truth for the bell feed. Polls /api/admin/notifications
 * every 30s (120s when the tab is hidden), surfaces the latest feed + unread
 * count, and fires a toast + chime on each genuinely new arrival.
 */
export function useAdminNotifications() {
  const token = useAuthStore((s) => s.token);
  const toast = useToast();
  const qc = useQueryClient();

  const query = useQuery<AdminNotificationsFeed>({
    queryKey: ['admin-notifications'],
    queryFn: () => api.get<AdminNotificationsFeed>('/api/admin/notifications?limit=15'),
    enabled: Boolean(token),
    refetchInterval: () => (document.hidden ? HIDDEN_POLL_INTERVAL_MS : POLL_INTERVAL_MS),
    refetchIntervalInBackground: true,
    staleTime: 10_000,
  });

  // Alert side-effect: compare latest fetched top id against the last one we
  // showed a toast for. On a fresh new arrival, fire toast + chime + title.
  const seenTopRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!query.data) return;
    const latest = query.data.items[0];
    if (!latest) {
      initializedRef.current = true;
      return;
    }
    if (initializedRef.current && seenTopRef.current !== latest.id) {
      toast.push(latest.title, 'success');
      playChime();
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard-revenue'] });
      if (document.hidden) {
        const originalTitle = document.title;
        document.title = `🔔 ${originalTitle}`;
        const restore = (): void => {
          document.title = originalTitle;
          document.removeEventListener('visibilitychange', restore);
        };
        document.addEventListener('visibilitychange', restore);
      }
    }
    seenTopRef.current = latest.id;
    initializedRef.current = true;
  }, [query.data, toast, qc]);

  const markRead = useMutation({
    mutationFn: (id: string) => api.post(`/api/admin/notifications/${id}/read`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-notifications'] }),
  });
  const markAllRead = useMutation({
    mutationFn: () => api.post('/api/admin/notifications/read-all', {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-notifications'] }),
  });

  return {
    items: query.data?.items ?? [],
    unread: query.data?.unread ?? 0,
    isLoading: query.isLoading,
    markRead: (id: string) => markRead.mutate(id),
    markAllRead: () => markAllRead.mutate(),
    isMarkingAll: markAllRead.isPending,
  };
}
