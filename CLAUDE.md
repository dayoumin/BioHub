# CLAUDE.md

**현황/로드맵**: [TODO.md](TODO.md) · [ROADMAP.md](ROADMAP.md) · **디자인**: [.impeccable.md](.impeccable.md) · [DESIGN.md](stats/DESIGN.md)

## 디자인 시스템 참조 (Axiom Slate)

- UI 작업 시 `stats/DESIGN.md` (Precision Editorial 디자인 시스템) 참조 필수
- **No-Line Rule**: border 대신 배경색 톤 변화로 구역 구분
- **Surface Hierarchy**: L1(canvas) → L2(section) → L3(focus) 톤 단계
- **색상 토큰**: Stitch Axiom Slate 기반 (stats/DESIGN.md 참조)
- **Stitch 디자인 원본**: `.stitch/designs/` 폴더 (Step 1~4 HTML/PNG)

## 프로젝트 개요

**전문가급 통계 분석 플랫폼** (PC웹 + 데스크탑 앱)
- **기술**: Next.js 15 + TypeScript + shadcn/ui + Pyodide + Tauri
- **통계 분석**: Analysis (43개 분석 메서드 + 4개 데이터 도구) — 유일한 진입점
- **Bio-Tools**: 16개 생물학 분석 도구 (4카테고리) — 통계 하위 간편 분석
- **데이터 도구**: 2개

## 아키텍처 결정 (CRITICAL)

- **Analysis = 통계 분석의 유일한 진입점** (홈 `/` = ChatCentricHub, 분석 `/analysis`)
- **개별 `/statistics/*` 43개 = 레거시** (코드 유지, 신규 개발 안 함)
- **Bio-Tools = 통계 하위 간편 분석** (`/bio-tools/`). HW/Fst 등 집단 유전학 포함.
- **유전적 분석 = 서열 분석** (`/genetics/`). Bio-Tools 유전학 도구 cross-link.

## 프로젝트 Entity 확장 체크리스트

새 `ProjectEntityKind`를 추가할 때:

1. **타입**: `packages/types/src/project.ts` 유니온에 추가
2. **분기**: `lib/research/entity-resolver.ts`에서 경로 선택 (누락 시 **컴파일 에러**)
   - **Full support**: `EntityKindDescriptors` + `*Like` 인터페이스 + switch case + `entity-loader.ts` `ENTITY_LOADERS`
   - **Generic-only**: `_GENERIC_ONLY_KINDS`에 등록 (다른 수정 불필요)
3. **탭 메타**: `lib/research/entity-tab-registry.ts` (아이콘/라벨)
4. **도메인 저장**: 저장 시 `upsertProjectEntityRef()`, 삭제 시 `removeProjectEntityRefs()`

소비자(`ProjectDetailContent` 등)는 변경 불필요.

## 핵심 규칙 (CRITICAL)

1. **변수 role 일치**: `variable-requirements.ts`의 `role`을 `types/statistics.ts`에 정확히 반영
2. **타입 단일 정의**: `types/statistics.ts`에만 (페이지별 재정의 금지)
3. **공통 컴포넌트 우선**: StatisticsTable, EffectSizeCard, VariableSelectorModern 등
4. **통계 방법 ID**: `lib/constants/statistical-methods.ts`에서만 정의, 임의 ID 금지
5. **pyodideStats 하이브리드**: 단순=Generated 래퍼, 복잡=callWorkerMethod 직접 호출
6. **`ollama-*` 파일 삭제 금지**: Tauri 데스크탑 로컬 LLM 예정 (`lib/services/ollama-*.ts`, `lib/rag/*/ollama-*.ts`). 웹에서는 `useOllamaForRecommendation: false`로 비활성화.

상세: [STATISTICS_CODING_STANDARDS.md](stats/docs/guides/STATISTICS_CODING_STANDARDS.md)

## Bio-Tools 코딩 규칙

