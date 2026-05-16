import { auth } from '@/auth';
import type { BookmarkKind } from '@/lib/bookmarks/types';
import { BookmarkButtonClient } from './BookmarkButtonClient';

/**
 * Server wrapper — reads session once and forwards isLoggedIn to the
 * client component. Lets every consumer keep importing `BookmarkButton`
 * unchanged while the actual store binding stays out of React context
 * (spec: no SessionProvider in v1).
 */
export async function BookmarkButton(props: {
  kind: BookmarkKind;
  slug: string;
  title: string;
  subtitle?: string;
  href: string;
  size?: 'sm' | 'md';
}) {
  const session = await auth();
  return <BookmarkButtonClient {...props} isLoggedIn={!!session?.user} />;
}
