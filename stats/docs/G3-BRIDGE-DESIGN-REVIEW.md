# G3 브릿지 설계 리뷰 브리핑

> **목적**: 외부 리뷰어(AI 또는 사람)가 DataPackage `context` → `analysisContext` 재설계의 타당성을 평가하고, 결함·누락을 찾을 수 있도록 구조화한 문서.

---

## 1. 문제 정의

### 현재 상태

DataPackage는 Graph Studio의 **모듈 간 데이터 전달** 인터페이스이다.

```typescript
// stats/types/graph-studio.ts:262-273 (현재)
export interface DataPackage {
  id: string;
  source: 'smart-flow' | 'bio-tools' | 'upload' | 'species-checker';
  label: string;
  columns: ColumnMeta[];
  data: Record<string, unknown[]>;
  context?: {
    method?: string;
    summary?: Record<string, unknown>;  // ← 비구조화, any나 마찬가지
  };
  createdAt: string;
}
```

### 사용 현황

| 측면 | 상태 |
|------|------|
| `context` 읽는 곳 | **0곳** (production 코드에서 미사용) |
| `context` 쓰는 곳 | **0곳** (모든 DataPackage 생성 시 context 미설정) |
| `createChartSpecFromDataPackage()` | `pkg.columns`와 `pkg.id`만 사용, context 무시 |
| DataUploadPanel (유일한 생산자) | context 필드 자체를 안 넣음 |
| Zod 스키마 | 정의됨 (optional, strict), 미사용 |

**결론**: `context`는 **미래용 placeholder**로 정의만 되어 있고, 코드 영향 없이 자유롭게 재설계 가능.

### G3에서 context가 필요한 이유

| 기능 | 필요 데이터 | 출처 |
|------|------------|------|
| G3-1: "Graph Studio에서 열기" | 분석 메서드 ID → 에러바 자동 설정 | Smart Flow |
| G3-2: 유의성 마커 자동 배치 | 그룹 비교 결과 (group1, group2, pValue) | Smart Flow |
| 향후: Bio-Tools 연동 | 생태 지수 비교 결과 | Bio-Tools |
| 향후: 논문 작성 도구 | 검정통계량, 효과크기, 해석 문장 | Smart Flow / Bio-Tools |

---

## 2. 기각된 설계안

### 안 A: 현재 구조 유지 (summary: Record<string, unknown>)

```typescript
context?: {
  method?: string;
  summary?: Record<string, unknown>;  // 뭐든 넣어
}
```

**기각 이유**: 타입 안전성 없음. 소비자가 `summary.pValue as number` 같은 unsafe 캐스팅 필수. `any` 금지 프로젝트 규칙(CLAUDE.md) 위반.

### 안 B: 소비자 중심 intent 패턴

```typescript
// 각 소비자가 자기 intent를 정의
chartIntent?: ChartIntent;     // Graph Studio용
paperIntent?: PaperIntent;     // 논문 도구용 (향후)
reportIntent?: ReportIntent;   // 리포트 도구용 (향후)
```

**기각 이유**: 소비자 추가될 때마다 DataPackage 타입 수정 필요. 생산자가 소비자의 도메인 언어를 알아야 함. 결합도 증가.

### 안 C: 제네릭 타입

```typescript
interface DataPackage<S extends DataSource = DataSource> {
  source: S;
  context?: DataPackageContextMap[S];
}
```

**기각 이유**: 과도한 엔지니어링. Zustand store, IndexedDB 직렬화, 컴포넌트 props에서 제네릭 전파가 복잡해짐.

---

## 3. 제안 설계: analysisContext (생산자 중심)

### 핵심 원칙

> **생산자는 "무슨 분석을 했는가"를 기술하고, 소비자는 각자 해석한다.**

- Graph Studio: `comparisons` → significance bracket
- 논문 도구: `comparisons` + `testInfo` → "t(28) = 3.12, p = .003"
- 리포트: `interpretation` → 해석 문장

### 제안 타입

```typescript
// stats/types/graph-studio.ts — DataPackage 내

export interface DataPackage {
  id: string;
  source: 'smart-flow' | 'bio-tools' | 'upload' | 'species-checker';
  label: string;
  columns: ColumnMeta[];
  data: Record<string, unknown[]>;
  createdAt: string;

  /** 분석 맥락 — 생산자가 "무슨 분석을 했는가"를 기술 */
  analysisContext?: AnalysisContext;
}

export interface AnalysisContext {
  /** 분석 방법 ID (statistical-methods.ts 기준) */
  method?: string;

  /** 전체 p-value (주 검정 결과) */
  pValue?: number;

  /** 그룹 간 비교 결과 목록 */
  comparisons?: Comparison[];

  /** 그룹별 기술통계 */
  groupStats?: GroupStat[];

  /** 검정 통계량 상세 */
  testInfo?: TestInfo;
}

export interface Comparison {
  group1: string;
  group2: string;
  pValue: number;
  significant: boolean;
  /** 보정 방법 (e.g., "Tukey HSD", "Bonferroni") */
  adjustmentMethod?: string;
  meanDiff?: number;
}

export interface GroupStat {
  name: string;
  mean: number;
  std: number;
  n: number;
  se?: number;      // std / sqrt(n)
  median?: number;
}

export interface TestInfo {
  statistic?: number;
  df?: number | [number, number];  // 단일 df 또는 [df1, df2]
  effectSize?: number;
  effectSizeType?: string;  // "cohen_d", "eta_squared", "r_squared" 등
}
```

### AnalysisResult → AnalysisContext 변환

Smart Flow의 기존 `AnalysisResult`(smart-flow.ts:437-507)에서 직접 매핑:

```typescript
// stats/lib/graph-studio/analysis-adapter.ts (향후 신규)

export function toAnalysisContext(result: AnalysisResult): AnalysisContext {
  return {
    method: result.method,
    pValue: result.pValue,
    comparisons: result.postHoc?.map(ph => ({
      group1: String(ph.group1),
      group2: String(ph.group2),
      pValue: ph.pvalueAdjusted ?? ph.pvalue,
      significant: ph.significant,
      meanDiff: ph.meanDiff,
    })),
    groupStats: result.groupStats?.map(gs => ({
      name: gs.name ?? '',
      mean: gs.mean,
      std: gs.std,
      n: gs.n,
      se: gs.std / Math.sqrt(gs.n),
      median: gs.median,
    })),
    testInfo: {
      statistic: result.statistic,
      df: result.df,
      effectSize: typeof result.effectSize === 'number'
        ? result.effectSize
        : result.effectSize?.value,
      effectSizeType: typeof result.effectSize === 'object'
        ? result.effectSize?.type
        : undefined,
    },
  };
}
```

### 소비자별 어댑터 (각 모듈 내부)

```typescript
// Graph Studio 어댑터 — stats/lib/graph-studio/chart-spec-utils.ts (향후)
function applyAnalysisContext(spec: ChartSpec, ctx: AnalysisContext): ChartSpec {
  // ctx.comparisons → spec.annotations (significance brackets)
  // ctx.groupStats → spec.errorBar 자동 설정
  // ctx.method가 t-test 계열 → errorBar.type = 'stderr'
}

// 논문 도구 어댑터 — 별도 모듈 (향후)
function formatStatisticalResult(ctx: AnalysisContext): string {
  // ctx.method + ctx.testInfo → "t(28) = 3.12, p = .003, d = 0.85"
}
```

---

## 4. 데이터 전달 흐름 (G3 전체)

```
Smart Flow (분석 완료)
  │
  │  AnalysisResult
  │       ↓
  │  toAnalysisContext(result)
  │       ↓
  │  DataPackage { source: 'smart-flow', analysisContext, data, columns }
  │       ↓
  │  IndexedDB.set(`graph-pkg-${pkgId}`, pkg)
  │  router.push(`/graph-studio?from=smart-flow&pkgId=${pkgId}`)
  │
  ▼
Graph Studio (마운트)
  │
  │  IndexedDB.get(`graph-pkg-${pkgId}`)
  │       ↓
  │  loadDataPackage(pkg)
  │       ↓
  │  createChartSpecFromDataPackage(pkg)   // columns 기반 차트 추론
  │       ↓
  │  applyAnalysisContext(spec, pkg.analysisContext)  // 자동 설정
  │       ↓
  │  ChartSpec (에러바 + 유의성 마커 자동 포함)
  │       ↓
  │  chartSpecToECharts(spec, rows) → ECharts 렌더링
```

