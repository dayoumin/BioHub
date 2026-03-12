# 리뷰 요청: interpretationChat 히스토리 복원

## 1. 변경 배경

사용자가 Step 4 결과 화면에서 AI에게 후속 Q&A를 주고받은 뒤 히스토리에 저장합니다.
이후 히스토리에서 해당 분석을 다시 열면, **저장된 Q&A 대화가 완전히 사라지는 버그**가 있었습니다.

- **저장 경로**: `ResultsActionStep → saveToHistory({ interpretationChat })` → IndexedDB ✅ 정상
- **복원 경로**: `loadFromHistory()` → `record.interpretationChat` 가져오지만 **store에 안 넣음** → UI 빈 배열 ❌

## 2. 수정 파일 목록

| 파일 | 라인 | 변경 |
|------|------|------|
| `lib/stores/smart-flow-store.ts` | 157-158 | `SmartFlowState`에 `loadedInterpretationChat: ChatMessage[] \| null` 추가 |
| `lib/stores/smart-flow-store.ts` | 255 | `initialState`에 `loadedInterpretationChat: null` |
| `lib/stores/smart-flow-store.ts` | 477-478 | `loadFromHistory()` set()에 `loadedInterpretationChat` 복원 |
| `lib/stores/smart-flow-store.ts` | 766 | `resetSession()`에 `loadedInterpretationChat: null` 초기화 |
| `components/smart-flow/steps/ResultsActionStep.tsx` | 264-265 | store에서 `loadedInterpretationChat`, `currentHistoryId` destructuring |
| `components/smart-flow/steps/ResultsActionStep.tsx` | 268-304 | `currentHistoryId` 변경 감지 useEffect (전체 로컬 state 초기화 + abort) |
| `components/smart-flow/steps/ResultsActionStep.tsx` | 306-312 | `loadedInterpretationChat` useEffect (Q&A 복원 + store 소비) |
| `__tests__/stores/smart-flow-store-history-chat.test.ts` | 전체 (신규) | 11개 테스트 (기본 8 + A→B 전환 3) |

## 3. 설계 결정

### 3-1. "staging field" 패턴 선택

```
IndexedDB → loadFromHistory() → store.loadedInterpretationChat → useEffect → component.followUpMessages → store null
```

**이유**: `followUpMessages`는 ResultsActionStep의 로컬 state입니다. store에 영구적으로 두면:
- 다른 페이지에서도 불필요하게 메모리 점유
- 새 분석 시작 시 이전 채팅 잔류 위험

**대안 검토 후 기각**:
- ❌ `followUpMessages`를 store로 승격 → 로컬 state와 이중 관리, 동기화 복잡
- ❌ `loadFromHistory()`에서 콜백으로 직접 전달 → Zustand store의 set() 인터페이스와 불일치

### 3-2. partialize (persist) 안전성

```typescript
partialize: (state) => ({
  currentStep: state.currentStep,
  // ... whitelist 방식 — loadedInterpretationChat 미포함 → 자동 제외
})
```

whitelist 방식이므로 `loadedInterpretationChat`은 sessionStorage에 절대 persist되지 않습니다.

### 3-3. AnalysisHistory 인터페이스에 미추가

`AnalysisHistory`는 UI 목록 표시용 타입 (QuickAccessBar, AnalysisHistoryPanel).
채팅 데이터는 목록에 표시되지 않으므로 이 인터페이스에 추가하지 않았습니다.
실제 저장/로드는 `HistoryRecord` 타입 (`storage-types.ts:79`)이 담당합니다.

## 4. 데이터 흐름

```
[저장]
ResultsActionStep.handleSave()
  → saveToHistory(name, { interpretationChat: followUpMessages })
  → smart-flow-store.saveToHistory()
  → saveHistory(record)  // record.interpretationChat = ChatMessage[]
  → IndexedDB 저장

[복원]
QuickAccessBar/AnalysisHistoryPanel → loadFromHistory(historyId)
  → getHistory(historyId)  // IndexedDB에서 HistoryRecord 로드
  → set({ loadedInterpretationChat: record.interpretationChat })  // store staging
  → ResultsActionStep 마운트
  → useEffect([loadedInterpretationChat]) 감지
  → setFollowUpMessages(loadedInterpretationChat)  // 로컬 state로 이동
  → useSmartFlowStore.setState({ loadedInterpretationChat: null })  // store 정리
  → AI 해석 재실행 → phase 3→4 도달
  → Q&A 섹션 렌더링 (phase >= 4) → followUpMessages 표시
```

## 5. 테스트 커버리지 (11개)

### 기본 복원 (8개)

| # | 테스트 | 검증 내용 |
|---|--------|----------|
| 1 | 초기 상태 null | `loadedInterpretationChat` 초기값 null |
| 2 | 채팅 있는 히스토리 로드 | 4개 메시지 복원, content/role 일치 |
| 3 | undefined 히스토리 로드 | `loadedInterpretationChat` null 유지 |
| 4 | 빈 배열 히스토리 로드 | `loadedInterpretationChat` null 유지 |
| 5 | resetSession 초기화 | 복원 후 resetSession → null |
| 6 | reset 초기화 | 복원 후 reset → null |
| 7 | currentStep 결과 단계 | 히스토리 로드 후 step === 4 |
| 8 | 메시지 원본 동일성 | id/role/content 1:1 대응 검증 |

