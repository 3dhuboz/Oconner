import type { Timestamp } from 'firebase/firestore';

export interface DriverSession {
  id: string;
  driverUid: string;
  driverName: string;
  deliveryDayId: string;
  startedAt: Timestamp;
  completedAt?: Timestamp;
  lastLat: number;
  lastLng: number;
  lastUpdated: Timestamp;
  /** Capped at 500 entries */
  breadcrumb: Array<{ lat: number; lng: number; ts: Timestamp }>;
  totalStops: number;
  completedStops: number;
  flaggedStops: number;
}