---

## 5. 기존 타입과의 관계

### AnalysisResult (생산자 측) vs AnalysisContext (전달용)

| 필드 | AnalysisResult | AnalysisContext | 이유 |
|------|---------------|-----------------|------|
| method | `string` | `string` | 동일 |
| pValue | `number` | `number` | 동일 |
| statistic | `number` | `testInfo.statistic` | 구조 정리 |
| df | `number?` | `testInfo.df` | 구조 정리 |
| effectSize | `number \| EffectSizeInfo` | `testInfo.effectSize: number` | 단순화 |
| postHoc | `PostHocResult[]` | `comparisons: Comparison[]` | 소비자 중립 이름 |
| groupStats | `GroupStats[]` | `GroupStat[]` | 거의 동일 |
| coefficients | `CoefficientResult[]` | — | 시각화 불필요 |
| ssBetween/ssWithin | `number?` | — | 시각화 불필요 |
| additional | `Record<string, ...>` | — | 시각화 불필요 |
| interpretation | `string` | — | 소비자가 재생성 |

**원칙**: AnalysisContext는 AnalysisResult의 **부분집합** — 시각화·보고에 필요한 최소한만 전달.

### PostHocResult vs Comparison

```typescript
// 기존 (smart-flow.ts:396-404)
interface PostHocResult {
  group1: string | number       // ← number 허용
  group2: string | number       // ← number 허용
  meanDiff?: number
  zStatistic?: number           // ← 시각화에 불필요
  pvalue: number                // ← 네이밍: pvalue (camelCase 아님)
  pvalueAdjusted?: number       // ← 보정된 p-value
  significant: boolean
}

// 제안 (AnalysisContext)
interface Comparison {
  group1: string                // ← string으로 통일 (라벨)
  group2: string
  pValue: number                // ← camelCase 통일
  significant: boolean
  adjustmentMethod?: string     // ← 보정 방법명 추가
  meanDiff?: number
}
```

변환: `toAnalysisContext()`에서 `String(ph.group1)`, `ph.pvalueAdjusted ?? ph.pvalue` 처리.

---

## 6. Zod 스키마 변경

```typescript
// 현재 (chart-spec-schema.ts:212-223)
export const dataPackageSchema = z.object({
  // ...
  context: z.object({
    method: z.string().optional(),
    summary: z.record(z.string(), z.unknown()).optional(),
  }).strict().optional(),
  // ...
}).strict();

// 제안
const comparisonSchema = z.object({
  group1: z.string(),
  group2: z.string(),
  pValue: z.number(),
  significant: z.boolean(),
  adjustmentMethod: z.string().optional(),
  meanDiff: z.number().optional(),
}).strict();

const groupStatSchema = z.object({
  name: z.string(),
  mean: z.number(),
  std: z.number(),
  n: z.number().int().positive(),
  se: z.number().optional(),
  median: z.number().optional(),
}).strict();

const testInfoSchema = z.object({
  statistic: z.number().optional(),
  df: z.union([z.number(), z.tuple([z.number(), z.number()])]).optional(),
  effectSize: z.number().optional(),
  effectSizeType: z.string().optional(),
}).strict();

const analysisContextSchema = z.object({
  method: z.string().optional(),
  pValue: z.number().min(0).max(1).optional(),
  comparisons: z.array(comparisonSchema).optional(),
  groupStats: z.array(groupStatSchema).optional(),
  testInfo: testInfoSchema.optional(),
}).strict();

export const dataPackageSchema = z.object({
  id: z.string().min(1),
  source: z.enum(['smart-flow', 'bio-tools', 'upload', 'species-checker']),
  label: z.string().min(1),
  columns: z.array(columnMetaSchema).min(1),
  data: z.record(z.string(), z.array(z.unknown())),
  analysisContext: analysisContextSchema.optional(),
  createdAt: z.string().datetime(),
}).strict();
```

---

## 7. 변경 영향 범위

### 즉시 변경 (G3 착수 시)

| 파일 | 변경 | 난이도 |
|------|------|--------|
| `types/graph-studio.ts` | `context?` → `analysisContext?`, 새 인터페이스 4개 | 낮음 |
| `chart-spec-schema.ts` | Zod 스키마 교체 | 낮음 |
| `chart-spec-utils.ts` | `createChartSpecFromDataPackage` — context 미사용이므로 변경 없음 | 없음 |
| `graph-studio-store.ts` | 변경 없음 (DataPackage 통째 저장) | 없음 |
| `DataUploadPanel.tsx` | 변경 없음 (upload 경로는 analysisContext 안 넣음) | 없음 |
| 기존 테스트 | 변경 없음 (context 사용하는 테스트 없음) | 없음 |

### G3-1에서 추가

| 파일 | 역할 |
|------|------|
| `analysis-adapter.ts` (신규) | `AnalysisResult` → `AnalysisContext` 변환 |
| `ResultsActionStep.tsx` (수정) | "Graph Studio에서 열기" 버튼 + DataPackage 생성 |
| `GraphStudioPage.tsx` (수정) | URL pkgId → IndexedDB → loadDataPackage |
| `chart-spec-utils.ts` (수정) | `applyAnalysisContext()` 추가 |

### G3-2에서 추가

| 파일 | 역할 |
|------|------|
| `chart-spec-utils.ts` (수정) | `comparisons` → significance annotations 자동 생성 |

---

## 8. 리뷰 요청 사항

### 8-A. analysisContext 구조 적절성

- `Comparison` 인터페이스가 다양한 사후검정 결과를 충분히 표현하는가?
  - Tukey HSD, Bonferroni, Dunn 등
  - 비모수 검정 (Mann-Whitney, Kruskal-Wallis 사후검정)
  - CLD (Compact Letter Display) — `comparisons` 대신 `letters: { group, letter }[]`가 필요한가?
- `GroupStat`에 `ci` (신뢰구간)가 필요한가?
- `testInfo.df`가 `number | [number, number]`인데, F-검정의 df1/df2를 충분히 표현하는가?

### 8-B. 생산자-소비자 분리 원칙

- 생산자(Smart Flow)가 AnalysisContext를 구성할 때, 소비자(Graph Studio) 지식이 필요한 부분이 있는가?
- `applyAnalysisContext()`가 Graph Studio 모듈 내부에 있는 게 맞는가, 아니면 공유 유틸이어야 하는가?
- Bio-Tools가 통계 검정을 안 하는 도구인 경우 (예: 종 분포 히트맵), AnalysisContext가 비어있으면 되는가?

### 8-C. 확장성

- 논문 작성 도구가 AnalysisContext만으로 "t(28) = 3.12, p < .01, d = 0.85" 문장을 생성할 수 있는가?
- 회귀분석 결과 (coefficients, R², RMSE)는 AnalysisContext에 넣어야 하는가, 아니면 YAGNI인가?
- `source` 타입에 새 모듈 추가 시 (`'paper-tool'` 등) AnalysisContext 구조 변경이 필요한가?

### 8-D. 네이밍

- `analysisContext` vs `resultContext` vs `statisticalContext` — 어떤 이름이 가장 적절한가?
- Bio-Tools의 비통계 결과 (종 목록, 분포 데이터 등)를 `analysisContext`라고 부르는 게 맞는가?

### 8-E. 전달 메커니즘

- IndexedDB + URL pkgId 방식 (G3-1 Option B)의 리스크:
  - 브라우저 뒤로가기 시 pkgId가 유효한가?
  - IndexedDB 항목 정리 (TTL/LRU) 전략이 필요한가?
  - pkg 직렬화 크기 제한은? (연구 데이터셋 10만 행 이상)

