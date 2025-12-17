
import { test, expect } from '@playwright/test';

interface StatTestConfig {
    name: string;
    url: string;
    type: 'one-way-anova' | 't-test';
    cardText: RegExp | string;
    filename: string;
    data: string;
    dependentVar: string;
    factorVar: string;
    dependentVarSectionTitle: string;
    factorVarSectionTitle: string;
    expectedResultText: string;
}

const TESTS: StatTestConfig[] = [
    {
        name: 'ANOVA',
        url: '/statistics/anova',
        type: 'one-way-anova',
        cardText: '일원 분산분석',
        filename: 'anova.csv',
        data: "group,value\nA,10.5\nA,12.3\nA,11.8\nB,20.1\nB,21.5\nB,19.9\nC,15.2\nC,16.8\nC,15.5",
        dependentVar: 'value',
        dependentVarSectionTitle: '종속변수',
        factorVar: 'group',
        factorVarSectionTitle: '요인',
        expectedResultText: '통계적으로 유의합니다'
    },
    {
        name: 'T-Test',
        url: '/statistics/t-test',
        type: 't-test',
        cardText: /독립표본.*t-검정/i,
        filename: 'ttest.csv',
        data: "group,value\nA,10.5\nA,12.3\nB,20.1\nB,21.5",
        dependentVar: 'value',
        dependentVarSectionTitle: '측정 변수',
        factorVar: 'group',
        factorVarSectionTitle: '집단 변수',
        expectedResultText: 'p-value'
    }
];

test.describe('Comprehensive Statistical Analysis Verification', () => {

    for (const config of TESTS) {
        test(`Verify ${config.name}`, async ({ page }) => {
            test.setTimeout(60000); // 1 minute per test

            await test.step('1. Navigate', async () => {
                console.log(`[${config.name}] Navigating to ${config.url}`);
                await page.goto(config.url);
                await expect(page.getByText(config.cardText).first()).toBeVisible({ timeout: 15000 });
            });

            await test.step('2. Select Method', async () => {
                console.log(`[${config.name}] Selecting method: ${config.cardText}`);
                const card = page.locator('.cursor-pointer', { has: page.getByText(config.cardText) }).first();
                await card.click();
            });

            await test.step('3. Upload Data', async () => {
                console.log(`[${config.name}] Uploading data`);
                await expect(page.getByText('데이터 업로드')).toBeVisible({ timeout: 10000 });

                // Explicitly wait for the input to be attached in the DOM
                const fileInput = page.locator('input[type="file"]');
                await fileInput.waitFor({ state: 'attached', timeout: 10000 });
                await expect(fileInput).toHaveCount(1);

                await fileInput.setInputFiles({
                    name: config.filename,
                    mimeType: 'text/csv',
                    buffer: Buffer.from(config.data)
                });

                // Increase timeout for processing/parsing
                console.log(`[${config.name}] Waiting for file processing...`);
                await expect(page.locator('body')).toContainText(config.filename, { timeout: 30000 });
            });

            await test.step('4. Select Variables', async () => {
                console.log(`[${config.name}] Selecting variables`);
                await expect(page.getByText('변수 선택')).toBeVisible({ timeout: 10000 });

                const selectVariable = async (sectionTitle: string, varName: string) => {
                    // Find the card/section containing the title
                    const section = page.locator('.rounded-xl.border', { has: page.getByText(sectionTitle) });
                    await expect(section).toBeVisible({ timeout: 5000 });
                    await section.getByText(varName, { exact: true }).click();
                };

                await selectVariable(config.dependentVarSectionTitle, config.dependentVar);
                await selectVariable(config.factorVarSectionTitle, config.factorVar);
            });

            await test.step('5. Run Analysis', async () => {
                console.log(`[${config.name}] Running analysis`);
                const runBtn = page.getByRole('button', { name: /(실행|분석)/ });
                await expect(runBtn).toBeEnabled();
                await runBtn.click();
            });

            await test.step('6. Verify Results', async () => {
                console.log(`[${config.name}] Verifying results`);
                await expect(page.getByText('결과 확인')).toBeVisible({ timeout: 60000 });
                await expect(page.getByText(config.expectedResultText)).toBeVisible();
            });

            console.log(`[${config.name}] PASSED`);
        });
    }
});
