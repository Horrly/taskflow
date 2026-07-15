import { expect } from '@playwright/test';

export function uniqueEmail(prefix = 'user') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

/** Registers a brand new user via the real UI flow and lands on /dashboard. */
export async function registerNewUser(page, overrides = {}) {
  const creds = {
    email: overrides.email || uniqueEmail(),
    password: overrides.password || 'TestPass123!',
    firstName: overrides.firstName || 'Test',
    lastName: overrides.lastName || 'User',
  };

  await page.goto('/register');
  await page.getByPlaceholder('Jane').fill(creds.firstName);
  await page.getByPlaceholder('Doe').fill(creds.lastName);
  await page.getByPlaceholder('you@example.com').fill(creds.email);
  await page.getByPlaceholder('Min. 8 characters').fill(creds.password);
  await page.getByRole('button', { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

  return creds;
}

/** Logs in an existing user through the real UI flow. */
export async function login(page, email, password) {
  await page.goto('/login');
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
}

export async function logout(page) {
  await page.getByRole('button', { name: /log out/i }).click();
  await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
}

/** Creates a workspace from the Dashboard sidebar and waits for it to become selected. */
export async function createWorkspace(page, name) {
  await page.getByRole('button', { name: /new workspace/i }).click();
  await page.getByPlaceholder('My Project').fill(name);
  await page.getByRole('button', { name: /^create$/i }).click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible({ timeout: 10000 });
}

/** From a selected workspace's Projects tab, creates a project and returns to the board. */
export async function createProject(page, name) {
  await page.getByRole('button', { name: /new project/i }).first().click();
  await page.getByPlaceholder('My Project').fill(name);
  await page.getByRole('button', { name: /create project/i }).click();
  await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 10000 });
}

export function columnByName(page, columnName) {
  return page.locator('div.w-64').filter({ hasText: columnName }).first();
}

/**
 * Manual drag simulation for @hello-pangea/dnd — a single dragTo() call isn't
 * enough because dnd libraries require an initial small movement before they
 * arm the drag, plus intermediate mousemoves for the drop target to register.
 */
export async function dragTaskToColumn(page, taskText, toColumnName) {
  const source = page.getByText(taskText, { exact: true }).first();
  const sourceBox = await source.boundingBox();
  const destColumn = columnByName(page, toColumnName);
  const destBox = await destColumn.boundingBox();
  if (!sourceBox || !destBox) throw new Error('Could not locate drag source or destination.');

  const startX = sourceBox.x + sourceBox.width / 2;
  const startY = sourceBox.y + sourceBox.height / 2;
  const endX = destBox.x + destBox.width / 2;
  const endY = destBox.y + destBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 10, startY + 10, { steps: 5 });
  await page.waitForTimeout(200);
  await page.mouse.move(endX, endY, { steps: 15 });
  await page.waitForTimeout(200);
  await page.mouse.move(endX, endY + 5, { steps: 5 });
  await page.waitForTimeout(100);
  await page.mouse.up();
  await page.waitForTimeout(300);
}
