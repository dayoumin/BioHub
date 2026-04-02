# Worker 9: Population Genetics Python Module
# Notes:
# - Dependencies: NumPy, SciPy (no additional packages beyond base)
# - Tools: Hardy-Weinberg equilibrium test, Fst (fixation index)
# - Estimated memory: ~50MB

from typing import List, Dict, Optional, Union
import numpy as np
from scipy import stats


# ─── 내부 함수 ────────────────────────────────────────────


def _hw_exact_pvalue(het: int, hom1: int, hom2: int) -> float:
    """
    Hardy-Weinberg Exact Test p-value.
    Wigginton et al. (2005) snphwe recurrence relation.
    Reference: U Michigan Perl implementation (csg.sph.umich.edu)

    Parameters: observed genotype counts (heterozygotes, homozygote1, homozygote2)
    Returns: two-sided exact p-value
    """
    n = het + hom1 + hom2
    if n == 0:
        return 1.0

    # rare allele count
    n_a = 2 * hom1 + het
    n_b = 2 * hom2 + het
    if n_a > n_b:
        n_a, n_b = n_b, n_a

    # monomorphic
    if n_a == 0:
        return 1.0

    # heterozygote counts must have same parity as rare allele count
    # mid = expected het count under HWE (starting point for recurrence)
    mid = int(round(n_a * n_b / (2.0 * n)))
    if mid % 2 != n_a % 2:
        mid += 1

    # bounds
    lo = n_a % 2  # minimum possible het count (0 or 1)
    hi = min(n_a, n_b)

    if mid < lo or mid > hi:
        mid = lo

    # build probability array using recurrence from mid outward
    probs = [0.0] * (hi + 1)
    probs[mid] = 1.0

    # recurrence upward: mid → hi
    curr = 1.0
    for i in range(mid, hi - 1, 2):
        hom1_i = (n_a - i) // 2
        hom2_i = (n_b - i) // 2
        curr *= (4.0 * hom1_i * hom2_i) / ((i + 2) * (i + 1))
        probs[i + 2] = curr

    # recurrence downward: mid → lo
    curr = 1.0
    for i in range(mid, lo + 1, -2):
        hom1_i = (n_a - i) // 2 + 1
        hom2_i = (n_b - i) // 2 + 1
        curr *= (i * (i - 1)) / (4.0 * hom1_i * hom2_i)
        probs[i - 2] = curr

    # normalize
    total = sum(probs[lo::2])  # sum every-other from lo
    if total == 0:
        return 1.0

    for i in range(lo, hi + 1, 2):
        probs[i] /= total

    # two-sided p-value: sum probabilities <= P(observed)
    p_observed = probs[het] if het <= hi else 0.0
    p_value = sum(probs[i] for i in range(lo, hi + 1, 2) if probs[i] <= p_observed + 1e-12)

    return min(1.0, max(0.0, p_value))


