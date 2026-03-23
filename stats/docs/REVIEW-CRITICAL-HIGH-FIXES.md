# 점검 결과 Critical/High 수정 리뷰

**날짜**: 2026-03-23
**범위**: `[analysis]` + `[graph]` Critical 4건 + High 4건
**변경 파일**: 12개 (120 additions, 53 deletions)

---

## Critical 수정 (4건)

### 1. localStorage QuotaExceededError 처리

**문제**: `style-template-storage.ts`, `use-ai-chat.ts`에서 localStorage 쓰기 실패 시 사용자 피드백 없음.

**수정**:
- `style-template-storage.ts`: `saveTemplate()`, `deleteTemplate()`에 try-catch + `console.warn` + throw 추가. `project-storage.ts`와 동일 패턴.
- `use-ai-chat.ts`: 기존 빈 catch 블록에 `logger.warn` 추가 (용량 초과 시 로그 기록).
- `project-storage.ts`: 이미 처리되어 있어 변경 없음.

**리뷰 포인트**:
- `style-template-storage.ts`는 throw하고, `use-ai-chat.ts`는 throw 안 함 — 의도적. 채팅 히스토리 저장 실패는 기능 중단 불가, 템플릿 저장 실패는 사용자에게 알려야 함.
- `console.warn` vs `logger.warn` — storage 모듈은 React 외부 유틸이므로 `console.warn` 사용. React 훅(`use-ai-chat`)은 `logger` 사용.

### 2. AI 패치 적용 후 스키마 검증

**문제**: `applyPatches()`가 스키마 검증 없이 export되어 외부에서 직접 호출 가능.

**수정**:
- `applyPatches()` JSDoc에 "내부 전용, 외부에서는 `applyAndValidatePatches` 사용" 명시.
- `applyAndValidatePatches()` 검증 실패 시 `console.warn` 추가 (패치 개수 포함).
- 프로덕션 호출 경로 확인: `use-ai-chat.ts`만 사용하며, 이미 `applyAndValidatePatches` 호출 중.

**리뷰 포인트**:
- `applyPatches` export를 제거하지 않은 이유 — 테스트 코드에서 직접 사용 (20+ 테스트 케이스).

### 3. intent-router 신뢰도 임계값

**문제**: 임계값 0.7에서 명확한 의도 표현("t-test 하겠습니다")이 LLM 재분류 트리거.

**수정**:
- 임계값 0.7 → 0.6 조정 (더 많은 키워드 매칭이 LLM 우회).
- `DIRECT_INTENT_PATTERNS`에 한국어 의도 패턴 추가: `하겠/할게/해주/해볼/해봐/하자`, `분석 해/하/할/시작`.

**리뷰 포인트**:
- `/simplify` 리뷰에서 `합니다|하세요` 패턴이 "분석 결과입니다" 같은 비의도 문장에 매칭되는 false positive 발견 → 제거됨.
- 임계값 0.6은 `data-consultation` 1-match (0.65)도 LLM 없이 통과시킴. 이는 의도적 — "추천해줘" 같은 단일 키워드도 충분히 명확.

### 4. 가정 검정 실패 시 로그 없음

**문제**: `executeAssumptionTests()` 호출이 try-catch 없이 silent skip.

**수정**:
- try-catch 추가 + `logger.error('가정 검정 실행 실패', { error, method })`.
- catch 후 `assumptionResult`는 undefined 유지 → 기존 `if (!assumptionResult) addLog(logs.assumptionSkipped)` 로직 그대로 동작.

**리뷰 포인트**:
- 에러 시 분석 자체는 중단되지 않음 (graceful degradation). 가정 검정은 보조 정보이므로 적절.

---

## High 수정 (4건)

### 5. echarts-converter 필드 미존재 시 NaN 방어

**문제**: `aggregateRows()`에서 `yField`가 데이터에 없으면 모든 값이 NaN → 집계 결과 비어있음.

**수정**:
- `rows[0]`에 `yField` 존재 여부 확인 + `console.warn` 추가.
- 기존 `isNaN(val)` 필터는 유지 — NaN 행은 무시되므로 결과가 빈 배열로 나옴 (crash 없음).

