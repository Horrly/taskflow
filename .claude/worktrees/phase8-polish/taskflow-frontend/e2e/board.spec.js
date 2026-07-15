import { test, expect } from '@playwright/test';
import { registerNewUser, createWorkspace, createProject, columnByName, dragTaskToColumn } from './helpers.js';

test.describe('board', () => {
  test.beforeEach(async ({ page }) => {
    await registerNewUser(page);
    await createWorkspace(page, `Board Workspace ${Date.now()}`);
    const projectName = `Board Project ${Date.now()}`;
    await createProject(page, projectName);
    await page.getByText(projectName, { exact: true }).click();
    await expect(page).toHaveURL(/\/workspace\/.+\/project\/.+/);
    await expect(page.getByText('To Do', { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('quick-adding a task in To Do makes the card appear', async ({ page }) => {
    const taskTitle = `Write the docs ${Date.now()}`;
    const todo = columnByName(page, 'To Do');
    await todo.getByPlaceholder('Add a task…').fill(taskTitle);
    await todo.getByPlaceholder('Add a task…').press('Enter');

    await expect(todo.getByText(taskTitle, { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('setting a task priority to High shows the orange dot on the card', async ({ page }) => {
    const taskTitle = `Ship the release ${Date.now()}`;
    const todo = columnByName(page, 'To Do');
    await todo.getByPlaceholder('Add a task…').fill(taskTitle);
    await todo.getByPlaceholder('Add a task…').press('Enter');
    await expect(todo.getByText(taskTitle, { exact: true })).toBeVisible({ timeout: 10000 });

    await todo.getByText(taskTitle, { exact: true }).click();
    await page.locator('select').first().selectOption({ label: 'High' });
    await expect(page.locator('select').first()).toHaveValue('HIGH');

    // Close the slide-out panel by clicking the overlay, away from the panel itself.
    await page.mouse.click(20, 20);

    const dot = todo.locator('div.w-2.h-2.rounded-full');
    await expect(dot).toHaveCSS('background-color', 'rgb(249, 115, 22)');
  });

  test('dragging a task to In Progress moves the card', async ({ page }) => {
    const taskTitle = `Review the PR ${Date.now()}`;
    const todo = columnByName(page, 'To Do');
    await todo.getByPlaceholder('Add a task…').fill(taskTitle);
    await todo.getByPlaceholder('Add a task…').press('Enter');
    await expect(todo.getByText(taskTitle, { exact: true })).toBeVisible({ timeout: 10000 });

    await dragTaskToColumn(page, taskTitle, 'In Progress');

    const inProgress = columnByName(page, 'In Progress');
    await expect(inProgress.getByText(taskTitle, { exact: true })).toBeVisible({ timeout: 10000 });
  });
});
