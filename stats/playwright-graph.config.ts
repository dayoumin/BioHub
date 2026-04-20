import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
	testDir: './e2e',
	testMatch: '**/graph-studio*.spec.ts',
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
		baseURL: 'http://localhost:3001',
		headless: true,

		// Screenshots & traces
		screenshot: 'only-on-failure',
		trace: 'on-first-retry',
		video: 'on-first-retry',
	},

	webServer: {
		command: 'node scripts/test-automation/serve-static-out.mjs 3001',
		url: 'http://localhost:3001',
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
