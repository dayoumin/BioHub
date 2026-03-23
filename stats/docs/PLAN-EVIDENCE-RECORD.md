# EvidenceRecord 저장 구현 계획

**작성일**: 2026-03-23
**상태**: 계획 수립 (리뷰 반영 v2)
**관련**: [RESEARCH_PROJECT_STATUS.md](../../docs/RESEARCH_PROJECT_STATUS.md) · [research.ts](../lib/types/research.ts) · [storage-types.ts](../lib/utils/storage-types.ts)

---

## 1. 목적

프로젝트 내 모든 AI 출력에 **"왜 이렇게 생성했는지"** 근거를 기록하여, 연구 재현성과 신뢰성을 보장한다.

---

## 2. 핵심 설계 원칙

### 모듈 독립적 구조

```
연구 프로젝트
  ├── 통계 분석    → AI 해석, 메서드 추천    → EvidenceRecord
  ├── 그래프       → AI 차트 편집            → EvidenceRecord
  ├── 유전적 분석  → (향후 AI 보조)          → EvidenceRecord
  ├── (향후 모듈)  → (향후 AI 보조)          → EvidenceRecord
  └── ...
```

- `ownerKind` + `ownerId`로 어떤 산출물이든 연결
- 새 모듈 추가 시 `EvidenceOwnerKind`에 타입 추가 + 저장 호출만 하면 됨
- AI 제공자(OpenRouter, Ollama, 향후 추가)도 `generator.provider`로 추상화

### 인라인 우선 저장 전략

**별도 localStorage 키가 아닌, 각 모듈의 기존 저장소에 인라인 저장**:

| 모듈 | 저장 위치 | 이유 |
|------|----------|------|
| 통계 분석 | `HistoryRecord.evidenceRecords` (이미 존재, line 88) | 인라인 필드 활용 |
| Graph Studio | `GraphProject`에 `evidenceRecords` 필드 추가 | 동일 패턴 |
| 유전적 분석 | `AnalysisHistoryEntry`에 `evidenceRecords` 필드 추가 | 동일 패턴 |

**장점**:
- 별도 저장소 불필요 → localStorage 키 추가 없음
- owner 삭제 시 evidence 자동 삭제 (인라인이므로)
- 프로젝트 조회 시 2단계 간접 참조 없음 (entity 로드 시 evidence 함께 로드)
- orphan evidence 발생 불가

---

## 3. 리뷰 반영 — 해결된 구조적 문제

### 3.1 ownerId 시점 문제 (해결)

메서드 추천 시 historyId가 없는 문제 → **evidence 저장을 `saveToHistory` 시점으로 통일**.

```
Step 1: AI 메서드 추천 → aiRecommendation 객체 생성 (메모리)
Step 2: 변수 선택
Step 3: 분석 실행
Step 4: saveToHistory() → 이 시점에서 historyId 생성
        ├── aiRecommendation을 HistoryRecord에 저장 (기존)
        └── EvidenceRecord 생성 + HistoryRecord.evidenceRecords에 추가 (신규)
```

- aiRecommendation은 이미 `analysis-store` → `saveToHistory`로 전달되는 흐름이 있음
- 같은 시점에 evidence를 함께 구성하면 ownerId 문제 없음
- 사용자 이탈 시 evidence도 저장 안 됨 (orphan 방지)

### 3.2 기존 필드와의 관계 (해결)

| 기존 필드 | 역할 | EvidenceRecord와의 관계 |
|-----------|------|----------------------|
| `aiRecommendation` | 추천 텍스트 + confidence + reasoning | **유지** — UI에서 직접 사용. Evidence는 provenance 추적용 |
| `aiInterpretation` | 해석 텍스트 | **유지** — UI 표시용. Evidence는 "누가 생성했는지" 기록 |
| `evidenceRecords` | AI 출력의 생성 맥락 | **신규 구현** — 모델명, provider, 입력 요약 |

**source of truth**: 텍스트 = 기존 필드, 생성 맥락(provenance) = evidenceRecords. 겹치지 않음.

### 3.3 EvidenceKind 확장 (해결)

```typescript
export type EvidenceKind =
  | 'ai-interpretation'    // 결과 해석
  | 'ai-edit'              // AI 차트/코드 편집 (신규)
  | 'method-rationale'     // 메서드 추천 근거
  | 'reproducible-code'    // 재현 코드
  | 'external-source'      // 외부 출처
  | 'review-check'         // 리뷰 체크
  | 'rule-decision'        // 규칙 기반 판정 (신규, 유전 분석 등)
```

### 3.4 provider/model 가용성 (해결)

각 API가 실제로 반환하는 정보만 채움:

| AI 호출 지점 | provider 가용 | model 가용 | 해결 |
|-------------|-------------|-----------|------|
| 메서드 추천 (`LlmRecommender`) | ✅ `result.provider` | ❌ 없음 | provider만 기록 |
| 결과 해석 (`requestInterpretation`) | ❌ 반환 안 함 | ✅ `result.model` | model만 기록 |
| Graph Studio (`editChart`) | 항상 openrouter | ❌ `generateRawText` 미반환 | provider만 기록 |
| 유전 판정 (`decision-engine`) | N/A (규칙 기반) | N/A | `type: 'rule'` |

`EvidenceGenerator`의 `provider`와 `model`이 모두 optional이므로 있는 것만 채우면 됨.

**향후**: `requestInterpretation`과 `generateRawText`가 `{ text, model, provider }`를 반환하도록 개선하면 모두 채울 수 있음. 이번 범위에서는 안 함.

### 3.5 promptVersion 제거 (해결)

프롬프트 버전 관리 시스템이 없으므로 metadata에 넣지 않음. 프롬프트는 코드에 있고 git으로 추적 가능.

---

## 4. 구현 설계

### 4.1 타입 수정

```typescript
// research.ts — EvidenceOwnerKind에 추가
export type EvidenceOwnerKind =
  | 'analysis'
  | 'figure'
  | 'draft'
  | 'blast-result'          // 추가
  | 'species-validation'
  | 'legal-status'
  | 'review-report'
  | 'chat-message'

// research.ts — EvidenceKind에 추가
export type EvidenceKind =
  | 'ai-interpretation'
  | 'ai-edit'               // 추가
  | 'method-rationale'
  | 'reproducible-code'
  | 'external-source'
  | 'review-check'
  | 'rule-decision'         // 추가
```

### 4.2 evidence 생성 유틸

```
stats/lib/research/evidence-factory.ts
```

각 모듈에서 직접 EvidenceRecord를 조립하지 않고, 팩토리 함수 사용:

```typescript
function createInterpretationEvidence(opts: {
  ownerId: string
  ownerKind: EvidenceOwnerKind
  model?: string
  provider?: string
  inputSummary?: string
}): EvidenceRecord

function createMethodRationaleEvidence(opts: {
  ownerId: string
  recommendation: AiRecommendationContext
}): EvidenceRecord

function createRuleDecisionEvidence(opts: {
  ownerId: string
  ownerKind: EvidenceOwnerKind
  ruleVersion: string
  summary: string
  metadata?: Record<string, unknown>
}): EvidenceRecord

function createAiEditEvidence(opts: {
  ownerId: string
  ownerKind: EvidenceOwnerKind
  userMessage: string
  provider?: string
  patchCount?: number
}): EvidenceRecord
```

### 4.3 저장 흐름

#### 통계 분석 (Phase 1)

```
saveToHistory() 내부:
  1. HistoryRecord 생성 (기존)
  2. aiRecommendation이 있으면 → createMethodRationaleEvidence()
  3. aiInterpretation이 있으면 → createInterpretationEvidence()
  4. record.evidenceRecords = [위 결과들]
  5. IndexedDB 저장 (기존)
```

수정 파일: `history-store.ts`의 `saveToHistory` 내부에 evidence 조립 로직 추가.

#### Graph Studio (Phase 2)

```
editChart() 완료 후:
  1. AiEditResponse를 editHistory에 추가 (기존)
  2. createAiEditEvidence() → GraphProject.evidenceRecords에 추가
  3. saveProject() (기존)
```

수정: `GraphProject`에 `evidenceRecords?: EvidenceRecord[]` 필드 추가.

#### 유전적 분석 (Phase 2)

```
saveAnalysisHistory() 내부:
  1. 판정 결과가 있으면 → createRuleDecisionEvidence()
  2. entry.evidenceRecords = [결과]
  3. localStorage 저장 (기존)
```

수정: `AnalysisHistoryEntry`에 `evidenceRecords?: EvidenceRecord[]` 필드 추가.

---

## 5. 파일 구조

### 신규

| 파일 | 역할 |
|------|------|
| `stats/lib/research/evidence-factory.ts` | EvidenceRecord 생성 팩토리 함수 |

### 수정

| 파일 | 변경 |
|------|------|
| `stats/lib/types/research.ts` | `EvidenceOwnerKind`에 `'blast-result'`, `EvidenceKind`에 `'ai-edit'` + `'rule-decision'` 추가 |
| `stats/lib/stores/history-store.ts` | `saveToHistory`에서 evidence 조립 + `evidenceRecords` 채우기 |
| `stats/lib/genetics/analysis-history.ts` | `AnalysisHistoryEntry`에 `evidenceRecords` 필드 추가 |
| `stats/types/graph-studio.ts` | `GraphProject`에 `evidenceRecords` 필드 추가 |

### 향후 (이번 범위 아님)

