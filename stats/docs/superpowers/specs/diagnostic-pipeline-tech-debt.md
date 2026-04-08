# Diagnostic Pipeline 기술 부채 (Phase B 리뷰에서 발견)

**날짜**: 2026-04-08
**상태**: 보류 — 별도 세션에서 처리

---

## 높음 (기능 영향)

### ~~TD-1. suggestedSettings → Handler 전달 (Phase E)~~ ✅ 해결됨
- ~~`suggestedSettings.postHoc`와 `.alternative`가 analysis-store에 저장되지만 handler에 전달 안 됨~~
- **해결**: `statistical-executor.ts` switch → settings 전달, `handle-t-test.ts` alternative 지원, `handle-anova.ts` postHoc 선호 방법 지원
- Python Worker(`worker2-hypothesis.py`)에도 `alternative` 파라미터 추가 (SciPy 네이티브)

### TD-2. auto 셀렉터 12개 메서드 변수 입력 UI
- **현황**: friedman, MANOVA, survival 등 `auto` 셀렉터 타입은 슬롯이 비어 있어 프리필 불완전
- **범위**: AutoConfirmSelector에 "자동 감지됨" 배지 + 수동 조정 UI
- **장기**: auto → 전용 셀렉터 전환

---

## 중간 (코드 품질)

### ~~TD-3. Worker 응답 타입 중복 (3파일)~~ ✅ 해결됨
- ~~`TestAssumptionsWorkerResult` + `NormalityWorkerResult`가 3곳에 동일 정의~~
- **해결**: `lib/services/pyodide/worker-result-types.ts`로 추출 완료

### ~~TD-4. Pyodide lazy init 패턴 중복 (3파일)~~ ✅ 해결됨
- ~~동일 7줄 패턴 (dynamic import → getInstance → isInitialized → try init → warn)~~
- **해결**: `lib/services/pyodide/ensure-pyodide-ready.ts` → `ensurePyodideReady(caller)` 추출 완료
- 적용: assumption-testing-service, diagnostic-pipeline (2곳), normality-enrichment-service

### ~~TD-5. JSON 추출 regex 분산 (5곳)~~ ✅ 해결됨
- ~~LLM 응답에서 JSON 블록을 추출하는 regex가 5곳에 각각 구현~~
- **해결**: `lib/utils/json-extraction.ts`로 추출 완료 — `extractJsonFromLlmResponse()` (코드블록 + balanced-brace)
- 적용: diagnostic-pipeline, openrouter-recommender, llm-recommender, ai-service (ollama는 별도 유지)

### ~~TD-6. MIN_GROUP_SIZE = 3 상수 중복~~ ✅ 해결됨
- ~~3곳에 동일 값 정의: diagnostic-pipeline, assumption-testing-service, use-levene-test~~
- **해결**: `lib/constants/statistical-constants.ts`로 추출 완료

### ~~TD-7. 그룹 변수 해결 로직 중복~~ ✅ 해결됨
- ~~`factor?.[0] ?? independent?.[0] ?? between?.[0]` 패턴이 2곳~~
- **해결**: `resolveGroupVariable()` → `lib/constants/statistical-constants.ts`로 추출 완료

---

## 낮음 (개선)

### ~~TD-8. goToPreviousStep() Step 2 skip 미인지~~ ✅ 이미 해결됨
- ~~Step 3에서 "이전" 누르면 Step 2로 이동~~
- **해결**: Phase D에서 AnalysisSteps.tsx의 VariableSelectionStep onBack에 diagnostic/quick 트랙 분기 구현 완료

### ~~TD-9. experiment-design 트랙 빈 껍데기~~ ✅ 해결됨
- ~~Intent Router에 트랙 있지만 실제 기능 없음~~
- **해결**: experiment-design 트랙 삭제, data-consultation으로 흡수 (AI 상담에서 자연 처리)

---

## UX 개선 대기 (디자인 선택 필요)

### UX-1. 정보 3중 표시
- AI 텍스트 + 진단 카드 + 추천 카드가 같은 정보를 반복
- 선택지: 진단 카드 있으면 추천 카드 숨김 / AI 텍스트 축약

### UX-2. "분석 시작하기" 버튼 가시성
- `ghost` + `h-7 text-xs`로 작음
- 선택지: `variant="default"` + 더 큰 사이즈 / 카드 외부 고정

### UX-3. Step 1 diagnostic 모드 안내
- 배너는 있지만 "다음을 누르세요" 명시 없음
- 선택지: 배너 텍스트 보강 / 자동 Step 3 점프

### UX-4. 진행 상태 텍스트 비전문가 용어
- "가정 검정 실행 중..." → "데이터 특성 확인 중..." 등

### UX-5. p값 표시 방식
- 소수점 3자리 → "정규분포 확인됨 ✓" 같은 직관적 표현

### UX-6. 후보 컬럼 클릭 인터랙션
- 현재 텍스트 전용 → 클릭 시 ChatInput 자동 입력

### UX-7. clarification 질문 방식
- 한 번에 하나의 역할만 → 2개 역할 동시 안내
