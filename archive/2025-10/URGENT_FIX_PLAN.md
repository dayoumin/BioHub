# 긴급 수정 계획 (Urgent Fix Plan)

**작성일**: 2025-10-14
**현재 상태**: 레거시 파일 삭제 완료, 687개 TypeScript 에러 남음

---

## 📊 현재 상황

### ✅ 완료된 작업 (2025-10-13)
- Groups 구조 완성 (60개 메서드, 타입 에러 0개)
- Python Workers 라이브러리 마이그레이션
- pyodide-statistics.ts 일부 메서드 추가
- 레거시 파일 삭제 (2025-10-14)

### ❌ 남은 에러 (687개)
- **app/ 페이지**: 218개
- **components/**: 98개  
- **calculator-handlers**: 57개
- **executors**: 56개
- **tests**: 16개
- **기타**: 42개

---

## 🎯 긴급 수정 우선순위

### Priority 1: PyodideService 누락 메서드 추가 (1-2시간)

**필수 메서드** (에러 빈도 높음):

1. **chiSquareGoodnessTest** (8개 에러)
   - 파일: `lib/services/pyodide-statistics.ts`
   - Worker: `worker2-hypothesis.py` (또는 worker1)
   - 구현: SciPy `stats.chisquare()`

2. **chiSquareIndependenceTest** (8개 에러)
   - 파일: `lib/services/pyodide-statistics.ts`
   - Worker: `worker2-hypothesis.py`
   - 구현: SciPy `stats.chi2_contingency()`

3. **calculateDescriptiveStats** (6개 에러)
   - 확인 필요: 이미 `descriptiveStats()` 메서드 있음
   - 메서드명 통일 또는 별칭 추가

4. **twoWayANOVA** (3개 에러)
   - 확인 필요: `twoWayAnovaWorker()` 이미 있음
   - 케이스 문제: `twoWayANOVA` vs `twoWayAnova`

**작업 순서**:
```typescript
// 1. pyodide-statistics.ts에 메서드 추가
async chiSquareGoodnessTest(observed, expected?, alpha = 0.05) {
  await this.ensureWorkerLoaded('worker2')
  const result = await this.pyodide.runPythonAsync(`
    import json
    from worker2_hypothesis import chi_square_goodness_test
    result = chi_square_goodness_test(${observed}, ${expected}, ${alpha})
    json.dumps(result)
  `)
  return JSON.parse(result)
}

// 2. worker2-hypothesis.py에 Python 함수 추가 (또는 이미 있는지 확인)
def chi_square_goodness_test(observed, expected=None, alpha=0.05):
    from scipy import stats
    result = stats.chisquare(observed, expected)
    return {
        'chiSquare': float(result.statistic),
        'pValue': float(result.pvalue),
        'degreesOfFreedom': len(observed) - 1
    }
```

---

### Priority 2: 메서드명 통일 (30분)

**케이스 불일치 문제**:
- `twoWayANOVA` → `twoWayAnovaWorker` (이미 있음)
- `repeatedMeasuresAnova` → `repeatedMeasuresAnovaWorker` (이미 있음)
- `calculateDescriptiveStats` → `descriptiveStats` (이미 있음)

**해결 방법**:
```typescript
// pyodide-statistics.ts에 별칭 추가
async twoWayANOVA(...args) {
  return this.twoWayAnovaWorker(...args)
}

async calculateDescriptiveStats(data) {
  return this.descriptiveStats(data)
}
```

---

### Priority 3: calculator-handlers 타입 수정 (1시간)

**문제**:
- `any` 타입 사용 (57개 에러)
- 타입 단언 남용

**수정 파일**:
1. `lib/statistics/calculator-handlers/advanced.ts` (25개 에러)
2. `lib/statistics/calculator-handlers/nonparametric.ts` (12개)
3. `lib/statistics/calculator-handlers/hypothesis-tests.ts` (12개)
4. `lib/statistics/calculator-handlers/anova.ts` (8개)

**해결 방법**:
- CLAUDE.md 규칙 적용 (any → unknown + 타입 가드)
- Groups 파일의 패턴 참고

---

### Priority 4: app 페이지 타입 수정 (2-3시간)

**문제**:
- 218개 에러 (가장 많음)
- 옛날 API 사용

**수정 전략**:
1. **단기**: 타입 에러만 수정 (`@ts-ignore` 최소화)
2. **장기**: Groups 사용하도록 리팩토링

**우선 수정 페이지** (에러 많은 순):
1. `chi-square-goodness/page.tsx`
2. `chi-square-independence/page.tsx`  
3. `correlation/page.tsx`
4. `cluster/page.tsx`

---

## 📋 작업 체크리스트

### Phase 1: 긴급 메서드 추가 (1-2시간)
- [ ] chi-square 메서드 Python 구현 확인
- [ ] `chiSquareGoodnessTest()` 추가
- [ ] `chiSquareIndependenceTest()` 추가
- [ ] 메서드명 별칭 추가 (twoWayANOVA 등)
- [ ] TypeScript 컴파일 체크

### Phase 2: calculator-handlers 수정 (1시간)
- [ ] `advanced.ts` any 타입 제거
- [ ] `nonparametric.ts` any 타입 제거
- [ ] `hypothesis-tests.ts` any 타입 제거
- [ ] `anova.ts` any 타입 제거

### Phase 3: app 페이지 수정 (2-3시간)
- [ ] chi-square 페이지 2개 수정
- [ ] correlation 페이지 수정
- [ ] cluster 페이지 수정
- [ ] 나머지 페이지 타입 에러 수정

### Phase 4: 검증 및 커밋 (30분)
- [ ] TypeScript 컴파일 에러 0개 확인
- [ ] 주요 페이지 런타임 테스트
- [ ] 커밋 및 푸시

---

## 🎯 목표

**단기 목표** (오늘):
- TypeScript 에러 **687개 → 100개 이하**
- 주요 페이지 (chi-square, correlation) 작동

**중기 목표** (이번 주):
- TypeScript 에러 **0개**
- 모든 app 페이지 정상 작동

---

## 📝 참고

- [CLAUDE.md](CLAUDE.md) - AI 코딩 규칙
- [dailywork.md](dailywork.md) - 어제 작업 내역
- [lib/statistics/groups/](statistical-platform/lib/statistics/groups/) - 타입 안전한 참고 코드