def _parse_genotypes(
    genotypes: List[List[str]],
    pop_labels: List[str],
    locus_names: List[str],
) -> Dict:
    """
    개체별 유전자형(wide-format) → 집단별·locus별 allele count 변환.

    Parameters
    ----------
    genotypes  : [[genotype_str, ...], ...] 개체 × 유전자좌
    pop_labels : 개체별 집단 라벨
    locus_names: 유전자좌 이름 목록

    Returns
    -------
    {
        'pop_labels_unique': sorted unique population labels,
        'locus_names': locus names,
        'locus_data': [  # per locus
            {
                'alleles': sorted allele universe,
                'counts': { pop_label: [count_per_allele, ...] },
                'sample_sizes': { pop_label: total_allele_count },
            },
            ...
        ],
        'n_individuals': total individuals,
    }
    """
    n_ind = len(genotypes)
    n_loci = len(locus_names)

    if n_ind == 0:
        raise ValueError("개체 데이터가 없습니다")
    if n_ind != len(pop_labels):
        raise ValueError("개체 수와 집단 라벨 수가 다릅니다")

    unique_pops = sorted(set(pop_labels))
    if len(unique_pops) < 2:
        raise ValueError("최소 2개 집단이 필요합니다")

    # 1차 스캔: locus별 allele universe 수집
    allele_sets: List[set] = [set() for _ in range(n_loci)]
    parsed: List[List[Optional[tuple]]] = []  # [ind][locus] = (a1, a2) or None

    for ind_idx in range(n_ind):
        row = genotypes[ind_idx]
        if len(row) != n_loci:
            raise ValueError(f"개체 {ind_idx + 1}: 유전자좌 수 불일치 ({len(row)} vs {n_loci})")
        parsed_row: List[Optional[tuple]] = []
        for loc_idx in range(n_loci):
            cell = str(row[loc_idx]).strip()
            if cell == '' or cell.upper() == 'NA':
                parsed_row.append(None)
                continue
            if '/' not in cell:
                raise ValueError(
                    f"개체 {ind_idx + 1}, {locus_names[loc_idx]}: "
                    f"유전자형 '{cell}'에 슬래시(/) 구분자가 없습니다 (예: A/B)"
                )
            parts = cell.split('/')
            if len(parts) != 2:
                raise ValueError(
                    f"개체 {ind_idx + 1}, {locus_names[loc_idx]}: "
                    f"유전자형은 2개 대립유전자여야 합니다 (예: A/B)"
                )
            a1, a2 = parts[0].strip(), parts[1].strip()
            if not a1 or not a2:
                raise ValueError(
                    f"개체 {ind_idx + 1}, {locus_names[loc_idx]}: 빈 대립유전자"
                )
            allele_sets[loc_idx].add(a1)
            allele_sets[loc_idx].add(a2)
            parsed_row.append((a1, a2))
        parsed.append(parsed_row)

    # allele universe 정렬 + 빈 locus 검증
    allele_universes = [sorted(s) for s in allele_sets]
    for loc_idx, alleles in enumerate(allele_universes):
        if not alleles:
            raise ValueError(f"{locus_names[loc_idx]}: 관측 데이터가 없습니다 (모든 개체 결측)")

    # 2차 스캔: 집단별·locus별 allele count
    locus_data = []
    for loc_idx in range(n_loci):
        alleles = allele_universes[loc_idx]
        allele_index = {a: i for i, a in enumerate(alleles)}
        n_alleles = len(alleles)

        counts: Dict[str, List[int]] = {pop: [0] * n_alleles for pop in unique_pops}
        sample_sizes: Dict[str, int] = {pop: 0 for pop in unique_pops}

        for ind_idx in range(n_ind):
            gt = parsed[ind_idx][loc_idx]
            if gt is None:
                continue
            pop = pop_labels[ind_idx]
            a1, a2 = gt
            counts[pop][allele_index[a1]] += 1
            counts[pop][allele_index[a2]] += 1
            sample_sizes[pop] += 2

        locus_data.append({
            'alleles': alleles,
            'counts': counts,
            'sample_sizes': sample_sizes,
        })

    return {
        'pop_labels_unique': unique_pops,
        'locus_names': locus_names,
        'locus_data': locus_data,
        'n_individuals': n_ind,
        # pre-parsed data for permutation reuse (avoids redundant string parsing)
        '_parsed_gts': parsed,          # [ind][locus] = (a1, a2) or None
        '_allele_universes': allele_universes,  # [locus] = sorted allele list
        '_allele_indices': [             # [locus] = {allele: index}
            {a: i for i, a in enumerate(alleles)}
            for alleles in allele_universes
        ],
    }


