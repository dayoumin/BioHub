# Step 1 데이터 탐색 UX 개선 계획서

> 데이터 업로드 후 "줄줄 스크롤" 문제 해결
> 기초통계/분포/정규성/등분산성/시각화를 카드 기반 대시보드로 재구성

## 현재 문제

### 구조

```
Step 1 (DataExplorationStep) — 691줄
  ├─ 요약 배지 바 (파일명, 행/열, 변수 타입, 결측, 이상치)
  └─ 4개 탭
       ├─ [개요]    데이터 미리보기 + 컬럼 정보 패널
       ├─ [기술통계]  변수별 기술통계 테이블 (변수 10개면 10행 × 9열)
       ├─ [분포]    히스토그램/박스플롯 (변수 1개씩 선택)
       └─ [상관]    산점도 + 상관 히트맵
```

### 문제점

1. **탭이 정보를 숨김** — 기술통계를 보려면 탭 전환, 분포를 보려면 또 탭 전환. 한눈에 파악 불가.
2. **기술통계 테이블이 길게 늘어남** — 변수가 많으면 스크롤. 어떤 변수에 문제가 있는지 한눈에 안 보임.
3. **정규성은 기술통계 테이블에 배지로만 표시** — 등분산성은 Step 1에 아예 없음 (Step 4 결과에서만 확인). 분석 방법 선택 전에 알아야 할 핵심 정보가 빠져 있음.
4. **분포 차트는 변수 1개씩만** — 여러 변수를 한눈에 비교 불가.
5. **상관 탭은 수치형 2개 이상일 때만** — 조건 미충족 시 빈 탭.

### 기존 자산

- `AssumptionTestsSection.tsx` — 정규성/등분산성 표시 컴포넌트 이미 존재. Step 1에 미연결.
- `DescriptiveStatsTable.tsx` — 기술통계 + 정규성 배지. 이상치 우선 정렬 로직 있음.
- `DistributionChartSection.tsx` — 히스토그램/박스플롯. 변수 선택 UI.
- `ScatterHeatmapSection.tsx` — 산점도 + 히트맵.
- `OutlierDetailPanel.tsx` — 이상치 상세 모달.
- `useDescriptiveStats` 훅 — 정규성 판정, 이상치 탐지, 권장 분석 유형.

---

## 목표 디자인: 카드 대시보드 + 상세 패널

### 핵심 원칙

1. **한 화면에 요약** — 스크롤 없이 데이터 상태 전체 파악
2. **카드 클릭 → 상세** — 관심 있는 항목만 깊이 탐색
3. **문제 변수 우선 노출** — 정규성 실패, 이상치, 결측이 있는 변수를 먼저
4. **정규성 + 등분산성을 Step 1에** — 분석 방법 선택 전 핵심 정보 제공

### 전체 레이아웃

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 데이터 탐색                          [파일명.csv] 150행 × 8열  │
│─────────────────────────────────────────────────────────────────│
│                                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │ 📋 데이터    │ │ 📊 기초통계  │ │ 📈 분포/정규성│ │ 🔗 상관   │ │
│  │ 미리보기    │ │             │ │             │ │           │ │
│  │             │ │ 8 변수      │ │ ✓ 6 정규    │ │ r=0.91   │ │
│  │ 150행 × 8열 │ │ ⚠ 이상치 3  │ │ ✗ 2 비정규  │ │ (최대)    │ │
│  │             │ │ 결측 0      │ │ 등분산 ✓    │ │ 3 유의쌍  │ │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └─────┬─────┘ │
│         │               │               │              │        │
│  ───────┴───────────────┴───────────────┴──────────────┴─────── │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    상세 패널 (선택된 카드)                    │ │
│  │                                                             │ │
│  │  카드 클릭 시 이 영역에 해당 상세 내용이 표시됨               │ │
│  │                                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 카드별 요약 + 상세

#### 카드 1: 데이터 미리보기

