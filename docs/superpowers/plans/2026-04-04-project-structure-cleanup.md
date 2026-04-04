# Project Structure Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 프로덕션 코드에서 테스트/디버그 잔재 제거, lib/services/ 구조 개선, 미사용 코드 정리

**Architecture:** 5개 순차 태스크. Task 1-2는 단순 삭제, Task 3-4는 파일 이동 + import 경로 수정, Task 5는 최종 검증. 각 태스크 후 `pnpm tsc --noEmit && pnpm test --run` 검증. Task 3-4는 워크트리에 이미 수정된 파일(`pyodide-statistics.ts`, `statistical-executor.ts`)이 있으므로 **순차 실행 필수** (병렬 불가).

**Tech Stack:** Next.js 15, TypeScript, Vitest, Playwright, pnpm

**환경 참고:** 쉘은 bash (Git Bash on Windows). `mkdir -p`, `wc -l` 등 Unix 명령 사용 가능.

---

## File Structure

### 삭제 대상
- `stats/app/test-calculation/page.tsx` (99줄) — Pyodide 계산 테스트 페이지
- `stats/app/test-pyodide-init/page.tsx` (221줄) — Pyodide 초기화 디버그 페이지
- `stats/app/test-pyodide-descriptive/page.tsx` (160줄) — 기술통계 테스트 페이지
- `stats/app/test-sw/page.tsx` (314줄) — Service Worker 테스트 페이지
- `stats/app/(dashboard)/experimental-design-coming-soon/page.tsx` (29줄) — 빈 placeholder
- `stats/components/common/CollapsibleButton.tsx` (121줄) — orphan 컴포넌트
- `stats/components/common/StepIndicator.tsx` (348줄) — orphan (graph-studio 버전이 실사용)
- `stats/e2e/core-calculation.spec.ts` — test-calculation만 테스트하는 E2E
- `stats/e2e/pyodide-runtime.spec.ts` — test-pyodide-* 라우트만 테스트하는 E2E
- `stats/e2e/pyodide-basic.spec.ts` — test-pyodide-* 라우트만 테스트하는 E2E
- `stats/e2e/pyodide-debug.spec.ts` — test-pyodide-init만 테스트하는 E2E

### 이동 대상 (recommenders/ 그룹핑)
- `stats/lib/services/decision-tree-recommender.ts` → `stats/lib/services/recommenders/`
- `stats/lib/services/keyword-based-recommender.ts` → `stats/lib/services/recommenders/`
- `stats/lib/services/llm-recommender.ts` → `stats/lib/services/recommenders/`
- `stats/lib/services/ollama-recommender.ts` → `stats/lib/services/recommenders/`
- `stats/lib/services/openrouter-recommender.ts` → `stats/lib/services/recommenders/`
- `stats/lib/services/smart-recommender.ts` → `stats/lib/services/recommenders/`

### 이동 대상 (pyodide/ 통합)
- `stats/lib/services/pyodide-helper.ts` → `stats/lib/services/pyodide/`
- `stats/lib/services/pyodide-statistics.ts` → `stats/lib/services/pyodide/`
- `stats/lib/services/pyodide-statistics.adapters.ts` → `stats/lib/services/pyodide/`

---

## Task 1: 테스트 라우트 4개 + 관련 E2E 삭제

**검증 완료:** 4개 E2E 파일 모두 test-* 라우트만 테스트 (프로덕션 라우트 참조 없음).
- `core-calculation.spec.ts` → `/test-calculation`만
- `pyodide-runtime.spec.ts` → `/test-pyodide-*` 10개 라우트만
- `pyodide-basic.spec.ts` → `/test-pyodide-init`, `/test-pyodide-descriptive`만
- `pyodide-debug.spec.ts` → `/test-pyodide-init`만

**Files:**
- Delete: `stats/app/test-calculation/` (디렉토리)
- Delete: `stats/app/test-pyodide-init/` (디렉토리)
- Delete: `stats/app/test-pyodide-descriptive/` (디렉토리)
- Delete: `stats/app/test-sw/` (디렉토리)
- Delete: `stats/app/(dashboard)/experimental-design-coming-soon/` (디렉토리)
- Delete: `stats/e2e/core-calculation.spec.ts`
- Delete: `stats/e2e/pyodide-runtime.spec.ts`
- Delete: `stats/e2e/pyodide-basic.spec.ts`
- Delete: `stats/e2e/pyodide-debug.spec.ts`

