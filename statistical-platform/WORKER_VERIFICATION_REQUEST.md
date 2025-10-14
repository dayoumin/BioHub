# Worker 1-4 메서드 매핑 검증 요청

## 배경
pyodide-statistics.ts를 Worker 1-4 호출 방식으로 리팩토링 중입니다.

**현재 상태**:
- pyodide-statistics.ts: **2495줄, 76KB**
- inline Python 블록: **30개** (제거 대상)
- Worker 호출: **1개** (twoWayAnova만 완료, 나머지 43개 미완료)
- **목표**: inline Python 제거 → **800-1000줄, ~25-30KB** (60% 감소)

## 파일 정보
1. **Worker 1**: `public/workers/python/worker1-descriptive.py` (7개 함수)
2. **Worker 2**: `public/workers/python/worker2-hypothesis.py` (8개 함수, `_safe_float` 헬퍼 제외)
3. **Worker 3**: `public/workers/python/worker3-nonparametric-anova.py` (16개 함수)
4. **Worker 4**: `public/workers/python/worker4-regression-advanced.py` (13개 함수)
5. **TypeScript 래퍼**: `lib/services/pyodide-statistics.ts` (41개 통계 메서드, `initialize` 등 유틸리티 제외)

**총계**: Worker 44개 함수 ↔ TypeScript 41개 메서드 (3개 차이)

## 확인 필요 사항

### 1. Worker 1-4 전체 함수 목록 추출
각 Worker 파일에서 `def function_name()` 형식의 모든 함수를 추출해주세요.

**명령어**:
```bash
cd statistical-platform
grep "^def " public/workers/python/worker1-descriptive.py
grep "^def " public/workers/python/worker2-hypothesis.py
grep "^def " public/workers/python/worker3-nonparametric-anova.py
grep "^def " public/workers/python/worker4-regression-advanced.py
```

### 2. pyodide-statistics.ts 메서드 목록 추출
TypeScript 클래스의 모든 public async 메서드를 추출해주세요.

**명령어**:
```bash
cd statistical-platform
grep "^  async [a-zA-Z]" lib/services/pyodide-statistics.ts | sed 's/async //' | sed 's/(.*$//' | sort
```

### 3. 매핑 테이블 작성
아래 형식으로 매핑 테이블을 작성해주세요:

| Worker | Python 함수 | TypeScript 메서드 | 매칭 여부 | 비고 |
|--------|-------------|-------------------|----------|------|
| Worker 1 | descriptive_stats | calculateDescriptiveStatistics | ✅ | |
| Worker 1 | descriptive_stats | descriptiveStats | ✅ | 중복 래퍼 |
| Worker 1 | normality_test | testNormality | ✅ | |
| Worker 1 | normality_test | shapiroWilkTest | ⚠️ | 특정 테스트만? |
| ... | ... | ... | ... | ... |

### 4. 불일치 분석
다음 사항을 분석해주세요:

**A. Worker에는 있는데 TypeScript에 없는 함수**
- 예: Worker에 `new_function()` 있지만 TypeScript 메서드 없음
- → 새로 추가 필요

**B. TypeScript에는 있는데 Worker에 없는 메서드**
- 예: TypeScript에 `specialMethod()` 있지만 Worker에 대응 함수 없음
- → Worker 5 생성 또는 기존 Worker에 추가 필요

**C. 1:N 매핑 (하나의 Worker 함수 → 여러 TypeScript 메서드)**
- 예: `descriptive_stats()` → `calculateDescriptiveStatistics()`, `descriptiveStats()`
- → 래퍼 통합 가능

**D. N:1 매핑 (여러 Worker 함수 → 하나의 TypeScript 메서드)**
- 예: `t_test_one_sample()`, `t_test_two_sample()` → `tTest()`
- → 파라미터로 분기

### 5. 최종 추천
다음 질문에 답해주세요:

1. **Worker 1-4의 42개 함수가 pyodide-statistics.ts의 모든 메서드를 커버하나요?**
   - YES: 바로 통합 가능
   - NO: 커버되지 않는 메서드 목록과 대응 방안 제시

2. **중복 제거 후 최종 메서드 개수는?**
   - 예: 42개 Worker 함수 → 35개 TypeScript 메서드 (7개 중복 제거)

3. **통합 우선순위는?**
   - High: Worker 함수와 1:1 매칭
   - Medium: 1:N 또는 N:1 매칭 (약간 수정 필요)
   - Low: 매칭 안 됨 (별도 작업 필요)

## 예상 결과 형식

```markdown
## 매핑 결과

### 완벽 매칭 (Priority 1): 30개
- Worker 1: descriptive_stats ↔ descriptiveStats
- Worker 2: t_test_paired ↔ pairedTTest
- ...

### 부분 매칭 (Priority 2): 8개
- Worker 1: normality_test ↔ testNormality + shapiroWilkTest (통합 가능)
- Worker 2: t_test_* ↔ tTest (파라미터 분기)
- ...

### 매칭 안 됨 (Priority 3): 4개
**TypeScript만 있음**:
- factorAnalysis → Worker 5 필요
- timeSeriesAnalysis → Worker 5 필요

**Worker만 있음**:
- (없음)

### 권장 사항
1. ✅ Priority 1 (30개)부터 통합 시작
2. ⚠️ Priority 2 (8개)는 로직 수정 후 통합
3. 🔄 Priority 3 (4개)는 Worker 5 생성 또는 inline 유지
```

## 추가 확인 사항

### method-metadata.ts 확인
```bash
cd statistical-platform
grep "methodId:" lib/statistics/registry/method-metadata.ts | wc -l
```
→ 등록된 전체 메서드 개수 확인 (60개일 가능성)

### Groups 확인
```bash
cd statistical-platform
grep "async " lib/statistics/groups/*.group.ts | wc -l
```
→ Groups에서 호출하는 메서드 개수 확인

## 최종 목표
**pyodide-statistics.ts를 2495줄 → 800-1000줄로 줄이기 위한 정확한 통합 계획 수립**

파일들을 첨부하겠습니다. 검증 부탁드립니다!