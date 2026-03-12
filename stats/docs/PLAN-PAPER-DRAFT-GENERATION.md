# 논문 초안 생성 기능 (Paper Draft Generation)

**상태**: 계획 수립 완료, 구현 대기
**최종 업데이트**: 2026-03-12 (v6 — UX 시뮬레이션 리뷰 + 저장/복원)
**브랜치**: TBD (feature/paper-draft)

---

## 목적

통계 분석 완료 후, 분석 결과 데이터를 활용하여 **논문 Methods/Results/Discussion 섹션 초안**을 자동 생성한다.
연구자가 결과를 복사·붙여넣기할 필요 없이, 분석 맥락이 반영된 학술 문체 텍스트를 바로 얻을 수 있다.

### 핵심 가치

- **시간 절약**: 반복적인 Results 섹션 작성 자동화
- **정확성**: 분석 결과 수치가 APA 포맷으로 정확히 삽입됨
- **일관성**: 통계 보고 형식이 표준화됨

### 프로젝트 맥락

- **BioHub**: Next.js 15 기반 웹 통계 분석 플랫폼 (PC웹 + Tauri 데스크탑)
- **Smart Flow**: 52개 통계 메서드 (12카테고리) 통합 분석 파이프라인
- **통계 엔진**: Pyodide (SciPy/statsmodels/pingouin) — 브라우저 내 Python 실행
- **LLM**: 프로바이더 교체 가능한 추상화 계층 (현재 OpenRouter 경유). 결과 해석에 사용 중

---

## 설계 원칙: 하이브리드 접근 (템플릿 + LLM)