**요약 카드:**
```
┌─────────────────┐
│ 📋 데이터 미리보기 │
│                 │
│  150행 × 8열    │
│  숫자 6 · 범주 2 │
│  결측 0건       │
└─────────────────┘
```

**상세 패널 (클릭 시):**
- 현재 개요 탭의 데이터 미리보기 (상/하 5행)
- 컬럼 정보 패널 (오른쪽 사이드)
- "전체 데이터 보기" 버튼 → 새 창

#### 카드 2: 기초통계

**요약 카드:**
```
┌─────────────────┐
│ 📊 기초통계      │
│                 │
│  8 변수         │
│  ⚠ 이상치 3변수  │
│  결측 0건       │
└─────────────────┘
```

**상세 패널 (클릭 시):**
- 기술통계 테이블 — **기본 5개 변수만 표시**
- 정렬: 이상치 있는 변수 → 정규성 실패 변수 → 나머지
- 하단: "전체 N개 변수 보기" 버튼 → 풀스크린 모달 (스크롤 가능)
- 이상치 배너 유지 → 클릭 시 OutlierDetailPanel 모달

```
┌─────────────────────────────────────────────────────────┐
│  기초통계                        [전체 8개 변수 보기 ▷]  │
│─────────────────────────────────────────────────────────│
│                                                         │
│  ⚠ 3개 변수에서 이상치 12건 탐지                          │
│                                                         │
│  변수    | 평균   | SD    | 중앙값 | 왜도  | 이상치 | 정규성│
│  ────────┼───────┼──────┼───────┼──────┼───────┼──────│
│  체중 ⚠  | 23.4  | 4.2  | 23.1  | 0.3  | 5건   | ✗    │
│  꼬리 ⚠  | 8.1   | 1.8  | 8.0   | 1.2  | 4건   | ✗    │
│  폭  ⚠  | 3.2   | 0.5  | 3.1   | 0.8  | 3건   | ✓    │
│  체장    | 31.2  | 5.1  | 31.0  | 0.1  | 0     | ✓    │
│  두장    | 12.3  | 2.1  | 12.5  | -0.2 | 0     | ✓    │
│                                                         │
│  +3개 변수 더 있음                                       │
└─────────────────────────────────────────────────────────┘
```

#### 카드 3: 분포 & 검정

**요약 카드:**
```
┌──────────────────┐
│ 📈 분포 & 검정    │
│                  │
│  정규 ✓ 6 / ✗ 2  │
│  등분산 ✓        │
│  [미니 분포 막대] │
└──────────────────┘
```

**미니 분포 막대:** 각 변수의 분포를 1줄 스파크라인으로 요약 (카드 안에).

**상세 패널 (클릭 시):**
- 상단: 정규성/등분산성 요약 배지
- 중단: 히스토그램/박스플롯 (현재 DistributionChartSection)
- **변경점: 멀티 변수 미니 차트**
  - 기본: 문제 변수 2~3개 + 정상 변수 1~2개 미니 차트 격자
  - 클릭 시 해당 변수 확대
  - "전체 변수 분포 보기" → 풀스크린 격자

```
┌─────────────────────────────────────────────────────────┐
│  분포 & 검정                                             │
│─────────────────────────────────────────────────────────│
│                                                         │
│  정규성 검정 (Shapiro-Wilk)                              │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐           │
│  │ 체중   │ │ 꼬리   │ │ 체장   │ │ 두장   │           │
│  │  ✗     │ │  ✗     │ │  ✓     │ │  ✓     │           │
│  │ p=.012 │ │ p=.003 │ │ p=.342 │ │ p=.781 │           │
│  └────────┘ └────────┘ └────────┘ └────────┘           │
│                                                         │
│  등분산성 (Levene)           결과: ✓ 등분산 (p=0.234)    │
│                                                         │
│  ─── 분포 차트 ────────────────────────────────────────  │
│                                                         │
│  ┌──────────────────┐  ┌──────────────────┐             │
│  │  체중 (✗ 비정규)  │  │  꼬리 (✗ 비정규)  │             │
│  │  [히스토그램]     │  │  [히스토그램]     │             │
│  └──────────────────┘  └──────────────────┘             │
│  ┌──────────────────┐  ┌──────────────────┐             │
│  │  체장 (✓)        │  │  두장 (✓)        │             │
│  │  [히스토그램]     │  │  [히스토그램]     │             │
│  └──────────────────┘  └──────────────────┘             │
│                                                         │
│  [전체 8개 변수 분포 보기 ▷]                              │
└─────────────────────────────────────────────────────────┘
```