- **아키텍처**: [PLAN-BIO-TOOLS-ARCHITECTURE.md](stats/docs/bio-tools/PLAN-BIO-TOOLS-ARCHITECTURE.md) 참조
- **레지스트리 필수**: 도구 추가/수정 시 `lib/bio-tools/bio-tool-registry.ts`만 수정
- **공통 훅**: `useBioToolAnalysis<T>()` 사용 (CSV 업로드 → Pyodide 분석 → 결과 상태)
- **디자인 토큰 필수** (`components/bio-tools/bio-styles.ts`):
  - 섹션 accent: `BIO_HEADER_BORDER`, `BIO_BG_TINT`, `BIO_ICON_BG`, `BIO_ICON_COLOR`
  - 유의성 배지: `SIGNIFICANCE_BADGE.significant/nonSignificant` (하드코딩 green/gray 금지)
  - 테이블 셀: `BIO_TABLE.headerCell/bodyCell` (하드코딩 `px-3 py-2` 금지)
  - 뱃지: `BADGE_BIO_STYLE`
- **차트 색상**: `BIO_CHART_COLORS` (`lib/bio-tools/bio-chart-colors.ts`) — 페이지별 색상 배열 금지
- **공통 컴포넌트**: `BioToolShell` (페이지 래퍼), `BioCsvUpload` (CSV 업로드), `BioToolCard` (허브 카드)
- **Worker**: `PyodideWorker.Ecology` (8번), `PyodideWorker.Fisheries` (7번) — Python 반환 키 camelCase 필수

## TypeScript (CRITICAL)

- `any` 타입 **절대 금지** → `unknown` + 타입 가드
- 모든 함수에 명시적 타입 (파라미터 + 리턴)
- null/undefined 체크 필수 (early return)
- 옵셔널 체이닝 (`?.`) 적극 사용
- Non-null assertion (`!`) **기본 금지** — 예외: 바로 위에서 존재 확인된 경우, 테스트 코드. 대안: `assertDefined()` 유틸 사용

## Pyodide 통계 계산 (CRITICAL)

- 통계 알고리즘은 **검증된 라이브러리 우선** (SciPy, statsmodels, pingouin)
- 라이브러리에 없는 경우 직접 구현 허용 — 참조 구현 기반 + 단위 테스트 필수
- **예외**: power analysis — 순수 TS 허용 (Pyodide 로드 과잉)

## 통계 코딩 표준

- `useStatisticsPage` hook 사용 (currentStep, isAnalyzing, results, error)
- UI 상태는 `useState` 허용
- `useCallback` 모든 이벤트 핸들러에 적용
- **await 패턴** (setTimeout 금지)
- `any` 금지 (unknown + 타입 가드)
- **PyodideCore** 사용: 모든 통계 계산은 검증된 라이브러리
- [TROUBLESHOOTING_ISANALYZING_BUG.md](stats/docs/technical/TROUBLESHOOTING_ISANALYZING_BUG.md) 참조

## Graph Studio 휴리스틱 규칙

- 토큰 사전/필드명 정규화의 단일 소스는 `stats/lib/graph-studio/chart-spec-heuristics.ts`.
- `normalizeFieldName()`은 camelCase와 유니코드 헤더를 모두 분해한다. 토큰 추가/제거 전 `sampleId`, `treatmentGroup`, `샘플ID`, `처리군` 회귀를 먼저 생각할 것.
- 사전은 5종으로 유지: `ID_LIKE`, `CATEGORY_FRIENDLY`, `TIME_LIKE`, `RESPONSE_LIKE`, `PREDICTOR_LIKE`.
- `code`/`index` 같은 일반 토큰은 전역 `ID_LIKE_TOKENS`에 넣지 않는다. 실제 row identifier로 볼 근거가 있을 때만 `hasIdLikeName()` 예외 규칙(예: standalone `index`, `row index`)으로 다룬다.
- X축 nominal/ordinal scorer는 CATEGORY 힌트가 있으면 `_id` 감점을 완화한다. `treatment_id`, `group_index`는 `sample_id`와 동일 취급하면 안 된다.
- Y축 quantitative scorer는 의도적으로 비대칭이다. category-hinted numeric id라도 결과 변수처럼 뽑히지 않도록 ID 페널티를 유지한다.
- auto-color는 `selectAutoColorField()` 기준으로만 고른다. X/Y로 이미 선택된 컬럼은 색상 후보에서 제외하고, low-cardinality ID-like 범주형은 비-ID 대안이 있을 때 버린다.
- 기본 spec 생성은 `createAutoConfiguredChartSpec()` 경로를 공용으로 사용한다. 새 진입점을 만들 때 여기 우회 금지.
- 휴리스틱 수정 시 최소 회귀 범위: `stats/__tests__/lib/graph-studio/chart-spec-heuristics.test.ts`, `stats/__tests__/lib/graph-studio/chart-spec-utils.test.ts`.

