export type StockMovementType =
  | 'sale'
  | 'adjustment'
  | 'stocktake_correction'
  | 'wastage'
  | 'supplier_delivery';

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: StockMovementType;
  /** positive = in, negative = out */
  qty: number;
  unit: 'kg' | 'units';
  reason?: string;
  orderId?: string;
  supplierId?: string;
  stocktakeSessionId?: string;
  createdBy: string;
  createdAt: number;
}

export interface StocktakeItem {
  productId: string;
  productName: string;
  unit: 'kg' | 'units';
  systemQty: number;
  countedQty?: number;
  variance?: number;
  countedAt?: number;
}

export interface StocktakeSession {
  id: string;
  date: number;
  status: 'in_progress' | 'completed';
  categories: string[];
  items: StocktakeItem[];
  /** kg */
  totalVarianceKg: number;
  /** cents */
  totalVarianceValue: number;
  approvedBy?: string;
  approvedAt?: number;
  createdBy: string;
  createdAt: number;
}
