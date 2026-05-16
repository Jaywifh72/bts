export type BookmarkKind =
  | 'film' | 'crew' | 'gear-item' | 'gear-series' | 'vfx-house'
  | 'stunt-company' | 'stunt-school' | 'reference' | 'format' | 'society';

export type Bookmark = {
  kind: BookmarkKind;
  slug: string;
  title: string;
  subtitle?: string;
  href: string;
  addedAt: string;
};

export interface BookmarkStore {
  list(): Promise<Bookmark[]>;
  has(kind: BookmarkKind, slug: string): Promise<boolean>;
  add(b: Omit<Bookmark, 'addedAt'>): Promise<void>;
  remove(kind: BookmarkKind, slug: string): Promise<void>;
  toggle(b: Omit<Bookmark, 'addedAt'>): Promise<boolean>;
}
