# Chat Diagnostic Pipeline + SmartFlow 연동 설계

> 채팅에서 데이터 + 분석 요청 시 기초통계/정규성/등분산 진단을 자동 실행하고,
> 결과를 구조화하여 보여준 뒤 최적 분석 방법을 추천하며,
> SmartFlow 4단계와 연동하여 Hub에서 결정된 사항이 분석 플로우까지 이어지도록 한다.

**상태**: 설계 승인 대기
**날짜**: 2026-04-08

---

## 1. 배경

### 1-1. Hub 진단 불투명성

현재 ChatCentricHub는 데이터가 업로드되면 내부적으로 정규성 검정과 기술통계를 실행하지만,
결과가 LLM 컨텍스트에만 전달되고 사용자에게는 보이지 않는다.
사용자는 "왜 이 방법을 추천하는지" 근거를 볼 수 없고,
등분산 검정은 그룹 변수를 알아야 하므로 아예 실행되지 않는다.

### 1-2. Hub–Step 2 역할 중복

현재 **두 곳**에서 "어떤 분석을 할지" 결정하는 구조:

| 위치 | 방법 추천 | 변수 탐지 | 데이터 진단 |
|------|-----------|-----------|-------------|
| **Hub (ChatCentricHub)** | Intent Router + LLM | `variableAssignments` | 정규성만 (백그라운드) |
| **Step 2 (PurposeInputStep)** | Decision Tree + LLM + 브라우저 | `detectedVariables` | 없음 |

Hub에서 LLM 대화로 추천을 받았는데, Step 2에서 다시 목적을 묻는다.
Quick Analysis로 Step 2를 건너뛰는 코드 경로가 있지만, `data-consultation` 경로에서는
Hub 대화 결과가 Step 2에 전달되지 않는다.

### 1-3. 설계 방향: A안 (Hub 강화 + Step 2 조건부)

```
Hub (Diagnostic Pipeline)
  ├─ 데이터 + 의도 → 진단 리포트 + 추천 + 변수 탐지
  │   → "분석 시작" → Step 1(확인) → Step 3(프리필) → Step 4
  │
  ├─ 데이터 + 의도 모호 → 부분 진단 + 질문 → 답변 → 위와 동일
  │
  ├─ 데이터 없이 상담 → 방법 추천 + 데이터 준비 가이드
  │   → 업로드 → Pipeline 자동 → 위와 동일
  │
  ├─ 실험 설계 질문 → Consultant 모드 (power-analysis 추천 가능)
  │
  ├─ Quick Analysis pill → Step 1 → Step 3(heuristic) → Step 4
  │
  └─ "방법 탐색하고 싶어" → Step 1 → Step 2(브라우저) → Step 3 → Step 4
```

**핵심**: Step 2를 삭제하지 않고 **조건부 표시**로 변경. Pipeline 경로에서는 건너뛰고,
사용자가 직접 탐색을 원하거나 Hub 추천 없이 진입한 경우에만 표시.

### 목표

1. 채팅에서 데이터 진단 결과(기초통계, 정규성, 등분산)를 구조화하여 사용자에게 보여준다.
2. 진단 결과를 근거로 최적 분석 방법 + 추가 분석 제안을 한다.
3. 데이터 없이 상담할 때는 의도 파악 후 데이터 준비 안내를 한다.
4. **Hub에서 결정된 메서드 + 변수 + 설정이 SmartFlow Step 3까지 끊김 없이 전달된다.**
5. **Step 2는 Hub 추천이 없을 때만 표시된다 (조건부).**

### 범위

집단 비교(t-test, ANOVA 등)와 상관/회귀를 모두 포괄한다.
기존 `runAssumptionTests()`가 이미 분석 유형별 분기를 내장:
- **집단 비교**: 그룹별 Shapiro-Wilk + Levene (Worker 3 `test_assumptions`)
- **상관/회귀**: 종속변수 단일 Shapiro-Wilk (Worker 1 `normality_test`)

파이프라인은 이 분기를 그대로 위임하므로, 분석 유형에 따라 적절한 가정 검정이 자동으로 실행된다.

**SmartFlow 변경 포함**: Hub 진단 파이프라인 + Step 2 조건부 + Step 3 프리필 + 설정 전달.

---

## 2. 시나리오

### A. 데이터 없이 상담

```
사용자: "두 집단 간 차이가 있는지 알고 싶어요"
  → intentRouter.classify() → data-consultation
  → dataContext === null
  → hub-chat-service → CONSULTANT 프롬프트 (보강됨)
  →
AI 응답:
  1. 의도 파악 + 방법 추천 (기존)
  2. [신규] 데이터 준비 가이드 (필요 컬럼 구조, 최소 표본, CSV 예시)
  3. [신규] 추가 분석 제안 (alternatives 필드 활용)
```

변경: CONSULTANT 프롬프트에 데이터 준비 안내 + 추가 분석 제안 지시 추가. 코드 변경 없음.

### B. 데이터 + 분석 요청

```
사용자: [CSV 업로드] + "사료 종류별 생산량 차이 비교"
  → intentRouter.classify() → data-consultation
  → dataContext !== null
  →
  → [신규] DiagnosticPipeline.run()
  →   1. 기초통계 (validationResults에서 추출)
  →   2. 정규성 (normality enrichment 결과 수집)
  →   3. LLM 1차 호출: 의도 + 변수 탐지 (variableAssignments)
  →   4. 등분산 (탐지된 그룹 변수로 Levene 실행)
  →   5. DiagnosticReport 구성
  →
  → LLM 2차 호출: DiagnosticReport 컨텍스트로 최종 추천 + 추가 분석 제안
  →
채팅 표시:
  1. 진단 리포트 카드 (DiagnosticReport 구조화 데이터)
  2. AI 추천 + 추가 분석 제안 (LLM 텍스트)
  3. "분석 시작하기" 버튼 → bridgeDiagnosticToSmartFlow() → Step 1(확인) → Step 3 점프
     (섹션 9 SmartFlow 연동 참조)
```

### B-2. 데이터 있지만 의도 불명확 (변수 미탐지)

