# Chat-First 파일 첨부 흐름 계획

**상태**: 설계 보완 완료, 구현 대기
**최종 업데이트**: 2026-03-11

---

## 목표

채팅에서 파일 첨부 + 대화로 분석 목적/변수를 모두 확정한 뒤, 기존 분석 페이지(Step 3)로 프리필 진입.

```
Hub 채팅 (파일 + 대화) → 메서드 확정 → Step 3 프리필 (→ 사용자가 실행 → Step 4)
```

## 아키텍처 결정

### 경로 B: 채팅 → Step 브릿지

| 결정 | 근거 |
|------|------|
| 채팅에서 결과 렌더링 **안 함** | Step 4 테이블/차트 중복 구현 회피 |
| 채팅은 **의사결정까지만** | 메서드 + 변수 확정 → store 저장 → navigate |
| 기존 `quickAnalysisMode` 확장 | Step 1→3 점프 인프라 재사용 |
| multi-turn 최소: **최근 2턴** | LLM 컨텍스트용, 전체 UI 히스토리는 나중 |

### 선행 조건

- ~~multi-turn 채팅 히스토리~~ → F1/F2 독립 착수 가능, F2에서 최소 컨텍스트만 필요

---

## Phase F1: 파일 첨부 UI

| 항목 | 설명 |
|------|------|
| 드래그 앤 드롭 | ChatInput 영역에 `react-dropzone` 추가 (CSV/Excel) |
| 파일 칩 | 첨부 후 textarea 상단에 요약 표시 (`실험데이터.csv - 2,450행 x 8열`) |
| 즉시 파싱 | 드롭 시 바로 파싱 + 에러면 칩에 에러 표시 (Enter 전 검증) |
| Excel 다중 시트 | 첫 시트 자동 선택 + "다른 시트" 변경 옵션 |
| 단일 파일 | 기존 store `uploadedFile: File \| null` 호환 |

### 선행 작업: FileProcessingService 추출

`DataUploadStep.handleFileProcess` → 서비스로 추출 (Hub/Step 1 공용)

```typescript
interface FileProcessingOptions {
  onProgress?: (percent: number) => void           // 대용량 파일 진행률 콜백
  onSheetSelect?: (sheets: string[]) => Promise<string>  // Excel 다중 시트 선택 콜백
}

interface FileProcessingResult {
  data: DataRow[]
  validation: ValidationResults
  fileName: string
  rowCount: number
  colCount: number
}

type FileProcessingError =
  | { code: 'FILE_TOO_LARGE'; limit: string }
  | { code: 'INVALID_FORMAT'; detail: string }
  | { code: 'SECURITY_VIOLATION'; detail: string }
  | { code: 'PARSE_ERROR'; detail: string }
  | { code: 'EMPTY_FILE' }

// 성공 시 Result, 실패 시 discriminated union 에러
FileProcessingService.process(
  file: File,
  options?: FileProcessingOptions
): Promise<FileProcessingResult>
// throws FileProcessingError
```

**추출 범위**:
- CSV 파싱 (Papa.parse, 대용량 청크 처리)
- Excel 파싱 (시트 선택 — `onSheetSelect` 콜백으로 UI 위임)
- 보안 검증 (DataValidationService)
- 에러 메시지 (getUserFriendlyErrorMessage)

**UI별 콜백 구현 차이**:
| 콜백 | Hub (ChatInput) | Step 1 (DataUploadStep) |
|------|-----------------|------------------------|
| `onProgress` | 파일 칩 내 프로그레스 바 | 기존 진행률 UI |
| `onSheetSelect` | 칩 아래 인라인 드롭다운 | 기존 시트 선택 모달 |
| 에러 표시 | 파일 칩에 에러 상태 | 토스트 알림 |

---

## Phase F2: 기초통계 + AI 대화 루프

| 항목 | 설명 |
|------|------|
| JS 기초통계 (즉시) | mean, SD, missing, 변수 타입 — 기존 `DataValidationService` 활용 |
| Pyodide 정규성 (lazy) | 파일 첨부 + 기초통계 완료 시 Pyodide prefetch 시작. 정규성 검정은 AI가 메서드 후보를 좁힌 뒤 또는 사용자가 명시 요청 시 실행. |
| AI 대화 루프 | 프로파일 + 메시지 → AI 질문 → 사용자 응답 → 재질문 가능 |
| 이상 데이터 질문 | 결측 많거나 분포 이상 시 AI가 먼저 확인 |
| 메서드 + 변수 확정 | 대화로 methodId + variableMapping 결정 |

### 기존 타입 활용 (신규 타입 최소화)

- `ColumnStatistics` 확장 — `normality?: { statistic, pValue, isNormal }` 추가
- `AiRecommendationContext`에 `dataProfile?: ColumnStatistics[]` 추가
- `intentRouter.classifyWithData(message, dataProfile)` **신규 메서드** 추가 (기존 `classify(message)` 변경 금지 — regression 방지)

### AI 대화 시나리오

