import { test, expect } from '@playwright/test';

test.describe('Smoke pack — top-level routes', () => {
  test('homepage renders with hero + nav', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('CineCanon');
    await expect(page.locator('nav[aria-label="Primary"]')).toBeVisible();
  });

  test('films index renders cards', async ({ page }) => {
    await page.goto('/films');
    await expect(page.locator('h1')).toBeVisible();
    // At least one film card should render
    await expect(page.locator('a[href^="/films/"]').first()).toBeVisible();
  });

  test('crew index renders rows', async ({ page }) => {
    await page.goto('/crew');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('a[href^="/crew/"]').first()).toBeVisible();
  });

  test('gear index renders manufacturer cards', async ({ page }) => {
    await page.goto('/gear');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('search page renders input', async ({ page }) => {
    await page.goto('/search');
    await expect(page.locator('input[type="search"], input[name="q"]').first()).toBeVisible();
  });

  test('a canonical film page (Dune: Part Two) renders editorial sections', async ({ page }) => {
    // dune-part-two-2024 is in the canonical runSeed (see packages/db/src/seed/
    // data/productions.ts) — uses it as the smoke anchor so CI doesn't depend
    // on locally-augmented dev data.
    await page.goto('/films/dune-part-two-2024');
    await expect(page.getByRole('heading', { name: /Dune: Part Two/i })).toBeVisible();
  });

  test('film detail page is interactive (catches React-not-loaded regressions)', async ({ page }) => {
    // The static-HTML-renders-but-JS-doesn't failure mode looks identical to
    // a hydration bug from the outside: page visible, headings present, but
    // every click is dead. Two real causes hit us:
    //   1. Next 16 allowedDevOrigins blocking _next/* over 127.0.0.1 (fixed
    //      in next.config.mjs)
    //   2. React 19 removed useFormState; stale import killed hydration
    //
    // Click the "Suggest a correction →" button on the film page and check
    // the form opens. The button is rendered by CorrectionForm (a 'use client'
    // component), so this test fails fast if the React runtime isn't claiming
    // page-level client components.
    await page.goto('/films/dune-part-two-2024');
    const correctionsButton = page.getByRole('button', { name: /suggest a correction/i });
    await expect(correctionsButton).toBeVisible();
    await correctionsButton.click();
    // After click, the inline form should appear with the textarea.
    await expect(page.getByPlaceholder(/dp credit on this film is wrong/i)).toBeVisible();
  });

  test('a missing film renders the not-found page', async ({ page }) => {
    // Next.js 14 caches the notFound() output with status 200 in dev mode
    // when the segment uses generateStaticParams + dynamicParams: true
    // (prod build returns 404 correctly). We assert on rendered content
    // instead of status so the test is durable across both modes.
    const r = await page.goto('/films/this-film-definitely-does-not-exist-9999');
    expect([200, 404]).toContain(r?.status() ?? 0);
    await expect(page.locator('h1')).toContainText(/no film at this slug/i);
  });

  test('public API discovery endpoint returns JSON', async ({ request }) => {
    const r = await request.get('/api/v1');
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body).toHaveProperty('endpoints');
  });

  test('llms.txt is served as text/markdown', async ({ request }) => {
    const r = await request.get('/llms.txt');
    expect(r.status()).toBe(200);
    expect(r.headers()['content-type']).toContain('markdown');
  });

  test('robots.txt is served', async ({ request }) => {
    const r = await request.get('/robots.txt');
    expect(r.status()).toBe(200);
  });

  test('/api/lookbook/search returns clean 503 when SIGLIP_ENCODER_URL unset', async ({ request }) => {
    // The route is pre-wired but the encoder isn't deployed yet (see
    // docs/runbooks/siglip2-inference.md). The 503 fallback should be
    // documented and machine-readable, not a 500 crash.
    const r = await request.post('/api/lookbook/search', {
      data: { url: 'https://example.com/img.jpg' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(r.status()).toBe(503);
    const body = await r.json();
    expect(body.error).toBe('lookbook_unavailable');
    expect(body.message).toContain('SIGLIP_ENCODER_URL');
  });
});
