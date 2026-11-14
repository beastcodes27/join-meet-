import { test, expect } from '@playwright/test';
test('landing navigation and meeting code validation', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Great conversations/ })).toBeVisible();
    await page.getByLabel('Meeting link or code').fill('invalid');
    await page.getByRole('button', { name: 'Join', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('valid meeting link');
    await page.getByRole('link', { name: 'Start a meeting', exact: true }).click();
    await expect(page).toHaveURL(/login/);
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
});
test('invalid meeting links show an actionable error', async ({ page }) => {
    await page.goto('/m/not-a-meeting');
    await expect(page.getByRole('heading', { name: /couldn’t open/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Return home' })).toBeVisible();
});
test('dashboard requires authentication', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/);
});
test('legal links are navigable', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: 'Privacy notice', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Terms', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Terms of use', exact: true })).toBeVisible();
});
test('real meeting prejoin can request admission', async ({ page }) => {
    test.skip(!process.env.SMOKE_MEETING_URL, 'Requires a real running API and a fresh host-created meeting URL.');
    await page.goto(process.env.SMOKE_MEETING_URL!);
    await expect(page.getByRole('heading', { name: 'Ready when you are.' })).toBeVisible();
    await page.getByLabel('Your display name').fill('Browser smoke guest');
    await page.getByRole('button', { name: 'Ask to join', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Your host will be with you soon.' })).toBeVisible();
});
