# method-mapping.ts 통합 삭제 — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** `method-mapping.ts` (legacy SSOT)를 삭제하고 `statistical-methods.ts` (canonical)를 유일한 메서드 정의 소스로 만든다.

**Architecture:** method-mapping.ts의 58개 메서드 배열을 canonical Record 기반으로 완전 대체. 브라우즈 UI는 canonical의 page-level 메서드만 노출하고, embedded variant는 부모 페이지 내부 옵션으로 취급한다. 삭제 대상 파일의 런타임 사용 함수(`checkMethodRequirements`, `QUESTION_TYPES`, `recommendMethods`, `getMethodsByQuestionType`)는 소비 컴포넌트가 전부 dead code이므로 보존 없이 함께 삭제한다.

---

## 1. Problem Statement

두 파일이 통계 메서드를 이중 정의하고 있다:

| | method-mapping.ts (legacy) | statistical-methods.ts (canonical) |
|---|---|---|
| 구조 | `StatisticalMethod[]` (flat array, 58개) | `Record<string, StatisticalMethodWithAliases>` (52개) |
| ID 체계 | leaf ID (`descriptive-stats`, `two-sample-t`, `one-way-anova`) | 통합 ID (`descriptive`, `t-test`, `anova`) |
| 기능 | 추천/필터 함수 포함 (dead code) | aliases, hasOwnPage, parentPageId, koreanName 포함 |
| 소비자 | 23개 (대부분 type-only import) | 27개 (intent-router, handler 등 핵심 경로) |
| 위치 | `stats/lib/statistics/method-mapping.ts` | `stats/lib/constants/statistical-methods.ts` |

canonical이 이미 시스템의 실질적 SSOT (intent-router, handler dispatch, variable-requirements 모두 canonical ID 기반). legacy는 브라우즈 카탈로그(`method-catalog.ts`)와 type re-export 용도로만 남아 있다.

## 2. Architecture Decisions

### 2.1 브라우즈 UI 메서드 단위: canonical 통합형

브라우즈 목록은 "사용자가 진입하는 page-level entry point"를 보여줘야 한다. canonical이 이미 그 역할(`hasOwnPage` 필드)을 담당하므로 브라우즈도 canonical 기준으로 통일한다.

- **top-level** (`hasOwnPage !== false`): 브라우즈 카드로 노출
- **embedded** (`hasOwnPage: false, parentPageId` 있음): 브라우즈에서 숨김, 부모 페이지 내부에서 선택
- **category overview** (`hasOwnPage: false, parentPageId` 없음): 브라우즈에서 숨김

### 2.2 Post-hoc 메서드: canonical에 추가하지 않음

`tukey-hsd`, `games-howell`, `bonferroni`, `dunn-test`는 독립 메서드가 아니라 ANOVA 내부 옵션이다. canonical에 추가하면 intent-router가 매칭 → `getMethodRequirements()` null → UI 깨짐. 현재 아키텍처에서 이들은 `handle-anova.ts`의 내부 분기로만 사용된다.

### 2.3 Dead code: 보존 없이 삭제

method-mapping.ts의 런타임 함수들:
- `checkMethodRequirements()` → 소비자: `RecommendedMethods.tsx` (dead component, 미렌더링)
- `QUESTION_TYPES` → 소비자: `RecommendedMethods.tsx` (dead component)
- `recommendMethods()` → 소비자: `RecommendedMethods.tsx` (dead component)
- `getMethodsByQuestionType()` → 소비자: 테스트만

이 함수들은 production 경로에서 실행되지 않으므로 분리 보존 없이 삭제한다. 필요 시 git history에서 복원 가능.

## 3. ID Mapping Reference

method-catalog.ts `getPopularMethods()`에서 교체해야 하는 ID:

