import type { Address } from './order';

export interface Customer {
  id: string;
  email: string;
  phone: string;
  name: string;
  addresses: Address[];
  accountType: 'registered' | 'guest';
  orderCount: number;
  /** cents */
  totalSpent: number;
  blacklisted: boolean;
  blacklistReason?: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
}
