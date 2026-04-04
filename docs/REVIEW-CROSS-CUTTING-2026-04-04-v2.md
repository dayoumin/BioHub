# Architecture Health Check — 2026-04-04 (v2)

이전 리뷰(`REVIEW-CROSS-CUTTING-2026-04-04.md`) 대비 전체 5축 시스템 진단.

---

## 프로젝트 맵

| 항목 | 값 |
|------|-----|
| 구조 | pnpm monorepo (`packages/types`, `packages/db`, `stats/` Next.js 15 앱, `src/` CF Workers) |
| 도메인 | Analysis, Bio-Tools, Genetics, Graph Studio, Literature/Papers, Projects/Research |
| 상태 관리 | Zustand 8개 스토어 + React Context 4개 |
| 저장소 | localStorage 23키 + IndexedDB 8스토어 (2 DB) |
| 테스트 | Vitest (unit/integration) + Playwright (E2E), 총 ~250+ |
| 차트 | ECharts (67파일) + Plotly (9파일) 이중 |

---

## Findings

### 우선도: 높음

| # | 체크 | 발견 | 위치 | 영향 |
|---|------|------|------|------|
| 1 | 경계 | **순환 참조 3건 확인**: research ↔ bio-tools, research ↔ genetics, research ↔ graph-studio | `lib/research/entity-loader.ts` ↔ 각 도메인 `*-history.ts` / `project-storage.ts` | 번들러 tree-shaking 실패, 리팩터링 시 연쇄 파괴 |
| 2 | 타입 | **`Record<string, unknown>` 421건** — Worker 결과, 데이터 처리, 차트 유틸 전역 산재 | `lib/services/pyodide/`, `lib/interpretation/engine.ts`, `hooks/use-statistics-worker.ts` | 런타임 타입 가드 140회 반복, 버그 잠재 |
| 3 | 타입 | **Worker 메시지 런타임 검증 없음** — `onmessage` 핸들러가 `WorkerRequest` 인터페이스만 의존 | `lib/services/pyodide/core/pyodide-worker.ts:204-235` | 잘못된 메시지에 대한 방어 없음 |
| 4 | 중복 | **StatisticalExecutor 3,125줄** — sub-executor 패턴과 공존하나 메인 파일 비대 | `lib/services/statistical-executor.ts` | 유지보수 비용 급증, 분할 시급 |
| 5 | 경계 | **Barrel export 6/21 도메인만 보유** — 나머지 15개 도메인은 내부 파일 직접 import 허용 | `lib/bio-tools/`, `lib/genetics/`, `lib/research/`, `lib/services/` 등 | 리팩터링 시 import 경로 추적 불가 |

### 우선도: 중간

| # | 체크 | 발견 | 위치 | 영향 |
|---|------|------|------|------|
| 6 | 타입 | **`any` 104건** (프로덕션 코드) — Pyodide/Plotly 통합부 집중 | `lib/pyodide-plotly-visualizations.ts` (10), `lib/statistics/data-type-detector.ts` (7) | CLAUDE.md `any` 금지 규칙 위반 |
| 7 | 타입 | **브랜드 ID 타입 0건** — 모든 ID가 plain `string` | `types/analysis.ts`, `lib/research/project-storage.ts` | 파라미터 순서 실수 컴파일 타임에 못 잡음 |
| 8 | 테스트 | **Bio-Tools 테스트 15%** (27 소스 → 4 테스트) | `components/bio-tools/`, `lib/bio-tools/` | BLAST/BOLD 등 핵심 도구 미테스트 |
| 9 | 테스트 | **Recommender 6파일 0테스트** — AI 방법 추천 엔진 완전 미테스트 | `lib/services/recommenders/` | 핵심 기능이 회귀 테스트 없음 |
| 10 | 테스트 | **Providers 4파일 0테스트** — 앱 초기화 경로 | `components/providers/` (Pyodide, ServiceWorker 등) | 초기화 실패 시 감지 불가 |
| 11 | 저장소 | **localStorage 키 네이밍 불일치** — `statPlatform_*`, `biohub:*`, prefix 없음 혼재 | 23개 키 분산 | 네임스페이스 충돌 위험 |
| 12 | 저장소 | **단일 IndexedDB에 5도메인 혼합** — `analysis-history` DB에 analyses + chart-snapshots + citations + blueprints | `lib/services/indexeddb-adapter.ts` | 마이그레이션 시 전 도메인 영향 |
| 13 | 저장소 | **Graph Studio 프로젝트 삭제 시 ProjectEntityRef 미정리** | `lib/graph-studio/project-storage.ts` `deleteProject()` | figure entity orphan 발생 |
| 14 | 중복 | **ECharts vs Plotly 이중 유지** — 67 vs 9 파일, 목적 분리 있으나 전략 미명시 | 프로젝트 전체 | 번들 2MB+ 이중 로드 |
| 15 | 중복 | **Design Token 레거시 4파일 잔존** — `@deprecated`이나 코드 존재 | `lib/constants/ui-constants.ts`, `components/*/styles.ts` 3개 | 혼란, 정리 필요 |

### 우선도: 낮음