| legacy ID (현재) | canonical ID (교체 후) | 비고 |
|---|---|---|
| `descriptive-stats` | `descriptive` | name: 기술통계 |
| `two-sample-t` | `t-test` | name: 독립표본 T-검정 |
| `one-way-anova` | `anova` | name: 일원분산분석 |
| `simple-regression` | `regression` | name: 선형 회귀분석 |
| `mann-whitney` | `mann-whitney` | 일치 (변경 불필요) |
| `correlation` | `correlation` | 일치 (변경 불필요) |
| `chi-square` | ~~chi-square~~ | `hasOwnPage: false` → popular에서 제거, 대체 필요 |

`chi-square`는 canonical에서 `hasOwnPage: false` (카테고리 개요)이므로 popular 목록에서 제거하고, `chi-square-independence` 또는 다른 top-level 메서드로 교체해야 한다. 구현 시 canonical의 chi-square 카테고리 메서드를 확인하여 적절한 대체 ID를 선택할 것.

## 4. hasOwnPage: false Entries in Canonical

현재 canonical의 embedded 메서드 5개:

| ID | parentPageId | 브라우즈 노출 | intent-router 매칭 |
|---|---|---|---|
| `paired-t` | `t-test` | 숨김 | O (부모로 라우팅) |
| `welch-anova` | `anova` | 숨김 | O (부모로 라우팅) |
| `logistic-regression` | `regression` | 숨김 | O (부모로 라우팅) |
| `non-parametric` | (없음) | 숨김 | X (스킵) |
| `chi-square` | (없음) | 숨김 | X (스킵) |

intent-router 필터 로직 (`intent-router.ts:25-26`):
```typescript
if (method.hasOwnPage === false && !method.parentPageId) continue
```

method-catalog.ts 필터도 동일 로직 적용:
```typescript
Object.values(STATISTICAL_METHODS).filter(m => m.hasOwnPage !== false || !!m.parentPageId)
```

## 5. Scope — 6 Steps + 1 Follow-up

### Step 1: method-catalog.ts → canonical 전환

**Files:**
- Modify: `stats/lib/statistics/method-catalog.ts`
- Reference: `stats/lib/constants/statistical-methods.ts`

**Changes:**
- import 소스 변경: `./method-mapping` → `@/lib/constants/statistical-methods`
- `METHODS` 배열 구성: `Object.values(STATISTICAL_METHODS).filter(m => m.hasOwnPage !== false || !!m.parentPageId)`
- `getPopularMethods()` ID 교체 (위 mapping table 참조)
- `chi-square` popular 대체 ID 결정 필요
- `StatisticalMethod` type import: `@/types/analysis`에서 가져오기 (canonical의 `StatisticalMethodWithAliases`가 `StatisticalMethod`를 extend하므로 호환)
- `searchMethods()`: canonical에는 `koreanName`, `koreanDescription` 필드가 추가로 있으므로 검색 범위 확장 고려 (optional)
- category 문자열은 양쪽 호환 (추가 매핑 불필요)

**Consumers (영향 확인):**
- `stats/components/analysis/steps/PurposeInputStep.tsx` — `getMethodsGroupedByCategory`, `getAllMethodsGrouped` 사용. API 변경 없음.
- `stats/components/analysis/steps/purpose/PurposeBrowseSection.tsx` — `MethodGroup` type만 import. 변경 없음.

**Verification:** `pnpm tsc --noEmit` green. PurposeInputStep 브라우즈에서 메서드 목록이 canonical 기준으로 표시되는지 수동 확인.

### Step 2: StatisticalMethod type import 14곳 → @/types/analysis

**Files (14개):**
```
stats/lib/services/handlers/handle-anova.ts
stats/lib/services/handlers/handle-chi-square.ts
stats/lib/services/handlers/handle-correlation.ts
stats/lib/services/handlers/handle-descriptive.ts
stats/lib/services/handlers/handle-design.ts
stats/lib/services/handlers/handle-multivariate.ts
stats/lib/services/handlers/handle-nonparametric.ts
stats/lib/services/handlers/handle-regression.ts
stats/lib/services/handlers/handle-reliability.ts
stats/lib/services/handlers/handle-survival.ts
stats/lib/services/handlers/handle-t-test.ts
stats/lib/services/handlers/handle-timeseries.ts
stats/lib/services/statistical-executor.ts
stats/lib/statistics/variable-mapping.ts
```

