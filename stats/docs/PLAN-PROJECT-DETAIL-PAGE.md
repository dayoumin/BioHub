# 프로젝트 상세 페이지 (Phase 4) 계획

**작성일**: 2026-03-23
**상태**: UX 확정, 구현 대기
**관련 문서**: [RESEARCH_PROJECT_STATUS.md](../../docs/RESEARCH_PROJECT_STATUS.md) · [TODO.md](../../TODO.md) · [packages/types/src/project.ts](../../packages/types/src/project.ts)

---

## 1. 목적

연구자가 프로젝트 안의 모든 산출물(통계, 그래프, 유전분석 등)을 **한눈에 보고, 관리하고, 보고서로 취합**할 수 있는 상세 페이지.

---

## 2. 사용자 시나리오

"제주 해양 생태 조사 2026" 프로젝트에 다음이 저장됨:
- 독립표본 t-검정 (암수 체장 차이)
- 일원 ANOVA (사료 3종 비교)
- Box Plot 1개 (Graph Studio)
- BLAST 종 동정 2건

연구자가 하고 싶은 것:
1. 프로젝트 열어서 **통계 탭**에서 내 분석 2개 확인
2. t-검정 결과의 **"분석으로 이동"** 눌러서 변수 바꿔 재분석
3. **BLAST 탭**에서 종 동정 결과 확인
4. 전체에서 필요한 항목 3개 체크 → **"보고서 만들기"** → 마크다운으로 복사
5. 3개월 후 다시 열어도 **검색**으로 빠르게 찾기

---

## 3. UX 설계

### 3.1 페이지 레이아웃

```
┌──────────────────────────────────────────────────────────┐
│ ← 목록  제주 해양 생태 조사 2026                    [⚙️] │
│ 해양생물 · 5개 항목                                      │
├──────────────────────────────────────────────────────────┤
│ [전체(5)] [📈통계(2)] [📊그래프(1)] [🧬유전(2)]          │
├──────────────────────────────────────────────────────────┤
│ 🔍 [검색...]           기간:[전체▾]  정렬:[최신순▾]      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ☐ 독립표본 t-검정                              3월 21일 │
│    t(28)=3.21, p=.002, d=1.18 · fish-data.csv           │
│    [분석으로 이동]  [연결 해제]                           │
│                                                          │
│  ☐ 일원분산분석 (ANOVA)                         3월 21일 │
│    F(2,42)=12.34, p<.001, η²=0.37 · anova.csv          │
│    [분석으로 이동]  [연결 해제]                           │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  ☑ 1개 선택됨                          [보고서 만들기 →] │
└──────────────────────────────────────────────────────────┘
```

### 3.2 핵심 UX 결정

| 항목 | 결정 | 이유 |
|------|------|------|
| **종류별 구분** | 상단 탭 | 밑으로 길어지면 보기 힘듦, 탭이 깔끔 |
| **"전체" 탭** | 있음 (기본) | 시간순 전체 보기, 최근 작업 파악 |
| **탭 표시/숨김** | ⚙️ 설정으로 제어 | 안 쓰는 종류는 숨기고, 신규 종류는 설정에서 켜기 |
| **검색** | 텍스트 검색 (메서드명, 파일명, 종명 등) | 시간 지나도 빠르게 찾기 |
| **필터** | 기간 드롭다운 | 최근 1주/1개월/3개월/전체 |
| **정렬** | 최신순 (기본) / 이름순 | 단순하게 2개만 |
| **항목 액션** | 결과 보기 + 재분석 + 연결 해제 | "수정"은 원본 화면에서, 여기서는 이동만 |
| **연결 해제** | ref만 제거, 원본 데이터 유지 | "삭제"가 아님 — 용어 통일 |
| **보고서 취합** | 체크박스 선택 → 하단 고정 바 → 보고서 편집 | 직관적 선택 흐름 |
| **프로젝트 메타 편집** | 헤더 인라인 편집 | 별도 다이얼로그 불필요 |

