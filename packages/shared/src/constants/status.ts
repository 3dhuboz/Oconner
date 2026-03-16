import type { OrderStatus } from '../types';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Pending Payment',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  packed: 'Packed',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending_payment: '#FF9800',
  confirmed: '#2196F3',
  preparing: '#9C27B0',
  packed: '#00BCD4',
  out_for_delivery: '#FF5722',
  delivered: '#4CAF50',
  cancelled: '#F44336',
  refunded: '#607D8B',
};

export const STOP_STATUS_COLORS = {
  pending: '#9E9E9E',
  en_route: '#2196F3',
  arrived: '#FF9800',
  delivered: '#4CAF50',
  failed: '#F44336',
  skipped: '#607D8B',
} as const;

export const GPS_PING_INTERVAL_MS = 12_000;
export const BREADCRUMB_MAX_ENTRIES = 500;
export const GEOFENCE_ALERT_DISTANCE_M = 500;
export const GEOFENCE_ALERT_DURATION_MS = 2 * 60 * 1000;
