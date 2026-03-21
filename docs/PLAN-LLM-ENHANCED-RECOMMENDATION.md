# LLM Enhanced Recommendation - 구현 계획

**작성일**: 2026-02-05
**점검일**: 2026-02-06 (2차 검토 반영)
**상태**: Phase 1+2+3+부록 구현 완료 ✅
**테스트 결과**: `study/openrouter-complex-test-results.txt`, `study/llm-integration-results.json`
**테스트 스크립트**: `study/openrouter-complex-test.mjs`
**통합 테스트**: `__tests__/integration/llm-recommendation.test.ts` (20/20 pass)
**단위 테스트**: `__tests__/lib/services/openrouter-recommender.test.ts` (22), `split-interpretation.test.ts` (7)

---

## 개요

현재: LLM이 `methodId + reasoning + alternatives`만 반환
개선: `variableAssignments + suggestedSettings + warnings + dataPreprocessing + ambiguityNote` 추가 반환

**핵심 가치**: 사용자가 메서드 선택 후 수동 변수 할당하는 단계를 건너뛸 수 있음

```
현재: 질문 → 메서드 추천 → [수동] 변수 선택 → [수동] 설정 → 분석
개선: 질문 → 메서드 + 변수 + 설정 추천 → 확인/수정 → 분석
```

---

## 검증 완료 사항

GLM 4.5 Air 무료 모델로 3개 복잡 시나리오 테스트 → 모두 성공:

| 시나리오 | 추천 | 확신도 | 변수할당 | 설정 | 경고 | 전처리 |
|----------|------|--------|----------|------|------|--------|
| 가정위반+공변량통제 | ANCOVA | 0.75 | O | O (postHoc=tukey, transform=log) | O (3개) | O (3개) |
| 다변량 영향요인 | 다중회귀 | 0.92 | O | O (stepwise, interaction) | O (3개) | O (4개) |
| 소표본 비모수 | 윌콕슨 | 0.85 | O | O (alpha, alternative) | O (2개) | O (2개) |

모호한 프롬프트 A/B 테스트 (`study/openrouter-ambiguous-test.mjs`):

| 프롬프트 | confidence | 대안 수 | 모호성 감지 |
|----------|-----------|--------|------------|
| 현재 | 0.85 | 2개 | 미감지 |
| 개선 | 0.70 | 3개(+군집분석) | 감지("요인/지역/업종 관점 혼재") |

---

## 구현 단계 (3단계 + 부록)

### Phase 1: 타입 + 시스템 프롬프트 + 파서 + 데이터컨텍스트 (난이도: 낮음, ~40분)

**수정 파일 2개:** `types/smart-flow.ts`, `openrouter-recommender.ts`

#### 1-1. `types/smart-flow.ts` - AIRecommendation 확장

```typescript
export interface AIRecommendation {
  // 기존 필드 (유지)
  method: StatisticalMethod
  /** 신뢰도 (0-1 범위, LLM 반환값 그대로) */
  confidence: number
  reasoning: string[]
  expectedReasoningKeywords?: string[]
  assumptions: { name: string; passed: boolean; pValue?: number }[]
  alternatives?: StatisticalMethod[]

  // 기존 필드 (유지)
  detectedVariables?: {
    groupVariable?: { name: string; uniqueValues: (string | number)[]; count: number }
    dependentVariables?: string[]
  }

  // === NEW ===
  /** LLM이 추천한 변수 할당 (실제 데이터 컬럼명 → 역할 매핑) */
  variableAssignments?: {
    dependent?: string[]
    independent?: string[]
    factor?: string[]
    covariate?: string[]
    within?: string[]
    between?: string[]
  }

  /** LLM이 추천한 분석 설정 */
  suggestedSettings?: {
    alpha?: number
    postHoc?: string
    alternative?: 'two-sided' | 'less' | 'greater'
    [key: string]: unknown  // transform, modelSelection 등 메서드별 설정
  }

  /** 데이터 관련 경고 */
  warnings?: string[]

  /** 전처리 제안 */
  dataPreprocessing?: string[]

  /** 모호성 감지 노트 (질문이 여러 관점 포함 시) */
  ambiguityNote?: string
}
```

**참고**: 기존 `confidence` 주석이 `(0-100)`으로 되어있으나 실제 값은 0-1 범위.
UI에서 `Math.round(confidence * 100)`으로 변환 표시. 주석을 `(0-1 범위)`로 수정.

