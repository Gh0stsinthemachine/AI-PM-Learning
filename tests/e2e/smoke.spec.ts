import { test, expect } from './fixtures';

test.describe('live stub', () => {
  test.use({ stubMode: 'live' });
  test('home renders the map, the next round and the pace line', async ({ app, errors, blocked }) => {
    await app.goto('/');
    await expect(app.getByRole('heading', { level: 1, name: 'Course map' })).toBeVisible();
    await expect(app.getByTestId('pace-line')).toContainText('Round 1 of 29');
    await expect(app.getByTestId('pace-line')).toContainText('this week 0 of 3');
    await expect(app.getByRole('link', { name: 'Start round 1' })).toBeVisible();
    await expect(app.getByTestId('sync-chip')).toHaveText('Saved to your account');
    expect(errors).toEqual([]);
    expect(blocked).toEqual([]);
  });

  test('the wide map has 29 stations and three open links', async ({ app }) => {
    await app.setViewportSize({ width: 1280, height: 900 });
    await app.goto('/');
    await expect(app.locator('.transit .station')).toHaveCount(29);
    await expect(app.locator('.transit a.station')).toHaveCount(3);
    await expect(app.locator('.transit a.station').first()).toHaveAttribute('aria-label', /Round 1, Central, Zone 1, not started, next round/);
  });

  test('on a phone the map becomes strips', async ({ app }) => {
    await app.setViewportSize({ width: 390, height: 844 });
    await app.goto('/');
    await expect(app.locator('.map-strip')).toBeVisible();
    await expect(app.locator('.map-wide')).toBeHidden();
    await expect(app.locator('.strip')).toHaveCount(10);
    await expect(app.locator('a.stop')).toHaveCount(3);
  });

  test('the projected finish for 29 rounds at 3 a week from Mon Oct 5 is the week of Dec 7', async ({ app }) => {
    await app.clock.setFixedTime(new Date(2026, 9, 5, 10, 0, 0));
    await app.goto('/');
    await expect(app.getByTestId('pace-line')).toContainText('week of Dec 7');
  });
});

test.describe('fallback (no window.claude, like Vercel)', () => {
  test.use({ stubMode: 'fallback' });
  test('works with every capability absent', async ({ app, errors }) => {
    await app.goto('/');
    await expect(app.getByRole('heading', { level: 1, name: 'Course map' })).toBeVisible();
    await expect(app.getByTestId('sync-chip')).toHaveText('Saved in this browser only');
    expect(errors).toEqual([]);
  });
});

test.describe('signed out', () => {
  test.use({ stubMode: 'signed-out' });
  test('db is absent, progress stays local', async ({ app }) => {
    await app.goto('/');
    await expect(app.getByTestId('sync-chip')).toHaveText('Saved in this browser only');
  });
});

test('body background comes from the token in both themes', async ({ app }) => {
  await app.goto('/');
  await app.emulateMedia({ colorScheme: 'light' });
  expect(await app.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(244, 245, 242)');
  await app.emulateMedia({ colorScheme: 'dark' });
  expect(await app.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(15, 19, 24)');
});