### 3.3 탭 설정 (⚙️)

```
┌─ 탭 설정 ──────────────────┐
│ ☑ 📈 통계 분석              │
│ ☑ 📊 그래프                 │
│ ☑ 🧬 유전적 분석            │
│ ☐ 💬 채팅 세션              │  ← 기본 숨김
│ ☐ 📝 종 검증                │  ← 향후 추가
│ ☐ ⚖️ 법적 지위              │  ← 향후 추가
└─────────────────────────────┘
```

- 설정은 localStorage에 저장 (프로젝트별이 아닌 전역)
- 향후 새 `ProjectEntityKind` 추가 시 여기에 한 줄 추가만 하면 됨

### 3.4 탭-EntityKind 매핑 (확장 가능 설계)

```typescript
// 탭 정의 — 새 종류 추가 시 이 배열에 한 항목만 추가
const ENTITY_TAB_REGISTRY = [
  { id: 'analysis',           label: '통계 분석',    icon: '📈', defaultVisible: true },
  { id: 'figure',             label: '그래프',       icon: '📊', defaultVisible: true },
  { id: 'blast-result',       label: '유전적 분석',  icon: '🧬', defaultVisible: true },
  { id: 'chat-session',       label: '채팅 세션',    icon: '💬', defaultVisible: false },
  { id: 'species-validation', label: '종 검증',      icon: '📝', defaultVisible: false },
  { id: 'legal-status',       label: '법적 지위',    icon: '⚖️', defaultVisible: false },
  { id: 'draft',              label: '초안',         icon: '📄', defaultVisible: false },
  { id: 'review-report',      label: '리뷰 보고서',  icon: '📋', defaultVisible: false },
  { id: 'data-asset',         label: '데이터',       icon: '📁', defaultVisible: false },
  { id: 'sequence-data',      label: '서열 데이터',  icon: '🧪', defaultVisible: false },
] as const
```

**확장 규칙**:
1. `packages/types/src/project.ts`에 `ProjectEntityKind` 추가
2. 위 레지스트리에 한 줄 추가
3. `entity-resolver.ts`에 해당 kind의 데이터 로더 추가
4. 끝 — UI는 레지스트리 기반으로 자동 생성

### 3.5 항목별 표시 정보

| entityKind | 제목 | 부제 (핵심 결과) | 액션 버튼 | navigateTo |
|---|---|---|---|---|
| `analysis` | 메서드명 | 통계량, p값, 효과크기, 파일명 | 결과 보기 · 재분석 | `/` (홈=ChatCentricHub) — 아래 상세 참고 |
| `figure` | 차트 이름 | 차트 타입, 그룹 수 | Graph Studio에서 열기 | `/graph-studio?project=<GraphProject.id>` |
| `blast-result` | 종명 (한글명) | Identity%, 마커, 판정 | 결과 보기 | `/genetics/barcoding?history=<entryId>` |
| `chat-session` | 세션 제목 | 메시지 수, 마지막 대화 | 채팅으로 이동 | `/chatbot` |
| 기타 (향후) | ref.label | entityKind 배지 | — | — |

**"전체" 탭**: 종류가 섞이므로 각 항목에 entityKind 배지(📈/📊/🧬) 표시

**analysis 액션 — 실제 코드 계약** (`/analysis`는 `/`로 리다이렉트됨):
- **결과 보기**: `loadAndRestoreHistory(historyId)` from `lib/stores/store-orchestration.ts`
  - 3단계: `loadFromHistory()` → `restoreFromHistory()` → `setStepTrack('normal')`
  - 호출 후 `router.push('/')` → 홈에서 결과 화면 표시
- **재분석**: `loadSettingsFromHistory(historyId)` → `restoreSettingsFromHistory(settings)` → `setStepTrack('reanalysis')`
  - 참조: `AnalysisHistoryPanel.tsx:171`
  - 호출 후 `router.push('/')` → 홈에서 업로드 화면 표시