## 테스트

**Vitest 사용** (globals: true). Mock: `vi.fn()`, `vi.mock()`, `vi.spyOn()`

```bash
pnpm test             # 전체
pnpm test [파일명]    # 특정 파일
pnpm test:watch       # watch 모드
pnpm test:coverage    # 커버리지
```

**테스트 전략**: L1 Store > L2 data-testid > L3 E2E — 상세는 `test-strategy` skill 참조

**테스트 자동 판단** (코드 작성·수정 시 별도 요청 없이 적용):
- 작성: 순수 함수 / 비동기 가드·경쟁 상태 / 스토어 액션
- 생략: UI 컴포넌트(스토어 표시만) / 외부 API 서비스(mock 비용 > 가치) / 기존 테스트가 간접 커버
- 손으로 재현하기 어려운 타이밍·상태 조합 → 반드시 작성

## 코드 스타일

- 식별자에 이모지 금지
- Next.js 15 App Router (Pages Router 금지)
- shadcn/ui 컴포넌트 우선

## Windows / Codex 인코딩 대응

- Windows PowerShell 출력은 UTF-8 파일도 mojibake로 보일 수 있음. 콘솔에 깨져 보여도 즉시 파일 손상으로 단정하지 말 것.
- 한글/특수문자 포함 파일 확인은 `Get-Content` 출력만 믿지 말고, Python으로 `encoding='utf-8'` 직접 읽기 기준으로 판단할 것.
- 수동 편집은 반드시 `apply_patch` 우선. 특히 JSX 문자열, terminology 사전, 문서 파일은 줄 단위 수정만 허용.
- 이 환경에서는 Codex 번들 `rg.exe`가 WindowsApps 권한 문제로 실행 실패할 수 있다. `rg` 재시도를 반복하지 말고 텍스트 검색은 `git grep`, 비추적 파일 검색은 `Select-String`, 파일 목록은 `git ls-files` 또는 `Get-ChildItem`을 우선 사용할 것.

## 명명 규칙 요약

- **TS/JS**: camelCase (변수), UPPER_SNAKE (상수), PascalCase (타입/컴포넌트)
- **Python Worker I/O**: 파라미터 + 반환 키 = `camelCase`, 내부 변수 = `snake_case`
- **파일명**: kebab-case (일반), PascalCase (컴포넌트)
- 상세 + 자주 틀리는 표기: `naming-convention` skill 참조

## 품질 워크플로우 요약

커밋 요청 시: `pnpm tsc --noEmit` → `pnpm test` → 커밋. **커밋 전에만 검증 — 수정 중 자동 실행 금지.**
상세: `commit-workflow` skill 참조. **AI가 자동 푸시 금지.**

## 개발 명령어

```bash
pnpm dev             # 개발 서버
pnpm build           # 빌드 (Cloudflare Pages)
pnpm test            # 테스트
pnpm tsc --noEmit    # 타입 체크
pnpm setup:pyodide   # Pyodide 다운로드 (200MB, 오프라인용)
```

## 배포 환경

- **플랫폼**: Cloudflare Pages + Workers (Workers Paid $5/월)
- **현재**: Next.js static export (`stats/out/`) → Pages 정적 배포
- **전환 예정**: Workers 기반 동적 배포 (D1/R2/KV 추가) — Phase 16
  - 정적 배포는 일부 기능만 별도로 유지 예정
  - 상세: [PLAN-CLOUDFLARE-BACKEND.md](docs/PLAN-CLOUDFLARE-BACKEND.md)
- **Workers 제한**: 10만 req/일 무료 포함, CPU 10ms/req (유료 50ms)
- **번들**: Pages 정적 파일 용량 제한 없음. 초기 로드 성능 고려
- **Pyodide**: 동적 로드 (초기 번들 미포함), scipy/numpy ~15MB
- **신규 라이브러리 추가 시**: tree-shaking 확인 필수

## 문서 관리

- **TODO.md**: 현황 + 할일
- **ROADMAP.md**: 개발 로드맵
- 분석/검토 문서 새 파일 생성 금지 → TODO.md에 요약