#### 1-2. `openrouter-recommender.ts` - 시스템 프롬프트 확장

**A. `maxTokens` 변경 (line 94):**
```typescript
// 변경 전
maxTokens: 1500
// 변경 후 (새 필드 추가로 응답 길이 증가)
maxTokens: 2000
```

**B. JSON 형식에 5개 필드 추가 (시스템 프롬프트 내):**

```
## JSON 응답 형식
\`\`\`json
{
  "methodId": "정확한-메서드-ID",
  "methodName": "한글 메서드명",
  "confidence": 0.85,
  "reasoning": ["추천 이유 1", "추천 이유 2", "추천 이유 3"],
  "alternatives": [
    { "id": "대안-ID", "name": "대안명", "description": "이 관점에서 보면: ..." }
  ],
  "variableAssignments": {
    "dependent": ["매출액"],
    "factor": ["지역"],
    "covariate": ["광고비"]
  },
  "suggestedSettings": {
    "alpha": 0.05,
    "postHoc": "tukey"
  },
  "warnings": ["매출액 분포가 심하게 치우쳐 있습니다 (왜도 1.42). 로그 변환을 고려하세요."],
  "dataPreprocessing": ["결측치 3건 제거 또는 대체 필요", "이상치 검토 권장"],
  "ambiguityNote": "질문이 모호한 경우에만 포함. 어떤 부분이 모호한지 설명"
}
\`\`\`
```

**C. alternatives 정의 변경 (모호성 대응):**
```diff
현재:
- alternatives: 2-3개 제시하고, 각각 왜 대안인지 설명하세요.

개선:
- alternatives: 2-3개 제시. 각 대안이 주는 "다른 시각/인사이트"를 설명하세요.
  - "대안" = 주 추천이 안 될 때의 fallback이 아닌, 같은 데이터를 다른 관점에서 분석하는 방법
  - description을 "이 관점에서 보면: ..."으로 시작
- 사용자 질문이 모호하면 confidence를 0.6-0.7로 낮추고 ambiguityNote에 이유를 명시
- variableAssignments에는 데이터의 실제 변수명(컬럼명)만 사용하세요.
- warnings, dataPreprocessing은 실질적으로 유용한 것만 포함 (없으면 빈 배열)
```

**D. `buildDataContext()` 보강 — skewness + topCategories 추가:**

```typescript
// 변수 상세 통계 테이블에 왜도(skewness) 열 추가
context += '| 변수명 | 타입 | 평균 | 표준편차 | 최솟값 | 최댓값 | 왜도 | 고유값 | 결측 |\n'

// col.skewness는 ColumnStatistics에 이미 존재 (line 65)
const skew = col.skewness !== undefined ? col.skewness.toFixed(2) : '-'

// 범주형 변수 상세 (topCategories) 추가 — 데이터 요약 뒤에
if (categoricalCols.length > 0) {
  context += '\n## 범주형 변수 상세\n'
  for (const col of categoricalCols.slice(0, 10)) {
    if (col.topCategories?.length) {
      const cats = col.topCategories.slice(0, 6)
        .map(c => `${c.value}(${c.count})`)
        .join(', ')
      context += `- ${col.name}: ${cats}\n`
    }
  }
}
```

**왜 이 2개만 추가하는지:**
- `skewness`: 분포 왜곡 → 비모수/로그변환 판단에 직접적 (ROI 높음)
- `topCategories`: 그룹 구조 → t-test vs ANOVA, 불균형 설계 감지 (ROI 높음)
- `kurtosis`, `median`, `outliers`는 LLM이 skewness+std만으로 유추 가능 (ROI 낮음)

**프라이버시 영향: 없음** — 추가 데이터도 집계 통계 (개별 행 없음, 논문 Table 1 수준)

#### 1-3. `openrouter-recommender.ts` - parseResponse 확장

`parseResponse()` 메서드(line 405)에서 recommendation 객체에 새 5개 필드 추가:

```typescript
// 기존 코드 (line 433-457) 뒤, return recommendation 전에 추가
variableAssignments: parsed.variableAssignments || undefined,
suggestedSettings: parsed.suggestedSettings || undefined,
warnings: Array.isArray(parsed.warnings) ? parsed.warnings : undefined,
dataPreprocessing: Array.isArray(parsed.dataPreprocessing) ? parsed.dataPreprocessing : undefined,
ambiguityNote: typeof parsed.ambiguityNote === 'string' ? parsed.ambiguityNote : undefined,
```