**blast-result 액션 — deep-link 필수**:
- `/genetics/barcoding?history=<entryId>` → `BarcodingContent.tsx`가 `?history` 파라미터로 결과 복원
- `?history` 없이 이동하면 빈 입력 화면이 됨

**빈 상태**: 탭에 항목 0개일 때 → "아직 {탭이름}이 없습니다. [{도구명} 시작하기]" + 해당 도구 링크

### 3.6 보고서 취합 흐름

```
1. 항목 목록에서 체크박스로 선택
2. 하단 고정 바: "N개 선택됨 · [보고서 만들기]"
3. 보고서 편집 다이얼로그:
   ┌─ 보고서 만들기 ─────────────────────────┐
   │ 제목: [제주 해양 생태 조사 보고서     ]  │
   │                                         │
   │ 순서 (드래그 조정):                      │
   │  1. ≡ 독립표본 t-검정                   │
   │  2. ≡ 일원분산분석                       │
   │  3. ≡ Box Plot                          │
   │                                         │
   │ [미리보기]  [클립보드 복사]  [HTML 저장]  │
   └─────────────────────────────────────────┘
4. 미리보기: 마크다운 렌더 (APA 포맷 통계표 포함)
5. 내보내기: 클립보드(마크다운) / HTML 파일
```

---

## 4. 라우팅

**`/projects?id=<projectId>`** (쿼리 파라미터)

- Next.js static export 호환 (동적 라우트 `[id]` 불가)
- Graph Studio `?project=<id>` 패턴과 동일
- `?id` 없으면 목록, 있으면 상세

### 상세 진입 vs 활성 프로젝트 선택 분리

현재 `ProjectCard` 클릭은 `activeResearchProjectId`를 토글하는 핵심 동작 — 분석/유전 결과 저장 시 프로젝트 자동 연결에 직접 사용됨. 이 동작과 상세 페이지 진입을 **분리**해야 함:

| 동작 | 트리거 | 효과 |
|------|--------|------|
| **활성 프로젝트 전환** | 카드 좌측 클릭 (기존) | `activeResearchProjectId` 토글, 사이드바 표시 변경 |
| **상세 페이지 진입** | 카드 우측 "열기" 버튼 또는 프로젝트명 링크 | `router.push('/projects?id=xxx')`, 활성 프로젝트 변경 없음 |

상세 페이지 진입 시 해당 프로젝트를 자동 활성화할지 여부는 **하지 않음** — 사용자가 "보기만" 하는 경우에 활성 프로젝트가 바뀌면 혼란.

---

## 5. 기술 설계

### 5.1 핵심 신규 모듈

#### entity-resolver.ts — 종류별 데이터 로더

```typescript
interface EntitySummary {
  title: string
  subtitle?: string
  badge?: { label: string; variant: 'default' | 'success' | 'warning' }
  date: string          // 표시용 ("3월 21일", "어제")
  timestamp: number     // 정렬/필터용 원시값 (Unix ms)
  navigateTo?: string   // 이동 URL (deep-link 포함)
}

interface ResolvedEntity {
  ref: ProjectEntityRef
  loaded: boolean
  data: HistoryRecord | GraphProject | AnalysisHistoryEntry | null
  summary: EntitySummary
}
```

**timestamp 정규화** (원본마다 형식이 다름):
- `HistoryRecord.timestamp` → `number` (Unix ms) — 그대로 사용
- `GraphProject.updatedAt` → `string` (ISO) — `new Date(updatedAt).getTime()`
- `AnalysisHistoryEntry.createdAt` → `number` (Unix ms) — 그대로 사용
- 기타/dangling → `ref.createdAt` 사용. **주의**: 실제 저장값은 `new Date().toISOString()` (string, `project-storage.ts:92`). `packages/types`의 타입 선언은 `number`이지만 런타임은 ISO 문자열. 정규화: `typeof ref.createdAt === 'string' ? new Date(ref.createdAt).getTime() : ref.createdAt`

