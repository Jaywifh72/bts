import { db, getProductionWithFullDetail } from '@bts/db';
import { siteUrl } from '@/lib/site';
import { posterUrl } from '@/lib/tmdb-image';

/**
 * T9-3 — embeddable "Shot on Studio Pro" badge served as raw HTML so it
 * stands alone inside an <iframe>. Bypasses the root layout (TopNav,
 * Footer, etc.) entirely. Designed for rental house sites, DP
 * portfolios, and BTS articles.
 *
 * Suggested embed:
 *   <iframe src="https://studiopro/films/<slug>/badge"
 *           width="320" height="120" frameborder="0"
 *           style="border-radius:8px;overflow:hidden" />
 *
 * 5 minute edge cache so the badge survives short outages on the
 * embedding sites and reduces our load.
 */

export const runtime = 'nodejs';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } },
) {
  const data = await getProductionWithFullDetail(db, params.slug);
  if (!data) return new Response('Not found', { status: 404 });
  const { production, crew, formats } = data;

  const director = crew.find((c) => c.role_slug === 'director');
  const dp = crew.find((c) => c.role_slug === 'director-of-photography');
  const primaryFormat = formats.find((f) => f.is_primary) ?? formats[0];
  const poster = posterUrl(production.poster_path, 'w154');
  const homeUrl = `${siteUrl()}/films/${production.slug}`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(production.title)} — Studio Pro</title>
<meta name="referrer" content="no-referrer-when-downgrade" />
<style>
  :root { color-scheme: dark; }
  html, body { margin: 0; padding: 0; height: 100%; background: #18181b; color: #fafafa; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }
  a.card {
    display: flex; gap: 10px; padding: 8px;
    height: calc(100% - 16px);
    background: linear-gradient(135deg, #18181b, #27272a);
    color: inherit; text-decoration: none;
    border: 1px solid #3f3f46; border-radius: 6px;
    box-sizing: border-box;
    transition: border-color 0.15s ease;
  }
  a.card:hover { border-color: #d97706; }
  .poster { width: 60px; flex-shrink: 0; aspect-ratio: 2/3; background: #27272a; border-radius: 4px; overflow: hidden; }
  .poster img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .meta { min-width: 0; flex: 1; display: flex; flex-direction: column; }
  .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: #71717a; }
  .title { font-size: 13px; font-weight: 600; color: #fafafa; margin-top: 2px; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .row { font-size: 10px; color: #a1a1aa; margin-top: 2px; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .badge { font-size: 9px; color: #d97706; font-weight: 700; letter-spacing: 0.08em; margin-top: auto; }
</style>
</head>
<body>
<a class="card" href="${escapeHtml(homeUrl)}" target="_top" rel="noopener">
  <div class="poster">${poster ? `<img src="${escapeHtml(poster)}" alt="" loading="lazy" />` : ''}</div>
  <div class="meta">
    <div class="label">${escapeHtml(production.type)} · ${production.release_year ?? ''}</div>
    <div class="title">${escapeHtml(production.title)}</div>
    ${director ? `<div class="row">Dir: ${escapeHtml(director.credit_name_override ?? director.display_name)}</div>` : ''}
    ${dp ? `<div class="row">DP: ${escapeHtml(dp.credit_name_override ?? dp.display_name)}</div>` : ''}
    ${primaryFormat ? `<div class="row">${escapeHtml(primaryFormat.aspect_ratio)} · ${escapeHtml(primaryFormat.acquisition_format)}</div>` : ''}
    <div class="badge">STUDIO PRO ↗</div>
  </div>
</a>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 's-maxage=300, stale-while-revalidate=600',
      // Allow loading from any domain — that's the point of an embed badge.
      'X-Frame-Options': 'ALLOWALL',
      'Content-Security-Policy': "frame-ancestors *",
    },
  });
}
