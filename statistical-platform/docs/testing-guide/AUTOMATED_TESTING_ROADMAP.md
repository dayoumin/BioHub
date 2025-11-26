# 자동화 테스트 로드맵 (Automated Testing Roadmap)

**목표**: 43개 통계 앱의 해석 엔진을 인간 개입 없이 완벽하게 검증

**최종 상태**: 2025-11-26
- ✅ Phase 0 완료: 버그 수정 + 기본 테스트 (32개 테스트, 100% 통과)
- ✅ Phase 0.5 완료: Executor 데이터 추출 테스트 (31개 테스트, 100% 통과)
- 🔜 Phase 1: Golden Snapshot 테스트 (129 시나리오)
- 🔜 Phase 2: Contract 테스트 (경계값 + Edge Cases)
- 🔜 Phase 3: E2E 테스트 (실제 결과 페이지 검증)
- 🔜 Phase 4: CI/CD 통합 (GitHub Actions)

---

## 📊 현재 상태 (Phase 0 완료)

### ✅ 완료된 작업

**1. 해석 엔진 버그 수정** (2025-11-23)
- ✅ Bug #1: Optional Chaining (`groupStats?.length`)
- ✅ Bug #2: 타이포 수정 (`group2.mean.toFixed(2)`)
- ✅ Bug #3: 명시적 타입 가드 (ANOVA groupStats)
- ✅ Edge Case 방어: NaN/Infinity/범위 검증

**2. 기본 테스트 스위트 구축**
- ✅ 파일: `__tests__/lib/interpretation/engine-review.test.ts`
- ✅ 테스트 수: 32개 (100% 통과)
- ✅ 커버리지:
  - Critical 버그 수정 (3개)
  - NaN/Infinity 방어 (5개)
  - 경계값 조건 (8개)
  - 신규 통계 (8개)
  - null 조건 (3개)
  - THRESHOLDS 일관성 (5개)

**3. 통계 커버리지 확장**
- ✅ 27/43 (62.8%) → 31+/43 (72%+)
- ✅ 추가된 통계:
  - Wilcoxon Signed-Rank Test
  - Sign Test
  - Friedman Test
  - Cochran Q Test
  - Mood's Median Test
  - Runs Test
  - Mann-Kendall Test
  - Binomial Test

**4. 문서화**
- ✅ `INTERPRETATION_TEST_PLAN.md` - 3단계 테스트 전략
- ✅ `INTERPRETATION_ENGINE_COVERAGE.md` - 통계 커버리지 분석

**5. Git 커밋**
```bash
9fa5287 refactor(smart-flow): 해석 엔진 DRY 개선 (Helper 함수 + p-value 상수화)
e4d3f32 refactor(smart-flow): 해석 엔진 코드 품질 개선 (타입 안전성 + 상수화)
257c50e feat(smart-flow): 중앙 해석 엔진 구현 (Phase 1 완료)
```

---

## ✅ Phase 0.5: Executor Data Extraction Tests (완료)

**목표**: Executor의 groupVar/dependentVar/independentVar 데이터 추출 검증
**완료일**: 2025-11-26
**테스트 파일**: `__tests__/services/executors/executor-data-extraction.test.ts`

### 배경
- **발견된 버그**: Mann-Whitney U 검정에서 `group1 undefined` 오류
- **원인**: Smart Flow의 VariableMapping(groupVar/dependentVar)을 Executor가 처리하지 못함
- **수정**: NonparametricExecutor, TTestExecutor, RegressionExecutor에 데이터 추출 로직 추가

### 테스트 커버리지 (31개 테스트)

| Executor | 테스트 항목 | 개수 |
|----------|-----------|------|
| NonparametricExecutor | Mann-Whitney U, Kruskal-Wallis | 6 |
| TTestExecutor | Independent, Paired, Welch, One-sample | 11 |
| RegressionExecutor | Simple, Multiple | 7 |
| AnovaExecutor | One-way ANOVA | 1 |
| Edge Cases | Empty data, Missing values, Invalid columns | 4 |
| Smart Flow Integration | Selector output format matching | 3 |

### 검증된 기능
- ✅ `groupVar` + `dependentVar` → 그룹별 데이터 분리
- ✅ `variables: [var1, var2]` → 대응표본 데이터 추출
- ✅ `dependentVar` + `independentVar` → 회귀 데이터 추출
- ✅ Backward compatibility (기존 group1/group2, before/after 형식)
- ✅ Method alias 지원 (independent-t-test, paired-t-test 등)
- ✅ 에러 처리 (그룹 부족, 변수 누락, 빈 데이터)

