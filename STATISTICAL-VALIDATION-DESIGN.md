# Statistical Validation System Design

**Date**: 2026-04-06
**Status**: Reviewed (v5)
**성격**: 기존 golden/Pyodide 검증 체계를 **독립 검증 체계로 승격**하는 마이그레이션 설계
**Purpose**: BioHub 47개 통계 계산의 정확도를 R/NIST 기준으로 종합 검증하고, 증빙을 체계적으로 기록

---

## 1. 배경과 동기

### 기존 자산 (승격 대상)

기존 검증 인프라는 상당 수준이다. 이번 작업은 신규 구축이 아닌 **독립 소스 기준 추가 + 정책 정규화**다.

| 자산 | 실제 범위 | 승격 시 할 일 |
|------|-----------|--------------|
| `run-pyodide-golden-tests.mjs` (1,192줄) | **~30개 카테고리**: t-test 4종, ANOVA, 상관 3종, 카이제곱 2종, 비모수 3종, 회귀, 로지스틱, PCA, 군집, 판별, Factor, ARIMA, KM, 효과크기 3종, 분산검정 2종 | R 기준값 비교 레이어 추가, LRE 계산, JSON 증빙 저장 |
| `statistical-golden-values.json` (1,436줄) | 5개 라이브러리 (SciPy/statsmodels/pingouin/sklearn/lifelines), ~99개 테스트 케이스 | R 독립 기준값 병기, tolerance 정책 정규화 |
| `r-reference-results.ts` | KM/ROC R 기준값 | Layer 2 golden value로 마이그레이션 |
| `NIST_VALIDATION_GUIDE.md` | NIST StRD 접근 가이드 | Layer 1 데이터 소싱 참조 |

### 핵심 갭 (이번 작업의 존재 이유)

1. **순환 검증**: golden value가 SciPy로 생성되어 SciPy를 검증 → 독립 소스(R) 기준값 필요
2. **tolerance 비체계**: 0.0001 ~ 2.0 산발적, `{ abs, rel }` 복합 형태 혼재 → 통계량 유형별 정책 필요
3. **증빙 부재**: 실행 결과가 파일로 저장되지 않음 → 재현 가능한 스냅샷 필요
4. **동치성 계약 없음**: Python과 R 간 옵션/알고리즘/seed/NA 처리 차이를 명시하지 않아 비교 의미 불분명

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
  전제: 메서드별 동치성 계약 (부록 A) 에 따라 R 호출 옵션을 Python과 일치시킴
  방법: R 스크립트로 기준값 생성 → BioHub 결과와 비교
  우선순위: R > 교과서/논문값 > GraphPad 등 > SciPy 자체(최후 수단)

Layer 3: 엣지케이스 내성
  목적: 실무 데이터 상황에서 깨지지 않는지 확인
  커버: 결측값, 극단값, 소표본(n<5), 불균형, 동점(ties)
