# Smart Flow Step 2 재설계 계획

## 현재 문제점 분석

### 1. 목적 선택의 무의미함
- **문제**: 어떤 목적을 선택하든 거의 모든 방법이 표시됨
- **원인**: `PURPOSE_CATEGORY_MAP`이 넓은 범위의 카테고리를 매핑
- **결과**: 사용자 혼란 ("그룹 비교"를 선택해도 회귀분석이 보임)

### 2. 단일 클릭으로 끝나는 얕은 경험
- **문제**: 카드 하나 클릭 → AI 추천 → 끝
- **결과**: 왜 이 방법인지 이해하지 못함, 교육적 가치 없음

### 3. AI 추천의 불투명성
- **문제**: "AI가 추천했습니다"만 표시, 결정 과정 불명확
- **결과**: 신뢰도 낮음, 추천 이유를 펼쳐봐야 알 수 있음

---

## 제안: 질문-응답 기반 점진적 좁히기 (Guided Flow)

### 핵심 콘셉트

```
[기존]
목적 선택 (6개) → AI 추천 (모든 방법 표시) → 선택

[개선]
목적 선택 (6개) → 조건 질문 (2-3개) → 명확한 추천 (1-2개)
                                    ↘ "직접 선택" 링크 (하단)
```

---

## 상세 설계

### Phase 1: 목적 선택 (기존 유지)

```tsx
// 현재와 동일 - 6개 PurposeCard
const ANALYSIS_PURPOSES = [
  { id: 'compare', title: '그룹 간 차이 비교' },
  { id: 'relationship', title: '변수 간 관계 분석' },
  { id: 'distribution', title: '분포와 빈도 분석' },
  { id: 'prediction', title: '예측 모델링' },
  { id: 'timeseries', title: '시계열 분석' },
  { id: 'survival', title: '생존 분석' }
]
```

**변경 없음** - 직관적이고 잘 동작함

---

### Phase 2: 조건 질문 (NEW - 핵심 변경)

목적 선택 후, **데이터 조건을 묻는 질문 2-3개** 표시

#### 2-1. "그룹 간 차이 비교" 선택 시

```tsx
const COMPARE_QUESTIONS = [
  {
    id: 'group_count',
    question: '비교할 그룹이 몇 개인가요?',
    options: [
      { value: '2', label: '2개 그룹', hint: '예: 처리군 vs 대조군' },
      { value: '3+', label: '3개 이상', hint: '예: A, B, C 양식장 비교' }
    ]
  },
  {
    id: 'sample_type',
    question: '표본은 어떤 유형인가요?',
    options: [
      { value: 'independent', label: '독립 표본', hint: '서로 다른 대상을 측정' },
      { value: 'paired', label: '대응 표본', hint: '같은 대상을 전/후 측정' }
    ]
  },
  {
    id: 'normality',
    question: '데이터가 정규분포를 따르나요?',
    options: [
      { value: 'yes', label: '예 (또는 n>=30)', hint: '모수 검정 가능' },
      { value: 'no', label: '아니오 / 모름', hint: '비모수 검정 권장' },
      { value: 'check', label: '확인 필요', hint: 'AI가 데이터 검사' }
    ],
    autoAnswer: true  // assumptionResults 활용
  }
]
```

#### 2-2. "변수 간 관계 분석" 선택 시

```tsx
const RELATIONSHIP_QUESTIONS = [
  {
    id: 'variable_count',
    question: '분석할 변수가 몇 개인가요?',
    options: [
      { value: '2', label: '2개', hint: '단순 상관/회귀' },
      { value: '3+', label: '3개 이상', hint: '다중 회귀/편상관' }
    ]
  },
  {
    id: 'relationship_type',
    question: '어떤 관계를 알고 싶으신가요?',
    options: [
      { value: 'correlation', label: '상관관계', hint: '두 변수가 함께 변하는지' },
      { value: 'prediction', label: '예측/인과', hint: 'X로 Y를 예측' }
    ]
  },
  {
    id: 'variable_type',
    question: '변수 유형은 무엇인가요?',
    options: [
      { value: 'numeric', label: '모두 수치형', hint: 'Pearson/회귀' },
      { value: 'mixed', label: '범주형 포함', hint: '로지스틱/카이제곱' }
    ],
    autoAnswer: true  // validationResults에서 자동 감지
  }
]
```