```
사용자: [CSV 업로드] + "이 데이터 분석해줘"
  → DiagnosticPipeline.run()
  →   1~2: 기초통계 + 정규성 (동일)
  →   3: LLM 1차 → variableAssignments = null (의도 모호)
  →   4: 등분산 스킵
  →   5: DiagnosticReport.pendingClarification = "어떤 변수를 비교 기준으로 사용할까요?"
  →
채팅 표시:
  1. 기초통계 + 정규성까지의 부분 진단 리포트
  2. "어떤 변수를 비교 기준으로 사용할까요?" 질문
  →
사용자: "사료종류로 비교해줘"
  → DiagnosticPipeline.resume(previousReport, userAnswer)
  →   변수 지정 → Levene 실행 → DiagnosticReport 완성
  → LLM 2차 → 최종 추천
```

### C. 멀티턴 후속 대화

진단 + 추천 이후 대화가 계속될 수 있다. 기존 diagnosticReport를 LLM 컨텍스트에 포함하여 자연스러운 멀티턴을 지원한다.

#### C-1. 추천에 대한 질문

```
Turn 1: [CSV 업로드] + "사료별 생산량 차이 비교"
  → DiagnosticPipeline → ANOVA 추천 (diagnosticReport 포함 메시지)

Turn 2: "비모수 방법은 없어?"
  → 대화에 diagnosticReport 있음 + 새 분석 요청 아님 (후속 질문)
  → getHubAiResponse() + diagnosticReport 마크다운을 LLM 컨텍스트에 포함
  → AI: "정규성이 충족(p=0.23)되어 ANOVA가 적합하지만, 
         비모수 대안으로 Kruskal-Wallis가 있어요..."

Turn 3: "사후검정은 뭘로 하는 게 좋아?"
  → 동일 흐름 — diagnosticReport 컨텍스트 유지
  → AI: "3개 그룹 비교이고 등분산 충족(Levene p=0.34)이므로 Tukey HSD 추천..."

Turn 4: "좋아, ANOVA로 하자"
  → direct-analysis → bridgeDiagnosticToSmartFlow()
  → Step 1(데이터 확인, 이미 업로드됨) → Step 3(변수 프리필) → Step 4
  (Step 2 건너뜀 — Hub에서 이미 결정)
```

#### C-2. 같은 데이터, 다른 분석 요청

```
Turn 1: 진단 + ANOVA 추천 (위와 동일)

Turn 2: "사료종류랑 생산량의 상관관계도 볼 수 있어?"
  → 대화에 diagnosticReport 있음 + 새 분석 요청
  → 부분 재실행: 1~2단계(기초통계+정규성) 캐싱, 3~5단계(변수 탐지+Levene) 재실행
  → 새 diagnosticReport로 상관분석 추천
```

#### C-3. 새 데이터 업로드

```
Turn N: [새 CSV 업로드]
  → dataContext 갱신 → 이전 diagnosticReport 무효화
  → 다음 분석 요청 시 전체 DiagnosticPipeline 재실행
```

#### 후속 대화 판단 로직

```
handleSubmit()
  → resume 감지 (pendingClarification 있으면 → resume)
  → intentRouter.classify()
  → dataContext 있음?
     ├─ 없음 → CONSULTANT
     └─ 있음 → 대화에 diagnosticReport 존재?
              ├─ 없음 → 전체 DiagnosticPipeline
              └─ 있음 → 새 분석 요청인가?
                       ├─ 예 → 부분 재실행 (1~2 캐싱, 3~5 재실행)
                       └─ 아니오 → 기존 report를 LLM 컨텍스트에
                                  포함하여 getHubAiResponse()
```

**"새 분석 요청" 판단 기준** (intentRouter 결과 활용):
- `direct-analysis` 트랙 → 새 분석
- 사용자 메시지에 다른 분석 메서드 키워드 → 새 분석
- 그 외 `data-consultation` → 후속 질문 (기존 report 활용)

---

## 3. DiagnosticPipeline 서비스

### 위치

`lib/services/diagnostic-pipeline.ts` (신규)

### 타입 정의

`DiagnosticReport` 타입은 `types/analysis.ts`에 정의한다 (기존 `StatisticalAssumptions`, `AIRecommendation` 등과 함께).

```typescript
interface DiagnosticPipelineInput {
  userMessage: string
  data: readonly DataRow[]
  validationResults: ValidationResults
  chatHistory: FlowChatMessage[]
}

interface DiagnosticReport {
  /** 업로드 nonce — 업로드마다 단조 증가. 새 데이터 감지용 */
  uploadNonce: number
  /** 기초통계 요약 */
  basicStats: {
    totalRows: number
    groups?: Array<{ name: string; count: number }>
    numericSummaries: Array<{
      column: string
      mean: number
      std: number
      min: number
      max: number
    }>
    /** 컬럼 전체 분포의 정규성 (참고용, 분석 판단 근거 아님) */
    columnNormality?: Array<{
      column: string
      pValue: number
      passed: boolean
    }>
  }
  /** 가정 검정 결과 — 변수 탐지 후 실행 (분석 판단 근거)
   *
   * ⚠️ StatisticalAssumptions 대신 전용 타입 사용:
   *   기존 StatisticalAssumptions는 group1/group2만 표현하고, 3개 이상 그룹에서는
   *   min(p)로 접는다 (assumption-testing-service.ts:168-194).
   *   진단 리포트의 목표는 "왜 이 방법인지" 투명하게 보여주는 것이므로,
   *   모든 그룹의 개별 결과를 보존하는 별도 타입을 사용한다.
   */
  assumptions: DiagnosticAssumptions | null
  /** LLM이 탐지한 변수 역할 */
  variableAssignments: AIRecommendation['variableAssignments'] | null
  /** 사용자에게 물어야 할 질문 (변수 미탐지 시) */
  pendingClarification: {
    /** 사용자에게 표시할 질문 */
    question: string
    /** 어떤 역할이 비어 있는지 */
    missingRoles: Array<'dependent' | 'factor' | 'independent' | 'covariate'>
    /** 선택지로 제시할 컬럼 목록 */
    candidateColumns: Array<{
      column: string
      type: 'numeric' | 'categorical'
      uniqueValues?: number
      sampleGroups?: string[]
    }>
  } | null
}

/**
 * 진단 전용 가정 검정 결과 — 모든 그룹의 개별 결과를 보존.
 *
 * 기존 StatisticalAssumptions는 group1/group2만 표현하고 3+그룹에서 min(p)로 접지만,
 * 진단 리포트는 "왜 이 방법인지" 투명하게 보여주는 것이 목표이므로
 * 모든 그룹의 개별 Shapiro-Wilk 결과를 보존한다.
 *
 * Step 4 실행에서는 기존 StatisticalAssumptions로 변환하여 재사용.
 */
interface DiagnosticAssumptions {
  normality: {
    /** 개별 그룹 결과 (ANOVA 3개 이상 그룹 지원) */
    groups: Array<{
      groupName: string
      statistic: number
      pValue: number
      passed: boolean
    }>
    /** 전체 판정: 모든 그룹이 정규 → true */
    overallPassed: boolean
    /** 검정 방법 ('shapiro-wilk' | 'kolmogorov-smirnov') */
    testMethod: string
  }
  homogeneity: {
    levene: {
      statistic: number
      pValue: number
      equalVariance: boolean
    }
  } | null
}

/** DiagnosticAssumptions → StatisticalAssumptions 변환 (Step 4 재사용용) */
function toStatisticalAssumptions(da: DiagnosticAssumptions): StatisticalAssumptions

/** 파이프라인 실행 */
function runDiagnosticPipeline(input: DiagnosticPipelineInput): Promise<DiagnosticReport>

/** 사용자 답변으로 중단된 파이프라인 재개 */
function resumeDiagnosticPipeline(
  previousReport: DiagnosticReport,
  userAnswer: string,
  data: readonly DataRow[],
  validationResults: ValidationResults
): Promise<DiagnosticReport>
```

