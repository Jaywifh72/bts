import { test, expect } from '@playwright/test';

test.describe('auth', () => {
  test('/signin renders both provider buttons', async ({ page }) => {
    await page.goto('/signin');
    await expect(page.getByRole('heading', { name: /Sign in to CineCanon/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Continue with GitHub/i })).toBeVisible();
  });

  test('/account redirects to /signin when unauthenticated', async ({ page }) => {
    await page.goto('/account');
    await expect(page).toHaveURL(/\/signin/);
  });

  test('TopNav shows "Sign in" link when logged out', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /^Sign in$/ })).toBeVisible();
  });
});
