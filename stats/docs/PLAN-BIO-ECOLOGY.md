# Bio-Tools: 군집생태 (6개) 계획서

**작성일**: 2026-03-20
**상태**: 계획 수립
**상위 문서**: [PLAN-BIO-TOOLS-ARCHITECTURE.md](PLAN-BIO-TOOLS-ARCHITECTURE.md) (S4 단계)

---

## 도구 목록

| ID | 한글명 | 영문 | Pyodide 라이브러리 |
|----|--------|------|-------------------|
| `alpha-diversity` | 생물다양성 지수 | Shannon, Simpson, Margalef, Pielou | scipy.stats.entropy + numpy |
| `rarefaction` | 종 희박화 곡선 | Rarefaction Curve | scipy.special.comb (log-space) |
| `beta-diversity` | 베타 다양성 거리행렬 | Bray-Curtis, Jaccard, Sorensen | scipy.spatial.distance |
| `nmds` | NMDS | Non-metric MDS | scikit-learn MDS |
| `permanova` | PERMANOVA | Permutational MANOVA | numpy + scipy ⚠️ 직접 구현 |
| `mantel-test` | Mantel 검정 | Mantel Test | numpy + scipy ⚠️ 직접 구현 |

> **⚠️ CLAUDE.md 규칙 예외**: scikit-bio(skbio)는 Pyodide 미지원.
> PERMANOVA, Mantel은 검증된 라이브러리가 없어 numpy/scipy 기반 직접 구현 불가피.
> **구현 시 반드시**: (1) 논문 레퍼런스 기반 검증, (2) 알려진 테스트 데이터셋으로 교차 검증 필수.
> Alpha Diversity는 `scipy.stats.entropy` 활용으로 직접 구현 최소화.

---

## 공통 입력 형식

군집생태 6개 도구는 모두 **종×지점 행렬** (abundance matrix)을 입력으로 사용:

```csv
site, Species_A, Species_B, Species_C, Species_D
Site1, 10, 5, 0, 3
Site2, 8, 12, 4, 0
Site3, 0, 3, 15, 7
Site4, 6, 0, 2, 11
```

- 행 = 지점(site/sample)
- 열 = 종(species)
- 값 = 개체수(abundance) 또는 출현(presence: 0/1)

`BioCsvUpload` 공통 컴포넌트로 업로드 → 6개 도구가 같은 데이터 공유 가능.

---

## 1. Alpha Diversity (생물다양성 지수)

### 계산

```python
import numpy as np
from scipy.stats import entropy

def alpha_diversity(counts):
    """counts: 한 지점의 종별 개체수 배열"""
    counts = np.array(counts, dtype=float)
    counts = counts[counts > 0]  # 0 제거
    N = counts.sum()
    S = len(counts)

    if S == 0 or N == 0:
        raise ValueError("No species with abundance > 0")

    pi = counts / N

    # Shannon: scipy.stats.entropy 사용 (검증된 라이브러리)
    shannon = entropy(counts, base=np.e)        # H' (자연로그)
    simpson_d = float(np.sum(pi**2))             # D (dominance)
    simpson_div = 1 - simpson_d                  # 1-D (diversity)
    simpson_rec = 1 / simpson_d if simpson_d > 0 else float('inf')  # 1/D
    margalef = (S - 1) / np.log(N) if N > 1 else 0.0               # d
    pielou = shannon / np.log(S) if S > 1 else 0.0                 # J'

    return {
        "speciesRichness": int(S),
        "totalAbundance": float(N),
        "shannonH": float(shannon),
        "simpsonDominance": simpson_d,
        "simpsonDiversity": float(simpson_div),
        "simpsonReciprocal": float(simpson_rec),
        "margalef": float(margalef),
        "pielou": float(pielou),
    }
```

### 출력

지점별 지수 테이블 + 지수 비교 막대 차트.

---

## 2. Rarefaction (종 희박화 곡선)

### 계산

Hurlbert (1971) 공식 — log-space로 계산하여 대규모 N 오버플로 방지:

```python
from scipy.special import gammaln

def _log_comb(n, k):
    """log-space 이항계수 — 대규모 N에서도 오버플로 없음"""
    return gammaln(n + 1) - gammaln(k + 1) - gammaln(n - k + 1)

def rarefaction(counts, n_steps=50):
    """counts: 한 지점의 종별 개체수"""
    counts = np.array(counts, dtype=int)
    counts = counts[counts > 0]
    N = int(counts.sum())
    S = len(counts)

    if S == 0 or N == 0:
        raise ValueError("No species with abundance > 0")

    steps = np.unique(np.linspace(1, N, n_steps, dtype=int))
    expected_species = []

    for n in steps:
        # E(S_n) = S - sum_i( exp(log_comb(N-Ni, n) - log_comb(N, n)) )
        log_c_total = _log_comb(N, n)  # 루프 밖에서 1회 캐시
        es = S - sum(
            np.exp(_log_comb(N - ni, n) - log_c_total)
            for ni in counts if N - ni >= n
        )
        expected_species.append(float(es))

    return {"steps": steps.tolist(), "expectedSpecies": expected_species}
```

