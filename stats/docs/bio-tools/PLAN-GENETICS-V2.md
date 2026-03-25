# HW/Fst 2차 계획서 (Genetics v2)

## 목표

HW/Fst 도구의 통계적 정확도 향상 + Fst 유의성 검정 지원.

## 현재 상태 (v1)

| 도구 | 현재 기능 | 한계 |
|------|----------|------|
| HW | Chi-square 검정 (ddof=1) | 소표본/희귀 대립유전자에서 Type I error 과잉 |
| Fst | Hudson+Bhatia 점추정, globalFst = 쌍별 평균 | 유의성 검정 없음, 멀티로커스 미지원 |

### v1 Fst 구현 한계 (코드 확인)

현재 `fst()`는 **집단당 단일 allele-count 벡터**를 받아 `total = np.sum(counts)`로
표본 크기를 계산한다. 이 경로는 단일 유전자좌 전용이며:
- 멀티로커스 데이터를 넣으면 locus별 표본수 보정이 깨짐
- `globalFst = mean(pairwise)`는 통계학적 표준(ratio of sums)과 다름
- v2에서 이 경로를 재사용하면 안 됨 → **locus별 새 계산 경로 필수**

## 기능별 계획

### Phase 1: HW Exact Test (입력 변경 없음)

**근거**: Wigginton et al. (2005) — chi-square는 MAF < 20% 또는 N < 100 copies에서 부정확.
Exact test는 모든 상황에서 chi-square보다 정확하며, 계산 비용도 O(n)으로 무시 가능.

**알고리즘**: snphwe recurrence relation
- 입력: `(n_het, n_hom1, n_hom2)` — 현재 입력과 동일
- 핵심: rare allele 기준으로 heterozygote 수를 2씩 이동하며 확률 계산
- ~40줄 순수 Python (numpy/scipy 불필요)
- 라이브러리 없음 — scipy/statsmodels에 HW exact test 미구현

**직접 구현 근거 (CLAUDE.md §Pyodide 통계 계산)**:
Python 생태계에 순수 Python HW exact test 구현이 없음.
- `scipy.stats.fisher_exact()` — 2×2 contingency table용, HW exact test와 별개 알고리즘
- `snphwe` PyPI 패키지 — C 래퍼, Pyodide 불가
- `scikit-allel` — HW 기대 이형접합도만, exact p-value 미지원
- `statsmodels`, `pingouin` — HW exact test 미구현

알고리즘이 단순(재귀 관계 1개, ~40줄)하고 Wigginton et al. 원논문에
Perl 참조 구현이 공개되어 검증 가능.

**변경:**

1. **Worker 9** (`worker9-genetics.py`):
   - `_hw_exact_pvalue(het, hom1, hom2)` 내부 함수 추가
   - `_test_single()` 내에서 chi-square 옆에 exact test **항상** 계산
   - 반환에 `exactPValue` 필드 추가
   - `isMonomorphic`이면 `exactPValue = 1.0`
   - 다중 유전자좌: 각 유전자좌 독립 계산 (표준 관행)

2. **결과 타입** (`types/bio-tools-results.ts`):
   - `HardyWeinbergResult`에 `exactPValue: number` 추가
   - `HwLocusResult`에 `exactPValue: number` 추가
   - 기존 `pValue`(chi-square), `chiSquare` 필드 **유지** (breaking change 방지)

3. **판정 기준 변경**:
   - `inEquilibrium`: **exact test** p-value 기준으로 판정 (exact > 0.05 → true)
   - `pValue` 필드: chi-square 값 **유지** (하위 호환)
   - `interpretation` 텍스트: exact test 기준으로 생성, chi-square 병기

4. **UI** (`hardy-weinberg/page.tsx`):
   - 배지에 **`exactPValue`** 표시 (pValue 아님 — 판정과 표시 p-value 일치 보장)
   - chi-square p-value는 상세 테이블에서 보조 표시
   - `lowExpectedWarning` 유지하되, exact test 사용 중이므로 경고 약화
   - 다중 유전자좌 테이블: `exactPValue` 컬럼 추가

5. **inEquilibrium 단형성 처리**: 변경 없음
   - `boolean` 타입 유지 (단형성 시 `true` 그대로)
   - UI에서 `isMonomorphic`으로 이미 분기 — null 변경 불필요

