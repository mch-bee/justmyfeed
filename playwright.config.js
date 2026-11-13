// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    locale: 'en-GB',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      // No internet: mock pages that imitate YouTube, Instagram and Facebook,
      // plus any real pages you save in tests/fixtures/real.
      name: 'offline',
      testDir: './tests/offline',
    },
    {
      // With internet: the real YouTube (no account).
      name: 'live',
      testDir: './tests/live',
      retries: 1,
    },
  ],
});