- [ ] **Step 1: 테스트 라우트 디렉토리 삭제**

```bash
cd d:/Projects/BioHub/stats
rm -r app/test-calculation app/test-pyodide-init app/test-pyodide-descriptive app/test-sw
rm -r "app/(dashboard)/experimental-design-coming-soon"
```

- [ ] **Step 2: 관련 E2E 테스트 4개 삭제**

```bash
cd d:/Projects/BioHub/stats
rm e2e/core-calculation.spec.ts e2e/pyodide-runtime.spec.ts e2e/pyodide-basic.spec.ts e2e/pyodide-debug.spec.ts
```

- [ ] **Step 3: Vitest 검증**

```bash
cd d:/Projects/BioHub/stats
pnpm tsc --noEmit && pnpm test --run
```

Expected: 타입 에러 없음, Vitest 전체 통과

- [ ] **Step 4: 커밋**

```bash
cd d:/Projects/BioHub
git add stats/app/test-calculation stats/app/test-pyodide-init stats/app/test-pyodide-descriptive stats/app/test-sw "stats/app/(dashboard)/experimental-design-coming-soon" stats/e2e/core-calculation.spec.ts stats/e2e/pyodide-runtime.spec.ts stats/e2e/pyodide-basic.spec.ts stats/e2e/pyodide-debug.spec.ts
git commit -m "$(cat <<'EOF'
chore: remove test routes, placeholder, and related E2E specs

Remove 4 test routes (test-calculation, test-pyodide-init,
test-pyodide-descriptive, test-sw), experimental-design-coming-soon
placeholder, and 4 Playwright E2E specs that only targeted these
debug routes (core-calculation, pyodide-runtime, pyodide-basic,
pyodide-debug).

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Orphan 컴포넌트 삭제

**검증 결과:**
- `CollapsibleButton.tsx` — `index.ts`에서 export하지만 codebase 어디서도 import 안 함
- `StepIndicator.tsx` (common/) — `components/graph-studio/StepIndicator.tsx`가 실제 사용됨, common 버전은 미사용
- `design-system/page.tsx`는 StepIndicator를 import하지 **않음** (FloatingStepIndicatorDemo만 사용, 이는 FloatingStepIndicator에 의존하며 StepIndicator와 무관)

**Files:**
- Delete: `stats/components/common/CollapsibleButton.tsx`
- Delete: `stats/components/common/StepIndicator.tsx`
- Modify: `stats/components/common/index.ts` — 2개 export 제거

- [ ] **Step 1: index.ts에서 export 제거**

`stats/components/common/index.ts`에서 다음 두 줄을 찾아 제거:

```typescript
export { CollapsibleButton } from './CollapsibleButton';
export { StepIndicator } from './StepIndicator';
```

(export 형태가 다르면 실제 형태에 맞춰 제거)

- [ ] **Step 2: 파일 삭제**

```bash
cd d:/Projects/BioHub/stats
rm components/common/CollapsibleButton.tsx components/common/StepIndicator.tsx
```

- [ ] **Step 3: 검증**

```bash
cd d:/Projects/BioHub/stats
pnpm tsc --noEmit && pnpm test --run
```

Expected: 타입 에러 없음, 테스트 전체 통과

- [ ] **Step 4: 커밋**

```bash
cd d:/Projects/BioHub
git add stats/components/common/CollapsibleButton.tsx stats/components/common/StepIndicator.tsx stats/components/common/index.ts
git commit -m "$(cat <<'EOF'
chore: remove orphaned CollapsibleButton and StepIndicator (common/)

CollapsibleButton was exported but never imported anywhere.
StepIndicator in common/ was shadowed by the actively used
graph-studio/StepIndicator.tsx.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Recommender 파일 6개 → recommenders/ 이동

**완전한 import 인벤토리 (검증 완료):**

import/vi.mock/동적 import을 **모두** 포함한 전체 목록. 실행 시 `grep -rn "recommender" --include="*.ts" --include="*.tsx" stats/ | grep -v node_modules | grep -v .next`로 누락 재확인 필수.

### 내부 상호 참조 (같은 폴더 이동 → 변경 불필요)
- `decision-tree-recommender.ts` → `import { KeywordBasedRecommender } from './keyword-based-recommender'`
- `llm-recommender.ts` → `import { openRouterRecommender } from './openrouter-recommender'`
- `llm-recommender.ts` → `import { ollamaRecommender } from './ollama-recommender'`

