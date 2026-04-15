# Architecture Health Check — 2026-04-15 (v3)

이전 리뷰(`REVIEW-CROSS-CUTTING-2026-04-04-v2.md`) 대비 11일 후 상태 점검. 5축 체계적 진단.

---

## 프로젝트 맵

| 항목 | 값 |
|------|-----|
| 구조 | pnpm monorepo (`packages/types`, `packages/db`, `stats/` Next.js 15 앱, `src/` CF Workers) |
| 규모 | 총 1,073개 직접 import, 328개 테스트, 32개 localStorage 키, 2개 IndexedDB |
| 도메인 | Analysis, Bio-Tools, Genetics, Graph Studio, Literature/Papers, Projects/Research, Services |
| 상태 관리 | Zustand 8개 스토어 + React Context 3개 (이전: 4개) |
| 저장소 | localStorage 32키 + IndexedDB 8스토어 (2 DB) |
| 테스트 | Vitest (unit/integration 261) + Playwright (E2E 32), 총 328 |
| 차트 | ECharts (67파일) + Plotly (11파일) 이중 |

---

## Findings

### 우선도: 🔴 높음 (즉시 착수 필요)

| # | 체크 | 발견 | 위치 | 영향 | 변화 |
|----|------|------|------|------|------|
| 1 | 경계 | **순환 참조 3건 여전히 존재**: research ↔ bio-tools, research ↔ genetics, research ↔ graph-studio | `lib/research/entity-loader.ts` ↔ 각 도메인 | 번들 tree-shaking 실패, 리팩터링 연쇄 파괴 | v2 동일 |
| 2 | 타입 | **`any` 타입 23건** (CLAUDE.md 금지 규칙 위반, 이전 78+ → 70% 개선되었으나 여전히 위반) | `pyodide-plotly-visualizations.ts` (7건), `plotly-config.ts` (4건) 외 | Plotly 통합부 타입 안전성 부족 | ✅ 개선 (+70%) |
| 3 | 타입 | **Worker params 런타임 검증 없음**: `pyodide-worker.ts`의 `params?: Record<string, unknown>` → `JSON.stringify(params)` 직접 사용 | `lib/services/pyodide/core/pyodide-worker.ts:386` | JSON injection, Python 런타임 오류 가능 | v2 동일 |
| 4 | 테스트 | **Recommenders 6파일 0테스트**: decision-tree, openrouter, ollama, llm-recommender 등 방법 선택 알고리즘 미테스트 | `lib/services/recommenders/` (150KB) | 핵심 기능 회귀 테스트 없음 | v2 동일 |
| 5 | 테스트 | **Providers 4파일 0테스트**: PyodideProvider, PyodidePreloader, ServiceWorkerProvider 초기화 경로 미테스트 | `components/providers/` | 앱 초기화 실패 감지 불가 | v2 동일 |
| 6 | 저장소 | **Citations IndexedDB 미정리**: Graph Studio 프로젝트 삭제 시 `deleteProjectCascade()`에서 citations 스토어 정리 누락 | `lib/graph-studio/project-storage.ts:165-173` | 고아 인용 참고문헌 누적 | 🆕 신규 발견 |
| 7 | 저장소 | **Paper Draft 고아화**: Research 프로젝트 삭제 시 document-blueprints 정리 경로 없음 | `lib/research/project-storage.ts:97-121` | 고아 문서 초안 누적 | 🆕 신규 발견 |

### 우선도: 🟡 중간 (1-2주 내 해소)