### 8-F. 대안 검토

- DataPackage에 analysisContext를 넣지 않고, 별도 `AnalysisResultRef { resultId, source }` 필드만 넣고 소비자가 직접 원본을 조회하는 방식은?
  - 장점: DataPackage 크기 최소화, 원본 데이터 최신 보장
  - 단점: 소비자가 생산자 모듈에 의존, 모듈 간 결합도 증가

---

## 9. 핵심 코드 위치 (빠른 탐색용)

| 관심 영역 | 파일:줄 |
|-----------|---------|
| DataPackage 현재 타입 | `types/graph-studio.ts:260-273` |
| DataPackage Zod 스키마 | `chart-spec-schema.ts:212-223` |
| createChartSpecFromDataPackage | `chart-spec-utils.ts:311-315` |
| Graph Studio Store | `graph-studio-store.ts:64-87` |
| DataUploadPanel (유일한 생산자) | `components/graph-studio/DataUploadPanel.tsx:82-91, 220-227` |
| AnalysisResult 타입 | `types/smart-flow.ts:437-507` |
| PostHocResult 타입 | `types/smart-flow.ts:396-404` |
| GroupStats 타입 | `types/smart-flow.ts:420-426` |
| G3 기존 계획 | `docs/graph-studio/GRAPH_STUDIO_IMPROVEMENT_PLAN.md:255-304` |

---

## 10. 리뷰 시작 가이드

```bash
# 1. DataPackage 현재 타입 확인
cat stats/types/graph-studio.ts

# 2. AnalysisResult (변환 원본) 확인
sed -n '390,510p' stats/types/smart-flow.ts

# 3. 현재 소비 패턴 (context 미사용 확인)
grep -rn "\.context" stats/lib/graph-studio/ stats/components/graph-studio/

# 4. Zod 스키마
sed -n '212,230p' stats/lib/graph-studio/chart-spec-schema.ts

# 5. G3 기존 계획
sed -n '255,304p' stats/docs/graph-studio/GRAPH_STUDIO_IMPROVEMENT_PLAN.md
```

---

## 11. 리뷰 결과 통합 (2026-03-01)

> 1차 외부 AI 리뷰 (4건) + 내부 비판적 검토 (10건) + 2차 외부 리뷰 (3건) 통합.

---

### CRITICAL — 설계 변경 필수 (4건)

#### C-1: ANCOVA/MANOVA postHoc 스키마 불일치 → `toAnalysisContext()` 무효화

**문제**: `toAnalysisContext()`가 `String(ph.group1)`을 호출하지만, ANCOVA/MANOVA의 Python worker는 `group1`/`group2` 필드 자체가 없음.

```
Python Worker (worker2-hypothesis.py:1491, 2403)
  → {comparison: "Group1 vs Group2", pValue: ..., adjustedPValue: ...}
  #  ↑ group1/group2 분리 아님     ↑ pvalueAdjusted가 아닌 adjustedPValue

statistical-executor.ts:508 normalizePostHocComparisons()
  → group1 = comp.group1 → undefined
  → line 529: if (group1 === undefined) continue    🚨 전부 버려짐

result-transformer.ts:83
  → rec.group1 as string | number → undefined       🚨 또 버려짐
```

**결과**: ANCOVA/MANOVA 분석 결과에서 사후검정이 `comparisons: []`로 전달됨. G3 유의성 마커 자동 배치 완전 무효.

**보완**: P-3에서 정규화 로직 추가 필수.
- `comparison: "A vs B"` → group1/group2 파싱
- `adjustedPValue` → `pvalueAdjusted` 키 매핑
- MANOVA의 `variable` 필드 (DV별 비교) 처리 전략 결정

#### C-2: postHoc group 식별자가 정수 인덱스 → SignificanceMark 매칭 실패

**문제**: Worker3 사후검정 함수들이 group 식별자로 정수 인덱스(0, 1, 2)를 반환하는 경우 존재.

```typescript
// toAnalysisContext()
group1: String(ph.group1)  // → "0", "1", "2"

// ChartPreview.tsx:98
const idxA = categories.indexOf(mark.groupA);
// categories = ["Bass", "Bream", "Carp"]
// "0".indexOf → -1 → 브라켓 무시 (ChartPreview:100 continue)
```

**보완**: P-4에서 group name resolution 필수.
- `AnalysisResult.groupStats[].name`으로 인덱스 → 라벨 매핑
- groupStats가 없으면 원본 데이터의 그룹 변수 유니크 값으로 fallback
- `toAnalysisContext()`에 `groupNames?: string[]` 파라미터 추가 필요

#### C-3: 논문 도구 → AnalysisResult 원본 역참조 경로 부재

**문제**: 설계 §12에서 "논문 도구는 AnalysisResult 직접 조회"라 했지만, G3 전달 메커니즘은 **DataPackage만 IndexedDB에 저장**. AnalysisResult 원본은 전달 안 됨.

```
DataPackage (IndexedDB graph-studio-packages)
  → analysisContext ✅ (요약)
  → analysisResultId ❌ (없음) → 논문 도구가 원본 조회 불가

Smart Flow History (IndexedDB smart-flow-history)
  → AnalysisResult ✅ (원본) → 하지만 DataPackage에서 역참조 불가
```

**보완**: `DataPackage`에 `analysisResultId?: string` 추가 (P-5).
```typescript
export interface DataPackage {
  // ... 기존 필드 ...
  analysisContext?: AnalysisContext;
  /** Smart Flow 히스토리 원본 참조 ID (논문 도구 역참조용) */
  analysisResultId?: string;
}
```

#### C-4: `pAdjustMethod` 손실 지점이 executor 단계부터 — P-2 범위 부족

**문제** (2차 외부 리뷰 발견): `pAdjustMethod`는 Python 결과의 **최상위 필드**이고, `normalizePostHocComparisons()`는 `comparisons[]` 내부만 처리하므로 `pAdjustMethod`에 접근할 수 없음.

```
Python Worker3 (dunn_test, friedman_posthoc 등)
  → {pAdjustMethod: 'bonferroni', comparisons: [{group1, group2, ...}]}
                ↑ 최상위 필드

statistical-executor.ts:972
  → normalizePostHocComparisons(ghResult.comparisons)
  → comparisons 배열만 전달 — pAdjustMethod는 여기서 이미 버려짐    🚨

NormalizedPostHocComparison (line 54-62)
  → adjustmentMethod 필드 없음                                       🔴
```

**보완**: P-2 범위를 확장하여 executor 단계에서 `pAdjustMethod`를 추출:
1. `NormalizedPostHocComparison`에 `adjustmentMethod?: string` 추가 불가 (개별 비교 필드가 아님)
2. 대신 `StatisticalExecutorResult.additionalInfo`에 `postHocMethod?: string` 필드 추가
3. `result-transformer.ts`에서 `postHocMethod` → `AnalysisResult` 전달

---

### HIGH — 실장 전 해결 필요 (5건)

#### H-1: df 2자유도 정보 손실 — 손실 지점 3곳 확인

**데이터 흐름 (검증 완료)**:
```
Python Worker (worker3-nonparametric-anova.py:333-334)
  → {dfBetween: 2, dfWithin: 12}                    ✅ 2개 반환

pyodide-statistics.ts:534
  → df: [result.dfBetween, result.dfWithin]           ✅ 배열 보존

statistical-executor.ts:1202                          🚨 손실 지점 1
  → df: Array.isArray(result.df) ? result.df[0] : result.df

anova-executor.ts:55                                  🚨 손실 지점 2 (2차 리뷰 발견)
  → df: Array.isArray(anovaResult.df) ? anovaResult.df[0] : anovaResult.df

StatisticalExecutorResult.mainResults.df              🔴 원천 타입 (2차 리뷰 발견)
  → df?: number  (line 88) — 배열 타입 자체를 허용 안 함

smart-flow.ts:441
  → df?: number                                       🔴 최종 타입도 단일 값
```