### 외부 참조 — decision-tree-recommender

| 파일 | 줄 | 유형 | FROM | TO |
|------|-----|------|------|-----|
| `components/analysis/steps/PurposeInputStep.tsx` | 16 | import | `@/lib/services/decision-tree-recommender` | `@/lib/services/recommenders/decision-tree-recommender` |
| `scripts/validate-reasoning-keywords.ts` | 11 | import | `@/lib/services/decision-tree-recommender` | `@/lib/services/recommenders/decision-tree-recommender` |
| `__tests__/lib/services/decision-tree-recommender.test.ts` | 13 | import | `@/lib/services/decision-tree-recommender` | `@/lib/services/recommenders/decision-tree-recommender` |
| `__tests__/services/phase4-expected-keywords.test.ts` | 10 | import | `@/lib/services/decision-tree-recommender` | `@/lib/services/recommenders/decision-tree-recommender` |
| `__tests__/components/analysis/steps/PurposeInputStep.test.tsx` | 117 | vi.mock | `@/lib/services/decision-tree-recommender` | `@/lib/services/recommenders/decision-tree-recommender` |

### 외부 참조 — keyword-based-recommender

| 파일 | 줄 | 유형 | FROM | TO |
|------|-----|------|------|-----|
| `__tests__/services/phase4-expected-keywords.test.ts` | 11 | import | `@/lib/services/keyword-based-recommender` | `@/lib/services/recommenders/keyword-based-recommender` |

### 외부 참조 — llm-recommender

| 파일 | 줄 | 유형 | FROM | TO |
|------|-----|------|------|-----|
| `components/analysis/steps/PurposeInputStep.tsx` | 17 | import | `@/lib/services/llm-recommender` | `@/lib/services/recommenders/llm-recommender` |
| `components/analysis/steps/purpose/AutoRecommendationConfirm.tsx` | 34 | import (type) | `@/lib/services/llm-recommender` | `@/lib/services/recommenders/llm-recommender` |
| `components/analysis/steps/purpose/NaturalLanguageInput.tsx` | 39 | import (type) | `@/lib/services/llm-recommender` | `@/lib/services/recommenders/llm-recommender` |
| `lib/services/intent-router.ts` | 13 | import | `@/lib/services/llm-recommender` | `@/lib/services/recommenders/llm-recommender` |
| `lib/services/result-interpreter.ts` | 10 | import | `./llm-recommender` | `./recommenders/llm-recommender` |
| `__tests__/components/analysis/steps/PurposeInputStep.test.tsx` | 18 | import | `@/lib/services/llm-recommender` | `@/lib/services/recommenders/llm-recommender` |
| `__tests__/components/analysis/steps/PurposeInputStep.test.tsx` | 129 | vi.mock | `@/lib/services/llm-recommender` | `@/lib/services/recommenders/llm-recommender` |
| `__tests__/lib/services/llm-recommender.test.ts` | 40 | import | `@/lib/services/llm-recommender` | `@/lib/services/recommenders/llm-recommender` |
| `__tests__/lib/services/stream-follow-up.test.ts` | 23 | vi.mock | `@/lib/services/llm-recommender` | `@/lib/services/recommenders/llm-recommender` |
| `__tests__/services/intent-router.test.ts` | 14 | vi.mock | `@/lib/services/llm-recommender` | `@/lib/services/recommenders/llm-recommender` |
| `__tests__/services/intent-router.test.ts` | 31 | import | `@/lib/services/llm-recommender` | `@/lib/services/recommenders/llm-recommender` |
| `__tests__/services/intent-router-critical.test.ts` | 22 | vi.mock | `@/lib/services/llm-recommender` | `@/lib/services/recommenders/llm-recommender` |
| `__tests__/services/intent-router-critical.test.ts` | 38 | import | `@/lib/services/llm-recommender` | `@/lib/services/recommenders/llm-recommender` |

### 외부 참조 — ollama-recommender

| 파일 | 줄 | 유형 | FROM | TO |
|------|-----|------|------|-----|
| `__tests__/services/llm-recommender-simulation.test.ts` | 266,270 | dynamic import | `@/lib/services/ollama-recommender` | `@/lib/services/recommenders/ollama-recommender` |
| `__tests__/lib/services/llm-recommender.test.ts` | 24 | vi.mock | `@/lib/services/ollama-recommender` | `@/lib/services/recommenders/ollama-recommender` |

