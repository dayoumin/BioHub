
import { test, expect } from '@playwright/test';

test.describe('Core Calculation Verification', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/test-calculation');
    });

    test('Verify ANOVA Core Logic', async ({ page }) => {
        // Run ANOVA
        await page.getByTestId('btn-anova').click();

        // Wait for Done status
        await expect(page.getByTestId('status')).toHaveText('ANOVA Done', { timeout: 60000 });

        // Check Result Content
        const resultText = await page.getByTestId('result-anova').textContent();
        console.log('ANOVA Result:', resultText);

        const result = JSON.parse(resultText || '{}');
        expect(result.fStatistic).toBeDefined();
        // expect(result.pValue).toBeLessThan(0.001); // Significant difference expected
    });

    test('Verify T-Test Core Logic', async ({ page }) => {
        // Run T-Test
        await page.getByTestId('btn-ttest').click();

        // Wait for Done status with error handling
        try {
            await expect(page.getByTestId('status')).toHaveText('T-Test Done', { timeout: 60000 });
        } catch (e) {
            const status = await page.getByTestId('status').textContent();
            console.log('T-Test FAILED. Status:', status);
            throw new Error(`Test failed with status: ${status}`);
        }

        // Check Result Content
        const resultText = await page.getByTestId('result-ttest').textContent();
        console.log('T-Test Result:', resultText);

        const result = JSON.parse(resultText || '{}');
        expect(result.statistic).toBeDefined(); // t-statistic
        expect(result.pValue).toBeDefined();
    });
});
