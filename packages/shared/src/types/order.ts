export type OrderStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'preparing'
  | 'packed'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type PaymentStatus = 'paid' | 'failed' | 'refunded' | 'partial_refund' | 'invoiced';

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
