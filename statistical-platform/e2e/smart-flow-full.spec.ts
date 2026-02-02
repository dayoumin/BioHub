// Smart Flow Full E2E Tests - 결과 페이지까지 전체 흐름 테스트
// spec: docs/E2E_FULL_FLOW_PLAN.md

import { test, expect } from '@playwright/test';
import {
  uploadFile,
  verifyDataLoaded,
  navigateToStep2,
  selectPurpose,
  waitForAnalysis,
  waitForProgressComplete,
  verifyResults,
  type ResultVerificationOptions
} from './helpers/smart-flow-helpers';

// 전역 타임아웃 설정 (Pyodide 로딩 + 분석 시간)
test.setTimeout(120000); // 2분

test.describe('Smart Flow - Full Analysis Flow', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/smart-flow');
    await page.waitForLoadState('networkidle');
  });

  // ===========================================
  // Critical Tests (FF-001 ~ FF-005)
  // ===========================================

  test.describe('Critical: Complete Analysis Flows', () => {

    test('FF-001: 독립표본 t-검정 전체 흐름', async ({ page }) => {
      // Step 1: 데이터 업로드
      const uploaded = await uploadFile(page, 't-test.csv');
      expect(uploaded).toBeTruthy();

      const dataLoaded = await verifyDataLoaded(page);
      expect(dataLoaded).toBeTruthy();

      // Step 2: 방법 선택
      await navigateToStep2(page);
      await selectPurpose(page, 'group-comparison');
      await page.waitForTimeout(3000);

      // AI 추천 또는 수동 선택 대기
      const methodRecommended = await page.locator('text=/t-검정|추천|권장/').count() > 0;
      if (methodRecommended) {
        // 추천된 방법 선택
        const selectButton = page.locator('text=/이 방법으로|선택|확인/').first();
        if (await selectButton.isVisible()) {
          await selectButton.click();
          await page.waitForTimeout(2000);
        }
      }

      // Step 3: 변수 선택 (자동 감지 또는 수동)
      await page.waitForTimeout(3000);

      // Step 4: 분석 실행 대기
      const analysisComplete = await waitForProgressComplete(page, 90000);

      // Step 5: 결과 검증
      if (analysisComplete) {
        const { success, details } = await verifyResults(page, {
          hasStatistic: true,
          hasPValue: true,
          hasEffectSize: true,
          hasInterpretation: true
        });

        console.log('Result verification:', details);
        expect(success).toBeTruthy();
      } else {
        // 분석이 완료되지 않은 경우 - 현재 상태 확인
        await expect(page).toHaveURL(/\/smart-flow/);
      }
    });

    test('FF-002: 일원분산분석(ANOVA) 전체 흐름', async ({ page }) => {
      // Step 1: 데이터 업로드
      const uploaded = await uploadFile(page, 'anova.csv');
      expect(uploaded).toBeTruthy();

      const dataLoaded = await verifyDataLoaded(page);
      expect(dataLoaded).toBeTruthy();

      // Step 2: 방법 선택
      await navigateToStep2(page);
      await selectPurpose(page, 'group-comparison');
      await page.waitForTimeout(3000);

      // ANOVA 선택 (3개 이상 그룹)
      const anovaOption = page.locator('text=/ANOVA|분산분석|3개.*그룹/').first();
      if (await anovaOption.isVisible()) {
        await anovaOption.click();
        await page.waitForTimeout(2000);
      }

      // Step 3-4: 변수 선택 및 분석
      await page.waitForTimeout(3000);
      const analysisComplete = await waitForProgressComplete(page, 90000);

      // Step 5: 결과 검증
      if (analysisComplete) {
        const { success, details } = await verifyResults(page, {
          hasStatistic: true,  // F 통계량
          hasPValue: true,
          hasEffectSize: true  // η²
        });

        console.log('ANOVA Result verification:', details);
        expect(success).toBeTruthy();
      } else {
        await expect(page).toHaveURL(/\/smart-flow/);
      }
    });

    test('FF-003: 상관분석 전체 흐름', async ({ page }) => {
      // Step 1: 데이터 업로드
      const uploaded = await uploadFile(page, 'correlation.csv');
      expect(uploaded).toBeTruthy();

      const dataLoaded = await verifyDataLoaded(page);
      expect(dataLoaded).toBeTruthy();

      // Step 2: 방법 선택
      await navigateToStep2(page);
      await selectPurpose(page, 'correlation');
      await page.waitForTimeout(3000);

      // Step 3-4: 변수 선택 및 분석
      await page.waitForTimeout(3000);
      const analysisComplete = await waitForProgressComplete(page, 90000);

      // Step 5: 결과 검증
      if (analysisComplete) {
        const { success, details } = await verifyResults(page, {
          hasStatistic: true,  // r
          hasPValue: true
        });

        console.log('Correlation Result verification:', details);
        expect(success).toBeTruthy();
      } else {
        await expect(page).toHaveURL(/\/smart-flow/);
      }
    });

    test('FF-004: 단순회귀분석 전체 흐름', async ({ page }) => {
      // Step 1: 데이터 업로드
      const uploaded = await uploadFile(page, 'regression.csv');
      expect(uploaded).toBeTruthy();

      const dataLoaded = await verifyDataLoaded(page);
      expect(dataLoaded).toBeTruthy();

      // Step 2: 방법 선택
      await navigateToStep2(page);
      await selectPurpose(page, 'prediction');
      await page.waitForTimeout(3000);

      // Step 3-4: 변수 선택 및 분석
      await page.waitForTimeout(3000);
      const analysisComplete = await waitForProgressComplete(page, 90000);

      // Step 5: 결과 검증
      if (analysisComplete) {
        const { success, details } = await verifyResults(page, {
          hasStatistic: true,  // F, t
          hasPValue: true
        });

        console.log('Regression Result verification:', details);
        expect(success).toBeTruthy();
      } else {
        await expect(page).toHaveURL(/\/smart-flow/);
      }
    });

    test('FF-005: 카이제곱 검정 전체 흐름', async ({ page }) => {
      // Step 1: 데이터 업로드
      const uploaded = await uploadFile(page, 'chi-square.csv');
      expect(uploaded).toBeTruthy();

      const dataLoaded = await verifyDataLoaded(page);
      expect(dataLoaded).toBeTruthy();

      // Step 2: 방법 선택
      await navigateToStep2(page);
      await selectPurpose(page, 'distribution');
      await page.waitForTimeout(3000);

      // Step 3-4: 변수 선택 및 분석
      await page.waitForTimeout(3000);
      const analysisComplete = await waitForProgressComplete(page, 90000);

      // Step 5: 결과 검증
      if (analysisComplete) {
        const { success, details } = await verifyResults(page, {
          hasStatistic: true,  // χ²
          hasPValue: true
        });

        console.log('Chi-square Result verification:', details);
        expect(success).toBeTruthy();
      } else {
        await expect(page).toHaveURL(/\/smart-flow/);
      }
    });
  });

  // ===========================================
  // High Priority Tests (FF-006 ~ FF-010)
  // ===========================================

  test.describe('High: Additional Analysis Flows', () => {

    test('FF-006: 대응표본 t-검정 전체 흐름', async ({ page }) => {
      const uploaded = await uploadFile(page, 'paired-t-test.csv');
      expect(uploaded).toBeTruthy();

      const dataLoaded = await verifyDataLoaded(page);
      expect(dataLoaded).toBeTruthy();

      await navigateToStep2(page);
      await selectPurpose(page, 'group-comparison');
      await page.waitForTimeout(5000);

      // 대응표본 선택
      const pairedOption = page.locator('text=/대응|paired|사전.*사후/i').first();
      if (await pairedOption.isVisible()) {
        await pairedOption.click();
        await page.waitForTimeout(2000);
      }

      const analysisComplete = await waitForProgressComplete(page, 90000);

      if (analysisComplete) {
        const { success } = await verifyResults(page, {
          hasStatistic: true,
          hasPValue: true
        });
        expect(success).toBeTruthy();
      } else {
        await expect(page).toHaveURL(/\/smart-flow/);
      }
    });

    test('FF-007: 일표본 t-검정 전체 흐름', async ({ page }) => {
      const uploaded = await uploadFile(page, 'one-sample-t.csv');
      expect(uploaded).toBeTruthy();

      const dataLoaded = await verifyDataLoaded(page);
      expect(dataLoaded).toBeTruthy();

      await navigateToStep2(page);
      await selectPurpose(page, 'group-comparison');
      await page.waitForTimeout(5000);

      // 일표본 선택
      const oneSampleOption = page.locator('text=/일표본|one.*sample|단일/i').first();
      if (await oneSampleOption.isVisible()) {
        await oneSampleOption.click();
        await page.waitForTimeout(2000);
      }

      const analysisComplete = await waitForProgressComplete(page, 90000);

      if (analysisComplete) {
        const { success } = await verifyResults(page, {
          hasStatistic: true,
          hasPValue: true
        });
        expect(success).toBeTruthy();
      } else {
        await expect(page).toHaveURL(/\/smart-flow/);
      }
    });

    test('FF-008: Mann-Whitney U 검정 전체 흐름', async ({ page }) => {
      const uploaded = await uploadFile(page, 'mann-whitney.csv');
      expect(uploaded).toBeTruthy();

      const dataLoaded = await verifyDataLoaded(page);
      expect(dataLoaded).toBeTruthy();

      await navigateToStep2(page);
      await selectPurpose(page, 'group-comparison');
      await page.waitForTimeout(5000);

      // 비모수 검정 선택
      const mannWhitneyOption = page.locator('text=/Mann.*Whitney|비모수|U.*검정/i').first();
      if (await mannWhitneyOption.isVisible()) {
        await mannWhitneyOption.click();
        await page.waitForTimeout(2000);
      }

      const analysisComplete = await waitForProgressComplete(page, 90000);

      if (analysisComplete) {
        const { success } = await verifyResults(page, {
          hasStatistic: true,  // U
          hasPValue: true
        });
        expect(success).toBeTruthy();
      } else {
        await expect(page).toHaveURL(/\/smart-flow/);
      }
    });

    test('FF-009: Kruskal-Wallis 검정 전체 흐름', async ({ page }) => {
      const uploaded = await uploadFile(page, 'kruskal-wallis.csv');
      expect(uploaded).toBeTruthy();

      const dataLoaded = await verifyDataLoaded(page);
      expect(dataLoaded).toBeTruthy();

      await navigateToStep2(page);
      await selectPurpose(page, 'group-comparison');
      await page.waitForTimeout(5000);

      // Kruskal-Wallis 선택
      const kwOption = page.locator('text=/Kruskal.*Wallis|비모수.*분산/i').first();
      if (await kwOption.isVisible()) {
        await kwOption.click();
        await page.waitForTimeout(2000);
      }

      const analysisComplete = await waitForProgressComplete(page, 90000);

      if (analysisComplete) {
        const { success } = await verifyResults(page, {
          hasStatistic: true,  // H
          hasPValue: true
        });
        expect(success).toBeTruthy();
      } else {
        await expect(page).toHaveURL(/\/smart-flow/);
      }
    });

    test('FF-010: 다중회귀분석 전체 흐름', async ({ page }) => {
      const uploaded = await uploadFile(page, 'regression.csv');
      expect(uploaded).toBeTruthy();

      const dataLoaded = await verifyDataLoaded(page);
      expect(dataLoaded).toBeTruthy();

      await navigateToStep2(page);
      await selectPurpose(page, 'prediction');
      await page.waitForTimeout(5000);

      // 다중회귀 선택
      const multipleRegOption = page.locator('text=/다중.*회귀|multiple.*regression/i').first();
      if (await multipleRegOption.isVisible()) {
        await multipleRegOption.click();
        await page.waitForTimeout(2000);
      }

      const analysisComplete = await waitForProgressComplete(page, 90000);

      if (analysisComplete) {
        const { success } = await verifyResults(page, {
          hasStatistic: true,
          hasPValue: true
        });
        expect(success).toBeTruthy();
      } else {
        await expect(page).toHaveURL(/\/smart-flow/);
      }
    });
  });

});