#### 카드 4: 변수 간 관계

**요약 카드:**
```
┌─────────────────┐
│ 🔗 변수 간 관계  │
│                 │
│  최대 r = 0.91  │
│  유의 상관 3쌍   │
│  [미니 히트맵]   │
└─────────────────┘
```

**상세 패널 (클릭 시):**
- 상관 히트맵 (CorrelationHeatmap)
- 산점도 (ScatterHeatmapSection)
- 수치형 변수 2개 미만이면: "수치형 변수가 2개 이상 필요합니다" 안내

---

## 정규성 + 등분산성 Step 1 통합

### 현재 상태

- **정규성**: `useDescriptiveStats` 훅에서 변수별 Shapiro-Wilk 결과를 이미 계산. `DescriptiveStatsTable`에 배지로 표시.
- **등분산성**: Step 4 (`AnalysisExecutionStep`)에서 가정검정 시 Levene 테스트 실행. Step 1에는 없음.
- **`AssumptionTestsSection`**: 정규성+등분산성 표시 컴포넌트 존재하지만 Step 1에 미연결.

### 변경 사항

#### 정규성 — 승격 표시

현재 기술통계 테이블의 배지 → **카드 3 요약**에 직접 노출.
상세 패널에서 변수별 정규성 판정을 배지 격자로 표시.
계산 로직은 `useDescriptiveStats`에 이미 있으므로 추가 작업 없음.

#### 등분산성 — Step 1에 추가

**조건부 실행:**
- 수치형 1개 이상 + 범주형(그룹 변수) 1개 이상일 때만
- Pyodide Worker 3에서 Levene 테스트 실행 (`scipy.stats.levene`) — 기존 `assumption-testing-service.ts`의 Worker 3 호출 패턴 참조
- 그룹 변수 자동 감지 **(신규 로직 필요)**:
  - 범주형 변수 중 unique 값이 2~10개인 것을 후보로 선택
  - `ColumnStatistics.uniqueValues` 필드 활용
  - **조합 폭발 방지**: 그룹 변수 후보 × 수치형 변수 전체 조합을 테스트하지 않음.
    대신 **첫 번째 적합한 범주형 변수 1개만** 자동 선택하고, 수치형은 전체 대상으로 Levene 1회 실행.
    사용자가 그룹 변수를 변경하고 싶으면 상세 패널에서 드롭다운으로 전환.

**표시:**
- 카드 3 요약에 "등분산 ✓/✗" 배지
- 상세 패널에 선택된 그룹 변수 + Levene p-value + 그룹 변수 변경 드롭다운

**주의:**
- 정규성/등분산성 모두 Pyodide 비동기 계산. 정규성은 `normality-enrichment-service.ts`가 Worker 1 경유로 이미 Step 1에서 계산 중 (JS 동기 아님). 등분산성은 Worker 3 경유 신규 추가.
- 카드 3 요약에서 비동기 결과는 "계산 중..." 로딩 상태 허용.
- **카드 높이 고정** — 로딩 → 결과 전환 시 CLS(레이아웃 시프트) 방지.

**`AssumptionTestsSection` 재사용 주의:**
현재 이 컴포넌트는 `StatisticalAssumptions` 타입을 받는데, 이 타입은 AI 추천 이후 그룹별 정규성(`group1`/`group2`) + 등분산성을 포함.
Step 1에서는 AI 추천 없이 동작해야 하므로, `useLeveneTest` 훅이 결과를 `StatisticalAssumptions` 형태로 가공하거나, 별도 경량 표시 컴포넌트를 만들어야 함.