#### 2-3. "분포와 빈도 분석" 선택 시

```tsx
const DISTRIBUTION_QUESTIONS = [
  {
    id: 'analysis_type',
    question: '어떤 분석을 원하시나요?',
    options: [
      { value: 'describe', label: '기술통계', hint: '평균, 표준편차, 분위수' },
      { value: 'normality', label: '정규성 검정', hint: '데이터 분포 확인' },
      { value: 'frequency', label: '빈도 분석', hint: '범주별 빈도/비율' }
    ]
  },
  {
    id: 'variable_type',
    question: '분석할 변수 유형은?',
    options: [
      { value: 'numeric', label: '수치형', hint: '연속형 데이터' },
      { value: 'categorical', label: '범주형', hint: '그룹/카테고리' }
    ],
    autoAnswer: true
  }
]
```

#### 2-4. "예측 모델링" 선택 시

```tsx
const PREDICTION_QUESTIONS = [
  {
    id: 'outcome_type',
    question: '예측하려는 결과는 어떤 유형인가요?',
    options: [
      { value: 'continuous', label: '연속형 (수치)', hint: '선형 회귀' },
      { value: 'binary', label: '이진형 (예/아니오)', hint: '로지스틱 회귀' },
      { value: 'count', label: '빈도/개수', hint: '포아송 회귀' },
      { value: 'multiclass', label: '다범주', hint: '다항 로지스틱' }
    ],
    autoAnswer: true  // 종속변수 타입에서 추론
  },
  {
    id: 'predictor_count',
    question: '예측 변수가 몇 개인가요?',
    options: [
      { value: '1', label: '1개', hint: '단순 회귀' },
      { value: '2+', label: '2개 이상', hint: '다중 회귀' }
    ],
    autoAnswer: true  // 선택된 독립변수 개수
  }
]
```

#### 2-5. "시계열 분석" 선택 시

```tsx
const TIMESERIES_QUESTIONS = [
  {
    id: 'goal',
    question: '시계열 분석의 목적은?',
    options: [
      { value: 'forecast', label: '미래 예측', hint: 'ARIMA, 지수평활' },
      { value: 'decompose', label: '패턴 분해', hint: '추세, 계절성 분리' },
      { value: 'stationarity', label: '정상성 검정', hint: 'ADF, KPSS 검정' }
    ]
  },
  {
    id: 'seasonality',
    question: '계절성(주기적 패턴)이 있나요?',
    options: [
      { value: 'yes', label: '예', hint: '계절성 ARIMA (SARIMA)' },
      { value: 'no', label: '아니오', hint: '일반 ARIMA' },
      { value: 'unknown', label: '모름', hint: 'AI가 분석' }
    ],
    autoAnswer: true  // 데이터에서 계절성 탐지
  }
]
```

#### 2-6. "생존 분석" 선택 시

```tsx
const SURVIVAL_QUESTIONS = [
  {
    id: 'goal',
    question: '생존 분석의 목적은?',
    options: [
      { value: 'curve', label: '생존 곡선 추정', hint: 'Kaplan-Meier' },
      { value: 'hazard', label: '위험 요인 분석', hint: 'Cox 비례위험 회귀' },
      { value: 'compare', label: '그룹 간 생존 비교', hint: 'Log-rank 검정' }
    ]
  },
  {
    id: 'covariate_count',
    question: '공변량(위험 요인)이 있나요?',
    options: [
      { value: '0', label: '없음', hint: 'Kaplan-Meier 단독' },
      { value: '1+', label: '1개 이상', hint: 'Cox 회귀 고려' }
    ],
    autoAnswer: true  // 선택된 공변량 개수
  }
]
```

---

## Auto-Answer 계약 (Data Contract)

### 인터페이스 정의

