# Phase 9 개선 사항

**작성일**: 2025-11-18
**검증 방법**: 43개 통계 페이지 코드 전수 조사

---

## 📊 Phase 9 완료 현황

### ✅ 달성 사항
- **43/43 통계 페이지 (100%)** PyodideCore 사용
- **Worker 메서드 총 88개** 구현
  - Worker 1 (Descriptive): 12개
  - Worker 2 (Hypothesis): 23개
  - Worker 3 (Nonparametric + ANOVA): 23개
  - Worker 4 (Regression + Advanced): 30개
- **통계 신뢰성**: scipy, statsmodels, sklearn 100% 사용
- **데이터 도구 분리**: 2개 (frequency-table, cross-tabulation)

---

## ⚠️ 발견된 개선 필요 사항

### 1. PyodideWorker Enum 미사용 (우선순위: 중)

**현황**:
- ✅ Enum 사용: 2/43 페이지 (`descriptive`, `chi-square`)
- ❌ 숫자 직접 사용: 41/43 페이지

**문제점**:
```typescript
// ❌ 현재 (41개 페이지)
await pyodideCore.callWorkerMethod<T>(3, 'one_way_anova', params)
// 문제: 숫자 3이 무엇인지 명확하지 않음
// 문제: IDE 자동완성 없음
// 문제: 잘못된 Worker 번호 입력 시 런타임 에러
```

**권장 방식**:
```typescript
// ✅ 권장 (2개 페이지만 사용)
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'

await pyodideCore.callWorkerMethod<T>(
  PyodideWorker.NonparametricAnova,  // 명확한 의미
  'one_way_anova',
  params
)
```

**영향 페이지** (41개):
```
ancova, anova, binomial-test, chi-square-goodness, chi-square-independence,
cluster, cochran-q, correlation, discriminant, dose-response, explore-data,
factor-analysis, friedman, kruskal-wallis, ks-test, mann-kendall, mann-whitney,
manova, mcnemar, means-plot, mixed-model, mood-median, non-parametric,
normality-test, one-sample-t, ordinal-regression, partial-correlation, pca,
poisson, power-analysis, proportion-test, regression, reliability,
repeated-measures-anova, response-surface, runs-test, sign-test, stepwise,
t-test, welch-t, wilcoxon
```

**수정 방법**:
1. 각 페이지 상단에 import 추가:
   ```typescript
   import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
   ```

2. 숫자를 enum으로 변경:
   - `1` → `PyodideWorker.Descriptive`
   - `2` → `PyodideWorker.Hypothesis`
   - `3` → `PyodideWorker.NonparametricAnova`
   - `4` → `PyodideWorker.RegressionAdvanced`

**예상 효과**:
- ✅ 코드 가독성 향상
- ✅ IDE 자동완성 지원
- ✅ 타입 안전성 강화
- ✅ 런타임 에러 방지

---

### 2. explore-data 구버전 Hook 사용 (우선순위: 중)

**현황**:
- ❌ `explore-data`: `usePyodideService` 사용 (구버전)
- ✅ 나머지 42개: `PyodideCoreService` 직접 사용 (신버전)

**문제점**:
```typescript
// ❌ explore-data/page.tsx (구버전)
import { usePyodideService } from '@/hooks/use-pyodide-service'

const { pyodideService } = usePyodideService()
```

**권장 방식**:
```typescript
// ✅ 나머지 42개 페이지 (신버전)
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'

const pyodideCore = useMemo(() => PyodideCoreService.getInstance(), [])
```

**수정 방법**:
1. `explore-data/page.tsx` 리팩토링
2. `usePyodideService` → `PyodideCoreService` 전환
3. 42개 페이지와 동일한 패턴 적용

**예상 효과**:
- ✅ 일관성 향상 (43/43 동일 패턴)
- ✅ 레거시 코드 제거
- ✅ 유지보수성 향상

---

## 📋 개선 작업 우선순위

### 우선순위 1: 문서 업데이트 ✅ (완료)
- ✅ CLAUDE.md: 41/43 → 43/43
- ✅ STATUS.md: Phase 9 완료 (100%)
- ✅ PHASE9_IMPROVEMENTS.md 작성 (이 파일)

### 우선순위 2: PyodideWorker Enum 표준화 (선택)
- 대상: 41개 페이지
- 예상 시간: ~2시간 (자동 스크립트 가능)
- 장점: 코드 품질 향상, 타입 안전성
- 단점: 큰 변경 사항 (41개 파일)

### 우선순위 3: explore-data 리팩토링 (선택)
- 대상: 1개 페이지
- 예상 시간: ~30분
- 장점: 일관성 향상
- 단점: 없음 (권장)

---

## 🎯 권장 사항

### 즉시 적용
- ✅ 문서 업데이트 (완료)

### 선택적 적용 (향후)
- 🟡 PyodideWorker Enum 표준화 (41개 페이지)
  - Phase 11 전에 일괄 적용 권장
  - 자동화 스크립트 작성 가능

- 🟡 explore-data 리팩토링 (1개 페이지)
  - 시간 날 때 적용 권장
  - 우선순위 낮음

---

## 📚 관련 파일

- `lib/services/pyodide/core/pyodide-worker.enum.ts` - Worker Enum 정의
- `lib/services/pyodide/core/pyodide-core.service.ts` - PyodideCore 서비스
- `hooks/use-pyodide-service.ts` - 구버전 Hook (deprecated)

---

## 🔄 변경 이력

| 날짜 | 변경 내용 | 작성자 |
|------|----------|--------|
| 2025-11-18 | 초기 작성 (43개 페이지 검증 결과 기록) | Claude Code |