### 단계별 처리

| 단계 | 입력 | 처리 | 재사용 서비스 |
|------|------|------|---------------|
| 1. 기초통계 | `validationResults` | 수치형/범주형 요약 + 컬럼별 정규성(참고용) 추출 | 이미 계산됨, 가공만 |
| 2. 변수 탐지 | `userMessage` + 기초통계 | LLM 1차 호출 (경량 프롬프트) | `openrouter-recommender` |
| 3. 가정 검정 | `variableAssignments` + `data` | **그룹별 정규성 + 등분산을 함께 실행** | `assumption-testing-service` |
| 4. 조합 | 1~3 결과 | DiagnosticReport 구성 | 신규 |

### 단계 1: 기초통계 + 컬럼별 정규성 (참고용)

`validationResults`에서 기술통계를 추출한다.
`validationResults.columns[].normality`(컬럼 전체 분포)는 **참고 정보**로만 포함.
이 값은 분석 방법 판단 근거가 아님 — 근거는 단계 3의 그룹별 정규성.

업로드 직후 메시지를 보내 normality enrichment가 미완료인 경우:
컬럼별 정규성은 빈 상태로 진행. 분석 판단에 영향 없음 (단계 3에서 그룹별로 새로 실행).

### 단계 2 분기

- `variableAssignments` 있음 → 3단계(가정 검정) 진행
- `variableAssignments` 없음 → `pendingClarification` 설정, 3단계 스킵

### 단계 3: 가정 검정 — 분석 유형별 분기

기존 `runAssumptionTests()`는 Worker 3의 `test_assumptions`를 호출하여
그룹별 Shapiro-Wilk + Levene를 **한 번의 Worker 호출**로 실행한다.

그러나 현재 `runAssumptionTests()`의 반환값(`StatisticalAssumptions`)은
`group1`/`group2`만 표현하고, 3개 이상 그룹에서는 `min(p)`로 접는다
(assumption-testing-service.ts:168-194).

**Pipeline에서는 Worker 결과를 직접 매핑**하여 모든 그룹을 보존한다:

```
variableAssignments에 그룹 변수(factor/independent/between)가 있는가?
├─ 있음 (집단 비교: t-test, ANOVA 등)
│   → Worker 3 `test_assumptions` 호출 (기존과 동일)
│   → Worker 결과의 result.normality.shapiroWilk[] 배열을 전부 보존
│   → DiagnosticAssumptions.normality.groups[] 에 1:1 매핑
│   → DiagnosticAssumptions.homogeneity.levene 설정
│
└─ 없음 (상관/회귀 등)
    → Worker 1 `normality_test` 호출 (종속변수 단일)
    → DiagnosticAssumptions.normality.groups = [{ groupName: '전체', ... }]
    → DiagnosticAssumptions.homogeneity = null
```

**구현 방법**: `runAssumptionTests()`를 수정하지 않고,
별도의 `runDiagnosticAssumptions()` 함수에서 같은 Worker를 호출하되
결과를 `DiagnosticAssumptions` 타입으로 직접 매핑한다.

Step 4에서 기존 `StatisticalAssumptions`가 필요할 때는
`toStatisticalAssumptions(da)` 변환 함수를 사용한다 (섹션 3 타입 정의 참조).

이 분기는 `assumption-testing-service.ts`가 이미 내부적으로 처리 (line 92~124)하는
Worker 선택 로직을 재사용.

### resume 흐름

`resumeDiagnosticPipeline()`은 `pendingClarification.missingRoles`를 참조하여
사용자 답변에서 해당 역할의 변수명을 추출한다:

1. `candidateColumns`의 컬럼명과 사용자 답변을 직접 매칭 시도
2. 매칭 실패 시 LLM에 "이 답변에서 [역할]에 해당하는 변수명을 추출하세요" 요청
3. 추출된 변수로 `variableAssignments`를 채운 뒤 3~4단계(가정 검정 + 조합)만 실행

---

## 4. LLM 프롬프트 변경

### CONSULTANT 보강 (데이터 없음)

기존 프롬프트 끝에 추가:

```
## 데이터 준비 안내
사용자가 데이터 없이 상담할 때, 추천 방법에 맞는 데이터 형식을 안내하세요:
- 필요한 컬럼 구조 (예: "group열: 집단 구분, value열: 측정값")
- 최소 표본 크기 권장
- CSV 형식 예시 1~2행

## 추가 분석 제안
주 추천 외에 관련 분석 2~3개를 alternatives에 포함하되,
각 대안이 "왜 이 데이터에서 추가로 볼 만한지" 이유를 붙이세요.
```

JSON 스키마 변경 없음 — 기존 `alternatives[]` 필드 활용.

### 변수 탐지 프롬프트 (신규 — 1차 호출용)

```
당신은 데이터 변수 탐지기입니다.
사용자의 분석 의도와 데이터 요약을 보고,
종속변수/독립변수/그룹변수 역할을 판단하세요.

## 응답 형식
```json
{
  "variableAssignments": {
    "dependent": ["컬럼명"],
    "independent": ["컬럼명"],
    "factor": ["컬럼명"],
    "covariate": ["컬럼명"]
  },
  "clarificationNeeded": null
}
```

의도가 모호하면 variableAssignments를 null로,
clarificationNeeded에 사용자에게 물을 질문을 넣으세요.
```

