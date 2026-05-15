import type { Order, OrderItem } from '@skipper/shared';
import type { Env } from '../types/env';
import { all } from '../utils/db';
import { sendEmail } from './mail';
import { getSetting } from './settings';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function ghs(n: number): string {
  try {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `GHS ${n.toFixed(2)}`;
  }
}

function row(label: string, value: string, bold = false): string {
  return `<tr>
    <td style="padding:6px 0;color:#647085;font-size:13px;">${escapeHtml(label)}</td>
    <td style="padding:6px 0;text-align:right;color:#0B2545;font-size:13px;${bold ? 'font-weight:600;' : ''}">${value}</td>
  </tr>`;
}

function itemsTable(items: OrderItem[]): string {
  const rows = items
    .map(
      (it) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f2f3f6;font-size:13px;color:#0B2545;">
          ${escapeHtml(it.product_name)}${it.variant_name ? ` — ${escapeHtml(it.variant_name)}` : ''}
          <div style="color:#8893a5;font-size:11px;margin-top:2px;">${it.sku ? escapeHtml(it.sku) : ''}</div>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #f2f3f6;text-align:right;font-size:13px;color:#0B2545;">${it.quantity} × ${ghs(it.unit_price)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f2f3f6;text-align:right;font-size:13px;color:#0B2545;font-weight:600;">${ghs(it.line_total)}</td>
      </tr>`,
    )
    .join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rows}</table>`;
}

interface EmailContext {
  order: Order;
  items: OrderItem[];
  storeName: string;
  storefrontUrl: string;
}

function renderCustomerEmail(ctx: EmailContext): { html: string; text: string; subject: string } {
  const { order, items, storeName, storefrontUrl } = ctx;
  const trackUrl = `${storefrontUrl}/track/${order.order_number}`;
  const isManual = order.payment_method === 'manual_transfer';

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#FCFBF7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0B2545;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FCFBF7;padding:30px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:white;border:1px solid #eef0f4;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#0B2545;padding:28px 32px;">
          <h1 style="margin:0;color:white;font-size:22px;font-weight:500;letter-spacing:-0.01em;">${escapeHtml(storeName)}</h1>
          <p style="margin:4px 0 0;color:#7BDFF2;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;">Order confirmation</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px;font-size:16px;color:#0B2545;">Thank you, ${escapeHtml(order.delivery_name)}.</p>
          <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#49546a;">
            We've received your order <strong>${order.order_number}</strong>. ${
              order.delivery_method === 'delivery'
                ? `We'll call ${escapeHtml(order.delivery_phone)} shortly to confirm your delivery location and agree on the delivery fee.`
                : `You can pick it up from our store once payment is confirmed.`
            }
          </p>

          ${
            isManual
              ? `<div style="background:#FFF8E6;border:1px solid #F7C86C;border-radius:6px;padding:14px 16px;margin-bottom:18px;">
                   <p style="margin:0 0 6px;color:#8a5a00;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;">Next step</p>
                   <p style="margin:0;color:#0B2545;font-size:13px;line-height:1.55;">Complete the Bank / MoMo transfer and upload proof on your order page.</p>
                 </div>`
              : ''
          }

          <h3 style="margin:24px 0 10px;font-size:13px;letter-spacing:0.14em;text-transform:uppercase;color:#647085;">Items</h3>
          ${itemsTable(items)}

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;">
            ${row('Subtotal', ghs(order.subtotal))}
            ${order.bulk_discount > 0 ? row('Bulk discount', `− ${ghs(order.bulk_discount)}`) : ''}
            ${row('Delivery', order.delivery_method === 'pickup' ? 'Free pickup' : order.delivery_fee > 0 ? ghs(order.delivery_fee) : 'Agreed on call')}
            <tr><td colspan="2" style="border-top:1px solid #eef0f4;padding-top:4px;"></td></tr>
            ${row('Total', ghs(order.total_amount), true)}
          </table>

          <div style="margin-top:26px;">
            <a href="${trackUrl}" style="display:inline-block;background:#0B2545;color:white;text-decoration:none;padding:11px 22px;border-radius:6px;font-size:13px;font-weight:500;">Track your order</a>
          </div>

          <p style="margin:24px 0 0;font-size:12px;color:#8893a5;line-height:1.55;">
            Need help? Just reply to this email.
          </p>
        </td></tr>
        <tr><td style="background:#f8f9fb;padding:16px 32px;border-top:1px solid #eef0f4;text-align:center;">
          <p style="margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8893a5;">${escapeHtml(storeName)} · A Skipper Limited company · Accra</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = `Thank you, ${order.delivery_name}.

Order ${order.order_number} received.
${order.delivery_method === 'delivery' ? `We'll call ${order.delivery_phone} to confirm your delivery location and the final fee.` : 'Ready for pickup once payment is confirmed.'}

Subtotal: ${ghs(order.subtotal)}
Delivery: ${order.delivery_method === 'pickup' ? 'Free pickup' : order.delivery_fee > 0 ? ghs(order.delivery_fee) : 'Agreed on call'}
Total:    ${ghs(order.total_amount)}

Track: ${trackUrl}

— ${storeName}`;

  return { html, text, subject: `${storeName} — order ${order.order_number} received` };
}

function renderAdminEmail(
  ctx: EmailContext & { adminUrl: string },
): { html: string; text: string; subject: string } {
  const { order, items, adminUrl } = ctx;
  const detailUrl = `${adminUrl}/orders/${order.id}`;

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0B2545;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:white;border:1px solid #e4e6ea;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#E63946;padding:20px 28px;">
          <h1 style="margin:0;color:white;font-size:18px;font-weight:600;">🔔 New order · ${order.order_number}</h1>
          <p style="margin:4px 0 0;color:white;opacity:0.88;font-size:13px;">${escapeHtml(order.delivery_name)} · ${ghs(order.total_amount)}</p>
        </td></tr>
        <tr><td style="padding:24px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
            <tr><td style="color:#647085;padding:4px 0;width:140px;">Customer</td><td style="color:#0B2545;padding:4px 0;">${escapeHtml(order.delivery_name)}</td></tr>
            <tr><td style="color:#647085;padding:4px 0;">Phone</td><td style="color:#0B2545;padding:4px 0;">${escapeHtml(order.delivery_phone)}</td></tr>
            ${order.delivery_email ? `<tr><td style="color:#647085;padding:4px 0;">Email</td><td style="color:#0B2545;padding:4px 0;">${escapeHtml(order.delivery_email)}</td></tr>` : ''}
            <tr><td style="color:#647085;padding:4px 0;">Method</td><td style="color:#0B2545;padding:4px 0;">${order.delivery_method === 'pickup' ? 'Store pickup' : 'Home delivery'}</td></tr>
            <tr><td style="color:#647085;padding:4px 0;">Payment</td><td style="color:#0B2545;padding:4px 0;">${order.payment_method === 'paystack' ? 'Paystack' : 'Bank / MoMo transfer'}</td></tr>
            ${order.delivery_notes ? `<tr><td style="color:#647085;padding:4px 0;vertical-align:top;">Notes</td><td style="color:#0B2545;padding:4px 0;white-space:pre-wrap;">${escapeHtml(order.delivery_notes)}</td></tr>` : ''}
          </table>

          <h3 style="margin:22px 0 8px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#647085;">Items (${items.length})</h3>
          ${itemsTable(items)}

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
            ${row('Subtotal', ghs(order.subtotal))}
            ${row('Delivery fee', order.delivery_fee > 0 ? ghs(order.delivery_fee) : '— set after call')}
            ${row('Total', ghs(order.total_amount), true)}
          </table>

          <div style="margin-top:22px;">
            <a href="${detailUrl}" style="display:inline-block;background:#0B2545;color:white;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:13px;font-weight:500;">Open order</a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = `New order · ${order.order_number}
Customer: ${order.delivery_name}
Phone:    ${order.delivery_phone}
${order.delivery_email ? `Email:    ${order.delivery_email}\n` : ''}Method:   ${order.delivery_method}
Payment:  ${order.payment_method}
Items:    ${items.length}
Total:    ${ghs(order.total_amount)}

Open: ${detailUrl}`;

  return { html, text, subject: `New order · ${order.order_number} · ${ghs(order.total_amount)}` };
}

/**
 * Fire-and-log order notification emails. Pass this into c.executionCtx.waitUntil()
 * so a slow Resend call can't delay the customer's order confirmation response.
 */
export async function sendOrderCreatedEmails(env: Env, order: Order): Promise<void> {
  const [storeNameRaw, adminEmail, items] = await Promise.all([
    getSetting(env.DB, 'store_name'),
    getSetting(env.DB, 'admin_notification_email'),
    all<OrderItem>(env.DB, `SELECT * FROM order_items WHERE order_id = ?`, [order.id]),
  ]);
  const storeName = storeNameRaw ?? 'Skipper CleanCare';
  const storefrontUrl = env.STOREFRONT_URL ?? 'https://skipperdetergents.pages.dev';
  const adminUrl = env.ADMIN_URL ?? 'https://skipper-admin.pages.dev';

  const ctx = { order, items, storeName, storefrontUrl };
  const sends: Promise<unknown>[] = [];

  if (order.delivery_email) {
    const tpl = renderCustomerEmail(ctx);
    sends.push(
      sendEmail(env, {
        to: order.delivery_email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
      }),
    );
  }

  if (adminEmail) {
    const tpl = renderAdminEmail({ ...ctx, adminUrl });
    sends.push(
      sendEmail(env, {
        to: adminEmail,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
        ...(order.delivery_email ? { replyTo: order.delivery_email } : {}),
      }),
    );
  }

  await Promise.allSettled(sends);
}