```typescript
interface AutoAnswerResult {
  value: string                    // 선택된 값
  confidence: 'high' | 'medium' | 'low' | 'unknown'
  source: 'assumptionResults' | 'validationResults' | 'heuristic' | 'none'
  evidence?: string                // 근거 설명
  requiresConfirmation: boolean    // true면 사용자 확인 필요
}

interface AutoAnswerConfig {
  questionId: string
  dataField: string                // 데이터 소스 필드
  fallbackValue: string            // 데이터 없을 때 기본값
  confidenceThreshold: number      // 이 이상이면 auto-select
}
```

### 질문별 데이터 소스

| 질문 ID | 데이터 소스 | 필드 | 폴백 |
|---------|------------|------|------|
| `normality` | assumptionResults | `normalityTest.isNormal` | 'check' |
| `variable_type` | validationResults | `columns[].type` 집계 | 'numeric' |
| `outcome_type` | validationResults | 종속변수 `type` | 'continuous' |
| `seasonality` | heuristic | ACF/PACF 분석 | 'unknown' |
| `covariate_count` | userSelection | 선택된 공변량 수 | '0' |

### 폴백 로직

```typescript
function getAutoAnswer(questionId: string, context: AnalysisContext): AutoAnswerResult {
  const config = AUTO_ANSWER_CONFIGS[questionId]

  // 1. 데이터 소스 확인
  const sourceData = getSourceData(config.dataField, context)

  if (!sourceData) {
    return {
      value: config.fallbackValue,
      confidence: 'unknown',
      source: 'none',
      requiresConfirmation: true  // 반드시 사용자 확인
    }
  }

  // 2. 신뢰도 계산
  const confidence = calculateConfidence(sourceData)

  // 3. 결과 반환
  return {
    value: deriveValue(sourceData),
    confidence,
    source: config.dataSource,
    evidence: formatEvidence(sourceData),
    requiresConfirmation: confidence === 'low' || confidence === 'unknown'
  }
}
```

### UI 표시 규칙

| 신뢰도 | UI 동작 |
|--------|---------|
| high | 자동 선택 + 배지 "AI 감지" |
| medium | 자동 선택 + 확인 프롬프트 |
| low | 선택 안함 + 경고 메시지 |
| unknown | 선택 안함 + "데이터 부족" 표시 |

---

## 결정 트리 로직 (Decision Matrix) - 완전판

### 1. "그룹 간 차이 비교" 결정 트리 (등분산/구형성 포함)

```
group_count = 2?
├─ YES
│  └─ sample_type = paired?
│     ├─ YES (대응표본)
│     │  └─ normality = yes?
│     │     ├─ YES → 대응표본 t-검정
│     │     │        [대안: Wilcoxon - 정규성 불확실시]
│     │     └─ NO  → Wilcoxon 부호순위 검정
│     │              [대안: 대응표본 t - n>=30이면 강건]
│     │
│     └─ NO (독립표본)
│        └─ normality = yes?
│           ├─ YES → 등분산 검정 (Levene) 필요
│           │        ├─ 등분산 충족 (p > 0.05) → Student t-검정
│           │        │                          [대안: Welch - 더 안전]
│           │        └─ 등분산 위반 (p <= 0.05) → Welch t-검정
│           │                                    [대안: Mann-Whitney]
│           └─ NO  → Mann-Whitney U 검정
│                    [대안: Welch t - n>=30이면 강건]
│
└─ NO (3개 이상)
   └─ sample_type = paired?
      ├─ YES (반복측정)
      │  └─ normality = yes?
      │     ├─ YES → 구형성 검정 (Mauchly) 필요
      │     │        ├─ 구형성 충족 (p > 0.05) → 반복측정 ANOVA
      │     │        │                          [대안: Friedman - 보수적]
      │     │        └─ 구형성 위반 (p <= 0.05) → 반복측정 ANOVA + GG 보정
      │     │                                    (Greenhouse-Geisser)
      │     │                                    [대안: Friedman - 심각시]
      │     └─ NO  → Friedman 검정
      │              [대안: 반복측정 ANOVA - n>=30이면]
      │
      └─ NO (독립)
         └─ normality = yes?
            ├─ YES → 등분산 검정 (Levene) 필요
            │        ├─ 등분산 충족 → 일원분산분석 (ANOVA)
            │        │                [대안: Welch ANOVA - 더 안전]
            │        └─ 등분산 위반 → Welch ANOVA
            │                        [대안: Kruskal-Wallis]
            └─ NO  → Kruskal-Wallis 검정
                     [대안: ANOVA - n/그룹>=30이면 강건]
```

