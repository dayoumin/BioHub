# Phase 2-3 Priority 3: 신규 페이지 생성 계획

**작성일**: 2025-11-07
**목표**: Python Worker에 존재하지만 프론트엔드 페이지가 없는 3개 메서드의 페이지 생성

---

## 📊 현황 요약

### ✅ Phase 2-3 완료 항목
1. **Priority 1** ✅ 완료 (3개 페이지 PyodideCore 연결)
   - McNemar Test: JS 직접 계산 → PyodideCore
   - Runs Test: Mock 데이터 → PyodideCore
   - Sign Test: Mock 데이터 → PyodideCore

2. **Priority 2** ✅ 완료 (Regression 리팩토링)
   - Linear Regression: Mock → PyodideCore
   - Multiple Regression: Mock → PyodideCore
   - Logistic Regression: Mock → PyodideCore
   - 기술부채 완전 해결 (CI, VIF, ROC/AUC, Confusion Matrix)
   - 커밋: `e34b1a5` - feat(regression): PyodideCore 연결 + 기술부채 완전 해결

### 🔴 Priority 3: 신규 페이지 생성 (현재 작업)

**대상 메서드**:
1. **Cochran Q Test** - 반복측정 이진 데이터 검정
2. **Mood Median Test** - 중앙값 기반 비모수 검정
3. **Binomial Test** - 이항 검정

---

## 🎯 Priority 3 상세 계획

### 메서드 1: Cochran Q Test

#### Python Worker 정보
- **파일**: `worker3-nonparametric-anova.py`
- **라인**: 419-445
- **메서드명**: `cochran_q_test(data_matrix)`
- **라이브러리**: statsmodels.stats.contingency_tables.cochrans_q

#### 입력 파라미터
```python
data_matrix: List[List[int]]  # 2D 행렬 (n subjects × k conditions)
# 예시: [[1, 0, 1], [0, 0, 1], [1, 1, 1]]
# - n subjects (행): 최소 2개 이상
# - k conditions (열): 최소 3개 이상
# - 값: 0 또는 1 (이진 데이터)
```

#### 반환 결과
```typescript
{
  qStatistic: number      // Cochran Q 통계량
  pValue: number          // p-value
  df: number              // 자유도 (k - 1)
}
```

#### 통계 설명
- **목적**: 반복측정된 이진 데이터(0/1)에서 조건 간 차이 검정
- **용도**:
  - 3개 이상의 처리/조건에서 성공률 비교
  - 동일 피험자가 여러 조건을 경험한 경우
  - 예: 3가지 약물의 효과 비교 (효과 있음=1, 없음=0)
- **가정**:
  - 이진 데이터 (0 또는 1)
  - 반복측정 설계
  - 최소 2명 피험자, 3개 조건
- **귀무가설**: 모든 조건의 성공 확률이 동일함
- **대립가설**: 적어도 한 조건의 성공 확률이 다름

#### 페이지 구조
```
Step 0: 데이터 업로드 (CSV)
Step 1: 변수 선택
  - Subjects (행 식별자)
  - Conditions (3개 이상의 이진 변수 선택)
Step 2: 분석 실행
  - PyodideCore.callWorkerMethod(3, 'cochran_q_test', { data_matrix })
Step 3: 결과 표시
  - Q 통계량, p-value, 자유도
  - 조건별 성공률
  - 해석 및 권장사항
```

#### 예상 작업량
- **UI 개발**: 1-1.5시간 (기존 페이지 참고)
- **PyodideCore 연결**: 30분
- **결과 표시**: 30분
- **테스트**: 30분
- **총**: 2.5-3시간

---

### 메서드 2: Mood Median Test

#### Python Worker 정보
- **파일**: `worker3-nonparametric-anova.py`
- **라인**: 448-459
- **메서드명**: `mood_median_test(groups)`
- **라이브러리**: scipy.stats.median_test

#### 입력 파라미터
```python
groups: List[List[float]]  # 2개 이상의 그룹 데이터
# 예시: [[1.2, 2.3, 3.4], [4.5, 5.6], [7.8, 9.0, 10.1]]
# - 최소 2개 그룹
# - 각 그룹 최소 1개 관측값
```

