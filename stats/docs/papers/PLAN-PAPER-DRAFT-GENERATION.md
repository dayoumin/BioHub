# 논문 초안 생성 기능 (Paper Draft Generation)

**상태**: 계획 수립 완료, 구현 대기
**최종 업데이트**: 2026-03-18 (v9 — storage API 신규 구현 확정 + category 불일치 해결)
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
>
> **v7 재정의**: Phase 0 항목 경량화 — 0-3은 확인 메모(코드 변경 없음), 0-2는 MVP 이후로 이동. Phase 0 핵심 = 0-1 + 0-4.
> **주의**: `stats/types/smart-flow.ts` 파일은 존재하지 않음 — 실제 타입 위치는 `stats/types/analysis.ts`.

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

### 0-2. 메서드 메타데이터 plain 접근 함수 (MVP 이후로 이동)

> **v7 우선순위 조정**: MVP 블로커 아님. `STATISTICAL_METHODS[methodId]?.koreanName` 직접 접근으로 Phase A 동작 가능. Phase A 완료 후 리팩토링.

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

### 0-3. visualizationData 입력 계약 확인 (코드 변경 없음 — 확인 메모)

> **v7**: 실제 코드 검증 완료. 추가 작업 불필요. 참고용으로만 유지.

**현황**: `AnalysisResult.visualizationData`는 이미 존재하며 **필드명은 `type`** (NOT `chartType`).

```typescript
// VisualizationData 실제 구조 (analysis.ts:460) — smart-flow.ts 아님
interface VisualizationData {
  type: string              // 'boxplot', 'scatter', 'bar', 'histogram' 등
  data: Record<string, unknown>
  options?: Record<string, unknown>
}
```

- Caption 템플릿에서 `r.visualizationData?.type`으로 접근 (chartType 아님)
- `chartType`은 Graph Studio 전용 (ECharts ChartType enum) — 혼동 주의
- 추가 변경 불필요 — 기존 타입 그대로 사용

### 0-4. methodId — selectedMethod.id 활용 (전략 변경)

> **v8 전면 변경**: `AnalysisResult`에 `methodId`를 추가하는 것은 executor/worker/transformer/history 전체를 건드리는 과도한 리팩터.
>
> **실제 코드 확인 결과**: `selectedMethod.id`가 이미 `history-store.ts:193-194`에서 `HistoryRecord.method.id`로 저장되고, `loadFromHistory()` 복원 시에도 `record.method.id`로 조회됨. `store-orchestration.ts:24`에서도 `selectedMethod`를 스냅샷에 포함.
>
> **해결 전략**: `AnalysisResult` 확장 없이 `selectedMethod.id`를 paper-draft service에 직접 전달.

**현황 (이미 존재하는 것)**:
```typescript
// history-store.ts:193-194 — 이미 저장됨
method: snapshot.selectedMethod ? {
  id: snapshot.selectedMethod.id,   // ← 'paired-t', 't-test' 등 안정 키
  name: snapshot.selectedMethod.name,
  ...
}
```

**해결**: `generatePaperDraft()` 시그니처에 `methodId` 파라미터 추가. UI(ResultsActionStep)에서 `useHistoryStore().currentHistoryId` 기준으로 `selectedMethod.id` 를 넘김.

```typescript
// paper-draft-service.ts — AnalysisResult 확장 없음
function generatePaperDraft(
  exportCtx: ExportContext,
  draftCtx: DraftContext,
  methodId: string,          // selectedMethod.id — UI에서 전달
  options: PaperDraftOptions
): PaperDraft

// ResultsActionStep.tsx (호출부) — store에서 읽어서 전달
const { selectedMethod } = useAnalysisStore()
generatePaperDraft(exportCtx, draftCtx, selectedMethod?.id ?? '', options)
```

- `AnalysisResult`, executor, result-transformer, history 수정 불필요
- 템플릿 라우팅: `METHOD_OVERRIDES[methodId] ?? CATEGORY_TEMPLATES[category]`
- `STATISTICAL_METHODS[methodId]?.category`로 카테고리 자동 조회

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

## 경쟁사 분석 (2026년 3월 기준)

> 논문 작성 지원 관점에서 주요 경쟁 제품 현황.
> 전체 경쟁 분석: [COMPETITIVE-ANALYSIS.md](COMPETITIVE-ANALYSIS.md)

### 도구별 현황

