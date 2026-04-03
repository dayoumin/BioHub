# Quick Analysis 프리필 정확도 개선

**상태**: 설계 완료, 구현 대기
**최종 업데이트**: 2026-03-11

---

## 목표

`quickAnalysisMode`에서도 Step 3 프리필 품질을 Step 2 AI 추천 경로와 가깝게 맞춘다.

현재 Step 2를 거치면 `extractDetectedVariables()`가 LLM 응답 기반으로 변수를 추론하지만,
`quickAnalysisMode`(Hub → Step 1 → Step 3 직행)에서는 Step 2가 생략되어 `detectedVariables`가 빈 상태로 Step 3에 진입한다.

```
현재 (quickAnalysisMode):
  Hub "독립표본 t-검정 해줘" → setSelectedMethod → Step 1 업로드 → Step 3 (빈 프리필)

목표:
  Hub "독립표본 t-검정 해줘" → setSelectedMethod → Step 1 업로드 → detectedVariables 생성 → Step 3 (프리필)
```

---

## 이미 구현됨 (신규 작업 불필요)

| 항목 | 현황 | 위치 |
|------|------|------|
| Step 1 이상징후 배너 | 아웃라이어·왜도·첨도 경고 표시 | `DataExplorationStep.tsx:676-730` |
| Step 2 AI 추천 시 validationResults 전달 | `recommendFromNaturalLanguage()`에 이미 `validationResults` 전달 | `PurposeInputStep.tsx:431-453` |
| LLM 응답 → detectedVariables 변환 | `extractDetectedVariables()` — `variableAssignments` 파싱, 존재 검증, 할루시네이션 필터링 | `PurposeInputStep.tsx:116-305` |
| Step 3 프리필 | `detectedVariables` → `initialSelection` 자동 매핑 | `VariableSelectionStep.tsx:193+` |
| Hub → Step 1 이동 | `handleHubUploadClick` — `setShowHub(false)` + `navigateToStep(1)` | `page.tsx` |

## 유지 (변경 없음)

| 항목 | 설명 |
|------|------|
| Intent Router 3-track 분류 | keyword → LLM → fallback, 1회 분류 후 Step 라우팅 |
| Step 2 AI 추천 흐름 | `data + validationResults` 존재 시 자동 LLM 호출 |
| 채팅 역할 | 탐색 보조만, multi-turn 협상 없음 |

> **파일 교체 정책 — 미구현 주의**: 현재 Hub 업로드 버튼은 `setShowHub(false)` + `navigateToStep(1)`만 수행하며,
> `resetSession()`을 호출하지 않는다 (`page.tsx:handleHubUploadClick`). 기존 데이터가 있는 상태에서 Hub로 돌아와
> 다시 업로드 버튼을 누르면 Step 1이 이전 데이터를 보여줄 수 있다.
> 향후 Hub에서 직접 파일 파싱(P1)을 구현할 때 `resetSession()` 호출 시점을 함께 설계해야 한다.
> 현재 scope(P0)에서는 Hub가 파일을 직접 다루지 않으므로 이 문제는 발생하지 않는다.

## 제외 범위

| 항목 | 제외 사유 |
|------|-----------|
| Multi-turn chat loop | 채팅→Step 전환 비용 > 인라인 보조 비용, 상태기계 복잡도 과잉 |
| propose_analysis 카드 / negotiationState | Step 2 AI 추천이 동일 역할 수행 |
| 별도 bridge Phase (기존 F3) | `page.tsx` 핸들러 수정 수준, Phase로 포장 불필요 |
| Hub dropzone UX | 버튼 클릭 vs 드래그 드롭 차이만, UX 핵심 아님 |
| Step 4 직행 | Step 3 내부에 검증+실행 로직 결합, 직행 시 빈 화면 |

---

## P0-1: ColumnStatistics.normality + Pyodide lazy normality pipeline

### 배경

현재 `ColumnStatistics`에 `normality` 필드가 없다. 정규성 검정 결과는 `StatisticalAssumptions.normality`에만 존재하며,
이는 Step 4 분석 실행 시점에 계산된다. Step 1~2 시점에서 정규성 정보가 없으므로 AI 추천 정확도가 제한된다.

### 작업 내용

**1. 타입 확장** (`types/smart-flow.ts`)

```typescript
interface ColumnStatistics {
  // ... 기존 필드 (name, type, mean, std, skewness, kurtosis 등)
  normality?: {
    statistic: number
    pValue: number
    isNormal: boolean   // pValue > 0.05
    testName: 'shapiro-wilk' | 'kolmogorov-smirnov'
  }
}
```

