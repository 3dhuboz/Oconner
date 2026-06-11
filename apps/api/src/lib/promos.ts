export function parsePromoDeliveryDayIds(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
  } catch {
    return [];
  }
}

export function promoAllowsDeliveryDay(
  promo: { deliveryDayIds?: string | null },
  deliveryDayId: string | null | undefined,
): boolean {
  const allowedIds = parsePromoDeliveryDayIds(promo.deliveryDayIds);
  if (allowedIds.length === 0) return true;
  return Boolean(deliveryDayId && allowedIds.includes(deliveryDayId));
}