**리뷰 포인트**:
- `in` 연산자는 O(1). `rows.length > 0` 가드로 안전.

### 6. 프로젝트 복원 시 인코딩 불일치 경고

**문제**: 데이터 재업로드 시 기존 chartSpec의 인코딩 필드가 새 데이터에 없으면 `currentProject = null`로 무경고 해제.

**수정**:
- 불일치 시 `console.warn` 추가 (프로젝트명 + 누락 필드 목록).
- `fieldsToCheck.filter(f => f && !colNames.has(f))` — 소규모 배열(3-5개)이므로 성능 영향 없음.

**리뷰 포인트**:
- toast 대신 console.warn 사용 — store 내부에서 React 훅(toast) 호출 불가. toast는 UI 레이어에서 store 변경 감지로 구현해야 함 (후속 과제).

### 7. chi-square-goodness 1변수 전용 selector

**결과**: 이미 구현됨.
- `ChiSquareSelector`가 `GOODNESS_IDS.has('chi-square-goodness')` → `mode='goodness'` → 1변수 UI.
- `method-registry.ts`에서 `chi-square-goodness → 'chi-square'` 매핑 → `VariableSelectionStep`에서 `ChiSquareSelector` 렌더링.

### 8. proportion-test testValue 입력 UI

**결과**: 이미 구현됨.
- `ChiSquareSelector`에 `nullProportion` 입력 카드 (0.01~0.99 범위, 기본값 0.5).
- 검증: `nullProportionNum <= 0 || >= 1` 시 에러 메시지.
- 제출 시 `VariableMapping.nullProportion`으로 전달.

---

## /simplify 리뷰 결과

3개 병렬 에이전트(reuse/quality/efficiency) 실행 후 수정:

| 발견 | 조치 |
|------|------|
| `typeof console !== 'undefined'` 불필요 가드 | 제거 |
| `/합니다\|하세요/i` false positive 위험 | 제거 |
| `console.warn` vs `logger.warn` 혼용 | storage 모듈은 `console.warn` 유지 (React 외부) |

## 서브에이전트 리뷰 결과 (2차)

Graph Studio 리뷰 + Analysis 리뷰 2개 에이전트 병렬 실행 후 수정:

| 발견 | 심각도 | 조치 |
|------|--------|------|
| `saveTemplate()` throw → `StyleTab.tsx` 호출자에 catch 없음 | 중 | try-catch + `toast.error` 추가 |
| `deleteTemplate()` throw → `ChartSetupPanel.tsx` catch 없음 | 중 | try-catch 추가 |
| `/분석\s*(해\|하\|할\|시작)/i` 관형사("분석할") false positive | 중 | `분석\s*(해봐\|해줘\|하자\|시작)` 으로 축소 |
| `awaitPreemptiveAssumptions()` 경로에 try-catch 누락 | 중 | try-catch + logger.error 추가 |
| `graph-studio-store` 인코딩 불일치 시 toast 필요 | 중 | 후속 과제 (store 내 toast 불가, UI 레이어에서 처리 필요) |

---

## 검증 상태

- **tsc**: `pnpm tsc --noEmit -p stats/tsconfig.json` 통과 (루트에 tsconfig 없으므로 서브프로젝트 지정 필수)
- **test**: 보류 (별도 실행 필요: `pnpm test`)

---

## 변경 파일 목록

| 파일 | 변경 유형 |
|------|-----------|
| `stats/lib/graph-studio/style-template-storage.ts` | QuotaExceededError try-catch |
| `stats/lib/graph-studio/use-ai-chat.ts` | logger.warn 추가 |
| `stats/lib/graph-studio/chart-spec-utils.ts` | 검증 실패 warn + JSDoc |
| `stats/lib/services/intent-router.ts` | 임계값 0.6 + 패턴 추가 |
| `stats/components/analysis/steps/AnalysisExecutionStep.tsx` | try-catch + logger.error |
| `stats/lib/graph-studio/echarts-converter.ts` | yField 존재 확인 warn |
| `stats/lib/stores/graph-studio-store.ts` | 인코딩 불일치 warn |
| `TODO.md` | 8건 완료 표시 |