### DIAGNOSTIC 보강 (2차 호출)

기존 DIAGNOSTIC 프롬프트에 추가:

```
## 진단 리포트 활용
아래 진단 리포트의 수치를 반드시 인용하여 추천 근거를 설명하세요.
- 정규성/등분산 충족 여부에 따라 모수/비모수 확정
- 추가 분석 2~3개를 alternatives에 포함 (근거 포함)
```

### 토큰 비용

| 호출 | 입력 | 출력 | 비용 (gemini-flash-lite) |
|------|------|------|--------------------------|
| 1차 (변수 탐지) | ~800 | ~150 | ~$0.0001 |
| 2차 (최종 추천) | ~1,500 | ~400 | ~$0.0003 |
| **합계** | ~2,300 | ~550 | **~$0.0004/건** |

---

## 5. hub-chat-service 통합

### 변경 후 흐름 (멀티턴 포함)

```
ChatInput → handleSubmit()  (ChatCentricHub.tsx)
  → [1단계] resume 감지 (intentRouter 호출 전, deterministic):
     pendingClarification 있음 && 같은 uploadNonce?
     ├─ 있음 → resumeDiagnosticPipeline() → 가정 검정 → LLM 2차
     │         (intentRouter 스킵 — 불필요한 LLM 분류 호출 방지)
     └─ 없음 ↓
  → [2단계] intentRouter.classify()
     → dataContext 분기:
        ├─ null → getHubAiResponse() (기존, 프롬프트만 보강)
        └─ 있음 → 대화에 diagnosticReport 존재?
                 ├─ 없음 → getHubDiagnosticResponse() [전체 파이프라인]
                 └─ 있음 → 새 분석 요청?
                          ├─ 예 → getHubDiagnosticResponse() [부분 재실행: 2~4만]
                          └─ 아니오 → getHubAiResponse() + diagnosticReport 컨텍스트
```

#### 첫 분석 요청: `getHubDiagnosticResponse()` 전체 실행

```
DiagnosticPipeline.run()
  → 단일 assistant 메시지로 반환:
     diagnosticReport (구조화 데이터)
     + content (LLM 추천 텍스트)
     + recommendation (구조화 추천)
  → pendingClarification 분기:
     ├─ 있음 → diagnosticReport + 질문만, recommendation 없음
     └─ 없음 → LLM 2차 → diagnosticReport + 추천 + recommendation 모두
```

#### 후속 질문: `getHubAiResponse()` + 진단 컨텍스트

추천에 대한 질문, 대안 비교 등 기존 report로 답변 가능한 후속 대화.
기존 `getHubAiResponse()`에 직전 diagnosticReport 마크다운을 `dataContextOverride`에 포함:

```typescript
const existingReport = findLatestDiagnosticReport(priorMessages)
if (existingReport) {
  // 기존 데이터 컨텍스트 + 진단 리포트를 합쳐서 LLM에 전달
  const enrichedContext = buildContextForIntent(...) + '\n\n' + buildDiagnosticReportMarkdown(existingReport)
  // getHubAiResponse()에 dataContextOverride로 전달
}
```

#### 같은 데이터, 다른 분석: `getHubDiagnosticResponse()` 부분 재실행

```
DiagnosticPipeline.run({ reuseBasicStats: existingReport })
  → 1~2단계: 기존 report에서 basicStats + normality 재사용
  → 3~5단계: 새 의도로 변수 탐지 + Levene 재실행
  → 새 diagnosticReport로 assistant 메시지 생성
```

#### "새 분석 요청" 판단 기준

intentRouter 결과 활용 (LLM 호출 없이 판단):
- `direct-analysis` 트랙 → 새 분석
- `data-consultation` + 메시지에 분석 메서드 키워드 포함 → 새 분석
- 그 외 `data-consultation` → 후속 질문

#### 기존 diagnosticReport 탐색

```typescript
function findLatestDiagnosticReport(messages: HubChatMessage[]): DiagnosticReport | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].diagnosticReport) return messages[i].diagnosticReport
  }
  return null
}
```

새 데이터 업로드 시 `dataContext`가 갱신되므로, 이전 diagnosticReport는 데이터 불일치.
이를 방지하기 위해 업로드마다 단조 증가하는 `uploadNonce`를 사용한다.
`HubDataContext`에 `uploadNonce: number` 필드를 추가하고, 업로드 시 +1.
`findLatestDiagnosticReport()`는 현재 dataContext의 nonce와 report의 nonce가 일치할 때만 반환.

### 메시지 모델: 단일 메시지

현재 구조는 1 user → 1 assistant 메시지.
이 패턴을 유지하여, **하나의 assistant 메시지에 diagnosticReport + content + recommendation을 모두 담는다.**
ChatThread에서 하나의 메시지를 진단 카드 + 텍스트 + 추천 카드로 렌더링.

### resume 감지 (ChatCentricHub에서 처리)

resume 감지는 **intentRouter.classify()보다 먼저** deterministic하게 수행한다.
사용자가 컬럼명만 답하거나 후보 칩을 클릭하는 경우, intentRouter가 오분류할 수 있고
불필요한 LLM 분류 호출도 발생하기 때문이다.

```typescript
// handleSubmit() 진입부 — intentRouter 호출 전에 resume 판단

const lastAssistant = priorMessages.findLast(m => m.role === 'assistant')
const report = lastAssistant?.diagnosticReport
const currentNonce = dataContext?.uploadNonce

const shouldResume =
  report?.pendingClarification != null        // 1. 미완료 질문이 있고
  && currentNonce === report.uploadNonce       // 2. 같은 데이터일 때

if (shouldResume) {
  // resume 모드: intentRouter 스킵, 바로 resumeDiagnosticPipeline()
  const resumedReport = await resumeDiagnosticPipeline(report, message, ...)
  // → LLM 2차 → 진단 카드 + 추천 메시지 생성
  return
}

// resume 아닌 경우에만 intentRouter 호출
const intent = await intentRouter.classify(message)
// → 이하 기존 분기 (direct-analysis / data-consultation / ...)
```

