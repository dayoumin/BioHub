import { defineConfig, devices } from '@playwright/test'

/**
 * E2E 테스트 실행 모드:
 *
 * 1. Production 빌드 (권장, 안정적):
 *    pnpm build && npx playwright test --config=e2e/playwright-e2e.config.ts
 *
 * 2. 기존 dev 서버 사용 (빠른 개발용, ChunkLoadError 가능):
 *    E2E_BASE_URL=http://localhost:3005 npx playwright test --config=e2e/playwright-e2e.config.ts
 */

const useExistingServer = !!process.env.E2E_BASE_URL

export default defineConfig({
  testDir: '.',
  testMatch: 'smart-flow-e2e.spec.ts',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 180_000,

  outputDir: './results/artifacts',
  reporter: [['list']],

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3005',
    headless: true,
    screenshot: 'only-on-failure',
    serviceWorkers: 'block',
  },

  // Production 빌드 서버 자동 실행 (E2E_BASE_URL 미설정 시)
  ...(!useExistingServer && {
    webServer: {
      command: 'npx serve out -p 3005 -s',
      port: 3005,
      reuseExistingServer: true,
      timeout: 30_000,
    },
  }),

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
