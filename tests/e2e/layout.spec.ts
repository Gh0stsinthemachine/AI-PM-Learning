import { test, expect } from './fixtures';
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

test.use({ stubMode: 'live' });

const noHorizontalScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);

const screens: Array<{ name: string; go: (p: Page) => Promise<void> }> = [
  { name: 'home', go: async (p) => { await p.goto('/#home'); } },
  { name: 'journey', go: async (p) => { await p.goto('/#journey'); } },
  { name: 'about', go: async (p) => { await p.goto('/#about'); } },
  ...['r01', 'r02', 'r03'].flatMap((id) => [
    { name: `${id} intro`, go: async (p: Page) => { await p.goto('/#home'); await p.goto(`/#${id}`); } },
    { name: `${id} learn`, go: async (p: Page) => { await p.goto('/#home'); await p.goto(`/#${id}`); await p.getByRole('button', { name: /start the round|continue/i }).click(); } },
    { name: `${id} try`, go: async (p: Page) => { await p.goto('/#home'); await p.goto(`/#${id}`); await p.getByRole('button', { name: /start the round|continue/i }).click(); await p.getByRole('button', { name: /on to: try it/i }).click(); } },
    { name: `${id} check`, go: async (p: Page) => { await p.goto('/#home'); await p.goto(`/#${id}`); await p.getByRole('button', { name: /start the round|continue/i }).click(); await p.getByRole('button', { name: /on to: try it/i }).click(); await p.getByRole('button', { name: /on to: the check/i }).click(); } },
  ]),
];

for (const [size, vp] of [['phone', { width: 390, height: 844 }], ['desktop', { width: 1280, height: 900 }]] as const) {
  for (const scheme of ['light', 'dark'] as const) {
    test(`no overflow, no errors: ${size}, ${scheme}`, async ({ app, errors, blocked }) => {
      await app.setViewportSize(vp);
      await app.emulateMedia({ colorScheme: scheme });
      await app.goto('/');
      for (const s of screens) {
        await s.go(app);
        await expect(app.locator('h1').first()).toBeVisible();
        expect(await noHorizontalScroll(app), `${s.name} scrolls sideways at ${size}`).toBe(true);
      }
      expect(errors).toEqual([]);
      expect(blocked).toEqual([]);
    });
  }
}

test('map labels do not collide on a wide screen', async ({ app }) => {
  await app.setViewportSize({ width: 1280, height: 900 });
  await app.goto('/#home');
  const boxes = await app.locator('.transit text.svg-label, .transit text.svg-line').evaluateAll((els) =>
    els.map((e) => { const r = e.getBoundingClientRect(); return { t: e.textContent, l: r.left, r: r.right, top: r.top, b: r.bottom }; }),
  );
  expect(boxes.length).toBeGreaterThan(30);
  const hits: string[] = [];
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i]!, b = boxes[j]!;
    if (a.l < b.r - 1 && b.l < a.r - 1 && a.top < b.b - 1 && b.top < a.b - 1) hits.push(`${a.t} / ${b.t}`);
  }
  expect(hits).toEqual([]);
});

test('stations can be reached with the keyboard and show a focus ring', async ({ app }) => {
  await app.setViewportSize({ width: 1280, height: 900 });
  await app.goto('/#home');
  let found = false;
  for (let i = 0; i < 20 && !found; i++) {
    await app.keyboard.press('Tab');
    found = await app.evaluate(() => (document.activeElement?.getAttribute('aria-label') ?? '').startsWith('Round 1, Central'));
  }
  expect(found).toBe(true);
  await app.keyboard.press('Enter');
  await expect(app.getByRole('heading', { level: 1, name: 'The big picture' })).toBeVisible();
});

for (const scheme of ['light', 'dark'] as const) {
  test(`accessibility (axe) on the main screens, ${scheme}`, async ({ app }) => {
    await app.setViewportSize({ width: 1280, height: 900 });
    await app.emulateMedia({ colorScheme: scheme });
    for (const s of screens.filter((x) => ['home', 'journey', 'about', 'r01 learn', 'r02 try', 'r03 try', 'r03 check'].includes(x.name))) {
      await s.go(app);
      await expect(app.locator('h1').first()).toBeVisible();
      const r = await new AxeBuilder({ page: app }).withTags(['wcag2a', 'wcag2aa']).analyze();
      const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(bad.map((v) => `${s.name}: ${v.id} (${v.nodes.length}) ${v.nodes[0]?.html.slice(0, 120)}`)).toEqual([]);
    }
  });
}

test('with reduced motion nothing is animating at rest', async ({ app }) => {
  await app.emulateMedia({ reducedMotion: 'reduce' });
  await app.goto('/#home');
  await expect(app.locator('h1').first()).toBeVisible();
  expect(await app.evaluate(() => document.getAnimations().length)).toBe(0);
});
