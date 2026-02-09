
import { test, expect } from '@playwright/test';

test.describe('Statistical Analysis Flow', () => {

    test('ANOVA Analysis End-to-End', async ({ page }) => {
        // Enable console logs
        page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
        page.on('pageerror', err => console.log(`BROWSER ERROR: ${err.message}`));

        console.log('1. Navigating to ANOVA page');
        await page.goto('/statistics/anova');

        // Wait for page to load
        await expect(page.getByText('ANOVA 유형 선택')).toBeVisible({ timeout: 10000 });
        console.log('Page loaded');

        // 2. Select One-way ANOVA
        console.log('2. Selecting One-way ANOVA');
        // Find the card element that contains the specific text
        const oneWayCard = page.locator('.cursor-pointer', { has: page.getByText('일원 분산분석') }).first();
        await expect(oneWayCard).toBeVisible();
        await oneWayCard.click();

        // 3. Upload Data
        console.log('3. Waiting for Data Upload step');
        await expect(page.getByText('데이터 업로드')).toBeVisible({ timeout: 10000 });

        // Prepare sample CSV content
        const csvContent = "group,value\nA,10.5\nA,12.3\nA,11.8\nB,20.1\nB,21.5\nB,19.9\nC,15.2\nC,16.8\nC,15.5";

        // Trigger file upload
        console.log('Uploading file...');
        const fileInput = page.locator('input[type="file"]');
        const count = await fileInput.count();
        console.log(`Found ${count} file inputs`);

        // Use the first input (usually the dropzone one)
        await fileInput.first().setInputFiles({
            name: 'anova_test_data.csv',
            mimeType: 'text/csv',
            buffer: Buffer.from(csvContent)
        });
        console.log('File inputs set.');

        // Wait for processing
        await page.waitForTimeout(1000);

        // Check for filename appearance
        const filenameLocator = page.getByText('anova_test_data.csv');
        console.log('Waiting for filename visibility...');
        try {
            await expect(filenameLocator).toBeVisible({ timeout: 10000 });
            console.log('Filename visible.');
        } catch (e) {
            console.log('Filename NOT visible after 10s.');
            const body = await page.innerHTML('body');
            console.log('BODY SNAPSHOT:', body.slice(0, 1000)); // Print first 1000 chars
            throw e;
        }

        // 4. Variable Selection
        console.log('4. Waiting for Variable Selection step (Step 3)');
        // If verify fails, dump headers
        try {
            await expect(page.getByText('변수 선택')).toBeVisible({ timeout: 5000 });
        } catch (e) {
            console.log('Step 3 not visible. Current headers:');
            const headers = await page.getByRole('heading').allTextContents();
            console.log(headers);
            throw e;
        }

        // Select Dependent Variable: 'value'
        console.log('Selecting dependent variable');
        // dependent variable section
        await page.getByText('value', { exact: true }).first().click();

        // Select Factor: 'group'
        console.log('Selecting factor');
        await page.getByText('group', { exact: true }).last().click();

        // 5. Run Analysis
        console.log('5. Running Analysis');
        const analyzeButton = page.getByRole('button', { name: 'ANOVA 실행' });
        await expect(analyzeButton).toBeEnabled();
        await analyzeButton.click();

        // 6. Verify Results
        console.log('6. Verifying Results');
        await expect(page.getByText('결과 확인')).toBeVisible({ timeout: 60000 });

        // Check significant result
        await expect(page.getByText('유의합니다')).toBeVisible();

        console.log('Test Complete Success');
    });
});
