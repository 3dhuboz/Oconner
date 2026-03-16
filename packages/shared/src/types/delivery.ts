import type { Timestamp } from 'firebase/firestore';
import type { Address, OrderItem } from './order';

export type StopStatus = 'pending' | 'en_route' | 'arrived' | 'delivered' | 'failed' | 'skipped';

export type FlagReason = 'nobody_home' | 'wrong_address' | 'damaged' | 'refused' | 'other';

export interface DeliveryDay {
  id: string;
  date: Timestamp;
  /** 0=Sun, 1=Mon, ... */
  dayOfWeek: number;
  active: boolean;
  frozen: boolean;
  cutoffTime: Timestamp;
  capacityLimit: number;
  orderCount: number;
  routeGenerated: boolean;
  routeGeneratedAt?: Timestamp;
  driverUid?: string;
  runStartedAt?: Timestamp;
  runCompletedAt?: Timestamp;
  createdAt: Timestamp;
}

export interface Stop {
  id: string;
  orderId: string;
  deliveryDayId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  address: Address;
  items: OrderItem[];
  sequence: number;
  status: StopStatus;
  estimatedArrival?: Timestamp;
  completedAt?: Timestamp;
  proofUrl?: string;
  lat?: number;
  lng?: number;
  customerNote?: string;
  driverNote?: string;
  flagReason?: FlagReason;
  createdAt: Timestamp;
}
