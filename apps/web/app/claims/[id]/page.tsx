import { notFound, redirect } from 'next/navigation';
import { db, sql } from '@bts/db';

/**
 * UX-audit Move 6 — public claim-id resolver. The ⌘K palette's
 * `[claim-id]` mode submits to /claims/N; this route looks up the
 * primary entity for the claim and 307-redirects to its dossier page
 * with a `#claim-N` anchor, where the rendered EntityClaimsList can
 * pulse-highlight.
 *
 * Resolution preference order: production → person → vfx_house →
 * stunt_company → stunt_school → format → society → post_house → scene.
 * Whichever attachment is found first in `claim_entities` wins.
 */
export const dynamic = 'force-dynamic';

const ENTITY_HREF: Record<string, (slug: string) => string> = {
  production: (s) => `/films/${s}`,
  person: (s) => `/crew/${s}`,
  vfx_house: (s) => `/vfx/${s}`,
  stunt_company: (s) => `/stunts/companies/${s}`,
  stunt_school: (s) => `/stunts/schools/${s}`,
  format: (s) => `/format/${s}`,
  society: (s) => `/societies/${s}`,
  post_house: (s) => `/films?postHouse=${s}`,
  scene: (s) => `/films/${s}#scenes`,
  equipment_manufacturer: (s) => `/gear/${s}`,
  equipment_series: (s) => `/gear/${s}`,
  equipment_item: (s) => `/gear/${s}`,
  location: (s) => `/locations#${s}`,
  source: (s) => `/references/${s}`,
  video: (s) => `/films?videoExternal=${s}`,
};

type Props = { params: Promise<{ id: string }> };

export default async function ClaimRedirect(props: Props) {
  const { id } = await props.params;
  const claimId = parseInt(id, 10);
  if (!Number.isFinite(claimId) || claimId <= 0) notFound();

  const rows = await db.execute<{ entity_type: string; entity_id: number; entity_slug: string | null }>(sql`
    SELECT entity_type::text, entity_id, entity_slug
    FROM claim_entities
    WHERE claim_id = ${claimId}
    ORDER BY
      -- Production wins; then person; then other entities by enum order.
      CASE entity_type::text
        WHEN 'production' THEN 1
        WHEN 'person' THEN 2
        WHEN 'vfx_house' THEN 3
        WHEN 'stunt_company' THEN 4
        WHEN 'stunt_school' THEN 5
        WHEN 'format' THEN 6
        WHEN 'society' THEN 7
        ELSE 99
      END
    LIMIT 1
  `);
  const attachment = rows[0];
  if (!attachment) notFound();

  // If we have a slug, build the URL. If not, fall back to the admin claim
  // detail page (which knows how to handle id-only resolution).
  if (attachment.entity_slug) {
    const builder = ENTITY_HREF[attachment.entity_type];
    if (builder) {
      redirect(`${builder(attachment.entity_slug)}#claim-${claimId}`);
    }
  }
  // No slug — admin can still resolve by id.
  redirect(`/admin/claims/${claimId}`);
}
