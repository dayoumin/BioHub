# PLAN: 연구과제 UX 개선

**상태**: 계획 확정
**목업**: [mockup-project-ux.html](../mockup-project-ux.html)
**관련**: [PLAN-PROJECT-SYSTEM.md](PLAN-PROJECT-SYSTEM.md)

---

## 용어 결정

- UI 표시: **"연구과제"** (연구자에게 자연스러운 단위 — "이 과제에 쓸 분석들")
- 코드 내부: `ResearchProject` (기존 타입명 유지, UI 문구만 변경)
- 연구과제 없이 작업: **"개별 작업 중"** ("프로젝트 없음" → 부정형 제거)

## 목표

연구과제 생성/연결/탐색 경험을 개선하여, 단건 분석 사용자에게 마찰 없이 자연스럽게 연구과제 관리로 전환되도록 한다.

## 현재 문제

| # | 문제 | 위치 |
|---|------|------|
| 1 | 연구과제 없을 때 드롭다운이 "해제" 등 불필요한 옵션 표시 | `app-sidebar.tsx` |
| 2 | 활성 연구과제 시각적 구분 부족 (이름만 표시) | `app-sidebar.tsx` |
| 3 | "새 프로젝트" 클릭 → 페이지 이동 (맥락 이탈) | `app-sidebar.tsx` |
| 4 | 드롭다운↔메뉴 영역 시각적 구분 없음 (같은 배경, 경계 불명확) | `app-sidebar.tsx` |
| 5 | "연구 프로젝트" 메뉴 항목이 드롭다운과 중복 | `app-sidebar.tsx` |
| 6 | 히스토리 카드에 `projectId` 있지만 UI 미표시 | `AnalysisHistoryPanel.tsx` |
| 7 | 유전적 분석 히스토리에 연구과제 연결 UI 없음 (고정/삭제만) | `HistorySidebar.tsx` |
| 8 | 연구과제의 가치를 설명하지 않음 (처음 쓰는 사용자) | 전반 |

## 연구과제 연결 아키텍처 (선행 설계)

구현 전에 **연결/변경/해제의 책임 계층**을 먼저 정의한다.

### 현재 구조 (source of truth)

| 저장소 | 역할 | 연결 시점 |
|--------|------|-----------|
| `project-storage.ts` → `upsertProjectEntityRef()` | 프로젝트↔엔티티 양방향 ref | 저장 시 호출 |
| `history-store.ts` → `saveToHistory()` | 통계 분석 레코드에 `projectId` 기록 | 저장 시 `options.projectId` 전달 |
| `analysis-history.ts` → `saveAnalysis()` | 유전적 분석 레코드에 `projectId` 기록 | 저장 시 전달 |
| `graph-studio-store.ts` | 그래프 프로젝트에 `projectId` 기록 | 저장 시 전달 |

### 필요한 신규 서비스: `projectLinkService`

연결/변경/해제 시 **2곳을 동시에 갱신**해야 반쪽 구현을 방지한다:
1. 엔티티 레코드의 `projectId` 필드 (IndexedDB/localStorage)
2. `ProjectEntityRef` 목록 (localStorage)

```typescript
// lib/research/project-link-service.ts (신규)
export function linkEntityToProject(entityId: string, entityKind: ProjectEntityKind, projectId: string, label: string): void
export function unlinkEntityFromProject(entityId: string, entityKind: ProjectEntityKind): void
export function changeEntityProject(entityId: string, entityKind: ProjectEntityKind, newProjectId: string, label: string): void
export function bulkLinkToProject(entities: Array<{id: string, kind: ProjectEntityKind, label: string}>, projectId: string): void
```

각 함수는 내부에서:
- 해당 저장소의 `projectId` 필드 갱신 (통계: IndexedDB, 유전: localStorage, 그래프: localStorage)
- `upsertProjectEntityRef()` / `removeProjectEntityRef()` 호출

**이 서비스를 Phase 2 시작 전에 구현한다.**

### 이동 경로