### 실행 명령
```bash
npm test -- __tests__/services/executors/executor-data-extraction.test.ts
```

---

## 🎯 Phase 1: Golden Snapshot 테스트 (우선순위: 최상)

**목표**: 43개 통계 × 3 시나리오 = 129개 스냅샷 생성

### 전략

**1단계: 스냅샷 데이터 생성**
```typescript
// __tests__/lib/interpretation/snapshots/t-test-independent.json
{
  "method": "Independent t-test",
  "scenarios": [
    {
      "name": "significant-large-effect",
      "input": {
        "statistic": 3.45,
        "pValue": 0.001,
        "df": 98,
        "effectSize": { value: 0.8, type: "Cohen's d" },
        "groupStats": [
          { "name": "Control", "mean": 50, "std": 10, "n": 50 },
          { "name": "Treatment", "mean": 58, "std": 12, "n": 50 }
        ]
      },
      "expectedOutput": {
        "summary": "그룹 간 평균 차이가 통계적으로 매우 유의합니다 (t=3.45, p=0.001, df=98). Control(M=50.0, SD=10.0)와 Treatment(M=58.0, SD=12.0) 그룹 간 차이가 관찰되었습니다.",
        "interpretation": "큰 효과 크기(d=0.80)로 실질적으로 의미 있는 차이입니다.",
        "nextSteps": ["효과 크기 확인", "사후 검정 실시"]
      }
    },
    // ... 2 more scenarios
  ]
}
```

**2단계: 스냅샷 테스트 작성**
```typescript
// __tests__/lib/interpretation/snapshots.test.ts
import { getInterpretation } from '@/lib/interpretation/engine'
import fs from 'fs'
import path from 'path'

describe('Golden Snapshot Tests', () => {
  const snapshotDir = path.join(__dirname, 'snapshots')
  const snapshotFiles = fs.readdirSync(snapshotDir)

  snapshotFiles.forEach(file => {
    const data = JSON.parse(fs.readFileSync(path.join(snapshotDir, file), 'utf8'))

    describe(data.method, () => {
      data.scenarios.forEach(scenario => {
        it(`Scenario: ${scenario.name}`, () => {
          const result = getInterpretation(scenario.input as AnalysisResult)

          expect(result.summary).toBe(scenario.expectedOutput.summary)
          expect(result.interpretation).toBe(scenario.expectedOutput.interpretation)
          expect(result.nextSteps).toEqual(scenario.expectedOutput.nextSteps)
        })
      })
    })
  })
})
```

**3단계: 스냅샷 업데이트 워크플로우**
```bash
# 새 스냅샷 생성
npm test -- --updateSnapshot

# 스냅샷 검증
npm test -- snapshots.test.ts

# 차이 확인
git diff __tests__/lib/interpretation/snapshots/
```

### 작업 예상 시간
- ✅ 43개 JSON 파일 생성: **8시간** (파일당 ~10분)
- ✅ 테스트 코드 작성: **2시간**
- ✅ 검증 및 디버깅: **4시간**
- **총 14시간**

### 예상 효과
- ✅ 해석 엔진 수정 시 자동 회귀 탐지
- ✅ 텍스트 변경 사항 즉시 확인
- ✅ CI/CD에서 자동 실행 가능

---

## 🔍 Phase 2: Contract 테스트 (우선순위: 높음)

**목표**: 입력 데이터 유효성 + 출력 형식 검증

### 전략

**1단계: Zod 스키마 정의**
```typescript
// lib/interpretation/schemas.ts
import { z } from 'zod'

export const AnalysisResultSchema = z.object({
  method: z.string(),
  statistic: z.number().finite(),
  pValue: z.number().min(0).max(1),
  df: z.number().int().positive().optional(),
  effectSize: z.union([
    z.number(),
    z.object({
      value: z.number().finite(),
      type: z.string(),
      interpretation: z.string()
    })
  ]).optional(),
  groupStats: z.array(z.object({
    name: z.string().optional(),
    mean: z.number().finite(),
    std: z.number().finite().nonnegative(),
    n: z.number().int().positive()
  })).optional()
})

export const InterpretationOutputSchema = z.object({
  summary: z.string().min(10),
  interpretation: z.string().min(10),
  nextSteps: z.array(z.string()).min(1),
  keyFindings: z.array(z.string()).optional()
})
```

