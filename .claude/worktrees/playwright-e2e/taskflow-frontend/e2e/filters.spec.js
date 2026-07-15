import { test, expect } from '@playwright/test';
import { registerNewUser } from './helpers.js';

test.describe('my tasks filters', () => {
  test.beforeEach(async ({ page }) => {
    await registerNewUser(page);
    await page.getByRole('button', { name: /my tasks/i }).click();
    await expect(page).toHaveURL(/\/me\/tasks/);
  });

  test('stats bar is visible with numeric values', async ({ page }) => {
    const assignedCard = page.getByText('Assigned to me').locator('..');
    await expect(assignedCard).toBeVisible({ timeout: 10000 });

    const value = assignedCard.locator('p').first();
    await expect(value).toHaveText(/^\d+$/);
  });

  test('clearing all filters restores the full task list', async ({ page }) => {
    // Wait for the initial (unfiltered) load, remember its count line.
    const countLine = page.getByText(/^\d+ tasks?$/);
    await expect(countLine).toBeVisible({ timeout: 10000 });
    const initialCount = await countLine.textContent();

    const filtered = page.waitForResponse(
      (r) => r.url().includes('/me/tasks/') && r.url().includes('priority=HIGH')
    );
    await page.getByLabel('High', { exact: true }).check();
    await filtered;

    const unfiltered = page.waitForResponse(
      (r) => r.url().includes('/me/tasks/') && !r.url().includes('priority=')
    );
    await page.getByRole('button', { name: 'Clear all' }).click();
    await unfiltered;

    await expect(page.getByLabel('High', { exact: true })).not.toBeChecked();
    await expect(countLine).toHaveText(initialCount);
  });

  test('filtering by priority High shows only High tasks or an empty state', async ({ page }) => {
    await page.getByLabel('High', { exact: true }).check();
    await page.waitForTimeout(500); // debounced re-fetch

    const emptyState = page.getByText(/no tasks/i);
    const isEmpty = await emptyState.isVisible().catch(() => false);

    if (isEmpty) {
      await expect(emptyState).toBeVisible();
    } else {
      const titles = await page.locator('span[title]').evaluateAll((els) =>
        els.map((el) => el.getAttribute('title'))
      );
      for (const t of titles) {
        expect(t).toBe('High');
      }
    }
  });
});