### 2. "변수 간 관계 분석" 결정 트리

```
relationship_type = correlation?
├─ YES (상관분석)
│  └─ variable_type = numeric?
│     ├─ YES (둘 다 수치형)
│     │  └─ normality = yes? (이변량 정규성)
│     │     ├─ YES → Pearson 상관분석
│     │     │        [대안: Spearman - 이상치 있을 때]
│     │     └─ NO  → Spearman 순위상관
│     │              [대안: Kendall's tau - 동순위 많을 때]
│     │
│     └─ NO (범주형 포함)
│        └─ 범주형 유형?
│           ├─ 이진 + 수치 → Point-biserial 상관
│           ├─ 이진 + 이진 → Phi 계수
│           └─ 다범주 + 다범주 → Cramer's V
│
└─ NO (예측/회귀)
   └─ predictor_count?
      ├─ 1개 (단순)
      │  └─ outcome_type?
      │     ├─ continuous → 단순 선형 회귀
      │     ├─ binary → 단순 로지스틱 회귀
      │     └─ count → 단순 포아송 회귀
      │
      └─ 2개 이상 (다중)
         └─ outcome_type?
            ├─ continuous → 다중 선형 회귀
            │              [가정: 다중공선성, 정규성, 등분산성 확인]
            ├─ binary → 다중 로지스틱 회귀
            ├─ count → 다중 포아송 회귀
            └─ multiclass → 다항 로지스틱 회귀
```

### 3. "분포와 빈도 분석" 결정 트리

```
analysis_type?
├─ describe (기술통계)
│  └─ variable_type?
│     ├─ numeric → 기술통계량
│     │            (평균, 중앙값, 표준편차, 사분위수, 왜도, 첨도)
│     └─ categorical → 빈도표
│                      (빈도, 비율, 누적비율)
│
├─ normality (정규성 검정)
│  └─ sample_size?
│     ├─ n < 50 → Shapiro-Wilk 검정
│     │           [대안: Kolmogorov-Smirnov]
│     ├─ 50 <= n < 5000 → Shapiro-Wilk + K-S 검정
│     └─ n >= 5000 → Kolmogorov-Smirnov 검정
│                    (Shapiro-Wilk는 대표본에서 과민)
│
└─ frequency (빈도 분석)
   └─ 변수 개수?
      ├─ 1개 → 일원 빈도분석
      │        [적합도 검정: 카이제곱]
      └─ 2개 → 교차표 (Cross-tabulation)
               [독립성 검정: 카이제곱 / Fisher's exact]
```

### 4. "예측 모델링" 결정 트리

```
outcome_type?
├─ continuous (연속형)
│  └─ predictor_count?
│     ├─ 1개 → 단순 선형 회귀
│     └─ 2개 이상 → 다중 선형 회귀
│                   [가정 확인: VIF < 10, 잔차 정규성, 등분산성]
│
├─ binary (이진형)
│  └─ predictor_count?
│     ├─ 1개 → 단순 로지스틱 회귀
│     └─ 2개 이상 → 다중 로지스틱 회귀
│                   [모델 적합도: Hosmer-Lemeshow, ROC-AUC]
│
├─ count (빈도)
│  └─ 과산포 여부?
│     ├─ 없음 (분산 ≈ 평균) → 포아송 회귀
│     └─ 있음 (분산 > 평균) → 음이항 회귀
│
└─ multiclass (다범주)
   └─ 순서 유무?
      ├─ 순서 없음 → 다항 로지스틱 회귀
      └─ 순서 있음 → 순서형 로지스틱 회귀
```

### 5. "시계열 분석" 결정 트리

