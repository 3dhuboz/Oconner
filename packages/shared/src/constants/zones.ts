export const PRODUCT_CATEGORIES = [
  { id: 'beef', label: 'Beef' },
  { id: 'lamb', label: 'Lamb' },
  { id: 'pork', label: 'Pork' },
  { id: 'chicken', label: 'Chicken' },
  { id: 'packs', label: 'Meat Packs' },
] as const;

export type ProductCategoryId = (typeof PRODUCT_CATEGORIES)[number]['id'];

export const AUSTRALIAN_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'] as const;

export const GST_RATE = 0.1;