def _recount_alleles(
    parsed_gts: List[List[Optional[tuple]]],
    pop_labels: List[str],
    allele_universes: List[List[str]],
    allele_indices: List[Dict[str, int]],
) -> Dict:
    """
    사전 파싱된 유전자형으로 집단별 allele count만 재계산.

    Permutation에서 사용: 유전자형 문자열은 동일하고 집단 라벨만 바뀌므로
    문자열 파싱(strip/split/validate)을 반복할 필요가 없다.

    Parameters
    ----------
    parsed_gts       : _parse_genotypes 결과의 '_parsed_gts' (이미 파싱된 튜플)
    pop_labels       : 셔플된 집단 라벨
    allele_universes : _parse_genotypes 결과의 '_allele_universes'
    allele_indices   : _parse_genotypes 결과의 '_allele_indices'

    Returns
    -------
    { 'pop_labels_unique', 'locus_data' }  — _multilocus_hudson_fst 입력용
    """
    n_ind = len(parsed_gts)
    n_loci = len(allele_universes)
    unique_pops = sorted(set(pop_labels))

    locus_data = []
    for loc_idx in range(n_loci):
        alleles = allele_universes[loc_idx]
        allele_index = allele_indices[loc_idx]
        n_alleles = len(alleles)

        counts: Dict[str, List[int]] = {pop: [0] * n_alleles for pop in unique_pops}
        sample_sizes: Dict[str, int] = {pop: 0 for pop in unique_pops}

        for ind_idx in range(n_ind):
            gt = parsed_gts[ind_idx][loc_idx]
            if gt is None:
                continue
            pop = pop_labels[ind_idx]
            a1, a2 = gt
            counts[pop][allele_index[a1]] += 1
            counts[pop][allele_index[a2]] += 1
            sample_sizes[pop] += 2

        locus_data.append({
            'alleles': alleles,
            'counts': counts,
            'sample_sizes': sample_sizes,
        })

    return {
        'pop_labels_unique': unique_pops,
        'locus_data': locus_data,
    }


def _hudson_fst_pair_components(p1, p2, n1, n2):
    """Hudson (1992) + Bhatia (2013) Fst numerator & denominator for one locus-pair."""
    if n1 <= 1 or n2 <= 1:
        return 0.0, 0.0
    num = float(np.sum((p1 - p2) ** 2 - p1 * (1 - p1) / (n1 - 1) - p2 * (1 - p2) / (n2 - 1)))
    den = float(np.sum(p1 * (1 - p2) + p2 * (1 - p1)))
    return num, den


def _multilocus_hudson_fst(locus_data, pop_labels_unique):
    """
    Multilocus Hudson Fst = Σnum / Σden (ratio of sums).

    Returns
    -------
    global_fst, pairwise (n_pops × n_pops matrix), per_locus_components
    """
    n_pops = len(pop_labels_unique)
    # per-pair accumulator: (i, j) → (sum_num, sum_den)
    pair_num = np.zeros((n_pops, n_pops))
    pair_den = np.zeros((n_pops, n_pops))

    per_locus_components = []  # for bootstrap: [{(i,j): (num, den)}, ...]

    for ld in locus_data:
        locus_comp = {}
        for i in range(n_pops):
            pop_i = pop_labels_unique[i]
            n_i = ld['sample_sizes'][pop_i]
            if n_i == 0:
                continue
            c_i = np.array(ld['counts'][pop_i], dtype=float)
            p_i = c_i / n_i

            for j in range(i + 1, n_pops):
                pop_j = pop_labels_unique[j]
                n_j = ld['sample_sizes'][pop_j]
                if n_j == 0:
                    continue
                c_j = np.array(ld['counts'][pop_j], dtype=float)
                p_j = c_j / n_j

                num, den = _hudson_fst_pair_components(p_i, p_j, n_i, n_j)
                pair_num[i][j] += num
                pair_den[i][j] += den
                locus_comp[(i, j)] = (num, den)

        per_locus_components.append(locus_comp)

    # pairwise Fst matrix
    pairwise = np.zeros((n_pops, n_pops))
    total_num = 0.0
    total_den = 0.0

    for i in range(n_pops):
        for j in range(i + 1, n_pops):
            den = pair_den[i][j]
            if den == 0:
                f = 0.0
            else:
                f = max(0.0, pair_num[i][j] / den)
            pairwise[i][j] = f
            pairwise[j][i] = f
            total_num += pair_num[i][j]
            total_den += pair_den[i][j]

    global_fst = max(0.0, total_num / total_den) if total_den > 0 else 0.0

    return global_fst, pairwise, per_locus_components


