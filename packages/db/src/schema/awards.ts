import { bigserial, bigint, boolean, index, integer, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { awardOrgEnum } from './enums.ts';
import { productions } from './productions.ts';
import { people } from './people.ts';
import { vfxHouses } from './vfx.ts';
import { stuntCompanies } from './stunts.ts';

export const productionAwards = pgTable('production_awards', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  productionId: bigint('production_id', { mode: 'number' })
    .notNull()
    .references(() => productions.id, { onDelete: 'cascade' }),
  awardOrg: awardOrgEnum('award_org').notNull(),
  category: text('category').notNull(),
  year: integer('year').notNull(),
  isWinner: boolean('is_winner').notNull().default(false),
  // 0018 — person recipient (Oscar DP → cinematographer, DGA → director, etc.)
  recipientPersonId: bigint('recipient_person_id', { mode: 'number' })
    .references(() => people.id, { onDelete: 'set null' }),
  // 0057 — org recipients. VES Awards → VFX house; SAG Stunt Ensemble /
  // Taurus → stunt company. AT MOST one recipient FK is non-null per row
  // (enforced by a CHECK constraint at the SQL level; not modelled in
  // drizzle since it'd require a custom check expression).
  recipientVfxHouseId: bigint('recipient_vfx_house_id', { mode: 'number' })
    .references(() => vfxHouses.id, { onDelete: 'set null' }),
  recipientStuntCompanyId: bigint('recipient_stunt_company_id', { mode: 'number' })
    .references(() => stuntCompanies.id, { onDelete: 'set null' }),
  sourceUrl: text('source_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  productionIdx: index('production_awards_production_idx').on(t.productionId, t.year),
  recipientIdx: index('production_awards_recipient_idx').on(t.recipientPersonId, t.year),
  recipientVfxIdx: index('production_awards_recipient_vfx_idx').on(t.recipientVfxHouseId, t.year),
  recipientStuntCoIdx: index('production_awards_recipient_stunt_co_idx').on(t.recipientStuntCompanyId, t.year),
  orgYearIdx: index('production_awards_org_year_idx').on(t.awardOrg, t.year),
  // 0050 + 0057 — NULLS NOT DISTINCT collapses production-level awards
  // (Best Picture, Best VFX team, etc.) where every recipient FK IS NULL.
  // Without it, seed re-runs duplicated every NULL-recipient award.
  uniq: unique('production_awards_unique')
    .on(t.productionId, t.awardOrg, t.category, t.year, t.recipientPersonId, t.recipientVfxHouseId, t.recipientStuntCompanyId)
    .nullsNotDistinct(),
}));