```

### 2.2 허용 오차 정책

단일 tolerance가 아닌 **통계량 유형별 차등 정책**을 적용한다.

기존 러너(`run-pyodide-golden-tests.mjs:75`)가 이미 절대/상대 오차를 함께 지원하므로, 이 구조를 그대로 사용한다.

#### Tier 1: 정확 일치 (exact)

| 대상 | 기준 |
|------|------|
| 자유도 (df) | 정수 정확 일치 |
| 표본 수 (n) | 정수 정확 일치 |
| 순서/범주 결과 | 문자열 정확 일치 |

#### Tier 2: 높은 정밀도 (abs: 0.0001, rel: 1e-6)

| 대상 | 근거 |
|------|------|
| p-value (p > 1e-6) | 유의수준 판단에 영향 없어야 함 |
| 검정통계량 (t, F, chi2, z, U, W, H) | 논문 보고 기준 충분 |
| 상관계수 (r, rho, tau) | 범위 [-1, 1] 내에서 정밀해야 함 |
| 효과크기 (d, g, eta2, omega2) | 해석 기준(small/medium/large)에 영향 없어야 함 |

#### Tier 3: 중간 정밀도 (abs: 0.01, rel: 1e-4)

| 대상 | 근거 |
|------|------|
| 회귀 계수 (coefficients) | 스케일 의존적, 상대오차가 더 의미 있음 |
| 신뢰구간 경계 | 계수와 동일 스케일 |
| AIC/BIC 등 정보 기준 | 비교 목적이므로 상대적 순서가 중요 |

#### Tier 4: 넓은 정밀도 (abs: 0.1, rel: 0.01)

| 대상 | 근거 |
|------|------|
| PCA loadings/explained variance | sklearn vs R의 부호 반전/회전 차이 |
| 클러스터 centroid | 랜덤 초기화 → centroid 수렴값 비교 |
| ARIMA 예측값 | 최적화 알고리즘 차이로 소수점 하위 차이 |
| Dose-response 파라미터 | 비선형 최적화 수렴 차이 |

#### Tier 5: 특수 처리

| 대상 | 정책 |
|------|------|
| p-value < 1e-10 | LRE 비교 (절대오차 무의미한 영역) |
| 기대값 = 0 | 절대오차만 적용: `abs(computed) < 1e-10` (LRE 공식 분모 0 회피) |
| Inf / NaN | 문자열 정확 일치 (`"POSITIVE_INFINITY"`, `"NaN"`) |
| Stepwise 최종 모델 | 모델 동일성 대신 개별 통계량(AIC, R2)만 비교 |

### 2.3 LRE (Log Relative Error) 점수

Stata/NIST 표준 정밀도 지표:

```
certified != 0:  LRE = min(15, -log10(|computed - certified| / |certified|))
certified == 0:  LRE = min(15, -log10(|computed|))  (절대오차 기반 fallback)
```

- LRE 15 = 완벽 일치 (15자리)
- LRE 10+ = 우수 (통계 소프트웨어 기대 수준)
- LRE 4+ = 최소 합격 (Tier 2 허용 오차에 해당)
- LRE < 4 = 불합격 (Tier 2 기준; Tier 3/4 대상은 LRE 2+)

VALIDATION-REPORT에 메서드별 LRE 점수를 기록하여 정밀도 수준을 투명하게 공개한다.

### 2.4 R↔Python 파라미터 차이

R 스크립트 작성 시 Python과 동일한 파라미터를 명시해야 결과가 일치한다. 기본값이 다른 경우를 아래에 정리한다. **상세 매핑은 부록 A (메서드별 Target Matrix) 참조.**

아래 표는 라이브러리 기본값이 아닌 **실제 BioHub worker 코드 경로** 기준이다. 동일 메서드라도 worker마다 옵션이 다를 수 있으므로 검증 대상 worker path를 명시한다.

**높은 위험 (기본값 불일치 → 결과 완전히 다름)**

| 메서드 | BioHub worker 실제 호출 | R 기본값 | R 스크립트에서 맞출 값 |
|--------|------------------------|----------|----------------------|
| Chi-square 2x2 | `worker2: chi_square_independence_test(yatesCorrection=False)` | Yates ON (`correct=TRUE`) | `chisq.test(..., correct=FALSE)` |
| ANOVA (다원) | `worker3: ols()+anova_lm(typ=2)` — Type II SS | Type I SS (sequential) | `car::Anova(..., type=2)` |
| K-means 클러스터링 | `worker3: KMeans(random_state=42)` | `set.seed()` 별도 | seed 고정 + centroid 수렴값만 비교 |
| Stepwise 회귀 | `worker4: p-value 기준 forward/backward` | AIC 기준 (`step()`) | 동일 모델 강제하거나 개별 통계량만 비교 |

**중간 위험 (알고리즘 차이 또는 워커 간 불일치)**

| 메서드 | BioHub worker 실제 호출 | 차이 원인 | 대응 |
|--------|------------------------|-----------|------|
| Levene 검정 | **worker2**: `stats.levene(*groups)` (center 미지정=mean) **vs** **worker3**: `stats.levene(*groups, center='median')` | 같은 이름, 두 경로가 다른 center | 검증 대상 경로 명시. worker2→R `levene.test(center="mean")`, worker3→R `levene.test(center="median")` |
| Wilcoxon signed-rank | `worker3: stats.wilcoxon(x, y)` | ties/zeros 처리 방식 차이 | ties-free 데이터 우선, ties 데이터는 Tier 3 |
| Mann-Whitney | `worker3: stats.mannwhitneyu(x, y, alternative='two-sided')` | 연속성 보정 차이 가능 | `wilcox.test(..., correct=FALSE)` |
| Dose-response | `worker4: scipy.optimize.curve_fit()` | 비선형 최적화 알고리즘 차이 | 수렴값 상대오차, Tier 4 |

**경로별 계약 필요 (단순히 "낮은 위험"으로 묶을 수 없음)**

| 메서드 | BioHub worker 실제 호출 | 주의사항 | Tier |
|--------|------------------------|----------|------|
| KM 생존분석 | `worker5: kaplan_meier_analysis()` — **scipy 기반, lifelines 불사용** | R `survival::survfit`과 직접 비교 가능하나, 자체 구현이므로 edge case(동시 사건, 전원 중도절단) 별도 검증 | tier2 (표준 케이스), tier3 (edge case) |
| KM (Generated) | `pyodide-statistics.ts: kaplanMeierSurvival()` — Generated 래퍼 경로 | worker5와 **별도 경로** — 둘 다 검증 대상 | tier2 |
| Cox 회귀 | `worker5: cox_regression()` — statsmodels PHReg | R `survival::coxph`와 직접 대응이나 PH 가정 위반 데이터에서 차이 가능 | tier2 (표준), tier3 (edge) |
| ARIMA | `worker4: ARIMA().fit()` — statsmodels | R `stats::arima()` — 최적화/초기값 차이로 파라미터 추정치 소수점 하위 차이 | tier3 (계수), tier2 (p-value) |

**낮은 위험 (직접 대응, 워커 경로 단일)**

t-test 전종, Pearson/Spearman 상관, 카이제곱 적합도, Fisher 정확, Shapiro-Wilk 등. 이들은 scipy 함수를 단일 경로로 호출하며 R과 동일한 알고리즘을 사용한다.

### 2.5 실행 빈도

- **1회 종합 검증**: Pyodide 실제 로드, 47개 메서드 전체 검증
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
| anova (one-way) | L1+L2 | NIST AtmWtAg + R 4.3.2 | 4 | PASS | 11.8 |
| regression (linear) | L1+L2 | NIST Norris + R 4.3.2 | 3 | PASS | 13.2 |
| t-test (independent) | L2 | R 4.3.2 | 5 | PASS | 12.3 |
| mann-whitney | L2 | R 4.3.2 | 3 | PASS | 10.5 |
| ... | | | | | |

## Layer 1: NIST StRD 결과
(데이터셋별 상세 — Stata 공개 형식 준용)

## Layer 2: R 교차검증 결과
(메서드별 입력/기대값/실제값/LRE)

## Layer 3: 엣지케이스 결과
(시나리오별 동작 확인)

## 검증 환경
- Pyodide 0.29.3, SciPy 1.14.1, statsmodels 0.14.1, sklearn 1.4.0, lifelines 0.28.0
- R 4.3.2, 패키지: stats, car, MASS, survival, trend, drc, psych
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
  "equivalenceContract": {
    "pythonCall": "scipy.stats.ttest_ind(g1, g2, equal_var=True)",
    "rCall": "t.test(g1, g2, var.equal=TRUE)",
    "knownDifferences": "none",
    "toleranceTier": "tier2"
  },
  "generatedAt": "2026-04-06",
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
          "expected": {
            "tStatistic": { "value": -2.4567, "tier": "tier2" },
            "df": { "value": 28, "tier": "exact" },
            "pValue": { "value": 0.0205, "tier": "tier2" },
            "meanDiff": { "value": -3.45, "tier": "tier3" },
            "ci95Lower": { "value": -6.32, "tier": "tier3" },
            "ci95Upper": { "value": -0.58, "tier": "tier3" },
            "cohensD": { "value": 0.897, "tier": "tier2" }
          }
        }
      ]
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
    "pyodideVersion": "0.29.3",
    "scipyVersion": "1.14.1",
    "os": "Windows 11"
  },
  "tolerancePolicy": "tiered (exact/tier2/tier3/tier4/special)",
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
      "tier": "tier2",
      "lre": { "tStatistic": 14.8 },
      "durationMs": 45
    }
  ]
}
```

