import { test, expect } from '@playwright/test';
import { registerNewUser, createWorkspace, uniqueEmail } from './helpers.js';

test.describe('workspace', () => {
  test('creating a workspace shows it in the sidebar', async ({ page }) => {
    await registerNewUser(page);
    const wsName = `Acme Corp ${Date.now()}`;
    await createWorkspace(page, wsName);

    await expect(page.getByRole('button', { name: new RegExp(wsName) })).toBeVisible();
  });

  test('selecting a workspace shows the owner in the Members tab', async ({ page }) => {
    const creds = await registerNewUser(page, { email: uniqueEmail('founder'), firstName: 'Alex', lastName: 'Founder' });
    const wsName = `Team Space ${Date.now()}`;
    await createWorkspace(page, wsName);

    await page.getByRole('button', { name: 'members' }).click();
    await expect(page.getByText('Alex Founder')).toBeVisible();
    await expect(page.getByText(creds.email)).toBeVisible();
    await expect(page.locator('section').getByText('Owner', { exact: true })).toBeVisible();
  });
});