### 외부 참조 — openrouter-recommender

| 파일 | 줄 | 유형 | FROM | TO |
|------|-----|------|------|-----|
| `lib/graph-studio/ai-service.ts` | 10 | import | `@/lib/services/openrouter-recommender` | `@/lib/services/recommenders/openrouter-recommender` |
| `lib/services/hub-chat-service.ts` | 11 | import | `./openrouter-recommender` | `./recommenders/openrouter-recommender` |
| `__tests__/integration/llm-recommendation.test.ts` | 16 | import | `@/lib/services/openrouter-recommender` | `@/lib/services/recommenders/openrouter-recommender` |
| `__tests__/lib/graph-studio/ai-edit-simulation.test.ts` | 27 | vi.mock | `@/lib/services/openrouter-recommender` | `@/lib/services/recommenders/openrouter-recommender` |
| `__tests__/lib/graph-studio/ai-edit-simulation.test.ts` | 33 | import | `@/lib/services/openrouter-recommender` | `@/lib/services/recommenders/openrouter-recommender` |
| `__tests__/lib/graph-studio/ai-service.test.ts` | 19 | vi.mock | `@/lib/services/openrouter-recommender` | `@/lib/services/recommenders/openrouter-recommender` |
| `__tests__/lib/graph-studio/ai-service.test.ts` | 25 | import | `@/lib/services/openrouter-recommender` | `@/lib/services/recommenders/openrouter-recommender` |
| `__tests__/lib/services/openrouter-recommender.test.ts` | 11 | import | `@/lib/services/openrouter-recommender` | `@/lib/services/recommenders/openrouter-recommender` |
| `__tests__/lib/services/stream-follow-up.test.ts` | 35 | import | `@/lib/services/openrouter-recommender` | `@/lib/services/recommenders/openrouter-recommender` |
| `__tests__/lib/services/llm-recommender.test.ts` | 20 | vi.mock | `@/lib/services/openrouter-recommender` | `@/lib/services/recommenders/openrouter-recommender` |
| `__tests__/services/llm-recommender-simulation.test.ts` | 15,22 | dynamic import | `@/lib/services/openrouter-recommender` | `@/lib/services/recommenders/openrouter-recommender` |
| `__tests__/services/llm-recommender-simulation.test.ts` | 328,334 | dynamic import | `@/lib/services/openrouter-recommender` | `@/lib/services/recommenders/openrouter-recommender` |
| `__tests__/services/llm-recommender-simulation.test.ts` | 512,518 | dynamic import | `@/lib/services/openrouter-recommender` | `@/lib/services/recommenders/openrouter-recommender` |
| `__tests__/services/hub-chat-service.test.ts` | 48 | vi.mock | `@/lib/services/openrouter-recommender` | `@/lib/services/recommenders/openrouter-recommender` |
| `__tests__/services/hub-chat-service.test.ts` | 71 | dynamic import | `@/lib/services/openrouter-recommender` | `@/lib/services/recommenders/openrouter-recommender` |
| `__tests__/analysis/multi-turn-chat.test.ts` | 178,184 | dynamic import | `@/lib/services/openrouter-recommender` | `@/lib/services/recommenders/openrouter-recommender` |

### 외부 참조 — smart-recommender

| 파일 | 줄 | 유형 | FROM | TO |
|------|-----|------|------|-----|
| `__tests__/analysis/method-recommendation.test.ts` | 19 | import | `@/lib/services/smart-recommender` | `@/lib/services/recommenders/smart-recommender` |

### 비코드 참조 (변경 불필요 — 주석/문자열만)
- `lib/statistics/data-method-compatibility.ts:32` — 주석
- `app/(dashboard)/design-system/sections/TestAutomationDashboardSection.tsx:896` — 문자열
- `app/(dashboard)/design-system/sections/StatisticalMethodsSection.tsx:380-390` — 문자열 설정
- `__tests__/simulation/ai-quality-improvements.test.ts:551` — 주석
- `__tests__/services/llm-recommender-simulation.test.ts:414` — 주석
- `lib/services/ai/data-context-builder.ts:5` — 주석

**Files:**
- Create: `stats/lib/services/recommenders/` (디렉토리)
- Move: 6개 recommender 파일
- Modify: 위 테이블의 모든 파일 (import + vi.mock + dynamic import)