**왜 intentRouter 가드를 제거했는가:**
- `pendingClarification`이 있으면 사용자 답변은 거의 확실히 해당 질문에 대한 응답이다.
- 같은 nonce인 한 (데이터가 바뀌지 않은 한) resume이 안전하다.
- 사용자가 전혀 다른 주제를 입력하더라도, `resumeDiagnosticPipeline()`이 변수명 매칭에 실패하면
  LLM에 "이 답변에서 변수명을 추출하세요"를 요청하고, 그래도 실패하면
  pendingClarification을 다시 설정하여 재질문한다 (graceful fallback).
- 새 데이터 업로드 시 nonce가 바뀌므로 resume이 자동 해제된다.

### 신규 함수

```typescript
export async function getHubDiagnosticResponse(
  request: HubChatRequest
): Promise<HubDiagnosticChatResponse>

interface HubDiagnosticChatResponse extends HubChatResponse {
  diagnosticReport: DiagnosticReport
}
```

### HubChatMessage 확장

```typescript
interface HubChatMessage {
  // ...기존 필드
  /** 진단 리포트 구조화 데이터 */
  diagnosticReport?: DiagnosticReport
}
```

하나의 메시지 안에서:
- `diagnosticReport` 있으면 → 진단 카드 렌더링
- `content` 있으면 → 텍스트 렌더링
- `recommendations` 있으면 → 추천 카드 렌더링

### recommendation → recommendations 변환 규약

서비스 응답과 스토어/UI의 타입이 다르다:
- **서비스**: `HubChatResponse.recommendation: AIRecommendation | null` (singular)
- **스토어/UI**: `HubChatMessage.recommendations: MethodRecommendation[]` (plural, 배열)

변환은 ChatCentricHub의 메시지 생성 시점에서 수행 (기존 패턴과 동일):

```typescript
// ChatCentricHub.tsx — 기존 getHubAiResponse() 호출 후 메시지 생성 패턴
const recommendations = response.recommendation
  ? [mapAIRecommendationToMethodRecommendation(response.recommendation)]
  : undefined

addMessage({
  ...baseMessage,
  content: response.content,
  recommendations,
  diagnosticReport: response.diagnosticReport,  // 신규
})
```

`mapAIRecommendationToMethodRecommendation()` 유틸은 기존에 ChatCentricHub에서 이미 사용 중인 변환 로직을 추출.
alternatives가 있으면 배열에 추가하여 여러 추천 카드로 렌더링.

### data-context-builder.ts 확장

```typescript
/** DiagnosticReport → LLM 2차 호출용 마크다운 */
export function buildDiagnosticReportMarkdown(report: DiagnosticReport): string
```

---

## 6. 변경 파일 요약

> 섹션 7: UX 고려사항, 섹션 8: 제약사항, **섹션 9: SmartFlow 연동**은 아래에 별도 기술.

### 6-1. Hub Diagnostic Pipeline (기존 범위)

| 파일 | 변경 |
|------|------|
| `lib/services/diagnostic-pipeline.ts` | **신규** — 진단 오케스트레이터 + `DiagnosticAssumptions` 타입 + `runDiagnosticAssumptions()` + `toStatisticalAssumptions()` 변환 |
| `lib/services/hub-chat-service.ts` | `getHubDiagnosticResponse()` 추가 |
| `lib/services/ai/prompts.ts` | 변수탐지 프롬프트 추가, CONSULTANT/DIAGNOSTIC 보강 |
| `lib/services/ai/data-context-builder.ts` | `buildDiagnosticReportMarkdown()` 추가 |
| `lib/stores/hub-chat-store.ts` | `HubChatMessage.diagnosticReport` 필드 + `streamingStatus` 상태 추가 |
| `components/analysis/hub/ChatThread.tsx` | DiagnosticReport 카드 렌더링 분기 |

### 6-2. SmartFlow 연동 (신규 범위)

| 파일 | 변경 |
|------|------|
| `lib/stores/store-orchestration.ts` | `bridgeDiagnosticToSmartFlow()` 추가 |
| `lib/stores/mode-store.ts` | `StepTrack`에 `'diagnostic'` 추가 |
| `lib/stores/analysis-store.ts` | `diagnosticReport` 필드 추가 (Pipeline 결과 보존) |
| `hooks/use-analysis-handlers.ts` | `startQuickAnalysis` → diagnostic 트랙 분기 추가 |
| `components/analysis/AnalysisSteps.tsx` | Step 2 조건부 렌더링 로직 |
| `components/analysis/steps/VariableSelectionStep.tsx` | `diagnosticReport.variableAssignments` 프리필 |
| `components/analysis/steps/AnalysisExecutionStep.tsx` | `suggestedSettings` → handler 전달 연결 |
| `components/analysis/ChatCentricHub.tsx` | "분석 시작" 버튼 → `bridgeDiagnosticToSmartFlow()` 호출 |
| `components/analysis/hub/ChatThread.tsx` | "분석 시작" / "방법 변경" 버튼 렌더링 |

기존 파일 5개 수정 + 신규 1개 (Pipeline) + SmartFlow 연동 9개 수정.

---

## 7. UX 고려사항

### 단계별 진행 표시

DiagnosticPipeline은 LLM 2회 + Pyodide 호출로 ~6초 소요.
기존 `isStreaming` 타이핑 인디케이터 대신 단계별 진행 메시지를 표시한다.

```
"데이터 진단 중..." → "검정 실행 중..." → "추천 생성 중..."
```

구현: `hub-chat-store`에 `streamingStatus: string | null` 필드 추가.
ChatThread의 TypingIndicator가 이 값을 표시. 파이프라인 각 단계에서 업데이트.

### pendingClarification에 선택지 포함

변수 미탐지 시 텍스트 질문만 보여주면 사용자가 컬럼명을 기억해야 한다.
`pendingClarification.candidateColumns`에 선택 가능한 변수 목록을 포함한다 (섹션 3 타입 참조).

채팅 표시 예시:
```
"어떤 변수를 비교 기준으로 사용할까요?

 [사료종류] 범주형 · 3개 그룹 (A, B, C)
 [산지]     범주형 · 5개 그룹 (서울, 부산, ...)
 [실험군]   범주형 · 2개 그룹 (처리, 대조)
```

클릭 또는 직접 타이핑 모두 지원. 클릭 시 해당 변수명이 자동 입력됨.

---

## 8. 제약사항