| 도구 | APA 자동 형식 | AI 해석 생성 | 주목할 기능 | 한계 |
|------|:---:|:---:|------|------|
| **GraphPad Prism 10** | 부분 | 없음 | 효과크기+CI 모든 검정 자동 포함, 출판 품질 그래프 | Methods/Results 텍스트 생성 없음 |
| **SPSS v31.0.1** | 부분 | **AI Output Assistant** (watsonx.ai) | 결과 선택 → 평문 영어 해석 즉시 생성 | 고가, APA 포맷 자동화 미흡 |
| **JASP 0.19.3** | **기본값** | 없음 | 모든 결과가 APA 기본 출력, Bayesian 지원 | 텍스트 생성 없음 |
| **jamovi** | **기본값** | 없음 | 결과 복사 → Word 직접 붙여넣기 | 텍스트 생성 없음 |
| **R `report` 패키지** | **완전 자동** | 텍스트 생성 | `report(model)` 한 줄 → APA 서술 문장, 가장 완성도 높음 | R 코딩 필요 |
| **Overleaf AI Assist** (2025-06) | N/A | LaTeX 생성 | 표 이미지 → LaTeX 변환, Citation Reviewer | LaTeX 작성 능숙자 전용 |
| **Jenni AI** | APA 인용 형식 | 드래프팅 AI | 아이디어 → 논문 구조화, 2,600개 인용 형식 | 통계 직접 연동 없음 |
| **Elicit** | 없음 | 논문 추출 | 기존 논문에서 통계 수치 자동 추출/비교 | 생성 기능 없음 |

### 핵심 시장 Gap (BioHub 기회)

1. **SPSS AI Output Assistant의 한계**: 평문 해석은 생성하지만 APA 포맷 준수 미흡, 한국어 미지원
2. **R `report`의 한계**: 가장 완성도 높으나 R 코딩 필수 — 코딩 불필요한 웹 버전 수요 공백
3. **jamovi/JASP의 한계**: APA 표/그래프는 완성도 높지만 **서술 텍스트(Methods/Results 문장) 생성 기능 없음**
4. **그래프-논문 직접 연결 부재**: 분석 도구와 그래프 도구가 분리됨 → BioHub는 Graph Studio 차트를 Figure Caption에 직접 연결 가능

### 포지셔닝

> **"R `report`의 편의성 + JASP의 APA 품질 + 한국어 지원 + Graph Studio 차트 통합"**

- R 코딩 없이 `report()` 수준의 자동화 → 국내 대학원생 핵심 타깃
- jamovi/JASP 사용자가 "텍스트까지 자동으로 써줬으면" 하는 니즈 직접 충족
- Prism 10처럼 효과크기+CI 모든 검정 기본 포함 (이미 계획됨)
- Graph Studio 차트 → Figure Caption 자동 연결 (경쟁사 전무)

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

> **v9 주의**: `types/analysis.ts`의 `category` 리터럴에는 `'psychometrics'`, `'design'`이 있으나 `statistical-methods.ts`의 `METHOD_CATEGORIES` 키에는 이 둘이 없음(`'other'`로 처리).
> `CATEGORY_TEMPLATES`를 구성할 때 이 두 카테고리를 명시적 키로 등록해야 라우팅 오류를 막을 수 있음.
> - `reliability` (Cronbach α) → `category: 'psychometrics'`
> - `power-analysis` → `category: 'design'`
> 두 메서드는 `METHOD_OVERRIDES`에도 등록해두면 `CATEGORY_TEMPLATES` 키 의존을 피할 수 있음.

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
  | { status: 'cancelling'; partial: string }  // v7 추가 — 취소 버튼 클릭 후 AbortController 전달
  | { status: 'done'; text: string; model: string }
  | { status: 'error'; message: string }
  // 취소 시: partial 텍스트 유지 + "취소됨 — 생성된 일부 내용입니다" 상태 메시지
  // error 시: "[다시 시도]" 버튼 표시, 에러 메시지는 사용자 언어로 ("API 연결 실패 — 잠시 후 다시 시도해 주세요")

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
| **0-4** | `lib/services/paper-draft/paper-draft-service.ts` | `generatePaperDraft()`에 `methodId: string` 파라미터 추가. `AnalysisResult`/executor 수정 없음 — `selectedMethod.id` UI에서 전달 |
| **0-5** (필수) | `lib/utils/storage.ts` 신규 함수 | `updateHistory(id, partial)` — get→merge→saveHistory(isUpdate=true). `syncHistoryRecord(id)` 파사드 노출 |
| **0-6** (필수) | `lib/utils/adapters/hybrid-adapter.ts` 신규 메서드 | `syncHistoryRecord(id)` — 개별 레코드 즉시 Turso 동기화 (기존 전역 큐와 별도) |

### Phase A: 템플릿 기반 즉시 생성 (MVP — LLM 불필요)

> Methods + Results + Caption을 **템플릿 엔진**으로 즉시 생성. API 호출 없음, 오프라인 동작.