**2단계: Contract 테스트 작성**
```typescript
// __tests__/lib/interpretation/contracts.test.ts
import { getInterpretation } from '@/lib/interpretation/engine'
import { AnalysisResultSchema, InterpretationOutputSchema } from '@/lib/interpretation/schemas'

describe('Contract Tests', () => {
  describe('입력 검증', () => {
    it('p-value가 범위를 벗어나면 에러', () => {
      expect(() => {
        AnalysisResultSchema.parse({
          method: 't-test',
          statistic: 2.5,
          pValue: 1.5  // 범위 벗어남
        })
      }).toThrow()
    })

    it('effectSize가 NaN이면 에러', () => {
      expect(() => {
        AnalysisResultSchema.parse({
          method: 't-test',
          statistic: 2.5,
          pValue: 0.05,
          effectSize: NaN
        })
      }).toThrow()
    })
  })

  describe('출력 검증', () => {
    it('summary는 최소 10자 이상', () => {
      const result = getInterpretation({
        method: 't-test',
        statistic: 2.5,
        pValue: 0.05
      })

      expect(() => {
        InterpretationOutputSchema.parse(result)
      }).not.toThrow()

      expect(result.summary.length).toBeGreaterThanOrEqual(10)
    })

    it('nextSteps는 최소 1개 이상', () => {
      const result = getInterpretation({
        method: 't-test',
        statistic: 2.5,
        pValue: 0.05
      })

      expect(result.nextSteps.length).toBeGreaterThanOrEqual(1)
    })
  })
})
```

### 작업 예상 시간
- ✅ Zod 스키마 정의: **3시간**
- ✅ 테스트 작성: **4시간**
- ✅ 검증 및 디버깅: **2시간**
- **총 9시간**

### 예상 효과
- ✅ 잘못된 입력 데이터 조기 탐지
- ✅ 출력 형식 일관성 보장
- ✅ 타입 안전성 향상

---

## 🌐 Phase 3: E2E 테스트 (우선순위: 중간)

**목표**: 실제 결과 페이지에서 해석 텍스트 검증

### 전략

**1단계: Playwright 설정**
```bash
npm install -D @playwright/test
npx playwright install
```

**2단계: E2E 테스트 작성**
```typescript
// e2e/statistics/t-test-independent.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Independent t-test 결과 페이지', () => {
  test('유의한 결과 시 해석 텍스트 표시', async ({ page }) => {
    // 1. 페이지 접속
    await page.goto('/statistics/t-test-independent')

    // 2. 데이터 업로드 (fixtures 사용)
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('e2e/fixtures/t-test-significant.csv')

    // 3. 변수 선택
    await page.click('[data-testid="select-dependent"]')
    await page.click('text=Score')
    await page.click('[data-testid="select-factor"]')
    await page.click('text=Group')

    // 4. 분석 실행
    await page.click('button:has-text("분석 실행")')

    // 5. 결과 대기
    await page.waitForSelector('[data-testid="interpretation-summary"]')

    // 6. 해석 텍스트 검증
    const summary = await page.textContent('[data-testid="interpretation-summary"]')
    expect(summary).toContain('통계적으로 유의합니다')
    expect(summary).toContain('p<0.05')

    // 7. 다음 단계 버튼 확인
    await expect(page.locator('text=효과 크기 확인')).toBeVisible()
  })

  test('유의하지 않은 결과 시 해석 텍스트 표시', async ({ page }) => {
    await page.goto('/statistics/t-test-independent')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('e2e/fixtures/t-test-nonsignificant.csv')

    // ... (변수 선택 + 분석 실행)

    const summary = await page.textContent('[data-testid="interpretation-summary"]')
    expect(summary).toContain('통계적으로 유의하지 않습니다')
  })
})
```

**3단계: Fixture 데이터 생성**
```csv
# e2e/fixtures/t-test-significant.csv
Group,Score
Control,50
Control,52
Control,48
Treatment,58
Treatment,60
Treatment,56
```

**4단계: 병렬 실행 설정**
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,  // 43개 통계 병렬 실행
  workers: 4,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  }
})
```

### 작업 예상 시간
- ✅ Playwright 설정: **2시간**
- ✅ 43개 E2E 테스트 작성: **20시간** (파일당 ~30분)
- ✅ Fixture 데이터 생성: **8시간**
- ✅ 검증 및 디버깅: **10시간**
- **총 40시간**

### 예상 효과
- ✅ 실제 사용자 시나리오 검증
- ✅ UI 렌더링 문제 조기 발견
- ✅ 브라우저 호환성 테스트

---

## 🚀 Phase 4: CI/CD 통합 (우선순위: 중간)

**목표**: GitHub Actions에서 자동 테스트 실행

### 전략

**1단계: GitHub Actions 워크플로우**
```yaml
# .github/workflows/automated-tests.yml
name: Automated Tests