#### 1-4. `openrouter-recommender.ts` - 변수 할당 유효성 검증

**위치**: `recommendFromNaturalLanguage()` 메서드(line 133) 내부, for loop에서 `callModel` 성공 후.

```typescript
// recommendFromNaturalLanguage 안, line 147 부근
const result = await this.callModel(model, systemPrompt, userPrompt)
if (result) {
  // LLM 환각 방지: 실제 존재하는 변수명만 남기기
  if (result.recommendation?.variableAssignments && validationResults?.columns) {
    this.filterInvalidVariables(result.recommendation, validationResults)
  }
  return result
}
```

```typescript
/** 실제 데이터에 존재하지 않는 변수명 필터링 (LLM 환각 방지) */
private filterInvalidVariables(
  recommendation: AIRecommendation,
  validationResults: ValidationResults
): void {
  const va = recommendation.variableAssignments
  if (!va) return

  const validNames = new Set(
    validationResults.columns?.map((c: ColumnStatistics) => c.name) ?? []
  )

  // 각 역할의 변수 배열에서 존재하지 않는 변수명 제거
  for (const role of Object.keys(va) as Array<keyof typeof va>) {
    if (Array.isArray(va[role])) {
      va[role] = va[role]!.filter(name => validNames.has(name))
      if (va[role]!.length === 0) delete va[role]
    }
  }

  // 모든 역할이 비었으면 필드 자체 제거
  if (Object.keys(va).length === 0) {
    recommendation.variableAssignments = undefined
  }
}
```

**parseResponse는 순수 파싱만 담당** — validationResults 의존성 없음.

#### 1-5. `openrouter-recommender.ts` - PII 감지 + topCategories 필터링

**위험**: 계획에서 추가하는 `topCategories`는 범주형 컬럼의 **실제 값**을 전송함.
"이름" 컬럼이 있으면 `김철수(5), 이영희(3)` 같은 개인정보가 외부 API로 나감.

**2중 보호 전략**:
- **1층 (자동)**: PII 의심 컬럼의 topCategories를 `buildDataContext`에서 자동 제외
- **2층 (동의)**: PII 감지 시에만 사용자에게 동의 다이얼로그 표시 (Phase 2-H)

**PII 감지 유틸리티** (새 파일: `lib/utils/pii-detection.ts`):

> `PurposeInputStep.tsx`(2-G)와 `openrouter-recommender.ts`(1-5) 양쪽에서 사용하므로
> 별도 유틸리티로 분리. `openrouter-recommender` 내부에 두면 `PurposeInputStep → openrouter-recommender`
> 직접 의존이 생겨 결합도가 높아짐.

```typescript
/** PII 의심 컬럼명 패턴 */
const PII_COLUMN_PATTERNS = [
  /주민.*번호|resident.*id|ssn/i,
  /여권.*번호|passport/i,
  /이름|성명|full.?name/i,
  /이메일|email|e-?mail/i,
  /전화|핸드폰|휴대폰|phone|mobile|tel/i,
  /주소|address/i,
  /계좌|account.*num/i,
  /카드.*번호|card.*num/i,
  /생년월일|birth.*date|dob/i,
]

/** 컬럼이 PII를 포함할 가능성이 있는지 판단 */
function isPiiColumn(col: ColumnStatistics): boolean {
  // 1. 컬럼명 패턴 매칭
  if (PII_COLUMN_PATTERNS.some(p => p.test(col.name))) return true
  // 2. 기존 idDetection 활용
  if (col.idDetection?.isId) return true
  return false
}

/** 데이터에서 PII 의심 컬럼 목록 반환 */
export function detectPiiColumns(columns: ColumnStatistics[]): ColumnStatistics[] {
  return columns.filter(isPiiColumn)
}
```

**buildDataContext에서 topCategories 필터링**:

```typescript
// 범주형 변수 상세 (topCategories) — PII 컬럼 제외
if (categoricalCols.length > 0) {
  context += '\n## 범주형 변수 상세\n'
  for (const col of categoricalCols.slice(0, 10)) {
    if (isPiiColumn(col)) {
      context += `- ${col.name}: (개인정보 보호를 위해 값 생략, 고유값 ${col.uniqueValues ?? '?'}개)\n`
      continue
    }
    if (col.topCategories?.length) {
      const cats = col.topCategories.slice(0, 6)
        .map(c => `${c.value}(${c.count})`)
        .join(', ')
      context += `- ${col.name}: ${cats}\n`
    }
  }
}
```

**PII 컬럼이 있어도 전송하는 것**:
- 컬럼명 (LLM이 변수 역할 판단에 필요)
- 집계 통계 (mean, std 등 — 개인 식별 불가)
- uniqueValues 개수 (값 자체 아닌 개수만)

**PII 컬럼에서 제외하는 것**:
- topCategories 값 (실제 이름, 이메일 등)

#### 1-6. `openrouter-recommender.ts` - Rate Limit(429) 구체적 에러 메시지

무료 모델 3개가 모두 429를 반환하면 현재 에러 메시지가 일반적임.
마지막 에러의 HTTP 상태를 확인하여 사용자에게 구체적 안내 제공:

```typescript
// recommendFromNaturalLanguage 내 for loop, catch 블록에서
if (isLastModel) {
  // 마지막 에러가 429면 구체적 메시지
  const isRateLimit = msg.includes('429')
  logger.error(`[OpenRouter] All models failed`, { lastError: msg })
  return {
    recommendation: null,
    responseText: isRateLimit
      ? '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.'
      : ''
  }
}
```

---

### Phase 2: UI 개선 (경고 + 변수 미리보기 + UX 폴리시) (난이도: 중간, ~1.5시간)

**수정 파일 2개:** `NaturalLanguageInput.tsx`, `PurposeInputStep.tsx` (debounce만)

#### 2-A. 추천 카드 확장 — 경고 + 전처리 + 변수 할당 + 모호성

```
[추천 카드]
├── 메서드명 + 확신도 뱃지 (+ 툴팁 2-C)
├── 📌 모호성 안내 (ambiguityNote 있을 때만, 2-B)
├── 추천 근거 (reasoning)
├── 🔧 변수 할당 미리보기 (variableAssignments) ← NEW
├── 가정 검정 (assumptions) ← 기존
├── ⚠️ 경고 (warnings) ← NEW
├── 🔄 전처리 제안 (dataPreprocessing) ← NEW (접힌 상태)
├── 액션 버튼
└── 🔀 다른 관점 (alternatives) ← 모호 시 기본 펼침 (2-B)
```

**변수 할당 미리보기**:
- 각 역할별 Badge (dependent=파랑, factor=초록, covariate=회색)
- 표시만 — 실제 Step 3 자동 할당은 Phase 3(미래)
- `variableAssignments`가 없으면 (Ollama/Keyword) 이 섹션 미표시

**경고/전처리**:
- **warnings**: AlertTriangle 아이콘 + 노란 배경 리스트
- **dataPreprocessing**: 접힌 상태 (토글), Collapsible 사용

**Ollama/Keyword fallback 안전성**:
- 새 필드는 모두 `optional` → UI에서 `{field && field.length > 0 && (...)}` 패턴 사용
- 새 섹션이 없으면 기존 카드와 동일하게 표시됨

#### 2-B. 모호성 대응 — 대안 자동 펼침

**주의: `useState` 초기값 버그 방지**

`recommendation`은 처음에 null → 나중에 도착하므로, `useState(!!recommendation?.ambiguityNote)`는
첫 렌더 시 항상 `false`로 평가되어 이후 recommendation이 도착해도 갱신되지 않는다.

```typescript
// ✅ 올바른 구현: useEffect로 recommendation 변경 감지
const [showAlternatives, setShowAlternatives] = useState(false)

useEffect(() => {
  if (recommendation?.ambiguityNote) {
    setShowAlternatives(true)
  }
}, [recommendation?.ambiguityNote])
```

```typescript
// ❌ 동작하지 않는 코드 (useState 초기값은 1회만 평가)
const [showAlternatives, setShowAlternatives] = useState(
  !!recommendation?.ambiguityNote
)
```

**필요 import 추가**: lucide-react에서 `Info` 아이콘 (현재 NaturalLanguageInput에 미포함)

