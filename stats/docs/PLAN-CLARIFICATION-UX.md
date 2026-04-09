# Clarification UX 개선 계획

> 데이터 업로드 후 변수 역할이 모호할 때 사용자가 클릭으로 선택하는 인터랙션으로 전환

## 현황 (AS-IS)

### 현재 흐름

```
사용자: "이 데이터 분석해줘"
   ↓ (LLM 변수 탐지 실패/부분 성공)
AI: "어떤 변수를 분석할지 알려주세요."
  ┌─────────────────────────────────┐
  │ [체중] 수치형                    │  ← 읽기 전용 텍스트
  │ [사료] 범주형 · 3개 (A, B, C)   │
  │ [양식장] 범주형 · 2개           │
  └─────────────────────────────────┘
사용자: "체중을 사료별로 비교하고 싶어"  ← 직접 타이핑
   ↓ (fuzzy regex 매칭)
AI: 추천 결과
```

### 문제점

| # | 문제 | 위치 | 심각도 |
|---|------|------|--------|
| P1 | 컬럼 목록이 클릭 불가 — 사용자가 보고 타이핑해야 함 | ChatThread.tsx:250-261 | 높음 |
| P2 | 질문이 통계 용어("종속변수", "그룹 변수") — 일반 사용자 이해 불가 | diagnostic-pipeline.ts:370-380 | 높음 |
| P3 | 여러 턴 발생 가능 — 종속변수 → 그룹변수 순차 질문 | diagnostic-pipeline.ts:158-170 | 중간 |
| P4 | 무한 루프 위험 — retry 제한 없음, 탈출 버튼 없음 | 전체 resume 흐름 | 중간 |
| P5 | 대화 탈출 불가 — 새 질문해도 clarification resume로 강제 진입 | ChatCentricHub.tsx:175 | 높음 |
| P6 | 15개까지만 표시 — 매칭은 전체 컬럼 대상이라 불일치 | diagnostic-pipeline.ts:413 vs 481 | 낮음 |

## 목표 (TO-BE)

```
사용자: "이 데이터 분석해줘"
   ↓ (LLM 변수 탐지 실패/부분 성공)
AI: "어떤 값을 비교하고 싶으신가요?"
  ┌──────────────────────────────────────────┐
  │ 비교할 값 (측정값):                       │
  │  [체중]  [체장]  [생존율]                 │  ← 수치형 컬럼 칩
  │                                          │
  │ 비교 기준 (그룹):                         │
  │  [사료 · A,B,C]  [양식장 · 1호,2호]      │  ← 범주형 컬럼 칩
  │                                          │
  │  [이 조합으로 분석 →]   [다시 질문하기]    │
  └──────────────────────────────────────────┘
```

### 핵심 원칙

1. **한 화면에서 끝낸다** — 여러 턴 없이 한 번에 모든 역할 선택
2. **클릭으로 선택** — 타이핑 불필요
3. **쉬운 용어** — "종속변수" → "비교할 값", "그룹 변수" → "비교 기준"
4. **탈출 가능** — "다시 질문하기"로 자유 입력 복귀

---

## 이미 완료된 배선

subagent 조사 결과, ChatCentricHub → hub-chat-service → diagnostic-pipeline 전체 체인이 이미 구현됨:

| 레이어 | 위치 | 상태 |
|--------|------|------|
| `handleVariableConfirm(assignments)` | ChatCentricHub.tsx:360-368 | **완료** — pseudoMessage 생성 + `handleChatSubmit(msg, directAssignments)` |
| `handleClarificationCancel()` | ChatCentricHub.tsx:356-358 | **완료** — `patchLastClarification(null)` |
| `handleChatSubmit(msg, directAssignments?)` | ChatCentricHub.tsx:153 | **완료** — 2번째 파라미터로 전달 |
| `onVariableConfirm`, `onClarificationCancel` props | ChatCentricHub.tsx:384-385 → ChatThread | **완료** |
| `getHubDiagnosticResumeResponse(report, msg, { directAssignments })` | hub-chat-service.ts:196-197 | **완료** |
| `resumeDiagnosticPipeline(..., directAssignments?)` | diagnostic-pipeline.ts:127 | **완료** — directAssignments 우선, fuzzy fallback |
| `patchLastClarification(null)` | hub-chat-store.ts | **완료** |
| 질문 문구 개선 | diagnostic-pipeline.ts:142,159-161 | **완료** — "비교할 값을 선택해 주세요" 등 |

---

## 남은 구현: VariablePicker 컴포넌트 + ChatThread 연동

### 1. VariablePicker 컴포넌트

**위치**: `stats/components/analysis/hub/VariablePicker.tsx`

**입력 데이터** (기존 `pendingClarification` 타입 그대로 사용):

```typescript
// types/analysis.ts — 변경 없음
pendingClarification: {
  question: string
  missingRoles: Array<'dependent' | 'factor' | 'independent' | ...>
  candidateColumns: Array<{
    column: string
    type: 'numeric' | 'categorical'
    uniqueValues?: number
    sampleGroups?: string[]
  }>
}
```

**Props**:

```typescript
interface VariablePickerProps {
  candidateColumns: CandidateColumn[]
  /** LLM 부분 탐지 결과 → 프리셀렉션 */
  partialAssignments: AIRecommendation['variableAssignments'] | null
  /** 누락된 역할 */
  missingRoles: string[]
  /** 확정 */
  onConfirm: (assignments: NonNullable<AIRecommendation['variableAssignments']>) => void
  /** 취소 — 자유 입력으로 복귀 */
  onCancel: () => void
}
```

**내부 상태**:

```typescript
const [selectedDependent, setSelectedDependent] = useState<string[]>([])   // 수치형 다중 선택
const [selectedFactor, setSelectedFactor] = useState<string | null>(null)  // 범주형 단일 선택
```