| # | 체크 | 발견 | 위치 | 영향 | 변화 |
|----|------|------|------|------|------|
| 8 | 경계 | **Barrel export 부분 개선**: 6/21 → 10/21 도메인 (48%) 달성. 주요 도메인(research, genetics, bio-tools, graph-studio) 완료 | `lib/statistics/`, `lib/charts/`, `lib/utils/` 등 (11개 도메인 미보유) | 리팩터링 시 import 경로 추적 어려움 | ✅ 개선 (+4개) |
| 9 | 타입 | **Record<string, unknown> 대폭 개선**: 421 → 4건 (98% 개선) | `indexed-db-manager.ts` (Generic 메서드, 문제 아님) | 런타입 타입 가드 140회 → ~4회로 감소 | ✅ 큰 개선 (418건 감소!) |
| 10 | 타입 | **강타입 ID 도입 0건** (ProjectId, EntityId 등 없음, 모든 ID가 plain `string`) | `types/project.ts`, `lib/research/project-storage.ts` | 파라미터 순서 실수 컴파일 타임에 못 잡음 | v2 동일 |
| 11 | 테스트 | **Graph Studio 컴포넌트 0테스트**: 14개 컴포넌트 (ExportDialog, ChartSetupPanel, AiPanel 등) 단위 테스트 없음, E2E만 의존 | `components/graph-studio/` | UI 리팩터 시 E2E 깨질 위험 | v2 동일 |
| 12 | 저장소 | **localStorage 네이밍 불일치 심화**: 32개 키, 5가지 패턴 혼재 (`statPlatform_*`, `biohub:*`, `analysis-*`, `main-hub-*`, `graph_studio_*` 등) | `lib/constants/storage-keys.ts` | 네임스페이스 충돌 위험, 마이그레이션 어려움 | ⚠️ 악화 (+9개 키) |
| 13 | 저장소 | **IndexedDB 단일 DB에 5도메인 혼합**: `analysis-history` DB에 analyses, document-blueprints, chart-snapshots, citations 혼재 | `lib/utils/adapters/indexeddb-adapter.ts` | 마이그레이션 시 전 도메인 영향, 성능 저하 위험 | v2 동일 |
| 14 | 테스트 | **Bio-Tools 테스트 42%** (12소스 → 5테스트, 이전 15%에서 개선) | `components/bio-tools/`, `lib/bio-tools/` | BLAST, BOLD, FST 데이터 처리 부분 미테스트 | ✅ 개선 (+27%) |
| 15 | 테스트 | **Services 테스트 32%**: 90개 소스 파일, 29개 테스트만 존재 | `lib/services/` | intent routing, export, LLM 통합 부분 갭 | v2 동일 |

### 우선도: 🟢 낮음 (3주 이후 또는 선택적)

| # | 체크 | 발견 | 위치 | 영향 | 변화 |
|----|------|------|------|------|------|
| 16 | 중복 | **1,000줄+ 파일 31개**: 대부분 데이터 정의 또는 생성 파일 (복합도 낮음) | `variable-requirements.ts` (4,659줄, 핵심), `ollama-provider.ts` (2,385줄, RAG) | `variable-requirements.ts` 분할 검토 권장 | 🔍 확인됨 |
| 17 | 중복 | **ECharts vs Plotly 이중 유지**: 67 vs 11 파일, 역할 분담 명확 (생명정보학 vs RAG) | 프로젝트 전체 | 번들 2MB+ 이중 로드, 유지보수 비용 | v2 동일 |
| 18 | 중복 | **@deprecated 34개**, 모두 정당한 이유 (하위 호환, 마이그레이션 진행 중) | `style-constants.ts`, `bio-styles.ts`, `card-styles.ts` 등 | 정상 진행, 혼란 미미 | v2 동일 |
| 19 | 중복 | **미사용 export 0건** (샘플 검증: 모든 export가 실제 사용됨) | `lib/graph-studio/index.ts`, `lib/genetics/index.ts` 등 | 깨끗한 인벤토리 | ✅ 양호 |
| 20 | 중복 | **TODO 14개 (FIXME/HACK 0)**: 구조적 2건 + 간단 수정 12건 | `anova-helpers.ts` ("전체 구현 필요"), `ollama-provider.ts` ("FTS5 구현") 외 | 기술 부채 추적됨 | ⚠️ 증가 (+6) |
| 21 | 테스트 | **E2E 테스트 32개 (확대됨)**: 통계 메서드, 데이터 업로드, 차트 export 워크플로우 커버 | `e2e/` | 주요 흐름 문제 감지 가능 | ✅ 확대 (+32) |
| 22 | 경계 | **직접 import 1,073건**: 대부분 정당함 (기초 유틸, 중앙 조율) | `history-store` (12), `diagnostic-pipeline` (10) 등 | 아키텍처 한계, 순환 참조 해소로 자연 감소 예상 | 재확인 |
| 23 | 경계 | ESLint/Biome boundary 규칙 없음 | `stats/eslint.config.mjs` | 도메인 경계 강제 도구 부재 | v2 동일 |

