# HW + Fst 구현 계획 (2026-03-25)

**상위 계획서**: [PLAN-BIO-GENETICS.md](../PLAN-BIO-GENETICS.md)
**아키텍처 결정**: [REVIEW-MONOREPO-ARCHITECTURE.md](../../../docs/REVIEW-MONOREPO-ARCHITECTURE.md) (결정 B — Fisheries → HW/Fst)

---

## 현재 상태

| 항목 | 상태 |
|------|------|
| Worker 9 Python (`worker9-genetics.py`) | 스텁 (54줄, `NotImplementedError`) |
| Worker Enum (`PyodideWorker.Genetics = 9`) | 완성 |
| **코어 브리지 (`pyodide-core.service.ts`)** | **Worker 9 미지원 (3곳 수정 필요)** |
| Registry 정의 (hardy-weinberg, fst) | 완성 (`coming-soon`) |
| 계획서 (`PLAN-BIO-GENETICS.md`) | 완성 (입출력 명세, 알고리즘) |
| UI 페이지 | 미생성 |
| 공통 컴포넌트 | 완성 (BioColumnSelect, BioErrorBanner, useScrollToResults) |
| **결과 타입 (`types/bio-tools-results.ts`)** | **HW/Fst 타입 미정의 (ICC까지만 존재)** |
| helpers.py `clean_array` | 존재 확인됨 |

---

## 계획서 점검 (PLAN-BIO-GENETICS.md 대비)

### 오류/불일치

1. **워커 디렉토리**: 계획서는 `stats/lib/pyodide/workers/bio/` 명시 → 실제는 `stats/public/workers/python/worker9-genetics.py`
2. **`BioResultsSection`**: 계획서에 언급되나 존재하지 않음. `BioToolShell` + 인라인 결과 렌더링 패턴 사용.
3. **HW 스텁 시그니처**: `observedCounts: List` (1D) → CSV 다중 유전자좌 불가 → **`rows: List[List]` (2D)로 변경**
4. **Fst 입력 형식**: 계획서의 long-format CSV(4컬럼)는 복잡 → **allele count matrix로 단순화**
5. **부트스트랩 횟수**: 초안 100회 → 유전학 관례상 999회 필요 → **v1에서는 point estimate만 (아래 상세)**

---

## 코어 브리지 수정 (CRITICAL — G0 단계)

`pyodide-core.service.ts`에서 Worker 9를 인식하도록 3곳 수정:

| 위치 | 현재 | 변경 |
|------|------|------|
| L191: `WORKER_EXTRA_PACKAGES` | `Record<1\|2\|...\|8, ...>` | `\|9` 추가, `9: []` 항목 추가 |
| L507: `ensureWorkerLoaded` 파라미터 | `workerNumber: 1\|2\|...\|8` | `\|9` 추가 |
| L759-766: `getWorkerFileName` 매핑 | 1~8만 | `9: 'worker9-genetics'` 추가 |

> `callWorkerMethod` (L601)은 이미 `| 9` 포함되어 있으나, 내부에서 `ensureWorkerLoaded`를 호출하므로 위 3곳이 수정되지 않으면 런타임 타입 에러 발생.

---

## 구현 상세

### G1. Worker 9 Python — HW 검정

`worker9-genetics.py`의 `hardy_weinberg` 함수 구현.

**시그니처 변경** (스텁은 `NotImplementedError`이므로 호출하는 코드 없음 — rename 안전):
```python
def hardy_weinberg(
    rows: List[List[Union[float, int]]],           # [[AA, Aa, aa], ...] (다중 유전자좌)
    locusLabels: Optional[List[str]] = None,        # ['Locus1', 'Locus2', ...]
) -> Dict:
```
단일 유전자좌 = `rows=[[50, 40, 10]]` (1행).

**알고리즘**: `scipy.stats.chisquare(observed, expected, ddof=1)` (df=1, 유전자좌별)

**반환**:
```python
{
    # 첫 번째 (또는 유일한) 유전자좌 결과:
    "alleleFreqP": float,
    "alleleFreqQ": float,
    "observedCounts": [int, int, int],
    "expectedCounts": [float, float, float],
    "chiSquare": float,
    "pValue": float,
    "degreesOfFreedom": 1,
    "inEquilibrium": bool,          # pValue > 0.05
    "interpretation": str,          # "HW 평형 유지 (p = 0.660)" 등
    "nTotal": int,
    # 다중 유전자좌 (2행 이상):
    "locusResults": [{
        "locus": str,
        "observedCounts": [int],
        "expectedCounts": [float],
        "alleleFreqP": float,
        "alleleFreqQ": float,
        "chiSquare": float,
        "pValue": float,
        "inEquilibrium": bool,
    }] | None
}
```

