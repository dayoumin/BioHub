# AI Review: 통합 최근 활동 (통계 + 시각화)

> **작성일**: 2026-03-11
> **브랜치**: `feature/ui-redesign`
> **범위**: ChatCentricHub "최근 활동" 섹션에 Graph Studio 시각화 프로젝트 통합 표시

---

## 1. 변경 요약

| 파일 | 변경 내용 |
|------|----------|
| `components/smart-flow/hub/QuickAccessBar.tsx` | 통계 전용 → 통계+시각화 통합 카드 리스트로 전면 개편 |
| `app/graph-studio/page.tsx` | `?project=<id>` 쿼리 파라미터로 프로젝트 복원 지원 + Suspense 래퍼 |
| `lib/stores/graph-studio-store.ts` | `loadDataPackage` — 프로젝트 복원 모드 감지 (encoding 호환 시 기존 spec 보존, 불일치 시 currentProject 해제) |
| `lib/terminology/terminology-types.ts` | `recentStatus.visualization` 필드 추가 |
| `lib/terminology/domains/aquaculture.ts` | "최근 분석" → "최근 활동", 시각화 상태 텍스트, 빈 상태 문구 변경 |
| `lib/terminology/domains/generic.ts` | 영문 동일 변경 |

---

## 2. 핵심 설계 결정

### 2.1 단일 리스트 vs 탭 분리

**선택: 단일 시간순 리스트** (통계+시각화 혼합)

- 이유: 허브 페이지 성격상 "최근 무엇을 했는지" 한눈에 보는 것이 핵심
- 아이콘 색상(초록 vs 보라) + 좌측 border accent로 시각적 구분 충분
- 탭 분리는 클릭 비용 증가 + 활동이 적을 때 탭이 비어 보이는 문제

### 2.2 Graph Studio 프로젝트 데이터 소스

**선택: `listProjects()` (localStorage 직접 읽기)**

- Graph Studio는 Zustand store + localStorage 조합
- Hub 컴포넌트에서는 Zustand store를 구독하지 않음 (다른 store)
- `listProjects()`를 `useMemo` 안에서 호출 — 컴포넌트 마운트 시점에 최신 데이터
- 단점: Graph Studio에서 저장 후 Tab 전환 없이 Hub로 돌아오면 stale → 실제로는 라우팅이 발생하므로 컴포넌트 재마운트됨

### 2.3 시각화 카드 클릭 → `?project=` 쿼리 파라미터

- `router.push('/graph-studio?project=<id>')` → Graph Studio page에서 `useSearchParams`로 감지
- `loadProject(id)` → `setProject(project)` 호출
- 데이터(DataPackage)는 localStorage에 저장 안 됨 → `isDataLoaded: false` → **upload 모드**로 진입
- `currentProject`와 `chartSpec`은 설정됨
- `loadDataPackage`가 복원 모드를 감지: `currentProject`가 존재하고 기존 spec의 encoding(x/y)이 새 데이터 컬럼에 존재하면 기존 chartSpec 보존 (dataSourceId만 갱신)
- encoding 불일치 시: 새 기본 spec 생성 + `currentProject` 해제 → 기존 프로젝트 덮어쓰기 방지
- **향후 개선**: DataUploadPanel에서 `currentProject` 존재 시 안내 문구 표시

### 2.4 삭제 후 UI 갱신

- 통계 삭제: `onHistoryDelete` → Zustand store 변경 → 자동 리렌더
- 시각화 삭제: `deleteProject()` (localStorage만 변경) → React 상태 변경 없음
- **해결**: `vizRefreshKey` 카운터 state → 삭제 시 increment → useMemo 재계산 트리거

---

## 3. 변경 파일별 상세

### 3.1 QuickAccessBar.tsx (전면 개편)

**새 타입 구조**:
```typescript
type ActivityType = 'statistics' | 'visualization'

interface ActivityCard {
  id: string
  type: ActivityType
  timestamp: Date
  // 통계 전용: method, pValue, hasResults, dataFileName
  // 시각화 전용: chartType, chartTypeLabel
}
```

**통합 정렬 로직** (useMemo):
1. `analysisHistory` → `ActivityCard[]` (type: 'statistics')
2. `listProjects()` → `ActivityCard[]` (type: 'visualization')
3. 합산 → pinned 우선 → 시간순 정렬 → `MAX_VISIBLE_PILLS` 개 표시

**카드 UI 분기** (ActivityCardItem 서브 컴포넌트):