```
goal?
├─ forecast (미래 예측)
│  └─ seasonality?
│     ├─ yes → 계절성 ARIMA (SARIMA)
│     │        [대안: Prophet - 자동 계절성]
│     ├─ no → ARIMA
│     │       [대안: 지수평활법 - 단순시]
│     └─ unknown → 자동 탐지 후 결정
│                  [Prophet 권장 - 자동 처리]
│
├─ decompose (패턴 분해)
│  └─ 분해 방식?
│     ├─ 가법 모형 → STL 분해 (추세 + 계절 + 잔차)
│     └─ 승법 모형 → 로그 변환 후 STL
│
└─ stationarity (정상성 검정)
   └─ 검정 방법
      ├─ ADF 검정 (Augmented Dickey-Fuller)
      │  [귀무가설: 단위근 존재 = 비정상]
      └─ KPSS 검정
         [귀무가설: 정상 시계열]
         [두 검정 함께 사용 권장]
```

### 6. "생존 분석" 결정 트리

```
goal?
├─ curve (생존 곡선 추정)
│  └─ 그룹 수?
│     ├─ 1개 → Kaplan-Meier 추정
│     └─ 2개 이상 → Kaplan-Meier + Log-rank 검정
│
├─ compare (그룹 간 비교)
│  └─ 그룹 수?
│     ├─ 2개 → Log-rank 검정
│     │        [대안: Gehan-Wilcoxon - 초기 차이 중요시]
│     └─ 3개 이상 → Log-rank 검정 (다중 비교)
│                   [사후검정: Bonferroni 보정]
│
└─ hazard (위험 요인 분석)
   └─ covariate_count?
      ├─ 1개 → 단순 Cox 회귀
      └─ 2개 이상 → 다중 Cox 회귀
                    [가정: 비례위험 가정 확인 (Schoenfeld 잔차)]
```

---

## 상태 머신 (State Machine)

### 상태 정의

```typescript
type FlowStep =
  | 'purpose'      // 목적 선택
  | 'questions'    // 조건 질문
  | 'result'       // 추천 결과
  | 'browse'       // 직접 선택 (전체 목록)

interface FlowState {
  step: FlowStep
  selectedPurpose: AnalysisPurpose | null
  answers: Record<string, string>
  result: DecisionResult | null
  previousStep: FlowStep | null  // 뒤로가기용
}
```

### 전이 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌──────────┐    select     ┌──────────┐   complete   ┌──────────┐
│  │ purpose  │ ───────────▶ │ questions │ ──────────▶ │  result  │
│  └──────────┘              └──────────┘              └──────────┘
│       ▲                         │                         │
│       │                         │ browseAll               │ browseAll
│       │ back                    ▼                         ▼
│       │                    ┌──────────┐              ┌──────────┐
│       └─────────────────── │  browse  │ ◀────────── │  browse  │
│                            └──────────┘              └──────────┘
│                                 │                         │
│                                 │ selectMethod            │ selectMethod
│                                 ▼                         ▼
│                            ┌──────────┐              ┌──────────┐
│                            │ confirm  │              │ confirm  │
│                            └──────────┘              └──────────┘
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 액션 핸들러

```typescript
const flowReducer = (state: FlowState, action: FlowAction): FlowState => {
  switch (action.type) {
    case 'SELECT_PURPOSE':
      return {
        ...state,
        step: 'questions',
        selectedPurpose: action.purpose,
        previousStep: 'purpose'
      }

    case 'ANSWER_QUESTION':
      return {
        ...state,
        answers: { ...state.answers, [action.questionId]: action.value }
      }

    case 'COMPLETE_QUESTIONS':
      const result = decide({
        purpose: state.selectedPurpose!,
        answers: state.answers
      })
      return {
        ...state,
        step: 'result',
        result,
        previousStep: 'questions'
      }

    case 'BROWSE_ALL':
      return {
        ...state,
        step: 'browse',
        previousStep: state.step
      }

    case 'GO_BACK':
      if (state.previousStep) {
        return {
          ...state,
          step: state.previousStep,
          previousStep: null
        }
      }
      return state

    case 'SELECT_METHOD':
      // MethodBrowser에서 직접 선택
      return {
        ...state,
        result: {
          method: action.method,
          reasoning: [{ step: '직접 선택', description: '사용자가 직접 선택함' }],
          alternatives: []
        }
      }

    case 'CONFIRM':
      // 최종 확정 → 다음 단계로
      return state

    default:
      return state
  }
}
```