**A-0. 생성 전 확인 단계 (DraftContextEditor)**

파일: `stats/components/analysis/steps/DraftContextEditor.tsx`

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
- 연구 맥락: 빈 칸 — placeholder `"예: 양식 어류의 성별에 따른 성장 차이 비교"` 로 없어도 된다는 것을 명시
- 사후검정: 기본 "유의한 쌍만". **`postHoc` 결과 없으면 이 옵션 숨김**
- 언어: 기본 한글, 토글로 영문 전환. 전환 시 재생성
- **조건부 표시**: 분석 결과에 해당 데이터가 없는 섹션은 자동으로 숨김 (빈 필드 노출 방지)
- **재진입 시 프리필**: 이전에 생성한 `PaperDraft.context`가 있으면 해당 값으로 프리필 (변수명/단위/맥락 재입력 불필요)
- **UX 수정 — 입력 부담 경감**: 변수/단위 필드가 많으면(4개 이상) 핵심 항목(종속변수 + 집단명)만 기본 표시, 나머지는 "추가 변수 설정 ▼" 접기
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

파일: `stats/components/analysis/steps/PaperDraftPanel.tsx`

**진입점 (UX 수정):**
- ~~내보내기 드롭다운 내부~~ → 액션 바에 `📄 논문 초안` **독립 버튼**으로 노출
- 이유: 내보내기는 "파일 받기" 맥락, 논문 초안은 생성→검토→복사 흐름으로 성격이 다름

**패널 레이아웃 (UX 수정 — 탭 → 세로 스크롤):**
- ~~섹션별 탭~~ → **세로 스크롤 단일 뷰** (섹션 구분선 + 앵커 네비게이션)
- 탭은 상단 앵커 링크로 보조 역할 (Methods | Results | Captions | Discussion)
- 사용자가 전체 흐름을 한 번에 파악하고, 필요한 부분만 개별 복사 가능

```
[Methods]                    [복사] ✓
────────────────────────────────────
...텍스트...

[Results]                    [복사]
────────────────────────────────────
...텍스트...

[Table 1]  [복사]    [Figure 1]  [복사]
────────────────────────────────────
...캡션...

[Discussion]         [AI 생성 버튼]
────────────────────────────────────
(비어있음 → 클릭 시 스트리밍)
```

**복사 피드백 (UX 수정):**
- 복사 버튼 클릭 시 체크마크(✓) + "복사됨" 0.5초 표시 (없으면 사용자 불안)

**언어 토글 피드백 (UX 수정):**
- 한글(기본) ↔ English 토글 전환 시 50ms 페이드 효과 (즉시 재생성이지만 시각적 확인 필요)
- 전환 시 `DraftContext` 유지한 채 재생성

**Discussion 설명 문구 (UX 수정):**
- "AI 생성" 버튼 아래 한 줄: "기존 AI 해석(친근한 설명)을 학술 논문 문체로 변환합니다."
- 기존 AI 해석과의 차이를 명확히