### A→B 히스토리 전환 (3개) — 외부 AI 리뷰 반영

| # | 테스트 | 검증 내용 |
|---|--------|----------|
| 9 | A→B 대화 교체 | B 로드 후 loadedInterpretationChat이 B 대화 (4개) |
| 10 | 채팅 있음→없음 전환 | A(2개)→B(없음) 시 loadedInterpretationChat null |
| 11 | currentHistoryId 변경 | A→B 시 ID 변경 → UI 초기화 트리거 |

## 6. 자체 비판적 검토 + 외부 AI 리뷰 반영

### 1차 자체 검토

| 이슈 | 심각도 | 판정 |
|------|--------|------|
| `loadedInterpretationChat`이 sessionStorage에 persist 가능? | ~~CRITICAL~~ | **문제 없음** — partialize whitelist 방식, 자동 제외 |
| AnalysisHistory에 interpretationChat 불필요 추가 | MEDIUM | **수정 완료** — UI 표시 인터페이스에 불필요, 제거 |
| Export(DOCX) 시 Q&A 미포함 | MEDIUM | **범위 밖** — ExportContext 확장 필요, 별도 작업 |
| useEffect 위치가 store destructuring 전 | HIGH | **수정 완료** — block-scoped variable 에러 → useEffect를 destructuring 아래로 이동 |

### 2차 외부 AI 리뷰 — 3개 이슈 발견, 모두 수정

| # | 이슈 | 심각도 | 원인 | 수정 |
|---|------|--------|------|------|
| R1 | **A→B 히스토리 전환 시 이전 해석/채팅 stale** | HIGH | ResultsActionStep 인스턴스 재사용 → interpretation/followUpMessages 로컬 state 미초기화, interpretation !== null → AI 재호출 조건 실패 | `currentHistoryId` 변경 감지 useEffect 추가: interpretation/followUpMessages/phase/refs 전체 초기화 |
| R2 | **스트리밍 중 히스토리 전환 시 chunk 오염** | MEDIUM | followUp 스트리밍 abort 안 됨 → 이전 요청 chunk가 새 대화에 혼입 | 전환 시 `interpretAbortRef.abort()` + `followUpAbortRef.abort()` 호출 |
| R3 | **테스트가 store staging만 검증** | MEDIUM | A→B 전환, 채팅 없는 히스토리 복원 등 미테스트 | A→B 전환 테스트 3개 추가 (대화 교체, 채팅→무채팅, historyId 변경 감지) |

**1차 검토에서 "Phase race 문제 없음"으로 판단한 것은 오류:**
- 같은 인스턴스 재사용 시 `interpretation !== null`이라 AI 재호출 안 됨 → phase 3/4에 도달 못함
- 수정: `currentHistoryId` 변경 시 `interpretation = null` + `interpretedResultRef = null` 초기화

## 7. 알려진 한계

1. **AI 해석 재호출**: 히스토리 로드 시 `aiInterpretation`이 ResultsActionStep 로컬 state에 복원되지 않아 LLM을 다시 호출합니다. (별도 최적화 가능: `aiInterpretation`도 store staging 패턴 적용 → LLM 비용 절감)

2. **Export 미포함**: DOCX/Excel 내보내기에 Q&A 대화가 포함되지 않습니다. `ExportContext` 확장 + 렌더링 로직 필요.

## 8. 리뷰어 검토 포인트

1. **staging field 패턴이 적절한가?** store → useEffect → local state → store null. 더 나은 대안이 있는가?
2. **useSmartFlowStore.setState() 직접 호출**이 컴포넌트 내에서 적절한가? (vs. 전용 action 추가)
3. **prevHistoryIdRef 패턴**: 첫 마운트 skip(undefined→value)이 올바른가? useEffect cleanup 대안은?
4. **히스토리 전환 시 초기화 범위**: 현재 interpretation/followUp/phase/ui state를 초기화하는데, 누락된 state가 있는가?
5. **한계 #1 (AI 재호출)**: `aiInterpretation`도 같은 staging 패턴으로 복원하면 LLM 비용 절감 가능. 이 작업의 우선순위는?

## 9. 실행 방법

```bash
cd stats

# 테스트
pnpm test __tests__/stores/smart-flow-store-history-chat.test.ts

# 타입 체크
node node_modules/typescript/bin/tsc --noEmit

# 관련 파일
# - lib/stores/smart-flow-store.ts (Line 157, 255, 477, 766)
# - components/smart-flow/steps/ResultsActionStep.tsx (Line 264, 267-274)
# - lib/utils/storage-types.ts (Line 79 — HistoryRecord.interpretationChat 기존 정의)
```
