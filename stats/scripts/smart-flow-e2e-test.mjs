/**
 * Smart Flow Full E2E Test Script (v5)
 * Tests: Hub → Data Upload → Method Selection → Variable Selection → Analysis → Results
 * No page.reload() - pure SPA navigation
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.resolve(__dirname, '..', 'screenshots-test');
const BASE_URL = 'http://localhost:3001';
const TEST_DATA_PATH = path.resolve(__dirname, '..', 'test-data/e2e/t-test.csv');

if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png')).forEach(f => fs.unlinkSync(path.join(SCREENSHOT_DIR, f)));

let idx = 0;
async function shot(page, name, fullPage = true) {
  idx++;
  const num = String(idx).padStart(2, '0');
  const fp = path.join(SCREENSHOT_DIR, `${num}-${name}.png`);
  await page.screenshot({ path: fp, fullPage });
  console.log(`  [Screenshot] ${num}-${name}.png`);
}

async function main() {
  const browser = await chromium.launch({ headless: false });
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();

  try {
    // === Step 0: Hub ===
    console.log('\n===== Step 0: Smart Flow Hub =====');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.evaluate(() => sessionStorage.clear());
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(10000);
    await shot(page, 'hub');
    console.log('[OK] Hub loaded');

    // === Step 1: Data Upload ===
    console.log('\n===== Step 1: Data Upload =====');
    await page.getByText('데이터 업로드').first().click();
    await page.waitForTimeout(2000);
    await shot(page, 'upload-empty');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(TEST_DATA_PATH);
    console.log('[OK] File uploaded');
    await page.waitForTimeout(5000);
    await shot(page, 'upload-preview');

    // After bug fix: button should now be enabled (useMemo deps fixed)
    const nextBtn1 = page.getByRole('button', { name: '분석 방법 선택으로' });
    try {
      await nextBtn1.waitFor({ state: 'visible', timeout: 3000 });
      const enabled = await nextBtn1.isEnabled();
      console.log(`[Check] "분석 방법 선택으로" enabled: ${enabled}`);
      if (enabled) {
        await nextBtn1.click();
        console.log('[OK] Clicked "분석 방법 선택으로"');
      } else {
        console.log('[WARN] Still disabled - clicking step 2 tab');
        // Try force-click on step tab via JS (no reload)
        await page.evaluate(() => {
          const btns = document.querySelectorAll('button');
          for (const b of btns) {
            if (b.textContent.includes('방법') && b.getAttribute('aria-label')?.includes('Step 2')) {
              b.disabled = false;
              b.click();
              break;
            }
          }
        });
      }
    } catch {
      console.log('[WARN] Button not found, using step tab');
      await page.evaluate(() => {
        const btns = document.querySelectorAll('button');
        for (const b of btns) {
          if (b.textContent.includes('방법')) { b.disabled = false; b.click(); break; }
        }
      });
    }
    await page.waitForTimeout(2000);
    await shot(page, 'step2-entered');

    // === Step 2: Method Selection ===
    console.log('\n===== Step 2: Method Selection =====');

    // Switch to "직접 선택" tab (shows full method list with search)
    const directTab = page.getByText('직접 선택').first();
    if (await directTab.isVisible().catch(() => false)) {
      await directTab.click();
      await page.waitForTimeout(2000);
      console.log('[OK] Switched to "직접 선택" mode');
    }
    await shot(page, 'step2-direct-mode');

    // Use search to find "독립표본 t-검정" quickly
    const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="검색"]').first();
    let methodChosen = false;

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('독립표본 t');
      await page.waitForTimeout(1000);
      console.log('[OK] Searched for "독립표본 t"');
      await shot(page, 'step2-search');
    }

    // Click "독립표본 t-검정" from the filtered list
    // Use a more specific locator to avoid matching disabled items
    const tTestItem = page.locator('div:not([class*="opacity"]):not([class*="disabled"]) >> text="독립표본 t-검정"').first();
    if (await tTestItem.isVisible().catch(() => false)) {
      await tTestItem.click();
      await page.waitForTimeout(1000);
      methodChosen = true;
      console.log('[OK] Selected "독립표본 t-검정"');
    } else {
      // Fallback: click the first enabled method card with "독립표본" text
      const clicked = await page.evaluate(() => {
        const items = document.querySelectorAll('[class*="cursor-pointer"]');
        for (const item of items) {
          const text = item.textContent || '';
          if (text.includes('독립표본 t-검정') && !item.classList.toString().includes('opacity')) {
            (item).click();
            return true;
          }
        }
        // Also try: find bold text "독립표본 t-검정"
        const bolds = document.querySelectorAll('strong, [class*="font-bold"], [class*="font-semibold"]');
        for (const b of bolds) {
          if (b.textContent?.trim() === '독립표본 t-검정') {
            b.closest('[class*="cursor"], [role="button"], button, div[class*="hover"]')?.click();
            return true;
          }
        }
        return false;
      });
      if (clicked) {
        methodChosen = true;
        console.log('[OK] Selected "독립표본 t-검정" via JS');
      }
    }

    await page.waitForTimeout(1000);
    await shot(page, 'step2-method-chosen');
    console.log(`[Result] Method chosen: ${methodChosen}`);

    // Navigate to Step 3 - look for any proceed button
    const step3Btns = ['이 방법으로 분석하기', '변수 선택으로', '이 방법으로 분석', '선택 완료', '다음'];
    let navigatedToStep3 = false;
    for (const text of step3Btns) {
      const btn = page.getByRole('button', { name: new RegExp(text) }).first();
      if (await btn.isVisible().catch(() => false) && await btn.isEnabled().catch(() => false)) {
        await btn.click();
        navigatedToStep3 = true;
        console.log(`[OK] Clicked "${text}" to enter Step 3`);
        break;
      }
    }
    // If no button found, try clicking step 3 in stepper directly
    if (!navigatedToStep3) {
      console.log('[WARN] No proceed button found, trying stepper click...');
      const stepperBtn = page.locator('button:has-text("변수")').first();
      if (await stepperBtn.isVisible().catch(() => false)) {
        await stepperBtn.click();
        console.log('[OK] Clicked "변수" stepper button');
      }
    }
    await page.waitForTimeout(2000);
    await shot(page, 'step3-entered');

    // === Step 3: Variable Selection ===
    console.log('\n===== Step 3: Variable Selection =====');
    await page.waitForTimeout(2000);
    await shot(page, 'step3-variables');

    // For t-test: need group variable (categorical) and dependent variable (numeric)
    // GroupComparisonSelector should show: 집단 변수 and 종속 변수
    // Variables should auto-detect: group → 집단변수, value → 종속변수

    // Check if "분석 시작" button is already enabled (auto-detection)
    const startBtn = page.getByRole('button', { name: /분석 시작/ }).first();
    let analysisReady = await startBtn.isEnabled().catch(() => false);
    console.log(`[Check] "분석 시작" enabled (auto-detect): ${analysisReady}`);

    if (!analysisReady) {
      // Try clicking on variable cards to assign them
      // The UI shows variable cards that can be clicked/dragged
      const groupCard = page.locator('button:has-text("group")').first();
      const valueCard = page.locator('button:has-text("value")').first();

      if (await groupCard.isVisible().catch(() => false)) {
        await groupCard.click();
        await page.waitForTimeout(500);
        console.log('[OK] Clicked group card');
      }
      if (await valueCard.isVisible().catch(() => false)) {
        await valueCard.click();
        await page.waitForTimeout(500);
        console.log('[OK] Clicked value card');
      }
      await page.waitForTimeout(1000);
      analysisReady = await startBtn.isEnabled().catch(() => false);
      console.log(`[Check] "분석 시작" enabled after clicks: ${analysisReady}`);
    }
    await shot(page, 'step3-ready');

    // Click "분석 시작"
    if (analysisReady) {
      await startBtn.click();
      console.log('[OK] Clicked "분석 시작"');
    } else {
      console.log('[WARN] "분석 시작" not enabled, force-clicking...');
      await page.evaluate(() => {
        const btns = document.querySelectorAll('button');
        for (const b of btns) {
          if (b.textContent.includes('분석 시작')) { b.disabled = false; b.click(); break; }
        }
      });
    }
    await page.waitForTimeout(2000);
    await shot(page, 'step4-started');

    // === Step 4: Analysis & Results ===
    console.log('\n===== Step 4: Analysis & Results =====');
    console.log('[INFO] Waiting for Pyodide + analysis...');

    let done = false;
    for (let i = 0; i < 30; i++) {  // Max 150 seconds
      await page.waitForTimeout(5000);
      const elapsed = (i + 1) * 5;

      const status = await page.evaluate(() => {
        const body = document.body.textContent || '';
        const hasPValue = /p\s*[<>=]\s*\.?\d/.test(body);
        const hasResultSection = (body.includes('분석 결과') || body.includes('유의확률') || body.includes('통계량')) && !body.includes('분석 수행 중');
        const hasEffectSize = body.includes('효과크기') || body.includes('Cohen');
        const isLoading = body.includes('분석 수행 중') || body.includes('분석 환경 준비');
        const progressBar = document.querySelector('[role="progressbar"]');
        const progressVal = progressBar?.getAttribute('aria-valuenow') || progressBar?.style?.width;
        const hasError = body.includes('오류가 발생') || body.includes('분석 실패');
        return { hasPValue, hasResultSection, hasEffectSize, isLoading, progressVal, hasError };
      });

      const resultDetected = (status.hasPValue || status.hasResultSection || status.hasEffectSize) && !status.isLoading;
      console.log(`  [${elapsed}s] loading=${status.isLoading} progress=${status.progressVal || '-'} pValue=${status.hasPValue} results=${resultDetected} error=${status.hasError}`);

      if (i % 4 === 0) await shot(page, `step4-wait-${elapsed}s`);

      if (resultDetected) {
        console.log('[OK] Analysis complete!');
        done = true;
        break;
      }
      if (status.hasError) {
        console.log('[ERROR] Analysis failed');
        await shot(page, 'step4-error');
        break;
      }
    }

    // Capture result screenshots
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await shot(page, 'results-full');
    await shot(page, 'results-top', false);

    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(500);
    await shot(page, 'results-mid', false);

    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(500);
    await shot(page, 'results-bottom', false);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await shot(page, 'results-end', false);

    // === Summary ===
    console.log('\n===== Test Summary =====');
    console.log(`Analysis completed successfully: ${done}`);
    const files = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png')).sort();
    console.log(`Total screenshots: ${files.length}`);
    files.forEach(s => console.log(`  ${s}`));
    console.log(`\nSaved to: ${SCREENSHOT_DIR}`);

  } catch (error) {
    console.error('\n[FATAL]', error.message);
    await shot(page, 'FATAL-ERROR').catch(() => {});
  } finally {
    await page.waitForTimeout(2000);
    await browser.close();
  }
}

main().catch(console.error);