**A. 메서드 명시 + 파일 첨부**:
```
사용자: "이 데이터로 독립표본 t-검정 해줘" + 파일
→ 기초통계 → 호환성 체크 (group 변수, numeric 변수 존재?)
→ AI: propose_analysis tool call → 확인 카드 표시
   "독립표본 t-검정 | group=성별, dependent=체중"
→ 사용자: [분석 시작] 클릭 → Step 3 프리필 진입
```

**B. 모호한 요청 + 파일 첨부**:
```
사용자: "이 데이터 분석해줘" + 파일
→ 기초통계 → 프로파일 → AI에 전달
→ AI: "2그룹(암/수) + 연속변수(체중). 독립표본 t-검정이 적합합니다" (텍스트만, 아직 propose 안 함)
→ 사용자: "아니, ANOVA로"
→ AI: "ANOVA는 3개 이상 그룹이 필요한데..." (추가 질문)
→ 사용자: "그럼 t-검정으로"
→ AI: propose_analysis tool call → 확인 카드 표시
→ 사용자: [분석 시작] 클릭 → Step 3 프리필 진입
```

**C. 데이터 이상 감지**:
```
사용자: "분석해줘" + 파일
→ 기초통계: missing 40%, 정규성 위반
→ AI: "결측값이 40%입니다. 제외하고 진행할까요? 정규성도 위반인데 비모수 추천합니다"
→ 사용자: "결측 제외하고 비모수로"
→ AI: propose_analysis tool call (Mann-Whitney 등) → 확인 카드 표시
→ 사용자 결정 → Step 3 진입
```

**D. 파일 교체**:
```
사용자: 파일A 첨부 + "분석해줘"
→ AI: propose_analysis → 확인 카드 표시
→ 사용자: 파일B 첨부 (교체)
→ 확인 카드 무효화 + 시스템 메시지 "파일이 변경되었습니다"
→ 새 기초통계 → AI 대화 루프 재시작
```

### 확정(Confirm) 메커니즘 — P0

대화 루프의 **탈출 조건**을 명확히 정의한다.

**방식: AI structured output → 확인 카드 UI**

1. AI 응답에 **structured block** 포함 시 확정 제안으로 간주:
```typescript
interface AnalysisProposal {
  methodId: string                    // STATISTICAL_METHODS ID
  methodName: string                  // 표시용 한글명
  variableMapping?: VariableMapping   // 변수까지 확정된 경우
  reasoning: string                   // "2그룹 비교 + 연속변수이므로 독립표본 t-검정"
}
```

2. AI 응답에 AnalysisProposal이 포함되면 **확인 카드** 렌더링:
```
┌─────────────────────────────────────┐
│ 📊 독립표본 t-검정                    │
│ group=성별, dependent=체중            │
│ "2그룹 비교 + 연속변수이므로..."       │
│                                     │
│   [변수 수정하기]    [분석 시작 →]    │
└─────────────────────────────────────┘
```

3. 사용자 선택:
   - **"분석 시작"** → store 저장 → Step 3 프리필 진입
   - **"변수 수정하기"** → store에 메서드만 저장 → Step 3 빈 매핑으로 진입
   - **텍스트 입력으로 이의** → 대화 루프 계속 (카드 무효화)

4. **AI가 확정 제안을 못 하는 경우** (정보 부족):
   - AI는 추가 질문만 반환 (structured block 없음)
   - 사용자가 직접 "t-검정으로 해" 같이 명시하면 → AI가 다음 턴에 확정 제안

**구현 방식**: LLM `tool_use`로 `propose_analysis` tool 정의. AI가 메서드/변수 확정 시 tool call로 반환 → 파싱하여 확인 카드 렌더링.

### 파일 교체/제거 정책 — P1

| 상황 | 동작 |
|------|------|
| 새 파일 첨부 (기존 파일 있음) | 기존 파일 교체. `dataProfile` 리셋, `candidateMethod` 리셋, 대화에 시스템 메시지 삽입 ("파일이 변경되었습니다") |
| 파일 칩 X 버튼 클릭 | 파일 제거. `dataProfile` 리셋, `candidateMethod` 리셋 |
| 파일 교체 후 기존 대화 | UI에 유지 (읽기 전용). 단, LLM 컨텍스트에는 **새 dataProfile만** 전달 |
| 파일 교체 + 확인 카드 표시 중 | 카드 즉시 무효화 (dimmed + "파일 변경으로 무효" 표시) |

**원칙**: 파일이 바뀌면 데이터 기반 추론은 모두 무효. 메서드 추천/변수 매핑을 처음부터 다시 시작.

### 컨텍스트 관리 전략

```typescript
// LLM에 전달할 컨텍스트
interface ChatContext {
  // 매 턴 시스템 프롬프트에 포함 (대화 길어져도 핵심 정보 유지)
  dataProfile?: ColumnStatistics[]     // 현재 파일 기초통계
  candidateMethod?: string             // 현재 후보 methodId
  negotiationState: 'exploring' | 'proposing' | 'confirmed'

  // 대화 메시지 (최근 2턴 = 4메시지)
  recentMessages: Array<{ role: 'user' | 'assistant'; content: string }>
}
```