### 네비게이션 경로

| 현재 | 액션 | 다음 | 조건 |
|------|------|------|------|
| purpose | selectPurpose | questions | 항상 |
| questions | complete | result | 모든 질문 응답됨 |
| questions | browseAll | browse | 항상 |
| questions | back | purpose | 항상 |
| result | confirm | (exit) | 항상 |
| result | browseAll | browse | 항상 |
| result | back | questions | 항상 |
| browse | selectMethod | result | 메서드 선택됨 |
| browse | back | (previous) | previousStep으로 |

---

## 컴포넌트 구조

### 새로운 컴포넌트

```
components/smart-flow/steps/
├── PurposeInputStep.tsx          (기존 - 리팩토링)
├── purpose/
│   ├── MethodBrowser.tsx         (기존 유지)
│   ├── MethodSelector.tsx        (기존 유지)
│   ├── GuidedQuestions.tsx       (NEW)
│   ├── QuestionCard.tsx          (NEW)
│   ├── RecommendationResult.tsx  (NEW)
│   ├── DecisionTree.ts           (NEW - 로직)
│   └── FlowStateMachine.ts       (NEW - 상태 관리)
```

### 파일별 역할

#### 1. `GuidedQuestions.tsx` (NEW)
```tsx
interface GuidedQuestionsProps {
  purpose: AnalysisPurpose
  onComplete: (answers: Record<string, string>) => void
  onBrowseAll: () => void
  onBack: () => void
  dataProfile?: DataProfile
  assumptionResults?: StatisticalAssumptions
}

// 질문을 순차적으로 표시하고 응답 수집
// autoAnswer가 있는 질문은 AI가 자동 응답 (확인 필요시 프롬프트)
```

#### 2. `QuestionCard.tsx` (NEW)
```tsx
interface QuestionCardProps {
  question: Question
  selectedValue: string | null
  onSelect: (value: string) => void
  autoAnswer?: AutoAnswerResult
}

// 단일 질문을 표시하는 카드
// autoAnswer 있으면 배지와 함께 표시
// requiresConfirmation이면 확인 버튼 표시
```

#### 3. `RecommendationResult.tsx` (NEW)
```tsx
interface RecommendationResultProps {
  result: DecisionResult
  onConfirm: () => void
  onBrowseAll: () => void
  onBack: () => void
  onSelectAlternative: (method: StatisticalMethod) => void
}

// 최종 추천 결과 표시
// 질문-응답 기반 reasoning 표시
// 대안 선택 가능
// "직접 선택" 링크
```

#### 4. `DecisionTree.ts` (NEW - 로직)
```typescript
// 순수 함수로 결정 트리 로직 구현
export function decide(path: DecisionPath): DecisionResult {
  switch (path.purpose) {
    case 'compare':
      return decideCompare(path.answers)
    case 'relationship':
      return decideRelationship(path.answers)
    case 'distribution':
      return decideDistribution(path.answers)
    case 'prediction':
      return decidePrediction(path.answers)
    case 'timeseries':
      return decideTimeseries(path.answers)
    case 'survival':
      return decideSurvival(path.answers)
  }
}

// 각 목적별 결정 함수
function decideCompare(answers: Record<string, string>): DecisionResult {
  const groupCount = answers.group_count
  const sampleType = answers.sample_type
  const normality = answers.normality

  // 결정 트리 로직...
}
```

#### 5. `FlowStateMachine.ts` (NEW)
```typescript
// useReducer와 함께 사용
export const flowReducer: Reducer<FlowState, FlowAction> = (state, action) => {
  // 상태 전이 로직
}

export const initialFlowState: FlowState = {
  step: 'purpose',
  selectedPurpose: null,
  answers: {},
  result: null,
  previousStep: null
}
```

---

## UI 흐름 와이어프레임

### Step 1: 목적 선택 (기존과 동일)

