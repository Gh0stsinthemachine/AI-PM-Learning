import { test, expect, ANSWERS, answerAll, playRound } from './fixtures';
import type { Page } from '@playwright/test';

const setRange = (page: Page, sel: string, v: string) =>
  page.locator(sel).evaluate((el, val) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    set.call(el, val);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, v);

test.describe('round flow', () => {
  test.use({ stubMode: 'fallback' });

  test('round 1 from start to finish updates the map and the week', async ({ app, errors }) => {
    await app.goto('/#r01');
    await expect(app.getByRole('heading', { level: 1, name: 'The big picture' })).toBeVisible();
    await app.getByRole('button', { name: 'Start the round' }).click();
    await expect(app.getByRole('heading', { name: 'What AI is, in one picture' })).toBeVisible();
    await expect(app.locator('.figure svg')).toBeVisible();
    await app.getByRole('button', { name: /on to: try it/i }).click();
    await expect(app.getByRole('heading', { name: 'Try it' })).toBeVisible();
    await app.getByRole('button', { name: /on to: the check/i }).click();
    await answerAll(app, ANSWERS.r01!);
    await expect(app.getByRole('heading', { name: 'Wrap' })).toBeVisible();
    await expect(app.getByText('Score on the check: 4 of 4.')).toBeVisible();
    await app.locator('#sc-3-new').check();
    await expect(app.getByTestId('selfcheck-new')).toContainText('Context');
    await app.locator('#takeaway').fill('Evals and agents.');
    await app.getByRole('button', { name: 'Finish round 1' }).click();
    await expect(app.getByRole('heading', { name: 'Round complete' })).toBeVisible();
    await expect(app.getByTestId('week-line')).toHaveText('This week: 1 of 3 rounds.');
    await expect(app.getByRole('link', { name: /Next: round 2/ })).toBeVisible();
    await app.getByRole('link', { name: 'Back to the map' }).click();
    await expect(app.locator('.board__zone')).toHaveText('1 of 29 stations');
    await expect(app.getByRole('link', { name: 'Start round 2' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('the next round opens with a warm-up from the one before, then carries on', async ({ app }) => {
    await app.goto('/#r01');
    await playRound(app, 'r01');
    await app.goto('/#r02');
    await app.getByRole('button', { name: 'Start the round' }).click();
    await expect(app.getByRole('heading', { name: /warm-up/i })).toBeVisible();
    await expect(app.locator('.question__count')).toHaveText('Question 1 of 2');
    // Warm-up questions come from round 1.
    await expect(app.locator('[data-question^="r01-"]')).toBeVisible();
    // Answer both warm-up questions (any choice) and carry on to the lesson.
    for (let i = 0; i < 2; i++) {
      await app.locator('.question input[type=radio]').first().check();
      await app.getByRole('button', { name: 'Check answer' }).click();
      await app.locator('.question__result button').click();
    }
    await expect(app.getByRole('heading', { name: /What a model is/ })).toBeVisible();
  });

  test('test-out: four of four marks a Zone 1 round as tested out', async ({ app }) => {
    await app.goto('/#r02');
    await app.getByRole('button', { name: /already know this/i }).click();
    await answerAll(app, ANSWERS.r02!);
    await expect(app.getByRole('heading', { name: 'Tested out' })).toBeVisible();
    await app.getByRole('link', { name: 'Back to the map' }).click();
    await expect(app.locator('.board__zone')).toHaveText('1 of 29 stations');
    await app.setViewportSize({ width: 1280, height: 900 });
    await expect(app.locator('a.station[aria-label^="Round 2,"]')).toHaveAttribute('aria-label', /tested out/);
  });

  test('test-out: a miss sends you through the round normally', async ({ app }) => {
    await app.goto('/#r02');
    await app.getByRole('button', { name: /already know this/i }).click();
    await answerAll(app, ANSWERS.r02!, { wrongAt: 2 });
    await expect(app.getByText('That was not 4 of 4')).toBeVisible();
    await expect(app.getByRole('heading', { name: /What a model is/ })).toBeVisible();
  });

  test('progress survives a reload', async ({ app }) => {
    await app.goto('/#r01');
    await playRound(app, 'r01');
    await app.reload();
    await app.goto('/#home');
    await expect(app.locator('.board__zone')).toHaveText('1 of 29 stations');
  });

  test('pace: changing rounds per week updates the home line', async ({ app }) => {
    await app.goto('/#journey');
    await app.locator('#pace').selectOption('5');
    await app.goto('/#home');
    await expect(app.getByTestId('pace-line')).toContainText('this week 0 of 5');
  });

  test('reset clears everything after a confirmation step', async ({ app }) => {
    await app.goto('/#r01');
    await playRound(app, 'r01');
    await app.goto('/#journey');
    await app.getByRole('button', { name: /reset all progress/i }).click();
    await expect(app.getByRole('alertdialog')).toBeVisible();
    await app.getByRole('button', { name: 'Yes, reset everything' }).click();
    await app.goto('/#home');
    await expect(app.locator('.board__zone')).toHaveText('0 of 29 stations');
  });
});

test.describe('interactive pieces', () => {
  test.use({ stubMode: 'fallback' });

  test('temperature sampler: odds change with the slider and 20 picks add up', async ({ app }) => {
    await app.goto('/#r01');
    await app.getByRole('button', { name: 'Start the round' }).click();
    await app.getByRole('button', { name: /on to: try it/i }).click();
    await setRange(app, '#temp', '0.1');
    await expect(app.getByTestId('pct-door')).toHaveText('100%');
    await setRange(app, '#temp', '1');
    await expect(app.getByTestId('pct-door')).toHaveText('50%');
    await setRange(app, '#temp', '2');
    await expect(app.getByTestId('pct-door')).toHaveText('35%');
    await app.getByRole('button', { name: 'Pick 20 times' }).click();
    const text = (await app.getByTestId('pick-counts').textContent()) ?? '';
    const total = [...text.split(':')[1]!.matchAll(/ (\d+)/g)].map((m) => Number(m[1])).reduce((a, b) => a + b, 0);
    expect(total).toBe(20);
    await app.getByRole('button', { name: 'Pick a word' }).click();
    await expect(app.getByTestId('pick-history')).toBeVisible();
  });

  test('token window: estimate, fit and cost', async ({ app }) => {
    await app.goto('/#r02');
    await app.getByRole('button', { name: 'Start the round' }).click();
    await app.getByRole('button', { name: /on to: try it/i }).click();
    await app.locator('#tw-text').fill('a'.repeat(1200));
    await expect(app.getByTestId('tw-estimate')).toContainText('300 tokens');
    await app.locator('#tw-instr').fill('1500');
    await app.locator('#tw-hist').fill('0');
    await app.locator('#tw-docs').fill('500');
    await app.locator('#tw-res').fill('500');
    await expect(app.getByTestId('tw-cost')).toContainText('$0.0144');
    await expect(app.getByTestId('tw-fit')).toContainText('Fits');
    await app.locator('#tw-docs').fill('9000');
    await expect(app.getByTestId('tw-fit')).toContainText('Over the window by');
  });

  test('prompt builder: parts switch on and the prompt follows', async ({ app }) => {
    await app.goto('/#r03');
    await app.getByRole('button', { name: 'Start the round' }).click();
    await app.getByRole('button', { name: /on to: try it/i }).click();
    const prompt = app.locator('#pb-assembled');
    await expect(prompt).toHaveValue(/Summarize the reviews/);
    await expect(prompt).not.toHaveValue(/customer-insights analyst/);
    await expect(app.getByRole('heading', { name: 'Your prompt (1 of 6 parts)' })).toBeVisible();
    await app.locator('#pb-on-role').check();
    await expect(prompt).toHaveValue(/customer-insights analyst/);
    await expect(app.getByRole('heading', { name: 'Your prompt (2 of 6 parts)' })).toBeVisible();
    // Reviews sit above the instructions.
    const v = await prompt.inputValue();
    expect(v.indexOf('Reviews:')).toBeLessThan(v.indexOf('Summarize the reviews'));
    await expect(app.getByText('Written by hand from the eight example reviews')).toBeVisible();
  });

  test('glossary terms open a plain-English definition', async ({ app }) => {
    await app.goto('/#r01');
    await app.getByRole('button', { name: 'Start the round' }).click();
    await app.getByRole('button', { name: 'token', exact: true }).first().click();
    await expect(app.getByRole('note')).toContainText('small chunk of text');
  });
});