| entityKind | 저장소 | 로더 | 출처 |
|---|---|---|---|
| `analysis` | IndexedDB (async) | `getAllHistory()` → Map 캐싱 | `lib/utils/storage.ts` |
| `figure` | localStorage (sync) | `loadProject(id)` | `lib/graph-studio/project-storage.ts` |
| `blast-result` | localStorage (sync) | `loadAnalysisHistory()` → Map 캐싱 | `lib/genetics/analysis-history.ts` |
| 기타 | — | ref.label만 사용 | — |

**확장**: 새 entityKind 추가 시 resolver에 case 한 줄 추가.

**배치 최적화** (N+1 방지):
- **analysis**: `getAllHistory()` 한 번 호출 → `Map<id, HistoryRecord>`로 캐싱 후 각 ref를 O(1) resolve. 개별 `getHistory(id)` N번 호출 금지.
- **blast-result**: `loadAnalysisHistory()` 한 번 호출 → `Map<id, AnalysisHistoryEntry>` 동일 패턴.
- **figure**: localStorage sync라 개별 호출 OK. 단, 대량 시 `listAllProjects()` 배치 고려.

**Dangling ref**: 원본 삭제된 경우 `loaded: false` → "삭제된 항목" 스타일 표시 + "연결 해제" 버튼. 탭 카운트에서 제외.

**검색 범위**: EntitySummary의 `title` + `subtitle` 필드 대상 텍스트 매칭 (클라이언트 필터링).

#### entity-tab-registry.ts — 탭 레지스트리

- 위 3.4의 레지스트리 배열
- 탭 표시/숨김 설정: `localStorage`에 `biohub:project-tab-settings` 키로 저장

#### report-export.ts — 보고서 생성

- `paper-templates.ts`의 `fmtP()`, `fmt()`, APA 포맷 함수 재활용
- analysis → 메서드/결과 섹션 자동 생성
- figure → 차트 메타 캡션
- blast → 종 동정 결과표
- 출력: 마크다운 문자열 → 클립보드 / HTML 파일

### 5.2 파일 구조

```
# 신규
stats/app/projects/ProjectDetailContent.tsx      # 상세 메인 (dynamic import)
stats/app/projects/ProjectsListView.tsx          # 기존 목록 추출
stats/components/projects/ProjectHeader.tsx       # 메타 + 인라인 편집
stats/components/projects/EntityBrowser.tsx        # 탭 + 필터 + 검색 + 목록
stats/components/projects/EntityListItem.tsx       # 항목 행 (체크박스 + 요약 + 액션)
stats/components/projects/TabSettingsDialog.tsx    # 탭 표시/숨김 설정
stats/components/projects/ReportComposer.tsx       # 보고서 취합 다이얼로그
stats/lib/research/entity-resolver.ts             # 데이터 로더 + EntitySummary
stats/lib/research/entity-tab-registry.ts         # 탭-EntityKind 레지스트리
stats/lib/research/report-types.ts                # 보고서 타입
stats/lib/research/report-export.ts               # 보고서 마크다운/HTML 생성

# 수정
stats/app/projects/page.tsx                       # ?id 분기 + 목록 추출
```

### 5.3 재활용 기존 코드

| 용도 | 함수 | 위치 |
|------|------|------|
| APA p값 포맷 | `fmtP()`, `fmt()` | `lib/services/paper-draft/paper-templates.ts` |
| 메서드명 | `getMethodDisplayName()` | `lib/services/paper-draft/terminology-utils.ts` |
| 날짜 포맷 | `formatTimeAgo()` | `lib/utils/format-time.ts` |
| entity ref CRUD | `listProjectEntityRefs()` 등 | `lib/research/project-storage.ts` |
| 차트 로드 | `loadProject()` | `lib/graph-studio/project-storage.ts` |
| BLAST 히스토리 | `loadAnalysisHistory()` | `lib/genetics/analysis-history.ts` |
| 드래그 정렬 | `@dnd-kit` | 이미 설치됨 |