| | 통계 분석 | 시각화 |
|---|---|---|
| 아이콘 배경 | emerald-100 (초록) | violet-100 (보라) |
| 아이콘 | CheckCircle2 / Loader2 | BarChart3 / LineChart / ScatterChart |
| 좌측 border | 없음 | `border-l-[3px] border-l-violet-400/60` |
| 메타 정보 | "완료, p=0.003 · 2시간 전" | "시각화 · 막대 차트 · 3일 전" |
| 클릭 동작 | `onHistoryClick(id)` | `router.push('/graph-studio?project=id')` |

### 3.2 graph-studio/page.tsx

- `useSearchParams()` → `?project=` 파라미터 감지
- `loadProject(projectId)` → `setProject(project)` 호출
- `Suspense` 래퍼 추가 (Next.js App Router 요구사항)
- 기존 내부 로직은 `GraphStudioPageInner`로 이동

### 3.3 graph-studio-store.ts

- `setProject`의 `isDataLoaded`: `dataPackage != null` (변경 없음 — 데이터 없으면 upload 모드 유지)
- `loadDataPackage` 복원 모드 추가:
  - `currentProject` 존재 + 기존 spec의 encoding x/y가 새 데이터 컬럼에 존재 → 기존 chartSpec 보존
  - encoding 불일치 → 새 기본 spec 생성 + `currentProject: null` (덮어쓰기 방지)

---

## 4. 리뷰 포인트 (검토 요청)

### P1 — ~~시각화 카드 클릭 시 chartSpec 덮어쓰기~~ (해결됨)

`loadDataPackage`에 복원 모드 감지를 추가:
- `currentProject` + 기존 spec → encoding 호환성 검증 → 호환 시 기존 spec 보존
- encoding 불일치 → `currentProject` 해제 (기존 프로젝트 무단 덮어쓰기 방지)
- **잔여 개선**: DataUploadPanel에서 `currentProject` 존재 시 "이전 프로젝트 복원" 안내 문구 표시

### P2 — `listProjects()` 매 렌더 시 localStorage parse

- `useMemo` + `useEffect` 안에서 `listProjects()` 호출 → localStorage.getItem + JSON.parse
- 프로젝트 수가 적으면 (10개 미만) 무시 가능하지만, 많아지면 성능 영향
- 대안: `useSyncExternalStore` + `storage` 이벤트 구독

### P3 — 핀 ID 네임스페이스 충돌

- 통계 히스토리 ID (`uuid`)와 Graph Studio 프로젝트 ID (`proj_<timestamp>_<random>`)가 같은 `pinnedIds` 배열에 혼재
- ID 포맷이 다르므로 실제 충돌 확률은 0이지만, 명시적 네임스페이스가 없음

### P4 — ~~`void vizRefreshKey` 패턴~~ (해결됨)

- `void` 제거, deps 배열에만 포함하고 주석으로 의도 설명

### P5 — Suspense 경계 fallback

- `fallback={null}` → 프로젝트 로딩 중 빈 화면
- 검토: 로딩 스켈레톤이 필요한지

---

## 5. 테스트 영향

### 기존 테스트
- QuickAccessBar를 직접 테스트하는 파일이 있으면 `HistoryCard` → `ActivityCard` 타입 변경에 영향
- `graph-studio-store.ts` 관련 테스트: `isDataLoaded` 기대값 변경 가능

### 추가 테스트 필요
- 통합 리스트 정렬: 통계 3개 + 시각화 2개 → 시간순 혼합 확인
- 시각화 카드 삭제 → UI 갱신 확인 (vizRefreshKey)
- `?project=<id>` → Graph Studio 편집 모드 진입 확인
- pinned에 통계+시각화 혼합 시 MAX_PINNED 적용 확인

---

## 6. 스크린샷 기대 결과

변경 전:
```
최근 분석
┌─────────────────────┐ ┌─────────────────────┐
│ ✅ 비율 검정 — t.csv  │ │ ✅ 비율 검정 — t.csv  │
│ 완료, p=<0.001 · 26d │ │ 완료, p=<0.001 · 26d │
└─────────────────────┘ └─────────────────────┘
```

변경 후:
```
최근 활동
┌─────────────────────┐ ┌━━━━━━━━━━━━━━━━━━━━━┐
│ ✅ 비율 검정 — t.csv  │ ┃📊 내 차트 프로젝트     ┃
│ 완료, p=<0.001 · 26d │ ┃시각화 · 막대 차트 · 3d ┃
└─────────────────────┘ └━━━━━━━━━━━━━━━━━━━━━┘
  (초록 아이콘, 일반 border)    (보라 아이콘, 좌측 보라 border)
```