연구과제 상세 페이지 진입: `/projects?id=<projectId>` (기존 라우트 유지)

## 개선 항목

### A. 사이드바 (목업 섹션 1-3)

| 작업 | 파일 | 복잡도 |
|------|------|--------|
| A1. 드롭다운 영역에 "연구과제" 라벨 + 배경색 구분 | `app-sidebar.tsx` | 낮음 |
| A2. "연구 프로젝트" 메뉴 항목 삭제 (드롭다운 "연구과제 관리 ⚙"로 통합) | `app-sidebar.tsx` | 낮음 |
| A3. 빈 상태: "개별 작업 중" + 가치 설명 + CTA | `app-sidebar.tsx` | 낮음 |
| A4. 활성 상태: 파란 좌측 보더 + 이모지 + 항목 수 | `app-sidebar.tsx` | 낮음 |
| A5. "개별 작업으로 전환" 문구 ("해제" → 명확한 의도) | `app-sidebar.tsx` | 낮음 |
| A6. 인라인 빠른 생성 (드롭다운 안에서 이름 입력 → 생성+활성화) | `app-sidebar.tsx` | 중간 |

### B. 넛지 시스템 (목업 섹션 4)

| 작업 | 파일 | 복잡도 |
|------|------|--------|
| B1. 넛지 dismiss 상태만 localStorage에 저장. 미연결 분석 수는 IndexedDB에서 파생 계산 (`projectId === undefined`인 레코드 수 카운트) | `history-store.ts` | 낮음 |
| B2. 3회째 저장 시 토스트 넛지 표시 (dismiss 안 된 경우만) | `ResultsActionStep.tsx` | 중간 |
| B3. 넛지에서 연구과제 생성 + 기존 분석 일괄 연결 | `projectLinkService` + `research-project-store.ts` | 중간 |
| B4. "다음에" 클릭 시 dismiss flag 저장 | localStorage `nudge-project-dismissed` | 낮음 |

> B3 상세: `research-project-store.createProject()`로 연구과제 생성 후, `projectLinkService.bulkLinkToProject()`로 미연결 분석 레코드의 `projectId` + `ProjectEntityRef`를 동시 갱신.

### C. 저장 토스트 개선 (목업 섹션 5)

| 작업 | 파일 | 복잡도 | 상태 |
|------|------|--------|------|
| ~~C1. 연구과제명 포함 토스트~~ | `ResultsActionStep.tsx` | — | **DONE** (이미 구현됨: L388, L409) |
| C2. "열기 →" 링크 → `/projects?id=<projectId>` 이동 | `ResultsActionStep.tsx` | 낮음 | |

### D. 히스토리 → 연구과제 연결 (목업 섹션 7-9)

| 작업 | 파일 | 복잡도 |
|------|------|--------|
| D1. 통계 히스토리 카드에 연구과제 배지 표시 (읽기 전용) | `AnalysisHistoryPanel.tsx` | 낮음 |
| D2. 배지 클릭 → `/projects?id=<projectId>` 이동 | `AnalysisHistoryPanel.tsx` | 낮음 |
| D3. 미연결 항목에 "＋ 연구과제에 추가" 버튼 | `AnalysisHistoryPanel.tsx` | 중간 |
| D4. `ProjectPickerDropdown` 공통 컴포넌트 (기존 선택 or 신규 생성) | 새 컴포넌트 | 중간 |
| D5. 유전적 분석 히스토리에 연구과제 배지 추가 | `HistorySidebar.tsx` | 낮음 |
| D6. 유전적 분석 연구과제별 그룹핑 (선택적) | `HistorySidebar.tsx` | 높음 |
| D7. 연구과제 변경 ("변경" 링크) — D4의 `ProjectPickerDropdown` 재사용 | `AnalysisHistoryPanel.tsx` | 낮음 |
| D8. Graph Studio 히스토리에 연구과제 배지 추가 | `graph-studio` 컴포넌트 | 낮음 |