**보완 (P-1 확장)**:
1. `StatisticalExecutorResult.mainResults.df` 타입을 `number | [number, number]`로 변경
2. `statistical-executor.ts:1202` — 배열 그대로 전달
3. `anova-executor.ts:55` — 배열 그대로 전달
4. `AnalysisResult.df` 타입을 `number | [number, number]`로 변경
5. `result-transformer.ts` — 배열 보존 패스스루
6. 기존 소비자 호환: `typeof df === 'number' ? df : df[0]` 가드 패턴

#### H-2: IndexedDB 버전 충돌 위험

현재 **동일 DB명 `smart-flow-history`를 2개 파일이 서로 다른 버전으로 사용**:

| 파일 | DB_VERSION | stores |
|------|-----------|--------|
| `indexeddb.ts:14` | 1 | `analyses` |
| `indexeddb-adapter.ts:17` | 2 | `analyses`, `sync_queue`, `favorites` |

G3이 `graph_studio_packages` store를 추가하면 version 충돌 발생.

**보완**: G3용 **별도 DB** (`graph-studio-packages`) 생성. 기존 DB 건드리지 않음.

#### H-3: `comparisonMeta.alpha` 값의 출처 불명

`ComparisonMeta.alpha`가 필요하지만, 현재 파이프라인에서 사용자 설정 유의수준이 `AnalysisResult`에 포함되지 않음. Python worker 내부에서 `alpha=0.05` 하드코딩.

**보완**: `toAnalysisContext()`에서 `alpha: 0.05` 하드코딩 (사실상 모든 검정이 0.05 사용). 향후 사용자 커스텀 alpha 지원 시 파이프라인에 추가.

#### H-4: `allPairsIncluded` 판별 로직

전쌍 포함 여부를 판단하려면 총 그룹 수 `k`를 알아야 함 → `C(k,2) = k*(k-1)/2` 비교.

**보완**: `toAnalysisContext()`에서 다음 로직 사용:
```typescript
const k = result.groupStats?.length;
const nComparisons = result.postHoc?.length;
const allPairsIncluded = k !== undefined && nComparisons !== undefined
  && nComparisons === k * (k - 1) / 2;
```
`groupStats`가 없으면 `allPairsIncluded: false` (보수적 처리).

#### H-5: `PostHocResult` 타입 3중 정의 — P-2 범위 한정 필요

프로젝트에 `PostHocResult`가 3곳에 서로 다르게 정의:

| 위치 | group 타입 | pValue 키 | 용도 |
|------|-----------|-----------|------|
| `smart-flow.ts:396` (A) | `string\|number` | `pvalue` | Smart Flow UI |
| `statistics.ts:385` (B) | — (comparisons 배열) | — | 레거시 통계 페이지 |
| `lib/statistics/types.ts:75` (C) | `string` | `pValue` | 레거시 JS 계산 |

**보완**: P-2는 Smart Flow 타입(A)만 수정. 레거시(B, C)는 CLAUDE.md "레거시, 신규 개발 안 함" 규칙에 따라 건드리지 않음.

---

### MEDIUM — 개선 권고 (4건)

#### M-1: `Comparison.adjustmentMethod` vs `ComparisonMeta.adjustmentMethod` 중복

둘 다 보정 방법을 저장. 일반적으로 한 분석에서 모든 비교가 동일한 보정 방법을 사용하므로 개별 비교에 넣는 것은 중복.

**결정**: `Comparison`에서 `adjustmentMethod` 제거, `ComparisonMeta`에만 유지.

#### M-2: `EffectSizeInfo.interpretation` 손실

`AnalysisResult.effectSize`가 `number | EffectSizeInfo`이고, `EffectSizeInfo`는:
```typescript
{ value: number; type: string; interpretation: string }  // "작은 효과" 등
```
`TestInfo`는 `effectSize: number` + `effectSizeType: string`만 보존. `interpretation` 문자열은 버려짐.

**결정**: YAGNI 유지. Graph Studio에서 불필요. 논문 도구는 C-3(analysisResultId)로 원본 조회.

#### M-3: Bio-Tools 생산자의 `analysisContext` 형태 미정의

Bio-Tools의 일부 도구(다양성 지수 비교)는 통계 검정을 포함하지만, 다른 도구(종 목록)는 순수 데이터만 반환.

**결정**: Bio-Tools 경로는 `analysisContext: undefined` 기본. 통계 비교가 있는 도구만 선택적으로 `analysisContext`를 채움. Bio-Tools용 `toAnalysisContext()` 어댑터는 해당 도구 구현 시 작성.

#### M-4: 회귀 결과 YAGNI 재확인

검증된 소비자:

| 소비자 | regression 사용? | 데이터 출처 |
|--------|-----------------|------------|
| Graph Studio (trendline) | 자체 OLS 계산 | `echarts-converter.ts:427-447` |
| MethodSpecificResults.tsx | `additional.rSquared` | `AnalysisResult` 직접 |
| export-data-builder.ts | `coefficients[]` | `AnalysisResult` 직접 |

**결론**: AnalysisContext에 회귀 데이터 = **여전히 YAGNI**. 논문 도구는 `analysisResultId`(C-3)로 원본 조회.

---

### 선행 수정 사항 — 구현 상태 + 구체적 코드 변경 (4차 검증 반영)

#### 현재 상태 (4차 내부 검증 결과)

| # | 작업 | 타입 선언 | 런타임 구현 | 상태 |
|---|------|----------|-----------|------|
| P-1 | `df` 배열 보존 | `number \| [number, number]` ✅ | `result.df as [number, number]` ✅ | **완료** |
| P-2 | `postHocMethod` 보존 | 선언됨 (line 115, 455) ✅ | **값 미할당** — executor 3곳 모두 누락 | **유령 구현** |
| P-3 | ANCOVA/MANOVA postHoc | — | 3중 장벽: ①추출 안 됨 ②group 키 불일치 ③p값 키 불일치 | **미착수** |
| P-4 | group ID → 그룹명 매핑 | — | `tukeyHSDWorker` 시그니처에 groupNames 없음 → 후처리 전환 필요 | **미착수** |
| P-5 | `analysisResultId` | `graph-studio.ts:323` ✅ | `chart-spec-schema.ts:259` ✅ | **완료** |

> **4차 검증 주요 발견**: 3차 리뷰의 P-5 "미착수" 판정은 **오류**. 잘못된 라인 참조(262, 212)로 인해 이미 구현된 코드를 미확인. 실제 구현: `graph-studio.ts:323`, `chart-spec-schema.ts:259`.

#### P-1: 완료 — 더 이상 변경 불필요

타입과 코드 모두 업데이트됨:
- `StatisticalExecutorResult.mainResults.df?: number | [number, number]` (line 88)
- `statistical-executor.ts:1203` — `result.df as [number, number]` (배열 보존)
- `anova-executor.ts:55` — `anovaResult.df as [number, number]` (배열 보존)
- `AnalysisResult.df?: number | [number, number]` (smart-flow.ts:441)
- `result-transformer.ts:235` — `mainResults.df` 패스스루

#### P-2: postHocMethod 런타임 할당 — 구체적 변경 사항

**문제**: `additionalInfo.postHocMethod` 필드가 선언되어 있고, transformer가 읽기를 시도하지만 (line 245), executor가 **한 번도 값을 넣지 않아** 항상 `undefined`.

**변경 필요 코드 (4곳)**:

```typescript
// ① statistical-executor.ts:1209-1215 — Pyodide 기반 ANOVA 사후검정
additionalInfo: {
  effectSize: { ... },
  postHoc: postHoc,
  postHocMethod: 'games-howell',  // ← 추가 (Games-Howell 성공 시)
},

// ② statistical-executor.ts:972-989 — Games-Howell 직접 호출
additionalInfo: {
  postHoc,
  postHocMethod: 'games-howell',  // ← 추가
},

// ③ statistical-executor.ts:1169-1185 — fallback 분기에서 실제 사용된 메서드 추적
let postHocMethodUsed: string | undefined;
try {
  const ghResult = await pyodideStats.gamesHowellTest(groups, groupNames);
  postHoc = this.normalizePostHocComparisons(ghResult?.comparisons);
  postHocMethodUsed = 'games-howell';
} catch {
  try {
    const tukeyResult = await pyodideStats.tukeyHSD(groups);
    postHoc = this.normalizePostHocComparisons(tukeyResult?.comparisons);
    postHocMethodUsed = 'tukey';
  } catch {
    try {
      const bonferroniResult = await pyodideStats.performBonferroni(groups, groupNames);
      postHoc = this.normalizePostHocComparisons(bonferroniResult.comparisons);
      postHocMethodUsed = 'bonferroni';
    } catch { ... }
  }
}
// ...
additionalInfo: {
  postHoc,
  postHocMethod: postHocMethodUsed,  // ← 실제 사용된 메서드
},

// ④ Worker3 Dunn test (pyodide-statistics.ts:1034) — pAdjust 파라미터 보존
// dunnTest은 pAdjust='holm' 파라미터를 받음 → 결과에 pAdjustMethod 반환
// → normalizePostHocComparisons 외부에서 별도 추출 필요
```

**Open Question** (3차 리뷰어 질문): `comparisonMeta.adjustmentMethod`의 소스가 `AnalysisResult.postHocMethod` 단일값으로 확정인가?
→ **확정.** 한 분석에서 사후검정 보정 방법은 하나. 혼합 케이스(fallback 체인)에서는 최종 성공한 메서드명만 보존.

#### P-3: ANCOVA/MANOVA postHoc 정규화 — 구체적 변경 사항 (4차 검증 보강)

**문제**: 3중 장벽으로 ANCOVA postHoc 데이터가 완전 유실됨.

| # | 장벽 | 코드 위치 | 상세 |
|---|------|-----------|------|
| ① | **추출 안 됨** | `statistical-executor.ts:1065` | `additionalInfo: {}` — ANCOVA postHoc가 rawResults에만 저장, additionalInfo로 미추출 |
| ② | **group 키 불일치** | `normalizer:528-530` vs `worker2:1492` | Python: `comparison: "A vs B"` → normalizer: `group1`/`group2`만 처리 → 전부 `continue` |
| ③ | **p값 키 불일치** | `normalizer:548-555` vs `worker2:1497` | Python: `adjustedPValue` → normalizer: `pvalueAdjusted`/`pValueAdjusted`/`adjusted_p`만 처리 → 미매핑 |

> 장벽 ①이 최우선이지만, ①을 해결해도 ②③이 남아 있어 3곳 모두 수정 필수.

**변경 필요 코드 (2곳)**:

```typescript
// ① normalizePostHocComparisons() — comparison 키 파싱 + adjustedPValue 키 추가
// statistical-executor.ts:508-559
private normalizePostHocComparisons(
  comparisons: unknown
): NormalizedPostHocComparison[] {
  // ... 기존 로직 ...
  const comp = item as Record<string, unknown>;

  // P-3 장벽②: group1/group2가 없으면 comparison 문자열 파싱 시도
  let group1 = comp.group1 as string | number | undefined;
  let group2 = comp.group2 as string | number | undefined;
  if (group1 === undefined || group2 === undefined) {
    const comparison = comp.comparison as string | undefined;
    if (comparison && comparison.includes(' vs ')) {
      const parts = comparison.split(' vs ');
      group1 = parts[0].trim();
      group2 = parts[1].trim();
    }
  }
  if (group1 === undefined || group2 === undefined) continue;

  // P-3 장벽③: adjustedPValue 키 매핑 추가
  pvalueAdjusted:
    (comp.pvalueAdjusted as number | undefined) ??
    (comp.pValueAdjusted as number | undefined) ??
    (comp.adjustedPValue as number | undefined) ??  // ← ANCOVA/MANOVA Python worker 키
    (comp.adjusted_p as number | undefined),
}

// ② P-3 장벽①: ANCOVA executor — additionalInfo에서 postHoc 추출
// statistical-executor.ts:1065
additionalInfo: {
  postHoc: this.normalizePostHocComparisons(ancovaResult.postHoc),  // ← {} 대신 추출
  postHocMethod: 'bonferroni',  // P-2: ANCOVA는 기본 bonferroni
},
```

**스코프 결정**: P-3은 G3 필수. ANCOVA는 Smart Flow 주요 메서드. MANOVA `variable` 필드(DV별 비교)는 Phase 2 유예.

#### P-4: group ID → 그룹명 매핑 — 구체적 변경 사항 (4차 검증 보강)

**문제**: `tukeyHSD(groups)` 호출 시 `groupNames` 미전달 (line 1173). Python 결과에 정수 인덱스 반환됨.

**4차 검증 결과**: `tukeyHSDWorker(groups: number[][])` 시그니처 자체에 groupNames 파라미터가 **없음** (line 1180). 단순 파라미터 추가로는 해결 불가.

**해결 전략 (2안 중 택일)**:
1. ~~`tukeyHSDWorker` API 확장~~ — Python worker 수정 필요, 영향 범위 큼
2. **`toAnalysisContext()`에서 후처리** — `analysis-adapter.ts:25-31`에 `resolveGroupName()` 이미 구현됨 ✅

→ **안 2 채택**: executor 수준 변경 없이 adapter에서 인덱스→라벨 변환. `resolveGroupName()`이 `groupStats[idx].name`으로 매핑하므로 기존 코드로 대응 가능.

#### P-5: DataPackage.analysisResultId — ✅ 완료 (4차 검증 확인)

3차 리뷰에서 "미착수"로 판정되었으나, 4차 검증에서 **이미 구현 완료** 확인:
- `types/graph-studio.ts:323` — `analysisResultId?: string;` ✅
- `chart-spec-schema.ts:259` — `analysisResultId: z.string().optional()` ✅

3차 리뷰어가 잘못된 라인 참조(262, 212)로 기존 구현을 미확인.

#### 의존 관계 (4차 검증 업데이트)

```
P-1 (df 보존)              ← ✅ 완료
P-2 (postHocMethod 할당)   ← 즉시 착수 가능 (타입 이미 존재)
P-3 (ANCOVA 정규화)        ← P-2 이후 (postHocMethod 패턴 재사용)
P-4 (group ID 매핑)        ← adapter 후처리로 전환 (executor 변경 불필요)
P-5 (analysisResultId)     ← ✅ 완료

P-1 ✅ ─────────────────────┐
P-2 → P-3 ─────────────────┤
P-4 (adapter 후처리) ─────────┤  ← P-3과 독립 (executor 미변경)
P-5 ✅ ─────────────────────┤
                             └→ G3 착수
```

> **변경**: P-4가 P-3과 **독립**으로 전환됨. executor 수준 변경 없이 `analysis-adapter.ts`의 `resolveGroupName()`으로 대응하므로, P-3 완료를 기다릴 필요 없음.

---

### 수정된 제안 타입 (최종)

