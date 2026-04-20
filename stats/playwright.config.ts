import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
	testDir: './e2e',
	fullyParallel: false,
	retries: 1,
	workers: 1,
	timeout: 300000,

	// Results output
	outputDir: './e2e/results/artifacts',
	reporter: [
		['html', { outputFolder: './e2e/results/reports' }],
		['json', { outputFile: './e2e/results/reports/results.json' }],
		['list']
	],

	use: {
		baseURL: 'http://localhost:3200',
		headless: true,

		// Screenshots & traces
		screenshot: 'only-on-failure',
		trace: 'on-first-retry',
		video: 'on-first-retry',
	},

	webServer: {
		// output:'export' → out/ 폴더를 로컬 Node 정적 서버로 서빙 (next start 불가)
		// 빌드는 E2E 실행 전 별도 수행: pnpm run build
		command: 'node scripts/test-automation/serve-static-out.mjs',
		url: 'http://localhost:3200',
		reuseExistingServer: !process.env.CI,
		timeout: 120000,
	},

	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
})
