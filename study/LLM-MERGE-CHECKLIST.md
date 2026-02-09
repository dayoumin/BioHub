# LLM Merge 전 체크리스트 + UI 변경 시 테스트 보호 가이드

**작성일**: 2026-02-06
**목적**: LLM 추천/해석 작업 완료 후 merge 전에 반드시 수행할 항목 + UI 디자인 변경 시 테스트가 깨지지 않게 하는 규칙

---

## 1. data-testid 추가 (UI 변경에도 테스트 안 깨지게)

**원칙**: UI 디자인이 바뀌어도 `data-testid`만 유지하면 테스트가 안 깨짐

### NaturalLanguageInput.tsx — 빠진 것들

| 요소 | 추가할 data-testid | 이유 |
|------|-------------------|------|
| 텍스트 입력 textarea | `ai-chat-input` | E2E 자연어 입력 |
| 전송 버튼 | `ai-chat-submit` | E2E 클릭 |
| 예시 프롬프트 영역 | `example-prompts` | 존재 확인 |
| 추천 카드 전체 | `recommendation-card` | 추천 결과 표시 확인 |
| "이 방법으로 분석하기" 버튼 | `select-recommended-method` | E2E 추천 수락 |
| "다시 질문" 버튼 | `retry-question` | 재시도 테스트 |
| 대안 토글 | `alternatives-toggle` | 대안 펼침 확인 |

### ResultsActionStep.tsx — 빠진 것들

| 요소 | 추가할 data-testid |
|------|-------------------|
| 결과 메인 카드 | `results-main-card` |
| 상세 결과 섹션 | `detailed-results-section` |
| 진단 & 권장 섹션 | `diagnostics-section` |
| 액션 버튼 영역 | `action-buttons` |

### 이미 있는 것 (유지 필수, 삭제 금지)

**NaturalLanguageInput.tsx**: `data-summary-card`, `ambiguity-note`, `variable-assignments`, `recommendation-warnings`, `data-preprocessing`

**ResultsActionStep.tsx**: `ai-interpretation-section`, `recommendations-section`, `warnings-section`, `alternatives-section`

**PurposeInputStep.tsx**: `selected-method-bar`, `final-selected-method-name`

**MethodSpecificResults.tsx**: `method-specific-results`

---

## 2. Mock 반환값 수정 (2개 파일)

두 파일 모두 동일한 수정:

```typescript
// __tests__/components/smart-flow/ResultsActionStep.test.tsx (L568)
// __tests__/components/smart-flow/ResultsActionStep-reanalyze.test.tsx (L116)

// 변경 전 (반환값 없음 → undefined → crash 가능)
vi.mock('@/lib/services/result-interpreter', () => ({
  requestInterpretation: vi.fn(),
}))

// 변경 후
vi.mock('@/lib/services/result-interpreter', () => ({
  requestInterpretation: vi.fn().mockResolvedValue(
    '## 한줄 요약\n테스트 해석입니다.\n\n## 상세 해석\n상세 내용입니다.'
  ),
}))
```

---

## 3. UI 디자인 변경 시 지켜야 할 규칙

### 절대 하면 안 되는 것
- data-testid 속성 삭제/이름 변경
- Store 상태 키(state key) 이름 변경 (테스트가 `useSmartFlowStore.getState().isReanalysisMode` 등을 직접 참조)

### 자유롭게 해도 되는 것
- CSS/Tailwind 클래스 변경
- 컴포넌트 구조 변경 (div → Card 등)
- 텍스트/라벨 변경 (한국어 문구)
- 아이콘 변경
- 레이아웃 변경 (가로↔세로, 순서)
- 새 요소 추가 (기존 data-testid 요소만 유지하면 됨)

### 새 핵심 요소 추가 시
- 반드시 `data-testid` 부여
- 네이밍 규칙: `kebab-case` (예: `analysis-settings-panel`)

---

## 4. E2E 테스트 2경로 구조 (merge 후 작업)

현재 E2E는 "직접 선택" 경로만 테스트. merge 후 2경로로 확장 필요:

```
경로 1 (LLM): 업로드 → ai-chat-input 입력 → ai-chat-submit → recommendation-card 확인 → select-recommended-method → 분석
경로 2 (직접): 업로드 → "직접 선택" 클릭 → 카테고리 → 메서드 → 분석
```

**공통 헬퍼** (재사용):
- `uploadCSV()` — 그대로
- `clickAnalysisRun()` — 그대로
- `waitForResults()` — 그대로
- `verifyStatisticalResults()` — 그대로

**분리 헬퍼** (경로별):
- `selectMethodViaLLM(page, question)` — AI Chat 경로
- `selectMethodDirect(page, category, method)` — 직접 선택 경로

**LLM 경로 E2E의 API 처리**:
- E2E에서 실제 OpenRouter API 호출은 비결정적 + 느림 + 비용 발생
- `page.route('**/openrouter.ai/**', ...)` 로 API 응답을 mock 처리
- 또는 Keyword 폴백 모드(API 키 미설정)로 테스트 — 결정적 결과 보장

---

## 5. 검증 명령어

```bash
# merge 전 반드시 실행
cd statistical-platform
pnpm tsc --noEmit          # TypeScript 에러 0개
pnpm test --run             # 전체 테스트 통과
```
