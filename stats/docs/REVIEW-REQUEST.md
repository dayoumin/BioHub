# Code Review Request: Bio-Tools 품질 개선 + 공통 유틸 추출

**날짜**: 2026-03-25
**변경 파일**: 29개 (298 추가, 398 삭제 = 순 -100줄)
**테스트**: 6,708 pass / 15 fail (기존 실패, 이번 변경 무관)

---

## 변경 요약

| # | 카테고리 | 파일 수 | 핵심 변경 |
|---|----------|---------|-----------|
| A | Bio-Tools 타입 중앙화 | 14 | 14개 페이지 인라인 interface → `types/bio-tools-results.ts` import |
| B | Fisheries 컬럼 감지 정확도 | 2+test | `includes()` → 단어 경계 매칭, `year` 힌트 제거 |
| C | BioColumnSelect Tailwind purge 안전 | 1 | 동적 보간 `text-${labelSize}` → 정적 분기 |
| D | `escapeRegex` 공통 유틸 추출 | 5 | 4곳 중복 → `lib/escape-regex.ts` 단일 소스 |
| E | Worker7 그룹 필터링 강화 | 1 | condition_factor에 None/NaN/빈문자열 그룹 필터링 + ANOVA df2 추가 |
| F | Intent Router 임계값 + 테스트 정합 | 2 | 테스트 주석 0.7→0.6 일치시킴 |
| G | `runAnalysis` 타입 강화 | 1 | `methodName: string` → `AllMethodNames` union |
| H | 정리 | 2 | `barcoding/page.tsx` re-export 삭제, 리뷰 문서 삭제 |

---

## A. Bio-Tools 타입 중앙화 (14개 페이지)

**변경**: 각 페이지에 인라인 정의된 result interface를 `types/bio-tools-results.ts`로 이동, `import type`으로 교체.

**대상**: alpha-diversity, beta-diversity, condition-factor, icc, length-weight, mantel-test, meta-analysis, nmds, permanova, rarefaction, roc-auc, survival, vbgf (13개 페이지 + hooks/use-bio-tool-analysis.ts)

**리뷰 포인트**:
- 타입 정의가 `types/bio-tools-results.ts`에 정확히 대응하는지
- 미사용 import가 남아있지 않은지 (예: `KmCurve`는 survival/page.tsx에서 실제 사용됨 — 확인 완료)

---

## B. Fisheries 컬럼 자동 감지 — 단어 경계 매칭

**문제**: `detectColumn()`의 2차 매칭이 `includes()`를 써서 오탐 발생 가능
- `age` → `stage` 매칭
- `tl` → `title`, `bottle` 매칭
- `year`가 연령 힌트에 포함 → `sampling_year` 오매칭

**수정** (`lib/bio-tools/fisheries-columns.ts`):
```typescript
// BEFORE — 부분 문자열 매칭
const partial = headers.find(h => lower.some(hint => h.toLowerCase().includes(hint)))

// AFTER — 단어 경계 매칭 (비알파뉴메릭을 경계로 취급)
function matchesWordBoundary(header: string, hint: string): boolean {
  const escaped = escapeRegex(hint)
  const pattern = new RegExp(`(?:^|[^a-zA-Z0-9])${escaped}(?:$|[^a-zA-Z0-9])`, 'i')
  return pattern.test(header)
}
```

- `AGE_HINTS`에서 `'year'` 제거

**테스트 커버리지** (25개):
| 테스트 케이스 | 힌트 | 기대 |
|---|---|---|
| `stage` | `age` | 매칭 안 됨 |
| `cage_number` | `age` | 매칭 안 됨 |
| `fish_age` | `age` | 매칭됨 |
| `title`, `bottle`, `shuttle` | `tl` | 매칭 안 됨 |
| `tl_mm`, `tl-cm`, `tl.cm` | `tl` | 매칭됨 |
| `result` | `sl` | 매칭 안 됨 |
| `shuffle` | `fl` | 매칭 안 됨 |
| `fl_cm` | `fl` | 매칭됨 |
| `연령(세)` | `연령` | 매칭됨 (한글 경계) |
| `year`, `sampling_year` | (제거됨) | 연령 감지 안 됨 |

**리뷰 포인트**:
- `[^a-zA-Z0-9]` 경계 정의가 수산 데이터 헤더 컨벤션에 충분한지
- 한글 문자가 `[^a-zA-Z0-9]`에 포함되므로 한글 힌트는 항상 경계 매칭됨 — 의도된 동작인지
- 매 호출 `new RegExp()` 생성 — CSV 업로드 시 최대 ~20회, hot-path 아님

---

## C. BioColumnSelect Tailwind purge 안전