def _bootstrap_fst_ci(
    per_locus_components: List[Dict],
    n_pops: int,
    n_bootstrap: int,
) -> Optional[Dict]:
    """Locus 복원추출 bootstrap — 95% CI 계산. 유전자좌 1개면 None 반환."""
    n_loci = len(per_locus_components)
    if n_loci < 2 or n_bootstrap <= 0:
        if n_bootstrap > 0 and n_loci < 2:
            return {'bootstrapCi': None, 'nBootstrap': n_bootstrap, 'bootstrapWarning': "유전자좌 1개 — bootstrap CI 불가"}
        return {'bootstrapCi': None, 'nBootstrap': 0, 'bootstrapWarning': None}

    n_pairs = n_pops * (n_pops - 1) // 2
    actual_boot = n_bootstrap
    boot_budget = n_bootstrap * n_loci * n_pairs
    if boot_budget > 5e7:
        actual_boot = max(100, int(5e7 / (n_loci * n_pairs)))

    boot_fsts = []
    for _ in range(actual_boot):
        indices = np.random.choice(n_loci, size=n_loci, replace=True)
        total_num = 0.0
        total_den = 0.0
        for idx in indices:
            for (_, _), (num, den) in per_locus_components[idx].items():
                total_num += num
                total_den += den
        boot_fst = max(0.0, total_num / total_den) if total_den > 0 else 0.0
        boot_fsts.append(boot_fst)

    ci_lower = float(np.percentile(boot_fsts, 2.5))
    ci_upper = float(np.percentile(boot_fsts, 97.5))
    return {
        'bootstrapCi': [round(ci_lower, 6), round(ci_upper, 6)],
        'nBootstrap': actual_boot,
        'bootstrapWarning': None,
    }


def _interpret_wright_fst(global_fst: float) -> str:
    """Wright (1978) Fst 해석."""
    if global_fst < 0.05:
        return "약한 분화 (Fst < 0.05, Wright 1978)"
    elif global_fst < 0.15:
        return "중간 분화 (0.05 ≤ Fst < 0.15, Wright 1978)"
    elif global_fst < 0.25:
        return "큰 분화 (0.15 ≤ Fst < 0.25, Wright 1978)"
    else:
        return "매우 큰 분화 (Fst ≥ 0.25, Wright 1978)"


# ─── 공개 함수 ────────────────────────────────────────────


