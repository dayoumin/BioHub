# 42개 통계 페이지 End-to-End 검증 계획

**목표**: 어제 대규모 리팩토링 후 모든 통계 페이지의 데이터 입력 → 분석 → 결과 표시까지 전체 플로우 검증

**작성일**: 2025-11-17
**검증 대상**: 42개 통계 페이지 (데이터 도구 2개 제외)

---

## 📋 검증 전략 Overview

### 1단계: 자동화 검증 (AI 수행)
- **TypeScript 컴파일**: 타입 에러 확인
- **빌드 테스트**: 전체 빌드 성공 여부
- **단위 테스트**: 기존 Jest 테스트 실행
- **페이지 구조 검증**: 필수 컴포넌트 존재 여부
- **Worker 메서드 매핑**: Python Worker 연결 확인

### 2단계: 통합 테스트 (AI + Playwright)
- **페이지 로딩**: 각 페이지 렌더링 확인
- **샘플 데이터 입력**: 기본 데이터셋 로드
- **분석 실행**: 기본 옵션으로 분석 실행
- **결과 검증**: 에러 없이 결과 표시 확인
- **콘솔 에러**: 브라우저 콘솔 에러 수집

### 3단계: 수동 검증 (사용자)
- **UI/UX**: 레이아웃, 디자인, 사용성
- **옵션 변경**: 다양한 옵션 조합 테스트
- **엣지 케이스**: 비정상 데이터 입력
- **결과 정확성**: 통계 결과 값 검증

---

## 🎯 자동화 검증 스크립트 설계

### Script 1: 페이지 구조 검증 (`validate-page-structure.js`)

```javascript
/**
 * 각 통계 페이지의 필수 구조 검증
 * - useStatisticsPage hook 사용 여부
 * - TwoPanelLayout or StatisticsPageLayout 사용
 * - handleAnalyze 함수 존재
 * - Worker 메서드 호출 확인
 */
const fs = require('fs');
const path = require('path');

const STATISTICS_PAGES = [
  'ancova', 'anova', 'binomial-test', 'chi-square', 'chi-square-goodness',
  'chi-square-independence', 'cluster', 'cochran-q', 'correlation',
  'descriptive', 'discriminant', 'dose-response', 'explore-data',
  'factor-analysis', 'friedman', 'kruskal-wallis', 'ks-test',
  'mann-kendall', 'mann-whitney', 'manova', 'mcnemar', 'means-plot',
  'mixed-model', 'mood-median', 'non-parametric', 'normality-test',
  'one-sample-t', 'ordinal-regression', 'partial-correlation', 'pca',
  'poisson', 'power-analysis', 'proportion-test', 'regression',
  'reliability', 'response-surface', 'runs-test', 'sign-test',
  'stepwise', 't-test', 'welch-t', 'wilcoxon'
];

function validatePageStructure(pageName) {
  const pagePath = path.join(__dirname, `../app/(dashboard)/statistics/${pageName}/page.tsx`);

  if (!fs.existsSync(pagePath)) {
    return { success: false, error: 'File not found' };
  }

  const content = fs.readFileSync(pagePath, 'utf-8');
  const checks = {
    hasUseStatisticsPage: content.includes('useStatisticsPage'),
    hasLayout: content.includes('TwoPanelLayout') || content.includes('StatisticsPageLayout'),
    hasHandleAnalyze: content.includes('handleAnalyze'),
    hasWorkerCall: content.includes('callWorkerMethod') || content.includes('executePython'),
    noSetTimeout: !content.includes('setTimeout('),
    noAnyType: !content.match(/:\s*any[\s\,\)]/),
  };

  const allPassed = Object.values(checks).every(v => v === true);

  return { success: allPassed, checks, pageName };
}

// 전체 검증 실행
console.log('🔍 Starting Page Structure Validation...\n');

const results = STATISTICS_PAGES.map(validatePageStructure);
const failed = results.filter(r => !r.success);
const passed = results.filter(r => r.success);

console.log(`✅ Passed: ${passed.length}/${STATISTICS_PAGES.length}`);
console.log(`❌ Failed: ${failed.length}/${STATISTICS_PAGES.length}\n`);

if (failed.length > 0) {
  console.log('Failed Pages:');
  failed.forEach(({ pageName, checks, error }) => {
    console.log(`\n📄 ${pageName}:`);
    if (error) {
      console.log(`   Error: ${error}`);
    } else {
      Object.entries(checks).forEach(([key, value]) => {
        if (!value) console.log(`   ❌ ${key}`);
      });
    }
  });
  process.exit(1);
}

console.log('✅ All pages passed structure validation!');
```

