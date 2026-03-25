# External Review: Bio-Tools Charts + Worker 9 Golden Tests

> Session: 2026-03-25
> Scope: Fisheries SVG 차트 3개 + BIO_BADGE_CLASS 토큰화 + Worker 9 (HW/Fst) 골든 테스트

---

## 1. Changes Overview

| Area | Files | Description |
|------|-------|-------------|
| **Badge Tokenization** | `bio-styles.ts` + 8 page files | `BIO_BADGE_CLASS` 토큰 추출, 9곳 하드코딩 → 토큰 참조 |
| **VBGF Chart** | `vbgf/page.tsx` | 성장곡선 SVG: 산점도(관측) + polyline(적합곡선 L=Linf*(1-exp(-K*(t-t0)))) |
| **Length-Weight Chart** | `length-weight/page.tsx` | Log-log 산점도 SVG: 회귀선 + 관측값 + 수식 표시 |
| **Condition Factor Chart** | `condition-factor/page.tsx` | 히스토그램 SVG: √n 빈, mean/median 참조선 |
| **Golden Values JSON** | `statistical-golden-values.json` | HW(6 single-locus + 2 multi-locus) + Fst(4 pairwise + 3 edge cases) |
| **Vitest Schema Tests** | `python-calculation-accuracy.test.ts` | HW/Fst 골든 값 스키마 + 수학적 검증 |
| **Pyodide Golden Runner** | `run-pyodide-golden-tests.mjs` | Worker 9 Python 코드 직접 로드 + HW/Fst 함수 실행 검증 |

---

## 2. Chart Implementation Details

### 2-A. VBGF Growth Curve (`vbgf/page.tsx`)

**Data Flow:**
- Scatter: `csvData.rows[ageCol]` / `csvData.rows[lengthCol]` → null/empty/NaN 3단계 필터
- Curve: `results.lInf`, `results.k`, `results.t0` → 50-point interpolation

**SVG Layout:** `viewBox="0 0 400 300"`, plot area `(50,20)-(370,250)`, 320×230

**Edge Cases Handled:**
- `ageMin === ageMax` → ±0.5 padding
- `yMax = 0` → `Math.max(..., 0.1)` floor
- All NaN after filtering → returns `null` (no chart)

**Review Questions:**
1. `chartData` depends on `csvData + ageCol + lengthCol + results`. 컬럼 선택 변경 시 results는 이전 분석 그대로인데 scatter는 새 컬럼을 반영 — 순간적 불일치 발생. 의도된 동작인가?
2. `predicted` 배열(Worker 반환)을 무시하고 TS에서 VBGF 수식을 재계산. Worker의 `predicted`와 TS 계산 간 부동소수점 차이 가능. Worker 값을 직접 사용하는 것이 더 정확한가?

### 2-B. Length-Weight Log-Log Scatter (`length-weight/page.tsx`)

**Data Flow:**
- Scatter: `results.logLogPoints` (Worker에서 이미 계산)
- Regression: `logW = logA + b * logL` (2-point line)
- SVG 회귀선 좌표는 `useMemo` 내에서 사전 계산

**Edge Cases:**
- `logLMin === logLMax` → ±0.1 padding
- `logWMin === logWMax` → ±0.1 padding
- `yRange = 0` → `|| 1` fallback

**Review Question:**
3. 회귀선 Y좌표를 `useMemo`에서 SVG 픽셀로 사전 변환 (`regLineY1`, `regLineY2`). 이는 데이터-표현 혼합이지만 IIFE 제거를 위한 트레이드오프. 허용 가능한가?

### 2-C. Condition Factor Histogram (`condition-factor/page.tsx`)

**Data Flow:**
- `results.individualK` → √n bins (max 20)
- Mean/Median X좌표는 `useMemo` 내에서 사전 계산

**Edge Cases:**
- `kMin === kMax` → ±0.1 padding
- bins max 20 → `Math.max(...bins)` safe (20 elements)

**Review Question:**
4. 히스토그램 bin 경계에 정확히 걸치는 값의 처리: `Math.floor((val - kMin) / binWidth)`. `val === kMax`일 때 `nBins`가 나올 수 있어 `Math.min(..., nBins - 1)`로 방어. 충분한가?

---

## 3. Common SVG Pattern (7 pages share this)

모든 Bio-Tools SVG 차트가 동일한 레이아웃 상수를 사용:

```
viewBox: "0 0 400 300"
leftMargin: 50, topMargin: 20
plotWidth: 320, plotHeight: 230
bottomY: 250, rightX: 370
```

현재 각 페이지에 인라인. 향후 `BioSvgChartFrame` 공통 컴포넌트 추출 예정.

**Review Question:**
5. 7개 차트의 보일러플레이트(frame rect, grid lines, axis labels)가 ~40줄씩 반복. 이번 세션에서 추출하지 않은 이유: 기존 4개 차트(survival, rarefaction, nmds, roc-auc)의 레이아웃 상수가 각각 다름 (viewBox: 400x300, 500x300, 320x320). 통일 후 추출이 필요. 현재 상태에서 추출이 시급한가?

---

## 4. Worker 9 Golden Tests

### 4-A. JSON Structure (`statistical-golden-values.json`)