```
┌─────────────────────────────────────────────────────────┐
│  어떤 분석을 하고 싶으신가요?                           │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ 그룹 간     │  │ 변수 간     │  │ 분포와     │     │
│  │ 차이 비교   │  │ 관계 분석   │  │ 빈도 분석   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ 예측       │  │ 시계열     │  │ 생존       │     │
│  │ 모델링     │  │ 분석       │  │ 분석       │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                         │
│  [방법을 직접 선택하고 싶다면 여기를 클릭]              │
└─────────────────────────────────────────────────────────┘
```

### Step 2: 조건 질문 (NEW)

```
┌─────────────────────────────────────────────────────────┐
│  ← 뒤로                                그룹 간 차이 비교 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Q1. 비교할 그룹이 몇 개인가요?                         │
│  ┌─────────────────────┐  ┌─────────────────────┐      │
│  │ ○ 2개 그룹          │  │ ● 3개 이상          │      │
│  │   처리군 vs 대조군   │  │   A, B, C 양식장    │      │
│  └─────────────────────┘  └─────────────────────┘      │
│                                                         │
│  Q2. 표본은 어떤 유형인가요?                            │
│  ┌─────────────────────┐  ┌─────────────────────┐      │
│  │ ● 독립 표본         │  │ ○ 대응 표본         │      │
│  │   서로 다른 대상     │  │   같은 대상 전/후   │      │
│  └─────────────────────┘  └─────────────────────┘      │
│                                                         │
│  Q3. 데이터가 정규분포를 따르나요?     [AI 감지] ✓      │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ● 예 - Shapiro-Wilk p=0.342 > 0.05              │   │
│  │   (정규성 가정 충족)                             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [전체 방법에서 직접 선택]              [다음 →]        │
└─────────────────────────────────────────────────────────┘
```

### Step 3: 추천 결과 (NEW)

```
┌─────────────────────────────────────────────────────────┐
│  ← 뒤로                                                 │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────┐ │
│  │  ✓ 이 방법이 적합합니다                           │ │
│  │                                                    │ │
│  │  일원분산분석 (One-way ANOVA)                     │ │
│  │  3개 이상 독립 그룹의 평균 차이를 검정합니다      │ │
│  │                                                    │ │
│  │  선택 근거:                                        │ │
│  │  ✓ 3개 이상 그룹 비교 → 분산분석 계열             │ │
│  │  ✓ 독립 표본 → 일원분산분석                       │ │
│  │  ✓ 정규분포 충족 → 모수 검정 가능                 │ │
│  │                                                    │ │
│  │  ⚠ 등분산 검정(Levene)이 추가로 필요합니다        │ │
│  │                                                    │ │
│  │              [이 방법으로 분석하기 →]              │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ▼ 다른 선택지                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Welch ANOVA                                      │ │
│  │  등분산 가정이 불확실할 때 더 안전한 대안         │ │
│  │                               [이 방법 사용]       │ │
│  ├───────────────────────────────────────────────────┤ │
│  │  Kruskal-Wallis 검정                              │ │
│  │  비모수 대안 (정규성 의심시)                      │ │
│  │                               [이 방법 사용]       │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  [전체 목록에서 직접 선택 →]                           │
└─────────────────────────────────────────────────────────┘
```

---

## 성공 지표 (측정 가능한 KPI)

### 이벤트 정의

```typescript
// Analytics 이벤트
interface FlowEvent {
  event_name: string
  properties: Record<string, unknown>
  timestamp: number
}

// 이벤트 목록
const FLOW_EVENTS = {
  FLOW_STARTED: 'guided_flow_started',
  PURPOSE_SELECTED: 'purpose_selected',
  QUESTION_ANSWERED: 'question_answered',
  AUTO_ANSWER_SHOWN: 'auto_answer_shown',
  AUTO_ANSWER_CONFIRMED: 'auto_answer_confirmed',
  AUTO_ANSWER_OVERRIDDEN: 'auto_answer_overridden',
  RECOMMENDATION_SHOWN: 'recommendation_shown',
  RECOMMENDATION_ACCEPTED: 'recommendation_accepted',
  ALTERNATIVE_SELECTED: 'alternative_selected',
  BROWSE_ALL_CLICKED: 'browse_all_clicked',
  FLOW_COMPLETED: 'guided_flow_completed',
  FLOW_ABANDONED: 'guided_flow_abandoned'
}
```

