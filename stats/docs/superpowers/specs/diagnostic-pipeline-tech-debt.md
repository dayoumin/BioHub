# Diagnostic Pipeline 기술 부채 (Phase B 리뷰에서 발견)

**날짜**: 2026-04-08
**상태**: 보류 — 별도 세션에서 처리

---

## 높음 (기능 영향)

### TD-1. suggestedSettings → Handler 전달 (Phase E)
- **현황**: `suggestedSettings.postHoc`와 `.alternative`가 analysis-store에 저장되지만 handler에 전달 안 됨
- **원인**: handler 함수 시그니처에 settings 파라미터 자체가 없음
- **범위**: `AnalysisExecutionStep.tsx` (mergedOptions) + `statistical-executor.ts` (switch → handler 전달) + 각 handler 시그니처 변경
- **관련 파일**: `handle-t-test.ts` (alternative), `handle-anova.ts` (postHoc)

### TD-2. auto 셀렉터 12개 메서드 변수 입력 UI
- **현황**: friedman, MANOVA, survival 등 `auto` 셀렉터 타입은 슬롯이 비어 있어 프리필 불완전
- **범위**: AutoConfirmSelector에 "자동 감지됨" 배지 + 수동 조정 UI
- **장기**: auto → 전용 셀렉터 전환

---

## 중간 (코드 품질)

### TD-3. Worker 응답 타입 중복 (3파일)
- `TestAssumptionsWorkerResult` + `NormalityWorkerResult`가 아래 3곳에 동일 정의:
  - `lib/services/assumption-testing-service.ts:25-50`
  - `lib/services/diagnostic-pipeline.ts:38-61`
  - `lib/services/normality-enrichment-service.ts:17-21` (NormalityResult)
- **해결**: `lib/services/pyodide/worker-result-types.ts`로 추출

### TD-4. Pyodide lazy init 패턴 중복 (3파일)
- 동일 7줄 패턴 (dynamic import → getInstance → isInitialized → try init → warn):
  - `assumption-testing-service.ts:79-88`
  - `diagnostic-pipeline.ts` (pre-warm으로 완화됨)
  - `normality-enrichment-service.ts:63-72`
- **해결**: `ensurePyodideReady(): Promise<PyodideCoreService | null>` 헬퍼 추출

### TD-5. JSON 추출 regex 분산 (5곳)
- LLM 응답에서 JSON 블록을 추출하는 regex가 5곳에 각각 구현:
  - `diagnostic-pipeline.ts` (가장 약한 버전)
  - `openrouter-recommender.ts` (`extractBalancedJson` — 가장 강건)
  - `ollama-recommender.ts`, `llm-recommender.ts`, `ai-service.ts`
- **해결**: `lib/utils/json-extraction.ts`로 추출, balanced-brace 방식 통합

### TD-6. MIN_GROUP_SIZE = 3 상수 중복
- 3곳에 동일 값 정의: diagnostic-pipeline, assumption-testing-service, use-levene-test
- **해결**: `lib/constants/statistical-constants.ts`로 추출

### TD-7. 그룹 변수 해결 로직 중복
- `factor?.[0] ?? independent?.[0] ?? between?.[0]` 패턴이 2곳:
  - `assumption-testing-service.ts:92`
  - `diagnostic-pipeline.ts`
- **해결**: `resolveGroupVariable(va)` 헬퍼 추출

---

## 낮음 (개선)

### TD-8. goToPreviousStep() Step 2 skip 미인지
- Step 3에서 "이전" 누르면 Step 2로 이동 (diagnostic/quick 트랙에서는 Step 1이어야)
- Phase D에서 `onBack` prop 커스터마이즈로 해결 예정

### TD-9. experiment-design 트랙 빈 껍데기
- Intent Router에 트랙 있지만 실제 기능 없음
- Consultant 모드에서 power-analysis 추천으로 흡수 검토
