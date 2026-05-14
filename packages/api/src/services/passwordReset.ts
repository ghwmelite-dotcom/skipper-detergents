import type { Env } from '../types/env';
import { sendEmail } from './mail';

/**
 * Password reset for admin users.
 *
 * The plaintext token is sent only in the reset email. We persist its
 * SHA-256 hash in admin_password_resets.token_hash so a DB compromise
 * doesn't yield usable reset links. Tokens are one-shot (used_at clears
 * them) and expire 30 minutes after creation.
 */

export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i] ?? 0);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function generateResetToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

export async function hashResetToken(token: string): Promise<string> {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(token));
  return toBase64Url(new Uint8Array(digest));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

interface ResetEmailInput {
  toEmail: string;
  toName: string;
  resetUrl: string;
  storeName: string;
  expiresInMinutes: number;
}

export async function sendResetEmail(env: Env, input: ResetEmailInput): Promise<boolean> {
  const { toEmail, toName, resetUrl, storeName, expiresInMinutes } = input;
  const subject = `Reset your ${storeName} admin password`;
  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#FCFBF7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0B2545;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FCFBF7;padding:30px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:white;border:1px solid #eef0f4;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#0B2545;padding:28px 32px;">
          <h1 style="margin:0;color:white;font-size:22px;font-weight:500;letter-spacing:-0.01em;">${escapeHtml(storeName)}</h1>
          <p style="margin:4px 0 0;color:#7BDFF2;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;">Password reset</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 10px;font-size:16px;color:#0B2545;">Hi ${escapeHtml(toName)},</p>
          <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#49546a;">
            We received a request to reset your admin password. Click the button below to choose a new one — the link is valid for <strong>${expiresInMinutes} minutes</strong>.
          </p>
          <p style="margin:0 0 24px;">
            <a href="${resetUrl}" style="display:inline-block;background:#0B2545;color:white;font-size:14px;font-weight:600;padding:12px 22px;border-radius:8px;text-decoration:none;letter-spacing:0.01em;">Reset password</a>
          </p>
          <p style="margin:0 0 8px;font-size:12px;color:#8893a5;">Or paste this link into your browser:</p>
          <p style="margin:0 0 24px;font-size:12px;color:#0B2545;word-break:break-all;">
            <a href="${resetUrl}" style="color:#0B2545;">${escapeHtml(resetUrl)}</a>
          </p>
          <p style="margin:0;font-size:12px;line-height:1.6;color:#8893a5;">
            If you didn't request this, you can safely ignore this email — your password won't change unless you click the link above.
          </p>
        </td></tr>
        <tr><td style="padding:18px 32px;border-top:1px solid #eef0f4;background:#FCFBF7;">
          <p style="margin:0;font-size:11px;color:#8893a5;">${escapeHtml(storeName)} · admin security</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = `Hi ${toName},

We received a request to reset your admin password.

Open this link to choose a new one (valid for ${expiresInMinutes} minutes):
${resetUrl}

If you didn't request this, ignore this email — your password won't change.

${storeName}`;

  return sendEmail(env, { to: toEmail, subject, html, text });
}

interface ConfirmEmailInput {
  toEmail: string;
  toName: string;
  storeName: string;
}

export async function sendResetConfirmationEmail(
  env: Env,
  input: ConfirmEmailInput,
): Promise<boolean> {
  const { toEmail, toName, storeName } = input;
  const subject = `Your ${storeName} admin password was changed`;
  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#FCFBF7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0B2545;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FCFBF7;padding:30px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:white;border:1px solid #eef0f4;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#0B2545;padding:28px 32px;">
          <h1 style="margin:0;color:white;font-size:22px;font-weight:500;letter-spacing:-0.01em;">${escapeHtml(storeName)}</h1>
          <p style="margin:4px 0 0;color:#7BDFF2;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;">Password changed</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 10px;font-size:16px;color:#0B2545;">Hi ${escapeHtml(toName)},</p>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#49546a;">
            This is a confirmation that your admin password was successfully changed. You can sign in with your new password right away.
          </p>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#49546a;">
            <strong>If this wasn't you</strong>, reply to this email immediately or contact another super admin to lock the account.
          </p>
        </td></tr>
        <tr><td style="padding:18px 32px;border-top:1px solid #eef0f4;background:#FCFBF7;">
          <p style="margin:0;font-size:11px;color:#8893a5;">${escapeHtml(storeName)} · admin security</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  const text = `Hi ${toName},

Your ${storeName} admin password was changed successfully.

If this wasn't you, contact another super admin immediately.`;
  return sendEmail(env, { to: toEmail, subject, html, text });
}
