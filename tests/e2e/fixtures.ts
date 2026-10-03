import { test as base, expect, type Page } from '@playwright/test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { REACT_URL, REACT_DOM_URL } from '../../build/cdn.mjs';

const require = createRequire(import.meta.url);
const umd = (pkg: string, file: string) => join(dirname(require.resolve(`${pkg}/package.json`)), 'umd', file);
const stubSource = readFileSync(join(process.cwd(), 'tests/stub/claude-stub.js'), 'utf8');

export type StubMode = 'fallback' | 'live' | 'denied' | 'no-tools' | 'signed-out' | 'rate-limited' | 'slow';

export type Options = {
  stubMode: StubMode;
  stubConfig: Record<string, unknown>;
};

type Fixtures = { app: Page; errors: string[]; blocked: string[] };

// 'fallback' installs no window.claude at all, which is what the page sees on Vercel.
export const test = base.extend<Options & Fixtures>({
  stubMode: ['live', { option: true }],
  stubConfig: [{}, { option: true }],

  errors: async ({}, use) => use([]),
  blocked: async ({}, use) => use([]),

  app: async ({ page, context, stubMode, stubConfig, errors, blocked }, use) => {
    // cdnjs is unreachable from the sandbox; serve the byte-identical npm UMD builds.
    await context.route(REACT_URL, (r) =>
      r.fulfill({ path: umd('react', 'react.production.min.js'), contentType: 'text/javascript' }),
    );
    await context.route(REACT_DOM_URL, (r) =>
      r.fulfill({ path: umd('react-dom', 'react-dom.production.min.js'), contentType: 'text/javascript' }),
    );
    // Fonts are stubbed so tests never depend on the network. Set REAL_FONTS=1 to load them.
    await context.route(/fonts\.(googleapis|gstatic)\.com/, (r) =>
      process.env.REAL_FONTS ? r.continue() : r.fulfill({ status: 200, contentType: 'text/css', body: '' }),
    );
    // Anything else that leaves localhost is a bug the artifact CSP would also block.
    await context.route(
      (u) => !/^(127\.0\.0\.1|localhost)$/.test(u.hostname) && u.protocol.startsWith('http') &&
        !/(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)/.test(u.hostname),
      (r) => {
        blocked.push(r.request().url());
        return r.abort();
      },
    );
    if (stubMode !== 'fallback') {
      await page.addInitScript(
        ({ source, config }) => {
          (window as unknown as Record<string, unknown>).__AIPM_STUB__ = config;
          // eslint-disable-next-line no-new-func
          new Function(source)();
        },
        { source: stubSource, config: { mode: stubMode, ...stubConfig } },
      );
    }
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(String(e)));
    await use(page);
  },
});

export { expect };