**변경** (`components/bio-tools/BioColumnSelect.tsx:37`):
```diff
- <label className={`text-${labelSize} text-muted-foreground ...`}>
+ <label className={`${labelSize === 'xs' ? 'text-xs' : 'text-sm'} text-muted-foreground ...`}>
```

**이유**: Tailwind의 content scan이 `text-${labelSize}`를 정적으로 감지하지 못해 프로덕션 빌드에서 purge될 수 있음.

---

## D. `escapeRegex` 공통 유틸 추출

**문제**: 동일한 regex escape 함수가 4곳에 중복 존재

**수정**: `lib/escape-regex.ts`에 단일 정의, 4곳에서 import
```
lib/escape-regex.ts          (NEW — 단일 소스)
├── lib/help/help-search.ts       (로컬 함수 제거)
├── lib/services/intent-router.ts (로컬 함수 제거)
├── lib/services/pyodide-helper.ts (로컬 함수 제거)
└── lib/bio-tools/fisheries-columns.ts (신규 사용)
```

**리뷰 포인트**:
- `lib/escape-regex.ts` 위치가 적절한지 (lib/ 루트 vs lib/utils/)
- 순환 의존 없음 확인 (escape-regex.ts는 import 0개)

---

## E. Worker7 그룹 필터링 강화

**문제**: `condition_factor()`에서 그룹 컬럼에 None/NaN/빈 문자열이 포함되면 그대로 통계 비교에 투입됨

**수정** (`public/workers/python/worker7-fisheries.py`):
```python
# 모듈 상수
INVALID_GROUP_VALUES = ('none', 'nan', 'null', 'na', 'n/a', '#n/a')

# condition_factor() 내부
for gi, gval in enumerate(raw_groups):
    if gval is None:
        continue
    s = str(gval).strip()
    if s == '' or s.lower() in INVALID_GROUP_VALUES:
        continue
    valid_idx.append(gi)
    clean_groups.append(s)
```

추가: ANOVA 결과에 `df2` (잔차 자유도) 필드 추가

**리뷰 포인트**:
- sentinel 목록 (`INVALID_GROUP_VALUES`)이 충분한지 — 누락된 패턴?
- `K[valid_idx]` re-indexing 후 후속 통계 연산 정합성
- `df2` 타입이 `bio-tools-results.ts`의 `comparison.df2?: number`와 일치하는지

---

## F. Intent Router 테스트 주석 정합

**문제**: 런타임 코드의 키워드 임계값은 `0.6`이지만, 테스트 주석이 `0.7`로 남아 있었음

**수정**: 테스트 주석 3곳을 `>= 0.6`으로 정정, 테스트 assertion은 이미 올바른 값이었음 (주석만 stale)

**리뷰 포인트**: 런타임 코드 `intent-router.ts:132`의 `>= 0.6` 임계값 자체가 적절한지

---

## G. `runAnalysis` 타입 강화

**변경** (`hooks/use-bio-tool-analysis.ts`):
```diff
- runAnalysis: (methodName: string, params: ...) => Promise<void>
+ runAnalysis: (methodName: AllMethodNames, params: ...) => Promise<void>
```

`runWithPreStep`도 동일 적용. `AllMethodNames`는 `methods-registry.types.ts`에서 import된 union 타입.

---

## H. 정리

- `app/bio-tools/barcoding/page.tsx` 삭제 — `genetics/barcoding/page` re-export일 뿐, 경로 정리
- `docs/REVIEW-PARALLEL-QUALITY-FIXES.md` 삭제 — 이전 리뷰 결과 문서 (코드에 반영 완료)
- `TODO.md` 4항목 완료 처리

---

## 전체 아키텍처 다이어그램 (변경 연관)

```
types/bio-tools-results.ts   ← 14개 bio-tools 페이지 import
lib/escape-regex.ts           ← 4개 소비자 (help-search, intent-router, pyodide-helper, fisheries-columns)
lib/bio-tools/fisheries-columns.ts  ← vbgf, length-weight, condition-factor 페이지
hooks/use-bio-tool-analysis.ts      ← 14개 bio-tools 페이지
worker7-fisheries.py          ← condition_factor() 그룹 필터링
```

---

## 리뷰어에게 요청

1. **B (fisheries 단어 경계)**: 정규식 `[^a-zA-Z0-9]` 경계가 실제 수산 데이터 CSV 헤더에서 충분히 안전한지
2. **D (escapeRegex 위치)**: `lib/escape-regex.ts` vs `lib/utils/escape-regex.ts` 등 위치 의견
3. **E (Python sentinel)**: `INVALID_GROUP_VALUES` 목록의 완전성
4. **F (임계값 0.6)**: intent-router 키워드 confidence 임계값이 적절한지 (0.6이면 키워드 1개 매칭으로도 LLM 호출 생략)
5. 전체적으로 놓친 엣지케이스나 regression 위험
