# Playwright E2E 마스터 테스트 계획

> 최종 갱신: 2026-03-13

## 목표

BioHub 통계 플랫폼의 **통계 분석 + 그래프 시각화** 전체를 Playwright로 체계적으로 검증한다.

## 테스트 피라미드

```
                    ┌─────────┐
               Phase 5: 비기능 테스트
              (성능 · 접근성 · 호환성)
                 ┌─────────────┐
            Phase 4: 사용자 관점 (UX) 테스트
           (실사용 시나리오 · 에러 복구 · 온보딩)
              ┌───────────────────┐
         Phase 3: 그래프/시각화 E2E 테스트
        (Graph Studio · 차트 렌더링 · 내보내기)
           ┌───────────────────────┐
      Phase 2: 통계 분석 E2E 테스트 (세부)
     (52개 메서드별 · 변수 셀렉터 · 결과 검증)
        ┌───────────────────────────┐
   Phase 1: Smart Flow 핵심 워크플로우 (기존)
  (업로드 → 방법 선택 → 변수 → 실행 → 결과)
└───────────────────────────────────────┘
```

## Phase 구조

| Phase | 문서 | 목적 | 테스트 수 (예상) |
|-------|------|------|-----------------|
| **1** | [01-ANALYSIS-CORE.md](01-ANALYSIS-CORE.md) | 핵심 워크플로우 (기존 강화) | ~20 |
| **2** | [02-STATISTICAL-METHODS.md](02-STATISTICAL-METHODS.md) | 52개 통계 메서드 개별 검증 | ~60 |
| **3** | [03-GRAPH-VISUALIZATION.md](03-GRAPH-VISUALIZATION.md) | Graph Studio + 차트 렌더링 | ~25 |
| **4** | [04-USER-EXPERIENCE.md](04-USER-EXPERIENCE.md) | 사용자 관점 시나리오 (통계 + 그래프 각각) | ~30 |
| **5** | [05-NON-FUNCTIONAL.md](05-NON-FUNCTIONAL.md) | 비기능 (통계 + 그래프 각각) | ~25 |

**총 예상: ~160 테스트**

### Phase 4·5 내부 구조 (통계/그래프 분리)

Phase 4와 5는 **통계 분석**과 **그래프/시각화**를 각각 독립 Part로 분리:

| Phase | Part A (통계) | Part B (그래프) | Part C (공통) |
|-------|--------------|----------------|--------------|
| **4** | 첫 방문·연속분석·에러복구·내보내기 | 첫 사용·커스터마이징·AI·내보내기 | 내비게이션·세션 |
| **5** | Pyodide성능·키보드·스크린리더 | 렌더링성능·메모리·색각대응 | 페이지로드·에러경계·반응형 |

## 실행 전략

### 빌드 & 서빙
```bash
pnpm build                          # static export → out/
npx serve out -p 3000 -s            # SPA 모드로 서빙
```

### 실행 명령어
```bash
# Phase별 실행
pnpm e2e --grep "@phase1"           # 핵심 워크플로우
pnpm e2e --grep "@phase2"           # 통계 메서드
pnpm e2e --grep "@phase3"           # 그래프/시각화
pnpm e2e --grep "@phase4"           # UX 시나리오
pnpm e2e --grep "@phase5"           # 비기능

# 우선순위별 실행
pnpm e2e --grep "@critical"         # P0: 반드시 통과
pnpm e2e --grep "@important"        # P1: 중요
pnpm e2e --grep "@nice-to-have"     # P2: 선택

# 전체 실행
pnpm e2e                            # 모든 테스트
pnpm e2e:headed                     # 브라우저 표시
```

### 태그 시스템
- `@phase1` ~ `@phase5`: Phase 구분
- `@critical` / `@important` / `@nice-to-have`: 우선순위
- `@smoke`: 빠른 연기 테스트 (5분 내)
- `@slow`: Pyodide 로딩 포함 (2분+)
- `@ai-mock`: OpenRouter API 모킹 필요
- `@data:<method>`: 특정 데이터셋 필요

## 실행 순서 (권장)

```
1. @smoke (5분)       — 기본 동작 확인
2. @phase1 (20분)     — 핵심 워크플로우
3. @phase2 (60분+)    — 통계 메서드 전체
4. @phase3 (15분)     — 그래프/시각화
5. @phase4 (45분)     — UX 시나리오 (통계 25분 + 그래프 15분 + 공통 5분)
6. @phase5 (30분)     — 비기능 테스트 (통계 15분 + 그래프 10분 + 공통 5분)
```

## 파일 구조