#### 반환 결과
```typescript
{
  statistic: number         // Chi-square 통계량
  pValue: number            // p-value
  grandMedian: number       // 전체 중앙값
  contingencyTable: number[][]  // 분할표 (2 × k)
}
```

#### 통계 설명
- **목적**: 2개 이상 그룹의 중앙값 비교 (비모수 검정)
- **용도**:
  - 정규성 가정 없이 그룹 간 위치 차이 검정
  - 이상치에 강건한 검정
  - Kruskal-Wallis의 대안 (중앙값 기반)
- **방법**:
  1. 전체 데이터의 중앙값 계산 (grand median)
  2. 각 그룹에서 중앙값 이상/미만 개수 세기
  3. 2×k 분할표 생성
  4. Chi-square 검정 수행
- **가정**:
  - 독립 표본
  - 순서형 이상 데이터
- **귀무가설**: 모든 그룹의 중앙값이 동일함
- **대립가설**: 적어도 한 그룹의 중앙값이 다름

#### 페이지 구조
```
Step 0: 데이터 업로드 (CSV)
Step 1: 변수 선택
  - Grouping Variable (범주형)
  - Test Variable (연속형)
Step 2: 분석 실행
  - 그룹별 데이터 추출
  - PyodideCore.callWorkerMethod(3, 'mood_median_test', { groups })
Step 3: 결과 표시
  - Chi-square 통계량, p-value
  - Grand median
  - 분할표 (Above/Below median × Groups)
  - 그룹별 중앙값
  - 해석 및 권장사항
```

#### 예상 작업량
- **UI 개발**: 1-1.5시간
- **데이터 그룹화**: 30분
- **PyodideCore 연결**: 30분
- **결과 표시**: 30분
- **테스트**: 30분
- **총**: 3-3.5시간

---

### 메서드 3: Binomial Test

#### Python Worker 정보
- **파일**: `worker2-hypothesis.py`
- **라인**: 136-155
- **메서드명**: `binomial_test(success_count, total_count, probability, alternative)`
- **라이브러리**: scipy.stats.binomtest

#### 입력 파라미터
```python
success_count: int        # 성공 횟수
total_count: int          # 전체 시행 횟수
probability: float        # 귀무가설 확률 (기본값: 0.5)
alternative: str          # 'two-sided', 'less', 'greater'
```

#### 반환 결과
```typescript
{
  pValue: number          // p-value
  successCount: number    // 성공 횟수
  totalCount: number      // 전체 시행 횟수
}
```

#### 통계 설명
- **목적**: 이항 분포 확률 검정 (단일 비율 검정)
- **용도**:
  - 관측된 성공률이 기대 확률과 같은지 검정
  - 예: 동전 던지기 (H0: p=0.5), 신약 효과율 (H0: p=0.7)
- **가정**:
  - 이항 시행 (성공/실패 두 가지 결과)
  - 독립 시행
  - 고정된 성공 확률
- **귀무가설**: 성공 확률 = probability (기대값)
- **대립가설**:
  - `two-sided`: 성공 확률 ≠ probability
  - `less`: 성공 확률 < probability
  - `greater`: 성공 확률 > probability

#### 페이지 구조
```
Step 0: 데이터 입력 방식 선택
  - 옵션 A: CSV 업로드 (이진 변수)
  - 옵션 B: 직접 입력 (성공 횟수, 전체 횟수)
Step 1: 변수/파라미터 설정
  - [옵션 A] 변수 선택 (0/1 또는 성공/실패 변수)
  - [옵션 B] 성공 횟수, 전체 횟수 입력
  - 귀무가설 확률 입력 (기본값: 0.5)
  - 대립가설 선택 (양측, 작음, 큼)
Step 2: 분석 실행
  - PyodideCore.callWorkerMethod(2, 'binomial_test', { success_count, total_count, probability, alternative })
Step 3: 결과 표시
  - p-value
  - 관측 성공률 vs 기대 확률
  - 95% 신뢰구간 (Clopper-Pearson 방법)
  - 해석 및 권장사항
```

