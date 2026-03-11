# Graph Studio G5.0 구현 완료 — 외부 리뷰 요청

## 리뷰 대상

1. **계획 문서**: `stats/docs/graph-studio/GRAPH_STUDIO_UI_REDESIGN_PLAN.md` (11개 섹션, ~660줄)
2. **G5.0 구현 코드**: 아래 "변경 파일 목록" 참조

## 프로젝트 배경

**Graph Studio** = ECharts 기반 학술 차트 편집기 (Next.js 15 + TypeScript + Zustand + shadcn/ui)

**2패널** 레이아웃(ChartPreview + SidePanel)을 **3패널**(LeftDataPanel + ChartPreview + RightPropertyPanel)로 전환 완료. GraphPad Prism 수준 편집 UX를 목표로 함.

## 기술 스택 제약

- **ECharts 6** + echarts-for-react (차트 렌더링)
- **Zustand** store (`create()` — persist middleware 미사용, `project-storage.ts`가 localStorage에 직렬화/복원)
- **Zod `.strict()`** 스키마 검증 — 필드 하나 추가 시 **6곳** 동시 수정 필수:
  1. `types/graph-studio.ts` (타입)
  2. `chart-spec-schema.ts` (Zod 스키마)
  3. `ai-service.ts` (AI 프롬프트)
  4. `project-storage.ts` (`loadProject` 복원 경로)
  5. `graph-studio-store.ts` `setProject` (프로젝트 복원 시 정규화)
  6. 테스트 (위 5곳 커버)
- **`e2e/selectors.ts`** 규약: 기존 `data-testid` 삭제/변경 절대 금지
- **ChartType**: 12종 — `CHART_TYPE_HINTS`에 모두 정의
- Pyodide Worker로 통계 계산

## G5.0 구현 요약

### 완료된 변경

| 파일 | 변경 |
|------|------|
| `app/graph-studio/page.tsx` | 3패널 레이아웃 전환, 좌/우 개별 토글, AI dock 분기 제거 |
| `components/graph-studio/SidePanel.tsx` | **삭제** |
| `components/graph-studio/LeftDataPanel.tsx` | **신규** — 데이터 소스 요약 + 변수 목록 (placeholder) |
| `components/graph-studio/RightPropertyPanel.tsx` | **신규** — DataTab/StyleTab 래퍼 + alias testid |
| `components/graph-studio/AiPanel.tsx` | 도킹 버튼 전체 제거, bottom 전용 레이아웃 |
| `components/graph-studio/GraphStudioHeader.tsx` | `onToggleSidePanel` → `onToggleLeftPanel` + `onToggleRightPanel` 분리 |
| `types/graph-studio.ts` | `AiPanelDock = 'bottom'` 단일값, `sidePanel` 필드 제거 |
| `lib/stores/graph-studio-store.ts` | `sidePanel` 초기값 + `setSidePanel` 액션 제거 |
| `e2e/selectors.ts` | 3개 신규 testid 추가 (기존 항목 수정 없음) |
| `__tests__/lib/graph-studio/graph-studio-store.test.ts` | sidePanel 테스트 → 제거 확인 테스트로 전환 |

### 핵심 설계 결정 (구현에 반영됨)

1. **G5A/G5B 분리**: G5A(레이아웃/UI만) = G4와 병렬 가능, G5B(스키마 변경) = G4 완료 후
2. **RightPropertyPanel**: 기존 DataTab/StyleTab import 래퍼 (아코디언 재구성은 G5.2)
3. **AI 패널**: `bottom` 전용 — `AiPanelDock = 'bottom'` 단일값 (향후 오버레이/드로어 확장)
4. **testid 계약**:
   - `graph-studio-side-panel` → RightPropertyPanel 외부 div에 alias 유지
   - `graph-studio-tab-data/style` → RightPropertyPanel 내부 TabsTrigger에 유지
   - `graph-studio-side-toggle` → 우측 패널 토글 버튼에 유지 (기존 E2E 호환)
   - `graph-studio-left-toggle` → 좌측 패널 토글 (신규)
   - `graph-studio-left-panel`, `graph-studio-right-panel` → 신규 testid
5. **패널 크기**: 좌측 w-64(256px), 우측 w-80(320px), 토글로 접기/펼치기 (리사이즈 없음)
6. **탭 상태 로컬화**: `sidePanel` store 상태 제거 → RightPropertyPanel 내부 `useState`로 전환

### 검증 결과

- `tsc --noEmit`: Graph Studio 관련 타입 에러 0건
- `pnpm test __tests__/lib/graph-studio/`: **10파일, 317테스트 전부 통과**

## 리뷰 관점

### 1. 구현 품질

- RightPropertyPanel의 중첩 div 구조 (`graph-studio-side-panel` > `graph-studio-right-panel`)가 적절한가? 단일 div에 두 testid를 부착하는 것이 나은가?
- LeftDataPanel의 `Object.values(dataPackage.data)[0]?.length` 행 수 계산이 안전한가? 빈 데이터 엣지 케이스는?
- AiPanel에서 `setAiPanelDock` 액션이 store에 잔류하지만 UI에서 호출하는 곳이 없음 — 제거할지 유지할지?
- page.tsx에서 `aiPanelDock` 구독을 제거했지만 store initialState에 남아있음 — 정합성 문제 여부?

