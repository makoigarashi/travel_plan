import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test_js',
  testMatch: '**/*.spec.mjs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 3,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never' }]
  ],  
  use: {
    trace: 'on-first-retry',
    // baseURLをWebサーバーのルートに設定します
    baseURL: 'http://127.0.0.1:5501',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  // Webサーバーの設定を、frontendディレクトリをルートとして配信するように修正します
  webServer: {
    command: 'npx http-server . -p 5501',
    cwd: './', // playwright.config.jsがあるディレクトリ(frontend)をカレントディレクトリに
    url: 'http://127.0.0.1:5501/index.html', // 起動確認URL
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // タイムアウトを延長
  },
});