#### 예상 작업량
- **UI 개발**: 1.5-2시간 (2가지 입력 방식)
- **PyodideCore 연결**: 30분
- **결과 표시**: 30분
- **신뢰구간 계산**: 30분 (추가 Python Worker 메서드 필요 여부 확인)
- **테스트**: 30분
- **총**: 3-4시간

---

## 📋 구현 체크리스트

### Cochran Q Test
- [ ] 페이지 파일 생성: `app/(dashboard)/statistics/cochran-q/page.tsx`
- [ ] 데이터 업로드 Step 추가
- [ ] 변수 선택 UI (Subjects + 3개 이상 Conditions)
- [ ] 데이터 → 2D 행렬 변환 로직
- [ ] PyodideCore 호출 (`worker3`, `cochran_q_test`)
- [ ] 결과 표시 UI (Q, p-value, df, 조건별 성공률)
- [ ] 통합 테스트 작성
- [ ] TypeScript 컴파일 에러 0개 확인
- [ ] 코드 리뷰
- [ ] 커밋

### Mood Median Test
- [ ] 페이지 파일 생성: `app/(dashboard)/statistics/mood-median/page.tsx`
- [ ] 데이터 업로드 Step 추가
- [ ] 변수 선택 UI (Grouping + Test Variable)
- [ ] 그룹별 데이터 분리 로직
- [ ] PyodideCore 호출 (`worker3`, `mood_median_test`)
- [ ] 결과 표시 UI (Chi-square, p-value, grand median, 분할표)
- [ ] 통합 테스트 작성
- [ ] TypeScript 컴파일 에러 0개 확인
- [ ] 코드 리뷰
- [ ] 커밋

### Binomial Test
- [ ] 페이지 파일 생성: `app/(dashboard)/statistics/binomial/page.tsx`
- [ ] 2가지 입력 방식 UI (CSV vs 직접 입력)
- [ ] 변수 선택 UI (CSV 모드)
- [ ] 파라미터 입력 UI (직접 입력 모드)
- [ ] PyodideCore 호출 (`worker2`, `binomial_test`)
- [ ] 신뢰구간 계산 (Python Worker 확인 필요)
- [ ] 결과 표시 UI (p-value, 성공률, CI)
- [ ] 통합 테스트 작성
- [ ] TypeScript 컴파일 에러 0개 확인
- [ ] 코드 리뷰
- [ ] 커밋

---

## 🔧 구현 패턴 (기존 페이지 참고)

### 1. 페이지 파일 구조
```typescript
'use client'

import { useCallback } from 'react'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import DataUploadStep from '@/components/statistics/data-upload-step'
import VariableSelector from '@/components/statistics/variable-selector'
import StatisticsPageLayout from '@/components/statistics/StatisticsPageLayout'

// 1️⃣ 타입 정의
interface [MethodName]Result {
  // ... 결과 필드
}

interface SelectedVariables {
  // ... 선택된 변수
}

export default function [MethodName]Page() {
  // 2️⃣ useStatisticsPage hook
  const { uploadedData, selectedVariables, actions } = useStatisticsPage<
    [MethodName]Result,
    SelectedVariables
  >()

  // 3️⃣ 데이터 업로드 핸들러 (useCallback)
  const handleDataUpload = useCallback((file: File, data: Record<string, unknown>[]) => {
    const uploadedDataObj: UploadedData = {
      data,
      fileName: file.name,
      columns: data.length > 0 ? Object.keys(data[0]) : []
    }
    actions.setUploadedData?.(uploadedDataObj)
    actions.setCurrentStep?.(1)
  }, [actions])

  // 4️⃣ 변수 선택 핸들러 (useCallback)
  const handleVariableSelection = useCallback((variables: SelectedVariables) => {
    actions.setSelectedVariables?.(variables)
    actions.setCurrentStep?.(2)
  }, [actions])

  // 5️⃣ 분석 실행 핸들러 (useCallback)
  const handleAnalysis = useCallback(async () => {
    if (!uploadedData || !selectedVariables) return

    actions.startAnalysis?.()

    try {
      // 1) 데이터 추출 및 변환
      // 2) PyodideCore 초기화
      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      // 3) Worker 호출
      const pythonResult = await pyodideCore.callWorkerMethod<{...}>(
        workerNumber,
        'method_name',
        { param1, param2 }
      )

      // 4) 결과 매핑
      const result: [MethodName]Result = { ... }

      // 5) 결과 저장
      actions.completeAnalysis?.(result, 3)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.'
      actions.setError?.(errorMessage)
    }
  }, [uploadedData, selectedVariables, actions])

  // 6️⃣ JSX 렌더링
  return (
    <StatisticsPageLayout
      title="[메서드명]"
      description="[설명]"
      steps={[...]}
      currentStep={currentStep}
      results={results}
      error={error}
    >
      {/* Steps */}
    </StatisticsPageLayout>
  )
}
```