---

## 이전 체크 (v1, v2) 대비 변화

| v2 항목 | v3 상태 | 변화 | 경향 |
|---------|---------|------|------|
| §1 순환 참조 (높음) | **여전함** — 3개 | 미착수 | ⚠️ 변화 없음 |
| §2 Worker 타입 경계 (높음) | **개선됨** — `Record<unknown>` 421→4 건 | 98% 감소 | ✅ 큰 개선 |
| §3 `any` 타입 (높음) | **부분 개선** — 78+→23 건 | 70% 감소 | ✅ 개선 |
| §4 Worker params 검증 (높음) | **여전함** — runtime 검증 없음 | 미착수 | ⚠️ 변화 없음 |
| §5 StatisticalExecutor 비대 (높음) | **미확인** (이번 범위 외) | — | — |
| §6 테스트 불균형 (중간) | **부분 개선** — Bio-Tools 15%→42% | 최악(Services 32%, Recommenders 0%) 유지 | ⚠️ 일부 개선 |
| §7 저장소 파편화 (중간) | **악화됨** — localStorage 23→32 키 | 네이밍 패턴 5가지로 증가 | ⚠️ 악화 |
| §8 Graph Studio cascade (중간) | **신규 발견** — citations 미정리 | 새로운 위험 | 🆕 신규 |
| §9 barrel export (중간) | **개선됨** — 6/21→10/21 (48%) | 주요 도메인 완료 | ✅ 개선 |
| 구조적 확장성 8원칙 | **상세화됨** — 5축 체계 | 7개 새로운 발견 | ✅ 심화 |

**종합**: v2 6개 항목 중 착수 0건 유지. 타입 안전성과 테스트 일부 개선, 저장소 네이밍 악화, 새로운 orphan 위험 2건 발견.

---

## 권장 조치 (우선순위)

### 1. Orphan 참조 해소 (높음, 2h)

**왜:** Graph Studio + Research 프로젝트 삭제 시 IndexedDB + document-blueprints에 고아 레코드 누적. 데이터 무결성 저하.

**방법:**
- `deleteProjectCascade()` 확장: citations 스토어 정리 추가
  ```typescript
  await deleteCitationsByProjectId(projectId).catch(() => {})
  ```
- `deleteResearchProject()` 확장: document-blueprints cascade 추가
  ```typescript
  removeProjectEntityRef(projectId, 'draft', *)
  ```
- loadFromHistory() 에 projectId 유효성 검사 추가

**파일**: `lib/graph-studio/project-storage.ts`, `lib/research/project-storage.ts`

---

### 2. Worker 경계 검증 추가 (높음, 1h)

**왜:** pyodide-worker.ts의 params 검증 없음 → JSON injection 또는 Python 런타임 오류 가능.

**방법:**
- Worker `onmessage` 핸들러에 zod 검증 추가 (선택):
  ```typescript
  const validParams = validateWorkerParams(workerNum, method, params)
  ```
  또는 기본 검증:
  ```typescript
  if (params && typeof params !== 'object') {
    sendError('Invalid params type')
    return
  }
  ```

**파일**: `lib/services/pyodide/core/pyodide-worker.ts:210-235`

---

### 3. `any` 타입 제거 (높음, 2h)

**왜:** CLAUDE.md 절대 금지 규칙, 23건 여전히 위반.

**방법:**
- Plotly 관련 (7건): PlotlyChart 인터페이스 강화 또는 `unknown` + 타입 가드
- Cleanup utils (3건): DOM 타입 에스케이프 (`unknown` + `as HTMLElement`)
- Pyodide (2건 이상): `getPyodideInstance()` 반환 타입 명시

