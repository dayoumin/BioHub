# Fisheries 3개 도구 구현 계획 (2026-03-25)

**상위 계획서**: [PLAN-BIO-FISHERIES.md](../PLAN-BIO-FISHERIES.md) (입출력 명세, 시각화 전략)
**아키텍처 결정**: [REVIEW-MONOREPO-ARCHITECTURE.md](../../docs/REVIEW-MONOREPO-ARCHITECTURE.md) (결정 B)

---

## 현재 상태

| 항목 | 상태 |
|------|------|
| Worker 7 Python (`worker7-fisheries.py`) | 완성 (297줄, 3개 함수) |
| Registry 정의 (3개 도구) | 완성 (`coming-soon`) |
| Worker Enum (`PyodideWorker.Fisheries = 7`) | 완성 |
| 공통 인프라 (Shell, CsvUpload, 훅) | 완성 |
| UI 페이지 | **미생성** |

---

## 계획서(PLAN-BIO-FISHERIES.md) 오류/불일치 5건

### 오류 1: Worker 번호 불일치
- **계획서**: "Worker 6 (fisheries 전용)" (라인 336)
- **실제**: `PyodideWorker.Fisheries = 7` (Worker 6 = Matplotlib)
- **영향**: 코드에는 이미 7로 구현됨. 계획서만 오래됨

### 오류 2: `BioResultsSection` 존재하지 않음
- **계획서**: "공통 Shell: `BioToolShell`, `BioResultsSection` 상속" (라인 347)
- **실제**: `BioResultsSection` 컴포넌트는 코드베이스에 없음
- **영향**: 없음 — 실제 구현은 `BioToolShell` + 인라인 결과 렌더링 패턴

### 오류 3: `method-types.generated.ts` 미사용
- **계획서**: "타입 생성: `lib/generated/method-types.generated.ts` 자동 생성" (라인 335)
- **실제**: 이 파일은 통계 분석 메서드용. Bio-Tools는 각 page.tsx에 로컬 인터페이스 정의
- **영향**: Fisheries도 page.tsx에 결과 타입을 직접 정의해야 함

### 오류 4: `scatterplot.tsx` 존재하지만 패턴 다름
- **계획서**: "성장곡선/산점도: `components/charts/scatterplot.tsx` (+ 95% CI 밴드 확장)"
- **실제**: `scatterplot.tsx`는 존재하지만 통계 분석용. Bio-Tools는 ECharts 직접 사용 또는 자체 차트
- **영향**: 차트 구현 시 재사용 가능성 확인 필요 (1차는 테이블만)

### 개선점 1: 컬럼 선택 UI 명세 누락
- **계획서**: 입력 형식(CSV)만 명시, UI에서 어떤 컬럼을 어떻게 선택하는지 미기술
- **실제**: alpha-diversity는 `siteCol` 하나지만, Fisheries는 age/length/weight/group 등 2~3개 컬럼 필요
- **영향**: `useBioToolAnalysis`의 `siteCol`은 1개만 — 나머지는 로컬 state로 관리

---

## 구현 상세

### 공통 사항

- **Worker 지정**: `useBioToolAnalysis<T>({ worker: PyodideWorker.Fisheries })`
- **컬럼 선택**: `siteCol` 외에 도구별 컬럼(ageCol, lengthCol, weightCol, groupCol)은 `useState`로 관리
- **디자인 토큰**: `BIO_TABLE`, `SIGNIFICANCE_BADGE` 사용 (하드코딩 금지)
- **참고 패턴**: `app/bio-tools/alpha-diversity/page.tsx` (172줄)

### F1. VBGF (`app/bio-tools/vbgf/page.tsx`)

**입력 UI**: CSV 업로드 → ageCol/lengthCol 드롭다운 2개 → 분석 실행
**Worker 호출**: `runAnalysis('fit_vbgf', { ages: [...], lengths: [...] })`
**결과 표시**:
- 파라미터 테이블: L∞, K, t₀ (estimate, SE, 95% CI)
- 적합도: R², AIC, N
- 1차: 테이블만 / 2차: 성장곡선 차트 (산점+적합곡선+CI 밴드)