### Phase 2: Fst 멀티로커스 개체별 유전자형 입력

**이유**: Permutation과 Bootstrap 모두 개체 수준 데이터가 필수.
- Permutation: 개체를 집단 간 재배치해야 함
- Bootstrap: 유전자좌 단위 리샘플링 필요 → 다중 유전자좌 필수

**입력 형식**: Wide-format CSV (업계 표준: GENEPOP, GenAlEx, hierfstat, STRUCTURE)

```csv
individual,population,Locus1,Locus2,Locus3
ind001,PopA,A/A,A/B,B/B
ind002,PopA,A/B,A/A,A/B
ind003,PopB,B/B,A/B,A/A
```

**유전자형 파싱 규칙:**
- 슬래시 구분: `A/B` (allele1/allele2)
- 다문자 대립유전자 지원: `AT/GC`, `120/124` (microsatellite)
- 순서 무관: `A/B` = `B/A` (unphased)
- 동형접합: `A/A`
- 결측: 빈 셀 또는 `NA` → 해당 개체-유전자좌 쌍 제외
- 단일 문자 대립유전자: `A/B` (슬래시 필수, `AB` 불허)

**다중 대립유전자 allele universe 정렬:**
- 1차 스캔: 전 집단의 전 개체에서 locus별 고유 allele set 수집
- locus별 allele set을 정렬 (lexicographic) → 고정된 축 순서
- 2차 스캔: 각 집단·개체의 allele을 고정된 축 기준으로 count
- 이를 통해 집단 간 관측 allele 집합이 달라도 동일 count vector 축 보장

**v2 globalFst 정의 (v1과 다름):**

v1의 `globalFst = mean(pairwise)` 는 통계학적 표준이 아님.
v2에서는 **multilocus ratio-of-sums** 방식 사용:

```
globalFst = Σ_l(num_l) / Σ_l(den_l)
```

- `num_l`, `den_l`: locus l에서의 Hudson Fst numerator/denominator
- 2집단: 단일 쌍이므로 locus별 num/den을 합산
- 3+집단: locus별로 모든 쌍의 num/den을 합산 후 비율 계산
- pairwiseFst: 각 쌍도 동일한 ratio-of-sums로 계산

> **v1과의 차이**: v1 결과(쌍별 평균)는 기존 탭에서 그대로 유지.
> v2 탭에서만 ratio-of-sums 방식 사용. 같은 데이터라도 값이 다를 수 있음.

**설계 결정:**

| 결정 | 선택 | 이유 |
|------|------|------|
| 입력 형식 | Wide-format only | 업계 표준 (GENEPOP/GenAlEx/hierfstat). Long-format은 전례 없음 |
| 유전자형 표기 | 슬래시 구분 `A/B` | 다문자·다중 대립유전자 호환, adegenet `df2genind()` 동일 |
| v1 호환 | 기존 count matrix 탭 유지 | "간편 분석" (점추정만) / "상세 분석" (유의성 포함) |
| Worker 함수 | `fst()` 단일 함수, 입력 자동 감지 | `populations`(v1) vs `genotypes`(v2) 키로 구분 |
| 결과 타입 | `FstResult` 확장 (optional 필드) | 별도 타입 불필요, v1/v2 호환 |
| globalFst (v2) | ratio-of-sums | 통계학적 표준, permutation/bootstrap 대상과 일치 |
| Fst 계산 경로 | v2 전용 locus별 새 경로 | v1의 단일 벡터 경로 재사용 불가 (표본수 보정 깨짐) |

**자동 감지 로직** (Worker 내부):
```python
def fst(populations=None, genotypes=None, ...):
    if genotypes is not None:
        # v2: 개체별 유전자형 → locus별 allele count → locus별 Hudson num/den → ratio-of-sums
    elif populations is not None:
        # v1: 기존 count matrix → 단일 locus Hudson Fst (현재 코드 그대로)
    else:
        raise ValueError("populations 또는 genotypes 필수")
```

**변경:**

1. **Fst page.tsx**: `Tabs` 컴포넌트 추가 (HW page.tsx 패턴 재사용)
   - "간편 분석" — 기존 v1 count matrix (점추정만, 현재 코드 유지)
   - "상세 분석" — v2 개체별 유전자형 (multilocus Fst + permutation + bootstrap)
   - 각 탭에 독립 상태 (csvData, results)

