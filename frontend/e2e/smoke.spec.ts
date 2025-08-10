import { test, expect } from '@playwright/test';

test('landing page renders and shows key UI', async ({ page }) => {
  await page.goto('/');

  // Brand in navbar
  await expect(page.getByText('CaseFlow')).toBeVisible();

  // Hero heading contains this phrase per LandingPage.tsx
  const main = page.locator('main');
  const heading = main.getByRole('heading', { level: 1 });
  await expect(heading).toBeVisible();
  await expect(heading).toContainText(/Professional Case Management/i);

  // There are two "Request Demo" buttons (navbar and hero). Assert and select hero one.

  const ctas = main.getByRole('button', { name: /Request Demo/i });
  await expect(ctas).toHaveCount(2);
  await expect(ctas.last()).toBeVisible();
});