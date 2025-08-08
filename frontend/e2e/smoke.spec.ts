import { test, expect } from '@playwright/test';

test.skip('landing page renders and shows key UI', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('CaseFlow')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Professional Case Management/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Request Demo/i })).toBeVisible();
});