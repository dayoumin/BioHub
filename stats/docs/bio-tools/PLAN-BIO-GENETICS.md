# Bio-Tools: 유전학 (HW + Fst) 계획서

**작성일**: 2026-03-20
**상태**: 계획 수립
**상위 문서**: [PLAN-BIO-TOOLS-ARCHITECTURE.md](PLAN-BIO-TOOLS-ARCHITECTURE.md) (S3 단계)
**선행**: S1 (공통 인프라) + S2 (Barcoding) 완료 후

---

## 도구 목록

| ID | 한글명 | 영문 | Pyodide 라이브러리 |
|----|--------|------|-------------------|
| `hardy-weinberg` | Hardy-Weinberg 평형 검정 | HW Equilibrium Test | scipy.stats.chisquare |
| `fst` | Fst (집단 분화 지수) | Fixation Index | numpy + scipy (순수 구현) |

---

## 1. Hardy-Weinberg 평형 검정

### 개요

유전자형 빈도가 Hardy-Weinberg 평형에서 벗어났는지 검정. 집단유전학 QC의 기본 단계.

### 입력

```
CSV 형식 (유전자좌별 유전자형 관측 빈도):
locus, AA, Aa, aa
Locus1, 50, 40, 10
Locus2, 30, 55, 15
```

또는 단일 유전자좌:
- 관측 유전자형 수: AA, Aa, aa (직접 입력)

### 계산 방법

**Chi-square 검정** (scipy.stats.chisquare):

```python
import numpy as np
from scipy import stats

def hardy_weinberg_test(observed_AA, observed_Aa, observed_aa):
    """HW 평형 chi-square 검정"""
    n = observed_AA + observed_Aa + observed_aa

    # 대립유전자 빈도 추정
    p = (2 * observed_AA + observed_Aa) / (2 * n)
    q = 1 - p

    # 기대 빈도
    expected_AA = n * p**2
    expected_Aa = n * 2 * p * q
    expected_aa = n * q**2

    observed = [observed_AA, observed_Aa, observed_aa]
    expected = [expected_AA, expected_Aa, expected_aa]

    # chi-square (df=1: 3 카테고리 - 1 추정 파라미터 - 1)
    chi2, p_value = stats.chisquare(observed, expected, ddof=1)

    return {
        "alleleFreqP": float(p),
        "alleleFreqQ": float(q),
        "expectedAA": float(expected_AA),
        "expectedAa": float(expected_Aa),
        "expectedaa": float(expected_aa),
        "chiSquare": float(chi2),
        "pValue": float(p_value),
        "inEquilibrium": bool(p_value > 0.05),
    }
```

**Exact Test** (소표본용, Haldane 1954):
- 표본 크기 < 25일 때 chi-square 대신 사용
- 순수 Python 구현 (snphwe 알고리즘 포팅)

### 출력

| 항목 | 값 |
|------|-----|
| 대립유전자 빈도 (p, q) | 0.70, 0.30 |
| 관측 유전자형 (AA, Aa, aa) | 50, 40, 10 |
| 기대 유전자형 (AA, Aa, aa) | 49.0, 42.0, 9.0 |
| Chi-square | 0.194 |
| p-value | 0.660 |
| 판정 | HW 평형 유지 (p > 0.05) |

### 시각화

- 관측 vs 기대 빈도 막대 차트 (grouped bar)
- 다중 유전자좌: p-value 히트맵

---

## 2. Fst (집단 분화 지수)

### 개요

둘 이상의 집단 간 유전적 분화 정도를 정량화. 0(분화 없음) ~ 1(완전 분화).

### 입력

```
CSV 형식 (집단별 유전자좌 대립유전자 빈도):
population, locus, allele, count
Pop_A, COI, A, 45
Pop_A, COI, B, 55
Pop_B, COI, A, 70
Pop_B, COI, B, 30
```

또는 유전자형 데이터:
```
individual, population, locus1_allele1, locus1_allele2, locus2_allele1, ...
Ind1, Pop_A, A, A, C, T
Ind2, Pop_A, A, B, C, C
```

### 계산 방법

