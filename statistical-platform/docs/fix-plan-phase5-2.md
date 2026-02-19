# Phase 5-2 잔여 이슈 수정 계획 (수정 v2)

비판적 검토 + 교차 검증 피드백을 반영하여 수정한 계획입니다.

> ⚠️ v1 대비 주요 변경: unknown 해소 방법 수정, Step 1 scipy.anderson 반환 형식 보정, Verification 기준 현실화

---

## Step 1: 🔴 즉시 수정 — 위험한 미구현 메서드

### `andersonDarlingTest` / `dagostinoPearsonTest`

- **현황**: Python Worker에 미구현, Shapiro-Wilk로 임시 fallback 중
- **문제**: `useNormalityTest.ts`에서 종합 정규성 판정에 사용 → 3개 검정이 동일 결과 반환
- **주의 (v2 추가)**:
  - `scipy.stats.anderson`은 `pValue`를 직접 반환하지 않음 → critical_values + significance_level 기반으로 변환 로직 필요
  - `scipy.stats.normaltest` (D'Agostino-Pearson)은 `(statistic, pValue)` 튜플 반환 → 직접 사용 가능
- **옵션 A** (근본 해결): Worker 1에 Python 함수 추가 + pValue 변환 로직 포함
- **옵션 B** (빠른 우회): `useNormalityTest.ts`에서 해당 검정을 비활성화
  - ⚠️ v1 오류 수정: 현재 훅은 KS를 호출하지 않으므로 "Shapiro만 사용"이 정확함
- **결정**: ⬜ 미정

### `detectOutliersIQR` (pyodide-statistics.ts)

- **현황**: 외부 호출처 없음 (`data-processing.ts`에 별도 JS 구현 존재)
- **조치**: 메서드 삭제

---

## Step 2: 🔴 `unknown` 타입 해소 (20개 필드)

### ⚠️ v1 대비 근본 수정: 원인이 `methods-registry.json`이 아님

**실제 원인**: `generate-method-types.mjs`의 `returnsToInterface()` 함수가 **반환값 키 이름 기반 규칙**으로 타입을 결정. `methods-registry.json`의 `returns`는 **문자열 목록만 허용** (스키마 제약).

따라서 해소 방법은 두 가지:

#### 방법 A: `METHOD_TYPE_OVERRIDES` 추가 (권장)
`generate-method-types.mjs`의 `METHOD_TYPE_OVERRIDES` 객체에 메서드별 오버라이드 추가:

```javascript
// generate-method-types.mjs LINE 173
const METHOD_TYPE_OVERRIDES = {
  // ... 기존 오버라이드 유지 ...
  'one_way_anova': {
    'ssBetween': 'number',
    'ssWithin': 'number', 
    'ssTotal': 'number',
  },
  'wilcoxon_test': {
    'nobs': 'number',
    'zScore': 'number',
    'medianDiff': 'number',
  },
  't_test_paired_summary': {
    'stdDiff': 'number',
  },
  'pca_analysis': {
    'rotationMatrix': 'number[][]',
    'transformedData': 'number[][]',
    'variableContributions': 'number[][]',
    'qualityMetrics': '{ kmo: number; bartlettStat: number; bartlettPValue: number }',
    'screeData': 'number[]',
  },
  'curve_estimation': {
    'parameters': 'number[]',
  },
  'nonlinear_regression': {
    'parameters': 'number[]',
  },
  'stepwise_regression': {
    'steps': 'Array<{ step: number; variable: string; action: string; rSquared: number }>',
  },
  'probit_regression': {
    'marginalEffects': 'number[]',
  },
  'discriminant_analysis': {
    'functions': 'Array<{ eigenvalue: number; varianceExplained: number }>',
    'groupCentroids': 'number[][]',
    'classificationResults': 'Array<{ actual: string; predicted: string; correct: boolean }>',
  },
}
```

#### 방법 B: `returnsToInterface()` 규칙 추가
일반적인 키 이름 규칙을 `returnsToInterface()`에 추가. 단, 같은 이름이 다른 타입을 가질 수 있어 방법 A가 더 안전.

### 후속 작업
```bash
node scripts/generate-method-types.mjs  # 타입 재생성
```
- `oneWayAnovaWorker`의 `as number` 캐스팅 제거

---

## Step 3: 🟡 타입 불일치 수정

### `generate-method-types.mjs` 수정
- `controlIndices`의 파라미터 규칙 (L62): 현재 `(string | number)[]` → `number[]`로 분리 필요
- 또는 `METHOD_PARAM_OVERRIDES`에 `partial_correlation.controlIndices: 'number[]'` 추가

### `pyodide-statistics.ts`
- `partialCorrelationWorker` (L503): `as unknown as (string | number)[]` 캐스팅 제거

---

## Step 4: 🟡 코드 품질 정리

- 중복/빈 JSDoc 제거 (L115-116, L1515-1517)
- `performBonferroni`의 불필요한 수동 초기화 제거 (L1132-1133)
- 미사용 매개변수에 `_` 접두사 (9건)

---

## Step 5: 🟡 레거시 래퍼 `@deprecated` 표시 (11건)

| 레거시 메서드 | 대체 메서드 |
|-------------|-----------|
| `mannWhitneyU` | `mannWhitneyTestWorker` |
| `wilcoxon` | `wilcoxonTestWorker` |
| `kruskalWallis` | `kruskalWallisTestWorker` |
| `chiSquare` | `chiSquareTestWorker` |
| `friedman` | `friedmanTestWorker` |
| `regression` | `linearRegression` |
| `pca` | `pcaAnalysis` |
| `calculateDescriptiveStatistics` | `descriptiveStats` |
| `calculateDescriptiveStats` | `descriptiveStats` |
| `tukeyHSD` | `tukeyHSDWorker` |
| `testIndependence` | `durbinWatsonTest` |

---

## Step 6: 🟡 성능 최적화 (선택적)

- `correlation()`: Worker가 싱글스레드이므로 `Promise.all()` 효과 제한적 → Python 측 통합 메서드 검토
- `calculateCorrelation()`: Python `correlation_matrix` 메서드 추가 검토

---

## Verification (v2 — 현실적 기준)

### 합격 기준
```bash
# eslint: 에러 0건 (기존 경고 9건은 unused-var — Step 4에서 해소 예정)
npx eslint lib/services/pyodide-statistics.ts

# tsc: 해당 파일 관련 에러 0건
# 참고: 전체 tsc --noEmit은 다른 파일에서도 실패하므로 범위 한정
npx tsc --noEmit 2>&1 | findstr pyodide-statistics
```

### 확인 사항
- `method-types.generated.ts`에서 `unknown` 필드 수 감소 확인
- 레거시 메서드 호출처가 깨지지 않았는지 grep 확인