**핵심**: `recentMessages`가 2턴으로 잘려도 `dataProfile` + `candidateMethod` + `negotiationState`가 시스템 프롬프트에 항상 포함되므로 AI가 맥락을 잃지 않음.

---

## Phase F3: 확정 → 분석 페이지 브릿지

### 이동 목표: 항상 Step 3

| 채팅에서 확정 | Store 필드 | 이동 목표 |
|---|---|---|
| 메서드 + 변수 확정 | `selectedMethod` + `variableMapping` | Step 3 (프리필 — 바로 실행 가능) |
| 메서드만 확정 | `selectedMethod` | Step 3 (빈 매핑 — 사용자가 변수 선택) |
| 메서드 불확실 | `userQuery` | Step 2 (방법 선택) |

> **Step 4 직행 제외 사유**: Step 3→4 전환 시 변수 매핑 검증 + 분석 실행 트리거가
> Step 3 컴포넌트 내부에서 발생. Step 4로 바로 가면 results가 없어 빈 화면.
> Step 3 프리필 + 사용자 "분석 실행" 클릭이 가장 안전한 경로.

### store 저장 → navigate 흐름

```typescript
// 채팅에서 확정 후 (확인 카드 "분석 시작" 또는 "변수 수정하기" 클릭)
setUploadedFile(file)
setUploadedData(data)
setSelectedMethod(method)           // 43개 ID 중 하나
setVariableMapping(mapping)         // optional — 변수까지 확정된 경우 (프리필용)
setQuickAnalysisMode(true)
setShowHub(false)
navigateToStep(3)                   // 항상 Step 3
```

### Step 3 프리필 상태

- "Hub에서 자동 설정됨" 배너 표시
- 변수 매핑이 있으면 → 프리필 상태로 진입, "분석 실행" 버튼 즉시 활성
- 변수 매핑이 없으면 → 빈 상태로 진입, 사용자가 변수 직접 선택
- 어느 경우든 사용자가 매핑을 수정 가능

### 향후 확장 (Step 4 직행)

Step 3의 검증 + 실행 로직을 서비스로 추출하면 Step 4 직행이 가능해짐.
이는 F3 이후 별도 Phase로 진행 (현재 scope 밖).

---

## 설계 원칙

1. **데이터 로컬 처리 필수** — 브라우저 밖으로 원본 데이터 전송 금지
2. **AI에는 요약만** — 통계량 + 변수 메타데이터만 전달 (토큰 절약 + 보안)
3. **기존 인프라 재사용** — quickAnalysisMode, Step 3/4, 43개 methodId
4. **점진적 구현** — F1 → F2 → F3 순서, 각 Phase 독립 배포 가능

---

## 구현 시 주의사항

### Hub dropzone vs Step 1 dropzone 충돌

Hub 화면에서는 DataUploadStep이 없으므로 충돌 없음. Step 진입 후에는 Hub가 숨겨지므로 (`showHub=false`) 역시 충돌 없음.

### FileProcessingService 추출 범위

F1 선행 작업 섹션의 상세 시그니처 참조. 핵심 원칙:
- **비즈니스 로직만 서비스로** — 파싱, 검증, 에러 분류
- **UI 로직은 컴포넌트에 유지** — 진행률 표시, 에러 토스트, 시트 선택 UI, 최근 파일
- **콜백으로 UI 위임** — `onProgress`, `onSheetSelect`로 동일 서비스를 Hub/Step 1에서 다른 UI로 사용

### 43개 methodId 직접 연결

`STATISTICAL_METHODS` 상수에 ID가 정의되어 있으므로, AI가 추천한 메서드명 → ID 매핑은 기존 `intentRouter`의 메서드 감지 로직 재사용.

```
"독립표본 t-검정" → "independent-samples-t-test"
"ANOVA" → "anova"
"Mann-Whitney" → "mann-whitney"
```

---

## 리뷰 기반 결정 로그

| # | 이슈 | 결정 | 근거 |
|---|------|------|------|
| R1 | Step 4 직행 가능한가? | **항상 Step 3 진입** | Step 3 내부에 검증+실행 로직 결합. 직행 시 빈 화면 |
| R2 | 대화 루프 탈출 조건 | **AI `propose_analysis` tool call → 확인 카드 UI** | structured output으로 파싱 확실, 텍스트 파싱 불안정 |
| R3 | intentRouter 확장 방식 | **`classifyWithData` 신규 메서드** | 기존 `classify` 변경 시 regression 위험 |
| R4 | multi-turn 2턴 한계 | **구조화 요약을 시스템 프롬프트에 항상 포함** | `dataProfile`+`candidateMethod`+`negotiationState`로 맥락 보존 |
| R5 | 파일 교체 시 정책 | **전면 리셋 (profile, method, 확인카드)** | 데이터 바뀌면 모든 추론 무효 |
| R6 | Pyodide lazy 시점 | **기초통계 완료 시 prefetch, 정규성은 AI 요청 또는 사용자 명시 시** | 불필요한 로드 방지 |
| R7 | FileProcessingService 에러 | **discriminated union 에러 타입 정의** | Hub/Step 1에서 다른 UX로 에러 표시 가능 |