**2. Pyodide lazy 계산** (`data-validation-service.ts` 또는 신규 서비스)

```
Step 1 파일 업로드 완료
  → JS 기초통계 즉시 계산 (기존 — mean, SD, missing, skewness, kurtosis)
  → Pyodide Worker에 정규성 검정 요청 (비동기, non-blocking)
  → 완료 시 columnStats[i].normality 업데이트 + store 반영
```

- Shapiro-Wilk (n ≤ 5000) / Kolmogorov-Smirnov (n > 5000) 자동 선택
- 수치형 변수만 대상
- Step 2 진입 시점까지 완료 목표 (대부분 수백ms)
- 미완료 시 Step 2 AI 추천은 normality 없이 진행 (graceful degradation)
- **quickAnalysisMode 주의**: Step 2가 생략되므로 P0-2의 heuristic 추론은 normality에 의존하지 않음. normality는 Step 2 AI 추천 경로에서만 활용됨
- **Pyodide 프리로드**: Step 1 경로에서 `PyodidePreloader`가 Worker를 트리거하는지 확인 필요. 미트리거 시 Step 1 진입 시점에 prefetch 추가

**3. AI 추천에 normality 전달**

`validationResults.columnStats`에 normality가 채워지면 Step 2 `recommendFromNaturalLanguage()`에
자동으로 포함된다 (이미 `validationResults` 전체를 전달하므로 추가 코드 불필요).
LLM 프롬프트 템플릿에 normality 요약 추가만 필요.

**4. `columnStats.normality` vs `assumptionResults.normality` 관계 정의**

두 곳에 정규성 결과가 존재하게 되므로 역할을 명확히 구분한다:

| 필드 | 시점 | 용도 | 성격 |
|------|------|------|------|
| `columnStats[i].normality` | Step 1 완료 직후 (사전) | AI 추천 힌트, Step 1 EDA 표시 | **사전 스크리닝** — 변수별 개별 검정 |
| `assumptionResults.normality` | Step 4 분석 실행 시 (사후) | 가정 검정 UI, 결과 해석 | **최종 판정** — 분석 대상 변수 + 그룹별 검정 |

**우선순위 규칙**: Step 4 UI는 항상 `assumptionResults`만 표시한다. `columnStats.normality`는 Step 4에서 참조하지 않는다. 두 값이 다를 수 있다 (예: 전체 데이터 vs 그룹별 데이터, 변수 선택 전 vs 후). 이는 의도된 차이이며 충돌이 아니다.

### 완료 기준

- [ ] `ColumnStatistics.normality` 타입 추가
- [ ] Pyodide Worker에서 Shapiro-Wilk/KS 검정 실행
- [ ] Step 1 완료 후 비동기로 normality 결과 store 반영
- [ ] LLM 프롬프트에 normality 요약 포함
- [ ] `PyodidePreloader`가 Step 1 경로에서 Worker를 프리로드하는지 확인 (미트리거 시 추가)

---

## P0-2: quickAnalysisMode에서 detectedVariables 생성

### 배경

`quickAnalysisMode`로 Step 2를 건너뛸 때 `detectedVariables`가 빈 상태로 남는다.
`extractDetectedVariables()`는 Step 2(`PurposeInputStep`) 내부에서만 호출되기 때문이다.

### 현재 흐름 (page.tsx:166-171)

```typescript
// handleUploadComplete 내부
if (currentState.quickAnalysisMode && currentState.selectedMethod && !currentState.isReanalysisMode) {
  toast.success(`${file.name} 업로드 완료 — 변수 선택으로 이동합니다`)
  navigateToStep(3)  // ← detectedVariables 미설정
}
```

### 수정 내용

```typescript
if (currentState.quickAnalysisMode && currentState.selectedMethod && !currentState.isReanalysisMode) {
  // Step 2 생략 시에도 변수 추론 실행
  const detectedVars = extractDetectedVariables(
    currentState.selectedMethod.id,
    validationResults,
    null  // LLM recommendation 없음 → heuristic fallback (3rd priority)
  )
  setDetectedVariables(detectedVars)

  toast.success(`${file.name} 업로드 완료 — 변수 선택으로 이동합니다`)
  navigateToStep(3)
}
```