### 출력

- X축: 개체 수 (subsample size)
- Y축: 기대 종 수
- 지점별 곡선 오버레이 — 곡선이 평탄해지면 샘플링 충분

---

## 3. Beta Diversity (베타 다양성 거리행렬)

### 계산

```python
from scipy.spatial.distance import pdist, squareform

def beta_diversity(matrix, metric='braycurtis'):
    """
    matrix: 종×지점 abundance matrix (numpy 2D array)
    metric: 'braycurtis' | 'jaccard' | 'sorensen'
    """
    if metric == 'sorensen':
        # Sorensen = binary Bray-Curtis
        binary = (matrix > 0).astype(float)
        dist = pdist(binary, metric='braycurtis')
    else:
        dist = pdist(matrix, metric=metric)

    # condensed form 보존, 시각화 시에만 squareform 변환
    return {
        "condensed": dist.tolist(),
        "squareform": squareform(dist).tolist(),
        "labels": None,  # UI에서 지점명 매핑
    }
```

> **메모리 주의**: >5,000 지점 시 squareform이 ~200MB 소요. UI에서 lazy 변환 권장.

### 출력

- 거리행렬 테이블 (지점 × 지점)
- 히트맵 시각화
- NMDS/PERMANOVA 입력으로 바로 전달 가능 (연결 동선)

---

## 4. NMDS (Non-metric Multidimensional Scaling)

### 계산

```python
from sklearn.manifold import MDS

def nmds(distance_matrix, n_components=2, max_iter=150, random_state=42):
    """
    distance_matrix: 지점간 거리행렬 (beta diversity 결과)
    max_iter: 150 (Pyodide 성능 고려, 보통 50-100회 수렴)
    """
    mds = MDS(
        n_components=n_components,
        metric=False,  # non-metric
        dissimilarity='precomputed',
        max_iter=max_iter,
        random_state=random_state,
    )
    coords = mds.fit_transform(distance_matrix)
    stress = mds.stress_

    return {
        "coordinates": coords.tolist(),
        "stress": float(stress),
        "stressInterpretation": (
            "excellent" if stress < 0.05 else
            "good" if stress < 0.1 else
            "fair" if stress < 0.2 else
            "poor"
        ),
    }
```

### 출력

- 2D 산점도 (지점 좌표, 그룹별 색상)
- Stress 값 표시 + 해석 기준
- 95% 신뢰 타원 (그룹별)

---

## 5. PERMANOVA

> **⚠️ 직접 구현** — scikit-bio Pyodide 미지원. Anderson (2001) 논문 기반.
> 구현 후 R `vegan::adonis2()` 결과와 교차 검증 필수.

### 계산

```python
import numpy as np

def permanova(distance_matrix, grouping, permutations=999):
    """
    Anderson (2001) PERMANOVA
    Ref: Anderson, M.J. (2001) Austral Ecology, 26, 32-46.
    distance_matrix: n×n 거리행렬
    grouping: 지점별 그룹 레이블 (길이 n)
    """
    n = len(grouping)
    groups = np.unique(grouping)
    a = len(groups)

    D2 = distance_matrix ** 2

    # SS_total
    ss_total = np.sum(D2) / (2 * n)

    # 그룹별 인덱스 사전 계산 (순열 루프 밖)
    def calc_ss_within(labels):
        ss_w = 0.0
        for g in groups:
            idx = np.where(labels == g)[0]
            ng = len(idx)
            ss_w += np.sum(D2[np.ix_(idx, idx)]) / (2 * ng)
        return ss_w

    ss_within = calc_ss_within(grouping)
    ss_between = ss_total - ss_within

    # Pseudo-F
    f_stat = (ss_between / (a - 1)) / (ss_within / (n - a))

    # 순열 검정
    f_perms = np.zeros(permutations)
    for i in range(permutations):
        perm = np.random.permutation(grouping)
        ss_w_perm = calc_ss_within(perm)
        ss_b_perm = ss_total - ss_w_perm
        f_perms[i] = (ss_b_perm / (a - 1)) / (ss_w_perm / (n - a))

    p_value = float((np.sum(f_perms >= f_stat) + 1) / (permutations + 1))
    r_squared = float(ss_between / ss_total)

    return {
        "pseudoF": float(f_stat),
        "pValue": p_value,
        "rSquared": r_squared,
        "permutations": permutations,
        "ssBetween": float(ss_between),
        "ssWithin": float(ss_within),
        "ssTotal": float(ss_total),
    }
```