---

## 변수 과다 처리 전략

### 기본 표시 개수

| 영역 | 기본 표시 | 전체 보기 |
|------|----------|----------|
| 기초통계 테이블 | 5개 변수 | 풀스크린 모달 |
| 분포 미니 차트 | 4개 (2×2 격자) | 풀스크린 격자 |
| 상관 히트맵 | 전체 (축소) | 풀스크린 |

### 정렬 우선순위 (신규 구현 필요)

현재 `DescriptiveStatsTable`은 원본 순서로 표시. 이상치 배너만 내림차순 정렬(27~33행).
**테이블 자체의 정렬 로직은 없으므로 신규 구현:**

```typescript
// 호출 측(DescriptivePanel)에서 정렬 후 전달
const sorted = [...numericDistributions].sort((a, b) => {
  // 1. 정규성 실패 우선
  const aNorm = a.normality?.isNormal === false ? 0 : 1;
  const bNorm = b.normality?.isNormal === false ? 0 : 1;
  if (aNorm !== bNorm) return aNorm - bNorm;
  // 2. 이상치 많은 순
  if (b.outlierCount !== a.outlierCount) return b.outlierCount - a.outlierCount;
  // 3. 나머지 원본 순서
  return 0;
});

// 기본 표시: sorted.slice(0, displayCount)
// displayCount = Math.min(5, sorted.length)
// sorted.length <= displayCount이면 "전체 보기" 버튼 숨김
```

**`DescriptiveStatsTable`에 `maxRows` prop을 추가하지 않음** — 호출 측에서 `slice` 후 전달하는 것이 기존 사용처에 영향을 주지 않아 더 안전.

### 풀스크린 모달

```
┌─────────────────────────────────────────────────────────┐
│  전체 변수 기초통계                              [닫기 X] │
│─────────────────────────────────────────────────────────│
│                                                         │
│  🔍 [변수 검색...]                    정렬: [문제 우선 ▾] │
│                                                         │
│  (스크롤 가능한 전체 테이블)                               │
│  변수    | 평균   | SD    | 중앙값 | 왜도  | 이상치 | 정규성│
│  ────────┼───────┼──────┼───────┼──────┼───────┼──────│
│  체중 ⚠  | 23.4  | 4.2  | 23.1  | 0.3  | 5건   | ✗    │
│  꼬리 ⚠  | 8.1   | 1.8  | 8.0   | 1.2  | 4건   | ✗    │
│  ...     | ...   | ...  | ...   | ...  | ...   | ...  │
│  (20개 변수 전체)                                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 구현 계획

### Phase 1: 카드 대시보드 레이아웃

**DataExplorationStep.tsx 재구성:**

현재 탭 구조 → 카드 요약 + 상세 패널 구조로 변경.

**제거 대상 (기존 탭 관련):**
- import: `ContentTabs`, `ContentTabsContent` (30~31행)
- 상수: `TAB_IDS`, `TabId` (34~41행)
- `tabs` useMemo (197~220행)
- `<ContentTabs>` + `<ContentTabsContent>` × 4 (474~672행)
- `activeTab` state → `selectedCard` state로 교체

**기존 로직 교체:**
- 이상치 배지 클릭: `setActiveTab(TAB_IDS.descriptive)` → `setSelectedCard('descriptive')` (441행)
- 이상치 데이터 보기: `setActiveTab(TAB_IDS.overview)` → `setSelectedCard('overview')` (165행)

```typescript
// 상태 — 로컬 state (기존 activeTab과 동일 수준, URL/store 반영 불필요)
const [selectedCard, setSelectedCard] = useState<CardId | null>('overview')

