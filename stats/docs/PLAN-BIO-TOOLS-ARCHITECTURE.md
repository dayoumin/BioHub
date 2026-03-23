# Bio-Tools 아키텍처 계획서

**작성일**: 2026-03-20
**상태**: 계획 수립
**선행 조건**: NCBI Barcoding 등 개별 도구 구현 전에 이 구조를 먼저 잡는다
**참조**: [PLAN-BIO-STATISTICS-AUDIT.md](../../study/PLAN-BIO-STATISTICS-AUDIT.md) (도구 선정 근거)

---

## 설계 원칙

1. **바로 실행** — 연구자는 자기가 돌릴 도구를 이미 알고 들어온다. 클릭 → 즉시 도구 페이지.
2. **내 도구 (핀 고정)** — 자주 쓰는 도구를 상단에 고정. 분야별로 쓰는 도구가 정해져 있다.
3. **카테고리 분류** — 16개 도구를 4개 카테고리로 분류. 찾기 쉽게.
4. **공통 Shell** — 헤더, 결과 영역, 내보내기는 모든 도구가 공유.
5. **워크플로우 가이드 없음** — AI 추천, 순서 안내 불필요. 연구자에게 과잉 친절은 방해.

---

## 도구 목록 (16개)

> 원래 12개 확정 (PLAN-BIO-STATISTICS-AUDIT.md) + 4개 추가: `barcoding` (신규), `condition-factor` (L-W 세트), `fst` (조건부→확정), `survival` (신규).

### 군집생태 (6개)

| ID | 한글명 | 영문 | 입력 | 계산 |
|----|--------|------|------|------|
| `alpha-diversity` | 생물다양성 지수 | Shannon, Simpson, Margalef, Pielou | CSV (종×지점) | Pyodide |
| `rarefaction` | 종 희박화 곡선 | Rarefaction Curve | CSV (종×지점) | Pyodide |
| `beta-diversity` | 베타 다양성 | Bray-Curtis, Jaccard, Sorensen | CSV (종×지점) | Pyodide |
| `nmds` | NMDS | Non-metric MDS | CSV / 거리행렬 | Pyodide |
| `permanova` | PERMANOVA | Permutational MANOVA | CSV + 그룹 | Pyodide |
| `mantel-test` | Mantel 검정 | Mantel Test | 거리행렬 2개 | Pyodide |

### 수산학 (3개)

