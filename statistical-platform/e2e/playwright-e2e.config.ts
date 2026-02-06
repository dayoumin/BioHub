import { defineConfig, devices } from '@playwright/test'

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
  },

  // webServer 없음 - 기존 dev 서버 직접 사용
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
