# Statistical Validation System Design

**Date**: 2026-04-06
**Status**: Draft
**Purpose**: BioHub 47개 통계 계산(43 페이지 메서드 - 2 카테고리 개요 + 6 embedded)의 정확도를 R/NIST 기준으로 종합 검증하고, 증빙을 체계적으로 기록

---

## 1. 배경과 동기

### 현재 상태

BioHub은 SciPy/statsmodels/pingouin 기반 47개 통계 계산을 제공하지만, **���립적 정확도 검���이 부재**하다. (43 페이지 메서드 중 2개는 카테고리 개요로 계산 없음, 6개 embedded 메서드는 별도 페이지 없이 부모 페이지에서 계산)

| 기존 자산 | 한계 |
|-----------|------|
| `statistical-golden-values.json` (1,436줄, 20+카테고리) | SciPy로 생성 → SciPy로 검증 (순환 검증) |
| `STATISTICAL_RELIABILITY_REPORT.md` | "R/SPSS와 6자리 일치" 주장, 실행 증빙 없음 |
| `r-reference-results.ts` | KM/ROC 2개 메서드만 커버 |
| `run-pyodide-golden-tests.mjs` | Node.js Pyodide 실행 가능하나 t-test 일부만 |
| `NIST_VALIDATION_GUIDE.md` | 가이드 문서만, 실행 없음 |
| `vitest.config.ts` exclude | `nist-validation.test.ts` 등 제외 설정 있으나 파일 미존재 |

기존 golden-values의 tolerance가 0.0001 ~ 2.0으로 들쭉날쭉하여 검증 기준이 불명확하다.

### 업계 기준

| 업체 | 방식 |
|------|------|
| **Stata** | NIST StRD 결과 공개, 720만줄 테스트, LRE 점수 보고 |
| **SAS** | 내부 검증 + 수치 정확도 백서 발행 |
| **R** | 릴리스마다 known-data 테스트, R Validation Hub (제약 업계) |
| **SciPy** | NIST 참조 + R 교차검증 (`test_stats.py`) |

공통 패턴: **독립 소스(R/NIST)와의 교차검증 + 결과 공개**

---

## 2. 설계 원칙

### 2.1 검증 3계층

```
Layer 1: NIST StRD (신뢰도 앵커)
  목적: 핵심 메서드에서 국제 표준 통과를 증명
  커버: 기술통계, ANOVA, 선형회귀 (~5-6개 메서드)
  역할: "우리 엔진이 NIST를 통과한다" → 나머지 R 검증의 신뢰 근거

Layer 2: R 교차검증 (주력, 47개 전체)
  목적: 모든 메서드를 독립 소스로 검증
  방법: R 스크립트로 기준값 생성 → BioHub 결과와 비교
  우선순위: R > 교과서/논문값 > GraphPad 등 > SciPy 자체(최후 수단)

Layer 3: 엣지케이스 내성
  목적: 실무 데이터 상황에서 깨지지 않는지 확인
  커버: 결측값, 극단값, 소표본(n<5), 불균형, 동점(ties)
```

### 2.2 허용 오차

소수점 4자리 (0.0001) 통일.

근거:
- SPSS 기본 출력 3자리, R 기본 출력 4자리
- 논문 보고 APA 기준 2~3자리
- R-SPSS 간 차이가 3~4자리 이내
- 0.0001이면 유의수준(0.05, 0.01) 판단에 영향 없음

예외:
- 자유도(df) — 정수 정확 일치
- 매우 작은 p-value (p < 1e-10) — 상대오차 기준 적용

### 2.3 LRE (Log Relative Error) 점수

Stata/NIST 표준 정밀도 지표:

```
LRE = min(15, -log10(|computed - certified| / |certified|))
```

- LRE 15 = 완벽 일치 (15자리)
- LRE 10+ = 우수 (통계 소프트웨어 기대 수준)
- LRE 4+ = 최소 합격 (0.0001 허용 오차에 해당)
- LRE < 4 = 불합격