2. **Worker 9**: `fst()` 확장 — **v2 전용 새 계산 경로**
   - `genotypes` 파라미터 추가 (v2)
   - `_parse_genotypes(genotypes, pop_labels, locus_names)`:
     1. locus별 global allele universe 수집 + 정렬
     2. 집단별·locus별 allele count vector 생성
   - `_multilocus_hudson_fst(locus_counts)`:
     1. locus별 Hudson num/den 계산 (쌍별)
     2. globalFst = Σnum / Σden
     3. pairwiseFst[i][j] = Σnum_ij / Σden_ij (locus 합산)
   - **v1 경로(`populations`)는 변경 없음**

3. **genetics-columns.ts**: `detectIndividualColumn` 추가
   - HINTS: `['individual', 'sample', 'id', 'ind', 'specimen', '개체', '시료']`

4. **결과 타입** (`FstResult` 확장):
   ```typescript
   export interface FstResult {
     globalFst: number
     pairwiseFst: number[][]
     populationLabels: string[]
     nPopulations: number
     interpretation: string
     // v2 optional fields
     nIndividuals?: number
     nLoci?: number
     locusNames?: string[]
     permutationPValue?: number | null
     nPermutations?: number
     bootstrapCi?: [number, number] | null
     nBootstrap?: number
     bootstrapWarning?: string | null
   }
   ```

5. **예제 데이터**: `public/example-data/fst-genotypes.csv` 생성
   - 3 집단 × 5 유전자좌 × 10 개체 (최소 동작 예시)

### Phase 3: Fst Permutation p-value

**대상 통계량**: v2의 globalFst (ratio-of-sums)

**알고리즘**:
1. 실제 집단 배정으로 globalFst 계산 (observed)
2. 모든 개체의 집단 **배정을 무작위 셔플** (개체 유전자형은 유지, 집단 라벨만 재배정)
3. 셔플된 배정으로 `_multilocus_hudson_fst()` 재계산 → permuted globalFst
4. n_perm회 반복
5. p = (Fst_perm ≥ Fst_observed인 횟수 + 1) / (n_perm + 1) — **단측 검정**

> ecology worker의 PERMANOVA와 동일한 공식 (≥, 단측)

**성능 예산**: Pyodide 브라우저 실행 고려
- Pyodide worker는 60초 고정 타임아웃 후 terminate (중간 축소 불가)
- **사전 예산 추정**: 실행 전 데이터 크기 기반으로 n_perm 결정
  - N ≤ 200, L ≤ 20: 999 permutations
  - N ≤ 500, L ≤ 50: 499 permutations
  - 그 외: 99 permutations + 경고 "데이터 크기로 인해 permutation 횟수 축소"
- 추정 공식: `estimated_seconds ≈ N × L × n_perm × 1e-6` (numpy vectorized 기준)

**변경:**

1. **Worker 9** `fst()`에 permutation 옵션:
   - `nPermutations: int = 999` (0이면 미실행)
   - v2 입력에서만 동작 (v1 count matrix는 permutation 불가 → 무시)
   - 실행 전 사전 예산 추정 → n_perm 자동 조정
   - 반환: `permutationPValue`, `nPermutations` (실제 사용된 값)

2. **UI**: global Fst 옆에 permutation p-value 배지
   - p < 0.05: significant (SIGNIFICANCE_BADGE.significant)
   - p ≥ 0.05: non-significant
   - n_perm이 축소된 경우 "permutations: 99 (데이터 크기 제한)" 표시

### Phase 4: Fst Bootstrap 95% CI

**대상 통계량**: v2의 globalFst (ratio-of-sums)

**알고리즘** (Hudson Fst over loci):
1. L개 유전자좌별 Hudson Fst numerator/denominator 계산 (Phase 2에서 이미 구한 값)
2. L개 유전자좌를 **복원추출로 리샘플** (numpy.random.choice)
3. 리샘플된 유전자좌 세트로 multilocus Fst = Σnum / Σden 계산
4. n_boot회 반복
5. 2.5%, 97.5% percentile = 95% CI

> **Hudson 통일**: 점추정과 동일한 Hudson (1992) + Bhatia (2013) 공식 사용.
> Weir-Cockerham은 사용하지 않음 (추정량 일관성 유지).

