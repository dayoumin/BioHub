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
		// output:'export' → out/ 폴더를 npx serve로 서빙 (next start 불가)
		// 빌드는 E2E 실행 전 별도 수행: pnpm run build
		// -s 금지: static export는 라우트별 HTML이 있으므로 SPA fallback 불필요
		command: 'npx --yes serve out -p 3200',
		url: 'http://localhost:3200',
		reuseExistingServer: !process.env.CI,
		timeout: 30000,
	},

	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
})
