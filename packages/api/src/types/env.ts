export interface Env {
  DB: D1Database;
  R2_PRODUCTS: R2Bucket;
  R2_PROOFS: R2Bucket;
  KV_SESSIONS: KVNamespace;
  KV_RATE_LIMIT: KVNamespace;
  KV_CACHE: KVNamespace;
  APP_ENV: string;
  STOREFRONT_ORIGIN: string;
  ADMIN_ORIGIN: string;
  JWT_SECRET?: string;
  PAYSTACK_SECRET_KEY?: string;
  PAYSTACK_WEBHOOK_SECRET?: string;
  R2_PROOFS_PUBLIC_BASE?: string;
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
  STOREFRONT_URL?: string;
  ADMIN_URL?: string;
}
