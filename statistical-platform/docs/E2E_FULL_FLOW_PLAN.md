# E2E Full Flow Test Plan

## 목표
Smart Flow 전체 흐름 테스트: **데이터 업로드 → 방법 선택 → 변수 매핑 → 분석 실행 → 결과 검증**

---

## 현재 상태 (2026-02-02)

### 완료된 테스트
| 파일 | 테스트 수 | 범위 | 결과 |
|------|----------|------|------|
| `e2e/smart-flow.spec.ts` | 51개 | Step 1-3 (결과 제외) | 50 통과, 1 스킵 |
| `e2e/statistics/t-test.spec.ts` | 10개 | 개별 페이지 | 3 통과, 7 실패 |

### 미완료
- ❌ Step 4 분석 실행 테스트
- ❌ 결과 페이지 검증 (p-value, 효과크기 등)
- ❌ Pyodide 로딩/실행 테스트

---

## Phase 1: 테스트 데이터 준비

### 필요한 CSV 파일 (test-data/e2e/)

| 파일명 | 용도 | 필수 컬럼 | 행 수 | 상태 |
|--------|------|----------|-------|------|
| `t-test.csv` | 독립표본 t-검정 | group(A/B), value | 20 | ✅ 있음 |
| `paired-t-test.csv` | 대응표본 t-검정 | pre, post | 15 | ❌ 필요 |
| `one-sample-t.csv` | 일표본 t-검정 | value | 20 | ❌ 필요 |
| `anova.csv` | 일원분산분석 | group(A/B/C), value | 18 | ✅ 있음 |
| `correlation.csv` | 상관분석 | x, y, z | 10 | ✅ 있음 |
| `regression.csv` | 회귀분석 | x1, x2, y | 10 | ✅ 있음 |
| `chi-square.csv` | 카이제곱 | category1, category2 | 20 | ✅ 있음 |
| `mann-whitney.csv` | Mann-Whitney U | group, value | 16 | ✅ 있음 |
| `kruskal-wallis.csv` | Kruskal-Wallis | group(3개), value | 15 | ✅ 있음 |

### 추가 필요 데이터

```csv
# paired-t-test.csv
subject,pre,post
1,23.5,25.1
2,24.8,26.3
... (15행)

# one-sample-t.csv
id,value
1,23.5
2,24.8
... (20행)
```

---

## Phase 2: Full Flow 테스트 구조

### 테스트 시나리오 (결과까지)

```typescript
test.describe('Full Analysis Flow with Results', () => {

  // 테스트 타임아웃 증가 (Pyodide 로딩 포함)
  test.setTimeout(120000); // 2분

  test('독립표본 t-검정 전체 흐름', async ({ page }) => {
    // Step 1: 데이터 업로드
    await uploadFile(page, 't-test.csv');
    await verifyDataLoaded(page);

    // Step 2: 방법 선택
    await page.click('text=다음 단계로');
    await page.click('text=그룹 간 차이');
    // AI 추천 또는 수동 선택
    await selectMethod(page, 't-검정');

    // Step 3: 변수 선택
    await selectGroupVariable(page, 'group');
    await selectDependentVariable(page, 'value');
    await page.click('text=분석 실행');

    // Step 4: 분석 실행 대기
    await waitForPyodide(page); // 최대 30초
    await waitForAnalysis(page); // 최대 60초

    // Step 5: 결과 검증
    await verifyResults(page, {
      hasStatistic: true,      // t 통계량
      hasPValue: true,         // p-value
      hasEffectSize: true,     // Cohen's d
      hasInterpretation: true  // 해석 텍스트
    });
  });
});
```

### 핵심 헬퍼 함수

```typescript
// e2e/helpers/smart-flow-helpers.ts

export async function uploadFile(page: Page, filename: string) {
  const fileInput = page.locator('input[type="file"]');
  const filePath = path.resolve(__dirname, `../../test-data/e2e/${filename}`);
  await fileInput.setInputFiles(filePath);
  await page.waitForTimeout(5000);
}

export async function waitForPyodide(page: Page, timeout = 30000) {
  // Pyodide 로딩 완료 대기
  await page.waitForFunction(() => {
    return window.__PYODIDE_READY__ === true;
  }, { timeout });
}

export async function waitForAnalysis(page: Page, timeout = 60000) {
  // 분석 완료 대기 (진행 바 100% 또는 결과 표시)
  await page.waitForSelector('text=/분석 완료|결과|Results/', { timeout });
}

export async function verifyResults(page: Page, options: ResultOptions) {
  if (options.hasStatistic) {
    await expect(page.locator('text=/t\\s*=|F\\s*=|χ²\\s*=|U\\s*=/')).toBeVisible();
  }
  if (options.hasPValue) {
    await expect(page.locator('text=/p\\s*[=<]/')).toBeVisible();
  }
  if (options.hasEffectSize) {
    await expect(page.locator('text=/Cohen|η²|r\\s*=/')).toBeVisible();
  }
  if (options.hasInterpretation) {
    await expect(page.locator('text=/유의|기각|채택/')).toBeVisible();
  }
}
```

