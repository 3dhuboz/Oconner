export interface DriverSession {
  id: string;
  driverUid: string;
  driverName: string;
  deliveryDayId: string;
  startedAt: number;
  completedAt?: number;
  lastLat: number;
  lastLng: number;
  lastUpdated: number;
  /** Capped at 500 entries */
  breadcrumb: Array<{ lat: number; lng: number; ts: number }>;
  totalStops: number;
  completedStops: number;
  flaggedStops: number;
}