> **참고**: R의 [`report`](https://easystats.github.io/report/) 패키지와 [`papaja`](https://github.com/crsh/papaja)의 `apa_print()` 패턴에서 착안.
> 구조화된 통계 결과는 **템플릿 기반 결정론적 생성**, 해석이 필요한 부분만 **LLM 호출**.

### 왜 하이브리드인가?

| | 100% LLM | 하이브리드 (채택) |
|---|---|---|
| 수치 정확도 | LLM 환각 위험 | 템플릿이 직접 삽입 → **100% 정확** |
| API 비용 | 4섹션 모두 호출 | Discussion만 호출 → **~75% 절감** |
| 오프라인 | 불가 | Methods + Results + Caption 오프라인 가능 |
| 속도 | 4회 스트리밍 대기 | 3개 즉시 + 1개 스트리밍 |
| 재현성 | 매번 다른 문장 | Methods/Results 동일 입력 → 동일 출력 |
| API 의존 | 필수 | Discussion만 선택적 — API 없어도 핵심 가치 제공 |

### 섹션별 생성 전략

| 섹션 | 생성 방식 | 이유 |
|------|----------|------|
| **Methods** | 템플릿 | 구조가 고정적 (방법명 + 가정검정 + α + 소프트웨어) |
| **Results** | 템플릿 | 수치 보고가 핵심 — APA 포맷 결정론적 |
| **Captions** | 템플릿 | 표/그림 캡션 분리 생성 (`CaptionItem[]`) |
| **Discussion** | LLM | 해석·맥락·한계점 — 창의적 서술 필요 |

---

## 선결 과제: 데이터 계약 정리 (Phase 0)

> v2 리뷰에서 발견된 **기존 인프라와 실제 코드 간 불일치**를 먼저 해결해야 합니다.

### 0-1. 가정검정 정규화 유틸 신규 작성

**문제**: `StatisticalAssumptions`는 중첩 구조 (`normality.shapiroWilk.statistic` 등)인데, 현재 `export-data-builder.ts`의 가정검정 수집은 `name` 필드가 있는 flat 객체만 처리 → 대부분 수집 실패.

```typescript
// 현재 (동작 안 함)
if (a && typeof a === 'object' && 'name' in a) { ... }

// StatisticalAssumptions 실제 구조
{
  normality: {
    shapiroWilk: { statistic: 0.96, pValue: 0.712, isNormal: true },
    group1: { statistic: 0.94, pValue: 0.534, isNormal: true }
  },
  homogeneity: {
    levene: { statistic: 1.23, pValue: 0.277, equalVariance: true }
  }
}
```

**해결**: `flattenAssumptions(assumptions: StatisticalAssumptions)` 유틸 신규 작성.

```typescript
// 중첩 구조 → flat 배열 변환
interface FlatAssumption {
  category: 'normality' | 'homogeneity' | 'independence' | 'linearity' | 'sphericity' | ...
  testName: string           // 'Shapiro-Wilk', 'Levene', 'Mauchly' 등
  statistic?: number
  pValue?: number
  passed: boolean
  group?: string             // 'group1', 'group2' (정규성 그룹별 결과)
}

function flattenAssumptions(a: StatisticalAssumptions): FlatAssumption[]
```

- 이 유틸은 paper-draft뿐 아니라 기존 `export-data-builder.ts`도 개선 가능 (공유 유틸)
- 파일: `stats/lib/services/export/assumption-utils.ts` (export와 paper-draft 공용)

### 0-2. 메서드 메타데이터 plain 접근 함수

**문제 1**: `useTerminology()`는 React context 기반 훅 → 서비스 레이어(순수 함수)에서 호출 불가.
**문제 2**: terminology 시스템은 **locale(ko/en)이 아니라 domain(aquaculture/generic) 기반**. `ko.ts`/`en.ts` 파일은 없고, `domains/aquaculture.ts`(한글), `domains/generic.ts`(영문) 구조. domain과 locale이 1:1 매핑이 아님 (향후 영문 수산과학 도메인 가능).

**해결**: domain + locale을 함께 받는 plain 함수 작성.

```typescript
// 서비스용 — React 의존 없음
import { TERMINOLOGY_REGISTRY } from '@/lib/terminology/terminology-context'
import { STATISTICAL_METHODS } from '@/lib/constants/statistical-methods'

/** 메서드 표시명 조회 (registry 기반, terminology와 독립) */
function getMethodDisplayName(methodId: string, lang: 'ko' | 'en'): string {
  const method = STATISTICAL_METHODS[methodId]
  return lang === 'ko' ? method?.koreanName ?? methodId : method?.name ?? methodId
}

/** 도메인 사전 직접 접근 (React 의존 없음) */
function getDomainDictionary(domain: string): TerminologyDictionary {
  return TERMINOLOGY_REGISTRY[domain] ?? TERMINOLOGY_REGISTRY['generic']
}
```

- `useTerminology()` 훅은 UI 컴포넌트 전용으로 유지
- 서비스는 `STATISTICAL_METHODS` registry에서 메서드명 조회 (koreanName/name)
- 도메인 특화 용어는 `getDomainDictionary()`로 접근
- **locale과 domain을 혼동하지 않음** — 논문 언어(ko/en)와 도메인(aquaculture 등)은 별개 축

### 0-3. visualizationData 입력 계약 확인

**현황**: `AnalysisResult.visualizationData`는 이미 존재하며 **필드명은 `type`** (NOT `chartType`).

```typescript
// VisualizationData 실제 구조 (smart-flow.ts:460)
interface VisualizationData {
  type: string              // 'boxplot', 'scatter', 'bar', 'histogram' 등
  data: Record<string, unknown>
  options?: Record<string, unknown>
}
```

- Caption 템플릿에서 `r.visualizationData?.type`으로 접근 (chartType 아님)
- `chartType`은 Graph Studio 전용 (ECharts ChartType enum) — 혼동 주의
- 추가 변경 불필요 — 기존 타입 그대로 사용

### 0-4. methodId 안정 키 추가

**문제**: `analysisResult.method`는 한글 표시명(`'독립표본 t-검정'`)을 저장. registry key(`'t-test'`)가 아님.
executor에서 `this.createMetadata('독립표본 t-검정', ...)` 형태로 display name을 직접 전달.
이 상태로는 `METHOD_OVERRIDES[methodId]`나 `CATEGORY_TEMPLATES[category]` lookup이 불가.

```typescript
// 현재 (executor → result-transformer → AnalysisResult)
metadata: this.createMetadata('독립표본 t-검정', data.length, startTime)
//                              ↑ 표시명, registry key 아님

// AnalysisResult.method = '독립표본 t-검정' (불안정)
```

**해결**: `AnalysisResult`에 `methodId` 필드 추가 + 각 executor에서 registry key 전달.

```typescript
// AnalysisResult 확장
interface AnalysisResult {
  method: string      // 기존 — 표시명 (UI 호환성 유지)
  methodId: string    // 신규 — registry key ('t-test', 'paired-t', ...)
  // ...
}

// executor 수정 예시 (t-test-executor.ts)
metadata: {
  ...this.createMetadata('독립표본 t-검정', data.length, startTime),
  methodId: 't-test',  // 안정 키 추가
}
```

- `method`(표시명)은 기존 UI 호환을 위해 유지
- 템플릿 라우팅은 `methodId`를 사용: `METHOD_OVERRIDES[methodId] ?? CATEGORY_TEMPLATES[category]`
- `STATISTICAL_METHODS[methodId].category`로 카테고리 자동 조회
- **모든 executor에 `methodId` 추가 필요** — Phase 0에서 일괄 작업

---

## 기존 인프라 활용

| 자산 | 위치 | 활용 | 상태 |
|------|------|------|------|
| `ExportContext` | `lib/services/export/export-types.ts` | 결과 데이터 번들 | 그대로 사용 |
| `NormalizedExportData` | `export-data-builder.ts` | 포맷 독립 정규화 | 그대로 사용 |
| APA 포맷 문자열 | `result-converter.ts` | `t(28) = 2.45, p = .021` | 그대로 사용 |
| AI 해석 | `result-interpreter.ts` | Discussion 소재 | 그대로 사용 |
| `buildMethodologyText()` | `export-data-builder.ts` | Methods 초안 | **교체 필요** — 현재 5개 if/else 일반 문장만 |
| 가정검정 수집 | `export-data-builder.ts:278` | assumptions flat화 | **교체 필요** — `name` 필드 전제, 중첩 구조 미대응 |
| LLM 스트리밍 | `llm-recommender.ts` | Discussion 생성 | 그대로 사용 |
| DOCX 내보내기 | `docx-export.ts` | 논문 DOCX | 확장 가능 |

### 외부 참고 자료

| 도구 | 패턴 | BioHub 적용 |
|------|------|------------|
| R `report` 패키지 | `report(t.test(x,y))` → APA 문장 | Results 템플릿 모델 |
| R `papaja` `apa_print()` | 통계 객체 → 분리된 문자열 | APA 인라인 분리 패턴 |
| [paper-writer-skill](https://github.com/kgraph57/paper-writer-skill) | IMRAD (31개 템플릿 + 체크리스트) | 섹션 구조 + 품질 검증 참고 |
| [Gatsbi](https://www.gatsbi.com/) | AI 논문 파이프라인 | Discussion 프롬프트 참고 |

---

## 생성 섹션 (4개)

### 1. Methods (분석 방법) — 템플릿

**내용**: 사용한 통계 방법, 가정 검정 절차, 유의수준, 소프트웨어 인용
**데이터 소스**: `methodId`, `StatisticalAssumptions` (→ `flattenAssumptions()` 경유), `alpha`, `references`

**예시 출력 (한글)**:
> 두 집단 간 체장 차이를 검증하기 위해 독립표본 t-검정을 실시하였다. 분석에 앞서 Shapiro-Wilk 검정으로 정규성을(W = 0.96, p = .712; W = 0.94, p = .534), Levene 검정으로 등분산성을(F = 1.23, p = .277) 확인하였으며, 모든 가정이 충족되었다. 유의수준은 α = .05로 설정하였다. 통계 분석은 BioHub (SciPy 1.x 기반)를 사용하여 수행하였다.

### 2. Results (결과) — 템플릿

**내용**: 기술통계 + 검정 결과 + 효과 크기 + 신뢰구간 + 사후검정
**데이터 소스**: `statistic`, `pValue`, `df`, `effectSize`, `groupStats`, `postHoc`, `confidence`, `apaFormat`

**예시 출력 (한글)**:
> 독립표본 t-검정 결과, 암컷과 수컷 간 체장에 통계적으로 유의한 차이가 있었다 (*t*(28) = 2.45, *p* = .021, Cohen's *d* = 0.89). 암컷 집단(*M* = 15.3, *SD* = 2.1, *n* = 15)이 수컷 집단(*M* = 13.1, *SD* = 2.8, *n* = 15)보다 유의하게 높았으며, 평균 차이의 95% 신뢰구간은 [0.34, 4.06]이었다.

### 3. Table/Figure Caption (표·그림 캡션) — 템플릿

**내용**: 기술통계 표 캡션, 차트 캡션
**데이터 소스**: `groupStats`, `coefficients`, `methodId`, **`visualizationData.type`**

**예시 출력**:
> **Table 1.** 성별에 따른 체장(cm)의 기술통계량. 값은 평균 ± 표준편차로 표시하였다.
>
> **Figure 1.** 성별에 따른 체장 분포 (boxplot). 상자는 사분위 범위, 가운데 선은 중앙값, 수염은 1.5×IQR 범위를 나타낸다.

### 4. Discussion 소재 (해석·한계·후속) — LLM 생성

**내용**: 결과 해석, 연구 한계점, 후속 연구 제안
**데이터 소스**: 템플릿 생성된 Results 텍스트 + 원본 분석 결과 (수치 일관성 보장)

**예시 출력**:
> 본 연구에서 관찰된 암수 간 체장 차이(Cohen's *d* = 0.89)는 큰 효과 크기에 해당하며, 이는 성적 이형성이 뚜렷함을 시사한다. 다만 표본 크기(*n* = 30)가 제한적이므로, 향후 더 큰 표본으로 재검증이 필요하다. 또한 체중, 연령 등 공변량의 영향을 통제한 분석(ANCOVA)을 후속 연구에서 고려할 수 있다.

---

## 카테고리별 템플릿 구조 (12 + generic)

> `statistical-methods.ts` 실제 카테고리 기준. 카테고리 우선 + 메서드별 override 구조.

| 카테고리 | 메서드 수 | 대표 메서드 | Results 패턴 | Methods 패턴 |
|----------|----------|-----------|-------------|-------------|
| `t-test` | 4 | 독립/대응/단일/Welch | 집단비교 + 기술통계 | 정규성 + 등분산 |
| `anova` | 6 | 일원/이원/반복측정/ANCOVA/MANOVA/mixed | F통계량 + 사후검정 + 효과크기(η²) | 정규성 + 등분산 + (구형성) |
| `nonparametric` | 13 | Mann-Whitney/Kruskal-Wallis/Wilcoxon/chi-square-goodness 등 | U/H/W/Z 통계량 + 중앙값 | 비모수 선택 사유 |
| `correlation` | 2 | Pearson/Spearman(+partial) | r값 + 방향 + 강도 | (정규성) |
| `regression` | 7 | 단순/다중/로지스틱/stepwise/Poisson/ordinal/dose-response | R²/계수표/OR + 모형적합 | 선형성 + 독립성 + (다중공선성) |
| `chi-square` | 3 | 독립성/McNemar/proportion | χ² + Cramer's V + 빈도표 | 기대빈도 조건 |
| `descriptive` | 4 | 기술통계/정규성/탐색적분석/means-plot | 요약표 + (정규성 판정) | — |
| `timeseries` | 4 | ARIMA/계절분해/정상성/Mann-Kendall | 모형 파라미터 + 적합지표(AIC) | 정상성 검정 |
| `survival` | 3 | Kaplan-Meier/Cox/ROC | 생존률/HR/AUC + CI | 비례위험 가정 |
| `multivariate` | 4 | PCA/FA/cluster/discriminant | 분산설명률/적재량/실루엣 | KMO/Bartlett |
| `design` | 1 | power-analysis | 필요 표본수 + 검정력 | — |
| `psychometrics` | 1 | reliability (Cronbach α) | α + 항목 삭제 시 변화 | — |
| `generic` | — | 위 카테고리에 매칭 안 되는 메서드 | 메서드명 + APA 문자열 + 유의성 판정 | 일반 문구 |

**구조**: 카테고리별 기본 템플릿 + 메서드별 override (필요 시)

```typescript
// 카테고리 기본 → 메서드별 특화 순서로 탐색
const template = METHOD_OVERRIDES[methodId] ?? CATEGORY_TEMPLATES[category] ?? GENERIC_TEMPLATE
```

---

## 타입 정의

파일: `stats/lib/services/paper-draft/paper-types.ts`

```typescript
type PaperSection = 'methods' | 'results' | 'captions' | 'discussion'

interface PaperDraftOptions {
  language: 'ko' | 'en'          // 기본 'ko', UI 토글로 전환
  sections?: PaperSection[]       // 미지정 시 전체 생성
  style?: 'apa7'                  // 향후 저널 프리셋 확장
  postHocDisplay?: 'significant-only' | 'all'  // 기본 'significant-only'
}

/** 생성 전 확인 단계에서 사용자가 수정/확인하는 컨텍스트 */
interface DraftContext {
  variableLabels: Record<string, string>    // 컬럼명 → 표시명 ('body_len' → '체장')
  variableUnits: Record<string, string>     // 컬럼명 → 단위 ('body_len' → 'cm')
  groupLabels: Record<string, string>       // 그룹코드 → 표시명 ('M' → '수컷')
  dependentVariable?: string                // 종속변수 표시명 ('체장') — Step 2 역할 매핑에서 자동 채움
  researchContext?: string                  // 연구 맥락 한 줄 (예: "양식 어류의 성별에 따른 성장 차이 비교")
}

/** Caption 항목 (표와 그림 분리) */
interface CaptionItem {
  kind: 'table' | 'figure'
  label: string                   // 'Table 1', 'Figure 1'
  text: string                    // 캡션 본문
}

/** 각 섹션은 null 가능 — 부분 생성 + 스트리밍 중간 상태 표현 */
interface PaperDraft {
  methods: string | null
  results: string | null
  captions: CaptionItem[] | null  // Table/Figure 분리 — 개별 복사 + DOCX 위치 배치 가능
  discussion: string | null       // LLM 생성 (선택, 스트리밍)
  language: 'ko' | 'en'
  generatedAt: string
  model: string | null            // Discussion 생성 시에만 모델명
  context: DraftContext           // 생성에 사용된 컨텍스트 (재생성 시 유지)
}

/** Discussion 스트리밍 상태 (UI용) */
type DiscussionState =
  | { status: 'idle' }
  | { status: 'streaming'; partial: string }
  | { status: 'done'; text: string; model: string }
  | { status: 'error'; message: string }

/** flattenAssumptions 출력 */
interface FlatAssumption {
  category: string              // 'normality' | 'homogeneity' | ...
  testName: string              // 'Shapiro-Wilk' | 'Levene' | ...
  statistic?: number
  pValue?: number
  passed: boolean
  group?: string                // 'group1', 'group2' (정규성 그룹별)
}
```

---

## 구현 계획

### Phase 0: 데이터 계약 정리 (선결)

| 작업 | 파일 | 내용 |
|------|------|------|
| **0-1** | `lib/services/export/assumption-utils.ts` | `flattenAssumptions()` — 중첩 `StatisticalAssumptions` → `FlatAssumption[]` |
| **0-2** | `lib/services/paper-draft/terminology-utils.ts` | `getMethodDisplayName(methodId, lang)`, `getDomainDictionary(domain)` — React 의존 없는 plain 함수. domain≠locale 분리 |
| **0-3** | `export-data-builder.ts` 수정 | 기존 가정검정 수집 로직을 `flattenAssumptions()` 사용으로 교체 (기존 export도 개선) |
| **0-4** | `types/smart-flow.ts` + 각 executor | `AnalysisResult.methodId` 안정 키 추가. executor에서 registry key 전달 |

### Phase A: 템플릿 기반 즉시 생성 (MVP — LLM 불필요)

> Methods + Results + Caption을 **템플릿 엔진**으로 즉시 생성. API 호출 없음, 오프라인 동작.

**A-0. 생성 전 확인 단계 (DraftContextEditor)**

파일: `stats/components/smart-flow/steps/results/DraftContextEditor.tsx`

"논문 초안" 버튼 클릭 시 **바로 생성하지 않고**, 확인 다이얼로그를 먼저 표시:

```
┌─────────────────────────────────────────────┐
│  논문 초안 생성 — 정보 확인                    │
│                                              │
│  ▸ 변수명                                    │
│    body_len  →  [체장        ]               │
│    weight    →  [체중        ]               │
│                                              │
│  ▸ 단위                                      │
│    body_len  →  [cm          ]               │
│    weight    →  [g           ]               │
│                                              │
│  ▸ 집단명                                    │
│    M         →  [수컷        ]               │
│    F         →  [암컷        ]               │
│                                              │
│  ▸ 연구 맥락 (선택)                           │
│    [양식 어류의 성별에 따른 성장 차이 비교    ] │
│                                              │
│  ▸ 사후검정 표시: ◉ 유의한 쌍만  ○ 전체       │
│  ▸ 언어: 🔘 한글  ○ English                   │
│                                              │
│              [취소]  [생성하기]                │
└─────────────────────────────────────────────┘
```

- 변수명/단위: 분석에 사용된 컬럼명을 자동 감지하여 입력 필드로 표시. 데이터에 이미 한글 컬럼명이면 그대로 채워짐
- 종속변수: Step 2에서 `dependent` 역할로 지정한 변수를 `dependentVariable`에 자동 채움 (사용자 수정 가능)
- 집단명: `groupStats`의 `name` 값에서 자동 추출. **`groupStats` 없으면 이 섹션 숨김**
- 연구 맥락: 빈 칸 — 사용자가 한 줄 입력하면 Methods 도입부 + Discussion에 활용
- 사후검정: 기본 "유의한 쌍만". **`postHoc` 결과 없으면 이 옵션 숨김**
- 언어: 기본 한글, 토글로 영문 전환. 전환 시 재생성
- **조건부 표시**: 분석 결과에 해당 데이터가 없는 섹션은 자동으로 숨김 (빈 필드 노출 방지)
- **재진입 시 프리필**: 이전에 생성한 `PaperDraft.context`가 있으면 해당 값으로 프리필 (변수명/단위/맥락 재입력 불필요)
- "생성하기" 클릭 → `DraftContext` 조립 → 템플릿 엔진 호출

**A-1. 메서드별 문장 템플릿**

파일: `stats/lib/services/paper-draft/paper-templates.ts`

- 12 카테고리 + generic fallback (위 테이블 참조)
- 카테고리 기본 → 메서드별 override 구조
- 한글/영문 템플릿 쌍
- 선택적 데이터 graceful 처리 (null guard 필수)

**예시 (t-test Results 템플릿)**:

```typescript
function generateTTestResults(
  r: AnalysisResult, ctx: DraftContext, lang: 'ko' | 'en'
): string {
  const { statistic, pValue, df, groupStats, confidence } = r
  const alpha = r.additional?.alpha ?? 0.05
  const es = typeof r.effectSize === 'number' ? r.effectSize : r.effectSize?.value
  const significant = pValue < alpha
  // DraftContext에서 사용자 확인된 표시명 사용
  const label = (name: string) => ctx.groupLabels[name] ?? ctx.variableLabels[name] ?? name
  const unit = (col: string) => ctx.variableUnits[col] ? ` (${ctx.variableUnits[col]})` : ''

  if (lang === 'ko') {
    const gs = groupStats ?? []
    const depVar = ctx.dependentVariable ? `${ctx.dependentVariable}에 ` : ''
    let text = `독립표본 t-검정 결과, ${label(gs[0]?.name ?? '집단1')}과 ` +
      `${label(gs[1]?.name ?? '집단2')} 간 ${depVar}` +
      `통계적으로 유의한 차이가 ${significant ? '있었다' : '없었다'} ` +
      `(*t*(${df}) = ${fmt(statistic)}, *p* ${fmtP(pValue)}`
    if (es != null) text += `, Cohen's *d* = ${fmt(es)}`
    text += ').'
    // 종속변수 컬럼명 → 단위 조회 (DraftContext에서)
    const depUnit = ctx.dependentVariable
      ? Object.entries(ctx.variableLabels).find(([, v]) => v === ctx.dependentVariable)?.[0]
      : undefined
    const unitStr = depUnit ? unit(depUnit) : ''
    if (gs.length >= 2) {
      text += ` ${label(gs[0].name)}(*M* = ${fmt(gs[0].mean)}${unitStr}, ` +
        `*SD* = ${fmt(gs[0].std)}, *n* = ${gs[0].n})${significant ? '이' : '과'} ` +
        `${label(gs[1].name)}(*M* = ${fmt(gs[1].mean)}${unitStr}, ` +
        `*SD* = ${fmt(gs[1].std)}, *n* = ${gs[1].n}).`
    }
    if (confidence) {
      text += ` 평균 차이의 ${(confidence.level ?? 0.95) * 100}% 신뢰구간은 ` +
        `[${fmt(confidence.lower)}, ${fmt(confidence.upper)}]이었다.`
    }
    return text
  }
  // en 분기...
}
```

**A-2. Methods 템플릿 — `flattenAssumptions()` 활용**

```typescript
function generateTTestMethods(
  r: AnalysisResult,
  assumptions: FlatAssumption[],
  lang: 'ko' | 'en'
): string {
  const normTests = assumptions.filter(a => a.category === 'normality')
  const homoTests = assumptions.filter(a => a.category === 'homogeneity')
  const alpha = r.additional?.alpha ?? 0.05
  const methodName = getMethodDisplayName(r.methodId, lang)
  // 도입부: researchContext 활용
  const intro = ctx.researchContext
    ? `${ctx.researchContext}를 위해 ${methodName}을 실시하였다.`
    : `${ctx.dependentVariable ?? '종속변수'}의 집단 간 차이를 검증하기 위해 ${methodName}을 실시하였다.`
  // 정규성 검정명 + 통계량, 등분산 검정명 + 통계량, α, 소프트웨어 인용 조립
}
```

**A-3. Captions 템플릿 — `visualizationData.type` 활용**

```typescript
function generateCaptions(
  r: AnalysisResult, ctx: DraftContext, lang: 'ko' | 'en'
): CaptionItem[] {
  const items: CaptionItem[] = []

  // Table caption (기술통계 있으면 항상 생성)
  if (r.groupStats?.length) {
    items.push({
      kind: 'table',
      label: 'Table 1',
      text: generateTableCaption(r, ctx, lang),
    })
  }

  // Figure caption (visualizationData 있으면 생성)
  const vizType = r.visualizationData?.type  // 'boxplot', 'scatter' 등 (chartType 아님)
  if (vizType) {
    items.push({
      kind: 'figure',
      label: 'Figure 1',
      text: generateFigureCaption(vizType, r, ctx, lang),
    })
  }

  return items
}
```

**A-4. Paper Draft 서비스**

파일: `stats/lib/services/paper-draft/paper-draft-service.ts`

```typescript
function generatePaperDraft(
  exportCtx: ExportContext,
  draftCtx: DraftContext,
  options: PaperDraftOptions
): PaperDraft {
  const assumptions = flattenAssumptions(exportCtx.analysisResult.assumptions)
  const methodId = exportCtx.analysisResult.methodId
  const category = STATISTICAL_METHODS[methodId]?.category ?? 'generic'

  return {
    methods: generateMethodsSection(exportCtx.analysisResult, assumptions, draftCtx, options.language),
    results: generateResultsSection(exportCtx.analysisResult, draftCtx, options),
    captions: generateCaptions(exportCtx.analysisResult, draftCtx, options.language),
    discussion: null,  // Phase B에서 LLM으로 별도 생성
    language: options.language,
    generatedAt: new Date().toISOString(),
    model: null,
    context: draftCtx,
  }
}
```

**A-5. UI — 결과 화면 통합**

파일: `stats/components/smart-flow/steps/results/PaperDraftPanel.tsx`

- 진입점: 결과 화면 하단 액션 바 "내보내기" 드롭다운에 **"논문 초안"** 항목 추가
- **"논문 초안" 클릭 → DraftContextEditor 다이얼로그 (A-0) → 확인 후 생성**
- 섹션별 탭 (Methods | Results | Captions | Discussion)
- Methods/Results/Captions: **즉시 표시** (로딩 없음). Captions 탭은 Table/Figure 항목 각각 복사 가능
- Discussion: "AI 해석 생성" 버튼 → `DiscussionState` 상태 머신으로 스트리밍 관리
- 각 섹션에 **복사 버튼** + 상단에 **"전체 복사"** 버튼 (섹션 구분 포함)
- 언어 토글: 한글(기본) ↔ English — 전환 시 `DraftContext` 유지한 채 재생성

**A-6. 초안 저장/복원 — 하이브리드 저장소 연동**

> 논문 초안을 닫았다가 나중에 다시 열어 복사할 수 있어야 한다. 다른 기기에서도 접근 가능해야 한다.

**현황**: 분석 히스토리는 이미 **하이브리드 저장소**(IndexedDB + Turso)로 관리됨.
- `IndexedDB` — 로컬 오프라인 우선 저장
- `Turso (LibSQL)` — 원격 DB, 온라인 시 자동 동기화
- `HybridAdapter` — 오프라인→IndexedDB 큐 → 온라인 전환 시 Turso 자동 동기화 (30초 간격)
- `HistoryRecord` — IndexedDB/Turso 공유 타입 (`storage-types.ts`)

**해결**: `HistoryRecord`에 `paperDraft` optional 필드 추가 → **기존 동기화 인프라로 자동 원격 저장**.

```typescript
// storage-types.ts — HistoryRecord 확장
export interface HistoryRecord {
  // ... 기존 필드 유지 (id, timestamp, method, results, aiInterpretation 등)
  paperDraft?: PaperDraft | null     // 신규 — 논문 초안
}

// smart-flow-store.ts — AnalysisHistory도 동일하게 확장
export interface AnalysisHistory {
  // ... 기존 필드 유지
  paperDraft?: PaperDraft | null
}
```

- **저장 시점**: "생성하기" 완료 시 자동 저장 (별도 저장 버튼 불필요)
- **Discussion 스트리밍 완료 시** 업데이트 (discussion 필드 갱신)
- **원격 동기화**: HybridAdapter가 자동 처리 — Turso에 동기화되므로 다른 기기에서도 접근 가능
- **복원**: 히스토리에서 결과 열기 → `paperDraft` 있으면 PaperDraftPanel 즉시 표시 (재생성 불필요)
- **재생성**: "다시 생성" 버튼 → DraftContextEditor 표시 (이전 `context` 프리필)
- **언어 전환 시**: 템플릿 섹션 즉시 재생성 + 저장 갱신 (Discussion은 LLM 재호출 필요)
- **용량**: PaperDraft는 텍스트 몇 KB — IndexedDB/Turso 부담 없음
- **Turso 스키마**: `paperDraft` JSON 컬럼 1개 추가 (TEXT 타입, JSON 직렬화)

### Phase B: Discussion LLM 생성 + 출력 확장

**B-1. Discussion 전용 프롬프트**

파일: `stats/lib/services/paper-draft/paper-prompts.ts`

- 학술 논문 톤 (현재 AI 해석의 "옆자리 동료" 톤과 구분)
- 한글/영문 분기
- 입력: 템플릿 생성된 Results 텍스트 + 원본 분석 결과 + `DraftContext.researchContext` → 수치 일관성 + 연구 맥락 반영
- `researchContext` 있으면 해석의 방향성 제공, 없으면 일반적 해석
- 기존 `llmRecommender.stream()` 재사용 (프로바이더 독립)

**B-2. 클립보드 서식 복사**

- Markdown → HTML 변환 후 서식 유지 복사
- Word에 붙여넣기 시 이탤릭/볼드 보존

### Phase C: DOCX + 품질 향상

> DOCX는 Discussion + 클립보드 안정화 이후에 진행 (리뷰 피드백 반영).

**C-1. DOCX 논문 형식 내보내기**

- 기존 `docx-export.ts` 파이프라인에 "논문 형식" 옵션 추가
- 이탤릭 통계 표기 (*t*, *p*, *M*, *SD*)

**C-2. 저널 스타일 프리셋**
- APA 7th (기본)
- Nature/Science numeric citation 스타일 (수요 확인 후)

**C-3. BioHub 인용문 자동 생성**

**C-4. 인라인 편집**
- 생성된 텍스트를 읽기 전용이 아닌 편집 가능 텍스트 영역으로 전환 (Phase A/B는 복사 후 외부 편집 기본)
- 편집 시 "초기화" 버튼으로 원본 복원 가능

**C-5. IMRAD 품질 체크리스트**
- 생성된 초안에 빠진 요소 경고 (예: 효과 크기 미보고, 가정 검정 미언급)

---

## 파일 구조

```
stats/lib/services/export/
└── assumption-utils.ts           # flattenAssumptions() — export + paper-draft 공용 (Phase 0)

stats/lib/services/paper-draft/
├── paper-draft-service.ts        # generatePaperDraft(ctx, options) → PaperDraft
├── paper-templates.ts            # 12카테고리 + generic 문장 템플릿 (한글/영문)
├── paper-prompts.ts              # Discussion LLM 프롬프트 (Phase B)
├── paper-types.ts                # PaperDraft, PaperSection, DiscussionState, FlatAssumption
├── terminology-utils.ts          # getMethodDisplayName() — React 의존 없음
└── index.ts                      # barrel export

stats/components/smart-flow/steps/results/
├── DraftContextEditor.tsx       # 생성 전 확인 다이얼로그 (변수명/단위/맥락/옵션)
└── PaperDraftPanel.tsx           # UI 패널 (섹션 탭 + 개별/전체 복사 + 스트리밍)
```

---

## 데이터 흐름

```
분석 완료
  ↓
ResultsActionStep (기존)
  ↓ "논문 초안" 클릭
  ↓
DraftContextEditor 다이얼로그 표시
  │ 변수명/단위 자동 감지 → 사용자 확인/수정
  │ 집단명 자동 추출 → 사용자 확인/수정
  │ 연구 맥락 입력 (선택)
  │ 사후검정 옵션 + 언어 선택
  ↓ "생성하기" 클릭
  ↓
ExportContext 조립 (이미 구현됨) + DraftContext 조립 (신규)
  ↓
  ├─ flattenAssumptions() ──→ FlatAssumption[] (Phase 0 유틸)
  │
  ├─ Methods/Results/Captions ──→ paper-templates.ts (즉시, 동기, 오프라인)
  │    입력: AnalysisResult (methodId + visualizationData.type) + FlatAssumption[] + DraftContext + lang
  │    ↓ 템플릿 문자열 (사용자 확인된 변수명/단위 사용, Captions는 CaptionItem[])
  │
  └─ Discussion (선택) ─────────→ paper-prompts.ts + llmRecommender.stream()
       입력: Results 텍스트 + AnalysisResult + DraftContext.researchContext
       ↓ DiscussionState (idle → streaming → done/error)
       ↓
PaperDraftPanel (섹션별 탭 + Table/Figure 개별 복사 + 전체 복사 + 언어 토글 + DOCX)
  ↓ 자동 저장
HistoryRecord.paperDraft (IndexedDB 로컬)
  ↓ HybridAdapter 자동 동기화 (온라인 시)
Turso DB (원격) — 다른 기기에서도 접근 가능
  ↓ 나중에 히스토리에서 열기
PaperDraftPanel (저장된 초안 즉시 표시, 재생성 불필요)
```

---

## 문체 및 포맷 규칙

### 현재 AI 해석 vs 논문 초안

| | AI 해석 (기존) | 논문 초안 (신규) |
|---|---|---|
| 톤 | 친근 ("옆자리 동료") | 학술 (3인칭, 수동태) |
| 구조 | 자유 형식 (요약 + 상세) | 섹션별 고정 형식 (IMRAD) |
| 통계 표기 | 텍스트 혼합 | APA 이탤릭 (*t*, *p*, *F*) |
| 길이 | 길게 (해석 중심) | 간결 (보고 중심) |
| 대상 | 분석자 본인 | 논문 독자/심사자 |
| 생성 | LLM 스트리밍 전체 | 템플릿 3섹션 + LLM 1개 (Discussion만) |

### 템플릿 문체 규칙 (Methods/Results/Caption)

1. **APA 통계 표기 엄수**: *t*(df) = value, *p* = .xxx, *d* = value
2. **기술통계 포함**: *M*, *SD*, *n* per group (groupStats 있을 때만)
3. **효과 크기 해석**: small/medium/large (Cohen 기준, effectSize 있을 때만)
4. **가정 검정 보고**: 위반 시에만 상세 기술, 통과 시 한 줄 요약 (Methods에 통계량 포함)
5. **수동태 사용**: "~를 실시하였다", "~가 확인되었다"
6. **graceful degradation**: null/undefined 필드는 문장에서 자연스럽게 생략 (에러 아님)

### Discussion LLM 프롬프트 지시사항 (Phase B)

1. 템플릿 생성된 Results 텍스트를 컨텍스트로 제공 → 수치 일관성 보장
2. 해석·맥락·한계점에 집중 (수치 반복 최소화)
3. 후속 연구 제안은 분석 결과와 논리적으로 연결
4. LLM 프로바이더 독립 — 프롬프트는 특정 모델에 의존하지 않음

---

## 테스트 전략

> 스냅샷 일변도 회피 — **의미 기반 assertion** 위주 + 카테고리별 **소수 golden snapshot**.

| 레벨 | 대상 | 방식 |
|------|------|------|
| **L1 단위** | `flattenAssumptions()` | 중첩 구조 입력 → flat 배열 검증 (category, testName, passed 정확성) |
| **L1 단위** | `paper-templates.ts` 포맷 규칙 | 의미 기반: p값 포함 여부, df 포함 여부, optional 필드 생략 시 에러 없음 |
| **L1 단위** | `paper-templates.ts` golden snapshot | 카테고리별 대표 1개 × 한글/영문 = **최대 26개** (변경 시 수동 확인) |
| **L1 단위** | `terminology-utils.ts` | 전 메서드 ID → displayName 매핑 확인 |
| **L2 통합** | `paper-draft-service.ts` | ExportContext mock → PaperDraft 전체 반환 (null 아닌 섹션 수 검증) |
| **L3 E2E** | PaperDraftPanel | 결과 화면 → 논문 초안 버튼 → 섹션 표시 → 복사 동작 |

---

## Phase 순서 요약

```
Phase 0: 데이터 계약 정리
  flattenAssumptions() + terminology plain utils (domain≠locale)
  + visualizationData.type 확인 + methodId 안정 키 추가
  ↓
Phase A: 템플릿 엔진 + UI + 저장
  DraftContextEditor(확인 단계) + 12카테고리 템플릿 + CaptionItem[] + PaperDraftPanel
  + AnalysisHistory.paperDraft 저장/복원 + 테스트
  ↓
Phase B: Discussion LLM + 클립보드
  학술 프롬프트 + 스트리밍 상태 머신 + 서식 복사
  ↓
Phase C: DOCX + 프리셋 + 품질
  논문 DOCX + 저널 스타일 + 인라인 편집 + 체크리스트
```

---

## 우선순위 및 의존성

- **Phase 0 + A만으로 핵심 가치 전달** — LLM 없이 Methods/Results/Caption 즉시 생성
- Phase 0의 `flattenAssumptions()`는 기존 export 기능도 개선 (부수 효과)
- UI 리디자인(STITCH Phase 3/4) 완료 후 진행 권장 (결과 화면 안정화 후)
- Phase B/C는 사용자 피드백 후 결정

---

## 제약사항

- **Stateless**: 과거 분석 누적 불필요 — 현재 분석 결과만으로 생성
- **초기 템플릿 커버리지**: 12카테고리 기본 템플릿 + generic fallback. 메서드별 특화는 점진 추가
- **LLM 프로바이더 독립**: Discussion 생성 시 특정 API에 의존하지 않음
- **환각 방지**: 템플릿 섹션은 환각 불가능 (수치 직접 삽입), Discussion에도 Results 텍스트 컨텍스트 제공

---

## v6 변경 이력 (UX 시뮬레이션 리뷰 + 저장/복원)

| 지적 | 반영 |
|------|------|
| 종속변수명이 출력에 빠짐 (P1) | `DraftContext.dependentVariable` 추가. Step 2 역할 매핑에서 자동 채움. Results/Methods 도입부에 삽입 |
| `unit()` 정의만 되고 사용 안 됨 (P2) | Results 기술통계 보고에 `unitStr` 실제 삽입 |
| `lookupCategory`가 `method`(표시명) 사용 (P3) | `STATISTICAL_METHODS[methodId]?.category`로 수정 |
| 다이얼로그가 빈 섹션도 표시 (P4) | `groupStats`/`postHoc` 없으면 해당 섹션 숨김. 조건부 표시 명시 |
| `researchContext`가 Methods에서 미사용 (P5) | A-2 Methods 템플릿에 `ctx.researchContext` 도입부 활용 코드 추가 |
| 재진입 시 이전 DraftContext 초기화 (P6) | `PaperDraft.context`에서 프리필. 재진입 동작 명시 |
| 초안 저장/복원 없음 (신규) | A-6 추가: `HistoryRecord.paperDraft` — 기존 하이브리드 저장소(IndexedDB+Turso) 활용, 원격 자동 동기화 |

## v5 변경 이력 (코드 정합성 리뷰 반영)

| 리뷰 지적 | 심각도 | 반영 |
|----------|--------|------|
| `analysisResult.method`가 표시명(한글), registry key 아님 | HIGH | Phase 0-4 추가: `AnalysisResult.methodId` 안정 키 + 전 executor 수정 |
| terminology가 locale 아닌 domain 기반 (`ko.ts`/`en.ts` 없음) | HIGH | 0-2 재작성: `STATISTICAL_METHODS[id].koreanName/name`으로 메서드명 조회, `getDomainDictionary()`로 도메인 접근. domain≠locale 명시 |
| `visualizationData.type`인데 계획서가 `chartType`으로 기재 | HIGH | 0-3 수정 + 전체 `chartType` → `type`으로 교체. `chartType`은 Graph Studio 전용임을 명시 |
| Caption이 `string \| null`로 table/figure 분리 불가 | MEDIUM | `CaptionItem { kind, label, text }` 배열로 변경. 개별 복사 + DOCX 위치 배치 가능 |

## v4 변경 이력 (UX 리뷰 반영)

| 지적 | 반영 |
|------|------|
| 변수명이 코드명 그대로 출력됨 (U1) | `DraftContext.variableLabels` + 생성 전 확인 다이얼로그(A-0) |
| 단위 정보 없음 (U2) | `DraftContext.variableUnits` + 확인 다이얼로그에 단위 입력 |
| 연구 맥락 부재 (U3) | `DraftContext.researchContext` 선택 입력 → Methods 도입부 + Discussion 프롬프트 |
| 전체 복사 없음 (U4) | "전체 복사" 버튼 추가 |
| 인라인 편집 (U5) | Phase C-4로 연기 |
| 언어 전환 UX (U6) | 한글 기본 + 토글, 전환 시 DraftContext 유지한 채 재생성 |
| 사후검정 표시 (U7) | `postHocDisplay` 옵션 — 기본 유의한 쌍만, 전체 선택 가능 |
| 서비스 함수 시그니처 | `DraftContext`를 모든 템플릿 함수에 인자로 추가 |

## v3 변경 이력 (외부 리뷰 반영)

| 리뷰 지적 | 심각도 | 반영 내용 |
|----------|--------|---------|
| `StatisticalAssumptions` 중첩 구조 → 현재 수집 실패 | HIGH | Phase 0에 `flattenAssumptions()` 신규 + `FlatAssumption` 타입 추가 |
| 메서드 52개/12카테고리 (43/6+1 아님) | HIGH | 카테고리 테이블 12+generic으로 전면 교체, 메서드 수 정정 |
| `useTerminology()` 서비스에서 호출 불가 | MEDIUM | `terminology-utils.ts` plain 함수로 분리 |
| `PaperDraft` 타입이 부분 생성 미지원 | MEDIUM | 전 섹션 `string \| null`로 변경 + `DiscussionState` 상태 타입 추가 |
| Caption에 `visualizationData` 미포함 | MEDIUM | 데이터 소스에 `visualizationData.type` 추가, Caption 템플릿 입력 계약 수정 (v5에서 `chartType`→`type` 정정) |
| DOCX가 Discussion보다 먼저 | 리뷰 제안 | Phase 순서 변경: A(템플릿+UI) → B(Discussion+클립보드) → C(DOCX+프리셋) |
| 스냅샷 테스트 유지보수 부담 | 리뷰 제안 | 의미 기반 assertion 위주 + 카테고리별 소수 golden snapshot 혼합 |