---

## Phase 3: 테스트 케이스 목록

### Critical (필수 - 5개)

| ID | 테스트명 | 데이터 | 예상 시간 |
|----|---------|--------|----------|
| FF-001 | 독립표본 t-검정 전체 | t-test.csv | 45초 |
| FF-002 | 일원분산분석 전체 | anova.csv | 50초 |
| FF-003 | 상관분석 전체 | correlation.csv | 40초 |
| FF-004 | 단순회귀분석 전체 | regression.csv | 45초 |
| FF-005 | 카이제곱 검정 전체 | chi-square.csv | 40초 |

### High (권장 - 5개)

| ID | 테스트명 | 데이터 | 예상 시간 |
|----|---------|--------|----------|
| FF-006 | 대응표본 t-검정 | paired-t-test.csv | 45초 |
| FF-007 | 일표본 t-검정 | one-sample-t.csv | 40초 |
| FF-008 | Mann-Whitney U | mann-whitney.csv | 45초 |
| FF-009 | Kruskal-Wallis | kruskal-wallis.csv | 50초 |
| FF-010 | 다중회귀분석 | regression.csv | 55초 |

### 결과 검증 항목

```typescript
interface ExpectedResults {
  // 기본 통계량
  statistic: { name: string; pattern: RegExp };  // t, F, χ², U, H 등
  pValue: { pattern: RegExp };

  // 효과 크기 (방법별)
  effectSize?: {
    name: string;      // Cohen's d, η², r, φ 등
    pattern: RegExp;
  };

  // 추가 정보
  degreesOfFreedom?: boolean;
  confidenceInterval?: boolean;

  // 해석
  interpretation: {
    significant: RegExp;    // "유의한 차이", "귀무가설 기각"
    notSignificant: RegExp; // "유의하지 않음", "귀무가설 채택"
  };
}

// 예시: t-검정
const tTestExpected: ExpectedResults = {
  statistic: { name: 't', pattern: /t\s*=\s*[-]?\d+\.\d+/ },
  pValue: { pattern: /p\s*[=<]\s*0?\.\d+/ },
  effectSize: { name: "Cohen's d", pattern: /d\s*=\s*[-]?\d+\.\d+/ },
  degreesOfFreedom: true,
  confidenceInterval: true,
  interpretation: {
    significant: /유의한|기각|차이가 있/,
    notSignificant: /유의하지 않|채택|차이가 없/
  }
};
```

---

## Phase 4: 구현 순서

### Step 1: 헬퍼 함수 생성
```
e2e/helpers/
├── smart-flow-helpers.ts   # 업로드, 네비게이션
├── analysis-helpers.ts     # 분석 실행, 대기
└── result-helpers.ts       # 결과 검증
```

### Step 2: 테스트 데이터 추가
```
test-data/e2e/
├── paired-t-test.csv       # 신규
├── one-sample-t.csv        # 신규
└── ... (기존 파일)
```

### Step 3: Full Flow 테스트 작성
```
e2e/
├── smart-flow.spec.ts           # 기존 (Step 1-3)
├── smart-flow-full.spec.ts      # 신규 (Step 1-4 + 결과)
└── helpers/
```

### Step 4: CI/CD 설정
- 타임아웃 조정 (테스트당 2분)
- 병렬 실행 비활성화 (Pyodide 메모리)
- 실패 시 스크린샷/비디오 저장

---

## 예상 소요 시간

| 작업 | 예상 시간 |
|------|----------|
| 테스트 데이터 추가 | 10분 |
| 헬퍼 함수 작성 | 30분 |
| Critical 5개 테스트 | 1시간 |
| High 5개 테스트 | 1시간 |
| 디버깅/수정 | 30분 |
| **총계** | **3시간** |

---

## 실행 명령어

```bash
# Full Flow 테스트만 실행
npm run e2e -- e2e/smart-flow-full.spec.ts

# 특정 분석 방법만
npm run e2e -- e2e/smart-flow-full.spec.ts -g "t-검정"

# 디버그 모드 (headed)
npm run e2e -- e2e/smart-flow-full.spec.ts --headed --debug

# 타임아웃 증가
npm run e2e -- e2e/smart-flow-full.spec.ts --timeout=180000
```

---

## 주의사항

1. **Pyodide 로딩**: 첫 테스트에서 3-5초 추가 소요
2. **메모리**: 대용량 데이터 테스트 시 브라우저 메모리 주의
3. **병렬 실행**: Pyodide 충돌 방지를 위해 `workers: 1` 권장
4. **네트워크**: Pyodide CDN 접근 필요 (오프라인 테스트 시 로컬 설정)

---

## 다음 세션에서 할 일

1. `paired-t-test.csv`, `one-sample-t.csv` 생성
2. `e2e/helpers/` 폴더 및 헬퍼 함수 작성
3. `e2e/smart-flow-full.spec.ts` 작성
4. Critical 5개 테스트 구현 및 실행
5. 실패 케이스 디버깅

---

**Created**: 2026-02-02
**Author**: Claude Code
**Status**: Planning Complete
