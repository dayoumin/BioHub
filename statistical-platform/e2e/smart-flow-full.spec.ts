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
  waitForPyodide,
  verifyResults,
  runFullAnalysisFlow,
  type ResultVerificationOptions
} from './helpers/smart-flow-helpers';

// 전역 타임아웃 설정 (Pyodide 로딩 + 분석 시간)
test.setTimeout(120000); // 2분

test.describe('Smart Flow - Full Analysis Flow', () => {

  test.beforeEach(async ({ page }) => {
    // Smart Flow Hub는 이제 루트(/)에 있음 (/smart-flow는 / 로 리다이렉트)
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Pyodide 초기화 대기 (첫 방문 시 10-15초 소요)
    console.log('[beforeEach] Pyodide 초기화 대기 중...');
    const pyodideReady = await waitForPyodide(page, 30000);
    if (!pyodideReady) {
      console.warn('[beforeEach] Pyodide 초기화 타임아웃, 테스트 계속 진행');
    } else {
      console.log('[beforeEach] Pyodide 초기화 완료');
    }
  });

  // ===========================================
  // Critical Tests (FF-001 ~ FF-005)
  // ===========================================

  test.describe('Critical: Complete Analysis Flows', () => {

    test('FF-001: 독립표본 t-검정 전체 흐름', async ({ page }) => {
      // 전체 분석 흐름 실행
      const completed = await runFullAnalysisFlow(page, 't-test.csv', 'group-comparison', {
        methodPattern: 't-검정|t.*test'
      });

      expect(completed).toBeTruthy();

      // 결과 검증
      if (completed) {
        const { success, details } = await verifyResults(page, {
          hasStatistic: true,
          hasPValue: true,
          hasEffectSize: true,
          hasInterpretation: true
        });

        console.log('Result verification:', details);
        expect(success).toBeTruthy();
      }
    });

    test('FF-002: 일원분산분석(ANOVA) 전체 흐름', async ({ page }) => {
      const completed = await runFullAnalysisFlow(page, 'anova.csv', 'group-comparison', {
        methodPattern: 'ANOVA|분산분석'
      });

      expect(completed).toBeTruthy();

      if (completed) {
        const { success, details } = await verifyResults(page, {
          hasStatistic: true,  // F 통계량
          hasPValue: true,
          hasEffectSize: true  // η²
        });

        console.log('ANOVA Result verification:', details);
        expect(success).toBeTruthy();
      }
    });

    test('FF-003: 상관분석 전체 흐름', async ({ page }) => {
      const completed = await runFullAnalysisFlow(page, 'correlation.csv', 'correlation', {
        methodPattern: '상관|correlation'
      });

      expect(completed).toBeTruthy();

      if (completed) {
        const { success, details } = await verifyResults(page, {
          hasStatistic: true,  // r
          hasPValue: true
        });

        console.log('Correlation Result verification:', details);
        expect(success).toBeTruthy();
      }
    });

    test('FF-004: 단순회귀분석 전체 흐름', async ({ page }) => {
      const completed = await runFullAnalysisFlow(page, 'regression.csv', 'prediction', {
        methodPattern: '회귀|regression'
      });

      expect(completed).toBeTruthy();

      if (completed) {
        const { success, details } = await verifyResults(page, {
          hasStatistic: true,  // F, t
          hasPValue: true
        });

        console.log('Regression Result verification:', details);
        expect(success).toBeTruthy();
      }
    });

    test('FF-005: 카이제곱 검정 전체 흐름', async ({ page }) => {
      const completed = await runFullAnalysisFlow(page, 'chi-square.csv', 'distribution', {
        methodPattern: '카이제곱|chi.*square'
      });

      expect(completed).toBeTruthy();

      if (completed) {
        const { success, details } = await verifyResults(page, {
          hasStatistic: true,  // χ²
          hasPValue: true
        });

        console.log('Chi-square Result verification:', details);
        expect(success).toBeTruthy();
      }
    });
  });

  // ===========================================
  // High Priority Tests (FF-006 ~ FF-010)
  // ===========================================

  test.describe('High: Additional Analysis Flows', () => {

    test('FF-006: 대응표본 t-검정 전체 흐름', async ({ page }) => {
      const completed = await runFullAnalysisFlow(page, 'paired-t-test.csv', 'group-comparison', {
        methodPattern: '대응|paired'
      });

      expect(completed).toBeTruthy();

      if (completed) {
        const { success, details } = await verifyResults(page, {
          hasStatistic: true,
          hasPValue: true
        });
        console.log('Paired t-test Result verification:', details);
        expect(success).toBeTruthy();
      }
    });

    test('FF-007: 일표본 t-검정 전체 흐름', async ({ page }) => {
      const completed = await runFullAnalysisFlow(page, 'one-sample-t.csv', 'group-comparison', {
        methodPattern: '일표본|one.*sample'
      });

      expect(completed).toBeTruthy();

      if (completed) {
        const { success, details } = await verifyResults(page, {
          hasStatistic: true,
          hasPValue: true
        });
        console.log('One-sample t-test Result verification:', details);
        expect(success).toBeTruthy();
      }
    });

    test('FF-008: Mann-Whitney U 검정 전체 흐름', async ({ page }) => {
      const completed = await runFullAnalysisFlow(page, 'mann-whitney.csv', 'group-comparison', {
        methodPattern: 'Mann.*Whitney|비모수'
      });

      expect(completed).toBeTruthy();

      if (completed) {
        const { success, details } = await verifyResults(page, {
          hasStatistic: true,  // U
          hasPValue: true
        });
        console.log('Mann-Whitney Result verification:', details);
        expect(success).toBeTruthy();
      }
    });

    test('FF-009: Kruskal-Wallis 검정 전체 흐름', async ({ page }) => {
      const completed = await runFullAnalysisFlow(page, 'kruskal-wallis.csv', 'group-comparison', {
        methodPattern: 'Kruskal.*Wallis|비모수.*분산'
      });

      expect(completed).toBeTruthy();

      if (completed) {
        const { success, details } = await verifyResults(page, {
          hasStatistic: true,  // H
          hasPValue: true
        });
        console.log('Kruskal-Wallis Result verification:', details);
        expect(success).toBeTruthy();
      }
    });

    test('FF-010: 다중회귀분석 전체 흐름', async ({ page }) => {
      const completed = await runFullAnalysisFlow(page, 'regression.csv', 'prediction', {
        methodPattern: '다중.*회귀|multiple.*regression'
      });

      expect(completed).toBeTruthy();

      if (completed) {
        const { success, details } = await verifyResults(page, {
          hasStatistic: true,
          hasPValue: true
        });
        console.log('Multiple regression Result verification:', details);
        expect(success).toBeTruthy();
      }
    });
  });

});