**결과 타입**:
```typescript
interface VbgfResult {
  lInf: number
  k: number
  t0: number
  standardErrors: number[]
  ci95: number[]
  rSquared: number
  predicted: number[]
  residuals: number[]
  nObservations: number
  aic: number | null
  parameterTable: Array<{
    name: string; unit: string; estimate: number
    standardError: number; ciLower: number; ciUpper: number
  }>
}
```

### F2. Length-Weight (`app/bio-tools/length-weight/page.tsx`)

**입력 UI**: CSV 업로드 → lengthCol/weightCol 드롭다운 2개 → 분석 실행
**Worker 호출**: `runAnalysis('length_weight', { lengths: [...], weights: [...] })`
**결과 표시**:
- 관계식: W = {a} × L^{b}
- 파라미터: a, b (± SE), R²
- 등성장 검정: b vs 3 (t-stat, p-value)
- 성장 유형 배지: isometric / positive_allometric / negative_allometric
- L-W → "비만도 계산" 링크 (condition-factor 페이지로 이동, 같은 CSV)
- 1차: 테이블 + 배지 / 2차: log-log 산점도

**결과 타입**:
```typescript
interface LengthWeightResult {
  a: number
  b: number
  logA: number
  rSquared: number
  bStdError: number
  isometricTStat: number
  isometricPValue: number
  growthType: 'isometric' | 'positive_allometric' | 'negative_allometric'
  predicted: number[]
  nObservations: number
  logLogPoints: Array<{ logL: number; logW: number }>
}
```

### F3. Condition Factor (`app/bio-tools/condition-factor/page.tsx`)

**입력 UI**: CSV 업로드 → lengthCol/weightCol + 선택적 groupCol 드롭다운 → 분석 실행
**Worker 호출**: `runAnalysis('condition_factor', { lengths: [...], weights: [...], groups: [...] | null })`
**결과 표시**:
- 기술통계: mean, SD, median, min, max, N
- 그룹별 비교 (있으면): 그룹별 mean/SD/N + t-test 또는 ANOVA 결과
- Fulton's K 한계 주의사항 (하단)
- 1차: 테이블 / 2차: 박스플롯

**결과 타입**:
```typescript
interface ConditionFactorResult {
  individualK: number[]
  mean: number
  std: number
  median: number
  min: number
  max: number
  n: number
  groupStats?: Record<string, { mean: number; std: number; n: number; median: number }>
  comparison?: { test: string; statistic: number; pValue: number; df: number }
}
```

### F4. Registry 업데이트

```typescript
// bio-tool-registry.ts — 3곳 변경
status: 'coming-soon' → status: 'ready'  // vbgf, length-weight, condition-factor
```

---

## 수정 대상 파일

| 파일 | 작업 | 신규/수정 |
|------|------|----------|
| `app/bio-tools/vbgf/page.tsx` | 페이지 생성 | 신규 |
| `app/bio-tools/length-weight/page.tsx` | 페이지 생성 | 신규 |
| `app/bio-tools/condition-factor/page.tsx` | 페이지 생성 | 신규 |
| `lib/bio-tools/bio-tool-registry.ts` | status 변경 (3줄) | 수정 |

**수정 불필요** (기존 인프라):
- `use-bio-tool-analysis.ts`, `BioToolShell.tsx`, `BioCsvUpload.tsx`
- `bio-styles.ts`, `bio-chart-colors.ts`, `pinned-tools-store.ts`
- `worker7-fisheries.py`, `pyodide-worker.enum.ts`

---

## 구현 순서

| 단계 | 내용 |
|------|------|
| F1 | VBGF page.tsx — 가장 복잡 (파라미터 테이블 + CI) |
| F2 | Length-Weight page.tsx — 중간 (등성장 검정 배지 + L-W→CF 링크) |
| F3 | Condition Factor page.tsx — 가장 간단 (기술통계 + 선택적 그룹비교) |
| F4 | Registry status 변경 (3줄) |
| F5 | 차트 추가 (2차 — 성장곡선, log-log, 박스플롯) |
