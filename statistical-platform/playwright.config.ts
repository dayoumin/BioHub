import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
	testDir: './e2e',
	fullyParallel: false,
	retries: 0,
	workers: 1,
	timeout: 300000, // 전체 테스트 타임아웃 2분
	use: {
		baseURL: 'http://localhost:3000',
		headless: true,
	},
	webServer: {
		command: 'npm run dev',
		url: 'http://localhost:3000',
		reuseExistingServer: true,
		timeout: 180000, // 서버 시작 타임아웃 3분
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
})