- **Pyodide 로딩**: 등분산(Levene)은 Pyodide가 필요. 업로드 시 정규성 enrichment에서 이미 초기화되므로 추가 대기 없음.
- **정규성 레이스 컨디션**: 업로드 후 enrichment 완료 전 메시지 전송 가능. DiagnosticPipeline 2단계에서 normality 누락 감지 시 직접 실행하여 해결 (섹션 3 참조).
- **LLM 의존**: 변수 탐지 실패 시 사용자 질문으로 폴백. LLM API 자체 실패 시 기존 graceful degradation 적용.
- **세션 스토리지**: `diagnosticReport`는 `HubChatMessage`에 포함되어 sessionStorage에 저장됨. 새로고침 시 채팅 히스토리와 함께 유지되지만 dataContext는 초기화되므로 resume은 불가.
- **LLM 히스토리**: `compressChatHistory()`는 `role + content + isError`만 추출하므로 diagnosticReport는 LLM 히스토리에 포함되지 않음. 이는 의도적 — 2차 호출에서 `buildDiagnosticReportMarkdown()`을 통해 직접 전달.
- **재시도**: `handleRetry()` 시 메시지 삭제 후 재제출 → DiagnosticPipeline 재실행. 캐싱 불필요 (파이프라인 실행 시간 < LLM 응답 시간).
- **Step 2 조건부 표시**: `stepTrack === 'diagnostic'`일 때 Step 2 건너뜀. 사용자가 Step 3에서 "방법 변경"을 원하면 Step 2로 이동 가능 (트랙 `'normal'`로 전환).
- **suggestedSettings 전달**: 현재 `suggestedSettings.postHoc`과 `.alternative`가 handler에 전달되지 않는 기존 부채 (확인됨: handler 함수 시그니처에 settings 파라미터 자체가 없음). 본 설계에서 `AnalysisExecutionStep` → `executor` 연결하되, handler 내부 로직 변경은 별도 PR.
- **auto 셀렉터 12개 메서드**: Pipeline이 `variableAssignments`를 제공해도, `auto` 셀렉터 타입(friedman, MANOVA, survival 등)은 슬롯이 비어 있어 프리필이 불완전할 수 있음. 이들은 Step 3에서 수동 조정 필요.
- **HubDataContext에 data 필드 없음**: `HubDataContext`는 메타데이터만 보관 (fileName, totalRows, validationResults). 실제 `DataRow[]`는 `analysis-store.uploadedData`에 있음. `bridgeDiagnosticToSmartFlow()`는 Hub 업로드 시 이미 analysis-store에 설정된 데이터를 그대로 사용.
- **extractDetectedVariables() 시그니처**: 3파라미터 (`methodId`, `validationResults`, `recommendation`) 필요. Pipeline의 `variableAssignments`를 `AIRecommendation`으로 감싸서 전달 (섹션 9-3 참조).
- **goToPreviousStep() Step 2 skip 미인지**: Step 3에서 "이전" 시 Step 2로 이동하는 기존 버그. `onBack` prop을 통해 `diagnostic`/`quick` 트랙에서 Step 1로 직접 이동하도록 수정 필요 (섹션 9-4 참조).

---

## 9. SmartFlow 연동

Hub Diagnostic Pipeline의 결과를 SmartFlow 4단계에 연결하는 설계.

### 9-1. 전체 흐름: 사용자 준비 상태별 분기

| 상태 | Hub 경로 | Step 2 표시 | Step 3 프리필 |
|------|----------|------------|---------------|
| 데이터 + 의도 명확 | Diagnostic Pipeline → 추천 | **건너뜀** | `variableAssignments` |
| 데이터 + 의도 모호 | Pipeline → pendingClarification → 답변 → 추천 | **건너뜀** | `variableAssignments` |
| 데이터 없이 상담 | Consultant → 데이터 준비 안내 → 업로드 후 Pipeline | **건너뜀** | `variableAssignments` |
| Quick Analysis pill | 메서드 직접 선택 | **건너뜀** | heuristic |
| "방법 탐색하고 싶어" / Hub 없이 `/analysis` 직접 접근 | 없음 | **표시** | LLM (Step 2) |
| Hub 추천을 거부: "다른 거 찾아볼래" | Step 2로 이동 | **표시** | - |
| 히스토리 재분석 | 없음 | **건너뜀** | 히스토리 복원값 |
| 실험 설계 질문 | Consultant (power-analysis 추천 가능) | 상황별 | - |

### 9-2. StepTrack 확장

`mode-store.ts`의 `StepTrack` 유니온에 `'diagnostic'` 추가:

```typescript
export type StepTrack = 'normal' | 'quick' | 'reanalysis' | 'diagnostic'
```

| 트랙 | Step 2 | 의미 |
|------|--------|------|
| `normal` | 표시 | 기본 플로우 — Hub 추천 없이 진입 |
| `quick` | 건너뜀 | Quick Analysis pill — 메서드 지정됨 |
| `reanalysis` | 건너뜀 | 히스토리 재분석 — 메서드 + 변수 복원 |
| `diagnostic` | **건너뜀** | Pipeline 경로 — 메서드 + 변수 + 설정 모두 Hub에서 결정 |

### 9-3. bridgeDiagnosticToSmartFlow()

`store-orchestration.ts`에 추가하는 오케스트레이션 함수.
Hub "분석 시작" 버튼 클릭 시 호출.

