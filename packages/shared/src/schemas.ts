import { z } from 'zod';
import {
  DELIVERY_METHODS,
  PAYMENT_METHODS,
  ORDER_STATUSES,
  ADMIN_ROLES,
  CUSTOMER_STATUSES,
} from './constants';

export const cartItemSchema = z.object({
  product_id: z.string().min(1),
  variant_id: z.string().min(1).optional(),
  quantity: z.number().int().positive(),
});
export type CartItemInput = z.infer<typeof cartItemSchema>;

export const createOrderSchema = z
  .object({
    items: z.array(cartItemSchema).min(1),
    delivery_method: z.enum(DELIVERY_METHODS),
    delivery_name: z.string().min(1).max(200),
    // Optional overall — the store calls the customer if they need extra info.
    // Paystack requires an email, so we enforce it in the refine below when
    // that payment method is chosen.
    delivery_email: z
      .string()
      .email()
      .optional()
      .or(z.literal('').transform(() => undefined)),
    delivery_phone: z.string().min(7).max(20),
    delivery_address: z.string().min(1).max(500).optional(),
    delivery_city: z.string().min(1).max(100).optional(),
    delivery_region: z.string().min(1).max(100).optional(),
    delivery_gps: z.string().max(30).optional(),
    delivery_notes: z.string().max(1000).optional(),
    payment_method: z.enum(PAYMENT_METHODS),
  })
  .refine((data) => data.payment_method !== 'paystack' || Boolean(data.delivery_email), {
    message: 'Email is required when paying with Paystack',
    path: ['delivery_email'],
  });
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

export const productCreateSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().min(1),
  short_description: z.string().max(500).optional(),
  category_id: z.string().min(1),
  brand: z.string().max(100).optional(),
  sku: z.string().max(100).optional(),
  unit_price: z.number().nonnegative(),
  compare_at_price: z.number().nonnegative().optional(),
  cost_price: z.number().nonnegative().optional(),
  stock_quantity: z.number().int().nonnegative(),
  low_stock_threshold: z.number().int().nonnegative().default(10),
  weight_kg: z.number().nonnegative().optional(),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  is_bulk_available: z.boolean().default(false),
  bulk_minimum_qty: z.number().int().positive().default(10),
  tags: z.string().optional(),
  seo_title: z.string().max(200).optional(),
  seo_description: z.string().max(300).optional(),
  seo_keywords: z.string().max(500).optional(),
});
export type ProductCreateInput = z.infer<typeof productCreateSchema>;

export const productUpdateSchema = productCreateSchema.partial();
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

export const bulkPricingTierSchema = z
  .object({
    min_quantity: z.number().int().positive(),
    max_quantity: z.number().int().positive().nullable(),
    unit_price: z.number().nonnegative(),
    discount_percent: z.number().nonnegative().max(100).optional(),
    label: z.string().max(100).optional(),
  })
  .refine((data) => data.max_quantity === null || data.max_quantity >= data.min_quantity, {
    message: 'max_quantity must be >= min_quantity',
    path: ['max_quantity'],
  });
export type BulkPricingTierInput = z.infer<typeof bulkPricingTierSchema>;

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  tracking_number: z.string().max(100).optional(),
  tracking_url: z.string().url().optional(),
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const confirmManualPaymentSchema = z.object({
  action: z.enum(['confirm', 'reject']),
  reason: z.string().min(1).max(1000).optional(),
});
export type ConfirmManualPaymentInput = z.infer<typeof confirmManualPaymentSchema>;

export const categoryCreateSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  image_url: z.string().url().optional(),
  parent_id: z.string().optional(),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
  seo_title: z.string().max(200).optional(),
  seo_description: z.string().max(300).optional(),
});
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;

export const adminRoleSchema = z.enum(ADMIN_ROLES);

const numericFromString = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === 'string' ? Number(v) : v))
  .refine((v) => !Number.isNaN(v), { message: 'must be a number' });

const booleanFromString = z
  .union([z.string(), z.boolean()])
  .transform((v) => (typeof v === 'boolean' ? v : v === 'true' || v === '1'));

export const productListQuerySchema = z.object({
  page: numericFromString.pipe(z.number().int().positive()).default(1),
  per_page: numericFromString.pipe(z.number().int().positive().max(100)).default(20),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'name_asc', 'popular']).default('newest'),
  category: z.string().min(1).max(100).optional(),
  brand: z.string().min(1).max(100).optional(),
  bulk_only: booleanFromString.default(false),
  min_price: numericFromString.pipe(z.number().nonnegative()).optional(),
  max_price: numericFromString.pipe(z.number().nonnegative()).optional(),
});
export type ProductListQuery = z.infer<typeof productListQuerySchema>;

export const productSearchQuerySchema = z.object({
  q: z.string().min(2).max(100),
  limit: numericFromString.pipe(z.number().int().positive().max(50)).default(20),
});
export type ProductSearchQuery = z.infer<typeof productSearchQuerySchema>;

export const orderTrackingQuerySchema = z
  .object({
    email: z
      .string()
      .email()
      .transform((s) => s.toLowerCase())
      .optional(),
    phone: z.string().min(7).max(20).optional(),
  })
  .refine((v) => Boolean(v.email) || Boolean(v.phone), {
    message: 'Provide either email or phone',
    path: ['email'],
  });
export type OrderTrackingQuery = z.infer<typeof orderTrackingQuerySchema>;

export const updateOrderDeliveryFeeSchema = z.object({
  delivery_fee: z.number().min(0).max(10000),
});
export type UpdateOrderDeliveryFeeInput = z.infer<typeof updateOrderDeliveryFeeSchema>;

export const customerStatusSchema = z.enum(CUSTOMER_STATUSES);

export const customerUpdateSchema = z.object({
  status: customerStatusSchema.optional(),
  notes: z.string().max(2000).optional(),
});
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;

export const adminUserCreateSchema = z.object({
  email: z.string().email().max(200).transform((s) => s.toLowerCase()),
  name: z.string().min(1).max(120),
  role: adminRoleSchema,
  password: z.string().min(12).max(200),
});
export type AdminUserCreateInput = z.infer<typeof adminUserCreateSchema>;

export const adminUserUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  role: adminRoleSchema.optional(),
  is_active: z.boolean().optional(),
});
export type AdminUserUpdateInput = z.infer<typeof adminUserUpdateSchema>;

export const adminUserResetPasswordSchema = z.object({
  password: z.string().min(12).max(200),
});

export const adminChangePasswordSchema = z.object({
  current_password: z.string().min(1).max(200),
  new_password: z.string().min(12).max(200),
});
export type AdminChangePasswordInput = z.infer<typeof adminChangePasswordSchema>;

export const uploadProofUrlSchema = z.object({
  proof_url: z
    .string()
    .url()
    .refine((u) => u.startsWith('https://'), {
      message: 'proof_url must use https',
    }),
});
export type UploadProofUrl = z.infer<typeof uploadProofUrlSchema>;