> D7은 D3/D4와 같은 기반(`ProjectPickerDropdown` + `projectLinkService`)에 의존.

### E. 결과 카드 연구과제 태그 (목업 섹션 6, 대안 B)

| 작업 | 파일 | 복잡도 |
|------|------|--------|
| E1. 결과 화면에 연구과제 연결 상태 표시 | `ResultsActionStep.tsx` | 낮음 |
| E2. 미연결 시 "＋ 연구과제에 추가" 인라인 버튼 | `ResultsActionStep.tsx` | 중간 |

## 구현 순서 (추천)

```
Phase 1 (빠르게): A1~A5 + C2 + D1 + D2
  → 시각적 개선 + 용어 변경 + 메뉴 간소화 + 배지 읽기 전용
  → 복잡도 낮음, 기존 데이터(projectId) 활용
  → C1은 이미 구현됨 (DONE)

Phase 2 선행: projectLinkService 구현
  → link/unlink/change/bulkLink 4개 함수
  → 통계(IndexedDB) + 유전(localStorage) + 그래프(localStorage) 3곳 동시 갱신 보장
  → ProjectPickerDropdown 공통 컴포넌트

Phase 2 (핵심): A6 + D3 + D4 + D5 + D7 + D8 + E1
  → 인라인 생성 + 히스토리에서 연구과제 추가/변경
  → 연구과제 진입점 4곳 (사이드바, 통계히스토리, 유전히스토리, 그래프)
  → D7은 D4의 ProjectPickerDropdown 재사용

Phase 3 (선택): B1~B4 + D6 + E2
  → 넛지 시스템 + 유전 그룹핑
  → B1: dismiss flag만 localStorage, 카운트는 IndexedDB 파생
  → B3: projectLinkService.bulkLinkToProject() 사용
```

## 공통 컴포넌트 (신규)

- **ProjectBadge**: 연구과제 이모지 + 이름 배지 (클릭 → `/projects?id=<id>` 이동). 통계/유전/그래프 히스토리 + 결과 카드에서 재사용
- **ProjectPickerDropdown**: "연구과제에 추가" 드롭다운 (기존 선택 + 신규 생성 + 연구과제 변경). 내부에서 `projectLinkService` 호출. D3, D4, D7, D8, E2에서 공유

## 샘플 연구과제 (ROADMAP 항목)

Phase 1~3 구현 후, **샘플 연구과제**를 1개 제공한다.

**포함 내용:**
- 통계 분석 2~3개 (t-test, ANOVA 등 — 실제 결과 포함)
- Graph Studio 그래프 1~2개 (해당 분석의 시각화)
- 유전적 분석 (바코딩) 2~3개 (COI 마커 샘플)
- 결과 정리 / AI 해석 텍스트

**목적:** 신규 사용자가 연구과제 페이지를 열었을 때 "아, 이렇게 분석을 묶어서 관리하는 거구나"를 즉시 이해.

**구현 방식:** **opt-in "샘플 불러오기" 버튼** (연구과제 0개일 때 빈 상태 화면에 표시).
자동 시딩은 하지 않음 — 넛지 조건, 프로젝트 카운트, 활성 프로젝트 문맥이 오염될 수 있음.

## 수정 대상 파일

| 파일 | Phase |
|------|-------|
| `components/layout/app-sidebar.tsx` | 1, 2 |
| `components/analysis/AnalysisHistoryPanel.tsx` | 1, 2 |
| `components/analysis/steps/ResultsActionStep.tsx` | 1, 2 |
| `components/genetics/HistorySidebar.tsx` | 2, 3 |
| `components/graph-studio/` (관련 컴포넌트) | 2 |
| `lib/stores/history-store.ts` | 3 |
| `lib/stores/research-project-store.ts` | 2, 3 |
| 신규: `lib/research/project-link-service.ts` | 2 선행 |
| 신규: `components/common/ProjectBadge.tsx` | 1 |
| 신규: `components/common/ProjectPickerDropdown.tsx` | 2 |
