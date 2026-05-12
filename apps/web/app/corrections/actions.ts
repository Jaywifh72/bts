'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { db, insertCorrection } from '@bts/db';
import { rateLimitByIp } from '@/lib/rate-limit';

const MAX_MESSAGE_LEN = 5000;

export type CorrectionFormState = {
  ok: boolean;
  error?: string;
};

/**
 * T7-4 — submit a public correction. Server action with input validation +
 * rate-limiting + honeypot. Real abuse defence layered on top of the original
 * column constraints + admin-triage net.
 *
 * Rate-limit: 5 submissions per IP per hour. The honeypot is `website` — a
 * visually-hidden input that a real human won't fill but a bot scraper will.
 */
export async function submitCorrectionAction(
  _prev: CorrectionFormState,
  formData: FormData,
): Promise<CorrectionFormState> {
  // Honeypot trap — if filled, silently 'succeed' so the bot moves on.
  const honeypot = String(formData.get('website') ?? '').trim();
  if (honeypot.length > 0) {
    return { ok: true };
  }

  // Rate limit by IP (best-effort — falls back to in-memory if Upstash absent).
  const fwd = headers().get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? headers().get('x-real-ip')?.trim()
    ?? 'anonymous';
  const rl = await rateLimitByIp(fwd, { namespace: 'corrections', limit: 5, windowMs: 60 * 60_000 });
  if (!rl.ok) {
    return { ok: false, error: `Too many submissions. Please try again in ${rl.retryAfterSeconds}s.` };
  }

  const productionSlug = String(formData.get('productionSlug') ?? '').trim() || null;
  const pageUrl = String(formData.get('pageUrl') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim() || null;

  if (!message) return { ok: false, error: 'Please describe what needs fixing.' };
  if (message.length < 10) return { ok: false, error: 'Please provide a bit more detail (at least 10 characters).' };
  if (message.length > MAX_MESSAGE_LEN) {
    return { ok: false, error: `Message is too long (${message.length} chars; max ${MAX_MESSAGE_LEN}).` };
  }
  if (!pageUrl) return { ok: false, error: 'Submission missing page URL — please retry.' };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'That email address looks malformed. Leave blank if you prefer.' };
  }

  await insertCorrection(db, { productionSlug, pageUrl, message, email });
  revalidatePath('/admin/corrections');
  return { ok: true };
}
