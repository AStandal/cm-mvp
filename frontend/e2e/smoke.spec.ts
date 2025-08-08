import { test, expect } from '@playwright/test';

test('landing page renders and shows key UI', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  // Brand in navbar
  await expect(page.getByText('CaseFlow')).toBeVisible();

  // Hero heading contains this phrase per LandingPage.tsx
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toBeVisible();
  await expect(heading).toContainText(/Professional Case Management/i);

  // Primary CTA button text
  await expect(page.getByRole('button', { name: /Request Demo/i })).toBeVisible();
});