---

## 6. 구현 단계

### Step 1: 인프라 (0.5일)
- `entity-tab-registry.ts` — 탭 레지스트리 + 설정 유틸
- `entity-resolver.ts` — entityKind별 로더 + EntitySummary
- `report-types.ts` — 보고서 타입 정의

### Step 2: 라우팅 + 페이지 분리 (0.5일)
- `page.tsx` → `ProjectsListView` 추출, `?id` 분기
- `ProjectDetailContent.tsx` — 스켈레톤 (dynamic import, ssr:false)
- 목록에서 상세 진입 네비게이션 추가

### Step 3: ProjectHeader (0.5일)
- 뒤로가기 + 이름/설명 인라인 편집 + domain + tags
- ⚙️ `TabSettingsDialog`

### Step 4: EntityBrowser + EntityListItem (1일)
- 탭 (레지스트리 기반 동적 생성)
- 검색 바 + 기간 필터 + 정렬
- `EntityListItem` — 종류별 요약 + 체크박스 + 액션 버튼
- Dangling ref 처리 (loaded: false → "삭제된 항목")

### Step 5: ReportComposer + 내보내기 (1일)
- 하단 고정 바 (선택 카운트 + 보고서 버튼)
- 보고서 편집 다이얼로그 (순서 드래그, 미리보기)
- `report-export.ts` — 마크다운/HTML 생성
- 클립보드 복사 + HTML 파일 다운로드

### Step 6: 테스트 + 정리 (0.5일)
- `entity-resolver.ts` 단위 테스트
- `entity-tab-registry.ts` 단위 테스트
- `formatDate` → `formatTimeAgo` 통합
- tsc + test 통과 확인

---

## 7. 검증 방법

1. `pnpm dev` → `/projects` → 프로젝트 카드의 "열기" 버튼 클릭 → 상세 페이지 진입 (카드 본체 클릭은 활성 프로젝트 토글 — 기존 동작 유지 확인)
2. 탭 전환: 전체 → 통계 → 그래프 → 유전 → 각각 올바른 항목만 표시
3. 검색: "t-검정" 입력 → 해당 항목만 필터
4. 기간 필터: "최근 1주" → 오래된 항목 숨김
5. "분석으로 이동" → 원본 분석 화면으로 정상 이동
6. "연결 해제" → 프로젝트에서 제거 (원본 유지)
7. ⚙️ → 탭 숨김 → 해당 탭 사라짐
8. 체크 2개 → "보고서 만들기" → 순서 조정 → 미리보기 → 클립보드 복사
9. 뒤로가기 → 목록으로 정상 복귀
10. `pnpm tsc --noEmit` + `pnpm test` 통과

---

## 8. 확장 가이드 (향후 새 종류 추가 시)

예: "메타분석" 종류를 추가하는 경우

### 최소 작업 (generic fallback 수준)

```
1. packages/types/src/project.ts
   → ProjectEntityKind에 'meta-analysis' 추가

2. stats/lib/research/entity-tab-registry.ts
   → ENTITY_TAB_REGISTRY에 { id: 'meta-analysis', label: '메타분석', icon: '🔬', defaultVisible: true } 추가
```

이것만으로 탭 자동 생성 + "전체" 탭에 표시 + 검색/필터 동작. 단, 제목은 `ref.label`, 부제 없음, 액션 없음.

### 완전 지원 (추가 작업 필요)

```
3. stats/lib/research/entity-resolver.ts
   → resolveEntity() switch에 case 'meta-analysis' 추가
   → 해당 저장소에서 데이터 로드, EntitySummary에 title/subtitle/badge/navigateTo 매핑

4. stats/lib/research/report-export.ts
   → renderEntitySection() switch에 case 'meta-analysis' 추가
   → 보고서에 포함될 마크다운 섹션 정의
```

**요약**: generic fallback까지는 2단계(타입 + 레지스트리), 완전한 요약/액션/보고서 지원은 4단계.