**Weir & Cockerham (1984) 추정량** (표준):

```python
import numpy as np

def weir_cockerham_fst(populations):
    """
    Weir & Cockerham Fst 추정 (다중 집단, 다중 유전자좌)
    populations: list of dicts, 각 집단의 유전자좌별 대립유전자 수
    """
    # 분산 성분 (a, b, c) 계산
    # a = 집단간 분산
    # b = 집단내 개체간 분산
    # c = 개체내 분산
    # Fst = a / (a + b + c)
    # ... (numpy 행렬 연산)
    pass

def hudson_fst(pop1_freqs, pop2_freqs, pop1_n, pop2_n):
    """
    Hudson (1992) Fst — 2집단 쌍별 비교
    Bhatia et al. (2013) 보정 포함
    """
    p1, p2 = pop1_freqs, pop2_freqs
    n1, n2 = pop1_n, pop2_n

    # 집단간 이질성
    numerator = (p1 - p2)**2 - p1*(1-p1)/(n1-1) - p2*(1-p2)/(n2-1)
    # 전체 이질성
    denominator = p1*(1-p2) + p2*(1-p1)

    fst = np.mean(numerator) / np.mean(denominator)  # ratio of averages
    return max(0, fst)  # Fst >= 0
```

**scikit-allel**: Pyodide 미지원 → numpy/scipy 순수 구현.

**부트스트랩 신뢰구간**:
- 유전자좌 기반 resampling (1000회)
- 95% CI 제공

### 출력

| 항목 | 값 |
|------|-----|
| Global Fst | 0.123 |
| 95% CI | [0.089, 0.157] |
| p-value (순열 검정) | 0.001 |

**쌍별 Fst 행렬** (3+ 집단):

| | Pop A | Pop B | Pop C |
|--|-------|-------|-------|
| Pop A | — | 0.05 | 0.12 |
| Pop B | 0.05 | — | 0.08 |
| Pop C | 0.12 | 0.08 | — |

### 시각화

- 쌍별 Fst 히트맵
- Wright (1978) 해석 기준 표시:
  - 0~0.05: 약한 분화
  - 0.05~0.15: 중간 분화
  - 0.15~0.25: 큰 분화
  - 0.25+: 매우 큰 분화

### Fst 해석 가이드 (Wright 1978)

결과 화면에 기준표 상시 표시 — 연구자가 논문에 바로 인용할 수 있도록.

---

## 공통 사항

### Pyodide 의존성

- `numpy` — 행렬 연산 (Pyodide 기본 포함)
- `scipy.stats` — chi-square 검정 (Pyodide 기본 포함)
- scikit-allel, Biopython — Pyodide 미지원, 사용 안 함

### 워커 패턴

기존 Analysis 43개와 동일한 Pyodide 워커 구조:
- `stats/lib/pyodide/workers/bio/` 디렉토리에 Python 코드
- `callWorkerMethod<T>()` 래퍼로 호출
- TypeScript 타입은 `stats/lib/bio-tools/bio-tool-registry.ts`에 정의

### UI 패턴

`BioToolShell` 공통 Shell 위에:
1. 입력 섹션 (BioCsvUpload 재사용)
2. 옵션 (검정 방법 선택 등)
3. 실행 버튼
4. 결과 (BioResultsSection — 테이블 + 차트 + 해석 기준)

### DNA Barcoding과의 연결

Barcoding(S2)에서 종 동정 후 → 같은 데이터로 HW/Fst 분석 가능:
- Barcoding 결과 → "유전학 분석으로 이어가기" 링크 (선택적)
- 직접 진입도 가능 (독립 도구)

---

## 구현 순서

| 단계 | 내용 | 예상 |
|------|------|------|
| G1 | HW 검정 — Python 코드 + 워커 | 0.5일 |
| G2 | HW 검정 — UI (입력 + 결과 + 차트) | 1일 |
| G3 | Fst — Python 코드 (Weir-Cockerham + Hudson) | 1일 |
| G4 | Fst — UI (입력 + 히트맵 + 해석 기준) | 1일 |
| **합계** | | **~3.5일** |
