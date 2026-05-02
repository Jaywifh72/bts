'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const COOKIE_NAME = 'admin_token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function login(formData: FormData) {
  const token = String(formData.get('token') ?? '');
  const next = String(formData.get('next') ?? '/admin/videos');
  const expected = process.env.ADMIN_TOKEN;

  if (!expected) {
    redirect('/admin/login?error=server_misconfigured');
  }
  if (token !== expected) {
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