def hardy_weinberg(
    rows: List[List[Union[float, int]]],
    locusLabels: Optional[List[str]] = None,
) -> Dict:
    """
    Hardy-Weinberg 평형 검정 (chi-square + exact test).

    Parameters
    ----------
    rows        : [[AA, Aa, aa], ...] 유전자좌별 관측 유전자형 수
    locusLabels : 유전자좌 라벨 (선택)

    Returns
    -------
    {
        alleleFreqP, alleleFreqQ, observedCounts, expectedCounts,
        chiSquare, pValue, exactPValue, degreesOfFreedom, inEquilibrium,
        interpretation, nTotal, locusResults?
    }
    """
    if not rows or len(rows) == 0:
        raise ValueError("최소 1개 유전자좌의 관측 데이터가 필요합니다")

    def _test_single(observed_raw):
        obs = [float(x) for x in observed_raw]
        if len(obs) != 3:
            raise ValueError("각 유전자좌는 정확히 3개 유전자형(AA, Aa, aa)이 필요합니다")
        if any(x < 0 for x in obs):
            raise ValueError("관측 빈도는 0 이상이어야 합니다")
        if any(x != int(x) for x in obs):
            raise ValueError("관측 빈도는 정수여야 합니다 (소수 불가)")

        hom_dom, het, hom_rec = int(obs[0]), int(obs[1]), int(obs[2])  # AA, Aa, aa
        n = hom_dom + het + hom_rec

        if n == 0:
            raise ValueError("표본 수가 0입니다")

        # 대립유전자 빈도
        p = (2 * hom_dom + het) / (2 * n)
        q = 1.0 - p

        # 단형성 (monomorphic): p=0 또는 p=1이면 chi-square 불가
        is_monomorphic = (p == 0.0 or p == 1.0)

        # 기대 빈도
        exp_dom = n * p ** 2
        exp_het = n * 2 * p * q
        exp_rec = n * q ** 2

        observed = [hom_dom, het, hom_rec]
        expected = [exp_dom, exp_het, exp_rec]

        # 기대빈도 < 5 경고 (chi-square 근사 부정확 가능)
        low_expected = any(e < 5 for e in expected)

        if is_monomorphic:
            chi2 = 0.0
            p_value = 1.0
            exact_p = 1.0
        else:
            # chi-square (df=1: 3 categories - 1 estimated parameter - 1)
            chi2_val, p_val = stats.chisquare(observed, expected, ddof=1)
            chi2 = round(float(chi2_val), 4)
            p_value = float(p_val)
            # exact test (Wigginton et al. 2005)
            exact_p = _hw_exact_pvalue(het, hom_dom, hom_rec)

        return {
            'alleleFreqP': float(p),
            'alleleFreqQ': float(q),
            'observedCounts': [hom_dom, het, hom_rec],
            'expectedCounts': [round(float(x), 2) for x in expected],
            'chiSquare': chi2,
            'pValue': p_value,
            'exactPValue': exact_p,
            'degreesOfFreedom': 1,
            'inEquilibrium': bool(exact_p > 0.05),
            'isMonomorphic': is_monomorphic,
            'nTotal': n,
            'lowExpectedWarning': low_expected,
        }

    # 첫 번째 유전자좌 (또는 유일한 유전자좌) 결과를 메인으로
    first = _test_single(rows[0])

    # 해석 텍스트 (exact test 기준, chi-square 병기)
    if first['isMonomorphic']:
        first['interpretation'] = "단형성 (monomorphic) — 다형성이 없어 HW 검정 불가"
    elif first['inEquilibrium']:
        first['interpretation'] = (
            f"HW 평형 유지 (exact p = {first['exactPValue']:.4f}, "
            f"χ² p = {first['pValue']:.4f}, exact p > 0.05)"
        )
    else:
        first['interpretation'] = (
            f"HW 평형 이탈 (exact p = {first['exactPValue']:.4f}, "
            f"χ² p = {first['pValue']:.4f}, exact p ≤ 0.05)"
        )

    # 다중 유전자좌
    if len(rows) > 1:
        labels = locusLabels if locusLabels and len(locusLabels) == len(rows) else [f"Locus {i+1}" for i in range(len(rows))]
        locus_results = []
        for i, row in enumerate(rows):
            result = _test_single(row)
            result['locus'] = labels[i]
            locus_results.append(result)
        first['locusResults'] = locus_results
        # top-level lowExpectedWarning: 어느 유전자좌든 해당되면 true
        first['lowExpectedWarning'] = any(lr['lowExpectedWarning'] for lr in locus_results)
    else:
        first['locusResults'] = None

    return first