- [ ] **Step 1: 디렉토리 생성 및 파일 이동**

```bash
cd d:/Projects/BioHub/stats
mkdir -p lib/services/recommenders
mv lib/services/decision-tree-recommender.ts lib/services/recommenders/
mv lib/services/keyword-based-recommender.ts lib/services/recommenders/
mv lib/services/llm-recommender.ts lib/services/recommenders/
mv lib/services/ollama-recommender.ts lib/services/recommenders/
mv lib/services/openrouter-recommender.ts lib/services/recommenders/
mv lib/services/smart-recommender.ts lib/services/recommenders/
```

- [ ] **Step 2: 모든 외부 import 경로 일괄 수정**

위 테이블의 모든 FROM→TO를 적용. 각 파일을 열어 해당 줄의 경로를 수정.

**핵심 패턴:**
- 절대 경로: `@/lib/services/XXX-recommender` → `@/lib/services/recommenders/XXX-recommender`
- 상대 경로 (services root): `./XXX-recommender` → `./recommenders/XXX-recommender`
- vi.mock/vi.unmock: import과 동일 패턴
- dynamic import (`await import(...)`): import과 동일 패턴

- [ ] **Step 3: 누락 확인**

```bash
cd d:/Projects/BioHub/stats
grep -rn "from.*['\"].*lib/services/[a-z]*-recommender" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v .next | grep -v recommenders/
```

Expected: 0 matches (모두 `recommenders/` 경로로 변경됨). 결과가 있으면 추가 수정.

```bash
grep -rn "mock.*['\"].*lib/services/[a-z]*-recommender" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v .next | grep -v recommenders/
```

Expected: 0 matches (vi.mock 경로도 모두 변경됨).

- [ ] **Step 4: 검증**

```bash
cd d:/Projects/BioHub/stats
pnpm tsc --noEmit && pnpm test --run
```

Expected: 타입 에러 없음, 테스트 전체 통과

- [ ] **Step 5: 커밋**