---

## 4. 실행 방식

### 4.1 기존 스크립트 확장

`run-pyodide-golden-tests.mjs`를 **직접 확장**한다 (별도 스크립트 신규 작성이 아닌 기존 러너 업그레이드).

기존 스크립트의 검증된 패턴 (그대로 유지):
- `loadPyodide()` → `loadPackage(...)` → Python 실행
- tolerance 비교 함수 (`isCloseEnough` — abs/rel 복합 지원)
- 컬러 콘솔 출력
- Infinity/NaN 정규화

추가할 것:
- R golden value JSON 로드 → SciPy 결과와 비교하는 레이어
- Tier별 tolerance 자동 적용
- LRE 계산 + JSON 결과 저장
- Worker .py 파일 로드 → 함수 직접 호출 (scipy 직접 호출 대신)
- `helpers.py` 모듈 등록 (pyodide-worker.ts 패턴 참조)

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
| `run-pyodide-golden-tests.mjs` | **직접 확장** — R 비교 레이어 + LRE + JSON 증빙 추가 |
| `statistical-golden-values.json` | 기존 SciPy 케이스 유지 + R 독립 기준값 병기. tolerance를 Tier 정책으로 재태깅 |
| `r-reference-results.ts` | Layer 2의 KM/ROC golden value JSON으로 마이그레이션 |
| `STATISTICAL_RELIABILITY_REPORT.md` | 검증 완료 후 VALIDATION-REPORT.md 링크로 갱신 |
| `NIST_VALIDATION_GUIDE.md` | 참조 문서로 유지 |
| `VERIFICATION_WITHOUT_R.md` | R 기준값 생성 완료 후 역할 축소 — 참조 유지 |
| `vitest.config.ts` exclude 항목 | 4개 검증 테스트 파일(`r-spss-validation`, `nist-validation` 등)이 exclude됨. 검증 완료 후 include 여부 결정 |

