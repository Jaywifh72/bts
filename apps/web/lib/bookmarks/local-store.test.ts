import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageBookmarkStore } from './local-store';

const item = { kind: 'film' as const, slug: 'dune-2021', title: 'Dune', href: '/films/dune-2021' };

describe('LocalStorageBookmarkStore', () => {
  beforeEach(() => window.localStorage.clear());

  it('starts empty', async () => {
    expect(await new LocalStorageBookmarkStore().list()).toEqual([]);
  });

  it('add + list returns the item with addedAt', async () => {
    const store = new LocalStorageBookmarkStore();
    await store.add(item);
    const list = await store.list();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject(item);
    expect(list[0]!.addedAt).toMatch(/^\d{4}-/);
  });

  it('add is idempotent on (kind, slug)', async () => {
    const store = new LocalStorageBookmarkStore();
    await store.add(item);
    await store.add(item);
    expect(await store.list()).toHaveLength(1);
  });

  it('toggle returns true when added, false when removed', async () => {
    const store = new LocalStorageBookmarkStore();
    expect(await store.toggle(item)).toBe(true);
    expect(await store.toggle(item)).toBe(false);
    expect(await store.list()).toEqual([]);
  });
});