**조건**: 유전자좌 ≥ 2개 필수 (1개면 리샘플 불가 → `bootstrapCi: null` + 경고)

**변경:**

1. **Worker 9**: `fst()`에 bootstrap 옵션
   - `nBootstrap: int = 1000` (0이면 미실행)
   - v2 입력에서만 동작
   - 유전자좌 1개: `bootstrapCi: null`, `bootstrapWarning: "유전자좌 1개 — CI 불가"`
   - 반환: `bootstrapCi: [lower, upper]`, `nBootstrap`, `bootstrapWarning`

2. **UI**: Global Fst 아래에 "95% CI: [0.089, 0.157]" 표시
   - 유전자좌 1개면 amber 경고 텍스트

3. **해석 강화**: CI가 0을 포함하지 않으면 "유의한 집단 구조 지지" 추가

## 구현 순서

```
Phase 1: HW Exact Test ────── (독립, 바로 시작 가능)
Phase 2: Fst v2 입력 + 계산 ─ (Phase 3-4의 기반, locus별 새 경로)
Phase 3: Fst Permutation ──── (Phase 2 의존)
Phase 4: Fst Bootstrap CI ─── (Phase 2 의존, Phase 3과 병렬 가능)
```

## 테스트 계획

### Phase 1 테스트
- **known-answer HW exact test**: N=100 교과서 데이터 (AA=50, Aa=40, aa=10)로 기대 exact p-value 검증
- **단형성**: (AA=100, Aa=0, aa=0) → exactPValue=1.0
- **소표본 정확도**: N=10 (AA=1, Aa=3, aa=6) — chi-square와 exact 차이 확인
- **다중 유전자좌**: 3 loci CSV → 각 locus 독립 계산 확인

### Phase 2 테스트
- **유전자형 파싱**: `A/B`, `AT/GC`, `120/124`, `NA`, 빈 셀 각각 검증
- **allele universe 정렬**: PopA={A,T}, PopB={A,G} → 3-allele vector {A,G,T} 정렬 확인
- **multilocus Fst 회귀값**: 2집단 × 2유전자좌 수작업 계산값과 비교
- **v1 호환**: 기존 count matrix 입력 → v1 결과 동일 확인

### Phase 3 테스트
- **permutation reproducibility**: seed 고정 → 동일 결과
- **극단값**: 동일 집단 2개 → Fst≈0, p≈1.0
- **완전 분화**: 겹치는 allele 없음 → Fst≈1, p≈0.001

### Phase 4 테스트
- **단일 유전자좌**: bootstrapCi=null, bootstrapWarning 확인
- **CI 포함 관계**: 점추정이 CI 범위 안에 있는지 확인
- **유전자좌 수 증가**: L=2 vs L=10 → CI 폭 감소 확인

### UI 표시 일관성
- HW: exactPValue 표시 + inEquilibrium 판정 일치 (pValue≠exactPValue 시에도)
- Fst v2: globalFst + permutationPValue + bootstrapCi 모두 ratio-of-sums 기준 통일

## 예상 변경 파일

| Phase | 파일 | 변경 |
|-------|------|------|
| 1 | `worker9-genetics.py` | `_hw_exact_pvalue()` + `_test_single` 통합 |
| 1 | `types/bio-tools-results.ts` | `exactPValue` 필드 추가 |
| 1 | `hardy-weinberg/page.tsx` | exactPValue 주 표시 |
| 1 | `__tests__/worker9-hw.test.ts` | known-answer 테스트 |
| 2 | `worker9-genetics.py` | v2 경로: `_parse_genotypes()` + `_multilocus_hudson_fst()` |
| 2 | `fst/page.tsx` | Tabs (간편/상세) |
| 2 | `types/bio-tools-results.ts` | `FstResult` optional 필드 확장 |
| 2 | `genetics-columns.ts` | `detectIndividualColumn` |
| 2 | `example-data/fst-genotypes.csv` | 예제 데이터 |
| 2 | `__tests__/worker9-fst-v2.test.ts` | 파싱 + 회귀값 테스트 |
| 3 | `worker9-genetics.py` | permutation 로직 + 사전 예산 추정 |
| 3 | `fst/page.tsx` | permutation 결과 표시 |
| 4 | `worker9-genetics.py` | bootstrap 로직 |
| 4 | `fst/page.tsx` | CI 표시 |

