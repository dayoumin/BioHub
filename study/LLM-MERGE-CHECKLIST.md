# LLM Merge 전 체크리스트 + UI 변경 시 테스트 보호 가이드

**작성일**: 2026-02-06
**점검일**: 2026-02-10
**상태**: ✅ 머지 전 항목 모두 완료 (E2E 확장만 머지 후 작업)

---

## 1. data-testid 추가 ✅ 완료

### NaturalLanguageInput.tsx — 전부 추가됨

| 요소 | data-testid | 상태 |
|------|------------|------|
| 텍스트 입력 textarea | `ai-chat-input` | ✅ |
| 전송 버튼 | `ai-chat-submit` | ✅ |
| 예시 프롬프트 영역 | `example-prompts` | ✅ |
| 추천 카드 전체 | `recommendation-card` | ✅ |
| "이 방법으로 분석하기" 버튼 | `select-recommended-method` | ✅ |
| "다시 질문" 버튼 | `retry-question` | ✅ |
| 대안 토글 | `alternatives-toggle` | ✅ |

### ResultsActionStep.tsx — 전부 추가됨

| 요소 | data-testid | 상태 |
|------|------------|------|
| 결과 메인 카드 | `results-main-card` | ✅ |
| 상세 결과 섹션 | `detailed-results-section` | ✅ |
| 진단 & 권장 섹션 | `diagnostics-section` | ✅ |
| 액션 버튼 영역 | `action-buttons` | ✅ |

### 기존 testid (유지 확인됨)

| 파일 | data-testid | 상태 |
|------|------------|------|
| NaturalLanguageInput.tsx | `data-summary-card`, `ambiguity-note`, `variable-assignments`, `recommendation-warnings`, `data-preprocessing` | ✅ 유지 |
| ResultsActionStep.tsx | `ai-interpretation-section`, `recommendations-section`, `warnings-section`, `alternatives-section` | ✅ 유지 |
| PurposeInputStep.tsx | `selected-method-bar`, `final-selected-method-name` | ✅ 유지 |
| MethodSpecificResults.tsx | `method-specific-results` | ✅ 유지 |

---

## 2. Mock 반환값 수정 ✅ 완료

두 파일 모두 `mockResolvedValue` 설정 완료:
- `ResultsActionStep.test.tsx` ✅
- `ResultsActionStep-reanalyze.test.tsx` ✅

---

## 3. UI 디자인 변경 시 지켜야 할 규칙 (상시 참고)

### 절대 하면 안 되는 것
- data-testid 속성 삭제/이름 변경
- Store 상태 키(state key) 이름 변경

### 자유롭게 해도 되는 것
- CSS/Tailwind 클래스, 컴포넌트 구조, 텍스트/라벨, 아이콘, 레이아웃 변경
- 새 요소 추가 (기존 data-testid 요소만 유지하면 됨)

### 새 핵심 요소 추가 시
- 반드시 `data-testid` 부여 (kebab-case)

---

## 4. E2E 테스트 2경로 구조 — 머지 후 작업

현재 E2E는 "직접 선택" 경로만 테스트. 머지 후 LLM 경로 추가 필요:

```
경로 1 (LLM): 업로드 → ai-chat-input → ai-chat-submit → recommendation-card → select-recommended-method → 분석
경로 2 (직접): 업로드 → "직접 선택" → 카테고리 → 메서드 → 분석 (현재 구현됨)
```

**LLM 경로 API 처리**: `page.route('**/openrouter.ai/**', ...)` mock 또는 Keyword 폴백 모드 사용
