import { test, expect } from '@playwright/test';

test('landing page renders and shows key UI', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  // Brand in navbar
  await expect(page.getByText('CaseFlow')).toBeVisible();

  // Hero heading contains this phrase per LandingPage.tsx
  const main = page.locator('main');
  const heading = main.getByRole('heading', { level: 1 });
  await expect(heading).toBeVisible();
  await expect(heading).toContainText(/Professional Case Management/i);

  // Primary CTA button in hero (avoid the duplicate in navbar)
  await expect(main.getByRole('button', { name: /Request Demo/i })).toBeVisible();
});