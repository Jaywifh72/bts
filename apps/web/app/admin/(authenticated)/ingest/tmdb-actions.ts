'use server';

import { revalidatePath } from 'next/cache';
import {
  previewTmdbMovie,
  insertTmdbMovie,
  type TmdbMoviePreview,
} from '@/lib/admin/tmdb-quick-add';

export type TmdbPreviewState =
  | { status: 'idle' }
  | { status: 'preview'; preview: TmdbMoviePreview }
  | { status: 'inserted'; slug: string; outcome: 'inserted' | 'updated' }
  | { status: 'error'; message: string };

export async function previewAction(
  _prev: TmdbPreviewState,
  formData: FormData,
): Promise<TmdbPreviewState> {
  const raw = String(formData.get('tmdb_id') ?? '').trim();
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    return { status: 'error', message: 'Enter a positive TMDb id.' };
  }
  const preview = await previewTmdbMovie(id);
  if ('error' in preview) return { status: 'error', message: preview.error };
  return { status: 'preview', preview };
}

/**
 * Confirm-step: takes the preview JSON (round-tripped through a
 * hidden field) and writes the row. Returns the slug so the client
 * can offer a "view on site" link without another fetch.
 */
export async function confirmAction(
  _prev: TmdbPreviewState,
  formData: FormData,
): Promise<TmdbPreviewState> {
  const raw = String(formData.get('preview_json') ?? '');
  if (!raw) return { status: 'error', message: 'Missing preview payload.' };

  let preview: TmdbMoviePreview;
  try {
    preview = JSON.parse(raw) as TmdbMoviePreview;
  } catch {
    return { status: 'error', message: 'Preview payload was malformed.' };
  }

  try {
    const { slug, outcome } = await insertTmdbMovie(preview);
    revalidatePath(`/films/${slug}`);
    return { status: 'inserted', slug, outcome };
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : String(err) };
  }
}