```typescript
/**
 * Hub Diagnostic Pipeline 결과를 SmartFlow 스토어에 브리지.
 *
 * ⚠️ 초기화 순서 주의:
 *   startFreshAnalysisSession()은 analysis-store.resetSession() + hub-chat-store.setDataContext(null)을
 *   호출하므로, 먼저 Hub 데이터를 스냅샷해 두고 초기화 후 복원해야 한다.
 *   (resetSession은 uploadedData/uploadedFile/validationResults를 전부 null로 만든다.)
 *
 * 1. Hub 데이터 스냅샷 (dataContext + analysis-store raw data)
 * 2. 세션 초기화
 * 3. 스냅샷으로부터 데이터 복원 + 메서드/변수/설정 주입
 * 4. 'diagnostic' 트랙 설정
 */
export function bridgeDiagnosticToSmartFlow(
  report: DiagnosticReport,
  recommendation: AIRecommendation
): void {
  // ── 0. Hub 데이터 스냅샷 (초기화 전에 캡처) ──
  const hubData = useHubChatStore.getState().dataContext
  const rawData = useAnalysisStore.getState().uploadedData
  const rawFile = useAnalysisStore.getState().uploadedFile

  // ── 1. 세션 초기화 (이전 분석 잔여 상태 제거) ──
  //    resetSession()은 analysis-store를 initialState로 되돌리고,
  //    hub-chat-store.dataContext를 null로 만든다.
  //    대화 히스토리(messages)는 유지됨.
  startFreshAnalysisSession()

  const analysisStore = useAnalysisStore.getState()
  const modeStore = useModeStore.getState()

  // ── 2. 데이터 복원 (스냅샷 → analysis-store) ──
  //    canProceedToNext()가 Step 1에서 uploadedFile !== null을 요구하므로
  //    uploadedFile도 반드시 복원해야 한다.
  if (rawData) {
    analysisStore.setUploadedData(rawData)
  }
  if (rawFile) {
    analysisStore.setUploadedFile(rawFile)
  }
  if (hubData) {
    analysisStore.setUploadedFileName(hubData.fileName)
    analysisStore.setValidationResults(hubData.validationResults)
    // dataContext도 복원 — 이후 ChatThread에서 데이터 배지 표시에 필요
    useHubChatStore.getState().setDataContext(hubData)
  }

  // ── 3. 메서드 설정 ──
  if (recommendation.method) {
    analysisStore.setSelectedMethod(recommendation.method)
  }

  // ── 4. 변수 탐지 결과 → detectedVariables (Step 3 프리필) ──
  //    extractDetectedVariables()는 (methodId, validationResults, recommendation)을 받으므로
  //    variableAssignments를 AIRecommendation으로 감싸서 전달.
  if (report.variableAssignments && recommendation.method) {
    const detected = extractDetectedVariables(
      recommendation.method.id,
      hubData?.validationResults ?? null,
      { ...recommendation, variableAssignments: report.variableAssignments }
    )
    analysisStore.setDetectedVariables(detected)
  }

  // ── 5. 설정 전달 (postHoc, alternative, alpha 등) ──
  if (recommendation.suggestedSettings) {
    analysisStore.setSuggestedSettings(recommendation.suggestedSettings)
  }

  // ── 6. 진단 리포트 보존 (Step 4 AI 해석에서 참조 가능) ──
  analysisStore.setDiagnosticReport(report)

  // ── 7. 트랙 설정 + Hub 숨기기 ──
  //    setStepTrack은 resetMode()가 'normal'로 되돌린 뒤 다시 설정해야 하므로
  //    startFreshAnalysisSession() 이후에 호출.
  modeStore.setStepTrack('diagnostic')
  modeStore.setShowHub(false)
}
```

### 9-4. Step 2 조건부 렌더링

`diagnostic` 트랙에서 Step 2를 건너뛰려면 **3곳**을 수정해야 한다:
`handleStep1Next()`, stepper `steps` 설정, `nextStepLabel`.
현재 `quick` 트랙이 이미 이 패턴을 사용하므로, 조건에 `'diagnostic'`을 추가한다.

#### 1) `use-analysis-handlers.ts` — 핵심 수정 3곳

```typescript
// (a) handleStep1Next — Step 1 → Step 3 점프 (기존 quick 패턴 확장)
const skipStep2 = stepTrack === 'quick' || stepTrack === 'diagnostic'

const handleStep1Next = useCallback(() => {
  if (skipStep2 && selectedMethod) {
    addCompletedStep(1)
    addCompletedStep(2)   // Step 2를 "완료됨"으로 마킹 (stepper 표시용)
    navigateToStep(3)
  } else {
    goToNextStep()
  }
}, [skipStep2, selectedMethod, addCompletedStep, navigateToStep, goToNextStep])

// (b) steps 설정 — stepper UI에서 Step 2를 skip 표시
const steps = useMemo(() => {
  return [...].map((step) => ({
    ...step,
    completed: (skipStep2 && step.id === 2) ? true : completedSteps.includes(step.id),
    skipped: skipStep2 && step.id === 2,
  }))
}, [completedSteps, skipStep2, t])

// (c) nextStepLabel — floating nav 라벨
const nextStepLabel = useMemo(() => {
  const nav = t.analysis.floatingNav
  switch (currentStep) {
    case 1: return skipStep2 ? nav.toVariables : nav.toMethod
    //                  ↑ 기존: stepTrack === 'quick' → skipStep2로 통합
    case 2: return nav.toVariables
    case 3: return nav.toExecution
    case 4: return nav.runAnalysis
    default: return nav.defaultNext
  }
}, [currentStep, skipStep2, t])
```

#### 2) `AnalysisSteps.tsx` — Step 2 방어적 리다이렉트 + Step 3 onBack

```typescript
// Step 렌더링
switch (currentStep) {
  case 2:
    if (skipStep2) {
      navigateToStep(3)  // 방어적 — 정상 흐름에서는 도달하지 않음
      return null
    }
    return <PurposeInputStep ... />
  case 3:
    return (
      <VariableSelectionStep
        onBack={() => {
          if (skipStep2) {
            navigateToStep(1)  // Step 2 건너뛰고 Step 1로
          } else {
            goToPreviousStep() // 기본: Step 2로
          }
        }}
        ...
      />
    )
  ...
}
```

#### 3) `canProceedToNext()` 호환성 주의

`analysis-store.ts:296-304`의 Step 1 진행 조건:
```typescript
case 1: return uploadedFile !== null && uploadedData !== null && validationResults?.isValid === true
```

`uploadedFile`은 `File` 객체로, `bridgeDiagnosticToSmartFlow()`에서 반드시 복원해야 한다.
(섹션 9-3의 스냅샷 → 복원 순서 참조.)
Hub 업로드 시 `use-hub-data-upload` 훅이 `analysis-store.setUploadedFile(file)`을 호출하므로
스냅샷 시점에 이미 설정되어 있다.

**Step 2로 돌아가기** (의도적 방법 변경): 사용자가 Step 3에서 "방법 변경"을 원할 때:

```typescript
// VariableSelectionStep.tsx — "방법 변경" 버튼 (뒤로가기와 별도)
const handleChangeMethod = useCallback(() => {
  modeStore.setStepTrack('normal')  // diagnostic → normal 전환
  navigateToStep(2)                  // Step 2로 이동
}, [navigateToStep])
```

이 버튼은 "이전" 버튼과 별개로, 변수 선택 영역 상단에 배치:
`"[메서드명] · 방법 변경"` 링크 형태.

### 9-5. Step 1 동작: diagnostic 트랙