VALIDATION-REPORT에 메서드별 LRE 점수를 기록하여 정밀도 수준을 투명하게 공개한다.

### 2.4 실행 빈도

- **1회 종합 검증**: Pyodide 실제 로드, 43개 메서드 전체 검증
- **이후 회귀 테스트**: golden value JSON 기반 빠른 비교 (기존 `pnpm test`에 포함)
- **재검증 트리거**: Worker Python 코드 수정, Pyodide 버전 업그레이드, SciPy 버전 변경 시

---

## 3. 산출물 구조

```
stats/validation/
├── VALIDATION-REPORT.md              ← 종합 보고서 (사람이 읽는 문서)
│
├── golden-values/
│   ├── nist/                         ← Layer 1
│   │   ├── norris-linear.json        ← NIST 인증값 + BioHub 결과
│   │   ├── atmwtag-anova.json
│   │   └── ...
│   ├── r-reference/                  ← Layer 2
│   │   ├── t-test.json
│   │   ├── anova.json
│   │   ├── correlation.json
│   │   └── ... (메서드별)
│   └── edge-cases/                   ← Layer 3
│       ├── missing-values.json
│       ├── small-sample.json
│       └── extreme-values.json
│
├── r-scripts/
│   ├── generate-references.R         ← R 기준값 생성 마스터 스크립트
│   └── datasets/                     ← 검증용 원본 데이터 (CSV)
│       ├── nist/                     ← NIST 원본 데이터
│       └── biohub/                   ← BioHub 자체 테스트 데이터
│
├── results/
│   └── run-YYYY-MM-DD.json           ← 실행 증빙 스냅샷
│
└── scripts/
    └── run-validation.mjs            ← Pyodide 검증 실행 스크립트
```

### 3.1 VALIDATION-REPORT.md 구조

```markdown
# BioHub Statistical Validation Report

## 검증 개요
- 검증 일시, 실행 환경 (Pyodide/SciPy/Node.js 버전)
- 검증 범위: 47개 통계 계산
- 기준 소스: R 버전, NIST StRD 버전

## 검증 결과 요약
| 메서드 | Layer | 기준 소스 | 데이터셋 수 | PASS/FAIL | 평균 LRE |
|--------|-------|-----------|-------------|-----------|----------|
| t-test (independent) | L1+L2 | NIST + R 4.3.2 | 5 | PASS | 12.3 |
| anova (one-way) | L1+L2 | NIST + R 4.3.2 | 4 | PASS | 11.8 |
| mann-whitney | L2 | R 4.3.2 | 3 | PASS | 10.5 |
| ... | | | | | |

## Layer 1: NIST StRD 결과
(데이터셋별 상세 — Stata 공개 형식 준용)

## Layer 2: R 교차검증 결과
(메서드별 입력/기대값/실제값/LRE)

## Layer 3: 엣지케이스 결과
(시나리오별 동작 확인)

## 검증 환경
- Pyodide 버전, SciPy 버전, statsmodels 버전
- R 버전, 사용 패키지
- Node.js 버전, OS

## 부록: 데이터셋 출처
(각 데이터의 원본, 라이선스, 크기)
```

### 3.2 Golden Value JSON 형식

