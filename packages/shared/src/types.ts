import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  DeliveryMethod,
  AdminRole,
  AdminNotificationType,
} from './constants';

export interface AdminNotification {
  id: string;
  type: AdminNotificationType;
  entity_type: string | null;
  entity_id: string | null;
  title: string;
  body: string | null;
  metadata: string | null;
  read_at: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string | null;
  price_adjustment: number;
  stock_quantity: number;
  weight_kg: number | null;
  is_active: boolean;
  created_at: string;
}

export interface BulkPricingTier {
  id: string;
  product_id: string;
  min_quantity: number;
  max_quantity: number | null;
  unit_price: number;
  discount_percent: number | null;
  label: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description: string | null;
  category_id: string;
  brand: string | null;
  sku: string | null;
  barcode: string | null;
  unit_price: number;
  compare_at_price: number | null;
  cost_price: number | null;
  currency: string;
  stock_quantity: number;
  low_stock_threshold: number;
  weight_kg: number | null;
  dimensions_cm: string | null;
  is_active: boolean;
  is_featured: boolean;
  is_bulk_available: boolean;
  bulk_minimum_qty: number;
  tags: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  avg_rating: number;
  review_count: number;
  total_sold: number;
  created_at: string;
  updated_at: string;
  /** Primary image URL, joined from product_images on list/featured endpoints. */
  image_url?: string | null;
}

export interface ProductWithRelations extends Product {
  category: Pick<Category, 'id' | 'name' | 'slug'>;
  images: ProductImage[];
  variants: ProductVariant[];
  bulk_tiers: BulkPricingTier[];
}

export interface Customer {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  region: string | null;
  country: string;
  gps_address: string | null;
  total_orders: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  sku: string | null;
  quantity: number;
  unit_price: number;
  is_bulk_order: boolean;
  bulk_tier_id: string | null;
  line_total: number;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string | null;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  paystack_reference: string | null;
  paystack_access_code: string | null;
  manual_payment_proof_url: string | null;
  manual_payment_confirmed_at: string | null;
  manual_payment_confirmed_by: string | null;
  subtotal: number;
  bulk_discount: number;
  delivery_fee: number;
  tax_amount: number;
  total_amount: number;
  delivery_method: DeliveryMethod;
  delivery_name: string;
  delivery_email: string;
  delivery_phone: string;
  delivery_address: string | null;
  delivery_city: string | null;
  delivery_region: string | null;
  delivery_gps: string | null;
  delivery_notes: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  estimated_delivery: string | null;
  delivered_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export interface AdminUser {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: AdminRole;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  regions: string;
  fee: number;
  estimated_days: string | null;
  is_active: boolean;
}

export interface StoreSetting {
  key: string;
  value: string;
  updated_at: string;
}

export interface ActivityLogEntry {
  id: string;
  admin_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    per_page?: number;
    total?: number;
  };
}
