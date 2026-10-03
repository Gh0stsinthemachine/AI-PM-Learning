import { test as base, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { REACT_URL, REACT_DOM_URL } from '../../build/cdn.mjs';

const require = createRequire(import.meta.url);
const umd = (pkg: string, file: string) => join(dirname(require.resolve(`${pkg}/package.json`)), 'umd', file);
const stubSource = readFileSync(join(process.cwd(), 'tests/stub/claude-stub.js'), 'utf8');

export type StubMode = 'fallback' | 'live' | 'denied' | 'no-tools' | 'signed-out' | 'rate-limited' | 'slow' | 'unavailable-once';

export type Options = {
  stubMode: StubMode;
  stubConfig: Record<string, unknown>;
};

/** A database that several browser contexts can share, to test "two devices". */
export class SharedDb {
  private m = new Map<string, string>();
  rpc = async (op: string, path: string, data?: unknown) => {
    if (op === 'get') return this.m.has(path) ? JSON.parse(this.m.get(path)!) : null;
    if (op === 'set') { this.m.set(path, JSON.stringify(data)); return undefined; }
    if (op === 'del') { this.m.delete(path); return undefined; }
    if (op === 'list') {
      return [...this.m.keys()].filter((k) => k.lastIndexOf('/') === path.length && k.startsWith(path + '/')).sort()
        .map((k) => ({ id: k.slice(path.length + 1), data: JSON.parse(this.m.get(k)!) }));
    }
    return undefined;
  };
  get(path: string): any { return this.m.has(path) ? JSON.parse(this.m.get(path)!) : null; }
}

export interface Collected { errors: string[]; blocked: string[] }

/** Everything a page needs to behave like it does inside claude.ai (or on Vercel, for 'fallback'). */
export async function setupPage(
  context: BrowserContext,
  page: Page,
  o: { stubMode: StubMode; stubConfig?: Record<string, unknown>; db?: SharedDb },
  c: Collected,
) {
  // cdnjs is unreachable from the sandbox; serve the byte-identical npm UMD builds.
  await context.route(REACT_URL, (r) => r.fulfill({ path: umd('react', 'react.production.min.js'), contentType: 'text/javascript' }));
  await context.route(REACT_DOM_URL, (r) => r.fulfill({ path: umd('react-dom', 'react-dom.production.min.js'), contentType: 'text/javascript' }));
  // Fonts are stubbed so tests never depend on the network. Set REAL_FONTS=1 to load them.
  await context.route(/fonts\.(googleapis|gstatic)\.com/, (r) =>
    process.env.REAL_FONTS ? r.continue() : r.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  );
  // Anything else that leaves localhost is a bug the artifact CSP would also block.
  await context.route(
    (u) => !/^(127\.0\.0\.1|localhost)$/.test(u.hostname) && u.protocol.startsWith('http') &&
      !/(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)/.test(u.hostname),
    (r) => { c.blocked.push(r.request().url()); return r.abort(); },
  );
  if (o.db) await page.exposeFunction('__stubDbRpc', o.db.rpc);
  if (o.stubMode !== 'fallback') {
    await page.addInitScript(
      ({ source, config }) => {
        (window as unknown as Record<string, unknown>).__AIPM_STUB__ = config;
        // eslint-disable-next-line no-new-func
        new Function(source)();
      },
      { source: stubSource, config: { mode: o.stubMode, ...(o.stubConfig ?? {}) } },
    );
  }
  page.on('console', (m) => { if (m.type() === 'error') c.errors.push(m.text()); });
  page.on('pageerror', (e) => c.errors.push(String(e)));
}

export async function newDevice(browser: Browser, db: SharedDb, mode: StubMode = 'live') {
  const context = await browser.newContext();
  const page = await context.newPage();
  const c: Collected = { errors: [], blocked: [] };
  await setupPage(context, page, { stubMode: mode, db }, c);
  return { context, page, c };
}

type Fixtures = { app: Page; errors: string[]; blocked: string[] };

// 'fallback' installs no window.claude at all, which is what the page sees on Vercel.
export const test = base.extend<Options & Fixtures>({
  stubMode: ['live', { option: true }],
  stubConfig: [{}, { option: true }],
  errors: async ({}, use) => use([]),
  blocked: async ({}, use) => use([]),
  app: async ({ page, context, stubMode, stubConfig, errors, blocked }, use) => {
    await setupPage(context, page, { stubMode, stubConfig }, { errors, blocked });
    await use(page);
  },
});

export { expect };

// ---- helpers shared by the specs ----
// Correct answer indexes of the quick checks (see src/content/checks.ts).
export const ANSWERS: Record<string, number[]> = { r01: [1, 1, 2, 1], r02: [1, 1, 1, 1], r03: [1, 0, 1, 3] };

export async function answerAll(page: Page, choices: number[], opts: { wrongAt?: number } = {}) {
  for (let i = 0; i < choices.length; i++) {
    const pick = opts.wrongAt === i ? (choices[i]! + 1) % 4 : choices[i]!;
    await page.locator('.question input[type=radio]').nth(pick).check();
    await page.getByRole('button', { name: 'Check answer' }).click();
    await page.locator('.question__result button').click();
  }
}

/** Plays one round start to finish. Assumes the round page is open on the intro. */
export async function playRound(page: Page, id: string, opts: { warm?: number[] } = {}) {
  await page.getByRole('button', { name: /start the round|continue/i }).click();
  if (opts.warm) await answerAll(page, opts.warm);
  await page.getByRole('button', { name: /on to: try it/i }).click();
  await page.getByRole('button', { name: /on to: the check/i }).click();
  await answerAll(page, ANSWERS[id]!);
  await page.getByRole('button', { name: new RegExp(`finish round`, 'i') }).click();
}