### 2. E2E 호환성

- `graph-studio-side-panel` testid가 RightPropertyPanel 외부 div에 있으면 기존 E2E의 가시성 체크(`toBeVisible/not.toBeVisible`)가 정확히 동작하는가?
- `graph-studio-side-toggle` 클릭 시 이전에는 `isSidePanelOpen` → 이후에는 `isRightPanelOpen`으로 상태명이 바뀌었으나 동작은 동일 — 확인 필요
- 좌측 패널 토글 버튼이 새로 추가됨 → 기존 E2E에서 헤더 버튼 순서에 의존하는 셀렉터가 있는지?

### 3. UX 리스크

- 좌측 256px + 우측 320px = 576px → 1280px 이하 화면에서 캔버스가 704px 이하로 좁아짐
- LeftDataPanel이 현재 placeholder인데, editor 모드에서 데이터 정보가 없으면 빈 패널이 보임 — 기본 닫힘이 더 나은가?
- AI 패널 높이 220px 고정 — 3패널 + AI 동시 표시 시 세로 공간 부족 가능

### 4. 계획 대비 구현 차이

- 계획 §3 G5.0 구현 순서(1~7)와 실제 구현 순서가 일치하는지
- store `setProject`에서 `aiPanelDock: 'bottom'` 폴백이 구현되어 있는지 (구버전 localStorage 대응)
- `dataSourceId` 타이포 수정이 계획에 없던 변경 — 영향 범위 검증 필요

### 5. 누락된 고려사항

- 접근성(a11y): 좌/우 패널 토글 `aria-label`, 키보드 탐색
- 성능: 3패널 동시 마운트 시 DataTab/StyleTab의 867+480줄 컴포넌트 리렌더 범위
- LeftDataPanel에서 `dataPackage` 전체를 구독 → 대량 데이터 시 불필요한 리렌더 가능성
- `overflow-y-auto` 추가 여부 확인 (LeftDataPanel에 변수 많을 때)

## 리뷰 이력

| 라운드 | 발견 이슈 | 주요 내용 |
|--------|----------|----------|
| R1 | 14개 | 누락 파일, 오타, 알고리즘 버그 (ordinal 타입 누락), 아이콘 크기 불일치 |
| R2 | 4개 | right 도킹 제거 스코프 부족, "UI only" 결론 모순, DataUploadPanel 재사용 불가, testid 위반 |
| R3 | 10개 | stale 라인번호, §7/§10/§11 구조 문제, G5A/G5B 트리 불일치, 용어 모호성 |
| R4 | 10개 | sidePanel 타입 제거 누락, RightPropertyPanel 골격 정의 모호, G4 독립성 오해, AI 패널 미결정, localStorage 마이그레이션 |
| R5 | 5개 | AI left dock vs LeftDataPanel 충돌, 패널 토글 testid 계약 누락, 차트 유형 12종, 스키마 체크리스트 과소, StyleTab 줄 수 |
| **G5.0 구현** | 2개 | RightPropertyPanel 중첩 div `h-full` 누락, LeftDataPanel `overflow-y-auto` 누락 → 즉시 수정 |

**이 리뷰에서는 구현 코드와 계획 문서 양쪽을 검토하고, 새로운 문제를 찾아주세요.**

## 코드 참조

```
stats/app/graph-studio/page.tsx                          — 3패널 레이아웃 (G5.0 완료)
stats/components/graph-studio/LeftDataPanel.tsx           — 신규 (placeholder 골격)
stats/components/graph-studio/RightPropertyPanel.tsx      — 신규 (DataTab/StyleTab 래퍼)
stats/components/graph-studio/panels/DataTab.tsx          — 867줄, G5.2 리팩토링 대상
stats/components/graph-studio/panels/StyleTab.tsx         — 480줄, G5.2 리팩토링 대상
stats/components/graph-studio/AiPanel.tsx                 — bottom 전용 (도킹 버튼 제거됨)
stats/components/graph-studio/GraphStudioHeader.tsx       — 좌/우 개별 토글 (testid 유지)
stats/types/graph-studio.ts                               — AiPanelDock = 'bottom', sidePanel 필드 제거
stats/lib/stores/graph-studio-store.ts                    — sidePanel/setSidePanel 제거됨
stats/lib/graph-studio/project-storage.ts                 — localStorage (스키마 변경 시 마이그레이션 필요)
stats/lib/graph-studio/chart-spec-defaults.ts             — CHART_TYPE_HINTS (12종), ALL_PALETTES
stats/e2e/selectors.ts                                    — E2E testid 레지스트리 (수정 금지, 3개 신규 추가됨)
stats/__tests__/lib/graph-studio/graph-studio-store.test.ts — 38 tests 통과
```