```
hardyWeinberg:
  singleLocus: [6 cases]
    - perfect equilibrium (p=0.6, chi²=0)
    - HW departure (Het excess, chi²=32)
    - textbook data (marginal, p≈0.05)
    - monomorphic p=0
    - monomorphic p=1
    - low expected warning (n=10)
  multiLocus: [2 cases]
    - 2 loci with custom labels
    - lowExpectedWarning OR propagation

fst:
  pairwise: [4 cases]
    - identical pops → Fst=0
    - fixed different → Fst≈1
    - 3 pops symmetry + diagonal zero
    - moderate differentiation
  edgeCases: [3 cases]
    - n≤1 → ValueError
    - n=0 → ValueError
    - single pop → ValueError
```

### 4-B. Vitest Schema Tests (`python-calculation-accuracy.test.ts`)

- HW single-locus: 구조 검증 + monomorphic 케이스 존재 확인 + 수학적 검증 (p = (2*AA + Aa) / 2n)
- HW multi-locus: `locusResultsLength === rows.length` 검증
- Fst pairwise: 구조 검증 + identical→Fst=0 + fixed→Fst≥0.9
- Fst edge cases: error 문자열 존재 검증

### 4-C. Pyodide Golden Runner (`run-pyodide-golden-tests.mjs`)

**실행 방식:**
1. Pyodide + numpy + scipy 로드
2. `worker9-genetics.py` 파일을 `readFileSync`로 읽어 `runPythonAsync`로 실행
3. `hardy_weinberg()`, `fst()` Python 함수를 직접 호출
4. 반환값을 JSON 파싱 후 `isCloseEnough(actual, expected, tolerance)` 검증

**HW 검증:**
- 수치 필드: tolerance 기반 근사 비교
- 불리언 필드: exact 비교
- `locusResultsLength`: 배열 길이 검증
- `locusLabels`: 라벨 순서 검증

**Fst 검증:**
- `globalFst`: tolerance 비교
- `symmetricMatrix`: `|m[i][j] - m[j][i]| < 1e-10`
- `diagonalZero`: `m[i][i] === 0`
- Edge cases: try/except → error 메시지 substring 검증

**Review Questions:**
6. ~~HW `textbook data` 기대값 오류~~ — 수정됨. chi²=3.214, p=0.073으로 교정 (기존 3.826/0.0505는 계산 오류)
7. Fst `fixed different alleles` 기대값 `globalFst: 1.0`에 tolerance 0.02. Hudson+Bhatia 편향 보정 시 정확히 1.0이 아닐 수 있음. 실제 계산값으로 업데이트 필요한가?
8. Golden runner가 `run-pyodide-golden-tests.mjs`에 Worker 9 코드를 `readFileSync + runPythonAsync`로 로드. 이는 Worker의 top-level 코드가 부작용 없이 함수 정의만 한다는 가정. Worker 파일에 `if __name__ == '__main__':` 가드가 없는데, side effect 위험은?

### Post-review Fixes (2026-03-25)

| Fix | Issue | Resolution |
|-----|-------|------------|
| HW chi² 값 오류 | `[10,80,10]` chi²=32→36, `[90,40,10]` chi²=3.826→3.214 | 수동 검증 후 JSON 수정 |
| Fst edge-case runner 깨짐 | `json.dumps()` 가 statement → `runPythonAsync` returns undefined | `_out` 변수 + 마지막 expression 패턴 |
| VBGF stale scatter | 컬럼 변경 시 이전 결과와 새 scatter 혼합 | `analyzedCols` 스냅샷 패턴 도입 |

---

## 5. `/simplify` Review Applied

이번 세션에서 3-agent `/simplify` 리뷰 후 수정한 항목:

| Fix | Files | Before → After |
|-----|-------|----------------|
| Stack overflow prevention | 3 chart files | `Math.min(...array)` → loop-based min/max |
| Division-by-zero guard | vbgf, length-weight | missing → `if (min === max)` padding |
| yMax=0 guard | vbgf | `Math.max(a, b) * 1.1` → `Math.max(a, b, 0.1) * 1.1` |
| IIFE elimination | length-weight, condition-factor | JSX IIFE → pre-computed in useMemo |
| Hardcoded colors | condition-factor | `#dc2626`/`#16a34a` → `BIO_CHART_COLORS[1]`/`[2]` |
| Dead variable removal | length-weight | unused `xRange` in IIFE |

### Deferred Items

| Item | Reason |
|------|--------|
| SVG chart frame extraction | 기존 4개 차트 viewBox 불일치 (400x300, 500x300, 320x320). 통일 후 추출 |
| HW small badge tokenization | `px-1.5 py-0.5 text-[10px]` — 1곳 사용, 별도 토큰 가치 없음 |
| VBGF `extractRowValue` 사용 | 유효하지만 paired extraction이라 기존 유틸 직접 적용 불가 |
| Unbounded SVG circle count | fisheries 데이터 통상 수백~수천 행. 10K+ 대응은 향후 |

---

## 6. Verification

```bash
# TypeScript
pnpm tsc --noEmit     # ✅ 0 errors

# Vitest (golden schema)
pnpm test:golden-values   # ✅ 52 tests passed (기존 34 + 신규 18)

# Pyodide golden runner (실제 Python 실행)
pnpm test:pyodide-golden  # ⏳ 별도 실행 필요 (Node.js + Pyodide 환경)
```
