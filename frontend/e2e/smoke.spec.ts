import { test, expect } from '@playwright/test';

test('landing page renders and shows key UI', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  // Brand in navbar
  await expect(page.getByText('CaseFlow')).toBeVisible();

  // Hero heading contains this phrase per LandingPage.tsx
  await expect(page.getByRole('heading', { name: /Professional Case Management/i })).toBeVisible();

  // Primary CTA button text
  await expect(page.getByRole('button', { name: /Request Demo/i })).toBeVisible();
});