**Changes:** 각 파일에서:
```typescript
// Before
import type { StatisticalMethod } from '../../statistics/method-mapping'
// After
import type { StatisticalMethod } from '@/types/analysis'
```

**Note:** `StatisticalMethod` type은 이미 `@/types/analysis`에 정의되어 있고, method-mapping.ts는 이를 re-export만 하고 있었다. 경로 변경만으로 충분.

**Verification:** `pnpm tsc --noEmit` green.

### Step 3: two-way-anova canonical 등록

**Files:**
- Modify: `stats/lib/constants/statistical-methods.ts`

**Changes:** `STATISTICAL_METHODS` Record에 추가:
```typescript
'two-way-anova': {
  id: 'two-way-anova',
  name: '이원분산분석',
  description: '두 개의 독립변수(요인)가 종속변수에 미치는 주효과 및 상호작용 효과 검정',
  category: 'anova',
  hasOwnPage: false,
  parentPageId: 'anova',
  aliases: ['two-way-anova', 'factorial-anova', '이원배치'],
  koreanName: '이원분산분석 (Two-Way ANOVA)',
  koreanDescription: '두 요인의 주효과와 상호작용 효과를 동시에 분석합니다',
},
```

**Rationale:** handler(`handle-anova.ts`)와 variable-requirements에 이미 구현되어 있지만 canonical에 등록이 없어 UI에서 도달 불가능했던 기존 gap 수정. embedded method로 등록하여 anova 부모 페이지에서 접근 가능하게 한다.

**Verification:** `pnpm tsc --noEmit` green. intent-router에서 `two-way-anova` 매칭 → anova 페이지로 라우팅 확인.

### Step 4: tukey-hsd executor dead code 제거

**Files:**
- Modify: `stats/lib/services/executors/anova-executor.ts`

**Changes:** `execute()` 메서드의 switch문에서 dead case 제거:
- `case 'tukey': case 'tukey-hsd':` (lines 415-426) — handler 경로에서 도달 불가
- `case 'games-howell':` (lines 427-437) — handler 경로에서 도달 불가

**Rationale:** handler(`handle-anova.ts`)가 post-hoc를 내부적으로 호출하므로 executor의 이 case들은 사용되지 않는다. `executeTukeyHSD()`와 `executeGamesHowell()` 메서드 자체는 유지 — handler가 직접 호출할 가능성 있음 (확인 후 판단).

**Verification:** `pnpm tsc --noEmit` green. `pnpm test` 영향 테스트 확인.

### Step 5: method-mapping.ts + 관련 테스트 삭제

**Files to delete:**
```
stats/lib/statistics/method-mapping.ts                          # legacy SSOT
stats/lib/statistics/__tests__/method-mapping.test.ts           # method-mapping 단위 테스트
stats/__tests__/lib/method-mapping-functions.test.ts            # 함수 테스트
stats/__tests__/lib/method-mapping-coverage.test.ts             # 커버리지 테스트
stats/__tests__/analysis/method-recommendation.test.ts          # recommendMethods 테스트
stats/__tests__/analysis/RecommendationChecklist-logic.test.tsx # checkMethodRequirements 테스트
```

**Files to update (test imports):**
```
stats/__tests__/statistics-pages/survival-timeseries.test.ts    # STATISTICAL_METHODS import → canonical
stats/__tests__/bugfix/nonparametric-routing.test.ts            # STATISTICAL_METHODS import → canonical
```

이 두 테스트는 `STATISTICAL_METHODS` 배열을 import하지만, canonical은 Record이므로 `Object.values()`로 감싸거나 테스트 로직을 Record 기반으로 수정해야 한다.

**Pre-deletion check:** Step 1-4 완료 후, method-mapping.ts를 import하는 파일이 삭제 대상 + 위 2개 테스트만 남아 있는지 grep으로 확인.