```
stats/e2e/
├── docs/                           # 테스트 계획 문서 (이 폴더)
│   ├── 00-MASTER-TEST-PLAN.md
│   ├── 01-ANALYSIS-CORE.md
│   ├── 02-STATISTICAL-METHODS.md
│   ├── 03-GRAPH-VISUALIZATION.md
│   ├── 04-USER-EXPERIENCE.md
│   └── 05-NON-FUNCTIONAL.md
│
├── analysis-e2e.spec.ts          # Phase 1: 핵심 (기존)
├── graph-studio-e2e.spec.ts        # Phase 3: Graph Studio (기존)
├── survival-roc-e2e.spec.ts        # Phase 2: Survival/ROC (기존)
│
├── methods/                        # Phase 2: 통계 메서드별 (신규)
│   ├── t-tests.spec.ts
│   ├── anova.spec.ts
│   ├── regression.spec.ts
│   ├── correlation.spec.ts
│   ├── nonparametric.spec.ts
│   ├── chi-square.spec.ts
│   ├── descriptive.spec.ts
│   ├── multivariate.spec.ts
│   ├── timeseries.spec.ts
│   └── survival.spec.ts
│
├── charts/                         # Phase 3: 차트 검증 (신규)
│   ├── chart-rendering.spec.ts
│   ├── chart-interaction.spec.ts
│   └── chart-export.spec.ts
│
├── ux/                             # Phase 4: UX 시나리오 (신규)
│   ├── statistics-ux.spec.ts       #   Part A: 통계 분석 UX
│   ├── graph-ux.spec.ts            #   Part B: 그래프/시각화 UX
│   └── common-ux.spec.ts           #   Part C: 공통 UX
│
├── nonfunctional/                  # Phase 5: 비기능 (신규)
│   ├── statistics-nonfunctional.spec.ts  # Part A: 통계 비기능
│   ├── graph-nonfunctional.spec.ts       # Part B: 그래프 비기능
│   └── common-nonfunctional.spec.ts      # Part C: 공통 비기능
│
├── helpers/
│   ├── analysis-helpers.ts       # 기존 헬퍼
│   ├── method-test-factory.ts      # 메서드별 테스트 팩토리 (신규)
│   └── chart-helpers.ts            # 차트 검증 헬퍼 (신규)
│
├── selectors.ts                    # 셀렉터 레지스트리
├── fixtures/                       # Playwright fixtures (신규)
│   └── analysis.fixture.ts
│
└── results/                        # 결과 출력
    ├── artifacts/
    ├── reports/
    └── screenshots/
```

## 테스트 데이터

기존 `test-data/e2e/` 활용 (32개 CSV, survival/roc 변형 포함):

| 메서드 | 파일 | 핵심 변수 |
|--------|------|-----------|
| 독립표본 t-검정 | t-test.csv | group, value |
| Welch t-검정 | welch-t.csv | group, value |
| 일표본 t-검정 | one-sample-t.csv | value |
| 대응표본 t-검정 | paired-t.csv | pre, post |
| 일원 분산분석 | anova.csv | group, value |
| 이원 분산분석 | twoway-anova-test.csv | factor1, factor2, value |
| ANCOVA | anova.csv | group, covariate, value |
| 반복측정 | repeated-measures.csv | subject, time, value |
| 상관분석 | correlation.csv | height, weight, age |
| 회귀분석 | regression.csv | study_hours, attendance, score |
| 로지스틱 회귀 | regression.csv | study_hours→independent, pass→dependent |
| 단계적 회귀 | regression.csv | study_hours, attendance→independent, score→dependent |
| 카이제곱 | chi-square-v2.csv | ID, gender, preference, age |
| 기술통계 | descriptive.csv | 다수 |
| Mann-Whitney | mann-whitney.csv | group, value |
| Wilcoxon | wilcoxon.csv | pre, post |
| Kruskal-Wallis | kruskal-wallis.csv | group, value |
| PCA | pca.csv | 다수 |
| 요인분석 | factor-analysis.csv | 다수 |
| 생존분석 | survival.csv | time, event, group |
| 시계열 | timeseries.csv | date, value |
| ROC | roc-diagnostic.csv | score, outcome |

## 성공 기준

| Phase | 기준 | 통과율 |
|-------|------|--------|
| Phase 1 | 핵심 플로우 전체 통과 | 100% |
| Phase 2 | 지원 메서드 85%+ 통과 | 85%+ |
| Phase 3 | 차트 렌더링 + 상호작용 | 90%+ |
| Phase 4 | 주요 UX 시나리오 통과 | 90%+ |
| Phase 5 | 성능 기준 충족 | 80%+ |

## 주의사항

### 포트 불일치 (구현 시 해결 필요)
- `playwright.config.ts`: baseURL = `http://localhost:3000`
- `analysis-e2e.spec.ts`: 기본값 = `http://localhost:3005`
- **해결**: 신규 테스트는 `playwright.config.ts`의 3000 사용, 기존 spec의 3005 하드코딩 제거 필요

### 차트 유형 명칭
- Graph Studio 내부: `boxplot` (계획서의 "box"가 아님)
- 특수 차트: `km-curve`, `roc-curve` (도메인 특화)
- 계획서에서 "pie" 참조 → 실제 지원 여부 확인 필요

## 의존성

- Playwright `@playwright/test` (이미 설치됨)
- 정적 빌드: `pnpm build` → `out/`
- Pyodide: 첫 분석 시 CDN 로드 (~10MB+ 초기화)
- OpenRouter API: AI 추천 테스트 시 모킹 필요
