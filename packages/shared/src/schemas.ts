import { z } from 'zod';
import {
  DELIVERY_METHODS,
  PAYMENT_METHODS,
  ORDER_STATUSES,
  ADMIN_ROLES,
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
    delivery_email: z.string().email(),
    delivery_phone: z.string().min(7).max(20),
    delivery_address: z.string().min(1).max(500).optional(),
    delivery_city: z.string().min(1).max(100).optional(),
    delivery_region: z.string().min(1).max(100).optional(),
    delivery_gps: z.string().max(30).optional(),
    delivery_notes: z.string().max(1000).optional(),
    payment_method: z.enum(PAYMENT_METHODS),
  })
  .refine(
    (data) =>
      data.delivery_method === 'pickup' ||
      (data.delivery_address && data.delivery_city && data.delivery_region),
    {
      message:
        'delivery_address, delivery_city, delivery_region are required for delivery orders',
      path: ['delivery_address'],
    },
  );
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
  .refine(
    (data) => data.max_quantity === null || data.max_quantity >= data.min_quantity,
    { message: 'max_quantity must be >= min_quantity', path: ['max_quantity'] },
  );
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
