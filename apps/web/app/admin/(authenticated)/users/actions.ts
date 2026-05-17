'use server';

import { revalidatePath } from 'next/cache';
import { eq, count } from 'drizzle-orm';
import { db, users } from '@bts/db';
import { auth } from '@/auth';

const ROLES = ['admin', 'super_user', 'premium', 'standard'] as const;
type Role = (typeof ROLES)[number];

async function requireAdmin(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  if (session.user.role !== 'admin') throw new Error('Forbidden: admin only');
  return session.user.id;
}

export type UpdateRoleResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateUserRoleAction(
  targetUserId: string,
  newRole: Role,
): Promise<UpdateRoleResult> {
  if (!ROLES.includes(newRole)) {
    return { ok: false, error: 'Invalid role' };
  }
  let actorId: string;
  try {
    actorId = await requireAdmin();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unauthorized' };
  }

  // Lock-out guard: don't let an admin demote themselves if they're the
  // last admin in the system. Anyone else can be demoted freely.
  if (actorId === targetUserId && newRole !== 'admin') {
    const result = await db
      .select({ value: count() })
      .from(users)
      .where(eq(users.role, 'admin'));
    const adminCount = result[0]?.value ?? 0;
    if (adminCount <= 1) {
      return {
        ok: false,
        error: 'You are the last admin. Promote another user before demoting yourself.',
      };
    }
  }

  await db.update(users).set({ role: newRole }).where(eq(users.id, targetUserId));
  revalidatePath('/admin/users');
  return { ok: true };
}