```jsonc
{
  "method": "independent-t-test",
  "layer": "L2",
  "referenceSource": {
    "software": "R 4.3.2",
    "function": "stats::t.test",
    "packages": ["stats"]
  },
  "generatedAt": "2026-04-06",
  "tolerance": 0.0001,
  "datasets": [
    {
      "name": "독립표본t검정_암수차이",
      "source": "BioHub test-data",
      "file": "독립표본t검정_암수차이.csv",
      "n": { "group1": 15, "group2": 15 },
      "cases": [
        {
          "description": "Student's t-test (equal variance assumed)",
          "rCode": "t.test(체중 ~ 성별, data=d, var.equal=TRUE)",
          "input": { "groupVar": "성별", "valueVar": "체중", "equalVar": true },
          "expected": {
            "tStatistic": -2.4567,
            "df": 28,
            "pValue": 0.0205,
            "meanDiff": -3.45,
            "ci95Lower": -6.32,
            "ci95Upper": -0.58,
            "cohensD": 0.897
          },
          "lre": {
            "tStatistic": 12.3,
            "pValue": 11.8,
            "meanDiff": 14.2
          }
        }
      ]
    }
  ],
  "edgeCases": [
    {
      "description": "결측값 포함 데이터",
      "input": { "group1": [1, 2, null, 4], "group2": [5, 6, 7, 8] },
      "expectedBehavior": "결측값 자동 제거 후 분석"
    }
  ]
}
```

### 3.3 실행 결과 스냅샷 (증빙)

```jsonc
{
  "runId": "2026-04-06T14:30:00Z",
  "environment": {
    "nodeVersion": "v20.11.0",
    "pyodideVersion": "0.26.4",
    "scipyVersion": "1.14.1",
    "os": "Windows 11"
  },
  "summary": {
    "totalMethods": 47,
    "totalCases": 215,
    "passed": 213,
    "failed": 2,
    "averageLRE": 11.2
  },
  "details": [
    {
      "method": "independent-t-test",
      "dataset": "암수차이",
      "case": "Student's t-test",
      "status": "PASS",
      "expected": { "tStatistic": -2.4567 },
      "actual": { "tStatistic": -2.4567 },
      "lre": { "tStatistic": 14.8 },
      "durationMs": 45
    }
  ]
}
```

---

## 4. 실행 방식

### 4.1 기존 스크립트 확장

`run-pyodide-golden-tests.mjs`를 기반으로 `validation/scripts/run-validation.mjs`를 신규 작성한다.

기존 스크립트의 검증된 패턴 활용:
- `loadPyodide()` → `loadPackage(['numpy', 'scipy'])` → Python 실행
- tolerance 비교 함수 (`isCloseEnough`)
- 컬러 콘솔 출력

개선점:
- 메서드별 모듈화 (파일 분리)
- LRE 계산 추가
- JSON 결과 저장
- 실패 시 상세 diff 출력

### 4.2 실행 명령

```bash
# 1회 종합 검증 (Pyodide 실제 실행, ~10-20분)
pnpm test:validation

# 특정 메서드만
pnpm test:validation -- --method t-test

# 특정 Layer만
pnpm test:validation -- --layer L1

# 결과 보고서 생성
pnpm test:validation -- --report
```

### 4.3 R 기준값 생성 (1회)

```bash
# R이 설치된 환경에서
Rscript stats/validation/r-scripts/generate-references.R

# 출력: stats/validation/golden-values/r-reference/*.json
```

R 스크립트는 기준값 생성 전용이므로, CI나 일상 개발에서 R이 필요하지 않다.

---

## 5. 기존 자산 처리

| 기존 파일 | 처리 |
|-----------|------|
| `statistical-golden-values.json` | Layer 3 seed로 흡수. tolerance 들쭉날쭉 → 0.0001로 재정규화 |
| `r-reference-results.ts` | Layer 2의 KM/ROC golden value로 마이그레이션 |
| `run-pyodide-golden-tests.mjs` | 패턴 참조 후 새 스크립트 작성. 기존 파일은 유지 (기존 테스트 깨뜨리지 않음) |
| `STATISTICAL_RELIABILITY_REPORT.md` | 검증 완료 후 VALIDATION-REPORT.md 링크 추가로 갱신 |
| `NIST_VALIDATION_GUIDE.md` | 참조 문서로 유지 |
| `VERIFICATION_WITHOUT_R.md` | R 기준값 생성 완료 후 역할 축소 — 참조 유지 |
| `vitest.config.ts` exclude 항목 | 파일 미존재 확인됨. 제거하거나 새 파일 경로로 갱신 |