**null-safety 확인 필요**: `recommendation` 파라미터에 `null`을 넘길 때
함수 내부에서 `recommendation?.variableAssignments` 옵셔널 체이닝을 사용하는지 확인.
미사용 시 null guard 추가 후 추출.

**핵심**: `extractDetectedVariables`의 3rd priority (heuristic inference, lines 264-304)가
LLM 없이도 메서드별 규칙으로 변수를 추론한다. 예:
- t-test → 그룹 변수(범주형) + 종속 변수(수치형) 자동 매핑
- ANOVA → factor(범주형) + 종속 변수(수치형)
- correlation → 수치형 변수 2개 이상

### 추출 필요 여부

`extractDetectedVariables`는 현재 `PurposeInputStep.tsx` 내부 함수.
`page.tsx`에서 호출하려면:
- **방법 A**: 함수를 `lib/services/` 또는 `lib/utils/`로 추출 (권장)
- **방법 B**: `page.tsx`에서 동일 로직 인라인 (비권장 — 중복)

### Hub 경로도 동일 적용

```typescript
// handleIntentResolved 내부 (direct-analysis 트랙 + quickAnalysisMode)
if (intent.track === 'direct-analysis' && intent.method) {
  setSelectedMethod(STATISTICAL_METHODS[intent.method.id])
  setQuickAnalysisMode(true)
  // → handleUploadComplete에서 위 로직이 자동 실행
}
```

### 완료 기준

- [x] `extractDetectedVariables` 함수를 `PurposeInputStep.tsx`에서 공용 위치로 추출 → `lib/services/variable-detection-service.ts`
- [x] `page.tsx` handleUploadComplete에서 quickAnalysisMode 시 `setDetectedVariables()` 호출
- [ ] Hub direct-analysis 경로에서도 동일 동작 확인
- [x] 테스트: `__tests__/services/variable-detection-service.test.ts` — 27개 케이스 (heuristic, LLM, 할루시네이션 필터, legacy, 우선순위, 엣지)

---

## P0-3: LLM 추천 응답 variableAssignments 파싱 강화

> **우선순위 주의**: 아래 3건은 아직 실측된 버그가 아닌 예방적 개선이다.
> 구현 착수 전 실제 LLM 응답 로그를 수집하여 발생 빈도를 확인한 뒤,
> 빈도 높은 것만 P0로 유지하고 나머지는 P1으로 내릴 수 있다.

### 배경

`extractDetectedVariables`의 1st priority (`recommendation.variableAssignments`)는
LLM 응답에서 변수 역할을 파싱한다. 현재 구현은 동작하지만 잠재적 개선 여지가 있다:

1. LLM이 한글 변수명을 반환할 때 정확히 매칭되지 않는 케이스 (예: `" 체중"` vs `"체중"`)
2. LLM이 변수 역할을 다른 키로 반환하는 케이스 (예: `outcome` vs `dependent`)
3. 할루시네이션 필터링 후 빈 결과가 되면 heuristic fallback으로 내려가야 하는데, 현재 빈 결과 그대로 반환

### 수정 내용

**1. 변수명 퍼지 매칭**

```typescript
// 현재: 정확 매칭
allCols.has(name)

// 개선: 정확 매칭 실패 시 case-insensitive + trim 매칭
const fuzzyMatch = (name: string, allCols: Set<string>): string | null => {
  if (allCols.has(name)) return name
  const trimmed = name.trim()
  for (const col of allCols) {
    if (col.toLowerCase() === trimmed.toLowerCase()) return col
  }
  return null
}
```

**2. 역할 키 정규화**

```typescript
const ROLE_ALIASES: Record<string, string> = {
  outcome: 'dependent',
  response: 'dependent',
  predictor: 'independent',
  explanatory: 'independent',
  grouping: 'factor',
  treatment: 'factor',
  // ...
}
```

**3. 부분 매칭 시 heuristic merge (빈 결과 포함)**

현재 문제: LLM이 `dependent`만 유효하고 `group`이 할루시네이션이면,
`dependent`만 채워진 불완전한 결과를 그대로 반환한다. heuristic이 보완하지 않는다.

```typescript
// extractDetectedVariables 내부
const fromLLM = parseVariableAssignments(recommendation.variableAssignments)
const fromHeuristic = inferByMethodHeuristic(methodId, validationResults)

if (!hasAnyVariable(fromLLM)) {
  // LLM 결과가 전부 필터링됨 → heuristic 전체 사용
  return fromHeuristic
}

// LLM 결과가 부분적 → 누락된 필수 슬롯만 heuristic으로 채움
return mergeWithHeuristicFallback(fromLLM, fromHeuristic, methodId)
```

