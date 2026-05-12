const DEFAULT_ADMIN_PATH = '/admin/videos';

export function safeAdminNextPath(value: string | undefined | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return DEFAULT_ADMIN_PATH;
  }
  try {
    const parsed = new URL(value, 'http://localhost');
    return parsed.pathname.startsWith('/admin')
      ? `${parsed.pathname}${parsed.search}`
      : DEFAULT_ADMIN_PATH;
  } catch {
    return DEFAULT_ADMIN_PATH;
  }
}
