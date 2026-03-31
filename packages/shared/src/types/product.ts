export type ProductCategory = 'beef' | 'lamb' | 'pork' | 'chicken' | 'packs' | string;

export interface Product {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  isMeatPack: boolean;
  /** Price in cents per kg (loose cuts) */
  pricePerKg?: number;
  /** Fixed price in cents (packs) */
  fixedPrice?: number;
  /** e.g. [500, 1000, 1500, 2000] grams */
  weightOptions?: number[];
  packContents?: string;
  imageUrl: string;
  /** kg for cuts, units for packs */
  stockOnHand: number;
  minThreshold: number;
  maxStock?: number;
  supplierId?: string;
  active: boolean;
  displayOrder: number;
  gstApplicable: boolean;
  seasonalStart?: number;
  seasonalEnd?: number;
  createdAt: number;
  updatedAt: number;
}
