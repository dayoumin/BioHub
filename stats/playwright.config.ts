import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
	testDir: './e2e',
	fullyParallel: false,
	retries: 0,
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
		baseURL: 'http://localhost:3000',
		headless: true,

		// Screenshots & traces
		screenshot: 'only-on-failure',
		trace: 'on-first-retry',
		video: 'on-first-retry',
	},

	webServer: {
		command: 'npm run dev',
		url: 'http://localhost:3000',
		reuseExistingServer: true,
		timeout: 180000,
	},

	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
})
