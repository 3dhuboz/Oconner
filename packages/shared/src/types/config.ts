import type { Address } from './order';

export interface BusinessConfig {
  name: string;
  abn: string;
  address: Address;
  phone: string;
  email: string;
  logoUrl: string;
  /** Hex colour e.g. "#1B3A2E" */
  brandColor: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  postcodes: string[];
  /** cents */
  fee: number;
  /** cents */
  minOrder: number;
  /** cents */
  freeDeliveryThreshold?: number;
}

export interface DeliveryConfig {
  zones: DeliveryZone[];
  defaultCutoffHour: number;
  defaultCapacity: number;
  advanceBookingDays: number;
  /** e.g. [2, 5] = Tuesday and Friday */
  defaultDeliveryDays: number[];
}

export interface PaymentConfig {
  provider: 'stripe' | 'square';
  /** Safe to expose to browser */
  stripePublishableKey: string;
  squareAppId?: string;
}

export interface NotificationConfig {
  templates: Record<string, { subject: string; body: string }>;
  toggles: Record<string, boolean>;
  smsEnabled: boolean;
}