> **Pyodide 성능 노트**: 100지점 × 999순열 ≈ 수초.
> 지점 >200개 시 순열 수를 99로 자동 축소하는 가드 권장.

### 출력

| 항목 | 값 |
|------|-----|
| Pseudo-F | 4.52 |
| p-value | 0.001 |
| R² | 0.312 |
| 순열 수 | 999 |

---

## 6. Mantel Test

> **⚠️ 직접 구현** — scikit-bio Pyodide 미지원.
> 구현 후 R `vegan::mantel()` 결과와 교차 검증 필수.
> p-value는 **양측 검정** (|r_perm| >= |r_obs|).

### 계산

```python
import numpy as np
from scipy import stats

def mantel_test(matrix_x, matrix_y, permutations=999, method='pearson'):
    """
    두 거리행렬 간 상관 검정 (양측)
    matrix_x, matrix_y: n×n 거리행렬
    method: 'pearson' | 'spearman'
    """
    n = matrix_x.shape[0]

    # 상삼각 요소 1회 추출
    tri_idx = np.triu_indices(n, k=1)
    x = matrix_x[tri_idx]
    y = matrix_y[tri_idx]

    # 관측 상관계수
    corr_fn = stats.pearsonr if method == 'pearson' else stats.spearmanr
    r_obs, _ = corr_fn(x, y)

    # 순열 검정 — 행/열 동시 순열, 벡터만 재추출
    r_perms = np.zeros(permutations)
    for i in range(permutations):
        perm = np.random.permutation(n)
        y_perm = matrix_y[np.ix_(perm, perm)][tri_idx]
        r_perms[i], _ = corr_fn(x, y_perm)

    p_value = float((np.sum(np.abs(r_perms) >= np.abs(r_obs)) + 1) / (permutations + 1))

    return {
        "r": float(r_obs),
        "pValue": p_value,
        "permutations": permutations,
        "method": method,
    }
```

### 출력

| 항목 | 값 |
|------|-----|
| Mantel r | 0.42 |
| p-value (양측) | 0.003 |
| 방법 | Pearson |

- 산점도: 거리행렬 X vs Y (상삼각 요소)

---

## Pyodide 의존성 요약

| 패키지 | 용도 | Pyodide 지원 |
|--------|------|-------------|
| numpy | 모든 행렬 연산 | O (기본) |
| scipy.stats | entropy, 상관계수 | O (기본) |
| scipy.spatial.distance | 거리행렬 (pdist, squareform) | O (기본) |
| scipy.special | gammaln (rarefaction log-space) | O (기본) |
| scikit-learn | MDS (NMDS) | O (기본) |
| scikit-bio | — | **X** (사용 안 함) |

> **구현 전 확인 필요**: Pyodide에서 `from sklearn.manifold import MDS` import 성공 여부.
> scikit-learn은 Pyodide 기본 포함이지만 일부 서브모듈 누락 가능.

---

## 도구 간 연결 동선

```
Alpha Diversity  →  "샘플링 충분한가?" →  Rarefaction
                                           ↓
Beta Diversity  ←───────────────────────── (같은 데이터)
     ↓
     ├── "시각화" → NMDS (condensed → squareform 변환)
     └── "검정"  → PERMANOVA (squareform 직접 전달)
                      ↓
Mantel Test ← (별도 거리행렬 필요)
```

각 도구 결과 하단에 "다음 분석" 링크 제공 (선택적, 강제 아님).

**데이터 전달 최적화**: Beta Diversity 결과를 브라우저 메모리에 캐시하여 NMDS/PERMANOVA에서 재계산 방지.

---

## 구현 순서

| 단계 | 내용 | 예상 |
|------|------|------|
| E1 | Alpha Diversity (Python + UI) | 1일 |
| E2 | Rarefaction (Python + 곡선 차트) | 1일 |
| E3 | Beta Diversity (Python + 히트맵) | 1일 |
| E4 | NMDS (Python + 산점도) | 1일 |
| E5 | PERMANOVA (Python + 순열 UI + R 교차검증) | 1.5일 |
| E6 | Mantel Test (Python + 산점도 + R 교차검증) | 1일 |
| **합계** | | **~6.5일** |
