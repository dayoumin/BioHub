# CLAUDE.md

**현황/로드맵**: [TODO.md](TODO.md) · [ROADMAP.md](ROADMAP.md)

## 프로젝트 개요

**전문가급 통계 분석 플랫폼** (PC웹 + 데스크탑 앱)
- **기술**: Next.js 15 + TypeScript + shadcn/ui + Pyodide + Tauri
- **통계 분석**: Smart Flow (43개 메서드 통합) — 유일한 진입점
- **Bio-Tools**: 12개 생물학 분석 (5페이지) — 별도 섹션 예정
- **데이터 도구**: 2개

## 아키텍처 결정 (CRITICAL)

- **Smart Flow = 통계 분석의 유일한 진입점** (홈 `/` = ChatCentricHub)
- **개별 `/statistics/*` 43개 = 레거시** (코드 유지, 신규 개발 안 함)
- **Bio-Tools = `/bio-tools/` 별도 섹션**

## 핵심 규칙 (CRITICAL)

1. **변수 role 일치**: `variable-requirements.ts`의 `role`을 `types/statistics.ts`에 정확히 반영
2. **타입 단일 정의**: `types/statistics.ts`에만 (페이지별 재정의 금지)
3. **공통 컴포넌트 우선**: StatisticsTable, EffectSizeCard, VariableSelectorModern 등
4. **통계 방법 ID**: `lib/constants/statistical-methods.ts`에서만 정의, 임의 ID 금지
5. **pyodideStats 하이브리드**: 단순=Generated 래퍼, 복잡=callWorkerMethod 직접 호출

상세: [STATISTICS_CODING_STANDARDS.md](stats/docs/STATISTICS_CODING_STANDARDS.md)

## TypeScript (CRITICAL)

- `any` 타입 **절대 금지** → `unknown` + 타입 가드
- 모든 함수에 명시적 타입 (파라미터 + 리턴)
- null/undefined 체크 필수 (early return)
- 옵셔널 체이닝 (`?.`) 적극 사용
- Non-null assertion (`!`) **절대 금지**

## Pyodide 통계 계산 (CRITICAL)

- JS/Python으로 통계 알고리즘 **직접 구현 절대 금지**
- 반드시 검증된 라이브러리 사용 (SciPy, statsmodels, pingouin)
- 직접 구현 시 사용자 사전 승인 필수
- **예외**: 표본 수 계산(power analysis) — 사전분석 도구로 순수 TS 허용. JS 표준 라이브러리 없음, Pyodide 로드 과잉.

## 통계 코딩 표준

- `useStatisticsPage` hook 사용 (currentStep, isAnalyzing, results, error)
- UI 상태는 `useState` 허용
- `useCallback` 모든 이벤트 핸들러에 적용
- **await 패턴** (setTimeout 금지)
- `any` 금지 (unknown + 타입 가드)
- **PyodideCore** 사용: 모든 통계 계산은 검증된 라이브러리
- [TROUBLESHOOTING_ISANALYZING_BUG.md](stats/docs/TROUBLESHOOTING_ISANALYZING_BUG.md) 참조

## 테스트

**Vitest 사용** (globals: true). Mock: `vi.fn()`, `vi.mock()`, `vi.spyOn()`

```bash
pnpm test             # 전체
pnpm test [파일명]    # 특정 파일
pnpm test:watch       # watch 모드
pnpm test:coverage    # 커버리지
```

**테스트 전략**: L1 Store > L2 data-testid > L3 E2E — 상세는 `test-strategy` skill 참조

## 코드 스타일

- 식별자에 이모지 금지
- Next.js 15 App Router (Pages Router 금지)
- shadcn/ui 컴포넌트 우선

## 명명 규칙 요약

- **TS/JS**: camelCase (변수), UPPER_SNAKE (상수), PascalCase (타입/컴포넌트)
- **Python Worker I/O**: 파라미터 + 반환 키 = `camelCase`, 내부 변수 = `snake_case`
- **파일명**: kebab-case (일반), PascalCase (컴포넌트)
- 상세 + 자주 틀리는 표기: `naming-convention` skill 참조

## 품질 워크플로우 요약

수정 → `pnpm tsc --noEmit` → `pnpm test` → 커밋 → (사용자 승인) → 푸시.
상세: `commit-workflow` skill 참조. **AI가 자동 푸시 금지.**

## 개발 명령어

```bash
pnpm dev             # 개발 서버
pnpm build           # 빌드 (Cloudflare Pages)
pnpm test            # 테스트
pnpm tsc --noEmit    # 타입 체크
pnpm setup:pyodide   # Pyodide 다운로드 (200MB, 오프라인용)
```

## 문서 관리

- **TODO.md**: 현황 + 할일
- **ROADMAP.md**: 개발 로드맵
- 분석/검토 문서 새 파일 생성 금지 → TODO.md에 요약
- 배포: Cloudflare Pages (`wrangler.toml` 참조)
