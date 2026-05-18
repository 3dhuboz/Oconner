export type OrderStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'preparing'
  | 'packed'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

// Keep in sync with the values written by apps/api routes & cron handlers.
// Verified against the production orders table: 'paid', 'invoice_sent',
// 'awaiting_payment', 'cancelled', 'pending_payment' all exist in the wild.
// 'payment_failed' is written by the subscription auto-charge fallback,
// 'invoiced' / 'failed' / 'refunded' / 'partial_refund' are historical or
// staff-set values from the admin UI.
export type PaymentStatus =
  | 'paid'
  | 'pending_payment'
  | 'awaiting_payment'
  | 'invoice_sent'
  | 'invoiced'
  | 'payment_failed'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partial_refund';

export type PaymentProvider = 'stripe' | 'square';

export interface Address {
  line1: string;
  line2?: string;
  suburb: string;
  state: string;
  postcode: string;
  country: 'AU';
  lat?: number;
  lng?: number;
  instructions?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  category: string;
  isMeatPack: boolean;
  /** grams (storefront) */
  weight?: number;
  /** kg (admin) */
  weightKg?: number;
  /** for packs */
  quantity?: number;
  /** cents per kg */
  pricePerKg?: number;
  /** cents fixed */
  fixedPrice?: number;
  /** cents */
  lineTotal: number;
  /** bulk share: include soup bones */
  includeSoupBones?: boolean;
  /** bulk share: include offal */
  includeOffal?: boolean;
}

export interface Order {
  id: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  /** cents */
  subtotal: number;
  /** cents */
  deliveryFee: number;
  /** cents */
  gst: number;
  /** cents */
  total: number;
  status: OrderStatus;
  deliveryDayId: string;
  deliveryAddress: Address;
  postcodeZone: string;
  paymentIntentId: string;
  paymentProvider: PaymentProvider;
  paymentStatus: PaymentStatus;
  notes?: string;
  internalNotes?: string;
  proofUrl?: string;
  packedAt?: number;
  packedBy?: string;
  createdAt: number;
  updatedAt: number;
}
