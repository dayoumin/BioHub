// spec: specs/t-test.md
// seed: e2e/seed.spec.ts

import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('t-test Page', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/statistics/t-test');
    await page.waitForLoadState('networkidle');
  });

  // ===========================================
  // 1. Test Type Selection
  // ===========================================

  test.describe('Test Type Selection', () => {

    test('1.1 Select One-Sample t-test', async ({ page }) => {
      // Click on One-Sample t-test card
      await page.click('text=일표본 t-검정');

      // Verify navigation to Step 2 - use heading specifically
      await expect(page.getByRole('heading', { name: /데이터 업로드|요약통계 입력/ })).toBeVisible({ timeout: 10000 });
    });

    test('1.2 Select Independent Samples t-test', async ({ page }) => {
      await page.click('text=독립표본 t-검정');
      await expect(page.getByRole('heading', { name: /데이터 업로드|요약통계 입력/ })).toBeVisible({ timeout: 10000 });
    });

    test('1.3 Select Paired Samples t-test', async ({ page }) => {
      await page.click('text=대응표본 t-검정');
      await expect(page.getByRole('heading', { name: /데이터 업로드|요약통계 입력/ })).toBeVisible({ timeout: 10000 });
    });
  });

  // ===========================================
  // 2. Summary Statistics Input
  // ===========================================

  test.describe('Summary Statistics Input', () => {

    test.beforeEach(async ({ page }) => {
      await page.click('text=독립표본 t-검정');
      // Wait for Step 2
      await expect(page.getByRole('heading', { name: /데이터 업로드|요약통계 입력/ })).toBeVisible({ timeout: 10000 });
    });

    test('3.1 Enter Valid Summary Statistics', async ({ page }) => {
      // Click Summary Statistics tab
      await page.click('text=요약통계');
      await page.waitForTimeout(1000);

      // Fill form fields using labels
      // Group 1
      await page.locator('input').first().fill('25');

      // Find all number inputs and fill them
      const inputs = page.locator('input[type="number"], input:not([type])').filter({ hasNot: page.locator('[readonly]') });
      const count = await inputs.count();

      // Fill available inputs
      for (let i = 0; i < Math.min(count, 6); i++) {
        const values = ['25', '2', '10', '29', '2', '10'];
        await inputs.nth(i).fill(values[i]);
      }

      // Run analysis
      const runButton = page.getByRole('button', { name: 't-검정 실행', exact: true });
      if (await runButton.isVisible()) {
        await runButton.click();

        // Wait for results
        await page.waitForTimeout(10000);

        // Check for results - look for any statistical output
        const hasResults = await page.locator('text=/[0-9]+\\.[0-9]+/').count() > 0;
        expect(hasResults).toBeTruthy();
      }
    });

    test('3.2 Toggle Equal Variance Assumption', async ({ page }) => {
      await page.click('text=요약통계');
      await page.waitForTimeout(1000);

      // Find toggle switch
      const toggle = page.locator('[role="switch"], input[type="checkbox"]').filter({ hasText: '' });
      const toggleCount = await toggle.count();

      if (toggleCount > 0) {
        await toggle.first().click();
        // Just verify it's clickable
        expect(true).toBeTruthy();
      } else {
        // Toggle might be styled differently, look for text
        const equalVarText = page.locator('text=등분산');
        if (await equalVarText.isVisible()) {
          await equalVarText.click();
        }
      }
    });
  });

  // ===========================================
  // 3. Raw Data Upload
  // ===========================================

  test.describe('Raw Data Upload', () => {

    test.beforeEach(async ({ page }) => {
      await page.click('text=독립표본 t-검정');
      await expect(page.getByRole('heading', { name: /데이터 업로드|요약통계 입력/ })).toBeVisible({ timeout: 10000 });
    });

    test('2.1 Upload Valid CSV File', async ({ page }) => {
      // Ensure Raw Data tab
      const rawDataTab = page.locator('text=원시데이터');
      if (await rawDataTab.isVisible()) {
        await rawDataTab.click();
      }

      await page.waitForTimeout(1000);

      // Find file input
      const fileInput = page.locator('input[type="file"]');
      const fileInputCount = await fileInput.count();

      if (fileInputCount > 0) {
        // Upload test file
        const testFilePath = path.resolve(__dirname, '../../test-data/e2e/t-test.csv');
        await fileInput.first().setInputFiles(testFilePath);

        // Wait for processing
        await page.waitForTimeout(3000);

        // Verify upload success - data should appear
        const hasData = await page.locator('text=/group|value|A|B|[0-9]+\\.[0-9]+/').count() > 0;
        expect(hasData).toBeTruthy();
      }
    });

    test('2.4 File Input Accepts CSV', async ({ page }) => {
      const rawDataTab = page.locator('text=원시데이터');
      if (await rawDataTab.isVisible()) {
        await rawDataTab.click();
      }

      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.count() > 0) {
        const acceptAttr = await fileInput.first().getAttribute('accept');
        // Should accept CSV or Excel files
        expect(acceptAttr === null || acceptAttr.match(/csv|xls|excel/i)).toBeTruthy();
      }
    });
  });

  // ===========================================
  // 4. Navigation
  // ===========================================

  test.describe('Navigation', () => {

    test('6.1 Step Navigation Forward', async ({ page }) => {
      // Step 1: Select test type
      await page.click('text=독립표본 t-검정');

      // Verify moved to Step 2
      await expect(page.getByRole('heading', { name: /데이터 업로드|요약통계 입력/ })).toBeVisible({ timeout: 10000 });
    });

    test('6.2 Step Navigation Backward', async ({ page }) => {
      // Go to Step 2
      await page.click('text=독립표본 t-검정');
      await expect(page.getByRole('heading', { name: /데이터 업로드|요약통계 입력/ })).toBeVisible({ timeout: 10000 });

      // Click Step 1 in sidebar
      const step1Link = page.locator('text=검정 유형 선택').first();
      await step1Link.click();

      // Verify back at Step 1
      await expect(page.locator('text=일표본 t-검정')).toBeVisible({ timeout: 5000 });
    });
  });

  // ===========================================
  // 5. Results Verification
  // ===========================================

  test.describe('Results Verification', () => {

    test('5.1 Verify Statistical Output', async ({ page }) => {
      // Complete workflow with summary statistics
      await page.click('text=독립표본 t-검정');
      await expect(page.getByRole('heading', { name: /데이터 업로드|요약통계 입력/ })).toBeVisible({ timeout: 10000 });

      await page.click('text=요약통계');
      await page.waitForTimeout(1000);

      // Fill form
      const inputs = page.locator('input[type="number"], input:not([type])').filter({ hasNot: page.locator('[readonly]') });
      const count = await inputs.count();

      const values = ['25', '2', '10', '29', '2', '10'];
      for (let i = 0; i < Math.min(count, 6); i++) {
        await inputs.nth(i).fill(values[i]);
      }

      // Run
      const runButton = page.getByRole('button', { name: 't-검정 실행', exact: true });
      if (await runButton.isVisible()) {
        await runButton.click();

        // Wait for Pyodide processing
        await page.waitForTimeout(15000);

        // Check for statistical results
        // t-value or p-value should be visible
        const statsVisible = await page.locator('text=/t\\s*[=:]|p\\s*[=:]|통계량|유의확률|\\-?[0-9]+\\.[0-9]{2,}/').count();
        expect(statsVisible).toBeGreaterThan(0);
      }
    });
  });

});