**Verification:** `pnpm tsc --noEmit` green. `pnpm test` — 삭제된 테스트 제외 전체 green.

### Step 6: TODO 기록 — games-howell recommender refactoring

**Files:**
- Modify: `TODO.md`

**Content:**
```markdown
- [ ] **games-howell recommender 리팩터링**: `smart-recommender.ts:251`에서 하드코딩된 inline method object 대신, ANOVA 추천 시 post-hoc 옵션을 별도 로직으로 제안하도록 개선. Post-hoc는 독립 메서드가 아닌 ANOVA 내부 옵션 아키텍처 반영.
```

### Follow-up (별도 PR): dead component 삭제

scope에서 분리. method-mapping.ts 삭제로 이미 import가 깨지므로, 이 컴포넌트들도 삭제해야 빌드가 통과한다. **실제로는 Step 5에서 같이 삭제해야 할 수 있음** — Step 5 실행 시 tsc 결과를 보고 판단.

**후보 파일:**
```
stats/components/analysis/steps/purpose/RecommendedMethods.tsx
stats/components/analysis/steps/purpose/MethodSelector.tsx
```

이 컴포넌트들이 method-mapping.ts에서 `QUESTION_TYPES`, `checkMethodRequirements`를 import하므로, method-mapping.ts 삭제 시 컴파일 에러 발생. 두 컴포넌트 모두 production에서 렌더링되지 않으므로(dead code 확인 완료) 함께 삭제해도 안전하다.

## 6. Implementation Strategy

**Approach: Sequential Commits (단일 PR)**

각 step = 1 commit. 매 커밋 후 `tsc --noEmit` green 보장.

```
commit 1: feat: method-catalog.ts → canonical SSOT 전환
commit 2: refactor: StatisticalMethod type import 14곳 경로 변경
commit 3: feat: two-way-anova canonical 등록
commit 4: refactor: anova-executor dead post-hoc cases 제거
commit 5: refactor: method-mapping.ts 삭제 + 관련 테스트 정리
```

## 7. NOT In Scope (명시적 제외)

- Post-hoc 메서드(`tukey-hsd`, `games-howell` 등)를 canonical에 독립 메서드로 추가하지 않음
- Bridge adapter 패턴 (canonical → legacy 배열 변환) 사용하지 않음
- `executeTukeyHSD()`, `executeGamesHowell()` 메서드 본체 삭제 — switch case만 제거
- method-mapping.ts의 `DataProfile` interface 별도 보존 — 사용처 없음 확인 필요 (구현 시 grep)
- 레거시 `/statistics/*` 43개 페이지 수정 — 별도 scope

## 8. Risks

| Risk | Mitigation |
|---|---|
| chi-square popular 대체 ID 선택이 UX에 영향 | 구현 시 canonical chi-square 카테고리 메서드 목록 확인 후 결정 |
| Step 5에서 예상 외 import 발견 | 삭제 전 grep 필수, 발견 시 Step 2와 동일하게 리다이렉트 |
| dead component 삭제가 Step 5에 강제 병합될 수 있음 | tsc 결과 보고 판단 — RecommendedMethods/MethodSelector가 method-mapping import하면 같이 삭제 |
| `StatisticalMethodWithAliases`와 `StatisticalMethod` 호환성 | extends 관계이므로 하위 호환. method-catalog에서 `StatisticalMethod[]`로 cast 필요할 수 있음 |

## 9. Verification Checklist

- [ ] `pnpm tsc --noEmit` — 0 errors
- [ ] `pnpm test` — 삭제된 테스트 외 전체 green
- [ ] `grep -r "method-mapping" stats/` — 결과 0건 (테스트 포함)
- [ ] PurposeInputStep 브라우즈에서 canonical 메서드 목록 정상 표시
- [ ] intent-router에서 `two-way-anova` → anova 페이지 라우팅 확인
- [ ] `getPopularMethods()` 반환 메서드 전부 `hasOwnPage !== false` 확인
