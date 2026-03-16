import type { Timestamp } from 'firebase/firestore';

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  abn: string;
  paymentTerms: string;
  notes: string;
  active: boolean;
  createdAt: Timestamp;
}
