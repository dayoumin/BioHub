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

## 11. 요약: 핵심 설계 결정

| 결정 | 선택 | 근거 |
|------|------|------|
| context 구조 | `analysisContext` (생산자 중심) | 소비자 추가 시 DataPackage 변경 불필요 |
| 타입 안전성 | 구조화된 인터페이스 | `Record<string, unknown>` 제거, `any` 금지 규칙 준수 |
| 변환 위치 | 생산자 모듈 내 어댑터 | 각 생산자가 자기 결과를 AnalysisContext로 변환 |
| 해석 위치 | 소비자 모듈 내 어댑터 | Graph Studio/논문 도구 각자 AnalysisContext 해석 |
| 전달 메커니즘 | IndexedDB + URL pkgId | 모듈 간 결합도 최소, 대용량 지원 |
| 구현 시점 | G3 착수 시 (현재 코드 영향 0) | context 미사용이므로 breaking change 없음 |
