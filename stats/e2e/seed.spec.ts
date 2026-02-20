import { test, expect } from '@playwright/test';

/**
 * Seed Test for Statistical Platform
 *
 * 이 테스트는 Playwright Test Agents (Planner/Generator)가
 * 앱 구조를 이해하는 데 사용됩니다.
 *
 * 앱 구조:
 * - 메인 페이지: / (대시보드)
 * - 통계 페이지: /statistics/{method-name}
 * - 48개 통계 메서드 지원
 *
 * 통계 페이지 공통 플로우:
 * 1. 페이지 접속
 * 2. 데이터 업로드 (CSV) 또는 샘플 데이터 로드
 * 3. 변수 선택
 * 4. 분석 실행
 * 5. 결과 확인
 */

test.describe('Statistical Platform - Seed Tests', () => {

  test.beforeEach(async ({ page }) => {
    // 앱 기본 URL로 이동
    await page.goto('/');
  });

  test('메인 페이지 로드 확인', async ({ page }) => {
    // 메인 페이지가 정상 로드되는지 확인
    await expect(page).toHaveURL('/');

    // 네비게이션 또는 주요 UI 요소 확인
    await expect(page.locator('body')).toBeVisible();
  });

  test('통계 페이지 접속 - t-test', async ({ page }) => {
    // t-test 페이지로 이동
    await page.goto('/statistics/t-test');

    // 페이지 로드 확인
    await expect(page).toHaveURL('/statistics/t-test');

    // Pyodide 로딩 대기 (최대 30초)
    // 통계 계산은 Pyodide(Python in Browser)를 사용하므로 초기 로딩 시간 필요
    await page.waitForTimeout(3000);
  });

  test('통계 페이지 기본 플로우 - 샘플 데이터', async ({ page }) => {
    // ANOVA 페이지로 이동
    await page.goto('/statistics/anova');

    // 페이지 로드 대기
    await page.waitForLoadState('networkidle');

    // 샘플 데이터 버튼이 있으면 클릭
    const sampleDataButton = page.getByRole('button', { name: /샘플|sample/i });
    if (await sampleDataButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sampleDataButton.click();
    }

    // 분석 실행 버튼 확인
    const analyzeButton = page.getByRole('button', { name: /분석|analyze|실행|run/i });
    await expect(analyzeButton).toBeVisible({ timeout: 10000 });
  });

  test('파일 업로드 영역 확인', async ({ page }) => {
    await page.goto('/statistics/correlation');

    // 파일 업로드 입력 또는 드롭존 확인
    const fileInput = page.locator('input[type="file"]');
    const dropZone = page.locator('[data-testid="dropzone"], .dropzone, [class*="upload"]');

    // 둘 중 하나는 존재해야 함
    const hasFileInput = await fileInput.count() > 0;
    const hasDropZone = await dropZone.count() > 0;

    expect(hasFileInput || hasDropZone).toBeTruthy();
  });

});

/**
 * 통계 메서드 목록 (48개)
 *
 * 기본 검정:
 * - t-test, one-sample-t, welch-t
 * - anova, repeated-measures-anova
 * - correlation, partial-correlation
 * - regression, stepwise
 * - chi-square, chi-square-goodness, chi-square-independence
 *
 * 비모수 검정:
 * - mann-whitney, wilcoxon, kruskal-wallis
 * - friedman, sign-test, runs-test
 * - mcnemar, cochran-q, mood-median
 *
 * 고급 분석:
 * - pca, factor-analysis, cluster, discriminant
 * - manova, ancova, mixed-model
 * - cox-regression, kaplan-meier
 * - arima, seasonal-decompose, stationarity-test
 *
 * 기타:
 * - descriptive, normality-test, power-analysis
 * - reliability, proportion-test, binomial-test
 */
