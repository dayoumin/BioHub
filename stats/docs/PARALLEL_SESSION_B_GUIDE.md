# 병렬 세션 B 작업 가이드

> **담당**: 페이지 마이그레이션 (15개)
> **상태**: 대기 중 (Phase 1-2 완료 후 시작)
> **참조**: [COMPONENT_STANDARDIZATION_PLAN.md](./COMPONENT_STANDARDIZATION_PLAN.md)

---

## 1. 담당 페이지 (15개)

```
kaplan-meier, ks-test, mann-kendall, mann-whitney, manova,
mcnemar, means-plot, mixed-model, mood-median, non-parametric,
normality-test, one-sample-t, ordinal-regression, partial-correlation, pca
```

---

## 2. 작업 목표

각 페이지에 공통 컴포넌트 적용:

| 컴포넌트 | 적용 조건 | import 경로 |
|---------|----------|-------------|
| ResultInterpretation | 모든 페이지 | `@/components/statistics/common/ResultInterpretation` |
| AssumptionTestCard | 가정 검정 있는 페이지 | `@/components/statistics/common/AssumptionTestCard` |
| EffectSizeCard | 효과크기 있는 페이지 | `@/components/statistics/common/EffectSizeCard` |
| ConfidenceIntervalDisplay | 신뢰구간 있는 페이지 | `@/components/statistics/common/ConfidenceIntervalDisplay` |

---

## 3. 페이지별 적용 컴포넌트

| 페이지 | Assumption | EffectSize | CI | Interpretation |
|--------|------------|------------|-----|----------------|
| kaplan-meier | ⬜ | ⬜ | ⬜ | ✅ |
| ks-test | ✅ | ✅ | ⬜ | ✅ |
| mann-kendall | ✅ | ⬜ | ⬜ | ✅ |
| mann-whitney | ✅ | ✅ | ⬜ | ✅ |
| manova | ✅ | ✅ | ✅ | ✅ |
| mcnemar | ⬜ | ✅ | ⬜ | ✅ |
| means-plot | ⬜ | ⬜ | ✅ | ✅ |
| mixed-model | ✅ | ⬜ | ✅ | ✅ |
| mood-median | ✅ | ⬜ | ⬜ | ✅ |
| non-parametric | ✅ | ✅ | ⬜ | ✅ |
| normality-test | ✅ | ⬜ | ⬜ | ✅ |
| one-sample-t | ✅ | ✅ | ✅ | ✅ |
| ordinal-regression | ✅ | ⬜ | ✅ | ✅ |
| partial-correlation | ✅ | ⬜ | ⬜ | ✅ |
| pca | ⬜ | ⬜ | ⬜ | ✅ |

---

## 4. 표준 타입 (참조용)

```typescript
// types/statistics.ts에서 import

/** 효과크기 */
interface EffectSize {
  value: number
  type: 'cohen_d' | 'eta_squared' | 'omega_squared' | 'r' | 'phi' | 'cramers_v'
  interpretation: 'negligible' | 'small' | 'medium' | 'large'
}

/** 신뢰구간 */
interface ConfidenceInterval {
  lower: number
  upper: number
  level: number  // 0.95, 0.99 등
}

/** 가정 검정 */
interface AssumptionTest {
  name: string
  testName: string
  statistic?: number
  pValue: number
  passed: boolean
  recommendation?: string
}

/** 결과 해석 */
interface Interpretation {
  summary: string
  details?: string
  recommendation?: string
}
```

---

## 5. 작업 절차

### 5.1 각 페이지마다 수행

1. **현재 상태 확인**
   ```bash
   # 페이지 파일 읽기
   cat app/(dashboard)/statistics/[페이지명]/page.tsx
   ```

2. **Result 타입 확인**
   - 기존 필드명 파악 (pValue vs pvalue 등)
   - 효과크기, 신뢰구간, 가정검정 구조 확인

3. **타입 표준화**
   - 필드명을 표준으로 변경 (pvalue → pValue)
   - 구조를 표준 인터페이스에 맞게 조정

4. **공통 컴포넌트 적용**
   ```tsx
   import { AssumptionTestCard } from '@/components/statistics/common/AssumptionTestCard'
   import { EffectSizeCard } from '@/components/statistics/common/EffectSizeCard'
   import { ConfidenceIntervalDisplay } from '@/components/statistics/common/ConfidenceIntervalDisplay'
   import { ResultInterpretation } from '@/components/statistics/common/ResultInterpretation'
   ```

5. **검증**
   ```bash
   npx tsc --noEmit
   npm run dev  # 브라우저에서 확인
   ```

### 5.2 완료 체크리스트

각 페이지 완료 시 표시:

- [ ] kaplan-meier
- [ ] ks-test
- [ ] mann-kendall
- [ ] mann-whitney
- [ ] manova
- [ ] mcnemar
- [ ] means-plot
- [ ] mixed-model
- [ ] mood-median
- [ ] non-parametric
- [ ] normality-test
- [ ] one-sample-t
- [ ] ordinal-regression
- [ ] partial-correlation
- [ ] pca

---

## 6. ⚠️ 주의사항 (중요!)

### 6.1 절대 수정 금지 파일

```
❌ types/statistics.ts
❌ types/pyodide-results.ts
❌ components/statistics/common/*.tsx
❌ app/(dashboard)/statistics/t-test/
❌ app/(dashboard)/statistics/anova/
❌ app/(dashboard)/statistics/correlation/
```

이 파일들은 **세션 A에서만 수정**합니다.

### 6.2 충돌 발생 시

1. 즉시 작업 중단
2. `git status`로 충돌 파일 확인
3. 세션 A와 조율 후 재개

### 6.3 커밋 규칙

```bash
# 페이지별로 개별 커밋
git add app/(dashboard)/statistics/mann-whitney/
git commit -m "refactor(mann-whitney): 공통 컴포넌트 적용

- AssumptionTestCard 적용
- EffectSizeCard 적용
- ResultInterpretation 적용
- pValue 필드명 표준화

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 7. 컴포넌트 사용 예시

### AssumptionTestCard

```tsx
<AssumptionTestCard
  tests={[
    {
      name: '정규성 검정',
      testName: 'Shapiro-Wilk',
      statistic: results.assumptions.normality.statistic,
      pValue: results.assumptions.normality.pValue,
      passed: results.assumptions.normality.pValue > 0.05,
      recommendation: '정규성 가정이 충족되지 않으면 비모수 검정 고려'
    }
  ]}
/>
```

### EffectSizeCard

```tsx
<EffectSizeCard
  title="효과 크기"
  value={results.effectSize.value}
  type="cohen_d"
  showInterpretation={true}
  showVisualScale={true}
/>
```

### ConfidenceIntervalDisplay

```tsx
<ConfidenceIntervalDisplay
  lower={results.confidenceInterval.lower}
  upper={results.confidenceInterval.upper}
  estimate={results.meanDiff}
  level={0.95}
  showVisualization={true}
/>
```

### ResultInterpretation

```tsx
<ResultInterpretation
  interpretation={{
    summary: results.interpretation.summary,
    details: results.interpretation.details,
    recommendation: results.interpretation.recommendation
  }}
/>
```

---

## 8. 문의

- 공통 컴포넌트 수정 필요 시 → 세션 A에 요청
- 타입 정의 변경 필요 시 → 세션 A에 요청
- 작업 영역 조정 필요 시 → 전체 조율

---

**시작 조건**: Phase 1-2 완료 알림 후 시작
