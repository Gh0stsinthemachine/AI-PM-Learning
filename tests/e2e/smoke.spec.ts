import { test, expect } from './fixtures';

const noHorizontalScroll = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);

test.describe('live stub', () => {
  test.use({ stubMode: 'live' });
  test('boots, renders MDX, resolves capabilities', async ({ app, errors, blocked }) => {
    await app.goto('/');
    await expect(app.getByRole('heading', { level: 1, name: 'AI PM 102' })).toBeVisible();
    await expect(app.getByRole('heading', { name: 'Smoke round' })).toBeVisible();
    await expect(app.locator('[data-probe="viewer"]')).toHaveText('yes');
    await expect(app.locator('[data-probe="sample"]')).toHaveText('ready');
    await expect(app.locator('[data-probe="db"]')).toHaveText('ready');
    await expect(app.locator('[data-probe="downloads"]')).toHaveText('ready');
    expect(errors).toEqual([]);
    expect(blocked).toEqual([]);
  });
});

test.describe('fallback (no window.claude, like Vercel)', () => {
  test.use({ stubMode: 'fallback' });
  test('renders with every capability absent', async ({ app, errors }) => {
    await app.goto('/');
    await expect(app.getByRole('heading', { level: 1, name: 'AI PM 102' })).toBeVisible();
    await expect(app.locator('[data-probe="viewer"]')).toHaveText('no');
    await expect(app.locator('[data-probe="sample"]')).toHaveText('absent');
    await expect(app.locator('[data-probe="db"]')).toHaveText('absent');
    expect(errors).toEqual([]);
  });
});

test.describe('signed out', () => {
  test.use({ stubMode: 'signed-out' });
  test('db is absent when signed out', async ({ app }) => {
    await app.goto('/');
    await expect(app.locator('[data-probe="sample"]')).toHaveText('ready');
    await expect(app.locator('[data-probe="db"]')).toHaveText('absent');
  });
});

test.describe('layout', () => {
  test.use({ stubMode: 'live' });
  for (const [name, size] of [['phone', { width: 390, height: 800 }], ['desktop', { width: 1280, height: 800 }]] as const) {
    for (const scheme of ['light', 'dark'] as const) {
      test(`no horizontal scroll, ${name}, ${scheme}`, async ({ app }) => {
        await app.setViewportSize(size);
        await app.emulateMedia({ colorScheme: scheme });
        await app.goto('/');
        await expect(app.getByRole('heading', { level: 1 })).toBeVisible();
        expect(await noHorizontalScroll(app)).toBe(true);
      });
    }
  }
  test('body background comes from the token in both themes', async ({ app }) => {
    await app.goto('/');
    await app.emulateMedia({ colorScheme: 'light' });
    expect(await app.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(244, 245, 242)');
    await app.emulateMedia({ colorScheme: 'dark' });
    expect(await app.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(15, 19, 24)');
  });
});
