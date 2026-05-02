import { NextResponse, type NextRequest } from 'next/server';

/**
 * Gate /admin/* on a single shared token stored in the ADMIN_TOKEN env var.
 * The login page itself (/admin/login) is exempt so users can authenticate.
 *
 * This is intentionally minimal — full multi-user auth is sub-project 6.
 * For now this protects the single-operator review UI from drive-by access.
 */
export function middleware(req: NextRequest) {
  const expected = process.env.ADMIN_TOKEN;
  const provided = req.cookies.get('admin_token')?.value;

  if (!expected || provided !== expected) {
    const url = new URL('/admin/login', req.url);
    url.searchParams.set('next', req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Match every /admin/* path EXCEPT /admin/login (login can't require auth).
  matcher: ['/admin/((?!login).*)'],
};