```typescript
// ─── DataPackage 확장 ───

export interface DataPackage {
  id: string;
  source: 'smart-flow' | 'bio-tools' | 'upload' | 'species-checker';
  label: string;
  columns: ColumnMeta[];
  data: Record<string, unknown[]>;
  createdAt: string;

  /** 분석 맥락 — 생산자가 "무슨 분석을 했는가"를 기술 */
  analysisContext?: AnalysisContext;
  /** Smart Flow 히스토리 원본 참조 ID (논문 도구 역참조용) */
  analysisResultId?: string;
}

// ─── AnalysisContext ───

export interface AnalysisContext {
  /** 분석 방법 ID (statistical-methods.ts 기준) */
  method?: string;
  /** 전체 p-value (주 검정 결과) */
  pValue?: number;
  /** 그룹 간 비교 결과 목록 */
  comparisons?: Comparison[];
  /** 그룹별 기술통계 */
  groupStats?: GroupStat[];
  /** 검정 통계량 상세 */
  testInfo?: TestInfo;
  /** 비교 분석 메타 — CLD 생성에 필요한 조건 */
  comparisonMeta?: ComparisonMeta;
}

export interface Comparison {
  group1: string;
  group2: string;
  pValue: number;
  significant: boolean;
  meanDiff?: number;
  // adjustmentMethod는 ComparisonMeta로 이동 (M-1)
}

export interface GroupStat {
  name: string;
  mean: number;
  std: number;
  n: number;
  se?: number;
  median?: number;
}

export interface TestInfo {
  statistic?: number;
  df?: number | [number, number];
  effectSize?: number;
  effectSizeType?: string;
}

export interface ComparisonMeta {
  /** 유의수준 (기본 0.05) */
  alpha: number;
  /** 보정 방법 (e.g., "tukey", "bonferroni", "dunn") */
  adjustmentMethod: string;
  /** 모든 쌍이 포함되어 있는지 (false면 CLD 생성 불가) */
  allPairsIncluded: boolean;
}
```

### 수정된 toAnalysisContext() 어댑터 (최종)

```typescript
export function toAnalysisContext(
  result: AnalysisResult,
  groupNames?: string[],  // P-4: 정수 인덱스 → 라벨 매핑용
): AnalysisContext {
  // P-4: group ID 매핑 함수
  const resolveGroupName = (raw: string | number): string => {
    if (typeof raw === 'string') return raw;
    // 정수 인덱스 → groupNames 또는 groupStats.name으로 매핑
    if (groupNames && groupNames[raw] !== undefined) return groupNames[raw];
    const gs = result.groupStats?.[raw];
    if (gs?.name) return gs.name;
    return String(raw);  // fallback
  };

  // H-4: allPairsIncluded 판별
  const k = result.groupStats?.length;
  const nComparisons = result.postHoc?.length;
  const allPairsIncluded = k !== undefined && nComparisons !== undefined
    && nComparisons === k * (k - 1) / 2;

  return {
    method: result.method,
    pValue: result.pValue,
    comparisons: result.postHoc?.map(ph => ({
      group1: resolveGroupName(ph.group1),
      group2: resolveGroupName(ph.group2),
      pValue: ph.pvalueAdjusted ?? ph.pvalue,
      significant: ph.significant,
      meanDiff: ph.meanDiff,
    })),
    groupStats: result.groupStats?.map(gs => ({
      name: gs.name ?? '',
      mean: gs.mean,
      std: gs.std,
      n: gs.n,
      se: gs.std / Math.sqrt(gs.n),
      median: gs.median,
    })),
    testInfo: {
      statistic: result.statistic,
      df: result.df,
      effectSize: typeof result.effectSize === 'number'
        ? result.effectSize
        : result.effectSize?.value,
      effectSizeType: typeof result.effectSize === 'object'
        ? result.effectSize?.type
        : undefined,
    },
    // P-2 + H-3: ComparisonMeta는 executor 메타에서 추출
    ...(result.postHoc && result.postHoc.length > 0 ? {
      comparisonMeta: {
        alpha: 0.05,  // H-3: 현재 하드코딩, 향후 파이프라인 추가
        adjustmentMethod: result.postHocMethod ?? 'unknown',
        allPairsIncluded,
      },
    } : {}),
  };
}
```

---

## 12. 요약: 핵심 설계 결정

| 결정 | 선택 | 근거 |
|------|------|------|
| context 구조 | `analysisContext` (생산자 중심) | 소비자 추가 시 DataPackage 변경 불필요 |
| 타입 안전성 | 구조화된 인터페이스 | `Record<string, unknown>` 제거, `any` 금지 규칙 준수 |
| 변환 위치 | 생산자 모듈 내 어댑터 | 각 생산자가 자기 결과를 AnalysisContext로 변환 |
| 해석 위치 | 소비자 모듈 내 어댑터 | Graph Studio/논문 도구 각자 AnalysisContext 해석 |
| 전달 메커니즘 | IndexedDB + URL pkgId | 모듈 간 결합도 최소, 대용량 지원. **별도 DB 사용** (H-2) |
| 원본 역참조 | `analysisResultId` (C-3) | 논문 도구가 AnalysisResult 원본 조회 가능 |
| 구현 시점 | P-1~P-5 선행 수정 → G3 착수 | upstream 데이터 손실·정규화 먼저 해결 |
| 회귀 결과 | AnalysisContext에 미포함 (YAGNI) | 논문 도구는 analysisResultId로 원본 직접 조회 |
| CLD 지원 | `comparisonMeta` 추가 | alpha + adjustmentMethod + allPairsIncluded 필요 |
| adjustmentMethod 위치 | `ComparisonMeta`에만 (M-1) | 개별 비교 중복 제거, 전체 분석에 1개 |
| group ID 매핑 | `toAnalysisContext(groupNames?)` (C-2) | 정수 인덱스 → 라벨 변환으로 SignificanceMark 호환 |
| Bio-Tools | `analysisContext: undefined` 기본 (M-3) | 통계 비교 있는 도구만 선택적 채움 |

---

## 13. 발견사항 이력

| 출처 | 건수 | 상세 |
|------|------|------|
| 1차 외부 AI 리뷰 | 4건 | HIGH-1 (df 손실), HIGH-2 (adjustmentMethod), MED-1 (CLD), MED-2 (YAGNI) |
| 내부 비판적 검토 | 10건 | C-1~C-3 (ANCOVA 정규화, group ID, 역참조), H-1~H-4, M-1~M-3 |
| 2차 외부 리뷰 | 3건 | C-4 (P-2 범위 부족), H-1 보강 (df 손실 3곳), P-1 타입 원천 |
| 3차 외부 리뷰 | 4건 | P-2 유령 구현, P-3 ANCOVA 미구현, P-4 groupNames 미전달, P-5 타입 미선언 |
| 3차 검증 결과 | — | P-1 완료 확인. P-2~P-5 구체적 코드 변경 사양 추가 |
| **4차 내부 검증** | **3건** | P-5 오판정 (이미 완료), P-3 3중 장벽, P-4 API 제약 (후처리 전환) |
| **5차 비판적 검토** | **3건** | **5C-1**: P-2 범위 누락 (executor 4곳, 계획은 3곳), **5C-2**: P-3 전제 오류 (`ancovaResult.postHoc` 미존재), **5M-1**: `toAnalysisContext()` dead code |
| **6차 외부 AI 리뷰** | **5건** | **6C-1**: Worker2 `effectSize`/`effect_size` 오타 (런타임 크래시), **6H-1**: WebWorker 패키지 맵 불일치 (Worker2에 statsmodels 미로드), **6M-1~3**: P-3/P-2 확인 + 다요인 ANCOVA 미노출 |

### 4차 검증 상세

**검증 방법**: Grep/Read로 실제 코드 라인 대조. 리뷰어의 라인 참조·주장을 코드와 1:1 매칭.

| Finding | 리뷰어 판정 | 4차 검증 결과 | 차이 |
|---------|-----------|-------------|------|
| P-2 | 유령 구현 | **정확** | — |
| P-3 | 2개 이슈 (추출 안 됨 + normalizer 불일치) | **3중 장벽** (추출 + group 키 + p값 키) | `adjustedPValue` 키 미매핑 추가 발견 |
| P-4 | "groupNames 전달하면 해결" | **API 자체 미지원** | `tukeyHSDWorker` 시그니처 제약 → 후처리 전환 |
| P-5 | 미착수 | **이미 완료** (graph-studio.ts:323, schema:259) | 잘못된 라인 참조(262, 212) |

**Verification 한계**: 리뷰어가 실행한 3개 테스트(`result-transformer.test.ts`, `g2-3-deep-review.test.ts`, `tsc`)는 P-2~P-4 이슈를 커버하지 않음. `postHocMethod`, `ANCOVA`, `adjustedPValue`, `groupNames` 키워드가 테스트 파일에 **0건**.

---

