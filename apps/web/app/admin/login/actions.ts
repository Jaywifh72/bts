'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { timingSafeEqual } from 'node:crypto';
import { safeAdminNextPath } from '@/lib/admin';

const COOKIE_NAME = 'admin_token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Constant-time equality check. Plain `!==` short-circuits on the first
 * mismatched byte, leaking timing information that — with enough
 * requests — lets an attacker deduce the admin token byte-by-byte.
 *
 * `timingSafeEqual` requires equal-length buffers; we pad to the longer
 * length and use that as the length comparison so attackers can't even
 * learn whether their guess has the right length.
 */
function tokensMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  const len = Math.max(a.length, b.length);
  const padA = Buffer.alloc(len);
  const padB = Buffer.alloc(len);
  a.copy(padA);
  b.copy(padB);
  return timingSafeEqual(padA, padB) && a.length === b.length;
}

export async function login(formData: FormData) {
  const token = String(formData.get('token') ?? '');
  const next = safeAdminNextPath(String(formData.get('next') ?? ''));
  const expected = process.env.ADMIN_TOKEN;

  if (!expected) {
    redirect('/admin/login?error=server_misconfigured');
  }
  if (!tokensMatch(token, expected)) {
    redirect(`/admin/login?error=invalid&next=${encodeURIComponent(next)}`);
  }

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });

  redirect(next);
}

export async function logout() {
  cookies().delete(COOKIE_NAME);
  redirect('/admin/login');
}
