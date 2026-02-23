# AI 품질 개선 로드맵

> BioHub 통계 분석 플랫폼 — AI 서비스 개선 계획
> 참조: [llm-integration.md](llm-integration.md) (범용 LLM 가이드)

## Context

`ai/llm-integration.md`(범용 LLM 가이드)와 현재 BioHub AI 서비스 구현을 비교 분석한 결과,
3가지 개선 영역이 확인됨:

1. **프롬프트 품질** — 환각 방지, 한국어 토큰 대응 미흡
2. **AI 맥락 유실** — Hub 질문 + AI 추천 reasoning이 분석 완료 후 사라짐
3. **문서 정리** — AI 관련 문서가 분산되어 있었음 → `ai/` 폴더로 통합

---

## Phase 0: 폴더 정리 — 완료

| 작업 | 내용 |
|------|------|
| `docs/` → `ai/` | `llm-integration.md` 포함 (범용 LLM 가이드) |
| `ai/PLAN.md` 생성 | AI 개선 로드맵 (본 문서) |

## Phase 1: 프롬프트 품질 개선

### 1-1. 환각 방지 — 데이터 인용 강제

**파일:** `stats/lib/services/ai/prompts.ts`

Diagnostic 프롬프트(`getSystemPromptDiagnostic`)에 데이터 인용 규칙 추가:

```
## 핵심 규칙 — 데이터 인용 (환각 방지)
- 모든 추천 이유에 위 데이터의 구체적 수치를 인용하세요.
  좋은 예: "수치형 변수가 2개이고 그룹 변수가 1개(3개 범주)이므로 one-way ANOVA가 적합해요"
  나쁜 예: "여러 그룹을 비교하는 데 적합해요"
- "~인 것 같아요" 같은 불확실한 표현 금지 — 데이터에 근거하여 확정적으로 추천
```

### 1-2. per-call 옵션 추가 + 기능별 토큰/temperature 최적화

**파일:** `stats/lib/services/openrouter-recommender.ts`

`generateRawText()`와 `callModel()`에 optional `options` 파라미터 추가.
config default(2000/0.2)는 유지 — 개별 호출에서 override.

| 기능 | maxTokens | temperature | 이유 |
|------|-----------|-------------|------|
| 추천 (recommend) | 3500 | 0.2 | 한국어 reasoning + alternatives |
| Intent 분류 | 1000 | 0.1 | 단순 JSON, 결정적 |
| 결과 해석 (stream) | 4000 | 0.5 | 긴 한국어 설명 |

## Phase 2: AI 추천 맥락 보존

### 문제

현재 `analysisHistory`에 저장되지 않는 것:
- Hub에서 입력한 원래 질문 (`userQuery`)
- AI가 추천한 reasoning, warnings, alternatives, confidence
- 어떤 질문이 어떤 분석으로 이어졌는지의 인과 맥락

### 해결

1. `HistoryRecord` + `AnalysisHistory`에 `aiRecommendation` 필드 추가
2. `SmartFlowState`에 `lastAiRecommendation` 임시 저장 (세션 한정)
3. `PurposeInputStep.handleAiSubmit`에서 AI 추천 시 store 저장
4. `saveToHistory()`에서 `HistoryRecord`로 전달
5. `AnalysisHistoryPanel`에서 UI 표시

---

## 수정 파일 요약

| # | 파일 | Phase | 변경 |
|---|------|-------|------|
| 0 | `docs/` → `ai/` | 0 | 폴더 리네임 |
| 1 | `ai/PLAN.md` | 0 | 로드맵 문서 생성 |
| 2 | `stats/lib/services/ai/prompts.ts` | 1 | 환각 방지 규칙 추가 |
| 3 | `stats/lib/services/openrouter-recommender.ts` | 1 | per-call options 추가 |
| 4 | `stats/lib/services/llm-recommender.ts` | 1 | 기능별 옵션 전달 |
| 5 | `stats/lib/utils/storage-types.ts` | 2 | HistoryRecord 확장 |
| 6 | `stats/lib/stores/smart-flow-store.ts` | 2 | lastAiRecommendation 필드 |
| 7 | `stats/components/smart-flow/steps/PurposeInputStep.tsx` | 2 | 추천 결과 store 저장 |
| 8 | `stats/components/smart-flow/AnalysisHistoryPanel.tsx` | 2 | 히스토리 UI 반영 |