---

## 6. 단계별 진행 계획 (Phase)

### Phase 1: 인프라 + 핵심 메서드 (t-test, ANOVA)

**범위**: 검증 폴더 구조, 실행 스크립트, R 스크립트 기본 틀, t-test 4종 + ANOVA 2종
**데이터**: 기존 BioHub test-data CSV + NIST AtmWtAg (ANOVA)
**산출물**: 6개 메서드 golden value + 실행 결과 JSON + VALIDATION-REPORT 초안

선정 이유:
- 가장 사용 빈도 높은 메서드
- 기존 golden value에 일부 있어 비교 가능
- NIST StRD에 ANOVA 포함 → Layer 1 즉시 시작

포함 메서드:
- `t-test` (independent)
- `welch-t`
- `one-sample-t`
- `paired-t`
- `anova` (one-way)
- `two-way-anova`

### Phase 2: 비모수 + 상관/회귀

**범위**: 비모수 검정 12종 + 상관 2종 + 회귀 7종
**데이터**: BioHub test-data + NIST 선형회귀 (Norris, Pontius)

포함 메서드:
- `mann-whitney`, `wilcoxon`, `kruskal-wallis`, `friedman`
- `sign-test`, `mcnemar`, `cochran-q`, `binomial-test`
- `runs-test`, `ks-test`, `mood-median`
- `correlation`, `partial-correlation`
- `regression`, `logistic-regression`, `poisson`
- `ordinal-regression`, `stepwise`, `dose-response`, `response-surface`

### Phase 3: 카이제곱 + 다변량 + 생존/시계열

**범위**: 나머지 전체
**데이터**: BioHub example-data + 교과서 데이터

포함 메서드:
- `chi-square-goodness`, `chi-square-independence`
- `pca`, `factor-analysis`, `cluster`, `discriminant`
- `kaplan-meier`, `cox-regression`, `roc-curve`
- `arima`, `seasonal-decompose`, `stationarity-test`, `mann-kendall`
- `normality-test`, `reliability`, `proportion-test`
- `repeated-measures-anova`, `ancova`, `manova`, `mixed-model`
- `welch-anova`

### Phase 4: 엣지케이스 + 보고서 완성

**범위**: Layer 3 엣지케이스, VALIDATION-REPORT 완성, 기존 자산 갱신
**엣지케이스 시나리오**:
- 결측값 (NA/null/empty)
- 극단값 (outliers, Inf)
- 소표본 (n=2, n=3)
- 불균형 그룹 (n1=5, n2=50)
- 동점 (ties in nonparametric)
- 완전 분리 (logistic regression)
- 단일 그룹/변수 (에러 핸들링)

---

## 7. 성공 기준

| 기준 | 목표 |
|------|------|
| 계산 커버리지 | 47/47 (100%) |
| Layer 1 (NIST) | 해당 메서드 전수 PASS |
| Layer 2 (R) | 47개 전수 PASS (tolerance 0.0001) |
| Layer 3 (엣지) | 에러 시 의미 있는 메시지 반환, crash 없음 |
| 평균 LRE | 10+ (SciPy 이론 정밀도 ~15 기준) |
| 증빙 완전성 | 모든 결과에 입력/기대값/실제값/LRE 기록 |
| 보고서 | VALIDATION-REPORT.md 완성, Stata 스타일 공개 가능 수준 |

---

## 8. 범위 외 (Out of Scope)

- CI/CD 자동화 (1회 검증 목적, 이후 회귀 테스트는 기존 `pnpm test`)
- Worker Python 코드 수정 (검증만, 버그 발견 시 별도 이슈)
- 새 통계 메서드 추가
- Playwright E2E 검증
- Bio-Tools 16개 도구 (통계 43개만 대상)