**모호할 때 추가 표시 (추천 카드 상단)**:
```tsx
{recommendation.ambiguityNote && (
  <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
    <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
    <p className="text-sm text-blue-700 dark:text-blue-300">
      {recommendation.ambiguityNote}
    </p>
  </div>
)}
```

#### 2-C. 확신도 뱃지 툴팁

```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Badge variant="outline" className={cn("text-xs cursor-help", ...)}>
        {Math.round(recommendation.confidence * 100)}% 확신
      </Badge>
    </TooltipTrigger>
    <TooltipContent side="top" className="max-w-[250px]">
      이 데이터의 특성(변수 타입, 표본 크기, 정규성)에 대해
      {recommendation.method.name}이 적합할 확률입니다.
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

**필요 import**: `Tooltip, TooltipTrigger, TooltipContent, TooltipProvider` from `@/components/ui/tooltip`

#### 2-D. 프라이버시 안내

데이터 요약 카드(line 170-188)에 1줄 추가:
```tsx
{/* 기존 dataSummary 카드 하단, </div> 뒤에 */}
<p className="text-xs text-muted-foreground mt-1">
  AI에게는 변수별 요약 통계만 전달됩니다 (원시 데이터 미전송)
</p>
```

#### 2-E. 로딩 단계 메시지

```typescript
const LOADING_MESSAGES = [
  { delay: 0, text: '데이터 특성을 분석하고 있습니다...' },
  { delay: 2000, text: '적합한 통계 방법을 탐색하고 있습니다...' },
  { delay: 5000, text: '최적의 추천을 준비하고 있습니다...' },
  { delay: 10000, text: '응답을 기다리고 있습니다... 잠시만 기다려주세요.' },
]

const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0].text)

// isLoading 변경 시 메시지 순환 + cleanup
useEffect(() => {
  if (!isLoading) {
    setLoadingMessage(LOADING_MESSAGES[0].text)
    return
  }

  const timers: ReturnType<typeof setTimeout>[] = []
  for (const msg of LOADING_MESSAGES) {
    if (msg.delay > 0) {
      timers.push(setTimeout(() => setLoadingMessage(msg.text), msg.delay))
    }
  }

  // cleanup: 컴포넌트 언마운트 또는 isLoading 변경 시 타이머 정리
  return () => timers.forEach(clearTimeout)
}, [isLoading])
```

기존 로딩 표시(line 314-317)를 `loadingMessage` 사용으로 변경:
```tsx
{isLoading && !responseText ? (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <Loader2 className="w-4 h-4 animate-spin" />
    {loadingMessage}
  </div>
) : (...)}
```

#### 2-F. 미사용 prop 정리

현재 `assumptionResults` prop이 인터페이스에 정의(line 64)되어 있지만
컴포넌트에서 destructuring 하지 않고 사용하지도 않음.
→ Phase 2에서 prop 제거하거나, 데이터 요약 카드에 가정 검정 정보 표시용으로 활용.
→ **결정**: 제거 (가정 검정은 이미 recommendation.assumptions로 표시됨)

#### 2-G. PII 감지 시 조건부 동의 다이얼로그

**PII 없으면 → 다이얼로그 없이 바로 추천** (마찰 최소화)
**PII 있으면 → 1회 동의 후 추천** (개인정보 보호)

**트리거 시점**: `handleAiSubmit` 호출 시, LLM 요청 전에 PII 검사

```typescript
// PurposeInputStep.tsx - handleAiSubmit 안
const piiColumns = detectPiiColumns(validationResults?.columns ?? [])

