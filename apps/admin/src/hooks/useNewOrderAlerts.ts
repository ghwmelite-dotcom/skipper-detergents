import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE } from '@/lib/env';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/components/ui/Toast';

const POLL_INTERVAL_MS = 30_000;
const HIDDEN_POLL_INTERVAL_MS = 120_000;

interface OrderPollRow {
  id: string;
  order_number: string;
  delivery_name: string;
  total_amount: number;
  created_at: string;
}

interface ApiListResponse {
  success: boolean;
  data?: OrderPollRow[];
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

    play(880, 0, 0.18); // A5
    play(1318, 0.12, 0.22); // E6
    // AudioContext can't be synchronously closed; let GC handle it after stop.
  } catch {
    /* muted / autoplay blocked — silent fail */
  }
}

/**
 * Polls the admin orders list and surfaces a toast + chime when a new order
 * arrives while the admin is signed in. Clicking the toast navigates to the
 * order detail. Pauses when the tab is hidden (polls slower) to save quota.
 */
export function useNewOrderAlerts(): void {
  const token = useAuthStore((s) => s.token);
  const qc = useQueryClient();
  const toast = useToast();

  const seenRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!token) {
      seenRef.current = null;
      initializedRef.current = false;
      return;
    }

    let cancelled = false;
    let timer: number | null = null;

    async function tick(): Promise<void> {
      if (cancelled) return;
      try {
        const res = await fetch(`${API_BASE}/api/admin/orders?per_page=1`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const body = (await res.json()) as ApiListResponse;
          const latest = body.data?.[0];
          if (latest) {
            if (initializedRef.current && seenRef.current !== latest.id) {
              // Invalidate list + dashboard so they refetch automatically.
              qc.invalidateQueries({ queryKey: ['admin-orders'] });
              qc.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
              qc.invalidateQueries({ queryKey: ['admin-dashboard-revenue'] });

              toast.push(
                `New order · ${latest.order_number} · ${latest.delivery_name}`,
                'success',
              );
              playChime();

              // Favicon blink hint — title change so tabs that are
              // backgrounded visibly signal the new arrival.
              if (document.hidden) {
                const originalTitle = document.title;
                document.title = `🔔 New order · ${originalTitle}`;
                const restore = (): void => {
                  document.title = originalTitle;
                  document.removeEventListener('visibilitychange', restore);
                };
                document.addEventListener('visibilitychange', restore);
              }
            }
            seenRef.current = latest.id;
            initializedRef.current = true;
          } else if (!initializedRef.current) {
            // Empty orders list — still mark as initialised so that the first
            // real order triggers the alert.
            initializedRef.current = true;
          }
        }
      } catch {
        /* transient network error — just try again next tick */
      }
      if (cancelled) return;
      const delay = document.hidden ? HIDDEN_POLL_INTERVAL_MS : POLL_INTERVAL_MS;
      timer = window.setTimeout(tick, delay);
    }

    // Kick off one immediately to establish the baseline, then every interval.
    tick();

    const onVisible = (): void => {
      if (!document.hidden && !cancelled) {
        if (timer) window.clearTimeout(timer);
        tick();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // `toast`/`qc` are stable refs; only `token` actually triggers a restart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
}
