import { z } from 'zod';

export const RawVendorSchema = z.object({
  name: z.string(),
  shots: z.number().int().nullable(),
  role: z.enum(['primary', 'additional', 'special_sequences', 'miniatures', 'previsualization']),
});

export const RawVfxBreakdownSchema = z.object({
  source_url: z.string().url(),
  source: z.enum(['artofvfx', 'beforesandafters']),
  production_slug: z.string(),          // resolved by matcher; empty string = unmatched
  scraped_at: z.string().datetime(),
  total_shots: z.number().int().nullable(),
  vendors: z.array(RawVendorSchema),
  techniques: z.array(z.string()),      // slugs from vfx_techniques.slug
  sequences: z.array(z.object({        // discarded at import; kept for auditability
    name: z.string(),
    vendor: z.string().nullable(),
    notes: z.string().nullable(),
  })).default([]),
});

export type RawVfxBreakdown = z.infer<typeof RawVfxBreakdownSchema>;
export type RawVendor = z.infer<typeof RawVendorSchema>;
