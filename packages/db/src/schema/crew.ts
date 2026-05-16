import {
  pgTable, bigserial, bigint, boolean, integer, smallint, text, timestamp, date, unique, index,
} from 'drizzle-orm/pg-core';
import { productions } from './productions.ts';
import { people } from './people.ts';
import { roles } from './roles.ts';

export const crewAssignments = pgTable('crew_assignments', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  productionId: bigint('production_id', { mode: 'number' })
    .notNull()
    .references(() => productions.id, { onDelete: 'cascade' }),
  personId: bigint('person_id', { mode: 'number' })
    .notNull()
    .references(() => people.id, { onDelete: 'restrict' }),
  roleId: smallint('role_id')                          // smallint matches roles.id (smallserial)
    .notNull()
    .references(() => roles.id, { onDelete: 'restrict' }),
  creditOrder: integer('credit_order'),
  creditNameOverride: text('credit_name_override'),
  startedOn: date('started_on'),
  endedOn: date('ended_on'),
  notes: text('notes'),
  // Migration 0059 — curator-set flag for the canonical lead on this
  // (production, role). Multiple TRUE rows for the same role are valid
  // (co-DPs / multi-editor docs). Default FALSE; backfilled from
  // credit_order on migration land.
  isPrimary: boolean('is_primary').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  unq: unique('crew_assignments_prod_person_role_unq').on(t.productionId, t.personId, t.roleId),
  prodRoleIdx: index('crew_assignments_prod_role_idx').on(t.productionId, t.roleId),
  personRoleIdx: index('crew_assignments_person_role_idx').on(t.personId, t.roleId),
}));
