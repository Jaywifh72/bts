'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  db,
  upsertMediaAsset,
  associateMedia,
  disassociateMedia,
  resolveEntityIdBySlug,
  type MediaAssetKind,
  type MediaEntityType,
  type MediaRole,
} from '@bts/db';

const VALID_KINDS = new Set(['image', 'video', 'audio', 'document', 'link']);
const VALID_ENTITY_TYPES = new Set([
  'production', 'person', 'vfx_house', 'stunt_company', 'stunt_school',
  'stunt_sequence', 'stunt_rigging_technique', 'safety_bulletin',
  'equipment_manufacturer', 'equipment_series', 'equipment_item',
  'post_house', 'scene',
]);
const VALID_ROLES = new Set(['subject', 'credit_holder', 'reference', 'reel', 'thumbnail', 'related']);

export async function createMediaAssetAction(formData: FormData) {
  const kind = String(formData.get('kind') ?? '').trim();
  const url = String(formData.get('url') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();

  if (!VALID_KINDS.has(kind) || !url || !title) {
    redirect('/admin/media/new?error=missing_fields');
  }

  const caption = (formData.get('caption') as string | null)?.trim() || null;
  const credit = (formData.get('credit') as string | null)?.trim() || null;
  const publication = (formData.get('publication') as string | null)?.trim() || null;
  const source = (formData.get('source') as string | null)?.trim() || null;
  const externalId = (formData.get('external_id') as string | null)?.trim() || null;
  const thumbnailUrl = (formData.get('thumbnail_url') as string | null)?.trim() || null;

  try {
    const { id } = await upsertMediaAsset(db, {
      kind: kind as MediaAssetKind,
      url, title, caption, credit, publication, source,
      externalId, thumbnailUrl,
    });
    revalidatePath('/admin/media');
    redirect(`/admin/media/${id}?created=1`);
  } catch (err) {
    redirect(`/admin/media/new?error=${encodeURIComponent(err instanceof Error ? err.message : String(err))}`);
  }
}

export async function addAssociationAction(formData: FormData) {
  const assetIdRaw = String(formData.get('asset_id') ?? '');
  const assetId = Number(assetIdRaw);
  const entityType = String(formData.get('entity_type') ?? '').trim();
  const slug = String(formData.get('entity_slug') ?? '').trim();
  const role = String(formData.get('role') ?? '').trim();
  const captionOverride = (formData.get('caption_override') as string | null)?.trim() || null;

  if (!Number.isFinite(assetId) || !VALID_ENTITY_TYPES.has(entityType) || !VALID_ROLES.has(role) || !slug) {
    redirect(`/admin/media/${assetIdRaw}?error=invalid_input`);
  }

  const resolved = await resolveEntityIdBySlug(db, entityType as MediaEntityType, slug);
  if (!resolved) {
    redirect(`/admin/media/${assetId}?error=${encodeURIComponent(`No ${entityType} found with slug "${slug}"`)}`);
  }

  try {
    await associateMedia(db, {
      mediaAssetId: assetId,
      entityType: entityType as MediaEntityType,
      entityId: resolved.id,
      role: role as MediaRole,
      captionOverride,
    });
    revalidatePath(`/admin/media/${assetId}`);
    redirect(`/admin/media/${assetId}?attached=${encodeURIComponent(resolved.display_name)}`);
  } catch (err) {
    redirect(`/admin/media/${assetId}?error=${encodeURIComponent(err instanceof Error ? err.message : String(err))}`);
  }
}

export async function removeAssociationAction(formData: FormData) {
  const assetId = Number(formData.get('asset_id'));
  const entityType = String(formData.get('entity_type') ?? '').trim();
  const entityId = Number(formData.get('entity_id'));
  const role = String(formData.get('role') ?? '').trim();

  if (!Number.isFinite(assetId) || !VALID_ENTITY_TYPES.has(entityType) || !Number.isFinite(entityId) || !VALID_ROLES.has(role)) {
    redirect(`/admin/media/${assetId}?error=invalid_input`);
  }

  await disassociateMedia(db, {
    mediaAssetId: assetId,
    entityType: entityType as MediaEntityType,
    entityId,
    role: role as MediaRole,
  });
  revalidatePath(`/admin/media/${assetId}`);
  redirect(`/admin/media/${assetId}?detached=1`);
}