## 14. 5차 비판적 검토 (4차 검증 후 재검토)

### CRITICAL — 계획 자체의 결함 (2건)

#### 5C-1: P-2 계획이 executor 2곳 누락

**발견**: 계획은 `statistical-executor.ts`의 3곳만 언급했지만, **executor 서브디렉토리에 2곳 추가**:

| # | 파일 | 라인 | 메서드 | 계획 포함? |
|---|------|------|--------|----------|
| 1 | `statistical-executor.ts` | 996 | Games-Howell 직접 | ✅ |
| 2 | `statistical-executor.ts` | 1209 | ANOVA fallback | ✅ |
| 3 | `anova-executor.ts` | 228 | Tukey/GH standalone | ❌ **누락** |
| 4 | `nonparametric-executor.ts` | 209 | Dunn's test standalone | ❌ **누락** |

Python worker도 4곳에서 `pAdjustMethod` 반환: `dunn_test` (L985), `nemenyi_test` (L1233), `paired_t_test_repeated` (L1341), `mcnemar_pairwise` (L1453).

> 참고: executor 서브디렉토리 결과는 `statistical-executor.ts:1351`의 `additionalInfo: executorResult.additionalInfo || {}`를 통해 흐르므로, 서브디렉토리에서 `postHocMethod`를 설정하면 자동 전파됨.

**수정**: P-2 범위를 4곳으로 확장.

#### 5C-2: P-3 핵심 전제 오류 — `ancovaResult.postHoc` 존재하지 않음

**발견**: P-3 계획의 `ancovaResult.postHoc`은 **존재하지 않는 필드**. Worker3 ANCOVA 반환 타입:

```typescript
interface AncovaResult {  // method-types.generated.ts
  fStatisticGroup: number
  pValueGroup: number
  fStatisticCovariate: number[]
  pValueCovariate: number[]
  adjustedMeans: Array<{ group: string | number; mean: number }>
  anovaTable: Record<string, unknown>
  // postHoc ❌ — 필드 없음
}
```

Worker3의 Python ANCOVA 함수(worker3:785-829)는 사후검정 자체를 수행하지 않음.

**대안 경로**: Worker2(`worker2-hypothesis.py`)에 `ancova_analysis()` 함수가 존재하며 `postHoc` 필드를 반환 (L1491-1501). 하지만 executor는 Worker3만 사용 중.

**선택지**:
| 안 | 접근 | 장점 | 단점 |
|----|------|------|------|
| A | Worker2 `ancova_analysis()` 활용 | postHoc 이미 구현됨 | executor 호출 경로 변경 필요 |
| B | Worker3 ANCOVA에 postHoc 추가 | executor 변경 최소 | Python 코드 수정 필요 |
| C | ANCOVA postHoc 없이 G3 진행 | 변경 없음 | 유의성 마커 미지원 (G3 목적 반감) |

→ **안 A' 채택** (6차 검증 보강): Worker2의 `ancova_analysis()`이 이미 `comparison: "A vs B"`, `adjustedPValue` 키를 사용하므로, P-3 normalizer 확장이 그대로 적용됨. 단, Worker2에 런타임 오타(6C-1)와 WebWorker 패키지 미로드(6H-1) 이슈가 있어 보강 필수.

### MEDIUM (1건)

#### 5M-1: `toAnalysisContext()`가 dead code

`analysis-adapter.ts`의 `toAnalysisContext()`는 구현 완료되었지만 **어디에서도 호출되지 않음** (import 0건). G3 구현 시 integration point가 필요:
- Smart Flow → Graph Studio 경로: ResultsActionStep에서 `toAnalysisContext()` 호출 → DataPackage에 포함
- `resolveGroupName()`은 정상 작동 확인 (numeric → groupNames lookup)

---

## 15. 6차 외부 AI 리뷰 검증 (옵션 A → A' 보강)

### CRITICAL (1건)

#### 6C-1: Worker2 `ancova_analysis()` 변수명 오타 — 런타임 크래시

**코드**: `worker2-hypothesis.py`

| 라인 | 코드 | 변수명 |
|------|------|--------|
| 1573 | `effectSize = "큰" if ...` | `effectSize` (camelCase) |
| 1578 | `f"...{effect_size} 효과크기..."` | `effect_size` (snake_case) ❌ |

`NameError: name 'effect_size' is not defined` 확정. 이 오류는 `interpretation` 딕트 구성 중 발생하므로, `mainEffects`/`postHoc`/`adjustedMeans`는 이미 빌드 완료 상태이지만, 함수 전체가 예외로 종료.

**수정**: `effect_size` → `effectSize` (L1578)

### HIGH (1건)

#### 6H-1: WebWorker 패키지 맵 불일치 — Worker2에 statsmodels/pandas 미로드

3곳의 Worker2 패키지 정의가 불일치:

| 파일 | Worker2 패키지 | 경로 |
|------|---------------|------|
| `pyodide-core.service.ts:191` | `['statsmodels', 'pandas']` | 코어 서비스 ✅ |
| `pyodide-worker.ts:161` | `[]` | WebWorker ❌ |
| `pyodide-init-logic.ts:152` | `[]` | 초기화 로직 ❌ |

Worker2 `ancova_analysis()` 내부 lazy import:
- L1339: `import pandas as pd`
- L1340-1341: `import statsmodels.api as sm`, `from statsmodels.formula.api import ols`

WebWorker 경로에서 Worker2 호출 시 `ModuleNotFoundError` 확정.

**수정**: `pyodide-worker.ts:161`과 `pyodide-init-logic.ts:152` 모두 Worker2를 `['statsmodels', 'pandas']`로 동기화.

### MEDIUM (3건)

#### 6M-1: P-3 normalizer 3중 장벽 — 재확인

`normalizePostHocComparisons()` (L509-563) 검증:
- L528-530: `group1`/`group2` 없으면 `continue` → Worker2 `comparison` 키 전부 skip
- L548-555: `adjustedPValue` 키 미인식

기존 진단과 일치. A' 작업에 포함 완료.

#### 6M-2: P-2 4곳 누락 — 재확인

| # | 파일:줄 | `postHocMethod` |
|---|---------|-----------------|
| 1 | `statistical-executor.ts:996` | ❌ |
| 2 | `statistical-executor.ts:1209` | ❌ |
| 3 | `anova-executor.ts:228` | ❌ |
| 4 | `nonparametric-executor.ts:209` | ❌ |

기존 진단과 일치. A' 작업에 포함 완료.

#### 6M-3: 다요인 ANCOVA — 현재 파이프라인 미노출

`variable-mapping.ts:173-174`: `mapping.groupVar = categoricalColumns[0].name` — 첫 categorical만 매핑. Worker2의 `factor_vars: List[str]` 다요인 지원은 현재 파이프라인에서 활용 불가.

**결정**: A' 범위 외. 단일 요인 ANCOVA만 대상. 다요인 지원은 향후 확장.

---

## 16. A' 최종 작업 세트 (6차 검증 반영)

### 구현 순서

| # | 작업 | 파일 | 리스크 |
|---|------|------|--------|
| A'-1 | Worker2 오타 수정: `effect_size` → `effectSize` | `worker2-hypothesis.py:1578` | Critical |
| A'-2 | WebWorker 패키지 맵 동기화 | `pyodide-worker.ts:161`, `pyodide-init-logic.ts:152` | High |
| A'-3 | ANCOVA wrapper 추가 + executor 전환 | `pyodide-statistics.ts`, `statistical-executor.ts:1011-1074` | Medium |
| A'-4 | normalizer 확장 (`comparison` 파싱 + `adjustedPValue`) | `statistical-executor.ts:509-563` | Medium |
| A'-5 | P-2: 4곳 `postHocMethod` 값 할당 | 4개 파일 (§14 5C-1 참조) | Medium |

### 의존 관계