if (piiColumns.length > 0 && !piiConsentGiven) {
  // 동의 다이얼로그 표시
  setPiiWarningColumns(piiColumns)
  setShowPiiConsent(true)
  return  // LLM 호출 중단, 동의 후 재호출
}
```

**다이얼로그 UI** (AlertDialog 또는 Dialog):
```
┌─────────────────────────────────────────┐
│  ⚠ 개인정보 포함 가능성 감지              │
│                                         │
│  다음 컬럼에 개인정보가 포함될 수 있습니다:  │
│  • 이름 (범주형, 고유값 152개)             │
│  • 이메일 (범주형, 고유값 198개)            │
│                                         │
│  AI 추천 시 이 컬럼의 실제 값은 전송되지    │
│  않으며, 변수명과 통계 요약만 전달됩니다.    │
│                                         │
│  [계속 진행]         [직접 선택하기]        │
└─────────────────────────────────────────┘
```

**상태 관리**:
- `piiConsentGiven`: `useState(false)` — 세션 내 1회 동의
- "계속 진행" → `piiConsentGiven = true` → `handleAiSubmit` 재호출
- "직접 선택하기" → 단계별 가이드로 이동 (LLM 미사용)

**참고**: `localStorage`에 저장하지 않음 (세션마다 새로 확인 — 데이터가 바뀔 수 있으므로)

**데이터 변경 시 동의 리셋**:
```typescript
// 데이터가 바뀌면 이전 동의 무효화 (새 데이터에 다른 PII 컬럼이 있을 수 있음)
useEffect(() => {
  setPiiConsentGiven(false)
}, [validationResults])
```

#### 2-H. 중복 제출 방지 (`PurposeInputStep.tsx`)

`handleAiSubmit`에 중복 호출 가드 없음. `isLoading` 상태 변경 전에 더블클릭 가능.

```typescript
// PurposeInputStep.tsx - handleAiSubmit 상단에 추가
const isSubmittingRef = useRef(false)

const handleAiSubmit = useCallback(async () => {
  if (!flowState.aiChatInput?.trim()) return
  if (isSubmittingRef.current) return  // ← 중복 방지
  isSubmittingRef.current = true

  try {
    flowDispatch(flowActions.startAiChat())
    // ... 기존 로직
  } finally {
    isSubmittingRef.current = false  // ← 완료 시 해제
  }
}, [flowState.aiChatInput, validationResults, assumptionResults, data])
```

---

### Phase 3: 변수 자동 할당 연동 (난이도: 높음, 3-4시간, 미래)

**수정 파일 3-4개:**

사용자가 "이 방법으로 분석하기" 클릭 시:
1. `variableAssignments`를 SmartFlowStore에 저장
2. 메서드 페이지(예: `/statistics/ancova`)로 이동
3. 해당 페이지의 VariableSelectorModern이 store에서 pre-fill 값을 읽어 자동 할당
4. 사용자는 확인/수정 후 "분석 실행"

**핵심 수정 포인트 — `extractDetectedVariables()` 함수:**

`PurposeInputStep.tsx:146-200`에 위치. AI 추천 → store 변수 매핑의 실제 브릿지.

현재:
```typescript
// recommendation.detectedVariables만 읽음 (기존 필드)
if (recommendation?.detectedVariables?.groupVariable?.name) {
  detectedVars.groupVariable = recommendation.detectedVariables.groupVariable.name
}
```

Phase 3에서 수정:
```typescript
// 1순위: 새 variableAssignments (상세 역할별 매핑)
if (recommendation?.variableAssignments) {
  const va = recommendation.variableAssignments
  if (va.factor?.[0]) detectedVars.groupVariable = va.factor[0]
  if (va.dependent?.[0]) detectedVars.dependentCandidate = va.dependent[0]
  // ... 나머지 역할 매핑
}
// 2순위: 기존 detectedVariables (하위 호환)
else if (recommendation?.detectedVariables?.groupVariable?.name) {
  detectedVars.groupVariable = recommendation.detectedVariables.groupVariable.name
}
```

`handleAiSelectMethod` (line 586)에서 이 함수 호출됨.

**연동 포인트**:
- `useSmartFlowStore` → `suggestedVariables: Record<VariableRole, string[]>` 추가
- `VariableSelectorModern` → `initialAssignments` prop 추가
- 메서드 페이지 → store에서 읽어서 prop 전달

**복잡한 이유**:
- 41개 메서드마다 변수 역할이 다름 (variable-requirements.ts)
- VariableSelectorModern의 기존 상태 관리와 충돌 가능
- 유효성 검증 (LLM 추천 변수 타입 ↔ 메서드 요구 타입 일치 확인)

**→ Phase 3 구현 완료** (2026-02-06)
- `extractDetectedVariables()`: variableAssignments 1순위 폴백 구조
- `DetectedVariables`: independentVars, covariates 추가
- `SuggestedSettings`: store + partialize + sessionStorage
- `VariableSelectionStep`: initialSelection 매핑 + Badge 표시
- VariableSelectorModern initialAssignments prop 불필요 (기존 아키텍처로 처리)

---

### 부록: SSE 버퍼링 수정 (~15분)

**파일**: `openrouter-recommender.ts` — `streamWithModel()` (line 530)

`chunk.split('\n')`은 TCP 패킷 경계에서 SSE data line이 잘릴 수 있다:

```
첫 번째 chunk: "data: {\"choices\":[{\"delta\":{\"conte"
두 번째 chunk: "nt\":\"안녕\"}}]}\n\n"
```

**수정**:
```typescript
const decoder = new TextDecoder()
let hasContent = false
let buffer = ''  // ← 추가

