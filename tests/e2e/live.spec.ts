import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

const openLearn = async (app: Page, id = 'r01') => {
  await app.goto(`/#${id}`);
  await app.getByRole('button', { name: /start the round/i }).click();
};
const calls = (app: Page) => app.evaluate(() => (window as any).__stubCalls as any[]);

test.describe('live answers (stub: live)', () => {
  test.use({ stubMode: 'live', stubConfig: { canned: { 'ask-round': 'A token is a small chunk of text.', 'prompt-run': 'Complaints\n- Slow shipping (2 reviews)' } } });

  test('nothing calls Claude until a button is clicked', async ({ app }) => {
    await openLearn(app, 'r03');
    await app.getByRole('button', { name: /on to: try it/i }).click();
    await app.waitForTimeout(400);
    expect((await calls(app)).filter((c) => c.kind === 'sample')).toHaveLength(0);
  });

  test('Ask Claude sends a round-aware prompt on the quick tier and shows the answer', async ({ app }) => {
    await openLearn(app);
    await app.locator('#ask-r01').fill('What is a token?');
    await app.getByRole('button', { name: 'Ask', exact: true }).click();
    await expect(app.getByTestId('live-text')).toHaveText('A token is a small chunk of text.');
    const c = (await calls(app)).find((x) => x.kind === 'sample');
    expect(c.input).toContain('Task: ask-round (AI PM 102)');
    expect(c.input).toContain('Round 1: "The big picture"');
    expect(c.input).toContain('Question: What is a token?');
    expect(c.opts.modelTier).toBe('quick');
    expect(c.opts.hasSignal).toBe(true);
  });

  test('the prompt builder runs the assembled prompt', async ({ app }) => {
    await openLearn(app, 'r03');
    await app.getByRole('button', { name: /on to: try it/i }).click();
    await app.locator('#pb-on-constraints').check();
    await app.getByRole('button', { name: 'Run my prompt' }).click();
    await expect(app.getByTestId('live-text')).toContainText('Slow shipping');
    const c = (await calls(app)).find((x) => x.kind === 'sample');
    expect(c.input.startsWith('Task: prompt-run (AI PM 102)')).toBe(true);
    expect(c.input).toContain('If a point appears in only one review');
  });
});

test.describe('Thinking and Stop (stub: slow)', () => {
  test.use({ stubMode: 'slow' });
  test('shows Thinking, can be stopped, and the box is usable again', async ({ app }) => {
    await openLearn(app);
    await app.locator('#ask-r01').fill('Explain tokens');
    await app.getByRole('button', { name: 'Ask', exact: true }).click();
    await expect(app.getByRole('status').filter({ hasText: 'Thinking' })).toBeVisible();
    await app.getByRole('button', { name: 'Stop' }).click();
    await expect(app.locator('.live__note', { hasText: 'Stopped.' })).toBeVisible();
    await expect(app.getByRole('button', { name: 'Ask', exact: true })).toBeEnabled();
  });
});

test.describe('declined (stub: denied)', () => {
  test.use({ stubMode: 'denied' });
  test('turns live controls off with plain copy and keeps the worked example', async ({ app }) => {
    await openLearn(app);
    await app.locator('#ask-r01').fill('hello');
    await app.getByRole('button', { name: 'Ask', exact: true }).click();
    await expect(app.getByTestId('live-off')).toContainText('Live answers are off for this visit');
    await expect(app.getByRole('button', { name: 'Ask', exact: true })).toHaveCount(0);
    await app.getByRole('button', { name: /on to: try it/i }).click();
    await app.getByRole('button', { name: /on to: the check/i }).count();
  });
  test('the prompt builder hides Run and still shows the worked example', async ({ app }) => {
    await openLearn(app, 'r03');
    await app.getByRole('button', { name: /on to: try it/i }).click();
    await app.getByRole('button', { name: 'Run my prompt' }).click().catch(() => undefined);
    await expect(app.getByText('Written by hand from the eight example reviews')).toBeVisible();
  });
});

test.describe('rate limited (stub: rate-limited)', () => {
  test.use({ stubMode: 'rate-limited' });
  test('tells the viewer to wait and keeps the control', async ({ app }) => {
    await openLearn(app);
    await app.locator('#ask-r01').fill('hello');
    await app.getByRole('button', { name: 'Ask', exact: true }).click();
    await expect(app.getByTestId('live-error')).toContainText('Wait a minute');
    await expect(app.getByRole('button', { name: 'Ask', exact: true })).toBeEnabled();
    // It did not retry by itself.
    await app.waitForTimeout(500);
    expect((await calls(app)).filter((c) => c.kind === 'sample')).toHaveLength(1);
  });
});

test.describe('no window.claude (like Vercel)', () => {
  test.use({ stubMode: 'fallback' });
  test('the Ask box explains where live answers work and the builder shows worked examples', async ({ app, errors }) => {
    await openLearn(app);
    await expect(app.getByTestId('live-off')).toContainText('open this page in claude.ai');
    await app.getByRole('button', { name: /on to: try it/i }).click();
    expect(errors).toEqual([]);
  });
  test('about page says live answers are not available here', async ({ app }) => {
    await app.goto('/#about');
    await expect(app.getByTestId('about-live')).toContainText('Not available here');
  });
});
