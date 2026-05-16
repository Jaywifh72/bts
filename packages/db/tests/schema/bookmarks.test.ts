import { describe, it, expect } from 'vitest';
import { bookmarks } from '../../src/schema/index.ts';
import { getTableConfig } from 'drizzle-orm/pg-core';

describe('bookmarks schema', () => {
  it('has composite PK (user_id, kind, slug) and FK to users with cascade', () => {
    const cfg = getTableConfig(bookmarks);
    expect(cfg.name).toBe('bookmarks');
    const pk = cfg.primaryKeys[0];
    expect(pk.columns.map((c) => c.name).sort()).toEqual(['kind', 'slug', 'user_id']);
    const userId = cfg.columns.find((c) => c.name === 'user_id')!;
    expect(userId.notNull).toBe(true);
  });

  it('has title, subtitle (nullable), href, added_at columns', () => {
    const cfg = getTableConfig(bookmarks);
    const names = cfg.columns.map((c) => c.name);
    expect(names).toEqual(expect.arrayContaining(['user_id', 'kind', 'slug', 'title', 'subtitle', 'href', 'added_at']));
    const subtitle = cfg.columns.find((c) => c.name === 'subtitle')!;
    expect(subtitle.notNull).toBe(false);
  });
});
