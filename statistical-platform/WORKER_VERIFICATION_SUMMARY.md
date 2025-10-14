# Worker 1-4 검증 요약 (자가 진단)

## 📊 현재 상태

### Worker 함수 개수
| Worker | 파일 | 함수 개수 | 비고 |
|--------|------|----------|------|
| Worker 1 | worker1-descriptive.py | 7개 | ✅ |
| Worker 2 | worker2-hypothesis.py | 8개 | `_safe_float` 헬퍼 제외 |
| Worker 3 | worker3-nonparametric-anova.py | 16개 | ✅ |
| Worker 4 | worker4-regression-advanced.py | 13개 | ✅ |
| **전체** | | **44개** | 공개 함수 |

### TypeScript 메서드 개수
- **pyodide-statistics.ts**: 42개 메서드
- **차이**: Worker 44개 - TypeScript 42개 = **2개 차이**

## ❓ 불일치 원인 가능성

### 1. Worker에 2개 더 있을 가능성
- Worker 2의 헬퍼 함수 포함 카운트?
- 새로 추가된 함수가 TypeScript에 아직 통합 안됨?

### 2. TypeScript에 래퍼/중복이 있을 가능성
- 예: `descriptiveStats` + `calculateDescriptiveStatistics` (동일 기능)
- 예: `tTest` (one-sample, two-sample, paired 통합)

### 3. 메서드명 불일치
- Python: `snake_case` (t_test_one_sample)
- TypeScript: `camelCase` (oneSampleTTest)

## 🔍 다음 확인 필요

### A. Worker 2 정확한 공개 함수 목록
```python
# Worker 2 (worker2-hypothesis.py)
t_test_two_sample      → twoSampleTTest? 또는 tTest?
t_test_paired          → pairedTTest? 또는 tTest?
t_test_one_sample      → oneSampleTTest? 또는 tTest?
z_test                 → zTest?
chi_square_test        → chiSquareTest? 또는 chiSquare?
binomial_test          → binomialTest?
correlation_test       → correlation? 또는 calculateCorrelation?
partial_correlation    → ??? (pyodide-statistics.ts에 없을 수 있음)
```

### B. pyodide-statistics.ts 중복 메서드 확인
```typescript
// 의심 중복
descriptiveStats vs calculateDescriptiveStatistics
chiSquare vs chiSquareTest
correlation vs calculateCorrelation
pca vs performPCA
tukeyHSD vs performTukeyHSD
```

### C. 1:N 매핑 확인
```typescript
// tTest 메서드가 여러 Worker 함수 호출?
async tTest(data, options) {
  if (options.paired) {
    // call t_test_paired
  } else if (options.oneSample) {
    // call t_test_one_sample
  } else {
    // call t_test_two_sample
  }
}
```

## 📋 다른 AI 검증 요청 사항

### 필수 확인
1. **Worker 44개 함수의 정확한 목록** (헬퍼 제외)
2. **TypeScript 42개 메서드의 정확한 목록**
3. **1:1 매핑 테이블 작성**
4. **불일치 분석 및 해결 방안**

### 첨부할 파일
```
public/workers/python/worker1-descriptive.py
public/workers/python/worker2-hypothesis.py
public/workers/python/worker3-nonparametric-anova.py
public/workers/python/worker4-regression-advanced.py
lib/services/pyodide-statistics.ts
```

### 요청 프롬프트
**"Worker 1-4의 모든 공개 함수(헬퍼 제외)와 pyodide-statistics.ts의 모든 메서드를 매핑해주세요. 1:1 매핑, 1:N 매핑, N:1 매핑, 불일치를 모두 분류하고, 통합 우선순위를 제시해주세요."**

## 🎯 기대 결과

### 시나리오 1: 완벽 매칭 (Best Case)
- Worker 44개 → TypeScript 42개 (2개 중복 제거)
- → 바로 통합 가능

### 시나리오 2: 부분 매칭 (Likely)
- Worker 44개 ↔ TypeScript 42개
- 일부는 1:N 또는 N:1 매핑
- → 로직 수정 후 통합

### 시나리오 3: 추가 작업 필요 (Worst Case)
- Worker 44개 < TypeScript 42개 + 추가 메서드
- → Worker 5 생성 또는 inline 유지

## 💡 결론

**정확한 매핑 없이는 통합 진행 불가!**

다른 AI에게 검증 요청 후, 명확한 계획 수립하고 통합 시작해야 합니다.

---

**다음 단계**:
1. ✅ WORKER_VERIFICATION_REQUEST.md 작성 완료
2. ⏳ 다른 AI에게 파일 첨부 + 검증 요청
3. ⏳ 검증 결과 기반 통합 계획 수립
4. ⏳ Worker 통합 시작