## 직접 구현 목록 (CLAUDE.md: 라이브러리 우선, 없으면 허용)

1. **HW Exact Test** (snphwe 알고리즘): 순수 Python, ~40줄
   - 사유: scipy/statsmodels/pingouin 미지원, snphwe C 래퍼 Pyodide 불가
   - 참조: Wigginton et al. 2005, U Michigan Perl 구현 (csg.sph.umich.edu)
   - 검증: known-answer 단위 테스트

2. **Fst Permutation**: numpy.random.permutation + v2 전용 multilocus Hudson Fst
   - 사유: scipy.stats.permutation_test는 범용, Fst multi-locus ratio-of-sums 특화 필요

3. **Fst Bootstrap**: numpy.random.choice(replace=True) + locus별 Hudson num/den
   - 사유: 표준 라이브러리에 Fst bootstrap 없음

## v1/v2 Global Fst 계산 차이

동일한 데이터를 v1(간편)과 v2(상세)로 분석하면 **globalFst 값이 다를 수 있다.**

| 항목 | v1 (간편 분석) | v2 (상세 분석) |
|------|---------------|---------------|
| 입력 | 집단별 allele count matrix | 개체별 유전자형 (wide-format CSV) |
| 유전자좌 | 단일 locus (또는 합산된 count) | 다중 locus 개별 처리 |
| globalFst 공식 | `mean(pairwise_fst)` — 쌍별 Fst의 산술 평균 | `Σnum / Σden` — ratio of sums (locus×pair 합산) |
| pairwiseFst 공식 | 단일 locus Hudson Fst | locus별 num/den 합산 후 비율 |
| 통계학적 표준 | 비표준 (ad-hoc aggregate) | 표준 (Hudson 1992, Bhatia 2013) |
| 유의성 검정 | 없음 | Permutation p-value + Bootstrap 95% CI |

### 왜 다른가?

**v1**: 단일 locus에서 `Fst = num / den`을 계산하고, 3+집단이면 쌍별 값의 **산술 평균**을 취한다.
이는 각 쌍에 동일한 가중치를 부여하므로, 표본 크기가 작은 쌍이 과대 대표된다.

**v2**: 모든 locus의 모든 쌍에서 num과 den을 각각 합산한 뒤 **한 번에 나눈다** (ratio of sums).
이는 표본 크기에 비례하는 자연스러운 가중을 적용하며, 멀티로커스 Fst의 표준 추정량이다.

### 수치 예시

3집단 (PopA: n=100, PopB: n=100, PopC: n=10), 1 locus:
- Fst(A-B) = 0.05, Fst(A-C) = 0.30, Fst(B-C) = 0.25
- v1 globalFst = mean(0.05, 0.30, 0.25) = **0.200**
- v2 globalFst = (num_AB + num_AC + num_BC) / (den_AB + den_AC + den_BC)
  → PopC의 작은 n이 den에 적게 기여 → 결과가 다름

### UI 표시

- 간편 분석 탭: "Global Fst" (mean of pairwise) + Wright 해석
- 상세 분석 탭: "Global Fst" (ratio of sums) + Wright 해석 + permutation p + bootstrap CI
- 하단 참고: "Multilocus Fst = Σnum / Σden (ratio of sums)"로 v2 방식 명시

### 향후 고려

v1을 ratio-of-sums로 전환하면 일관성이 높아지지만, 기존 사용자의 결과가 달라지는 breaking change.
현재는 별도 탭으로 분리하여 공존시킨다.

## 참고 문헌

- Wigginton JE et al. (2005) "A Note on Exact Tests of Hardy-Weinberg Equilibrium" AJHG 76:887-893
- Graffelman J, Moreno V (2009) "The Mid p-value in Exact Tests for Hardy-Weinberg Equilibrium" Stat Appl Genet Mol Biol
- Weir BS, Cockerham CC (1984) "Estimating F-Statistics" Evolution 38:1358-1370
- Hudson RR et al. (1992) "Estimation of Levels of Gene Flow" Genetics 132:583-589
- Bhatia G et al. (2013) "Estimating and Interpreting FST" Genome Research 23:1514-1521
