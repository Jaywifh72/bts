import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@bts/db', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  },
  bookmarks: {
    userId: {},
    kind: {},
    slug: {},
    addedAt: {},
  },
}));
vi.mock('@/lib/rate-limit', () => ({
  rateLimitByIp: vi.fn().mockResolvedValue({ ok: true }),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import {
  addBookmarkAction,
  removeBookmarkAction,
  toggleBookmarkAction,
  hasBookmarkAction,
} from './bookmarks';
import { auth } from '@/auth';

describe('bookmark server actions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('addBookmarkAction throws when unauthenticated', async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(
      addBookmarkAction({ kind: 'film', slug: 'x', title: 't', href: '/films/x' }),
    ).rejects.toThrow(/unauth/i);
  });

  it('addBookmarkAction succeeds when authenticated', async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'user-123' } });
    await addBookmarkAction({ kind: 'film', slug: 'x', title: 't', href: '/films/x' });
    // No throw = pass; the mocks return undefined.
  });

  it('removeBookmarkAction throws when unauthenticated', async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(removeBookmarkAction('film', 'x')).rejects.toThrow(/unauth/i);
  });

  it('toggleBookmarkAction throws when unauthenticated', async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(
      toggleBookmarkAction({ kind: 'film', slug: 'x', title: 't', href: '/films/x' }),
    ).rejects.toThrow(/unauth/i);
  });

  it('hasBookmarkAction throws when unauthenticated', async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(hasBookmarkAction('film', 'x')).rejects.toThrow(/unauth/i);
  });
});
