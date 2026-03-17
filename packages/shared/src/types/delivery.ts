import type { Address, OrderItem } from './order';

export type StopStatus = 'pending' | 'en_route' | 'arrived' | 'delivered' | 'failed' | 'skipped';

export type FlagReason = 'nobody_home' | 'wrong_address' | 'damaged' | 'refused' | 'other';

export interface DeliveryDay {
  id: string;
  date: number;
  /** 0=Sun, 1=Mon, ... */
  dayOfWeek: number;
  active: boolean;
  frozen: boolean;
  cutoffTime: number;
  maxOrders: number;
  orderCount: number;
  notes?: string;
  routeGenerated: boolean;
  routeGeneratedAt?: number;
  driverUid?: string;
  runStartedAt?: number;
  runCompletedAt?: number;
  createdAt: number;
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
  estimatedArrival?: number;
  completedAt?: number;
  proofUrl?: string;
  lat?: number;
  lng?: number;
  customerNote?: string;
  driverNote?: string;
  flagReason?: FlagReason;
  createdAt: number;
}
