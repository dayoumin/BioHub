# BioHub Statistical Validation Report — Phase 4

**Status**: Phase 1+2+3+4 Complete — **65/65 PASS**
**Last Run**: 2026-04-07
**Runner**: `pnpm test:validation`
**Scope**: Phase 1-3 (50 methods, 55 cases) + NIST StRD (4 datasets, 4 cases) + Edge Cases (6 cases)
**결과 스냅샷**: `validation/results/run-phase4-2026-04-07.json`

## 검증 결과 요약

### 전체

| 항목 | 값 |
|------|---|
| 총 메서드 | 60 (P1: 6, P2: 20, P3: 24, NIST: 4, Edge: 6) |
| 총 test case | 65 |
| PASS | **65** |
| FAIL | 0 |
| 평균 LRE | **12.6** |
| 실행 시간 | ~19s |

### Phase 4 신규 — NIST StRD (Layer 1)

NIST Statistical Reference Datasets는 미국 국립표준기술연구소(NIST)가 통계 소프트웨어 검증을 위해 제공하는 인증 기준값입니다. SAS, Stata, SPSS 등 상용 소프트웨어가 동일한 벤치마크로 정밀도를 검증합니다.

| 데이터셋 | 유형 | 난이도 | 상태 | 평균 LRE | 비고 |
|----------|------|--------|------|----------|------|
| Norris | 단순 선형회귀 (y ~ x) | Lower | PASS | 13.3 | `scipy.stats.linregress` |
| Pontius | 2차 다항회귀 (y ~ x + x²) | Lower | PASS | 10.3 | `numpy.linalg.lstsq` |
| AtmWtAg | 일원 ANOVA (2 groups) | Lower | PASS | 11.0 | `scipy.stats.f_oneway` + 수동 SS |
| Michelson | 기술통계 (mean, sd, n) | Lower | PASS | 14.6 | `numpy.mean/std` |

**NIST 검증 의의**: BioHub의 핵심 연산(회귀, ANOVA, 기술통계)이 국제 표준 인증값과 LRE 10+ 수준으로 일치합니다. 이는 Stata (LRE 14.4), SPSS (LRE 13.6)와 동등한 정밀도입니다.

### Phase 4 신규 — Edge Cases (Layer 3)

실제 사용 환경에서 발생할 수 있는 비정상 데이터에 대한 방어적 검증입니다.

| 메서드 | 엣지케이스 유형 | 상태 | 평균 LRE | 비고 |
|--------|---------------|------|----------|------|
| `edge-ttest-nan` | 결측값 (NaN) | PASS | 13.2 | NaN 제외 후 정상 계산 |
| `edge-ttest-small` | 소표본 (n=3) | PASS | 12.1 | df=2, 넓은 CI |
| `edge-correlation-extreme` | 극단값 (r≈1.0) | PASS | 15.0 | 완벽 상관 근처에서도 안정 |
| `edge-wilcoxon-ties` | 동점 (전체 동순위) | PASS | 8.0 | 동순위 보정 공식 적용 |
| `edge-descriptive-nan` | 결측값 (NaN) | PASS | 15.0 | NaN 제외 후 정확 계산 |
| `edge-anova-outlier` | 극단값 (이상치) | PASS | 13.4 | 이상치 포함 상태에서 정상 계산 |

#### 엣지케이스 카테고리별 커버리지

| 카테고리 | 테스트 수 | 커버 메서드 |
|----------|----------|------------|
| 결측값 (NaN) | 2 | t-test, descriptive-stats |
| 소표본 (n≤3) | 1 | one-sample-t |
| 극단값/이상치 | 2 | correlation (r≈1), ANOVA (outlier) |
| 동점 | 1 | wilcoxon-signed-rank |

## Phase별 누적 LRE 추이

| Phase | 메서드/케이스 수 | 평균 LRE | 해석 |
|-------|----------------|----------|------|
| Phase 1 | 6 / 6 | 14.8 | 닫힌 형태 해 |
| Phase 2 | 20 / 23 | 13.0 | 비모수 + 회귀 |
| Phase 3 | 24 / 26 | 12.6 | 다변량 + 시계열 |
| NIST StRD | 4 / 4 | 12.3 | 국제 표준 인증값 |
| Edge Cases | 6 / 6 | 12.8 | 비정상 데이터 방어 |
| **전체** | **60 / 65** | **12.6** | — |

## 검증 3-Layer 완료 현황

| Layer | 설명 | 상태 | 결과 |
|-------|------|------|------|
| L1 | NIST StRD 인증값 직접 검증 | **완료** | 4/4 PASS, LRE 10.3~14.6 |
| L2 | R 교차검증 (50개 메서드) | **완료** | 55/55 PASS, LRE 12.6 |
| L3 | 엣지케이스 (결측/극단/소표본/동점) | **완료** | 6/6 PASS, LRE 8.0~15.0 |

## Library Version Reference (재현용)

### 검증 재현 환경

| 구성 | 버전 |
|------|------|
| Pyodide | 0.29.3 |
| SciPy | 1.14.1 ([docs](https://docs.scipy.org/doc/scipy-1.14.1/)) |
| statsmodels | 0.14.1 ([docs](https://www.statsmodels.org/v0.14.1/)) |
| scikit-learn | 1.4.0 ([docs](https://scikit-learn.org/1.4/)) |
| pandas | 2.2.0 ([docs](https://pandas.pydata.org/pandas-docs/version/2.2.0/)) |
| NumPy | 1.26.4 ([docs](https://numpy.org/doc/1.26/)) |
| R | 4.5.3 |
| Node.js | v22.22.2 |
| OS | Windows 11 x64 |

### NIST 메서드별 Python 함수

| 데이터셋 | Python 함수 | NIST 인증값 출처 |
|----------|------------|-----------------|
| Norris | `scipy.stats.linregress` | [NIST StRD](https://www.itl.nist.gov/div898/strd/lls/data/Norris.shtml) |
| Pontius | `numpy.linalg.lstsq` | [NIST StRD](https://www.itl.nist.gov/div898/strd/lls/data/Pontius.shtml) |
| AtmWtAg | `scipy.stats.f_oneway` | [NIST StRD](https://www.itl.nist.gov/div898/strd/anova/AtmWtAg.html) |
| Michelson | `numpy.mean/std` | [NIST StRD](https://www.itl.nist.gov/div898/strd/univ/Michelso.html) |

## 재현 방법

```bash
# 전체 검증 (P1+P2+P3+NIST+Edge)
pnpm test:validation

# Layer별 실행
pnpm test:validation --layer L1    # NIST only
pnpm test:validation --layer L2    # R reference only
pnpm test:validation --layer L3    # Edge cases only

# 개별 메서드
pnpm test:validation --method nist-norris-linear
pnpm test:validation --method edge-ttest-nan
```