| # | 체크 | 발견 | 위치 | 영향 |
|---|------|------|------|------|
| 16 | 경계 | ESLint/Biome boundary 규칙 없음 — 도메인 경계 강제 도구 0개 | `stats/eslint.config.mjs` | 우연에 의존하는 분리 |
| 17 | 중복 | **DataValidationStep 데드 코드** — `@deprecated`, 실제 사용 0, 테스트만 존재 | `components/analysis/steps/DataValidationStep.tsx` | 삭제 가능 |
| 18 | 중복 | **Pyodide wrapper 9개 `@deprecated`** — 직접 `callWorkerMethod` 마이그레이션 진행 중 | `lib/services/pyodide/pyodide-statistics.ts` | 정상 진행, 정리 시기 판단 필요 |
| 19 | 중복 | **TODO 8개** (HACK/FIXME 0) — 그 중 `anova-helpers.ts:591` "전체 구현 필요" 1건 중요 | `lib/statistics/anova-helpers.ts` | 기능 미완성 |
| 20 | 테스트 | 역전된 테스트 피라미드 — integration 44% vs unit 10% | 전체 | 개별 로직 검증 부족 |

---

## 이전 체크(v1) 대비

| v1 항목 | v2 상태 | 변화 |
|---------|---------|------|
| §1 Worker 결과 타입 경계 (높음) | **변화 없음** — 421건 `Record<string, unknown>`, 14개 메서드 untyped 그대로 | 미착수 |
| §2 Sub-executor 아키텍처 (높음) | **변화 없음** — StatisticalExecutor 3,125줄, executor/ 부분 채택 유지 | 미착수 |
| §3 이력 저장소 파편화 (중간) | **변화 없음** — 4개 독립 이력 시스템 유지. 추가 발견: Graph Studio cascading 삭제 누락 | 미착수 + 신규 발견 |
| §4 테스트 커버리지 불균형 (중간) | **변화 없음** — Graph Studio 컴포넌트 테스트 0, 추가 발견: Bio-Tools 15%, Recommender 0% | 미착수 + 범위 확대 |
| §5 Genetics entity resolver (중간) | 미확인 (이번 체크 범위 외) | — |
| §6 common/ 카탈로그 감사 (낮음) | 미확인 | — |
| 구조적 확장성 8원칙 | **도메인 경계** 문제 구체화: 순환 참조 3건 확인, barrel 6/21만 | 상세화 |

**종합:** v1 6개 항목 중 착수된 것 0건. v2에서 5축 체계적 탐색으로 15개 추가 발견.

---

## 권장 조치 (우선순위)

### 1. 순환 참조 해소 + barrel export 확립 (높음, 4h)

**왜:** 3개 순환 참조(research ↔ bio-tools/genetics/graph-studio)는 번들 tree-shaking 실패와 리팩터링 연쇄 파괴의 직접 원인.

**방법:**
- `lib/research/entity-loader.ts`의 도메인별 history import를 **동적 import** 또는 **adapter 인터페이스**로 전환
- 각 도메인에 `index.ts` barrel 생성 (최소 bio-tools, genetics, research, services)
- 내부 파일 직접 import → barrel 경유로 전환

### 2. Worker 결과 타입 계약 (높음, 3h)

**왜:** 421건 `Record<string, unknown>`이 140회 반복 타입 가드의 근본 원인. v1에서도 1순위였으나 미착수.

**방법:**
- 주요 10개 wrapper에 `Generated.*Result` 타입 정의 (v1 §1 조치 그대로)
- Worker `onmessage`에 zod 검증 추가 (최소 `params` 스키마)
- `callWorkerMethod<T>` 제네릭 활용 강화

### 3. StatisticalExecutor 분할 (높음, 4h)

**왜:** 3,125줄 단일 파일 = 모든 통계 라우팅 병목. v1 §2 A안(sub-executor 전면 활성화) 재권장.

**방법:**
- `CorrelationExecutor` 패턴을 나머지 카테고리에 확장
- `StatisticalExecutor` → thin dispatcher (~300줄) + 카테고리별 executor

### 4. 테스트 갭 해소 — Bio-Tools + Recommender (중간, 6h)

**왜:** Bio-Tools 15% 커버리지, Recommender 0% — 핵심 기능이 회귀 테스트 없음.

**방법:**
- Bio-Tools: BLAST/BOLD E2E 워크플로우 테스트 2개
- Recommender: decision-tree-recommender unit 테스트 (순수 로직)
- Providers: PyodideProvider 초기화 테스트

### 5. 저장소 정리 — cascading 삭제 + 키 표준화 (중간, 2h)

**왜:** Graph Studio 삭제 시 orphan 발생 (figure entity ref 미정리). localStorage 키 23개가 3가지 네이밍 규칙 혼재.

**방법:**
- `graph-studio/project-storage.ts` `deleteProject()` → `removeProjectEntityRefsByEntityIds('figure', ...)` 추가
- localStorage 키 중앙 상수 정의 (`lib/constants/storage-keys.ts`)

### 6. 레거시 정리 (낮음, 1h)

- DataValidationStep + 테스트 2개 삭제
- Design Token 레거시 4파일 삭제 (import 전환 확인 후)
- `COMMON_ROLES` 상수 삭제

---

## 수치 요약

| 지표 | 값 | 판정 |
|------|-----|------|
| Barrel export 비율 | 6/21 (29%) | 위험 |
| 순환 참조 | 3건 | 위험 |
| `any` 사용 | 104건 | 주의 |
| `Record<string, unknown>` | 421건 | 위험 |
| 런타임 검증 (zod) | 2곳 | 위험 |
| 반복 타입 가드 | ~140건 | 주의 |
| 브랜드 ID | 0건 | 주의 |
| 1000줄+ 파일 | 14개 | 주의 |
| TODO/FIXME | 8/0 | 양호 |
| 테스트 커버리지 (전체) | ~40% | 주의 |
| Bio-Tools 테스트 | 15% | 위험 |
| Recommender 테스트 | 0% | 위험 |
| localStorage 키 수 | 23 | — |
| IndexedDB 스토어 수 | 8 (2 DB) | — |
| Zustand 스토어 수 | 8 | — |
