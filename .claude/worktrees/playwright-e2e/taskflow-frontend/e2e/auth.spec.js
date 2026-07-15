import { test, expect } from '@playwright/test';
import { registerNewUser, login, logout, uniqueEmail } from './helpers.js';

test.describe('auth', () => {
  test('visiting / redirects to /login when logged out', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('registering a new user lands on /dashboard', async ({ page }) => {
    await registerNewUser(page);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText('TaskFlow')).toBeVisible();
  });

  test('logging out redirects to /login', async ({ page }) => {
    await registerNewUser(page);
    await logout(page);
    await expect(page).toHaveURL(/\/login/);
  });

  test('visiting /dashboard without auth redirects to /login', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('logging back in as an existing user works', async ({ page }) => {
    const email = uniqueEmail('existing');
    const password = 'TestPass123!';
    await registerNewUser(page, { email, password });
    await logout(page);
    await login(page, email, password);
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