**전문성 강화 UI 요소:**
- 각 섹션 우상단에 APA 7th 뱃지 (`APA 7th`)
- Methods 섹션 하단 BioHub 인용문 자동 포함 (Phase C-3, 작은 회색 텍스트로 표시)
- "전체 복사" 버튼: 섹션 구분(## Methods, ## Results 등) 포함한 Markdown 형식

**히스토리 연동 (UX 수정):**
- 히스토리 카드에 `📄` 배지 — 이미 초안이 있는 항목 구분 가능

**A-6. 초안 저장/복원 — 하이브리드 저장소 연동**

> 논문 초안을 닫았다가 나중에 다시 열어 복사할 수 있어야 한다. 다른 기기에서도 접근 가능해야 한다.

**현황**: 분석 히스토리는 이미 **하이브리드 저장소**(IndexedDB + Turso)로 관리됨.
- `IndexedDB` — 로컬 오프라인 우선 저장
- `Turso (LibSQL)` — 원격 DB, 온라인 시 자동 동기화
- `HybridAdapter` — 오프라인→IndexedDB 큐 → 온라인 전환 시 Turso 자동 동기화 (30초 간격)
- `HistoryRecord` — IndexedDB/Turso 공유 타입 (`storage-types.ts`)

**해결**: 3가지 작업이 독립적으로 필요.

**① 타입 확장** (`storage-types.ts`, `history-store.ts`)

```typescript
// storage-types.ts — HistoryRecord 확장
export interface HistoryRecord {
  // ... 기존 필드 유지
  paperDraft?: PaperDraft | null     // 신규
}

// history-store.ts:35 — AnalysisHistory도 동일하게 확장 (smart-flow-store 아님)
export interface AnalysisHistory {
  // ... 기존 필드 유지
  paperDraft?: PaperDraft | null
}
```

**② patchHistoryPaperDraft API 신규 추가** (`history-store.ts`)

> **v8 필수**: `saveToHistory()`는 항상 새 ID를 생성(`history-store.ts:188-189`). 초안 생성/재생성/Discussion 완료마다 `saveToHistory()`를 호출하면 히스토리 중복이 발생함. **기존 레코드를 업데이트하는 별도 API가 필요**.

> **v9 확인**: `storage.ts`에 `updateHistory(id, partial)` 미존재. `saveHistory(record, isUpdate?)`는 전체 교체 PUT 패턴만 있음. `HybridAdapter.syncPendingItems()`도 전역 큐 기반 — 개별 레코드 즉시 동기화 없음. **두 함수 모두 신규 구현 필요.**

```typescript
// ② -a: storage.ts에 추가 (신규)
export async function updateHistory(id: string, partial: Partial<HistoryRecord>): Promise<void> {
  const storage = await getStorage()
  const current = await storage.getHistory(id)
  if (!current) throw new Error(`History ${id} not found`)
  await storage.saveHistory({ ...current, ...partial }, true)  // isUpdate=true
}

// ② -b: HybridAdapter에 추가 (신규)
async syncHistoryRecord(id: string): Promise<void> {
  if (!this.isOnline()) return
  const record = await this.localAdapter.getHistory(id)
  if (!record) return
  try {
    await this.cloudAdapter.saveHistory(record, true)
    await this.localAdapter.saveHistory({ ...record, syncedAt: Date.now() }, true)
  } catch {
    await this.localAdapter.addToSyncQueue(id, 'save')
  }
}

// ② -c: storage.ts 파사드에 노출 (신규)
export async function syncHistoryRecord(id: string): Promise<void> {
  const storage = await getStorage()
  if ('syncHistoryRecord' in storage) {
    await (storage as HybridAdapter).syncHistoryRecord(id)
  }
}

// history-store.ts에 추가
patchHistoryPaperDraft: async (historyId: string, paperDraft: PaperDraft | null) => {
  await updateHistory(historyId, { paperDraft })         // IndexedDB patch
  await syncHistoryRecord(historyId)                     // Turso 동기화 트리거
  set((state) => ({
    analysisHistory: state.analysisHistory.map(h =>
      h.id === historyId ? { ...h, paperDraft } : h
    )
  }))
}
```

- `updateHistory(id, partial)` — `storage.ts` 신규 추가 (get→merge→saveHistory(isUpdate=true))
- `syncHistoryRecord(id)` — `HybridAdapter` 신규 추가 + `storage.ts` 파사드 노출
- 저장 시점: 생성 완료 + Discussion 스트리밍 완료 시 각각 1회 호출 (중복 없음)

**③ loadFromHistory() 확장** (`history-store.ts:224`)

> **v8 필수**: 현재 `loadFromHistory()`는 `aiInterpretation`/`interpretationChat`만 복원(`history-store.ts:241-242`). `paperDraft`도 함께 복원해야 배지 표시/재진입 프리필이 동작함.

```typescript
// history-store.ts:247 set() 블록에 추가
set({
  currentHistoryId: historyId,
  loadedAiInterpretation: result.loadedAiInterpretation,
  loadedInterpretationChat: result.loadedInterpretationChat,
  loadedPaperDraft: record.paperDraft ?? null,  // 신규
})
```

- `loadedPaperDraft` 상태를 히스토리 스토어에 추가
- `ResultsActionStep.tsx`에서 `loadedPaperDraft`를 읽어 "논문 초안" 버튼 배지 표시

**Turso 직렬화 (기존 패턴 동일)**:
- `turso-adapter.ts`: `ensureColumn('history', 'paperDraft', 'TEXT')`
- `saveHistory()`: `paperDraft: JSON.stringify(record.paperDraft ?? null)`
- `loadHistory()`: `paperDraft: row.paperDraft ? JSON.parse(row.paperDraft) : null`
- 기존 레코드: NULL → `null` 처리 (마이그레이션 불필요)

- **복원 (v7 수정)**: 히스토리에서 결과 열기 시 PaperDraftPanel **자동으로 열리지 않음** — 닫힌 상태 기본. "논문 초안" 버튼에 `[재사용 가능]` 배지로 초안 존재를 표시.
- **재생성 (v7 수정)**: "다시 생성" 버튼 → 팝업 선택: `[텍스트만 재생성]` vs `[전체 재생성 — Discussion 포함 (API 호출)]`. DraftContextEditor 표시 (이전 `context` 프리필)
- **언어 전환 시**: 템플릿 섹션 즉시 재생성 + `patchHistoryPaperDraft()` 호출 (Discussion은 LLM 재호출 필요)
- **용량**: PaperDraft는 텍스트 몇 KB — IndexedDB/Turso 부담 없음

**언어 전환 엣지 케이스 (v7 추가):**
- 영문 전환 시 DraftContext에 한글 값 감지(변수명, 집단명)되면 **노란 경고 배지** 표시: `⚠ 영문 번역 필요`
- "생성하기" 시 한글 값이 포함된 채로 영문 생성 시도 → 확인 팝업 `"한글 표현이 포함된 채로 영문 초안을 생성합니다. 계속하시겠습니까?"`
- 영문 전환 시 도메인 사전 영문 대응어 조회 → 없으면 원본 컬럼명 사용 (규칙 명시)

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
- **Phase A에서도 최소 변환 적용**: `*text*` → `<em>`, `**text**` → `<strong>` — Markdown 기호 노출 방지
  - Phase A 복사 버튼은 HTML clipboard API 사용 (plaintext fallback 포함)
  - DOCX는 Phase C로 미뤄도 됨

### Phase C: DOCX + 품질 향상 + 전문성 기능

> DOCX는 Discussion + 클립보드 안정화 이후에 진행 (리뷰 피드백 반영).

**C-1. DOCX 논문 형식 내보내기**

- 기존 `docx-export.ts` 파이프라인에 "논문 형식" 옵션 추가
- 이탤릭 통계 표기 (*t*, *p*, *M*, *SD*)
- Graph Studio 차트 이미지 자동 포함 (Figure 위치 자동 배치)

**C-2. 저널 스타일 프리셋**
- APA 7th (기본)
- Nature/Science numeric citation 스타일 (수요 확인 후)
- 한국학술지 스타일 (국문 논문 표준)

**C-3. BioHub 인용문 자동 생성**

> **v7 APA 정확성 수정**: 인용 형식을 APA 7th §10.10 (소프트웨어 인용) 기준으로 교정. SciPy 자체 논문 인용 필수 추가.

```
[한글 논문]
통계 분석은 BioHub (Version {version}; https://biohub.ecomarin.workers.dev)를
사용하여 수행하였다. BioHub는 SciPy (Virtanen et al., 2020)를 통계 엔진으로 사용한다.

[영문 논문]
Statistical analyses were performed using BioHub (Version {version};
https://biohub.ecomarin.workers.dev), which employs SciPy as its statistical engine
(Virtanen et al., 2020).
```

**참고문헌 자동 생성 항목 (References 섹션용)**:
```
BioHub 인용:
Ecomarin. ({year}). BioHub (Version {version}) [Statistical analysis software].
https://biohub.ecomarin.workers.dev

SciPy 인용 (필수):
Virtanen, P., Gommers, R., Oliphant, T. E., et al. (2020). SciPy 1.0: Fundamental
algorithms for scientific computing in Python. Nature Methods, 17(3), 261–272.
https://doi.org/10.1038/s41592-019-0686-2

statsmodels 인용 (해당 기능 사용 시):
Seabold, S., & Perktold, J. (2010). Statsmodels: Econometric and statistical
modeling with Python. Proceedings of the 9th Python in Science Conference, 92–96.

pingouin 인용 (해당 기능 사용 시):
Vallat, R. (2018). Pingouin: Statistics in Python. Journal of Open Source Software,
3(31), 1026. https://doi.org/10.21105/joss.01026
```

- 언어별 분기: 영문 논문용 영어 인용문
- 버전 정보 자동 주입 (재현 가능성 보장)
- "참고문헌 복사" 버튼 별도 제공 (Captions 탭 하단)

**C-4. 인라인 편집**
- 생성된 텍스트를 읽기 전용이 아닌 편집 가능 텍스트 영역으로 전환 (Phase A/B는 복사 후 외부 편집 기본)
- 편집 시 "초기화" 버튼으로 원본 복원 가능

**C-5. IMRAD 품질 체크리스트**
- 생성된 초안에 빠진 요소 경고 (예: 효과 크기 미보고, 가정 검정 미언급)
- CONSORT/STROBE/ARRIVE 보고 가이드라인 준수 체크 (연구 설계별)

**C-6. 재현 가능성 코드 스니펫 (전문성 기능)**
- 분석 설정 → Python/R 코드 자동 생성
- "이 분석을 재현하려면" 섹션: `scipy.stats.ttest_ind(...)` 형태로 제공
- 재현 가능한 연구(Reproducible Research) 트렌드 대응

**C-7. Graph Studio 차트 → Figure 직접 연결 (차별화 기능)**
- 현재 분석과 연결된 Graph Studio 프로젝트가 있으면 차트 자동 감지
- Figure Caption에 실제 차트 썸네일 미리보기 + "Figure에 포함" 체크박스
- DOCX 내보내기 시 차트 이미지 자동 삽입 (경쟁사 전무한 기능)

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

stats/components/analysis/steps/
├── DraftContextEditor.tsx       # 생성 전 확인 다이얼로그 (변수명/단위/맥락/옵션)
└── PaperDraftPanel.tsx           # UI 패널 (섹션 탭 + 개별/전체 복사 + 스트리밍)
# ResultsActionStep.tsx 와 동일한 디렉토리 (components/analysis/steps/ResultsActionStep.tsx 확인됨)
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
3. **비모수 검정 기술통계**: *M*/*SD* 대신 반드시 *Mdn*(중앙값)/IQR 사용
4. **효과 크기 해석**: small/medium/large (Cohen 기준, effectSize 있을 때만). ANOVA는 η²p(편 에타제곱) vs η² 구분 명시
5. **가정 검정 보고**: 위반 시에만 상세 기술, 통과 시 한 줄 요약
   - 통계량 포함 여부는 일관되어야 함 — 기본: 통과 시 통계량 포함 (`*W*(30) = .96, *p* = .712`)
   - Shapiro-Wilk: `*W*(n)` 형식 (표본 크기 포함), Levene: `*F*(df₁, df₂)` 형식 (예: `*F*(1, 28)`, df 필수)
6. **p값 분기**: `p < .001` 이하이면 `.001`로 표기, 그 이상은 정확한 값 (`fmtP()` 구현 필수)
7. **신뢰구간 표기**: `95% CI [lower, upper]` 형식 (문장 중 "95% 신뢰구간은 [...]이었다" 대신)
8. **소프트웨어 인용**: Methods 마지막 문장에 BioHub + SciPy 인용 포함 (C-3 참조)
9. **수동태 사용**: "~를 실시하였다", "~가 확인되었다"
10. **graceful degradation**: null/undefined 필드는 문장에서 자연스럽게 생략 (에러 아님)
    - effectSize null → Cohen's d 문장 생략 + 섹션 하단 회색 안내 (`효과 크기 데이터 없음 — APA 권장 보고 미포함`)
    - df null → 통계량 표기에서 df 부분 생략
    - assumptions 없음 → 가정검정 문장 전체 생략

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
| **L1 단위** | `flattenAssumptions()` | 중첩 구조 입력 → flat 배열 검증 (category, testName, passed 정확성). **엣지 케이스 필수**: (1) normality.group1/group2 다중 그룹, (2) passed=true 기본값, (3) assumptions=undefined 입력, (4) 빈 normality 객체, (5) homogeneity만 있는 케이스 |
| **L1 단위** | `paper-templates.ts` 포맷 규칙 | 의미 기반: p값 포함 여부, df 포함 여부, optional 필드 생략 시 에러 없음. **추가**: 비모수 Mdn/IQR 사용, 신뢰구간 `95% CI [...]` 형식, p<.001 분기 |
| **L1 단위** | `paper-templates.ts` golden snapshot | 카테고리별 대표 1개 × 한글 = **12개** (영문은 Phase A MVP 이후). 표준 `DraftContext` fixture 정의 필수 (snapshot 재현성 보장) |
| **L1 단위** | `terminology-utils.ts` | 전 메서드 ID → displayName 매핑 확인 |
| **L1 단위** | `fmtP()` 유틸 | `p=0.0001` → `< .001`, `p=0.021` → `= .021`, `p=1.0` → `= 1.000` 등 경계값 |
| **L2 통합** | `paper-draft-service.ts` | ExportContext mock → PaperDraft 전체 반환 (null 아닌 섹션 수 검증). **불완전 데이터 케이스**: effectSize=null, groupStats=[], assumptions=undefined |
| **L3 E2E** | PaperDraftPanel | 결과 화면 → 논문 초안 버튼 → 섹션 표시 → 복사 동작. Discussion E2E는 `vi.mock`으로 LLM stub (실제 API 의존 금지) |

**표준 DraftContext fixture (golden snapshot용)**:
```typescript
const FIXTURE_DRAFT_CONTEXT: DraftContext = {
  variableLabels: { 'body_len': '체장', 'weight': '체중' },
  variableUnits: { 'body_len': 'cm', 'weight': 'g' },
  groupLabels: { 'M': '수컷', 'F': '암컷' },
  dependentVariable: '체장',
  researchContext: '양식 어류의 성별에 따른 성장 차이 비교',
}
```

---

## Phase 순서 요약 (v7 재정의)

```
Phase 0: 데이터 계약 정리 (핵심 2개)
  [필수] flattenAssumptions() — 가정검정 중첩구조 정규화
  [필수] methodId 안정 키 — AnalysisResult + 결과 경로 확정(executor vs Worker)
  [확인완료] visualizationData.type — analysis.ts에 이미 정확히 구현됨
  [이후] terminology plain utils — Phase A MVP 이후 리팩토링
  ↓
Phase A: 템플릿 엔진(한글 MVP) + UI + 저장
  DraftContextEditor(확인 단계) + 12카테고리 한글 템플릿 + CaptionItem[]
  + PaperDraftPanel(세로 스크롤) + 논문 초안 버튼(독립 배치)
  + AnalysisHistory.paperDraft 저장/복원 + Turso ensureColumn
  + 영문 템플릿은 stub ("English template coming soon") 처리
  + 테스트 (L1 단위 + L2 통합)
  ↓
Phase B: Discussion LLM + 클립보드 + 영문 템플릿 완성
  학술 프롬프트 + DiscussionState 취소 포함 + 서식 복사(이탤릭 보존)
  영문 12카테고리 템플릿 완성 + 한글→영문 전환 경고 UI
  ↓
Phase C: DOCX + 프리셋 + 품질 + 차별화
  논문 DOCX(이탤릭 + Graph Studio 차트 삽입) + 저널 스타일
  BioHub+SciPy 인용문(APA 형식) + 재현 가능성 코드 스니펫
  Graph Studio 차트 → Figure 직접 연결 (C-7, 연결 추적 구조 선행 필요)
  IMRAD 체크리스트 + CONSORT/STROBE/ARRIVE 보고 가이드라인
```

**제약사항 (의도적 제외)**:
- **Stateless**: 단일 분석 결과 기준 — 여러 분석 통합은 Phase C 이후 별도 검토
- **Graph Studio 독립 진입점 없음**: C-7 역방향 연결 구현 전까지 Graph Studio에서 논문 초안 생성 불가

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

## v7 변경 이력 (UX 재검토 + 경쟁사 분석 + 전문성 기능)

| 지적/발견 | 반영 |
|----------|------|
| 진입점이 "내보내기" 드롭다운에 묻힘 | 액션 바에 `📄 논문 초안` 독립 버튼으로 노출 |
| DraftContextEditor 변수 많으면 스크롤 과다 | 4개 이상이면 핵심(종속변수+집단명)만 표시, 나머지 접기 |
| 연구 맥락 빈 칸이 어색함 | placeholder "예: 양식 어류의 성별..." 추가로 선택임을 명확히 |
| 탭 구조 — 전체 흐름 파악 불편 | 세로 스크롤 단일 뷰로 전환, 탭은 앵커 링크 보조 |
| 복사 피드백 없음 | 체크마크(✓) + "복사됨" 0.5초 표시 필수 추가 |
| Discussion vs AI 해석 차이 불명확 | "학술 논문 문체로 변환" 설명 문구 추가 |
| Phase A 복사 시 `*t*` 기호 노출 | Phase A에서도 최소 이탤릭/볼드 HTML 변환 적용 |
| 언어 토글 전환 후 시각적 피드백 없음 | 50ms 페이드 효과 — 즉시 재생성임을 전달 |
| 히스토리에서 초안 있는 항목 구분 불가 | 히스토리 카드에 `📄` 배지 추가 |
| 경쟁사 분석 — 경쟁사 전무한 기회 발견 | Graph Studio 차트 → Figure 직접 연결 (C-7) 추가 |
| 전문성 — BioHub 인용문 없음 | C-3 BioHub 인용문 자동 생성 (버전 + URL 포함) |
| 전문성 — 재현 가능성 미지원 | C-6 Python/R 코드 스니펫 자동 생성 추가 |
| 전문성 — 보고 가이드라인 없음 | C-5에 CONSORT/STROBE/ARRIVE 체크 추가 |
| 경쟁사 포지셔닝 섹션 신규 추가 | "R `report`의 편의성 + JASP APA 품질 + 한국어 + Graph Studio 통합" |

## v9 변경 이력 (최종 병렬 구현 검토)

| 발견 | 반영 |
|------|------|
| **[MEDIUM] `updateHistory()` 미존재** — `storage.ts`에 부분 업데이트 API 없음. `saveHistory(record, isUpdate?)`는 전체 교체 PUT만 지원 | A-6의 `patchHistoryPaperDraft()` 내부 구현 상세화: `updateHistory()` + `syncHistoryRecord()` 신규 구현 코드 추가. Phase 0에 **0-5, 0-6** 항목 신설 |
| **[MEDIUM] `syncHistoryRecord()` 미존재** — `HybridAdapter.syncPendingItems()`는 전역 큐 기반, 개별 레코드 즉시 동기화 없음 | `HybridAdapter`에 `syncHistoryRecord(id)` 신규 메서드 구현 코드 추가. Phase 0-6으로 명시 |
| **[MEDIUM] category 불일치** — `types/analysis.ts`에 `'psychometrics'`, `'design'`이 있으나 `METHOD_CATEGORIES` 키에 없음. `reliability`, `power-analysis` 라우팅 실패 위험 | 카테고리 테이블 아래 주의 메모 추가: `CATEGORY_TEMPLATES`에 두 키 명시 등록, 또는 `METHOD_OVERRIDES`에 직접 등록 권장 |

## v8 변경 이력 (코드 기반 아키텍처 검토)

| 발견 | 반영 |
|------|------|
| **[HIGH] Phase 0-4 과도한 리팩터** — `selectedMethod.id`가 `history-store.ts:193-194`에 이미 저장됨 | 전략 변경: `AnalysisResult` 확장 없이 `generatePaperDraft(methodId)`로 UI에서 전달 |
| **[HIGH] 자동저장 중복 위험** — `saveToHistory()`가 항상 새 ID 생성 (`history-store.ts:188-189`) | `patchHistoryPaperDraft(historyId, paperDraft)` 신규 API 추가 명시 |
| **[MEDIUM] 복원 UX 불완전** — `loadFromHistory()`가 `paperDraft` 미복원 (`history-store.ts:241-242`) | `loadedPaperDraft` 히스토리 스토어 상태 추가 + set() 블록 확장 명시 |
| **[MEDIUM] 잘못된 파일 경로** — `types/smart-flow.ts`, `smart-flow-store.ts`, `components/smart-flow/steps/results/` | `types/analysis.ts`, `history-store.ts`, `components/analysis/steps/`로 전면 수정 |

**v7 추가 (4-way subagent 검토 반영):**

| 발견 | 반영 |
|------|------|
| `smart-flow.ts` 파일 없음 | 전체 참조를 `analysis.ts`로 수정 |
| Phase 0-2 MVP 불필요 | 후순위로 이동 명시 |
| Phase 0-3 코드 변경 없음 | "확인 메모" 표시 |
| Phase 0-4 범위 과소평가 | executor vs Worker 두 경로 존재 — 범위 확정 선행 명시 |
| Levene F에 df(1, N-2) 누락 | 문체 규칙 5번에 추가 |
| Shapiro-Wilk `*W*(n)` 이탤릭+표본크기 누락 | 문체 규칙 5번에 추가 |
| 비모수 검정 M/SD → Mdn/IQR 수정 | 문체 규칙 3번 추가 |
| 신뢰구간 표기 불일치 | `95% CI [lower, upper]` 형식으로 통일 |
| p < .001 분기 없음 | `fmtP()` 구현 필수 명시 + 테스트 추가 |
| η² vs η²p 구분 누락 | 문체 규칙 4번에 추가 |
| BioHub 인용 APA 형식 불일치 | C-3 전면 재작성 (APA §10.10 준수) |
| SciPy/statsmodels/pingouin 인용 누락 | C-3에 참고문헌 자동 생성 항목 추가 |
| DiscussionState 취소 상태 없음 | `{ status: 'cancelling'; partial: string }` 추가 |
| 언어 전환 + 한글값 충돌 미처리 | 경고 배지 + 확인 팝업 + 도메인 사전 조회 규칙 명시 |
| DraftContextEditor 높이/스크롤 미정의 | `max-h-[80vh] overflow-y-auto` 명시 |
| "전체 복사" 포맷 선택 없음 | 제목 포함/제외 2가지 옵션 A-5에 추가 필요 |
| 히스토리 복원 시 자동 열림 문제 | 닫힌 상태 기본 + 버튼 배지 인디케이터 방식으로 변경 |
| "다시 생성" Discussion 포함 여부 모호 | 팝업 선택 분기 명시 |
| Turso saveHistory/loadHistory 미명시 | A-6에 `ensureColumn` + 직렬화 코드 추가 항목 명시 |
| Golden snapshot DraftContext fixture 없음 | 표준 fixture 정의 추가 |
| E2E LLM 호출 실제 API 의존 위험 | `vi.mock` stub 처리 명시 |
| flattenAssumptions 엣지 케이스 정의 부족 | 5개 엣지 케이스 테스트 테이블에 명시 |
| 영문 템플릿 Phase A 범위 미결정 | stub 처리로 결정, 영문 완성은 Phase B |
| C-7 연결 추적 구조 전제 작업 없음 | 제약사항에 명시 |
| 다중 분석 통합 제외 이유 미기재 | 제약사항에 의도적 제외 + 향후 재검토 명시 |

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