on:
  push:
    branches: [ master, dev ]
    paths:
      - 'statistical-platform/lib/interpretation/**'
      - 'statistical-platform/__tests__/**'
  pull_request:
    branches: [ master, dev ]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test -- engine-review.test.ts
      - run: npm test -- snapshots.test.ts
      - run: npm test -- contracts.test.ts

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm start & npx wait-on http://localhost:3000
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

**2단계: 테스트 커버리지 리포트**
```yaml
  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test:coverage
      - uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
```

### 작업 예상 시간
- ✅ GitHub Actions 설정: **3시간**
- ✅ 디버깅 및 최적화: **2시간**
- **총 5시간**

### 예상 효과
- ✅ 커밋마다 자동 테스트 실행
- ✅ PR 리뷰 시 테스트 결과 확인
- ✅ 회귀 조기 발견

---

## 📈 로드맵 타임라인

| Phase | 작업 내용 | 예상 시간 | 우선순위 |
|-------|----------|----------|---------|
| ✅ Phase 0 | 버그 수정 + 기본 테스트 | 완료 | 최상 |
| ✅ Phase 0.5 | Executor 데이터 추출 테스트 | 완료 | 최상 |
| Phase 1 | Golden Snapshot (129 시나리오) | 14시간 | 최상 |
| Phase 2 | Contract 테스트 (Zod) | 9시간 | 높음 |
| Phase 3 | E2E 테스트 (Playwright) | 40시간 | 중간 |
| Phase 4 | CI/CD 통합 (GitHub Actions) | 5시간 | 중간 |
| **총계** | | **68시간** (~8.5 작업일) | |

---

## 🔄 추가 개선 사항

### 1. 남은 통계 핸들러 구현 (12개)
- Discriminant Analysis
- Mixed-model ANOVA
- Dose-response Analysis
- Response-surface Analysis
- Power Analysis (t-test, ANOVA, regression)
- 기타 고급 모델링

**예상 시간**: 12시간 (파일당 1시간)

### 2. Property-Based Testing (선택)
```typescript
// __tests__/lib/interpretation/property.test.ts
import fc from 'fast-check'
import { getInterpretation } from '@/lib/interpretation/engine'

describe('Property-Based Tests', () => {
  it('모든 p-value는 [0,1] 범위 내', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1 }),  // p-value
        fc.double(),                     // statistic
        (pValue, statistic) => {
          const result = getInterpretation({
            method: 't-test',
            statistic,
            pValue
          })

          // 출력에 유효한 텍스트가 있어야 함
          expect(result.summary).toBeTruthy()
          expect(result.interpretation).toBeTruthy()
        }
      )
    )
  })

  it('effectSize는 항상 유한한 숫자', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -5, max: 5 }),  // Cohen's d 범위
        (effectSize) => {
          const result = getInterpretation({
            method: 't-test',
            statistic: 2.5,
            pValue: 0.05,
            effectSize: { value: effectSize, type: "Cohen's d" }
          })

          expect(result.interpretation).toContain('효과')
        }
      )
    )
  })
})
```

**예상 시간**: 6시간

---

## 📝 체크리스트

### Phase 0.5: Executor Data Extraction ✅
- [x] NonparametricExecutor 테스트 (6개)
- [x] TTestExecutor 테스트 (11개)
- [x] RegressionExecutor 테스트 (7개)
- [x] AnovaExecutor 테스트 (1개)
- [x] Edge Cases 테스트 (4개)
- [x] Smart Flow Integration 테스트 (3개)

### Phase 1: Golden Snapshot
- [ ] 43개 JSON 스냅샷 파일 생성
- [ ] 각 통계당 3 시나리오 정의
- [ ] 스냅샷 테스트 코드 작성
- [ ] 전체 테스트 실행 (129개)
- [ ] CI에 통합

### Phase 2: Contract
- [ ] Zod 스키마 정의 (input + output)
- [ ] Contract 테스트 작성
- [ ] 경계값 테스트 추가
- [ ] Edge case 테스트 추가

### Phase 3: E2E
- [ ] Playwright 설정
- [ ] 43개 E2E 테스트 작성
- [ ] Fixture 데이터 생성
- [ ] 병렬 실행 최적화
- [ ] 스크린샷/비디오 설정

### Phase 4: CI/CD
- [ ] GitHub Actions 워크플로우 작성
- [ ] 테스트 커버리지 리포트
- [ ] PR 자동 테스트 설정
- [ ] 실패 시 알림 설정

---

**최종 업데이트**: 2025-11-26
**상태**: Phase 0.5 완료 (31 tests passing) → Phase 1 준비 중
**다음 작업**: Golden Snapshot 테스트 구현 (우선순위 최상)