---

### Script 2: Worker 메서드 매핑 검증 (`validate-worker-mapping.js`)

```javascript
/**
 * 각 통계 페이지가 올바른 Worker 메서드를 호출하는지 검증
 */
const fs = require('fs');
const path = require('path');

// variable-requirements.ts에서 메서드 ID 추출
const requirementsPath = path.join(__dirname, '../lib/statistics/variable-requirements.ts');
const requirementsContent = fs.readFileSync(requirementsPath, 'utf-8');

// Worker 파일들에서 메서드 목록 추출
const workerFiles = [
  'public/workers/python/comparison_worker.py',
  'public/workers/python/regression_worker.py',
  'public/workers/python/nonparametric_worker.py',
  'public/workers/python/multivariate_worker.py',
];

function extractWorkerMethods() {
  const methods = new Set();

  workerFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (!fs.existsSync(filePath)) return;

    const content = fs.readFileSync(filePath, 'utf-8');
    const matches = content.matchAll(/def\s+(calculate_\w+)/g);

    for (const match of matches) {
      methods.add(match[1]);
    }
  });

  return Array.from(methods);
}

function validateWorkerMapping(pageName) {
  const pagePath = path.join(__dirname, `../app/(dashboard)/statistics/${pageName}/page.tsx`);
  const content = fs.readFileSync(pagePath, 'utf-8');

  // callWorkerMethod 호출 찾기
  const workerCallRegex = /callWorkerMethod<[^>]+>\s*\(\s*['"`]([^'"`]+)['"`]/g;
  const matches = [...content.matchAll(workerCallRegex)];

  if (matches.length === 0) {
    return { success: false, error: 'No worker method call found', pageName };
  }

  const calledMethods = matches.map(m => m[1]);

  return { success: true, calledMethods, pageName };
}

console.log('🔍 Validating Worker Method Mappings...\n');

const availableMethods = extractWorkerMethods();
console.log(`📦 Available Worker Methods (${availableMethods.length}):`);
console.log(availableMethods.sort().join(', '));
console.log('');

const STATISTICS_PAGES = [/* 위와 동일 */];
const results = STATISTICS_PAGES.map(validateWorkerMapping);

const withoutWorker = results.filter(r => !r.success);
const withWorker = results.filter(r => r.success);

console.log(`✅ Pages with Worker: ${withWorker.length}`);
console.log(`⚠️  Pages without Worker: ${withoutWorker.length}\n`);

if (withoutWorker.length > 0) {
  console.log('Pages without Worker calls:');
  withoutWorker.forEach(({ pageName }) => console.log(`  - ${pageName}`));
}

// Worker 메서드별 사용 현황
const methodUsage = new Map();
withWorker.forEach(({ calledMethods }) => {
  calledMethods.forEach(method => {
    methodUsage.set(method, (methodUsage.get(method) || 0) + 1);
  });
});

console.log('\n📊 Worker Method Usage:');
[...methodUsage.entries()]
  .sort((a, b) => b[1] - a[1])
  .forEach(([method, count]) => {
    console.log(`  ${method}: ${count} pages`);
  });
```

---

### Script 3: Playwright 통합 테스트 (`e2e-basic-flow.spec.ts`)

```typescript
/**
 * 각 통계 페이지의 기본 플로우 테스트
 * 1. 페이지 로딩
 * 2. 샘플 데이터 입력
 * 3. 분석 실행
 * 4. 결과 확인
 */
import { test, expect } from '@playwright/test';

const STATISTICS_PAGES = [
  { id: 'descriptive', hasAnalyzeButton: true },
  { id: 't-test', hasAnalyzeButton: true },
  { id: 'anova', hasAnalyzeButton: true },
  { id: 'correlation', hasAnalyzeButton: true },
  { id: 'regression', hasAnalyzeButton: true },
  { id: 'chi-square', hasAnalyzeButton: true },
  { id: 'normality-test', hasAnalyzeButton: true },
  { id: 'mann-whitney', hasAnalyzeButton: true },
  { id: 'kruskal-wallis', hasAnalyzeButton: true },
  { id: 'wilcoxon', hasAnalyzeButton: true },
  // ... (나머지 페이지)
];

test.describe('Statistics Pages E2E - Basic Flow', () => {

  test.beforeEach(async ({ page }) => {
    // 개발 서버가 실행 중이어야 함
    await page.goto('http://localhost:3000');
  });

  for (const { id, hasAnalyzeButton } of STATISTICS_PAGES) {
    test(`${id}: 페이지 로딩 → 샘플 데이터 → 분석`, async ({ page }) => {

      // 1. 페이지 이동
      await page.goto(`http://localhost:3000/statistics/${id}`);

      // 2. 페이지 로딩 확인
      await expect(page).toHaveTitle(/통계 분석/);

      // 3. 주요 UI 요소 확인
      const mainContent = page.locator('main, [role="main"]');
      await expect(mainContent).toBeVisible();

      // 4. 샘플 데이터 로드 버튼 찾기
      const sampleButton = page.getByRole('button', { name: /샘플|예제|데모/i });
      if (await sampleButton.isVisible()) {
        await sampleButton.click();
        await page.waitForTimeout(500);
      }

      // 5. 분석 실행 (옵션)
      if (hasAnalyzeButton) {
        const analyzeButton = page.getByRole('button', { name: /분석|실행|계산/i });

        if (await analyzeButton.isVisible() && await analyzeButton.isEnabled()) {
          // 콘솔 에러 수집
          const consoleErrors: string[] = [];
          page.on('console', msg => {
            if (msg.type() === 'error') {
              consoleErrors.push(msg.text());
            }
          });

          await analyzeButton.click();

          // 결과 대기 (최대 10초)
          await page.waitForTimeout(10000);

          // 콘솔 에러 확인
          expect(consoleErrors.length).toBe(0);

          // 결과 표시 확인 (StatisticsTable 또는 결과 컨테이너)
          const resultTable = page.locator('table, [data-testid="result"]');
          await expect(resultTable).toBeVisible({ timeout: 15000 });
        }
      }

      // 6. 스크린샷 저장
      await page.screenshot({
        path: `test-results/screenshots/${id}.png`,
        fullPage: true
      });

    });
  }

});
```

---

## 🚀 검증 실행 계획

### Phase 1: 정적 분석 (5분)

```bash
# 1. TypeScript 컴파일 체크
cd statistical-platform
npx tsc --noEmit

# 2. 페이지 구조 검증
node scripts/validate-page-structure.js

# 3. Worker 메서드 매핑 검증
node scripts/validate-worker-mapping.js
```

### Phase 2: 빌드 테스트 (3분)

```bash
# 전체 빌드
npm run build

# 결과: .next 디렉토리 생성 확인
```

### Phase 3: Playwright 통합 테스트 (30-60분)

```bash
# 개발 서버 시작 (별도 터미널)
npm run dev

# Playwright 테스트 실행
npx playwright test e2e-basic-flow.spec.ts --workers=3

# 결과 확인
npx playwright show-report
```

### Phase 4: 수동 검증 체크리스트 (사용자)

각 통계 페이지별:
- [ ] 페이지 로딩 속도
- [ ] UI 레이아웃 (TwoPanelLayout)
- [ ] 변수 선택 드롭다운
- [ ] 옵션 설정 패널
- [ ] 샘플 데이터 로드
- [ ] 분석 버튼 클릭
- [ ] 로딩 상태 표시
- [ ] 결과 테이블 표시
- [ ] 차트 렌더링
- [ ] 내보내기 기능
- [ ] 에러 처리 (잘못된 데이터)

---

## 📊 검증 결과 리포트 포맷

### 자동 생성 리포트 (`validation-report.json`)

```json
{
  "timestamp": "2025-11-17T10:30:00Z",
  "summary": {
    "total": 42,
    "passed": 40,
    "failed": 2,
    "skipped": 0
  },
  "typescript": {
    "errors": 0,
    "warnings": 3
  },
  "build": {
    "success": true,
    "duration": "2m 15s"
  },
  "pages": [
    {
      "id": "descriptive",
      "status": "passed",
      "structure": { "passed": true },
      "workerMapping": { "method": "calculate_descriptive_stats" },
      "e2e": { "passed": true, "duration": 8.5 },
      "screenshots": "test-results/screenshots/descriptive.png"
    },
    {
      "id": "t-test",
      "status": "failed",
      "structure": { "passed": true },
      "workerMapping": { "method": "calculate_ttest" },
      "e2e": {
        "passed": false,
        "error": "Timeout waiting for results",
        "consoleErrors": ["TypeError: Cannot read property 'pValue' of undefined"]
      }
    }
  ]
}
```

---

## 🎯 우선순위별 검증 그룹

### Group A: 핵심 통계 (10개) - 최우선
1. descriptive
2. t-test
3. anova
4. correlation
5. regression
6. chi-square
7. normality-test
8. mann-whitney
9. kruskal-wallis
10. wilcoxon

### Group B: 고급 통계 (15개)
11. ancova
12. manova
13. mixed-model
14. friedman
15. cochran-q
16. mcnemar
17. binomial-test
18. proportion-test
19. poisson
20. ordinal-regression
21. discriminant
22. cluster
23. factor-analysis
24. pca
25. reliability

### Group C: 전문 통계 (17개)
26. chi-square-goodness
27. chi-square-independence
28. welch-t
29. one-sample-t
30. sign-test
31. runs-test
32. mood-median
33. ks-test
34. mann-kendall
35. partial-correlation
36. stepwise
37. dose-response
38. response-surface
39. power-analysis
40. means-plot
41. non-parametric
42. explore-data

---

## ✅ 성공 기준

### 자동 검증 통과 기준
- TypeScript 컴파일: 0 errors
- 페이지 구조: 100% 통과
- Worker 매핑: 95% 이상 (일부 페이지는 Worker 미사용 가능)
- 빌드: 성공
- E2E 테스트: 90% 이상 통과

### 수동 검증 통과 기준
- UI/UX: 모든 페이지 정상 렌더링
- 기본 분석: 샘플 데이터로 에러 없이 결과 출력
- 콘솔 에러: 0개
- 결과 정확성: 랜덤 샘플 5-10개 검증

---

## 🔧 문제 발견 시 대응

### Critical (즉시 수정)
- 페이지 크래시
- 분석 결과 미출력
- TypeScript 컴파일 에러
- 데이터 손실

### High (당일 수정)
- 콘솔 에러
- Worker 메서드 미연결
- UI 깨짐

### Medium (주간 백로그)
- 성능 저하
- 옵션 미작동
- 스타일 불일치

### Low (향후 개선)
- 코드 중복
- 주석 부족
- 테스트 커버리지

---

**다음 단계**: 위 스크립트들을 `statistical-platform/scripts/` 디렉토리에 작성 후 실행