---

## 6. 데이터 가용성 현황

### 데이터 충분 (21개) — 즉시 검증 가능

기존 `test-data/`, `example-data/`에 검증급 CSV 존재:

t-test, welch-t, one-sample-t, paired-t, anova, two-way-anova, welch-anova, mann-whitney, wilcoxon, kruskal-wallis, correlation, regression, logistic-regression, chi-square-independence, pca, cluster, kaplan-meier, cox-regression, roc-curve, normality-test, repeated-measures-anova

### e2e만 존재 (24개) — 외부 데이터 소싱 필요

자동생성 테스트 데이터만 존재하여 검증 기준으로 부적합. R 내장 데이터셋 또는 교과서 데이터로 교체 필요:

friedman, sign-test, mcnemar, cochran-q, binomial-test, runs-test, ks-test, mood-median, poisson, ordinal-regression, dose-response, response-surface, chi-square-goodness, factor-analysis, discriminant, arima, seasonal-decompose, stationarity-test, manova, mixed-model, proportion-test, reliability, stepwise, partial-correlation

**소싱 전략**: R 내장 데이터셋 (`datasets::`, `MASS::`, `survival::`) 또는 통계 교과서 공개 데이터 활용. R 스크립트에서 데이터 + 기준값을 함께 생성.

### 완전 갭 (2개) — 데이터 신규 생성 필요

| 메서드 | 상황 | 소싱 계획 |
|--------|------|-----------|
| `mann-kendall` | 전용 CSV 없음 | 환경과학 시계열 데이터 (R `trend::mk.test` 예제) |
| `ancova` | 부적합 데이터만 존재 | R `datasets::ToothGrowth` 또는 교과서 데이터 |

---

## 7. 단계별 진행 계획 (Phase)

### Phase 0: R 기준값 생성 (선행 조건)

**범위**: R 스크립트 작성 + 실행 → golden value JSON 생성
**선행 이유**: Pyodide 검증 실행 전에 비교 대상(기준값)이 먼저 존재해야 함
**산출물**: `validation/golden-values/r-reference/*.json` + `validation/golden-values/nist/*.json`

작업:
1. 부록 A (메서드별 Target Matrix) 확정 — 동치성 계약 기반
2. R 스크립트 작성 (`generate-references.R`) — 47개 메서드별 R 함수 호출 + JSON 출력
3. NIST StRD 데이터셋 다운로드 (Norris, Pontius, AtmWtAg 등)
4. 데이터 갭 21+3건 소싱 — R 내장 데이터셋 활용
5. R 스크립트 실행 → JSON 파일 커밋

**환경**: R 4.3+ (로컬 1회 실행 후 JSON 커밋, 이후 R 불필요)

### Phase 1: 인프라 + 핵심 메서드 (t-test, ANOVA)