**merge 규칙**:
- LLM이 채운 슬롯은 유지 (LLM 우선)
- LLM이 비운 슬롯 중 메서드 필수 역할만 heuristic에서 가져옴
- 필수 역할 정의: `variable-requirements.ts`의 `role` 기준

### 완료 기준

- [ ] 변수명 퍼지 매칭 추가 (case-insensitive, trim)
- [ ] 역할 키 정규화 맵 추가
- [ ] LLM 파싱 결과가 빈 또는 부분적인 경우 heuristic merge 보장 (필수 슬롯 누락 방지)
- [ ] 테스트: 한글 변수명, 대소문자 불일치, 역할 alias 케이스

---

## P1 (선택): FileProcessingService 추출

### 가치

`DataUploadStep.handleFileProcess`를 서비스로 추출하면 Hub/Step 1에서 동일 파싱 로직을 공유할 수 있다.
현재는 Hub에서 파일을 첨부하면 Step 1로 이동하여 다시 업로드하는 구조이므로 중복이 없지만,
향후 Hub에서 직접 파싱하려면 추출이 필요하다.

### 범위

```typescript
// 서비스 시그니처
FileProcessingService.process(
  file: File,
  options?: { onProgress?: (percent: number) => void }
): Promise<{ ok: true; result: FileProcessingResult } | { ok: false; error: FileProcessingError }>
```

- CSV 파싱 (Papa.parse, 청크 처리)
- Excel 파싱 (시트 선택)
- 보안 검증 (DataValidationService)
- 에러 분류 (`FILE_TOO_LARGE`, `INVALID_FORMAT`, `PARSE_ERROR`, `EMPTY_FILE`)

### 착수 조건

P0-1~3 완료 후, Hub에서 직접 파싱이 필요한 기능 요구 시 진행.

---

## 설계 원칙

1. **데이터 로컬 처리 필수** — 브라우저 밖으로 원본 데이터 전송 금지
2. **AI에는 요약만** — 통계량 + 변수 메타데이터만 전달 (토큰 절약 + 보안)
3. **기존 인프라 재사용** — `extractDetectedVariables`, Step 2 AI 추천, `quickAnalysisMode` 확장
4. **Step 중심** — AI는 각 Step 안에서 인라인 보조, 채팅은 탐색 보조만

---

## 리뷰 기반 결정 로그

| # | 이슈 | 결정 | 근거 |
|---|------|------|------|
| R1 | Step 4 직행 가능? | **항상 Step 3 진입** | Step 3 내부에 검증+실행 로직 결합. 직행 시 빈 화면 |
| R2 | Chat-First vs Step-First | **Step-First + AI 인라인 보조** | 기존 Step 2/3 인프라 재사용, 컨텍스트 단절 없음 |
| R3 | Step 3 프리필 소스 | **`detectedVariables`로 저장** (`variableMapping` 아님) | Step 3은 `detectedVariables`만 `initialSelection`으로 읽음 |
| R4 | `setSelectedMethod` 타입 | **`StatisticalMethod` 객체** (ID 문자열 아님) | store 시그니처: `(method: StatisticalMethod \| null) => void` |
| R5 | 기존 F2 (배너+dataProfile) | **제거 — 이미 구현됨** | DataExplorationStep:676-730, PurposeInputStep:431-453 |
| R6 | 기존 F3 (bridge) | **P0-2로 축소** | `page.tsx` 핸들러 수정 수준 |
| R7 | Hub dropzone | **P1로 격하** | 버튼 클릭 vs 드래그 드롭 차이만 |
| R8 | 채팅 역할 범위 | **탐색 보조만, 다중 턴 협상 없음** | Intent Router 1회 분류 → Step 라우팅 충분 |
| R9 | P0-3 부분 매칭 시 heuristic 보완 | **LLM+heuristic merge** | LLM이 일부만 유효할 때 필수 슬롯 누락 방지 |
| R10 | `columnStats.normality` vs `assumptionResults` | **사전 스크리닝 vs 최종 판정 분리** | Step 4는 `assumptionResults`만 표시, `columnStats`는 AI 추천 힌트용 |
| R11 | Hub 파일 교체 시 `resetSession` | **현재 미구현, P1 시 함께 설계** | 현 scope에서 Hub는 파일 직접 처리 안 함 |