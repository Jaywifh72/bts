# SEO Foundation — Implementation Plan

> Sub-feature of the web app. Adds the discoverability surface (sitemap, robots, JSON-LD, OG images) so search engines can index every detail page and social shares get good previews.

**Goal:** Every public detail page exposes structured data + a generated Open Graph image, and the full URL inventory is announced via sitemap.xml.

**Architecture:** Pure additions — no schema changes, no migrations, no new query functions. Uses Next.js 14 native APIs (`app/sitemap.ts`, `app/robots.ts`, `opengraph-image.tsx`).

**Tech Stack:** Next.js 14 native conventions, no new runtime dependencies.

---

## Task 1: Site URL configuration

**Files:**
- Modify: `apps/web/.env.local` (add `NEXT_PUBLIC_SITE_URL`)
- Modify: `.env.example`
- Create: `apps/web/lib/site.ts` — exports `siteUrl()` that returns `NEXT_PUBLIC_SITE_URL` or `http://localhost:3000` as fallback

Reasoning: sitemap, robots, OG images, and JSON-LD all need a fully-qualified base URL. Centralizing it now avoids inconsistency.

Commit: `chore(web): add NEXT_PUBLIC_SITE_URL config`

---

## Task 2: robots.ts and sitemap.ts

**Files:**
- Create: `apps/web/app/robots.ts`
- Create: `apps/web/app/sitemap.ts`

`robots.ts`:
```typescript
import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin/'] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
```

`sitemap.ts` queries the DB for every public slug and emits entries:
- `/` (priority 1.0, weekly)
- `/films`, `/crew`, `/gear`, `/vfx` (priority 0.9, weekly)
- `/films/[slug]` for each production (priority 0.8, monthly)
- `/crew/[slug]` for each person (priority 0.7, monthly)
- `/gear/[manufacturer]` and nested series/item pages (priority 0.6, monthly)
- `/vfx/[slug]` for each VFX house (priority 0.7, monthly)
- The 3 killer query pages (priority 0.6, monthly)

Test: hit `http://localhost:3002/sitemap.xml` and `/robots.txt`, verify production slugs and disallow rule appear.

Commit: `feat(web): add robots.txt and dynamic sitemap.xml`

---

## Task 3: JSON-LD helper + Film detail page

**Files:**
- Create: `apps/web/lib/jsonLd.ts` — small helper that emits a `<script type="application/ld+json">` element from a JS object
- Modify: `apps/web/app/films/[slug]/page.tsx` — emit a schema.org `Movie` JSON-LD

`Movie` JSON-LD includes: name, alternateName (originalTitle), datePublished (release_year), description (synopsis), director (from crew), actor (none in our schema yet — skip), genre (none — skip), image (poster from TMDb if present, else our generated OG image), url (absolute), `@id` (absolute), and `sameAs` (TMDb URL if `tmdb_id` set).

Test: view-source on `/films/dune-part-two-2024`, find `<script type="application/ld+json">`, verify valid JSON with `@type: Movie`.

Commit: `feat(web): add JSON-LD Movie schema to film detail pages`

---

## Task 4: JSON-LD for Person, Equipment Item, VFX House detail pages

**Files:**
- Modify: `apps/web/app/crew/[slug]/page.tsx` — schema.org `Person`
- Modify: `apps/web/app/gear/[manufacturer]/[series]/[item]/page.tsx` — schema.org `Product`
- Modify: `apps/web/app/vfx/[slug]/page.tsx` — schema.org `Organization`

Each uses the same `<JsonLd data={...} />` helper.

Person includes: name, jobTitle (primary role from filmography), birthDate (none in schema — skip), nationality (none — skip), url, sameAs (none — skip).

Product (equipment item) includes: name, brand (manufacturer), category, description (notes if present).

Organization (VFX house) includes: name, url, sameAs (their website if set), address (country if set).

Test: view-source on each detail page, verify the appropriate `@type` JSON-LD is present.

Commit: `feat(web): add JSON-LD to person, equipment, and vfx-house pages`

---

## Task 5: Open Graph images for film + person detail pages

**Files:**
- Create: `apps/web/app/films/[slug]/opengraph-image.tsx`
- Create: `apps/web/app/films/[slug]/twitter-image.tsx` (re-exports the OG one)
- Create: `apps/web/app/crew/[slug]/opengraph-image.tsx`
- Create: `apps/web/app/crew/[slug]/twitter-image.tsx`

Each uses Next.js 14's `ImageResponse` API to generate a 1200×630 PNG at request time, with the title in serif font, the year (for films) or primary role (for people), and "Studio Pro" branding in the corner.

Don't create OG images for gear/vfx — too many slugs (150+ items) would balloon caching surface for marginal social-sharing value. The other pages will fall back to the global default OG (set in root layout next).

Modify: `apps/web/app/layout.tsx` — add `openGraph` to root metadata so non-detail pages get the default site OG image; add a static OG image at `apps/web/app/opengraph-image.tsx` (the site-level default).

Test: navigate to `/films/dune-part-two-2024/opengraph-image` in browser, see PNG render. Same for `/crew/[slug]/opengraph-image`. Validate one with [opengraph.xyz](https://www.opengraph.xyz/).

Commit: `feat(web): generate Open Graph images for film and person detail pages`

---

## Task 6: Global metadata defaults

**Files:**
- Modify: `apps/web/app/layout.tsx`

Augment root `metadata` export with:
- `metadataBase: new URL(siteUrl())`
- `openGraph`: site-level title, description, type=website, locale=en_US
- `twitter`: card=summary_large_image
- `alternates.canonical` left to per-page (Next handles automatically when `metadataBase` is set)

Commit: `feat(web): add site-level OpenGraph + Twitter metadata defaults`

---

## Verification

1. `pnpm --filter @bts/web typecheck` — clean
2. `pnpm --filter @bts/web build` — clean, sitemap and robots routes emitted
3. `curl http://localhost:3002/robots.txt` — see `Disallow: /admin/` and sitemap line
4. `curl http://localhost:3002/sitemap.xml | head -40` — see production slugs
5. `curl http://localhost:3002/films/dune-part-two-2024 | grep -A20 'application/ld+json'` — valid Movie JSON-LD
6. Browser-open `/films/dune-part-two-2024/opengraph-image` — see PNG with title and year
