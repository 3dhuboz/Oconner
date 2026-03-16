export const COLLECTIONS = {
  PRODUCTS: 'products',
  ORDERS: 'orders',
  DELIVERY_DAYS: 'deliveryDays',
  DRIVER_SESSIONS: 'driverSessions',
  CUSTOMERS: 'customers',
  STOCK_MOVEMENTS: 'stockMovements',
  STOCKTAKE_SESSIONS: 'stocktakeSessions',
  SUPPLIERS: 'suppliers',
  NOTIFICATIONS: 'notifications',
  AUDIT_LOG: 'auditLog',
  CONFIG: 'config',
} as const;

export const SUB_COLLECTIONS = {
  STOPS: 'stops',
} as const;

export const CONFIG_DOCS = {
  BUSINESS: 'business',
  DELIVERY: 'delivery',
  PAYMENT: 'payment',
  NOTIFICATIONS: 'notifications',
} as const;
