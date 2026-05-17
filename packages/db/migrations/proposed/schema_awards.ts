// PROPOSED — replacement Drizzle schema for `packages/db/src/schema/awards.ts`
// after migrations 0069-0072 are applied. Not yet promoted.
//
// Diff from current:
//   - Table renamed `productionAwards` → `awards`
//   - `awardOrg` enum column → `awardOrgId` FK to awardOrgs
//   - `category` text column  → `categoryId` FK to awardCategories
//   - New `recipientKind` enum column (mirrors recipient slot used)
//   - `sourceUrl` kept (DEPRECATED comment) for read-back compat
//   - New tables: crafts, awardOrgs, awardCategories, awardRecipients, awardSources

import {
  bigserial, bigint, boolean, check, index, integer, pgEnum, pgTable,
  primaryKey, text, timestamp, unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { sourceConfidenceEnum } from '../../src/schema/enums.ts';
import { productions } from '../../src/schema/productions.ts';
import { people } from '../../src/schema/people.ts';
import { vfxHouses } from '../../src/schema/vfx.ts';
import { stuntCompanies } from '../../src/schema/stunts.ts';
import { sources } from '../../src/schema/sources.ts';

export const awardRecipientKindEnum = pgEnum('award_recipient_kind_enum', [
  'production', 'person', 'vfx_house', 'stunt_company', 'society', 'other_org',
]);

export const crafts = pgTable('crafts', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const awardOrgs = pgTable('award_orgs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  country: text('country'),
  kind: text('kind').notNull().default('society'),
  isCraftFocused: boolean('is_craft_focused').notNull().default(false),
  websiteUrl: text('website_url'),
  foundedYear: integer('founded_year'),
  summary: text('summary'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const awardCategories = pgTable('award_categories', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  orgId: bigint('org_id', { mode: 'number' })
    .notNull()
    .references(() => awardOrgs.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  craftId: bigint('craft_id', { mode: 'number' })
    .references(() => crafts.id, { onDelete: 'set null' }),
  recipientKind: awardRecipientKindEnum('recipient_kind').notNull().default('person'),
  isActive: boolean('is_active').notNull().default(true),
  firstYear: integer('first_year'),
  lastYear: integer('last_year'),
  sortOrder: integer('sort_order').notNull().default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  orgSlugUnq: unique('award_categories_org_slug_unique').on(t.orgId, t.slug),
  craftIdx: index('award_categories_craft_idx').on(t.craftId),
  orgIdx: index('award_categories_org_idx').on(t.orgId),
}));

export const awards = pgTable('awards', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  productionId: bigint('production_id', { mode: 'number' })
    .notNull()
    .references(() => productions.id, { onDelete: 'cascade' }),
  awardOrgId: bigint('award_org_id', { mode: 'number' })
    .notNull()
    .references(() => awardOrgs.id, { onDelete: 'restrict' }),
  categoryId: bigint('category_id', { mode: 'number' })
    .notNull()
    .references(() => awardCategories.id, { onDelete: 'restrict' }),
  year: integer('year').notNull(),
  isWinner: boolean('is_winner').notNull().default(false),
  recipientKind: awardRecipientKindEnum('recipient_kind').notNull(),
  // Legacy single-recipient FKs — DEPRECATED, prefer awardRecipients junction.
  recipientPersonId: bigint('recipient_person_id', { mode: 'number' })
    .references(() => people.id, { onDelete: 'set null' }),
  recipientVfxHouseId: bigint('recipient_vfx_house_id', { mode: 'number' })
    .references(() => vfxHouses.id, { onDelete: 'set null' }),
  recipientStuntCompanyId: bigint('recipient_stunt_company_id', { mode: 'number' })
    .references(() => stuntCompanies.id, { onDelete: 'set null' }),
  // DEPRECATED — write through awardSources for new rows.
  sourceUrl: text('source_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  productionIdx: index('awards_production_idx').on(t.productionId, t.year),
  recipientPersonIdx: index('awards_recipient_person_idx').on(t.recipientPersonId, t.year),
  recipientVfxIdx: index('awards_recipient_vfx_idx').on(t.recipientVfxHouseId, t.year),
  recipientStuntCoIdx: index('awards_recipient_stunt_co_idx').on(t.recipientStuntCompanyId, t.year),
  categoryYearIdx: index('awards_category_year_idx').on(t.categoryId, t.year),
  recipientKindIdx: index('awards_recipient_kind_idx').on(t.recipientKind),
  uniq: unique('awards_unique')
    .on(t.productionId, t.categoryId, t.year,
        t.recipientPersonId, t.recipientVfxHouseId, t.recipientStuntCompanyId)
    .nullsNotDistinct(),
}));

export const awardRecipients = pgTable('award_recipients', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  awardId: bigint('award_id', { mode: 'number' })
    .notNull()
    .references(() => awards.id, { onDelete: 'cascade' }),
  recipientKind: awardRecipientKindEnum('recipient_kind').notNull(),
  personId: bigint('person_id', { mode: 'number' })
    .references(() => people.id, { onDelete: 'set null' }),
  vfxHouseId: bigint('vfx_house_id', { mode: 'number' })
    .references(() => vfxHouses.id, { onDelete: 'set null' }),
  stuntCompanyId: bigint('stunt_company_id', { mode: 'number' })
    .references(() => stuntCompanies.id, { onDelete: 'set null' }),
  productionId: bigint('production_id', { mode: 'number' })
    .references(() => productions.id, { onDelete: 'set null' }),
  creditedAs: text('credited_as'),
  roleNote: text('role_note'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  awardIdx: index('award_recipients_award_idx').on(t.awardId, t.sortOrder),
  kindConsistent: check('award_recipients_kind_fk_consistent', sql`
    (recipient_kind = 'person'        AND person_id        IS NOT NULL AND vfx_house_id IS NULL AND stunt_company_id IS NULL AND production_id IS NULL) OR
    (recipient_kind = 'vfx_house'     AND vfx_house_id     IS NOT NULL AND person_id    IS NULL AND stunt_company_id IS NULL AND production_id IS NULL) OR
    (recipient_kind = 'stunt_company' AND stunt_company_id IS NOT NULL AND person_id    IS NULL AND vfx_house_id     IS NULL AND production_id IS NULL) OR
    (recipient_kind = 'production'    AND production_id    IS NOT NULL AND person_id    IS NULL AND vfx_house_id     IS NULL AND stunt_company_id IS NULL) OR
    (recipient_kind IN ('society', 'other_org'))
  `),
}));

export const awardSources = pgTable('award_sources', {
  awardId: bigint('award_id', { mode: 'number' })
    .notNull()
    .references(() => awards.id, { onDelete: 'cascade' }),
  sourceId: bigint('source_id', { mode: 'number' })
    .notNull()
    .references(() => sources.id, { onDelete: 'restrict' }),
  confidence: sourceConfidenceEnum('confidence').notNull(),
  claimQuote: text('claim_quote'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.awardId, t.sourceId] }),
  sourceIdx: index('award_sources_source_idx').on(t.sourceId),
}));
