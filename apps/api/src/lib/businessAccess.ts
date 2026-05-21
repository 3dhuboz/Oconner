/**
 * Multi-tenant access helper.
 *
 * Every receipt + business endpoint must verify the requesting user is a
 * member of the target business before reading or writing — otherwise one
 * tenant's data leaks into another's once a second business exists.
 *
 * For now there's only O'Connor Agriculture, but doing the check from day
 * one means adding tenant #2 is a config change, not a security audit.
 */
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { businessMembers } from '@butcher/db';

export interface MembershipResult {
  ok: boolean;
  role?: string;
}

export async function checkMembership(
  db: ReturnType<typeof drizzle>,
  userId: string,
  businessId: string,
): Promise<MembershipResult> {
  const [member] = await db.select().from(businessMembers)
    .where(and(eq(businessMembers.userId, userId), eq(businessMembers.businessId, businessId)))
    .limit(1);
  if (!member) return { ok: false };
  return { ok: true, role: member.role };
}