### G2. Worker 9 Python — Fst

`worker9-genetics.py`의 `fst` 함수 구현.

**입력 계약**: **allele count matrix** (빈도 아님, 개수)
```python
def fst(
    populations: List[List[Union[float, int]]],    # [[45, 55], [70, 30], ...] (집단 × 대립유전자 개수)
    populationLabels: Optional[List[str]] = None,
) -> Dict:
```

CSV 형식 (allele count matrix):
```csv
population, allele_A, allele_B
Pop_A, 45, 55
Pop_B, 70, 30
Pop_C, 60, 40
```
- 값은 **대립유전자 개수 (count)**, 빈도(frequency)가 아님
- 표본 수 = `sum(row)` — count에서 자동 복원
- `popCol` 1개 선택 → 나머지 열이 대립유전자 (ICC 패턴)

**알고리즘**: Hudson (1992) Fst + Bhatia et al. (2013) 편향 보정
- 내부에서 count → frequency 변환: `freq = count / sum(row)`
- 표본 수 복원: `n = sum(row)` (count matrix이므로 가능)
- 2집단: 단일 Fst 값
- 3+집단: 쌍별 Fst 행렬 + global Fst (쌍별 평균)

**v1 범위 (point estimate만)**:
```python
{
    "globalFst": float,
    "pairwiseFst": [[float]] | None,    # 3+ 집단만
    "populationLabels": [str],
    "nPopulations": int,
    "interpretation": str,              # Wright 기준 (weak/moderate/great/very_great)
}
```

**v2에서 추가 (개체별/다중 유전자좌 입력 필요)**:
- permutation p-value (개체별 데이터에서 집단 라벨 섞기)
- bootstrap 95% CI (다중 유전자좌에서 locus 리샘플링)
- 이유: 집계 count matrix에서는 permutation/bootstrap의 통계적 단위가 정의되지 않음

### G3. UI — HW 페이지 (`app/bio-tools/hardy-weinberg/page.tsx`)

**입력 모드 2가지 (탭 전환)**:
- **탭 1: 직접 입력** — NumberInput × 3 (AA, Aa, aa). 가장 흔한 사용 사례.
- **탭 2: CSV 업로드** — `BioCsvUpload` + locusCol 선택 (나머지 열 = 유전자형)

**결과 표시**:
- 대립유전자 빈도 (p, q) 카드 2개
- 관측 vs 기대 빈도 테이블 (`BIO_TABLE`)
- Chi-square + p-value + 평형 판정 배지 (`SIGNIFICANCE_BADGE`)
- interpretation 텍스트
- 다중 유전자좌: 유전자좌별 결과 테이블

**재사용**: BioToolShell, BioErrorBanner, BioColumnSelect, useScrollToResults, BIO_TABLE, SIGNIFICANCE_BADGE

### G4. UI — Fst 페이지 (`app/bio-tools/fst/page.tsx`)

**입력**: CSV 업로드 (allele count matrix) — `BioColumnSelect` × 1 (`popCol`만, 나머지 열 = 대립유전자 count)

```tsx
// ICC와 동일한 패턴:
const alleleCols = csvData.headers.filter(h => h !== popCol)
const populations = csvData.rows.map(row => alleleCols.map(col => Number(row[col])))
const labels = csvData.rows.map(row => String(row[popCol]))
```

**결과 표시**:
- Global Fst 카드
- Wright 해석 배지 (weak/moderate/great/very_great)
- 쌍별 Fst 행렬 테이블 (3+ 집단)
- Wright (1978) 기준표 (하단 참조 정보)

**재사용**: 동일

---

## 수정 파일 목록

### 신규 생성 (2개)
| 파일 | 내용 |
|------|------|
| `app/bio-tools/hardy-weinberg/page.tsx` | HW 검정 UI (직접 입력 + CSV) |
| `app/bio-tools/fst/page.tsx` | Fst UI (allele count matrix CSV) |

### 수정 (4개)
| 파일 | 내용 |
|------|------|
| `lib/services/pyodide/core/pyodide-core.service.ts` | Worker 9 지원 (3곳: WORKER_EXTRA_PACKAGES, ensureWorkerLoaded, getWorkerFileName) |
| `public/workers/python/worker9-genetics.py` | `hardy_weinberg` + `fst` 구현 (스텁 → 실제 코드) |
| `types/bio-tools-results.ts` | HW + Fst 결과 타입 추가 |
| `lib/bio-tools/bio-tool-registry.ts` | 2개 도구 `coming-soon` → `ready` |