**범위**: 기존 러너 확장, Tier 정책 구현, t-test 4종 + ANOVA 2종 R 교차검증
**데이터**: 기존 BioHub test-data CSV + NIST AtmWtAg (ANOVA)
**산출물**: 6개 메서드 R 교차검증 완료 + 실행 결과 JSON + VALIDATION-REPORT 초안

포함 메서드:
- `t-test` (independent), `welch-t`, `one-sample-t`, `paired-t`
- `anova` (one-way), `two-way-anova`

### Phase 2: 비모수 + 상관/회귀

**범위**: 비모수 검정 11종 + 상관 2종 + 회귀 7종
**데이터**: BioHub test-data + NIST 선형회귀 (Norris, Pontius) + R 내장 데이터

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

## 8. 성공 기준

| 기준 | 목표 |
|------|------|
| 계산 커버리지 | 47/47 (100%) |
| Layer 1 (NIST) | 해당 메서드 전수 PASS (ANOVA, 선형회귀, 기술통계) |
| Layer 2 (R) | 47개 전수 PASS (Tier별 허용 오차 적용) |
| Layer 3 (엣지) | 에러 시 의미 있는 메시지 반환, crash 없음 |
| 평균 LRE | Tier 2 대상: 10+, Tier 3 대상: 6+, Tier 4 대상: 4+ |
| 증빙 완전성 | 모든 결과에 입력/기대값/실제값/Tier/LRE 기록 |
| 보고서 | VALIDATION-REPORT.md 완성, Stata 스타일 공개 가능 수준 |

---

## 9. 범위 외 (Out of Scope)

- CI/CD 자동화 (1회 검증 목적, 이후 회귀 테스트는 기존 `pnpm test`)
- Worker Python 코드 수정 (검증만, 버그 발견 시 별도 이슈)
- 새 통계 메서드 추가
- Playwright E2E 검증
- Bio-Tools 16개 도구 (통계 47개만 대상)

---

## 부록 A: 메서드별 Target Matrix (동치성 계약)

Phase 0에서 확정하며, 각 메서드에 대해 아래 필드를 정의한다.

| 필드 | 설명 |
|------|------|
| `methodId` | BioHub 메서드 ID (`statistical-methods.ts` 기준) |
| `layer` | L1 (NIST), L2 (R), 또는 L1+L2 |
| `pythonLib` | 사용 라이브러리 + 버전 (e.g., `scipy 1.14.1`) |
| `pythonCall` | 정확한 Python 함수 호출 (파라미터 포함) |
| `rPackage` | R 패키지 + 버전 |
| `rCall` | 정확한 R 함수 호출 (Python과 일치하도록 옵션 명시) |
| `knownDifferences` | 알려진 차이 (ties, seed, optimizer 등) |
| `toleranceTier` | exact / tier2 / tier3 / tier4 |
| `outputFields` | 비교할 출력 필드 목록 (각각의 Tier) |
| `nistDataset` | (Layer 1만) NIST 데이터셋 이름 |

### 예시 (Phase 1 메서드)

```
| methodId | layer | pythonCall | rCall | toleranceTier | knownDifferences |
|----------|-------|-----------|-------|---------------|-----------------|
| t-test | L2 | ttest_ind(g1,g2, equal_var=True) | t.test(g1,g2, var.equal=TRUE) | tier2 | none |
| welch-t | L2 | ttest_ind(g1,g2, equal_var=False) | t.test(g1,g2) | tier2 | none (R default=Welch) |
| one-sample-t | L2 | ttest_1samp(x, popmean) | t.test(x, mu=popmean) | tier2 | none |
| paired-t | L2 | ttest_rel(x, y) | t.test(x, y, paired=TRUE) | tier2 | none |
| anova | L1+L2 | f_oneway(*groups) | aov(y~factor(g)) | tier2 | none |
| two-way-anova | L2 | ols()+anova_lm(typ=2) | car::Anova(type=2) | tier2 | SS Type 명시 필수 |
| levene (worker2) | L2 | stats.levene(*groups) | leveneTest(center="mean") | tier2 | center 미지정=mean (기본값) |
| levene (worker3) | L2 | stats.levene(*groups, center='median') | leveneTest(center="median") | tier2 | worker2와 다른 center — 경로별 별도 검증 |
```

전체 47개 메서드의 Target Matrix는 Phase 0 작업 시 완성하여 별도 JSON 파일로 관리한다.
(`stats/validation/method-target-matrix.json`)