try {
  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })  // ← buffer에 누적
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''  // ← 마지막 불완전 라인 보관

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') continue

      try {
        const parsed = JSON.parse(data)
        const delta = parsed.choices?.[0]?.delta?.content
        if (delta) {
          hasContent = true
          onChunk(delta)
        }
      } catch {
        // SSE 파싱 실패 무시
      }
    }
  }
} finally {
  reader.releaseLock()
}
```

Phase 1~2 작업 시 함께 수정 권장 (같은 파일이므로).

---

## 구현 우선순위 (최종)

| Phase | 내용 | 수정 파일 | 소요 |
|-------|------|-----------|------|
| **1** | 타입 확장 + 프롬프트 + 파서 + 데이터컨텍스트 + PII + 변수 검증 | `types/smart-flow.ts`, `openrouter-recommender.ts` | ✅ 완료 |
| **2** | 추천 카드 전면 개편 (변수/경고/모호성 + 대안 + 확신도 + 로딩) | `NaturalLanguageInput.tsx`, `PurposeInputStep.tsx` | ✅ 완료 |
| **3** | 자동 변수 할당 연동 (`extractDetectedVariables` + store + Step 3) | `PurposeInputStep.tsx`, `smart-flow-store.ts`, `VariableSelectionStep.tsx` | ✅ 완료 |
| **부록** | SSE 버퍼링 수정 | `openrouter-recommender.ts` (`streamWithModel`) | ✅ 완료 |

**남은 작업**: suggestedSettings → Step 4 분석 설정 자동 적용 (별도 작업)

---

## maxTokens 영향

| 현재 (1500) | 확장 후 (2000) | 비용 영향 |
|-------------|---------------|-----------|
| 방법+이유+대안 | +변수+설정+경고+전처리+모호성 | 무료 모델이므로 비용 없음 |

무료 모델 context limit: GLM 4.5 Air 131K, DeepSeek R1T 164K → 충분

---

## 검증 계획

```bash
pnpm tsc --noEmit       # Phase 1 후
pnpm test --run          # Phase 1 후 (기존 테스트 깨짐 확인)
pnpm dev → 수동 테스트    # Phase 2 후
```

단위 테스트 (Phase 1 후):
```bash
# filterInvalidVariables 단위 테스트 추가 권장
# - 정상 변수명 → 유지
# - 존재하지 않는 변수명(환각) → 제거
# - 모든 변수 무효 → variableAssignments = undefined
# - validationResults.columns 없음 → 무시
```

수동 테스트 시나리오:
1. iris 데이터 → "세 종류 간 꽃잎 길이 비교" → ANOVA + 변수 할당 표시 확인
2. API 키 제거 → Ollama fallback → 새 필드 없음 → 기존 카드와 동일 (graceful)
3. 결측치 많은 데이터 → warnings 표시 확인
4. 모호한 질문 → ambiguityNote 표시 + 대안 자동 펼침 확인
5. 로딩 중 → 단계별 메시지 전환 확인 (0초/2초/5초/10초)
6. 빠르게 더블클릭 → API 호출 1회만 발생 확인
7. "이름", "이메일" 컬럼 포함 데이터 → PII 동의 다이얼로그 표시 확인
8. PII 없는 데이터 → 다이얼로그 없이 바로 추천 확인
9. PII 컬럼의 topCategories가 LLM 전송 컨텍스트에서 제외되는지 확인

---

## 리스크

1. **LLM 환각**: 존재하지 않는 변수명 반환 → `filterInvalidVariables()`로 필터링 (Phase 1-4에 구현)
2. **역할 매핑 불일치**: LLM이 `independent`로 반환했는데 메서드는 `factor` 역할 필요
   → Phase 3에서 `variable-requirements.ts` 매핑 필요
3. **토큰 초과**: 변수 20개 이상 데이터 + 확장 JSON → 2000 토큰 초과 가능
   → maxTokens=2500으로 여유 확보 (무료 모델이므로 비용 무관)

---

## 점검 이력

### 1차 점검 (2026-02-06 오전)

| # | 구분 | 내용 | 조치 |
|---|------|------|------|
| 1 | 누락 | `cachedSystemPrompt` 캐시 무효화 | dev 서버 재시작 필수, 주석 추가 |
| 2 | 누락 | 변수 할당 검증 위치 미지정 | `recommendFromNaturalLanguage`에서 필터링 (Phase 1-4) |
| 3 | 누락 | `extractDetectedVariables` 함수 빠짐 | Phase 3에 명시 |
| 4 | 누락 | Ollama/Keyword fallback 시 새 필드 | optional + null 체크 패턴 |
| 5 | 개선 | SSE 버퍼링 버그 | 부록으로 추가 |
| 6 | 개선 | Phase 2+3 병합 | 기존 경고+변수 미리보기 → 하나의 Phase 2(2-A~2-E)로 통합 |

### 2차 점검 (2026-02-06 오후)

| # | 구분 | 내용 | 조치 |
|---|------|------|------|
| A-1 | 구조 | Phase 번호 불일치 (Phase 4 → Phase 3) | 전체 번호 수정 |
| A-2 | 구조 | "구현 우선순위" 테이블 중복 | 하나로 통합 |
| A-3 | 구조 | Phase 병합 설명 모호 | 설명 보완 |
| B-1 | 기술 | `filterInvalidVariables` 코드 위치 불명확 | for loop 내 정확한 위치 + 구현 코드 명시 |
| B-2 | 기술 | `showAlternatives` useState 초기값 버그 | `useEffect` 패턴으로 교체 |
| B-3 | 기술 | `handleRetry` 시 상태 미초기화 | Phase 2 작업 시 함께 처리 |
| C-1 | 누락 | 미사용 `assumptionResults` prop | 2-F로 추가 (제거) |
| C-2 | 누락 | `maxTokens` 변경 위치 미지정 | Phase 1-2 A항으로 명시 |
| C-3 | 누락 | 로딩 메시지 useEffect cleanup | 2-E에 cleanup 코드 추가 |
| D-1 | 개선 | 시스템 프롬프트 JSON 예시 부족 | 1-2 B에 전체 예시 추가 |
| D-2 | 개선 | `confidence` 주석 (0-100) → 실제 0-1 | 1-1에서 주석 수정 명시 |

### 3차 점검 (2026-02-06 오후)

| # | 구분 | 내용 | 조치 |
|---|------|------|------|
| E-1 | 누락 | 중복 제출 방지 (더블클릭 시 API 2회 호출) | 2-G에 `useRef` guard 추가 |
| E-2 | 개선 | 로딩 메시지 5초 이후 공백 (timeout 30초) | 2-E에 10초 메시지 추가 |
| E-3 | 누락 | `Info` 아이콘 import 누락 (lucide-react) | 2-B에 명시 |
| E-4 | 개선 | 무료 모델 429 시 일반적 에러 메시지 | 1-5에 rate limit 구분 로직 추가 |
| E-5 | 누락 | `filterInvalidVariables` 단위 테스트 없음 | 검증 계획에 테스트 케이스 추가 |

### 4차 점검 (2026-02-06 오후)

| # | 구분 | 내용 | 조치 |
|---|------|------|------|
| F-1 | 누락 | PII 컬럼 topCategories 전송 시 개인정보 유출 위험 | 1-5에 PII 감지 유틸 + topCategories 자동 필터링 추가 |
| F-2 | 누락 | PII 감지 시 사용자 동의 없이 진행 | 2-G에 조건부 동의 다이얼로그 추가 (PII 없으면 미표시) |

### 5차 점검 (2026-02-06 오후)

| # | 구분 | 내용 | 조치 |
|---|------|------|------|
| G-1 | 설계 | `detectPiiColumns` 파일 위치 — openrouter 내부에 두면 PurposeInputStep과 결합 | `lib/utils/pii-detection.ts` 별도 유틸로 분리 |
| G-2 | 버그 | `piiConsentGiven` 데이터 변경 시 미리셋 — 새 데이터에 다른 PII가 있을 수 있음 | `useEffect([validationResults])` 리셋 추가 |
