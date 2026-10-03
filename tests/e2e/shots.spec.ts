import { test } from './fixtures';

// Dev tool, not part of `npm run check`: SHOTS=/some/dir npx playwright test shots
// Saves screenshots of the main screens at phone and desktop widths in both themes.
const dir = process.env.SHOTS;

test.describe('screenshots', () => {
  test.skip(!dir, 'set SHOTS=<dir> to take screenshots');
  test.use({ stubMode: 'live' });

  const sizes = { phone: { width: 390, height: 844 }, desktop: { width: 1280, height: 900 } } as const;
  for (const [size, vp] of Object.entries(sizes)) {
    for (const scheme of ['light', 'dark'] as const) {
      test(`${size} ${scheme}`, async ({ app }) => {
        await app.setViewportSize(vp);
        await app.emulateMedia({ colorScheme: scheme });
        await app.goto('/');
        await app.waitForSelector('.board');
        await app.screenshot({ path: `${dir}/home-${size}-${scheme}.png`, fullPage: true });
        for (const r of ['r01', 'r02', 'r03']) {
          await app.goto(`/#${r}`);
          await app.getByRole('button', { name: /start the round|continue/i }).click();
          if (await app.getByRole('button', { name: 'Check answer' }).count()) {
            // warm-up present on rounds 2 and 3 only after earlier rounds finish; skip
          }
          await app.screenshot({ path: `${dir}/${r}-learn-${size}-${scheme}.png`, fullPage: true });
          await app.getByRole('button', { name: /on to: try it/i }).click();
          await app.screenshot({ path: `${dir}/${r}-try-${size}-${scheme}.png`, fullPage: true });
        }
        await app.goto('/#journey');
        await app.screenshot({ path: `${dir}/journey-${size}-${scheme}.png`, fullPage: true });
      });
    }
  }
});
