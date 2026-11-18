import { test, expect } from '@playwright/test';

test('a host can schedule, see its booking, and cancel a future meeting', async ({ browser, baseURL }) => {
  test.skip(!process.env.SMOKE_HOST_STORAGE_STATE, 'Requires the real API and an authenticated test-host storage state.');
  const context = await browser.newContext({ baseURL, storageState: process.env.SMOKE_HOST_STORAGE_STATE });
  const page = await context.newPage();
  const name = `Scheduling check ${Date.now()}`;
  try {
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Schedule for later', exact: true }).click();
    await page.getByLabel('Meeting name').fill(name);
    const localTime = await page.evaluate(() => {
      const date = new Date(Date.now() + 2 * 60 * 60 * 1000);
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    });
    await page.getByLabel('Date and start time').fill(localTime);
    await page.getByRole('button', { name: 'Schedule meeting', exact: true }).click();
    const row = page.locator('.upcoming-row').filter({ has: page.getByRole('heading', { name, exact: true }) });
    await expect(row).toBeVisible();
    await row.getByRole('link', { name: 'View booking', exact: true }).click();
    await expect(page.getByText('Your place is booked.', { exact: true })).toBeVisible();
    await page.goto('/dashboard');
    await page.getByRole('button', { name: `Cancel ${name}`, exact: true }).click();
    await page.getByRole('button', { name: 'Cancel meeting', exact: true }).click();
    await expect(page.locator('.upcoming-row').filter({ hasText: name })).toHaveCount(0);
  } finally { await context.close(); }
});