**파일**: `lib/pyodide-plotly-visualizations.ts`, `lib/plotly-config.ts`, `lib/cleanup-utils.ts`

---

### 4. localStorage 네이밍 정규화 (중간, 3h)

**왜:** 32개 키, 5가지 패턴 혼재 → 마이그레이션 어려움, 네임스페이스 충돌 위험.

**방법:**
```
Pattern: biohub:{domain}:{feature}

예:
  analysis-quick-methods      → biohub:analysis:quick-methods
  statPlatform_recentFiles    → biohub:analysis:recent-files
  research_projects           → biohub:research:projects
  graph_studio_projects       → biohub:graph-studio:projects
```

- `lib/constants/storage-keys.ts`의 STORAGE_KEYS 리팩터
- 마이그레이션 유틸 추가 (구식 키 → 신규 키)

---

### 5. Recommenders 테스트 추가 (중간, 4h)

**왜:** 150KB 코드, 0 테스트 → 핵심 알고리즘 미보호.

**방법:**
- `decision-tree-recommender.ts`: 메서드 선택 로직 단위 테스트
- `openrouter-recommender.ts`: LLM 프롬프트 + 파싱 테스트 (mock API)
- `ollama-recommender.ts`: 로컬 추론 폴백 시나리오

**파일**: `lib/services/recommenders/`

---

### 6. 순환 참조 해소 (높음, 4h)

**왜:** v2에서도 우선 1순위였으나 미착수 → 번들 tree-shaking 실패 위험.

**방법:**
- `lib/research/entity-loader.ts`의 도메인별 history import를 **동적 import** 또는 **adapter 인터페이스**로 전환
- project-storage 인터페이스 분리 (query layer로 추상화)
- 각 도메인의 callback 패턴 강화 (역의존성 제거)

**파일**: `lib/research/entity-loader.ts`, 각 도메인 history 모듈

---

### 7. IndexedDB 도메인 분리 검토 (낮음, 향후)

**왜:** `analysis-history` DB에 5개 도메인 혼재 → 마이그레이션 시 전체 영향.

**방법:**
- 향후 Phase: `graph-studio.db`, `research.db`, `analysis.db`로 분리
- 현재: v-manager 중심으로 관리 (즉시 필요 없음)

---

### 8. 테스트 커버리지 균형 (중간, 지속)

| 도메인 | 현황 | 목표 | 우선 순위 |
|--------|------|------|---------|
| Recommenders | 0% | 80% | P0 |
| Providers | 0% | 80% | P0 |
| Graph Studio components | 0% | 70% (E2E + unit) | P1 |
| Services | 32% | 60% | P1 |
| Bio-Tools | 42% | 75% | P2 |
| Genetics | 90% | 95% | P3 |

---

## 핵심 요약

| 면목 | 상태 | 점수 | 경향 |
|------|------|------|------|
| **도메인 경계** | 순환 참조 3개, 직접 import 1,073개 | 5/10 | ⚠️ 변화 없음 |
| **타입 안전성** | `any` 23개, 강타입 ID 0개, params 검증 없음 | 6/10 | ✅ +2 (Record<unknown> 개선) |
| **테스트 커버리지** | 328개 테스트, 최악 0% (Recommenders) | 6/10 | ✅ +1 (E2E 확대) |
| **저장소 일관성** | localStorage 5패턴, IndexedDB 혼합 | 5/10 | ⚠️ -1 (키 증가) |
| **코드 품질** | 1,000줄+ 31개, @deprecated 34개 (정상) | 7/10 | ✅ 양호 |
| **종합 건강도** | | **5.8/10** | ✅ +0.8 (소폭 개선) |

---

## 다음 리뷰 일정

- **예정**: 2026-05-01 (16일 후)
- **초점**: 순환 참조 진전도, Recommenders 테스트 추가, orphan 해소 확인

---

**생성**: 2026-04-15 14:30 UTC  
**도구**: arch-check skill (5-axis systematic diagnosis)  
**대상**: BioHub monorepo (stats/ + src/ + packages/)