```bash
cd d:/Projects/BioHub
git add -u && git add stats/lib/services/recommenders/
git commit -m "$(cat <<'EOF'
refactor: move 6 recommender files to lib/services/recommenders/

Group decision-tree, keyword-based, llm, ollama, openrouter, and smart
recommender services into a dedicated recommenders/ subdirectory.
All import paths, vi.mock calls, and dynamic imports updated.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Pyodide 파일 3개 → pyodide/ 통합

**주의:** 워크트리에 `pyodide-statistics.ts`와 `statistical-executor.ts` 수정이 이미 있음. 이 태스크는 Task 3 완료 후 순차 실행.

**완전한 import 인벤토리 (검증 완료):**

### 내부 참조 (같은 폴더 이동 → 변경 불필요)
- `pyodide-statistics.ts:39` → `from './pyodide-statistics.adapters'`

### pyodide-statistics 외부 참조 — 절대 경로

| 파일 | 줄 | 유형 | FROM | TO |
|------|-----|------|------|-----|
| `components/analysis/steps/AnalysisExecutionStep.tsx` | 21 | import | `@/lib/services/pyodide-statistics` | `@/lib/services/pyodide/pyodide-statistics` |
| `components/providers/PyodidePreloader.tsx` | 23 | import | `@/lib/services/pyodide-statistics` | `@/lib/services/pyodide/pyodide-statistics` |
| `components/providers/PyodideProvider.tsx` | 4 | import | `@/lib/services/pyodide-statistics` | `@/lib/services/pyodide/pyodide-statistics` |
| `components/analysis/steps/validation/hooks/useNormalityTest.ts` | 13 | import | `@/lib/services/pyodide-statistics` | `@/lib/services/pyodide/pyodide-statistics` |
| `lib/services/preemptive-assumption-service.ts` | 118 | dynamic import | `@/lib/services/pyodide-statistics` | `@/lib/services/pyodide/pyodide-statistics` |
| `vitest.setup.ts` | 75 | vi.mock | `@/lib/services/pyodide-statistics` | `@/lib/services/pyodide/pyodide-statistics` |
| `jest.setup.ts` | 73 | jest.mock | `@/lib/services/pyodide-statistics` | `@/lib/services/pyodide/pyodide-statistics` |
| `__tests__/hooks/use-normality-test-resilience.test.ts` | 13 | import (type) | `@/lib/services/pyodide-statistics` | `@/lib/services/pyodide/pyodide-statistics` |
| `__tests__/services/statistical-executor-runtime.test.ts` | 22 | vi.mock | `@/lib/services/pyodide-statistics` | `@/lib/services/pyodide/pyodide-statistics` |
| `__tests__/services/statistical-executor-runtime.test.ts` | 34 | import | `@/lib/services/pyodide-statistics` | `@/lib/services/pyodide/pyodide-statistics` |
| `__tests__/services/statistical-executor-group-validation.test.ts` | 4 | vi.mock | `@/lib/services/pyodide-statistics` | `@/lib/services/pyodide/pyodide-statistics` |
| `__tests__/services/pyodide-statistics-regression-fixes.test.ts` | 41 | vi.unmock | `@/lib/services/pyodide-statistics` | `@/lib/services/pyodide/pyodide-statistics` |
| `__tests__/services/pyodide-statistics-regression-fixes.test.ts` | 46 | dynamic import | `@/lib/services/pyodide-statistics` | `@/lib/services/pyodide/pyodide-statistics` |
| `__tests__/services/executors/statistical-executor-routing.test.ts` | 16 | vi.mock | `@/lib/services/pyodide-statistics` | `@/lib/services/pyodide/pyodide-statistics` |
| `__tests__/services/executors/statistical-executor-routing.test.ts` | 123 | import | `@/lib/services/pyodide-statistics` | `@/lib/services/pyodide/pyodide-statistics` |
| `__tests__/services/executors/executor-data-extraction.test.ts` | 19 | vi.mock | `@/lib/services/pyodide-statistics` | `@/lib/services/pyodide/pyodide-statistics` |
| `__tests__/services/executors/correlation-executor.test.ts` | 15 | vi.mock | `@/lib/services/pyodide-statistics` | `@/lib/services/pyodide/pyodide-statistics` |
| `__tests__/components/pyodide/PyodidePreloader.test.tsx` | 37 | vi.mock | `@/lib/services/pyodide-statistics` | `@/lib/services/pyodide/pyodide-statistics` |
| `__tests__/components/pyodide/PyodidePreloader.test.tsx` | 148,193,224,255,291,346 | vi.doMock | `@/lib/services/pyodide-statistics` | `@/lib/services/pyodide/pyodide-statistics` |
| `__tests__/components/analysis/steps/AnalysisExecutionStep.test.tsx` | 61 | vi.mock | `@/lib/services/pyodide-statistics` | `@/lib/services/pyodide/pyodide-statistics` |
| `__tests__/bugfix/nonparametric-routing.test.ts` | 16 | vi.mock | `@/lib/services/pyodide-statistics` | `@/lib/services/pyodide/pyodide-statistics` |
| `__tests__/bugfix/nonparametric-routing.test.ts` | 39 | import | `@/lib/services/pyodide-statistics` | `@/lib/services/pyodide/pyodide-statistics` |
| `__tests__/services/ancova-worker2-simulation.test.ts` | 14 | import (type) | `@/lib/services/pyodide-statistics` | `@/lib/services/pyodide/pyodide-statistics` |
| `__tests__/services/ancova-worker2-simulation.test.ts` | 34 | vi.mock | `@/lib/services/pyodide-statistics` | `@/lib/services/pyodide/pyodide-statistics` |

### pyodide-statistics 외부 참조 — 상대 경로 (executors/)

| 파일 | 줄 | FROM | TO |
|------|-----|------|-----|
| `lib/services/executors/advanced-executor.ts` | 3 | `../pyodide-statistics` | `../pyodide/pyodide-statistics` |
| `lib/services/executors/anova-executor.ts` | 3 | `../pyodide-statistics` | `../pyodide/pyodide-statistics` |
| `lib/services/executors/base-executor.ts` | 1 | `../pyodide-statistics` | `../pyodide/pyodide-statistics` |
| `lib/services/executors/correlation-executor.ts` | 3 | `../pyodide-statistics` | `../pyodide/pyodide-statistics` |
| `lib/services/executors/descriptive-executor.ts` | 3 | `../pyodide-statistics` | `../pyodide/pyodide-statistics` |
| `lib/services/executors/nonparametric-executor.ts` | 3 | `../pyodide-statistics` | `../pyodide/pyodide-statistics` |
| `lib/services/executors/regression-executor.ts` | 3 | `../pyodide-statistics` | `../pyodide/pyodide-statistics` |
| `lib/services/executors/t-test-executor.ts` | 3 | `../pyodide-statistics` | `../pyodide/pyodide-statistics` |

### pyodide-statistics 외부 참조 — 상대 경로 (services root)

| 파일 | 줄 | FROM | TO |
|------|-----|------|-----|
| `lib/services/statistical-executor.ts` | 6 | `./pyodide-statistics` | `./pyodide/pyodide-statistics` |

### pyodide-helper 외부 참조

| 파일 | 줄 | FROM | TO |
|------|-----|------|-----|
| `components/providers/PyodideProvider.tsx` | 5 | `@/lib/services/pyodide-helper` | `@/lib/services/pyodide/pyodide-helper` |
| `lib/stores/analysis-cache-store.ts` | 4 | `@/lib/services/pyodide-helper` | `@/lib/services/pyodide/pyodide-helper` |

### 비코드 참조 (변경 불필요)
- `scripts/archive/test-helper-refactoring.ts:16` — 아카이브 스크립트

**Files:**
- Move: 3개 pyodide 파일 → `stats/lib/services/pyodide/`
- Modify: 위 테이블의 모든 파일

- [ ] **Step 1: 파일 이동**

```bash
cd d:/Projects/BioHub/stats
mv lib/services/pyodide-helper.ts lib/services/pyodide/
mv lib/services/pyodide-statistics.ts lib/services/pyodide/
mv lib/services/pyodide-statistics.adapters.ts lib/services/pyodide/
```

- [ ] **Step 2: 모든 외부 import 경로 일괄 수정**

위 테이블의 모든 FROM→TO를 적용.

**핵심 패턴:**
- 절대 경로: `@/lib/services/pyodide-statistics` → `@/lib/services/pyodide/pyodide-statistics`
- 절대 경로: `@/lib/services/pyodide-helper` → `@/lib/services/pyodide/pyodide-helper`
- 상대 경로 (executors): `../pyodide-statistics` → `../pyodide/pyodide-statistics`
- 상대 경로 (services root): `./pyodide-statistics` → `./pyodide/pyodide-statistics`
- vi.mock/vi.doMock/vi.unmock/jest.mock: import과 동일 패턴
- dynamic import: import과 동일 패턴

- [ ] **Step 3: 누락 확인**

```bash
cd d:/Projects/BioHub/stats
grep -rn "from.*['\"].*lib/services/pyodide-statistics" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v .next | grep -v "services/pyodide/"
grep -rn "mock.*['\"].*lib/services/pyodide-statistics" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v .next | grep -v "services/pyodide/"
grep -rn "from.*['\"].*lib/services/pyodide-helper" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v .next | grep -v "services/pyodide/"
grep -rn "import.*['\"].*lib/services/pyodide-statistics" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v .next | grep -v "services/pyodide/"
```

Expected: 0 matches. 결과가 있으면 추가 수정.

- [ ] **Step 4: 검증**

```bash
cd d:/Projects/BioHub/stats
pnpm tsc --noEmit && pnpm test --run
```

Expected: 타입 에러 없음, 테스트 전체 통과

- [ ] **Step 5: 커밋**

```bash
cd d:/Projects/BioHub
git add -u && git add stats/lib/services/pyodide/
git commit -m "$(cat <<'EOF'
refactor: consolidate pyodide files into lib/services/pyodide/

Move pyodide-helper, pyodide-statistics, and pyodide-statistics.adapters
from lib/services/ root into the existing pyodide/ subdirectory.
All import paths, vi.mock/doMock/unmock, jest.mock, and dynamic imports
updated across ~40 files.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: 최종 정리 및 검증

- [ ] **Step 1: lib/services/ 루트 파일 수 확인**

```bash
ls -1 d:/Projects/BioHub/stats/lib/services/*.ts | wc -l
```

Expected: 기존 27개 → 18개 (recommender 6개 + pyodide 3개 이동)

- [ ] **Step 2: 전체 빌드 검증**

```bash
cd d:/Projects/BioHub/stats
pnpm tsc --noEmit && pnpm test --run && pnpm build
```

Expected: 타입 에러 없음, 테스트 전체 통과, 빌드 성공

- [ ] **Step 3: git status 확인**

누락된 변경사항이 있으면 추가 커밋.
