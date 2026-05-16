# CineCanon brand primitives

This directory holds **only** the CineCanon visual identity:
the brand mark, the confidence-grade glyph system, and the brand
color tokens. Nothing else lives here.

If you're looking for third-party brand wordmarks (ARRI, Panavision,
MPC, etc.) those are in `components/ui/BrandMark.tsx` —
a completely different component despite the similar name.

## Files

| File | What it is | Use when |
|---|---|---|
| `CineCanonMark.tsx` | The C-in-C ligature logo | Header, footer, favicon, og:image, 404, splash. ONE component, one use case: the site identifies itself. |
| `ConfidenceMark.tsx` | 0/25/50/75/100 source-strength glyph | Anywhere we surface a specific claim, citation, spec value, or table cell whose sourcing strength matters. Never decorative. |
| `confidence-paths.ts` | Raw SVG path data for the five confidence levels + the score-to-level helper | Internal — imported by ConfidenceMark and any callsite that needs to convert a 0-100 numeric score to the discrete glyph. |

## Hard rules

(carried over verbatim from the brand brief that introduced this system)

1. The brand mark and the confidence glyphs are RELATED but DISTINCT.
   Never substitute one for the other. The logo is not "100% confidence."
   The "100% confidence" glyph is not the logo.

2. Confidence glyphs are only meaningful when displayed alongside a
   specific claim, citation, table cell, spec value, or reference entry.
   If there's no claim to grade, don't render one.

3. Never recolour, rotate, restyle, add shadows, gradients, outlines,
   or "modernising" effects. The marks are locked vector. If a use
   case seems to need a variant that doesn't exist (light-mode version,
   monochrome, etc.), stop and ask before generating one.

4. Never substitute Unicode characters (○ ◔ ◑ ◕ ●) for the actual SVGs
   in the product UI. Those exist as a mental model only.

5. Brand color tokens, declared once in `app/globals.css`:

   ```
   --cc-paper: #ECE6DC
   --cc-amber: #C97A3B
   --cc-ink:   #0E0E0E
   ```

   Mirrored to Tailwind as `text-cc-paper`, `bg-cc-amber`, etc.
   in `tailwind.config.ts`. Name semantically; never reference the
   hex values directly in components.

## Sizing

| Surface | Component | Size |
|---|---|---|
| Favicon (verified scale-test minimum) | CineCanonMark | 16px |
| Inline body, footer | CineCanonMark | 24px |
| Header alongside wordmark | CineCanonMark | 28px |
| Standalone header / 404 | CineCanonMark | 32–80px |
| Confidence in body copy | ConfidenceMark | size="body" (14px) or "inline" (16px) |
| Confidence in table cell / spec sheet | ConfidenceMark | size="cell" (20px) |
| Confidence rollup badge | ConfidenceMark | size="hero" (28px) |

## Where the source SVGs live

`/CineCanon-Images/` at the repo root. These are the design-locked
sources. The PNG files in that directory are reference renders only
and never used in the product (we always render the SVGs inline).

Tweaks to the geometry should go to those source SVGs first, then
the path strings in `confidence-paths.ts` and the inline paths in
`CineCanonMark.tsx` should be re-extracted in lockstep.