// 레이아웃
<div>
  {/* 요약 배지 바 (현재 것 유지) */}
  <SummaryBadgeBar ... />

  {/* 요약 카드 — 반응형 grid */}
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    <SummaryCard id="overview" selected={selectedCard === 'overview'} onClick={setSelectedCard} />
    <SummaryCard id="descriptive" selected={...} onClick={setSelectedCard} />
    <SummaryCard id="distribution" selected={...} onClick={setSelectedCard} />
    <SummaryCard id="correlation" selected={...} onClick={setSelectedCard} />
  </div>

  {/* 상세 패널 (선택된 카드에 따라) */}
  <DetailPanel cardId={selectedCard}>
    {selectedCard === 'overview' && <DataPreviewPanel ... />}
    {selectedCard === 'descriptive' && <DescriptivePanel ... />}
    {selectedCard === 'distribution' && <DistributionPanel ... />}
    {selectedCard === 'correlation' && <CorrelationPanel ... />}
  </DetailPanel>
</div>
```

**선택된 카드 시각적 피드백:**
- `selected` prop → `ring-2 ring-primary border-primary` 스타일
- 비선택 카드: `border-border/40 hover:border-border`
- 선택 카드 아래에 삼각형 인디케이터 또는 상세 패널과 연결선

**Quick 모드에서 카드 가시성:**
- `ExplorationProfile`의 기존 visibility 값을 카드에도 적용
- `hidden` 카드: 렌더링 안 함 → `grid-cols-2 md:grid-cols-4` 대신 실제 카드 수에 맞게 `grid-cols-2 md:grid-cols-{N}` 동적 결정. 또는 `flex gap-3`로 전환하여 카드 수 무관하게 균등 배치.
- `secondary` 카드: `opacity-60` + 클릭은 가능

**컴포넌트 구조:**

```
DataExplorationStep.tsx (재구성)
  ├─ SummaryBadgeBar (기존 배지 바 — 변경 없음)
  ├─ SummaryCard × 4 (신규 — 요약 카드)
  └─ DetailPanel (신규 — 상세 패널 컨테이너)
       ├─ DataPreviewPanel (기존 개요 탭 콘텐츠 → 컴포넌트 분리)
       ├─ DescriptivePanel (기존 기술통계 탭 + 변수 제한 + 풀스크린)
       ├─ DistributionPanel (기존 분포 탭 + 정규성/등분산성 + 멀티 차트)
       └─ CorrelationPanel (기존 상관 탭 — 거의 변경 없음)
```

### Phase 2: 변수 과다 처리

- `DescriptivePanel`: 기본 5개 + "전체 보기" 풀스크린 모달
- `DistributionPanel`: 2×2 미니 차트 격자 + "전체 보기" 풀스크린 격자
- 공통: `FullScreenStatsModal` 컴포넌트 (검색 + 정렬 + 스크롤)
- 정렬 로직: 정규성 실패 → 이상치 → 결측 → 나머지

### Phase 3: 정규성/등분산성 통합

- **정규성**: `useDescriptiveStats`의 기존 데이터를 카드 3 요약 + DistributionPanel에 배지 격자로 표시
- **등분산성**: `useLeveneTest` 훅 신규
  - 조건: 수치형 ≥ 1 + 범주형(2~10 unique) ≥ 1
  - Pyodide Worker 호출: `scipy.stats.levene`
  - 비동기 — 카드 3에 로딩 스피너 허용
- `DistributionPanel`에 정규성 배지 격자 + 등분산성 결과 섹션 추가

### Phase 4: 미니 차트 (카드 요약용)

- 카드 3: 변수별 분포를 1줄 스파크라인으로 요약 (ECharts 또는 순수 SVG)
- 카드 4: 미니 히트맵 (3×3 축소)
- 이건 시각적 보너스 — 없어도 기능은 동작

---

## 기존 코드 재사용

| 기존 컴포넌트 | 재사용 | 변경 |
|-------------|-------|------|
| `DescriptiveStatsTable` | DescriptivePanel 내부 | 변경 없음 — 호출 측에서 `slice(0, 5)` 전달 |
| `DistributionChartSection` | DistributionPanel 내부 | 멀티 차트 격자 모드 추가 |
| `ScatterHeatmapSection` | CorrelationPanel 내부 | 변경 없음 |
| `DataPreviewTable` | DataPreviewPanel 내부 | 변경 없음 |
| `OutlierDetailPanel` | DescriptivePanel에서 호출 | 변경 없음 |
| `AssumptionTestsSection` | DistributionPanel 내부 | Step 1 연결 — 단, `StatisticalAssumptions` 형태 가공 필요하거나 경량 대체 컴포넌트 검토 |
| `useDescriptiveStats` | 정규성 데이터 소스 | 변경 없음 |
| `DataProfileSummary` | SummaryBadgeBar 유지 | 변경 없음 |

**신규:**
- `SummaryCard` — 요약 카드 컴포넌트
- `DetailPanel` — 상세 패널 컨테이너 (애니메이션)
- `FullScreenStatsModal` — 풀스크린 모달 (테이블/차트)
- `useLeveneTest` — 등분산성 검정 훅

---

## 안 건드리는 것

| 항목 | 이유 |
|------|------|
| Step 2~4 | 이 계획은 Step 1만 |
| 요약 배지 바 | 이미 잘 동작함 |
| Quick 모드 프로필 | 가시성 로직 유지 |
| 데이터 업로드 UI | 별도 |

---

## 실행 순서

```
Phase 1: 카드 대시보드 레이아웃 (핵심)
  ├─ SummaryCard × 4
  ├─ DetailPanel 컨테이너
  └─ 기존 탭 콘텐츠를 패널별로 분리
  ↓
