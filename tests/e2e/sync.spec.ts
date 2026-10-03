import { test, expect, newDevice, SharedDb, playRound } from './fixtures';

test.describe('two devices', () => {
  test('a round finished on one device shows up on the other, and nothing is lost', async ({ browser }) => {
    const db = new SharedDb();
    const phone = await newDevice(browser, db);
    const laptop = await newDevice(browser, db);
    await laptop.page.goto('/#home');
    await expect(laptop.page.getByTestId('sync-chip')).toHaveText('Saved to your account');

    await phone.page.goto('/#r01');
    await playRound(phone.page, 'r01');
    await expect.poll(() => db.get('data/users/u_test/progress')?.rounds?.r01?.s, { timeout: 10_000 }).toBe(3);

    await expect(laptop.page.locator('.board__zone')).toHaveText('1 of 29 stations', { timeout: 10_000 });

    // The laptop finishes a different round at the same time; both survive.
    await laptop.page.goto('/#r02');
    await laptop.page.getByRole('button', { name: /already know this/i }).click();
    for (const pick of [1, 1, 1, 1]) {
      await laptop.page.locator('.question input[type=radio]').nth(pick).check();
      await laptop.page.getByRole('button', { name: 'Check answer' }).click();
      await laptop.page.locator('.question__result button').click();
    }
    await expect.poll(() => Object.keys(db.get('data/users/u_test/progress').rounds).sort().join(','), { timeout: 10_000 }).toBe('r01,r02');
    await phone.page.goto('/#home');
    await expect(phone.page.locator('.board__zone')).toHaveText('2 of 29 stations', { timeout: 10_000 });

    expect(phone.c.errors).toEqual([]);
    expect(laptop.c.errors).toEqual([]);
    await phone.context.close();
    await laptop.context.close();
  });

  test('notebook entries sync too, in their own private document', async ({ browser }) => {
    const db = new SharedDb();
    const a = await newDevice(browser, db);
    await a.page.goto('/#r01');
    await playRound(a.page, 'r01');
    // playRound does not type a takeaway, so type one now and expect it in the notebook document only.
    await a.page.goto('/#r02');
    await a.page.goto('/#r01');
    await a.page.getByRole('button', { name: /start the round/i }).click();
    await a.page.getByRole('button', { name: /on to: try it/i }).click();
    await a.page.getByRole('button', { name: /on to: the check/i }).click();
    for (const pick of [1, 1, 2, 1]) {
      await a.page.locator('.question input[type=radio]').nth(pick).check();
      await a.page.getByRole('button', { name: 'Check answer' }).click();
      await a.page.locator('.question__result button').click();
    }
    await a.page.locator('#takeaway').fill('Evals first.');
    await expect.poll(() => db.get('data/users/u_test/notebook')?.entries?.['takeaway:r01']?.text, { timeout: 10_000 }).toBe('Evals first.');
    expect(db.get('data/users/u_test/progress').entries).toBeUndefined();
    await a.context.close();
  });
});

test.describe('outage handling', () => {
  test.use({ stubMode: 'unavailable-once' });
  test('a failed first write is retried once and then saved', async ({ app }) => {
    await app.goto('/#r01');
    await playRound(app, 'r01');
    await expect(app.getByTestId('sync-chip')).toHaveText('Saved to your account', { timeout: 15_000 });
  });
});

test.describe('signed out', () => {
  test.use({ stubMode: 'signed-out' });
  test('progress is kept in this browser and survives a reload', async ({ app }) => {
    await app.goto('/#r01');
    await playRound(app, 'r01');
    await app.reload();
    await app.goto('/#home');
    await expect(app.locator('.board__zone')).toHaveText('1 of 29 stations');
    await expect(app.getByTestId('sync-chip')).toHaveText('Saved in this browser only');
  });
});

test.describe('export', () => {
  test.describe('inside claude.ai with downloads', () => {
    test.use({ stubMode: 'live' });
    test('saves a JSON file through the platform', async ({ app }) => {
      await app.goto('/#r01');
      await playRound(app, 'r01');
      await app.goto('/#journey');
      await app.getByRole('button', { name: /download my progress/i }).click();
      await expect(app.getByText('Saved.')).toBeVisible();
      const saved = await app.evaluate(() => (window as any).__stubDownloads);
      expect(saved).toHaveLength(1);
      expect(saved[0].filename).toBe('ai-pm-102-progress.json');
      expect(JSON.parse(saved[0].data).progress.rounds.r01.s).toBe(3);
    });
  });
  test.describe('declined', () => {
    test.use({ stubMode: 'live', stubConfig: { declineDownloads: true } });
    test('says it was not saved', async ({ app }) => {
      await app.goto('/#journey');
      await app.getByRole('button', { name: /download my progress/i }).click();
      await expect(app.getByText('Not saved.')).toBeVisible();
    });
  });
  test.describe('open web', () => {
    test.use({ stubMode: 'fallback' });
    test('downloads a file the normal way', async ({ app }) => {
      await app.goto('/#journey');
      const [dl] = await Promise.all([app.waitForEvent('download'), app.getByRole('button', { name: /download my progress/i }).click()]);
      expect(dl.suggestedFilename()).toBe('ai-pm-102-progress.json');
    });
  });
});