- 초기화: `partialAssignments`에서 이미 감지된 컬럼을 프리셀렉트
- 수치형 컬럼 → "비교할 값" 슬롯 (다중 선택 — 토글 칩)
- 범주형 컬럼 → "비교 기준" 슬롯 (단일 선택 — 라디오 칩)
- 칩에 sampleGroups 표시: `사료 · A, B, C`

**확정 버튼 조건**: `selectedDependent.length > 0 && selectedFactor !== null`

**슬롯 라벨 매핑**:

| missingRole | 슬롯 라벨 | 필터 |
|---|---|---|
| `dependent` | 비교할 값 (측정값) | `type === 'numeric'` |
| `factor` | 비교 기준 (그룹) | `type === 'categorical'` |
| `independent` | 영향 요인 | 수치형 + 범주형 |
| `covariate` | 통제 변수 | `type === 'numeric'` |

### 2. ChatThread 연동

**변경**: `ChatThread.tsx` — pendingClarification 렌더링 교체

```tsx
// Before (현재: 읽기 전용 텍스트 목록)
{diagnosticReport?.pendingClarification && (
  <div className="bg-muted/40 rounded-xl p-3 space-y-1.5">
    {candidateColumns.map(col => <div>...</div>)}
  </div>
)}

// After (VariablePicker)
{diagnosticReport?.pendingClarification && (
  <VariablePicker
    candidateColumns={diagnosticReport.pendingClarification.candidateColumns}
    partialAssignments={diagnosticReport.variableAssignments}
    missingRoles={diagnosticReport.pendingClarification.missingRoles}
    onConfirm={onVariableConfirm}
    onCancel={onClarificationCancel}
  />
)}
```

**ChatThread props에 추가 필요**: `onVariableConfirm`, `onClarificationCancel` 
→ ChatCentricHub에서 이미 전달 중 (line 384-385). MessageBubble까지 threading만 하면 됨.

### 3. 확정 시 흐름 (이미 배선 완료)

```
사용자가 칩 클릭 → "이 조합으로 분석" 클릭
   ↓
VariablePicker.onConfirm({ dependent: ['체중'], factor: ['사료'] })
   ↓
ChatCentricHub.handleVariableConfirm(assignments)
  → pseudoMessage = "체중 값을 사료 기준으로 분석해 주세요."
  → handleChatSubmit(pseudoMessage, assignments)
   ↓
resume 감지 → getHubDiagnosticResumeResponse(report, msg, { directAssignments })
   ↓
resumeDiagnosticPipeline(report, msg, data, vr, onStatus, directAssignments)
  → fuzzy 매칭 스킵, directAssignments 직접 사용
  → merge + validate → runDiagnosticAssumptions()
   ↓
LLM 2차 호출 → 추천 결과
```

### 4. 취소 시 흐름 (이미 배선 완료)

```
"다시 질문하기" 클릭
   ↓
VariablePicker.onCancel()
   ↓
ChatCentricHub.handleClarificationCancel()
  → patchLastClarification(null)
   ↓
VariablePicker 사라짐 (pendingClarification === null)
사용자 자유 입력 가능 (새 intent 분류)
```

---

## 구현 순서

| # | 내용 | 파일 | 상태 |
|---|------|------|------|
| 1 | VariablePicker.tsx 컴포넌트 작성 | 신규 | **미구현** |
| 2 | ChatThread: pendingClarification → VariablePicker 교체 | 수정 | **미구현** |
| 3 | ChatThread: `onVariableConfirm`, `onClarificationCancel` prop threading | 수정 | **미구현** |
| 4 | 타입 체크 + 테스트 | — | **미구현** |

---

## 영향 범위

### 변경 파일

| 파일 | 변경 | 비고 |
|------|------|------|
| `components/analysis/hub/VariablePicker.tsx` | **신규** | 핵심 컴포넌트 |
| `components/analysis/hub/ChatThread.tsx` | 수정 | pendingClarification 렌더링 교체 + prop threading |

### 변경하지 않는 것 (이미 완료)

| 파일 | 이유 |
|------|------|
| `ChatCentricHub.tsx` | handleVariableConfirm, handleClarificationCancel 이미 완료 |
| `hub-chat-service.ts` | directAssignments 파라미터 이미 완료 |
| `diagnostic-pipeline.ts` | directAssignments 바이패스 + 질문 문구 이미 완료 |
| `hub-chat-store.ts` | patchLastClarification 이미 완료 |
| `types/analysis.ts` | 타입 변경 불필요 |
| `prompts.ts` | LLM 변수 탐지 프롬프트 유지 |
| `store-orchestration.ts` | bridgeDiagnosticToSmartFlow 변경 없음 |

---

## 테스트 계획

| 시나리오 | 기대 결과 |
|---------|----------|
| LLM 완전 탐지 성공 | VariablePicker 표시 안 됨, 바로 추천 |
| LLM 부분 탐지 (그룹만) | 그룹 칩 프리셀렉트, 수치형만 선택 필요 |
| LLM 완전 실패 | 양쪽 슬롯 모두 비어있음, 전부 선택 |
| "다시 질문하기" 클릭 | VariablePicker 사라짐, 자유 입력 복귀 |
| 변수 선택 후 "분석" 클릭 | 가정 검정 → 추천 카드 표시 |
| 타이핑 fallback (칩 안 쓰고 직접 입력) | 기존 fuzzy 매칭 유지 |
| 새 파일 업로드 중 clarification | uploadNonce 불일치 → 새 분석 시작 |
| "새 대화" 클릭 중 clarification | 대화 초기화, VariablePicker 사라짐 |
