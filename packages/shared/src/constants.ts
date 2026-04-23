export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
  'refunded',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_METHODS = ['paystack', 'manual_transfer'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['unpaid', 'paid', 'refunded'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const DELIVERY_METHODS = ['pickup', 'delivery'] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

export const CURRENCY = 'GHS' as const;

export const CUSTOMER_STATUSES = ['regular', 'bulk', 'vip', 'blocked'] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  regular: 'Regular',
  bulk: 'Bulk buyer',
  vip: 'VIP',
  blocked: 'Blocked',
};

export const ADMIN_NOTIFICATION_TYPES = [
  'order.created',
  'order.payment_proof_uploaded',
  'order.paystack_paid',
  'order.manual_payment_confirmed',
] as const;
export type AdminNotificationType = (typeof ADMIN_NOTIFICATION_TYPES)[number];

export const ADMIN_ROLES = ['super_admin', 'admin', 'store_manager'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super admin',
  admin: 'Admin',
  store_manager: 'Store manager',
};
