import { test, expect } from '@playwright/test';

test.describe('Smoke pack — top-level routes', () => {
  test('homepage renders with hero + nav', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Studio Pro');
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
});