| ID | 한글명 | 영문 | 입력 | 계산 |
|----|--------|------|------|------|
| `vbgf` | von Bertalanffy 성장 모델 | VBGF | CSV (연령, 체장) | Pyodide |
| `length-weight` | 체장-체중 관계식 | W = aL^b | CSV (체장, 체중) | Pyodide |
| `condition-factor` | 비만도 (Fulton's K) | Condition Factor | CSV (체장, 체중) | Pyodide |

> **L-W + Condition Factor**: 체장-체중 관계식과 비만도는 항상 세트로 사용됨. 같은 CSV 입력을 공유하므로 UI에서 연결 동선 제공 (결과 하단 "비만도도 계산하기" 링크).

### 유전학 (3개)

| ID | 한글명 | 영문 | 입력 | 계산 |
|----|--------|------|------|------|
| `hardy-weinberg` | Hardy-Weinberg 검정 | HW Equilibrium Test | CSV (유전자형) | Pyodide |
| `barcoding` | DNA Barcoding (종 동정) | NCBI BLAST | FASTA 서열 | 외부 API |
| `fst` | Fst (집단 분화) | Fixation Index | CSV (집단×유전자좌) | Pyodide |

> **Fst 추가 근거**: DNA Barcoding을 넣으면 유전학 사용자 유입이 동반됨. Fst는 집단유전학에서 가장 기본적인 분화 지표로, HW 검정과 세트로 사용되는 경우가 많음.

### 방법론 (4개)

| ID | 한글명 | 영문 | 입력 | 계산 |
|----|--------|------|------|------|
| `meta-analysis` | 메타분석 | Forest Plot, I², Q-test | CSV (효과크기) | Pyodide |
| `roc-auc` | ROC 곡선 / AUC | ROC-AUC Analysis | CSV (예측값, 실제값) | Pyodide |
| `icc` | ICC | Intraclass Correlation | CSV (반복 측정) | Pyodide |
| `survival` | 생존 분석 | Kaplan-Meier + Log-rank | CSV (시간, 사건, 그룹) | Pyodide |

> **생존 분석 추가 근거**: 양식 실험(생존율), 방류 후 생존, 독성 시험 등 수산/생태학 실험에서 필수. 기존 Analysis 43개에도 없는 영역. Pyodide에서 scipy 기반 구현.

### Analysis 기존 메서드와의 중복

`statistical-methods.ts`에 `kaplan-meier`, `roc-curve`가 이미 등록되어 있음 (레거시 `/statistics/*` 라우트).
Bio-Tools의 `survival`, `roc-auc`는 **Bio-Tools 전용 UI**로 새로 구현 — 레거시 페이지와 코드 공유하지 않음.
Pyodide 워커(Python 계산 코드)는 동일하게 재사용 가능.

---

## 라우팅

```
/bio-tools                → 허브 (내 도구 + 카테고리별 도구 그리드)
/bio-tools/[tool-id]      → 개별 도구 페이지 (플랫 라우트)
```

예시: `/bio-tools/alpha-diversity`, `/bio-tools/barcoding`, `/bio-tools/vbgf`

카테고리 네스트 (`/bio-tools/ecology/alpha`) 안 함 — 16개 수준이면 플랫으로 충분.

> PLAN-BIO-STATISTICS-AUDIT.md의 5페이지 그룹 라우팅은 **이 문서가 대체함**. 16개 플랫 라우트가 최종.

---

## 파일 구조

```
stats/app/bio-tools/
├── layout.tsx                       # Next.js 레이아웃 (메타데이터 + accent 설정)
├── page.tsx                         # 허브 (도구 선택)
├── alpha-diversity/page.tsx
├── rarefaction/page.tsx
├── beta-diversity/page.tsx
├── nmds/page.tsx
├── permanova/page.tsx
├── mantel-test/page.tsx
├── vbgf/page.tsx
├── length-weight/page.tsx
├── condition-factor/page.tsx
├── hardy-weinberg/page.tsx
├── barcoding/page.tsx
├── fst/page.tsx
├── meta-analysis/page.tsx
├── roc-auc/page.tsx
├── icc/page.tsx
└── survival/page.tsx

stats/components/bio-tools/
├── BioToolsHub.tsx                  # 허브 메인 (핀 섹션 + 카테고리 그리드)
├── BioToolCard.tsx                  # 도구 카드 (actionCardBase 재사용, 핀 토글)
├── BioToolShell.tsx                 # 개별 도구 공통 Shell (헤더, 뒤로가기, Export)
├── BioResultsSection.tsx            # 결과 영역 (테이블 + 차트 + ExportService)
├── BioCsvUpload.tsx                 # CSV 업로드 (useCsvUpload 훅 기반)
└── barcoding/
    └── BioFastaInput.tsx            # FASTA 입력 (Barcoding 전용)

stats/lib/bio-tools/
├── bio-tool-registry.ts             # 도구 메타데이터 + BioTool/BioToolCategory 타입
└── pinned-tools-store.ts            # Zustand persist 스토어 (핀 관리)

stats/lib/services/bio/
├── ncbi-blast-service.ts            # BLAST API (Barcoding용)
├── species-validation-service.ts    # 학명 검증 (Barcoding용)
└── (Pyodide 워커는 기존 패턴 재사용)
```

### layout.tsx vs BioToolShell.tsx 역할 구분

- `layout.tsx` = Next.js App Router 레이아웃. 메타데이터 + accent 색상 래퍼. 모든 `/bio-tools/*`에 적용.
- `BioToolShell.tsx` = **개별 도구 페이지**에서 import하는 UI 컴포넌트. 헤더(도구명 + 뒤로가기 + Export). 허브 page.tsx에서는 사용 안 함.

---

## 허브 페이지 (`/bio-tools`)

```
┌──────────────────────────────────────────────┐
│  Bio-Tools                                    │
│                                               │
│  ── 내 도구 ─────────────────────────────── │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ ★ NMDS   │ │ ★ PERMA  │ │ ★ VBGF   │    │
│  │  ordina- │ │  군집차이 │ │  성장모델 │    │
│  └──────────┘ └──────────┘ └──────────┘    │
│  (핀 고정한 도구만 표시. 없으면 이 섹션 숨김)  │
│                                               │
│  ── 군집생태 ────────────────────────────── │
│  ┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐ │
│  │Alpha ││Rare- ││Beta  ││NMDS  ││PERMA-│ │
│  │Diver.││fact. ││Diver.││      ││NOVA  │ │
│  └──────┘└──────┘└──────┘└──────┘└──────┘ │
│  ┌──────┐                                   │
│  │Mantel│                                   │
│  └──────┘                                   │
│                                               │
│  ── 수산학 ──────────────────────────────── │
│  ┌──────┐┌──────┐┌──────┐                   │
│  │VBGF  ││L-W   ││비만도│                   │
│  └──────┘└──────┘└──────┘                   │
│                                               │
│  ── 유전학 ──────────────────────────────── │
│  ┌──────┐┌──────┐┌──────┐                   │
│  │H-W   ││Barco-││Fst   │                   │
│  │      ││ding  ││      │                   │
│  └──────┘└──────┘└──────┘                   │
│                                               │
│  ── 방법론 ──────────────────────────────── │
│  ┌──────┐┌──────┐┌──────┐┌──────┐          │
│  │Meta  ││ROC/  ││ICC   ││생존  │          │
│  │      ││AUC   ││      ││분석  │          │
│  └──────┘└──────┘└──────┘└──────┘          │
└──────────────────────────────────────────────┘
```

### 도구 카드 (`BioToolCard`)

```
┌─────────────────────┐
│  ☆              NEW │  ← 핀 토글 (좌상단), 뱃지 (우상단, 선택적)
│                     │
│     [아이콘]        │  ← lucide-react 아이콘
│                     │
│  Alpha Diversity    │  ← 도구 영문명
│  생물다양성 지수     │  ← 한글명 (서브)
└─────────────────────┘
```

- 클릭 → `/bio-tools/[tool-id]` 이동
- ☆ 클릭 → 핀 토글 (★ ↔ ☆)
- hover: 살짝 lift + border accent

**재사용**: `actionCardBase`, `iconContainerMuted`, `staggerContainer` from `components/common/card-styles.ts`.
Bio-Tools 뱃지: `BADGE_BIO_STYLE` 추가 (`--section-accent-bio` 기반, 기존 `BADGE_ANALYSIS_STYLE` 패턴).

### coming-soon 도구 표시

`status: 'coming-soon'`인 도구: 카드 opacity 50% + "준비 중" 뱃지 + 클릭 disabled.
허브에서 **숨기지 않음** — 어떤 도구가 올 예정인지 사용자가 볼 수 있도록.

---

## 개별 도구 공통 Shell (`BioToolShell`)

```
┌─ BioToolShell ─────────────────────────────┐
│ [← Bio-Tools]  도구명  한글명     [Export] │  ← 헤더
├────────────────────────────────────────────┤
│                                            │
│  {children}                                │  ← 도구별 콘텐츠
│  - 입력 섹션 (CSV/FASTA/거리행렬)          │
│  - 실행 버튼                               │
│  - 결과 섹션 (BioResultsSection)           │
│                                            │
└────────────────────────────────────────────┘
```

- `[← Bio-Tools]`: `/bio-tools`로 돌아가기
- `[Export]`: 드롭다운 (복사, CSV, 결과 정리에 추가) — `ExportService` 재사용
- 도구별 콘텐츠는 각 `page.tsx`에서 자유롭게 구성

---

## 핀 관리 (`pinned-tools-store.ts`)

기존 `pinned-history-storage.ts` 패턴을 따르되, Zustand persist 스토어로 구현:

```typescript
interface PinnedToolsState {
  pinnedIds: string[]
  togglePin: (toolId: string) => void
  isPinned: (toolId: string) => boolean
}

const MAX_PINNED = 6

const usePinnedToolsStore = create<PinnedToolsState>()(
  persist(
    (set, get) => ({
      pinnedIds: [],
      togglePin: (toolId) => set((state) => {
        const exists = state.pinnedIds.includes(toolId)
        if (exists) return { pinnedIds: state.pinnedIds.filter(id => id !== toolId) }
        if (state.pinnedIds.length >= MAX_PINNED) return state // 초과 시 무시
        return { pinnedIds: [...state.pinnedIds, toolId] }
      }),
      isPinned: (toolId) => get().pinnedIds.includes(toolId),
    }),
    { name: 'biohub-pinned-bio-tools' }
  )
)
```

- Zustand `persist` → localStorage 자동 동기화 + 컴포넌트 자동 리렌더
- 최대 6개 제한
- 순서: 핀 추가 순

---

## 도구 레지스트리 (`bio-tool-registry.ts`)

타입과 레지스트리를 한 파일에 정의:

```typescript
import type { LucideIcon } from 'lucide-react'

// === 타입 ===

type BioToolCategory = 'ecology' | 'fisheries' | 'genetics' | 'methods'

type BioToolInputType = 'csv' | 'fasta' | 'matrix' | 'csv-or-matrix'

interface BioTool {
  id: string
  nameEn: string
  nameKo: string
  category: BioToolCategory
  icon: LucideIcon
  description: string
  inputType: BioToolInputType
  computeType: 'pyodide' | 'api'
  status: 'ready' | 'coming-soon'
}

interface BioToolCategoryMeta {
  id: BioToolCategory
  label: string                 // '군집생태', '수산학' 등
  order: number
}

// === 레지스트리 (static import) ===

const BIO_TOOLS: readonly BioTool[] = [ ... ]
const BIO_TOOL_CATEGORIES: readonly BioToolCategoryMeta[] = [ ... ]
```

- `inputType`에 `'csv-or-matrix'` 추가 — NMDS처럼 CSV와 거리행렬 모두 받는 도구용
- 레지스트리는 static import (16개, 동적 로딩 불필요)
- 도구 추가 시 이 파일만 수정

---

## 섹션 Accent 색상

기존 패턴 확장:

```css
/* globals.css — light */
--section-accent-hub: oklch(0.55 0.20 260);       /* 블루 */
--section-accent-analysis: oklch(0.55 0.15 185);   /* 틸 */
--section-accent-graph: oklch(0.55 0.15 290);      /* 바이올렛 */
--section-accent-bio: oklch(0.55 0.15 145);        /* 그린 — 생물, 자연 */

/* globals.css — dark */
--section-accent-bio: oklch(0.65 0.13 145);
```

허브 카드 뱃지, 헤더 accent bar 등에 사용.

---

## 사이드바 변경

```typescript
// 현재 (2개 항목)
{ href: '/bio-tools', label: 'Bio-Tools', icon: Dna, disabled: true, badge: '예정' },
{ href: '/species-validation', label: '학명 유효성 검증', icon: Microscope, disabled: true, badge: '준비 중' },

// 변경 → 1개로 통합, 활성화
{ href: '/bio-tools', label: 'Bio-Tools', icon: Dna, prefix: '/bio-tools' },
// species-validation 항목 제거 (Barcoding 내부 기능으로 포함)
```

> 이 변경이 정본. PLAN-NCBI-BARCODING.md에서는 "S1에서 처리"로 참조만.

---

## 기존 컴포넌트 재사용 계획

| 필요한 것 | 재사용 대상 | 비고 |
|-----------|------------|------|
| 카드 스타일 | `components/common/card-styles.ts` — `actionCardBase`, `iconContainerMuted`, `staggerContainer` | BioToolCard에 직접 사용 |
| CSV 업로드 로직 | `DataUploadStep.tsx`에서 `useCsvUpload()` 훅 추출 | dropzone + PapaParse + validation 공통화 |
| 결과 내보내기 | `lib/services/export/export-service.ts` | BioResultsSection에서 import |
| 결과 테이블 HTML | `lib/services/paper-draft/paper-tables.ts` — `htmlTable()` | 결과 정리 연동 시 재사용 |
| Pin 패턴 | `lib/utils/pinned-history-storage.ts` — 구조 참고 | Zustand persist로 재구현 |

---

## 아키텍처 결정 사항

### Pyodide 워커 전략

기존 Analysis와 **같은 Pyodide 싱글턴** 공유. `pyodide-core.service.ts` 재사용.
- `callWorkerMethod<T>()` 래퍼로 호출 (기존 패턴)
- `computeType: 'api'`인 도구(Barcoding)는 Pyodide 미사용 → fetch 직접 호출

**Worker 파일 배정**:

| Worker | 파일 | 담당 |
|--------|------|------|
| Worker 1-5 | 기존 (descriptive, hypothesis, anova, regression, survival) | Analysis 43개 |
| Worker 6 | `worker6-fisheries.py` (기존) | VBGF, L-W, Condition Factor |
| Worker 7 | `worker7-ecology.py` (신규) | Alpha, Rarefaction, Beta, NMDS, PERMANOVA, Mantel |
| Worker 8 | `worker8-genetics.py` (신규) | HW, Fst |
| — | Worker 5 재사용 | Survival, ROC (기존 Python 코드 재사용, 새로 작성 안 함) |
| — | 해당 없음 | Meta-Analysis, ICC (numpy/scipy 직접, Worker 7에 포함하거나 별도) |

> Bio-Tools의 Survival/ROC는 **Worker 5의 기존 Python 함수를 재사용**. UI만 Bio-Tools 전용으로 새로 구현.

### Pyodide 로딩 전략 (도구별 분기)

**현재 프리페치 라우트**: `/statistics/*`, `/` (홈) — `PyodidePreloader.tsx`
**변경 필요**: `/bio-tools/*` 라우트에서도 `computeType: 'pyodide'`인 도구 접근 시 프리페치

```
도구 유형별 로딩 동작:

[computeType: 'api'] (Barcoding)
→ Pyodide 로딩 안 함. fetch() → Worker 프록시 → 외부 API.
→ 사용자가 Bio-Tools에서 Barcoding만 쓰면 44MB 다운로드 0.

[computeType: 'pyodide'] (15개 도구)
→ 해당 도구 페이지 진입 시 Pyodide 프리페치 시작
→ "분석 실행" 클릭 시 callWorkerMethod() → 로딩 완료 대기 후 실행
```

**패키지 크기 (네트워크 전송 기준, gzip):**

| 단계 | 크기 | 시점 |
|------|------|------|
| Pyodide 런타임 | ~2MB | 첫 Pyodide 도구 진입 시 |
| NumPy | ~4MB | 같이 로드 |
| SciPy | ~8MB | 같이 로드 |
| scikit-learn | ~5MB | NMDS 또는 ROC 페이지 진입 시 lazy load |
| **합계** | **~14MB (gzip)** | 메모리: ~44MB |

**2회차 방문**: Service Worker 캐시 (`pyodide-cache-v1.1.0`) → **0.3초** 즉시 복원.

**로딩 UX**: 기존 `PyodideLoadingIndicator` 그대로 사용 (우하단 프로그레스 바, 단계별 표시).

### 프리페치 라우트 변경 (S1에서 구현)

```typescript
// PyodidePreloader.tsx — 현재
const PREFETCH_ROUTES = ['/statistics', '/']

// 변경: 레지스트리 기반 판단 (하드코딩 deny-list 아님)
const PREFETCH_ROUTES = ['/statistics', '/']
// /bio-tools 허브는 프리페치 안 함 (카드 브라우징일 뿐)
// /bio-tools/[id] 진입 시 레지스트리 조회:
const toolId = extractToolIdFromPath(pathname)  // 'alpha-diversity' 등
const tool = BIO_TOOLS.find(t => t.id === toolId)
if (tool?.computeType === 'pyodide') {
  // Pyodide 프리페치 시작
} // computeType: 'api'이면 프리페치 안 함 — 자동으로 Barcoding 등 제외
```

> deny-list(`NO_PREFETCH_SUBROUTES`)는 새 API 도구 추가 시 누락 위험. 레지스트리의 `computeType`으로 판단하면 자동 확장.

### scikit-learn lazy load 전략

scikit-learn은 16개 중 2개(NMDS, ROC)만 사용 → 항상 로드하지 않음:

```
/bio-tools/alpha-diversity  → numpy + scipy만 (기본 로드)
/bio-tools/nmds             → numpy + scipy + scikit-learn (lazy 추가)
/bio-tools/roc-auc          → numpy + scipy + scikit-learn (lazy 추가)
```

기존 `prefetchWorkerForMethod()` 패턴 재사용:
- 도구 페이지 진입 시 필요한 패키지 미리 로드
- 레지스트리의 `computeType`과 별도로 `requiredPackages?: string[]` 필드 추가 검토

### 대규모 데이터 가드

Pyodide는 브라우저에서 실행되므로 메모리/시간 제한이 있음:

| 도구 | 위험 시나리오 | 가드 |
|------|-------------|------|
| PERMANOVA | >500지점 × 999순열 | 순열 수 자동 축소 (500→99), 경고 표시 |
| Beta Diversity | >5000지점 | squareform ~200MB → "데이터가 너무 큽니다" 에러 |
| NMDS | >1000지점 | max_iter 자동 축소, 경고 표시 |
| 나머지 13개 | 일반적 사용 범위 | 가드 불필요 |

가드는 Python 코드 내부에서 처리 (UI에 에러 메시지 반환).

### 결과 캐싱

**기본**: 세션 내 휘발 — 페이지 이탈 시 사라짐.
**예외**: 군집생태 도구 간 데이터 전달이 필요한 경우 (Beta Diversity → NMDS/PERMANOVA).

S1에서 `bio-tools-cache-store.ts` (Zustand, persist 없음 = 메모리 전용) 생성:
- Beta Diversity 결과(거리행렬)를 세션 스토어에 캐시
- NMDS/PERMANOVA 진입 시 캐시된 거리행렬 자동 로드 (없으면 직접 업로드)
- PERMANOVA는 추가로 그룹 변수 입력 필요 → UI에서 "그룹 컬럼 선택" 프롬프트 표시
- 탭 닫으면 캐시 소멸 (persist 없음)
- 결과를 영구 보존하려면 `[결과 정리에 추가]`로 PaperDraft에 저장

### 도구 메타데이터 로딩

static import (TypeScript 상수 배열). 16개 도구 메타데이터는 ~2KB — 동적 로딩 불필요.

---

## 구현 순서

| 단계 | 내용 | 상세 계획서 |
|------|------|------------|
| **S0** | 이 계획서 확정 | 이 문서 |
| **S1** | 공통 인프라 | layout, registry, pinned-store, Hub, accent, 사이드바, BioToolShell |
| **S2** | Barcoding (첫 번째 도구) | [PLAN-NCBI-BARCODING.md](PLAN-NCBI-BARCODING.md) |
| **S3** | 유전학 2개 (HW, Fst) | [PLAN-BIO-GENETICS.md](PLAN-BIO-GENETICS.md) |
| **S4** | 군집생태 6개 | [PLAN-BIO-ECOLOGY.md](PLAN-BIO-ECOLOGY.md) |
| **S5** | 수산학 3개 (VBGF, L-W, Condition Factor) | [PLAN-BIO-FISHERIES.md](PLAN-BIO-FISHERIES.md) |
| **S6** | 방법론 4개 (Meta, ROC, ICC, Survival) | [PLAN-BIO-METHODS.md](PLAN-BIO-METHODS.md) |

S1 완료 후 S2~S6은 독립적이므로 순서 유동적.

---

## Analysis와의 관계

- **Analysis** (43개) = 범용 통계 (t-검정, ANOVA, 회귀 등) → Smart Flow
- **Bio-Tools** (16개) = 생물학 전문 도구 → 개별 직접 실행
- **공유하는 것**: Pyodide 인프라, Worker 프록시, 결과 정리(PaperDraft), UI 컴포넌트 (테이블, 차트), ExportService
- **공유하지 않는 것**: Smart Flow 스텝 시스템, 변수 선택 슬롯, AI 메서드 추천

---

## 결과 정리 연동

모든 Bio-Tool 결과는 `PaperDraft`에 추가 가능:

```typescript
interface BioToolResult {
  toolId: string
  toolName: string
  tables: PaperTable[]              // 결과 테이블 (paper-types.ts 재사용)
  chartImageUrl?: string            // 차트 data URL (기존 PaperDraft.chartImageUrl 패턴)
  interpretation?: string           // AI 해석 (Barcoding 등)
  timestamp: string
}
```

> `PaperTable.id` 타입을 `string`으로 확장 필요 — 현재 리터럴 유니온(`'descriptive' | 'test-result' | ...`)이라 Bio-Tools ID 수용 불가.

개별 도구의 `[결과 정리에 추가]` 버튼 → PaperDraft에 섹션 삽입. `htmlTable()` 빌더 재사용.