Phase 2: 변수 과다 처리
  ├─ DescriptivePanel: 5개 제한 + FullScreenStatsModal
  └─ DistributionPanel: 2×2 격자 + 풀스크린 격자
  ↓
Phase 3: 정규성/등분산성 통합
  ├─ 카드 3 요약에 정규성/등분산성 배지
  ├─ useLeveneTest 훅 (Pyodide)
  └─ DistributionPanel에 검정 결과 섹션
  ↓
Phase 4: 미니 차트 (보너스)
  ├─ 카드 요약용 스파크라인
  └─ 미니 히트맵
```

Phase 2와 3은 병렬 진행 가능 (서로 독립적).
Phase 3의 `useLeveneTest`가 가장 리스크 높음 (Pyodide 호출 + 그룹 변수 자동 감지 신규 로직).

---

## 리스크

### 그룹 변수 자동 감지 (높음)

현재 그룹 변수 결정은 AI 추천(`variableAssignments`) 이후에만 가능.
Step 1에서는 AI 추천 없이 자동 감지해야 함 → 신규 로직.
**조합 폭발 방지 전략이 필수** — 계획서에서 "첫 번째 적합 범주형 1개만"으로 제한.

### 풀스크린 모달 공수 (중간)

검색 + 정렬 + 스크롤이 결합된 풀스크린 모달은 기존에 없는 패턴.
`OutlierDetailPanel`(Sheet 기반)을 참고할 수 있지만, 테이블+검색+정렬 조합은 신규.
**대안:** 처음에는 검색 없이 정렬+스크롤만 구현. 검색은 변수 20개 이상일 때 추가.

### DataExplorationStep 재구성 범위 (중간)

691줄 중 메인 렌더링 300줄이 재구성 대상.
실질적으로는 기존 코드를 컴포넌트로 추출하는 작업이 대부분이지만,
탭→카드 전환 시 `ContentTabs`/`ContentTabsContent` 5곳 + 관련 상수/로직 제거 필요.

### 기존 테스트 (낮음)

- `DataExplorationStep-infinite-loop.test.tsx`: 로직 테스트 → 영향 적음
- `DataExplorationStep-terminology.test.tsx`: 텍스트 렌더링 → 탭 UI 미테스트
- 두 테스트 모두 탭 구조 자체를 검증하지 않으므로 깨질 가능성 낮음

### 등분산성 비동기 로딩 UX (낮음)

카드 높이 고정으로 CLS 방지. 로딩 중 스켈레톤/스피너 표시.
