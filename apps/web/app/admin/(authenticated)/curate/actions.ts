'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createEntity, updateEntity } from '@/lib/admin/entity-inserters';
import { getEntityConfig } from '@/lib/admin/entity-registry';

/**
 * Generic create-entity action. Reads the entity `type` from the form
 * (always set as a hidden input by the page wrapper), looks up the
 * matching inserter, and either redirects to the public page or back
 * to the form with an error in the query string.
 */
export async function createEntityAction(formData: FormData) {
  const type = String(formData.get('_entity_type') ?? '');
  const config = getEntityConfig(type);
  if (!config) {
    redirect('/admin/curate?error=unknown_type');
  }

  const result = await createEntity(type, formData);
  if (!result.ok) {
    redirect(
      `/admin/curate/new/${type}?error=${encodeURIComponent(result.error)}`,
    );
  }

  // Bust caches for the listing pages so the new row appears.
  revalidatePath('/admin/curate');
  revalidatePath(config.publicRoutePrefix);
  revalidatePath(`${config.publicRoutePrefix}/${result.slug}`);

  redirect(`${config.publicRoutePrefix}/${result.slug}?created=1`);
}

/**
 * Generic update-entity action. The original slug is captured in a
 * hidden field at form-render time so the row can be located even
 * if the user changes the slug on the form. Same redirect shape as
 * create — on success the public detail page renders, with
 * `?edited=1` so any future success-toast UI can latch onto it.
 */
export async function updateEntityAction(formData: FormData) {
  const type = String(formData.get('_entity_type') ?? '');
  const originalSlug = String(formData.get('_original_slug') ?? '');
  const config = getEntityConfig(type);
  if (!config || !originalSlug) {
    redirect('/admin/curate?error=missing_target');
  }

  const result = await updateEntity(type, originalSlug, formData);
  if (!result.ok) {
    redirect(
      `/admin/curate/edit/${type}/${originalSlug}?error=${encodeURIComponent(result.error)}`,
    );
  }

  revalidatePath('/admin/curate');
  revalidatePath(config.publicRoutePrefix);
  revalidatePath(`${config.publicRoutePrefix}/${originalSlug}`);
  revalidatePath(`${config.publicRoutePrefix}/${result.slug}`);

  redirect(`${config.publicRoutePrefix}/${result.slug}?edited=1`);
}
