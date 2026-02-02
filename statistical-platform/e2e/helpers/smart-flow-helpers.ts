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
  try {
    // "다음 단계로" 또는 "검토 완료" 버튼 찾기
    const nextButton = page.getByRole('button', { name: /다음 단계로|다음|Next|진행|검토 완료/ });

    // 버튼이 활성화될 때까지 대기
    await nextButton.first().waitFor({ state: 'visible', timeout: 10000 });

    // 버튼이 활성화되었는지 확인
    const isEnabled = await nextButton.first().isEnabled();
    if (!isEnabled) {
      console.log('[navigateToStep2] 버튼이 비활성화 상태입니다');
      return false;
    }

    await nextButton.first().click();
    console.log('[navigateToStep2] Step 2로 이동 완료');

    // Step 2가 로드될 때까지 대기
    await page.waitForTimeout(2000);
    return true;
  } catch (error) {
    console.error('[navigateToStep2] 에러:', error);
    return false;
  }
}

export async function selectPurpose(page: Page, purpose: 'group-comparison' | 'correlation' | 'distribution' | 'prediction'): Promise<boolean> {
  // NEW: Check if AI Chat interface is showing first (2025 UI/UX)
  // If so, click "단계별 가이드" to go to traditional category selection
  const guidedButton = page.locator('text=/단계별 가이드/').first();
  const aiChatInput = page.locator('text=/어떤 분석이 필요하세요/').first();

  if (await aiChatInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('[selectPurpose] AI Chat 화면 감지, 단계별 가이드로 이동');
    if (await guidedButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await guidedButton.click();
      await page.waitForTimeout(2000);
    }
  }

  // Category mapping (대분류)
  const categoryMap: Record<string, string> = {
    'group-comparison': '그룹.*비교|집단.*비교|비교',
    'correlation': '관계.*분석|상관',
    'distribution': '분포.*분석|빈도',
    'prediction': '예측.*모델|회귀'
  };

  // Subcategory/Purpose mapping (중분류 또는 기존 목적)
  const purposeMap: Record<string, string> = {
    'group-comparison': '그룹.*비교|집단.*차이|차이|두.*그룹|세.*그룹',
    'correlation': '관계|상관',
    'distribution': '분포|빈도',
    'prediction': '예측|모델링|회귀'
  };

  // Try to find category card first (new 2025 UI/UX)
  const categoryPattern = categoryMap[purpose];
  const categoryCard = page.locator(`text=/${categoryPattern}/`).first();

  if (await categoryCard.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log(`[selectPurpose] Category card found: ${categoryPattern}`);
    await categoryCard.click();
    await page.waitForTimeout(2000);

    // After selecting category, there might be subcategory selection
    // Look for any clickable subcategory or proceed button
    const subcategoryCard = page.locator(`text=/${purposeMap[purpose]}/`).first();
    if (await subcategoryCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log(`[selectPurpose] Subcategory card found`);
      await subcategoryCard.click();
      await page.waitForTimeout(2000);
    }

    return true;
  }

  // Fallback: try legacy purpose selection pattern
  const pattern = purposeMap[purpose];
  const purposeCard = page.locator(`text=/${pattern}/`).first();

  if (await purposeCard.isVisible({ timeout: 3000 }).catch(() => false)) {
    await purposeCard.click();
    await page.waitForTimeout(3000);
    return true;
  }

  console.log('[selectPurpose] Purpose card not found');
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
    // Pyodide 로딩 모달이 나타날 때까지 대기
    const modal = page.locator('text=통계 엔진 초기화');

    // 모달이 나타나는지 확인 (최대 3초)
    const modalAppeared = await modal.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false);

    if (modalAppeared) {
      console.log('[waitForPyodide] Pyodide 로딩 모달 감지됨, 완료 대기 중...');

      // 모달이 사라질 때까지 대기
      await modal.waitFor({ state: 'hidden', timeout });

      // 추가로 성공 메시지 대기 (3초 동안 표시됨)
      await page.waitForTimeout(1000);

      console.log('[waitForPyodide] Pyodide 초기화 완료');
      return true;
    } else {
      // 모달이 나타나지 않았다면 이미 로드된 상태
      console.log('[waitForPyodide] Pyodide 이미 로드됨 (모달 없음)');
      return true;
    }
  } catch (error) {
    console.error('[waitForPyodide] 타임아웃:', error);
    return false;
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
  const startTime = Date.now();

  try {
    console.log('[waitForProgressComplete] 분석 완료 대기 중...');

    // 여러 완료 지표를 확인
    await page.waitForFunction(() => {
      // 1. 진행 바 확인
      const progressBar = document.querySelector('[role="progressbar"]');
      if (progressBar) {
        const value = progressBar.getAttribute('aria-valuenow');
        if (value && parseInt(value) >= 100) {
          console.log('Progress bar at 100%');
          return true;
        }
      }

      // 2. 결과 텍스트 확인
      const bodyText = document.body.innerText;
      if (bodyText.includes('분석 완료') || bodyText.includes('분석이 완료') || bodyText.includes('결과')) {
        console.log('Analysis complete text found');
        return true;
      }

      // 3. 통계 결과 확인 (p-value, 통계량 등)
      if (bodyText.match(/p\s*[=<]/i) || bodyText.match(/t\s*=/i) || bodyText.match(/F\s*=/i)) {
        console.log('Statistical results found');
        return true;
      }

      // 4. Step indicator 확인 (결과 단계)
      const stepIndicators = document.querySelectorAll('[class*="step"]');
      for (const step of stepIndicators) {
        if (step.textContent && step.textContent.includes('결과')) {
          console.log('Results step found');
          return true;
        }
      }

      return false;
    }, { timeout });

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[waitForProgressComplete] 분석 완료! (소요시간: ${elapsedTime}초)`);
    return true;
  } catch (error) {
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[waitForProgressComplete] 타임아웃 (${elapsedTime}초 경과):`, error);

    // 현재 페이지 상태 로깅
    const url = page.url();
    const title = await page.title();
    console.log(`[waitForProgressComplete] 현재 URL: ${url}`);
    console.log(`[waitForProgressComplete] 현재 Title: ${title}`);

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

/**
 * 모든 단계를 진행하고 분석을 실행하는 통합 헬퍼
 * Step 1 (데이터) → Step 2 (방법) → Step 3 (변수) → Step 4 (분석)
 */
export async function runFullAnalysisFlow(
  page: Page,
  filename: string,
  purpose: 'group-comparison' | 'correlation' | 'distribution' | 'prediction',
  options?: {
    methodPattern?: string;
    skipMethodSelection?: boolean;
  }
): Promise<boolean> {
  console.log(`[runFullAnalysisFlow] 시작: ${filename} - ${purpose}`);

  // Step 1: 데이터 업로드
  console.log('[runFullAnalysisFlow] Step 1: 데이터 업로드');
  const uploaded = await uploadFile(page, filename);
  if (!uploaded) {
    console.error('[runFullAnalysisFlow] 파일 업로드 실패');
    return false;
  }

  const dataLoaded = await verifyDataLoaded(page);
  if (!dataLoaded) {
    console.error('[runFullAnalysisFlow] 데이터 로드 검증 실패');
    return false;
  }

  // Step 2: 방법 선택
  console.log('[runFullAnalysisFlow] Step 2: 방법 선택');
  const navigated = await navigateToStep2(page);
  if (!navigated) {
    console.error('[runFullAnalysisFlow] Step 2 이동 실패');
    return false;
  }

  const purposeSelected = await selectPurpose(page, purpose);
  if (!purposeSelected) {
    console.error('[runFullAnalysisFlow] 목적 선택 실패');
    return false;
  }

  // 방법 선택 (옵션)
  if (options?.methodPattern && !options.skipMethodSelection) {
    await page.waitForTimeout(2000);
    const methodCard = page.locator(`text=/${options.methodPattern}/i`).first();
    if (await methodCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await methodCard.click();
      console.log(`[runFullAnalysisFlow] 방법 선택: ${options.methodPattern}`);
    }
  }

  // Step 3으로 이동 (변수 선택은 자동이거나 수동)
  await page.waitForTimeout(3000);
  const nextButton = page.getByRole('button', { name: /다음|계속|진행/ });
  if (await nextButton.count() > 0) {
    const isVisible = await nextButton.first().isVisible().catch(() => false);
    if (isVisible) {
      await nextButton.first().click();
      console.log('[runFullAnalysisFlow] Step 3으로 이동');
      await page.waitForTimeout(2000);
    }
  }

  // Step 4: 분석 실행 대기
  console.log('[runFullAnalysisFlow] Step 4: 분석 실행 대기');
  const analysisComplete = await waitForProgressComplete(page, 90000);

  if (analysisComplete) {
    console.log('[runFullAnalysisFlow] 분석 완료!');
  } else {
    console.error('[runFullAnalysisFlow] 분석 타임아웃');
  }

  return analysisComplete;
}
