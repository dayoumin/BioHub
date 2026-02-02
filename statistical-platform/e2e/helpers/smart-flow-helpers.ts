import { Page, expect } from '@playwright/test';
import path from 'path';

/**
 * Smart Flow E2E Test Helpers
 * 전체 분석 흐름 테스트를 위한 헬퍼 함수
 */

// ===========================================
// Step 1: 데이터 업로드 헬퍼
// ===========================================

export async function uploadFile(page: Page, filename: string): Promise<boolean> {
  const fileInput = page.locator('input[type="file"]');

  if (await fileInput.count() === 0) {
    console.log('File input not found');
    return false;
  }

  const filePath = path.resolve(__dirname, `../../test-data/e2e/${filename}`);
  await fileInput.first().setInputFiles(filePath);
  await page.waitForTimeout(5000);

  return true;
}

export async function verifyDataLoaded(page: Page): Promise<boolean> {
  const indicators = [
    'text=/데이터 미리보기/',
    'text=/표본/',
    'text=/행/',
    'text=/검토 완료/',
    'text=/다음 단계로/'
  ];

  for (const indicator of indicators) {
    const count = await page.locator(indicator).count();
    if (count > 0) {
      return true;
    }
  }

  return false;
}

// ===========================================
// Step 2: 방법 선택 헬퍼
// ===========================================

export async function navigateToStep2(page: Page): Promise<boolean> {
  const nextButton = page.getByRole('button', { name: /다음 단계로|다음|Next|진행/ });

  if (await nextButton.count() > 0) {
    await nextButton.first().click();
    await page.waitForTimeout(3000);
    return true;
  }

  return false;
}

export async function selectPurpose(page: Page, purpose: 'group-comparison' | 'correlation' | 'distribution' | 'prediction'): Promise<boolean> {
  const purposeMap: Record<string, string> = {
    'group-comparison': '그룹.*비교|집단.*차이|차이',
    'correlation': '관계|상관',
    'distribution': '분포|빈도',
    'prediction': '예측|모델링|회귀'
  };

  const pattern = purposeMap[purpose];
  const purposeCard = page.locator(`text=/${pattern}/`).first();

  if (await purposeCard.isVisible()) {
    await purposeCard.click();
    await page.waitForTimeout(3000);
    return true;
  }

  return false;
}

export async function selectMethod(page: Page, methodName: string): Promise<boolean> {
  // 방법 브라우저에서 특정 방법 선택
  const methodCard = page.locator(`text=/${methodName}/`).first();

  if (await methodCard.isVisible()) {
    await methodCard.click();
    await page.waitForTimeout(2000);
    return true;
  }

  return false;
}

// ===========================================
// Step 3: 변수 선택 헬퍼
// ===========================================

export async function selectVariable(page: Page, role: 'group' | 'dependent' | 'independent', variableName: string): Promise<boolean> {
  // 변수 선택 드롭다운 또는 목록에서 선택
  const roleMap: Record<string, string[]> = {
    'group': ['그룹 변수', '집단 변수', 'Group'],
    'dependent': ['종속 변수', '측정 변수', 'Dependent'],
    'independent': ['독립 변수', '예측 변수', 'Independent']
  };

  const labels = roleMap[role];

  for (const label of labels) {
    const selector = page.locator(`text=/${label}/`).first();
    if (await selector.isVisible()) {
      // 근처의 select나 dropdown 찾기
      const dropdown = selector.locator('..').locator('select, [role="combobox"]');
      if (await dropdown.count() > 0) {
        await dropdown.click();
        await page.waitForTimeout(500);

        const option = page.locator(`text=${variableName}`).first();
        if (await option.isVisible()) {
          await option.click();
          return true;
        }
      }
    }
  }

  return false;
}

export async function clickRunAnalysis(page: Page): Promise<boolean> {
  const runButtons = [
    '분석 실행',
    '실행',
    'Run Analysis',
    '분석 시작'
  ];

  for (const buttonText of runButtons) {
    const button = page.getByRole('button', { name: new RegExp(buttonText, 'i') });
    if (await button.count() > 0 && await button.first().isEnabled()) {
      await button.first().click();
      return true;
    }
  }

  return false;
}

// ===========================================
// Step 4: 분석 실행 대기 헬퍼
// ===========================================

