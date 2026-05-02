# Cross-Reference Pages — Implementation Plan

> Sub-feature of the web app. Surfaces the gear ↔ scenes ↔ people cross-cuts that are the site's differentiating promise but currently hidden behind navigation.

**Goal:** Two new bookmarkable cross-reference views — "what gear has this DP shot on" and "which DPs have shot on this lens series" — plus deep-linkable sections that turn the site's existing data into pro-workflow tools.

**Architecture:** Pure additions to the query layer + new sections on existing pages. Same patterns as existing detail pages.

**Tech Stack:** Same as the rest of the app — no new dependencies.

---

## Task 1: Query layer — equipment used by a person

**Files:**
- Modify: `packages/db/src/queries/people.ts`
- Test: `packages/db/src/tests/people-equipment.test.ts` (create)

**Step 1: Test**

Cases:
- `getEquipmentUsedByPerson('greig-fraser')` returns rows with at least one ALEXA 65 entry
- Each row has manufacturer/series/category/production_count/scene_count
- Rows ordered by production_count DESC, scene_count DESC

**Step 2: Implement**

```typescript
export async function getEquipmentUsedByPerson(db, personSlug: string) {
  return db.execute<{
    manufacturer_slug: string; manufacturer_name: string;
    series_slug: string; series_name: string; series_category: string;
    item_slug: string | null; item_name: string | null;
    production_count: number; scene_count: number;
  }>(sql`
    SELECT
      em.slug AS manufacturer_slug, em.name AS manufacturer_name,
      es.slug AS series_slug, es.name AS series_name, es.category AS series_category,
      ei.slug AS item_slug, ei.name AS item_name,
      COUNT(DISTINCT sc.production_id)::int AS production_count,
      COUNT(DISTINCT sc.id)::int AS scene_count
    FROM crew_assignments ca
    JOIN people p ON p.id = ca.person_id
    JOIN scenes sc ON sc.production_id = ca.production_id
    JOIN equipment_usage eu ON eu.scene_id = sc.id
    JOIN equipment_series es ON es.id = eu.equipment_series_id
    JOIN equipment_manufacturers em ON em.id = es.manufacturer_id
    LEFT JOIN equipment_items ei ON ei.id = eu.equipment_item_id
    JOIN roles r ON r.id = ca.role_id
    WHERE p.slug = ${personSlug}
      AND r.category = 'camera'   -- gear correlation only meaningful for camera crew
    GROUP BY em.slug, em.name, es.slug, es.name, es.category, ei.slug, ei.name
    ORDER BY production_count DESC, scene_count DESC, em.name, es.name
  `);
}
```

Commit: `feat(db): add getEquipmentUsedByPerson cross-reference query`

---

## Task 2: Query layer — DPs (and crew) for a series

**Files:**
- Modify: `packages/db/src/queries/equipment.ts`
- Test: `packages/db/src/tests/equipment-crew.test.ts` (create)

**Step 1: Test**

Cases:
- `getCrewForSeries('arri-rental-dna-lf-vintage')` returns Greig Fraser among camera crew
- Each row has person_slug/display_name/role/production_count/scene_count
- Rows ordered by production_count DESC

**Step 2: Implement**

```typescript
export async function getCrewForSeries(db, seriesSlug: string) {
  return db.execute<{
    person_slug: string; display_name: string;
    role_slug: string; role_name: string; role_category: string;
    production_count: number; scene_count: number;
  }>(sql`
    SELECT
      p.slug AS person_slug, p.display_name,
      r.slug AS role_slug, r.name AS role_name, r.category AS role_category,
      COUNT(DISTINCT sc.production_id)::int AS production_count,
      COUNT(DISTINCT sc.id)::int AS scene_count
    FROM equipment_series es
    JOIN equipment_usage eu ON eu.equipment_series_id = es.id
    JOIN scenes sc ON sc.id = eu.scene_id
    JOIN crew_assignments ca ON ca.production_id = sc.production_id
    JOIN people p ON p.id = ca.person_id
    JOIN roles r ON r.id = ca.role_id
    WHERE es.slug = ${seriesSlug}
      AND r.category = 'camera'
    GROUP BY p.slug, p.display_name, r.slug, r.name, r.category
    ORDER BY production_count DESC, scene_count DESC, p.display_name
  `);
}
```

Commit: `feat(db): add getCrewForSeries cross-reference query`

---

## Task 3: Equipment section on /crew/[slug]

**Files:**
- Create: `apps/web/components/people/EquipmentUsedTable.tsx`
- Modify: `apps/web/app/crew/[slug]/page.tsx`

**Step 1: Component**

Group rows by series (one section header per series), within each show:
- Series name link → `/gear/{manufacturer}/{series}`
- Items used (as comma-separated linked list)
- "X productions, Y scenes" stat

Skip rendering if no rows (non-camera crew get nothing).

**Step 2: Wire into page**

Add a `<SectionHeader label="Loadout" heading="Equipment used" />` followed by `<EquipmentUsedTable rows={equipment} />` between filmography and footer.

Use `id="equipment"` so people can link to `/crew/greig-fraser#equipment`.

**Step 3: Smoke**

Visit `/crew/greig-fraser`, see the new section showing ALEXA 65, ALEXA Mini LF, DNA LF Vintage, etc.

Commit: `feat(web): add Equipment Used section to crew detail pages`

---

## Task 4: Cinematographers section on /gear/[manufacturer]/[series]

**Files:**
- Create: `apps/web/components/equipment/CrewWhoUsedTable.tsx`
- Modify: `apps/web/app/gear/[manufacturer]/[series]/page.tsx`

**Step 1: Component**

Two-column table:
- Person (linked) — "Greig Fraser"
- Role
- Production count
- Scene count

**Step 2: Wire into page**

Pass crew rows from `getCrewForSeries(seriesSlug)` to the page, render under the existing "Used on" / items section with `id="cinematographers"`.

**Step 3: Smoke**

Visit `/gear/arri-rental/arri-rental-dna-lf-vintage`, see Greig Fraser at the top with 1 production / N scenes.

Commit: `feat(web): add Cinematographers section to series detail pages`

---

## Task 5: Same enrichment for /gear/[manufacturer]/[series]/[item]

**Files:**
- Modify: `packages/db/src/queries/equipment.ts` — add `getCrewForItem(itemSlug)` (same shape as series version, filtered by item)
- Modify: `apps/web/app/gear/[manufacturer]/[series]/[item]/page.tsx`

Apply the same `<CrewWhoUsedTable>` to the item page.

Commit: `feat(web): add Cinematographers section to item detail pages`

---

## Verification (after all tasks)

1. `pnpm --filter @bts/db test` — all 39 tests + 2 new test files pass (~41 tests)
2. `pnpm --filter @bts/web typecheck` — clean
3. `pnpm --filter @bts/web build` — clean
4. Manual smoke:
   - /crew/greig-fraser shows Equipment Used with ALEXA 65 + DNA LF Vintage entries
   - /gear/arri-rental/arri-rental-dna-lf-vintage shows Greig Fraser among cinematographers
   - /gear/arri/arri-alexa-65-series/arri-alexa-65 shows DPs who shot on the body