### KPI 및 임계값

| KPI | 계산 공식 | 목표 | 경고 |
|-----|----------|------|------|
| **완료율** | `completed / started` | >= 80% | < 60% |
| **폴백률** | `browse_all / started` | <= 20% | > 35% |
| **추천 수용률** | `accepted / shown` | >= 70% | < 50% |
| **대안 선택률** | `alternative / (accepted + alternative)` | <= 30% | > 50% |
| **Auto-answer 신뢰도** | `confirmed / (confirmed + overridden)` | >= 85% | < 70% |
| **평균 질문 수** | `total_questions / completed` | 2-3개 | > 4개 |
| **평균 소요 시간** | `avg(end_time - start_time)` | < 60초 | > 120초 |

### 대시보드 구성

```
┌─────────────────────────────────────────────────────────┐
│  Guided Flow 성과 대시보드                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  완료율: 82% ✓      추천 수용률: 74% ✓                  │
│  ████████░░          ███████░░░                         │
│                                                         │
│  폴백률: 18% ✓      대안 선택률: 22% ✓                  │
│  ██░░░░░░░░          ██░░░░░░░░                         │
│                                                         │
│  목적별 완료율:                                         │
│  compare:      85% ████████░░                           │
│  relationship: 78% ████████░░                           │
│  distribution: 90% █████████░                           │
│  prediction:   72% ███████░░░                           │
│  timeseries:   68% ███████░░░                           │
│  survival:     75% ████████░░                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 구현 순서 (수정됨)

### Stage 1: 기반 구조
1. `purpose/DecisionTree.ts` - 6개 목적 전체 결정 트리 로직
2. `purpose/FlowStateMachine.ts` - 상태 머신 구현
3. 질문 데이터 구조 정의 (`COMPARE_QUESTIONS` 등)
4. 타입 정의 추가 (`types/smart-flow.ts`)
5. Auto-answer 유틸리티 (`lib/utils/auto-answer.ts`)

### Stage 2: UI 컴포넌트
1. `QuestionCard.tsx` - 단일 질문 카드 (auto-answer 지원)
2. `GuidedQuestions.tsx` - 질문 흐름 관리
3. `RecommendationResult.tsx` - 추천 결과 표시

### Stage 3: 통합
1. `PurposeInputStep.tsx` 리팩토링 (상태 머신 적용)
2. 기존 AI 추천 로직과 통합
3. "직접 선택" (browse) 경로 연결
4. 뒤로가기 네비게이션 구현

### Stage 4: Analytics & 테스트
1. 이벤트 트래킹 구현
2. 각 목적별 결정 트리 테스트
3. Auto-answer 정확도 검증
4. UX 피드백 반영

---

## 리스크 및 대안

### 리스크 1: 질문이 너무 많아질 수 있음
- **대안**: 핵심 질문 2개로 제한, 나머지는 AI 자동 감지
- **모니터링**: 평균 질문 수 KPI 추적

### 리스크 2: 초보자가 질문을 이해하지 못함
- **대안**: 각 선택지에 구체적 예시 추가, 툴팁 활용
- **모니터링**: 질문별 응답 시간 추적

### 리스크 3: Auto-answer 오류
- **대안**: 낮은 신뢰도시 사용자 확인 필수
- **모니터링**: Auto-answer 재정의율 추적

### 리스크 4: 기존 사용자가 불편해할 수 있음
- **대안**: "빠른 선택" 링크로 직접 browse 가능
- **모니터링**: 폴백률 추적

---

## 다음 단계

1. **사용자 피드백**: 이 계획에 대한 의견 수렴
2. **프로토타입**: Stage 1-2 구현 후 내부 테스트
3. **점진적 배포**: A/B 테스트로 효과 검증

---

**작성일**: 2025-11-28
**수정일**: 2025-11-28 (리뷰 반영)
**상태**: 계획 완료 (구현 대기)
**버전**: 2.0