---

## 구현 순서

| 단계 | 내용 | 의존 |
|------|------|------|
| **G0** | **`pyodide-core.service.ts` — Worker 9 브리지 지원** | — |
| G1 | `worker9-genetics.py` — `hardy_weinberg` 구현 | — |
| G2 | `worker9-genetics.py` — `fst` 구현 (point estimate만) | — |
| G2.5 | `types/bio-tools-results.ts` — HW/Fst 결과 타입 추가 | G1, G2 |
| G3 | `hardy-weinberg/page.tsx` UI 생성 (직접 입력 탭 + CSV 탭) | G0, G1, G2.5 |
| G4 | `fst/page.tsx` UI 생성 (popCol 선택) | G0, G2, G2.5 |
| G5 | Registry status 변경 (2줄) | G3, G4 |
| G6 | `tsc --noEmit` 검증 | G5 |

**G0은 모든 단계의 전제조건.**
**G1+G2 병렬 가능**, **G3+G4 병렬 가능**.

---

## 위험 요소

| # | 위험 | 대응 |
|---|------|------|
| 1 | Fst 알고리즘 복잡도 | Hudson (1992)이 Weir & Cockerham보다 단순. Bhatia 보정 추가 |
| 2 | ~~순열 999회 성능~~ | v1은 point estimate만 → 성능 위험 제거 |
| 3 | HW Exact Test (소표본) | 1차는 chi-square만, exact test는 2차 |
| 4 | Fst 다중 유전자좌 | 1차는 단일 유전자좌(count matrix), long-format 다중은 2차 |
| 5 | Fst count vs frequency 혼동 | 입력은 count만 허용, Worker 내부에서 frequency 변환 |

---

## v1 vs v2 범위 구분

| 기능 | v1 (이번 구현) | v2 (향후) |
|------|---------------|----------|
| HW chi-square | O | — |
| HW exact test (소표본) | — | O |
| HW 직접 입력 | O | — |
| HW CSV 다중 유전자좌 | O | — |
| Fst point estimate | O | — |
| Fst permutation p-value | — | O (개체별 데이터 입력) |
| Fst bootstrap 95% CI | — | O (다중 유전자좌 입력) |
| Fst long-format CSV | — | O |

---

## 점검 이력

### 1차 (2026-03-25, 내부 점검)

| # | 항목 | 초안 | 수정 | 근거 |
|---|------|------|------|------|
| 오류1 | HW 스텁 시그니처 | `observedCounts: List` (1D) | `rows: List[List]` (2D) | CSV 다중 유전자좌 처리 불가 |
| 오류2 | Fst 입력 형식 | long-format 4컬럼 | count matrix 1컬럼 (ICC 패턴) | 4개 셀렉터 과다, 스텁 2D와 정합 |
| 오류3 | 부트스트랩 횟수 | 100회 | 999회 | 유전학 관례, p-value 해상도 0.001 |
| 개선1 | HW 직접 입력 | 2차로 미룸 | 1차에 포함 (탭 전환) | 가장 흔한 사용 사례, 구현 간단 |
| 개선2 | Fst 셀렉터 수 | BioColumnSelect × 4 | × 1 (popCol만) | ICC 패턴 재사용 |
| 개선3 | HW interpretation | 미포함 | Worker에서 반환 | Fst와 일관성 |

### 2차 (2026-03-25, 외부 AI 리뷰)

| # | 심각도 | 항목 | 수정 |
|---|--------|------|------|
| Critical | Worker 9 코어 브리지 미지원 | `pyodide-core.service.ts` 3곳 수정을 G0 단계로 추가 |
| High | Fst frequency vs count 혼용 | "allele count matrix"로 명시, Worker 내부에서 frequency 변환 |
| High | 단일 유전자좌에서 permutation/bootstrap 정의 불가 | v1은 point estimate만, permutation/CI는 v2 (개체별/다중 유전자좌) |
| Medium | `types/bio-tools-results.ts` 누락 | 수정 파일 목록에 추가 (G2.5 단계) |
| Medium | 링크 경로 깨짐 | `../../docs/` → `../../../docs/` 수정 |
| Open | HW 시그니처 "기존 호환성" 모순 | 스텁이므로 호출 코드 없음 — rename 안전, 문구 제거 |
