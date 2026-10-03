import { defineConfig } from '@playwright/test';

// The browser tests run against the production build in dist/web, served locally.
// The global Playwright (1.56.1) matches the pre-installed Chromium, so no
// executablePath or download is needed. Never run `playwright install` here.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'off' },
  webServer: {
    command: 'npx vite preview --outDir dist/web --port 4173 --strictPort --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