export async function waitForPyodide(page: Page, timeout = 30000): Promise<boolean> {
  try {
    // Pyodide 로딩 완료 대기
    await page.waitForFunction(() => {
      // @ts-ignore
      return window.__PYODIDE_READY__ === true || document.querySelector('[data-pyodide-ready="true"]');
    }, { timeout });
    return true;
  } catch {
    // Pyodide 상태를 직접 확인할 수 없는 경우, 시간 기반 대기
    await page.waitForTimeout(10000);
    return true;
  }
}

export async function waitForAnalysis(page: Page, timeout = 60000): Promise<boolean> {
  const completionIndicators = [
    'text=/분석 완료/',
    'text=/분석이 완료/',
    'text=/결과/',
    'text=/Results/',
    '[data-testid="analysis-results"]',
    '[data-testid="results-container"]'
  ];

  try {
    await page.waitForSelector(completionIndicators.join(', '), { timeout });
    return true;
  } catch {
    return false;
  }
}

export async function waitForProgressComplete(page: Page, timeout = 90000): Promise<boolean> {
  try {
    // 진행 바가 100%가 되거나 결과가 표시될 때까지 대기
    await page.waitForFunction(() => {
      const progressBar = document.querySelector('[role="progressbar"]');
      if (progressBar) {
        const value = progressBar.getAttribute('aria-valuenow');
        if (value && parseInt(value) >= 100) return true;
      }

      // 또는 결과 컨테이너가 나타남
      const results = document.querySelector('[data-testid*="result"], .results, .analysis-results');
      return !!results;
    }, { timeout });

    return true;
  } catch {
    return false;
  }
}

// ===========================================
// Step 5: 결과 검증 헬퍼
// ===========================================

export interface ResultVerificationOptions {
  hasStatistic?: boolean;        // 통계량 (t, F, χ², U 등)
  hasPValue?: boolean;           // p-value
  hasEffectSize?: boolean;       // 효과 크기
  hasInterpretation?: boolean;   // 해석 텍스트
  hasConfidenceInterval?: boolean; // 신뢰구간
  hasDegreesOfFreedom?: boolean;  // 자유도
}

export async function verifyResults(page: Page, options: ResultVerificationOptions): Promise<{ success: boolean; details: Record<string, boolean> }> {
  const details: Record<string, boolean> = {};

  if (options.hasStatistic) {
    // t, F, χ², U, H, Z 등의 통계량
    const statisticPattern = /t\s*=|F\s*=|χ²\s*=|U\s*=|H\s*=|Z\s*=|통계량/;
    details.statistic = await page.locator(`text=/${statisticPattern.source}/`).count() > 0;
  }

  if (options.hasPValue) {
    // p-value 표시
    const pValuePattern = /p\s*[=<]|유의확률|p-value/i;
    details.pValue = await page.locator(`text=/${pValuePattern.source}/`).count() > 0;
  }

  if (options.hasEffectSize) {
    // 효과 크기 (Cohen's d, η², r, φ, ω² 등)
    const effectSizePattern = /Cohen|η²|d\s*=|r\s*=|φ|ω²|효과\s*크기/i;
    details.effectSize = await page.locator(`text=/${effectSizePattern.source}/`).count() > 0;
  }

  if (options.hasInterpretation) {
    // 해석 텍스트
    const interpretationPattern = /유의한|기각|채택|차이가|관계가|상관이/;
    details.interpretation = await page.locator(`text=/${interpretationPattern.source}/`).count() > 0;
  }

  if (options.hasConfidenceInterval) {
    // 신뢰구간
    const ciPattern = /신뢰구간|CI|95%|confidence/i;
    details.confidenceInterval = await page.locator(`text=/${ciPattern.source}/`).count() > 0;
  }

  if (options.hasDegreesOfFreedom) {
    // 자유도
    const dfPattern = /자유도|df|degrees of freedom/i;
    details.degreesOfFreedom = await page.locator(`text=/${dfPattern.source}/`).count() > 0;
  }

  const success = Object.values(details).every(v => v);
  return { success, details };
}

// ===========================================
// 유틸리티 함수
// ===========================================

export async function takeScreenshotOnFailure(page: Page, testName: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `e2e/results/screenshots/${testName}-${timestamp}.png`;
  await page.screenshot({ path: filename, fullPage: true });
  return filename;
}

export async function logAnalysisProgress(page: Page): Promise<string[]> {
  const logs: string[] = [];

  // 진행 로그 수집
  const logElements = page.locator('[data-testid="analysis-log"] div, .analysis-log div');
  const count = await logElements.count();

  for (let i = 0; i < count; i++) {
    const text = await logElements.nth(i).textContent();
    if (text) logs.push(text);
  }

  return logs;
}
