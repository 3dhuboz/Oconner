export interface Env {
  DB: D1Database;
  IMAGES: R2Bucket;
  AI: Ai;
  CLERK_SECRET_KEY: string;
  RESEND_API_KEY: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  GOOGLE_MAPS_API_KEY: string;
  STOREFRONT_URL: string;
  FROM_EMAIL: string;
  ENVIRONMENT: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
}

export type UserRole = 'admin' | 'staff' | 'driver';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}
