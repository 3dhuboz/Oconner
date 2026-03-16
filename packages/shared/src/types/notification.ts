import type { Timestamp } from 'firebase/firestore';
import type { OrderItem } from './order';

export type NotificationType =
  | 'order_confirmation'
  | 'day_before'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'refund'
  | 'payment_failed';

export interface NotificationLog {
  id: string;
  orderId: string;
  customerId: string;
  type: NotificationType;
  sentAt: Timestamp;
  status: 'sent' | 'failed' | 'bounced';
  provider: 'sendgrid';
  messageId: string;
  recipientEmail: string;
}

export interface EmailTemplateData {
  customerName: string;
  orderId: string;
  orderItems: OrderItem[];
  /** cents */
  subtotal: number;
  /** cents */
  deliveryFee: number;
  /** cents */
  gst: number;
  /** cents */
  total: number;
  deliveryDate: string;
  deliveryAddress: string;
  trackingUrl: string;
  proofUrl?: string;
}