### 2. PyodideCore 호출 패턴
```typescript
// ✅ 타입 안전한 호출
const pythonResult = await pyodideCore.callWorkerMethod<{
  field1: number
  field2: string
  field3?: { nested: number }
}>(
  workerNumber,    // 2, 3, 4 (Worker 번호)
  'method_name',   // Python 메서드명 (snake_case)
  {
    param1: value1,  // snake_case 파라미터
    param2: value2
  }
)
```

### 3. 에러 처리 패턴
```typescript
try {
  // ... 분석 로직
  actions.completeAnalysis?.(result, 3)
} catch (error) {
  console.error('[method-name] 분석 중 오류:', error)
  const errorMessage = error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.'
  actions.setError?.(errorMessage)
}
```

---

## 📊 예상 일정

| 메서드 | 예상 시간 | 우선순위 |
|--------|----------|---------|
| Cochran Q Test | 2.5-3시간 | 🟢 1순위 (간단) |
| Mood Median Test | 3-3.5시간 | 🟡 2순위 (중간) |
| Binomial Test | 3-4시간 | 🟡 3순위 (복잡) |
| **총 예상 시간** | **9-10.5시간** | - |

### 실행 전략
- **Option A (연속 작업)**: 9-10.5시간 연속 (하루 완료 가능)
- **Option B (분할 작업)**: 3개 × 3-4시간씩 분할 (3일)
- **추천**: Option B (각 메서드 완료 후 커밋 → 테스트 → 다음 메서드)

---

## 🎯 성공 기준

1. **기능 동작**: PyodideCore를 통해 실제 Python Worker 호출 성공
2. **타입 안전성**: TypeScript 컴파일 에러 0개
3. **코드 품질**:
   - useCallback 사용
   - any 타입 금지 (unknown + 타입 가드)
   - null/undefined 체크 필수
4. **테스트**: 각 메서드마다 통합 테스트 작성
5. **커밋**: 각 메서드마다 개별 커밋

---

## 📝 참고 문서

- **코딩 표준**: [STATISTICS_PAGE_CODING_STANDARDS.md](statistical-platform/docs/STATISTICS_PAGE_CODING_STANDARDS.md)
- **AI 코딩 규칙**: [CLAUDE.md](CLAUDE.md)
- **통계 메서드 구현 가이드**: [IMPLEMENTING_STATISTICAL_TESTS_GUIDE.md](statistical-platform/docs/IMPLEMENTING_STATISTICAL_TESTS_GUIDE.md)
- **기존 페이지 참고**:
  - McNemar Test: [mcnemar/page.tsx](statistical-platform/app/(dashboard)/statistics/mcnemar/page.tsx)
  - Runs Test: [runs-test/page.tsx](statistical-platform/app/(dashboard)/statistics/runs-test/page.tsx)
  - Sign Test: [sign-test/page.tsx](statistical-platform/app/(dashboard)/statistics/sign-test/page.tsx)

---

**작성자**: Claude Code (AI)
**작성일**: 2025-11-07
**다음 단계**: Cochran Q Test 페이지 생성 시작
