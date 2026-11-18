import { test, expect } from '@playwright/test';

test('host and guest connect, exchange chat, and retain a draft across panel toggles', async ({ browser, baseURL }) => {
  test.setTimeout(120000);
  test.skip(!process.env.SMOKE_HOST_STORAGE_STATE, 'Requires a real signed-in host storage-state file, API, and LiveKit.');
  const hostContext = await browser.newContext({ storageState: process.env.SMOKE_HOST_STORAGE_STATE, baseURL });
  const guestContext = await browser.newContext({ baseURL });
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  try {
    await host.goto('/dashboard');
    await host.getByRole('button', { name: 'Start a meeting', exact: true }).click();
    await host.getByLabel('Meeting name').fill('Chat acceptance check');
    await host.getByRole('button', { name: 'Create meeting', exact: true }).click();
    await expect(host).toHaveURL(/\/m\/[a-f0-9]{32}$/);
    const link = host.url();
    await host.getByRole('button', { name: 'Enter meeting', exact: true }).click();
    await expect(host.locator('.room-title p')).toHaveText(/^\s*connected\s*·/, { timeout: 35000 });
    await guest.goto(link);
    await guest.getByLabel('Your display name').fill('Chat test guest');
    await guest.getByRole('button', { name: 'Ask to join', exact: true }).click();
    await host.getByRole('button', { name: /^People/ }).click();
    await host.getByRole('button', { name: 'Admit Chat test guest', exact: true }).click();
    await guest.getByRole('button', { name: 'Join meeting', exact: true }).click();
    await expect(guest.locator('.room-title p')).toHaveText(/^\s*connected\s*·/, { timeout: 35000 });
    await host.getByRole('button', { name: /^Chat/ }).click();
    await host.getByLabel('Message everyone').fill('Hello from the host');
    await host.getByLabel('Message everyone').press('Enter');
    await expect(guest.getByRole('button', { name: /Chat, 1 unread/ })).toBeVisible();
    await guest.getByRole('button', { name: /^Chat/ }).click();
    await expect(guest.getByRole('log')).toContainText('Hello from the host');
    await guest.getByLabel('Message everyone').fill('My unsent draft');
    await guest.getByRole('button', { name: 'Close panel' }).click();
    await guest.getByRole('button', { name: /^Chat/ }).click();
    await expect(guest.getByLabel('Message everyone')).toHaveValue('My unsent draft');
    await guest.getByLabel('Message everyone').fill('Guest reply https://example.com');
    await guest.getByLabel('Message everyone').press('Enter');
    await expect(host.getByRole('log')).toContainText('Guest reply');
    await expect(host.getByRole('log').getByRole('link', { name: 'https://example.com' })).toHaveAttribute('rel', 'noopener noreferrer');
    // Observe actual metadata polls and assert that the live room survives each response.
    const metadataPath = '/api/v1/meetings/' + new URL(link).pathname.split('/').at(-1);
    for (let poll = 0; poll < 3; poll++) {
      await guest.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname === metadataPath);
      await expect(guest.locator('.room-title p')).toHaveText(/^\s*connected\s*·\s*2 people/);
    }
    await host.getByRole('button', { name: 'End for all', exact: true }).click();
    await host.getByRole('button', { name: 'End for everyone', exact: true }).click();
  } finally {
    await guestContext.close();
    await hostContext.close();
  }
});