`diagnostic` 트랙에서 Step 1은 **데이터 확인 화면**:
- Hub에서 이미 업로드된 데이터가 `uploadedData`에 설정되어 있으므로 업로드 UI 대신 데이터 요약 표시
- 기존 `DataExplorationStep`의 "데이터 로드됨" 상태가 그대로 렌더링됨 (변경 불필요)
- 사용자가 "다음" 클릭 → `handleStep1Complete()` → Step 3 점프

추가적으로 `Step1ModeBanners`에 diagnostic 모드 배너를 추가:

```typescript
// Step1ModeBanners.tsx
if (stepTrack === 'diagnostic') {
  return (
    <Banner variant="info" icon={Sparkles}>
      AI 진단 결과를 기반으로 {methodName} 분석을 준비합니다.
      데이터를 확인한 후 변수 선택 단계로 진행합니다.
    </Banner>
  )
}
```

### 9-6. Step 3 프리필: diagnostic 경로

`diagnostic` 트랙 진입 시 `detectedVariables`가 이미 설정되어 있으므로,
기존 Step 3의 프리필 로직(U1-3 패턴)이 그대로 작동한다.

추가로 `diagnosticReport.assumptions`(가정 검정 결과)를
`analysis-store.assumptionResults`에 설정하여 Step 4에서 재실행하지 않도록 한다:

```typescript
// bridgeDiagnosticToSmartFlow() 내부 (섹션 9-3의 확장)

// 8. 가정 검정 결과 전달 (Pipeline에서 이미 실행됨)
//    DiagnosticAssumptions → StatisticalAssumptions 변환 후 저장.
//    analysis-store.assumptionResults는 기존 타입(StatisticalAssumptions)이므로 변환 필요.
if (report.assumptions) {
  analysisStore.setAssumptionResults(toStatisticalAssumptions(report.assumptions))
}
```

### 9-7. suggestedSettings → Handler 전달 연결

현재 `suggestedSettings`가 `analysis-store`에 저장되지만, `AnalysisExecutionStep`에서
handler에 전달되지 않는다. 이를 연결:

```typescript
// AnalysisExecutionStep.tsx — executeAnalysis() 내부

const suggestedSettings = useAnalysisStore((s) => s.suggestedSettings)
const analysisOptions = useAnalysisStore((s) => s.analysisOptions)

// suggestedSettings를 analysisOptions에 병합 (사용자 수동 설정이 우선)
const mergedOptions: AnalysisOptions = {
  ...DEFAULT_ANALYSIS_OPTIONS,
  ...suggestedSettings,    // Pipeline/LLM 추천 (기본)
  ...analysisOptions,      // 사용자 수동 설정 (우선)
}

// handler에 전달
await executor.execute(method, data, variableMapping, mergedOptions)
```

**Handler 측 변경** (별도 PR, 본 설계에서는 연결만):
- `handle-t-test.ts`: `options.alternative` 반영 (one-sided 검정)
- `handle-anova.ts`: `options.postHoc` 반영 (Tukey/Bonferroni/Scheffé 선택)
- 기타 handler: `options.alpha` 반영 (기본 0.05)

### 9-8. "분석 시작" 버튼 UX

ChatThread에서 `diagnosticReport` + `recommendations`가 있는 메시지에 표시:

```
┌─────────────────────────────────────────────┐
│  📊 진단 리포트                              │
│  ┌─────────────────────────────────────────┐│
│  │ 기초통계: 120행, 3개 그룹 (A, B, C)     ││
│  │ 정규성: 충족 (Shapiro-Wilk p=0.23)      ││
│  │ 등분산: 충족 (Levene p=0.34)            ││
│  └─────────────────────────────────────────┘│
│                                              │
│  정규성과 등분산이 모두 충족되어             │
│  **일원 분산분석(ANOVA)**을 추천합니다.      │
│  추가로 Kruskal-Wallis(비모수 대안)도        │
│  비교해 볼 만합니다.                         │
│                                              │
│  ┌──────────────┐  ┌──────────────────┐     │
│  │ 분석 시작하기  │  │ 다른 방법 찾아보기 │     │
│  └──────────────┘  └──────────────────┘     │
└─────────────────────────────────────────────┘
```

| 버튼 | 동작 |
|------|------|
| **분석 시작하기** | `bridgeDiagnosticToSmartFlow()` → Step 1 → Step 3 |
| **다른 방법 찾아보기** | `bridgeDiagnosticToSmartFlow()` 후 `setStepTrack('normal')` → Step 1 → Step 2 |

### 9-9. analysis-store 확장

```typescript
// analysis-store.ts — 신규 필드

interface AnalysisState {
  // ...기존 필드
  /** Hub Diagnostic Pipeline 결과 (Step 4 AI 해석 참조 + 가정 검정 재사용) */
  diagnosticReport: DiagnosticReport | null
}

// 액션
setDiagnosticReport: (report: DiagnosticReport | null) => void

// 초기값
diagnosticReport: null
```

`diagnosticReport`는 `sessionStorage`에 persist하지 않는다
(Hub 채팅 메시지에 이미 포함되어 있으므로 중복 저장 불필요).

### 9-10. 50개 메서드 셀렉터 타입별 프리필 호환성

| 셀렉터 타입 | 메서드 수 | Pipeline 프리필 | 비고 |
|-------------|----------|----------------|------|
| `group-comparison` | 9 | **완전** | dependent + factor 매핑 직접 |
| `multiple-regression` | 7 | **완전** | dependent + independent 매핑 직접 |
| `correlation` | 8 | **완전** | numeric variables 배열 |
| `one-sample` | 5 | **완전** | 단일 변수 |
| `paired` | 4 | **부분적** | paired 감지는 LLM 의존 (heuristic 어려움) |
| `chi-square` | 4 | **완전** | categorical 변수 매핑 |
| `two-way-anova` | 1 | **부분적** | 2 factor 감지는 LLM 정확도 의존 |
| `auto` | 12 | **부분적** | 슬롯 없음 — `variableAssignments`는 설정되지만 UI 확인 제한적 |

**`auto` 셀렉터 12개 메서드 대응 전략**:
- Pipeline이 `variableAssignments`를 제공하면 Step 3의 AutoConfirmSelector가 "자동 감지됨" 배지와 함께 표시
- 사용자가 수동 조정 가능한 최소 UI 제공
- 장기적으로 `auto` → 전용 셀렉터 전환 (별도 과제)