| 파일 | 변경 |
|------|------|
| `stats/lib/graph-studio/ai-service.ts` | 편집 완료 시 evidence 생성 (Phase 2) |
| `stats/lib/genetics/decision-engine.ts` 호출부 | 판정 완료 시 evidence 생성 (Phase 2) |
| `stats/components/projects/` | evidence 조회/표시 UI (Phase 3) |

---

## 6. 구현 순서

### Phase 1: 통계 분석 evidence (이번)
1. `evidence-factory.ts` — 팩토리 함수 4개
2. `research.ts` — 타입 확장
3. `history-store.ts` — saveToHistory에서 evidence 자동 생성
4. 테스트 (evidence-factory 순수 함수 L1)

### Phase 2: 다른 모듈 확장 (다음)
5. `GraphProject` + `AnalysisHistoryEntry` 필드 추가
6. Graph Studio, 유전 분석 저장 시 evidence 생성

### Phase 3: UI 표시 (이후)
7. 프로젝트 상세 페이지에서 evidence 조회/표시
8. 보고서에 AI 근거 섹션 포함

---

## 7. 알려진 제약 + 필수 선행 작업

### 7.1 D1 저장 경로에서 evidenceRecords 유실 (High)

현재 D1 스키마(`packages/db/src/schema.ts`)의 `analysis_results` 테이블에 `evidence_records` 컬럼이 없음. 로컬 IndexedDB에서는 인라인 저장되지만, D1 동기화 시 유실됨.

**대응**: Phase 1에서는 IndexedDB 전용. D1 마이그레이션 시 아래 추가 필요:
- `analysis_results` 테이블에 `evidence_records TEXT` 컬럼 추가 (JSON)
- Worker API의 INSERT/SELECT에 필드 추가
- deserialize 시 `JSON.parse(row.evidence_records)` 처리

이번 구현에서는 건드리지 않음 — D1 마이그레이션은 별도 작업 ([D1-SCHEMA-GAP.md](../../docs/D1-SCHEMA-GAP.md) 참조).

### 7.2 interpretation 메타 전달 경로 미비 (Medium)

`requestInterpretation()`이 `{ model }` 만 반환하고 `provider`를 반환하지 않음. `LlmStreamResult`에는 둘 다 있지만 `result-interpreter.ts`에서 누락.

**대응**: Phase 1에서 interpretation evidence는 **model만 기록** (있는 것만 채움 원칙). 향후 `requestInterpretation` 반환 타입에 `provider` 추가하면 완전해짐. TODO.md에 등록.

### 7.3 Graph Studio 실제 persist 지점 (Medium)

계획은 `editChart()` 후 `saveProject()`를 "기존 흐름"으로 적었지만, 실제로는:
- AI 편집 → `updateChartSpec()` + 채팅 메시지 갱신 (use-ai-chat.ts)
- `saveProject()`는 사용자가 명시적으로 저장할 때만 호출
- `editHistory`도 `currentProject?.editHistory ?? []`를 복사할 뿐 자동 누적 안 됨

**대응**: Phase 2에서 Graph Studio evidence를 구현할 때, `saveCurrentProject()` 시점에서 editHistory의 AI 항목을 evidence로 변환. `use-ai-chat.ts`가 아닌 `graph-studio-store.ts`의 `saveCurrentProject`에서 처리.

### 7.4 Graph Studio localStorage quota (Medium)

Graph Studio `saveProject()`는 무제한 배열을 localStorage에 쓰고 quota 초과 시 실패만 함. evidenceRecords 추가 시 더 빨리 터짐.

**대응**: Phase 2에서 Graph Studio evidence 추가 시 함께 구현:
- 프로젝트 수 제한 (예: MAX_GRAPH_PROJECTS = 50)
- 오래된 프로젝트 자동 정리 또는 경고
- saveProject의 catch에서 사용자 안내 토스트

---

## 8. 설계 결정

| 항목 | 결정 | 이유 |
|------|------|------|
| 저장 방식 | **인라인** (각 모듈의 기존 저장소) | 별도 키 불필요, orphan 방지, 삭제 연동 자동 |
| 별도 evidence-storage.ts | **만들지 않음** | 인라인이면 불필요 |
| evidence 생성 시점 | **saveToHistory/saveProject 시점** | ownerId 확정 후, orphan 불가 |
| 기존 필드 (aiRecommendation 등) | **유지** | UI 직접 사용. evidence는 provenance 보조 |
| promptVersion | **넣지 않음** | 버전 관리 시스템 없음, 거짓 정보보다 없는 게 나음 |
| provider/model | **있는 것만 채움** | API마다 반환값 다름, optional 필드로 대응 |
| decision-engine 순수성 | **호출부에서 저장** | 순수 함수에 부수효과 넣지 않음 |