```
A'-1 (오타 수정) ────────────┐
A'-2 (패키지 맵) ────────────┤
                              ├→ A'-3 (ANCOVA wrapper + executor 전환)
                              │       └→ A'-4 (normalizer 확장)
A'-5 (P-2 postHocMethod) ────┤  ← A'-3과 독립
P-4 (adapter 후처리) ─────────┤  ← adapter 기존 코드 활용
P-5 ✅ ──────────────────────┤
P-1 ✅ ──────────────────────┤
                              └→ G3 착수
```

### A'-3 상세: Executor ANCOVA 경로 전환

현재 (Worker3):
```typescript
// statistical-executor.ts:1042
const ancovaResult = await pyodideStats.ancovaWorker(yValues, groupValues, covariates)
```

전환 후 (Worker2):
```typescript
// 1. pyodide-statistics.ts에 wrapper 추가
async ancovaAnalysisWorker(
  dependentVar: string,
  factorVars: string[],
  covariateVars: string[],
  data: Array<Record<string, unknown>>
): Promise<Worker2AncovaResult>

// 2. statistical-executor.ts ANCOVA 경로 변경
const ancovaResult = await pyodideStats.ancovaAnalysisWorker(
  dependentVarName, [groupVarName], covariateVarNames, dataRows
)

// 3. additionalInfo에서 postHoc 추출
additionalInfo: {
  postHoc: this.normalizePostHocComparisons(ancovaResult.postHoc),
  postHocMethod: 'bonferroni',
  ...ancovaResult,
}
```

입력 변환: executor는 `data.arrays.y`, `data.arrays.group`, `data.arrays.covariate`를 갖고 있으나, Worker2는 `data: List[Dict]` 형식. 원본 `data.rows` (행 단위)에서 직접 구성 가능.

---

## 17. 7차 자체 검토: A' 구현 후 비판적 재검토 (2026-03-01)

A' 작업 세트 구현 완료 후 **자체 비판적 검토**를 수행. Critical 3건, High 2건, Medium 5건 발견하여 즉시 수정.

### 발견 및 수정 내역

#### CRITICAL — 전부 수정 완료

| ID | 문제 | 수정 |
|----|------|------|
| 7C-1 | `modelFit` 키 불일치: Python `modelPValue` vs TS `fPValue`, Python `rmse` 미반환 vs TS 기대 | Python에서 `modelPValue`→`fPValue`, `rmse` 계산 추가 (`worker2-hypothesis.py:1560-1567`) |
| 7C-2 | Worker3 패키지 맵 불일치: `pyodide-core.service.ts`만 `pandas` 포함, 나머지 2곳 누락 | `pyodide-worker.ts:163`, `pyodide-init-logic.ts:153` Worker3에 `pandas` 추가 |
| 7C-3 | `mainEffects[0]` 무방비 접근: 빈 배열 시 undefined | `mainEffects?.[0]`, `postHoc ?? []` 안전 접근 (`statistical-executor.ts:1050-1051`) |

#### HIGH — 전부 수정 완료

| ID | 문제 | 수정 |
|----|------|------|
| 7H-1 | `skipValidation: true` + 이중 캐스트 + Worker2Method 미등록 | `WorkerMethodParam[]` 유니온 추가 (`pyodide-core.service.ts:51`), `skipValidation` 제거, `ancova_analysis` Worker2Method 등록 (`method-types.generated.ts:1264`) |
| 7H-2 | `adjustedPValue` 우선순위 역전: Python 반환 키가 3번째에서 체크 | `adjustedPValue`를 1순위로 재정렬 (`statistical-executor.ts:557-566`) |

#### MEDIUM — 수정 또는 문서화 완료

| ID | 문제 | 조치 |
|----|------|------|
| 7M-1 | `comparison.split(' vs ')` limit 미지정 | `split(' vs ', 2)` 적용 |
| 7M-2 | `trim()` 후 빈 문자열 미검출 | `\|\| undefined` 가드 추가 |
| 7M-3 | 레거시 `ancovaWorker()` 잔존 | `@deprecated` JSDoc 추가. 테스트 매핑 참조로 즉시 삭제 불가 |
| 7M-4 | `power_analysis()` `effectSize` 파라미터 | Worker I/O 규칙상 camelCase 정상. 단, statsmodels API 키워드 불일치 (`effectSize` vs `effect_size`) — 별도 이슈 분리 |
| 7M-5 | A'-3 ANCOVA 단위 테스트 부재 | G3 테스트에서 통합 검증 예정 |

### 미해결 잔여 이슈

1. **`power_analysis()` statsmodels 키워드 불일치**: `solve_power(effectSize=...)` → statsmodels API는 `effect_size` 기대. `try-except`로 묵시적 실패 → 기본값 반환 중. 별도 수정 필요.
2. **레거시 `ancovaWorker()` 완전 제거**: `worker-function-mapping.test.ts` 및 `validate-worker-mapping.js`에서 참조. 매핑 테스트 업데이트 후 제거.
3. **A'-3 단위 테스트**: `modelFit` 키 매핑, postHoc 파싱, 빈 mainEffects 엣지 케이스 커버리지 필요.

### 검증 결과

```
tsc --noEmit: 0 errors ✅
pnpm test: 5390 passed, 0 failed, 13 skipped ✅
```

### §13 히스토리 업데이트

| 차수 | 방법 | 핵심 발견 |
|------|------|-----------|
| 1차 | 구조 분석 | context → analysisContext 필요, P-1~P-5 전제조건 도출 |
| 2차 | 코드 검증 | Worker 3종 차이, P-3 normalizer 3중 장벽 |
| 3차 | 설계 검증 | 안 A (Worker2 전환) vs 안 B (신규 Python) — 안 A 권장 |
| 4차 | 적정성 검토 | buildAnalysisContext 규모 ≈380줄, 기존 코드 재활용 가능 |
| 5차 | 외부 AI (1) | P-3 진단 재확인, 안 A' (보강) 채택 |
| 6차 | 외부 AI (2) | 6C-1 effectSize 오타, 6H-1 패키지 맵 불일치 |
| 7차 | 자체 비판적 | 7C-1~3 modelFit 계약 위반/Worker3 패키지/안전접근, 7H-1~2 타입 우회/우선순위 — 전부 수정 |
| 8차 | 외부 AI (3) | 8H-1 변수 매핑 키 불일치, 8M-1 데이터 타입 정제, 8M-2 modelFit 전달 유실 — 전부 수정 |

---

## 18. 8차 외부 AI 리뷰 결과 (2026-03-01)

### HIGH (1건) — 수정 완료

#### 8H-1: ANCOVA 변수 매핑 키 불일치

`statistical-executor.ts:1024-1025`에서 `data.variables.dependent`/`.group`만 읽었으나, `VariableMapping` 원본은 `dependentVar`/`groupVar` 키 사용. `prepareData()`는 ANCOVA에 대해 키 정규화를 하지 않으므로 `undefined` 가능.

**수정**: fallback 패턴 적용 (`dependent || dependentVar`, `group || groupVar`) — chi-square, survival 등 다른 분석과 동일 패턴.

### MEDIUM (2건) — 수정 완료

#### 8M-1: validRows 원본 행 전달 → 타입 불안정

`validRows.push(row)`로 원본 행을 전달하면 숫자형 문자열("3")이 그대로 Worker2에 도달. pandas DataFrame 생성 시 object dtype 처리 위험.

**수정**: 숫자형 필드(`dependentVar` + `covariateVars`)를 명시적 `Number()`로 변환한 `cleanRow`를 전달.

#### 8M-2: modelFit 중첩 객체 → transformer 유실

ANCOVA `additionalInfo.modelFit.rmse`로 중첩 전달하지만, `result-transformer.ts:185-186`은 `additionalInfo.rmse` (top-level)만 읽음.

**수정**: executor에서 `rSquared`, `adjustedRSquared`, `rmse`를 `additionalInfo` top-level에도 평탄화 추가. `modelFit` 객체는 rawResults 경로로 보존.

### 검증

```
tsc --noEmit: 0 errors ✅
pnpm test: 5390 passed, 0 failed, 13 skipped ✅
```