def fst(
    populations: Optional[List[List[Union[float, int]]]] = None,
    populationLabels: Optional[List[str]] = None,
    genotypes: Optional[List[List[str]]] = None,
    individualPopulations: Optional[List[str]] = None,
    locusNames: Optional[List[str]] = None,
    locusCountData: Optional[List[Dict]] = None,
    nPermutations: int = 999,
    nBootstrap: int = 1000,
) -> Dict:
    """
    Fst (Fixation Index) — Hudson (1992) + Bhatia et al. (2013) 편향 보정.

    v1: populations (allele count matrix) → 단일 locus 점추정
    v2: genotypes (개체별 유전자형) → multilocus ratio-of-sums Fst + permutation + bootstrap
    v3: locusCountData (집계된 allele count) → multilocus Fst + bootstrap (permutation 불가)

    Parameters
    ----------
    populations           : v1 — [[count_A, count_B, ...], ...] 집단별 대립유전자 개수
    populationLabels      : v1 — 집단 라벨 (선택)
    genotypes             : v2 — [['A/A', 'A/B', ...], ...] 개체 × 유전자좌
    individualPopulations : v2 — 개체별 집단 라벨
    locusNames            : v2 — 유전자좌 이름 목록
    locusCountData        : v3 — [{locus, alleles, counts: {pop: [...]}, sampleSizes: {pop: int}}, ...]
    nPermutations         : v2 — permutation 횟수 (0이면 미실행, 기본 999)
    nBootstrap            : v2 — bootstrap 횟수 (0이면 미실행, 기본 1000)
    """
    # ── v3 경로: 집계된 allele count (long-format) ──
    if locusCountData is not None:
        # TS에서 전달한 populationLabels 사용 (중복 순회 제거)
        pop_labels_unique = sorted(populationLabels) if populationLabels else sorted({
            p for entry in locusCountData for p in entry.get('counts', {}).keys()
        })
        n_pops = len(pop_labels_unique)
        if n_pops < 2:
            raise ValueError("최소 2개 집단이 필요합니다")

        locus_data = []
        for entry in locusCountData:
            alleles = entry.get('alleles', [])
            counts = entry.get('counts', {})
            sample_sizes = entry.get('sampleSizes', {})
            locus_data.append({
                'alleles': alleles,
                'counts': {p: counts.get(p, [0] * len(alleles)) for p in pop_labels_unique},
                'sample_sizes': {p: sample_sizes.get(p, 0) for p in pop_labels_unique},
            })

        locus_list = [e.get('locus', f"Locus {i+1}") for i, e in enumerate(locusCountData)]

        global_fst, pairwise_mat, per_locus_components = _multilocus_hudson_fst(
            locus_data, pop_labels_unique,
        )

        result: Dict = {
            'globalFst': round(global_fst, 6),
            'pairwiseFst': [[round(float(pairwise_mat[i][j]), 6) for j in range(n_pops)] for i in range(n_pops)],
            'populationLabels': pop_labels_unique,
            'nPopulations': n_pops,
            'interpretation': _interpret_wright_fst(global_fst),
            'nLoci': len(locus_list),
            'locusNames': locus_list,
            'permutationPValue': None,
            'nPermutations': 0,
        }

        boot_result = _bootstrap_fst_ci(per_locus_components, n_pops, nBootstrap)
        if boot_result:
            result.update(boot_result)

        return result

    # ── v2 경로: 개체별 유전자형 ──
    if genotypes is not None:
        if not individualPopulations:
            raise ValueError("individualPopulations (개체별 집단 라벨)이 필요합니다")
        n_loci = len(genotypes[0]) if genotypes else 0
        locus_list = locusNames if locusNames and len(locusNames) == n_loci else [f"Locus {i+1}" for i in range(n_loci)]

        parsed = _parse_genotypes(genotypes, individualPopulations, locus_list)
        pop_labels_unique = parsed['pop_labels_unique']
        n_pops = len(pop_labels_unique)

        global_fst, pairwise_mat, per_locus_components = _multilocus_hudson_fst(
            parsed['locus_data'], pop_labels_unique,
        )

        result: Dict = {
            'globalFst': round(global_fst, 6),
            'pairwiseFst': [[round(float(pairwise_mat[i][j]), 6) for j in range(n_pops)] for i in range(n_pops)],
            'populationLabels': pop_labels_unique,
            'nPopulations': n_pops,
            'interpretation': _interpret_wright_fst(global_fst),
            'nIndividuals': parsed['n_individuals'],
            'nLoci': len(locus_list),
            'locusNames': locus_list,
        }

        # ── Permutation test ──
        n_ind = parsed['n_individuals']
        if nPermutations > 0:
            # 사전 예산 추정: per-perm 비용 ∝ O(n_ind × n_loci), Pyodide 60s 타임아웃 고려
            actual_perm = nPermutations
            budget = n_ind * len(locus_list) * nPermutations
            if budget > 5e8:    # e.g. 500 ind × 50 loci × 999
                actual_perm = 99
            elif budget > 1e8:  # e.g. 200 ind × 10 loci × 999
                actual_perm = 499

            # 최적화: 문자열 파싱은 1회만, 집단 라벨 셔플 시 allele 재집계만 수행
            pre_parsed_gts = parsed['_parsed_gts']
            pre_allele_universes = parsed['_allele_universes']
            pre_allele_indices = parsed['_allele_indices']

            pop_arr = np.array(individualPopulations)
            count_ge = 0
            for _ in range(actual_perm):
                shuffled = np.random.permutation(pop_arr)
                shuffled_list = shuffled.tolist()
                shuffled_parsed = _recount_alleles(
                    pre_parsed_gts, shuffled_list,
                    pre_allele_universes, pre_allele_indices,
                )
                perm_fst, _, _ = _multilocus_hudson_fst(
                    shuffled_parsed['locus_data'], shuffled_parsed['pop_labels_unique'],
                )
                if perm_fst >= global_fst:
                    count_ge += 1

            perm_p = (count_ge + 1) / (actual_perm + 1)
            result['permutationPValue'] = round(perm_p, 6)
            result['nPermutations'] = actual_perm
        else:
            result['permutationPValue'] = None
            result['nPermutations'] = 0

        # ── Bootstrap CI ──
        boot_result = _bootstrap_fst_ci(per_locus_components, n_pops, nBootstrap)
        if boot_result:
            result.update(boot_result)

        return result

    # ── v1 경로: allele count matrix (기존 코드) ──
    if not populations or len(populations) < 2:
        raise ValueError("최소 2개 집단이 필요합니다 (populations 또는 genotypes)")

    n_pops = len(populations)
    labels = populationLabels if populationLabels and len(populationLabels) == n_pops else [f"Pop {i+1}" for i in range(n_pops)]

    freqs = []
    sample_sizes = []
    for pop in populations:
        counts = np.array([float(x) for x in pop])
        if np.any(counts < 0):
            raise ValueError("대립유전자 개수는 0 이상이어야 합니다")
        if np.any(counts != np.floor(counts)):
            raise ValueError("대립유전자 개수는 정수여야 합니다 (소수 불가)")
        total = np.sum(counts)
        if total == 0:
            raise ValueError("집단의 총 대립유전자 수가 0입니다")
        freqs.append(counts / total)
        sample_sizes.append(float(total))

    def _hudson_fst_pair(p1, p2, n1, n2):
        if n1 <= 1 or n2 <= 1:
            raise ValueError("각 집단의 대립유전자 총 수는 2 이상이어야 합니다")
        num = np.sum((p1 - p2) ** 2 - p1 * (1 - p1) / (n1 - 1) - p2 * (1 - p2) / (n2 - 1))
        den = np.sum(p1 * (1 - p2) + p2 * (1 - p1))
        if den == 0:
            return 0.0
        return max(0.0, float(num / den))

    pairwise = np.zeros((n_pops, n_pops))
    fst_values = []

    for i in range(n_pops):
        for j in range(i + 1, n_pops):
            f = _hudson_fst_pair(freqs[i], freqs[j], sample_sizes[i], sample_sizes[j])
            pairwise[i][j] = f
            pairwise[j][i] = f
            fst_values.append(f)

    global_fst = float(np.mean(fst_values)) if fst_values else 0.0

    return {
        'globalFst': round(global_fst, 6),
        'pairwiseFst': [[round(float(pairwise[i][j]), 6) for j in range(n_pops)] for i in range(n_pops)],
        'populationLabels': labels,
        'nPopulations': n_pops,
        'interpretation': _interpret_wright_fst(global_fst),
    }
