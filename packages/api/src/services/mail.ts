import type { Env } from '../types/env';

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

/**
 * Send an email via Resend. Silently no-ops if the Worker isn't configured —
 * we don't want missing API keys to fail the customer's order. Errors from
 * Resend are logged but not thrown.
 */
export async function sendEmail(env: Env, input: SendEmailInput): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    console.warn('[mail] RESEND_API_KEY not set — skipping', { subject: input.subject });
    return false;
  }
  const from = env.MAIL_FROM ?? 'Skipper CleanCare <onboarding@resend.dev>';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(input.to) ? input.to : [input.to],
        subject: input.subject,
        html: input.html,
        ...(input.text !== undefined && { text: input.text }),
        ...(input.replyTo !== undefined && { reply_to: input.replyTo }),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[mail] resend rejected', res.status, body.slice(0, 300));
      return false;
    }
    return true;
  } catch (err) {
    console.error('[mail] resend fetch failed', err);
    return false;
  }
}
