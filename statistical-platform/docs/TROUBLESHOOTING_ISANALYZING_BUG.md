# Troubleshooting: isAnalyzing 상태 관리 버그

**작성일**: 2025-10-29
**심각도**: 🚨 Critical
**영향**: 버튼 영구 비활성화, 사용자 워크플로우 차단

---

## 📋 증상

### 사용자가 겪는 문제

1. **분석 버튼 클릭** → "분석 중..." 메시지 표시
2. **분석 완료** → 결과는 정상 표시
3. **재분석 시도** → ❌ 버튼이 "분석 중..." 상태로 잠김
4. **페이지 새로고침 전까지 재실행 불가**

### 화면에 나타나는 증상

```tsx
// 버튼 상태
<Button disabled={isAnalyzing}>
  {isAnalyzing ? '분석 중...' : '분석 실행'}
</Button>

// isAnalyzing이 true로 고정되어 버튼이 비활성화됨
```

---

## 🔍 원인 분석

### 근본 원인: `setResults()` vs `completeAnalysis()`

**useStatisticsPage.ts 구조**:

```typescript
// Line 287: setResults() - 결과만 업데이트
const setResults = useCallback((results: TResult) => {
  setResultsState(results)
  // ❌ isAnalyzing을 false로 리셋하지 않음!
}, [])

// Lines 236-245: completeAnalysis() - 완전한 상태 전환
const completeAnalysis = useCallback((
  results: TResult,
  nextStepNum?: number
) => {
  setResults(results)           // 1. 결과 설정
  setIsAnalyzing(false)         // 2. ✅ isAnalyzing 리셋
  if (nextStepNum !== undefined) {
    setCurrentStep(nextStepNum) // 3. 다음 단계로 이동
  }
}, [])
```

### 상태 머신 다이어그램

```
정상 플로우 (completeAnalysis 사용):
┌─────────────┐  startAnalysis()   ┌─────────────┐
│ isAnalyzing │ ───────────────────▶│ isAnalyzing │
│   = false   │                    │   = true    │
│ (버튼 활성)  │                    │ (버튼 비활성)│
└─────────────┘                    └─────────────┘
       ▲                                  │
       │                                  │ completeAnalysis()
       │                                  │ (결과 + 플래그 리셋)
       │                                  │
       └──────────────────────────────────┘

버그 플로우 (setResults 사용):
┌─────────────┐  startAnalysis()   ┌─────────────┐
│ isAnalyzing │ ───────────────────▶│ isAnalyzing │
│   = false   │                    │   = true    │
│ (버튼 활성)  │                    │ (버튼 비활성)│
└─────────────┘                    └─────────────┘
                                          │
                                          │ setResults()
                                          │ (결과만 설정)
                                          │
                                          ▼
                                   ┌─────────────┐
                                   │ isAnalyzing │
                                   │   = true    │ ← ❌ 여기서 멈춤!
                                   │ (버튼 잠김)  │
                                   └─────────────┘
```

---

## 💻 버그가 있는 코드 예시

### 잘못된 패턴

```typescript
// ❌ 버그: setResults() 사용
const handleAnalysis = async () => {
  if (!uploadedData) return

  // 1. isAnalyzing = true로 설정
  actions.startAnalysis()

  try {
    // 2. 분석 실행
    const mockResults: DescriptiveResults = {
      summary: { /* ... */ },
      variables: [ /* ... */ ]
    }

    // 3. ❌ 결과만 설정 (isAnalyzing은 true로 유지!)
    actions.setResults(mockResults)

    // 결과: 버튼이 "분석 중..." 상태로 잠김
  } catch (error) {
    console.error('분석 중 오류:', error)
  }
}
```

### 올바른 패턴

```typescript
// ✅ 정상: completeAnalysis() 사용
const handleAnalysis = async () => {
  if (!uploadedData) return

  try {
    // 1. isAnalyzing = true로 설정
    actions.startAnalysis()

    // 2. 분석 실행
    const mockResults: DescriptiveResults = {
      summary: { /* ... */ },
      variables: [ /* ... */ ]
    }

    // 3. ✅ 완전한 상태 전환 (결과 + isAnalyzing 리셋 + 단계 이동)
    actions.completeAnalysis(mockResults, 3)

    // 결과: 버튼이 정상적으로 재활성화됨
  } catch (error) {
    console.error('분석 중 오류:', error)
    actions.setError('분석 중 오류가 발생했습니다.')
  }
}
```

---

## 🔧 해결 방법

### 단계별 수정 가이드

#### 1. 문제 파일 식별

**증상 확인**:
```bash
# setResults 사용하는 파일 검색
grep -r "actions.setResults" app/(dashboard)/statistics/ --include="*.tsx"
```

**결과 예시**:
```
app/(dashboard)/statistics/descriptive/page.tsx:168:    actions.setResults(mockResults)
app/(dashboard)/statistics/anova/page.tsx:251:    actions.setResults(mockResults)
```

#### 2. 코드 수정

**수정 전**:
```typescript
actions.setResults(mockResults)
```

**수정 후**:
```typescript
actions.completeAnalysis(mockResults, 3)
//                                    ↑
//                       다음 단계 번호 (보통 3)
```

#### 3. TypeScript 컴파일 검증

```bash
npx tsc --noEmit --incremental false
```

**기대 결과**: 에러 없음

#### 4. 런타임 테스트

**테스트 시나리오**:
1. 통계 페이지 접속
2. 데이터 업로드
3. 변수 선택
4. **첫 번째 분석 실행** → 결과 확인
5. **두 번째 분석 실행** → ✅ 버튼이 정상 작동하는지 확인

---

## 🧪 테스트 방법

### 수동 테스트 (브라우저)

```typescript
// 브라우저 개발자 도구 → Console

// 1. 분석 전
console.log('Before:', isAnalyzing)  // false

// 2. 분석 시작 (버튼 클릭)
console.log('During:', isAnalyzing)  // true

// 3. 분석 완료
console.log('After:', isAnalyzing)   // false ← 이게 false여야 정상!
```

### 자동 테스트 (단위 테스트)

```typescript
// __tests__/use-statistics-page.test.ts
import { renderHook, act } from '@testing-library/react'
import { useStatisticsPage } from '@/hooks/use-statistics-page'

describe('useStatisticsPage - isAnalyzing state', () => {
  it('should reset isAnalyzing after completeAnalysis', () => {
    const { result } = renderHook(() =>
      useStatisticsPage<any, any>({ withUploadedData: false })
    )

    // 1. 분석 시작
    act(() => {
      result.current.actions.startAnalysis()
    })
    expect(result.current.state.isAnalyzing).toBe(true)

    // 2. 분석 완료
    act(() => {
      result.current.actions.completeAnalysis({ data: 'test' }, 3)
    })
    expect(result.current.state.isAnalyzing).toBe(false)  // ✅ false여야 함!
  })

  it('should NOT reset isAnalyzing after setResults (bug)', () => {
    const { result } = renderHook(() =>
      useStatisticsPage<any, any>({ withUploadedData: false })
    )

    // 1. 분석 시작
    act(() => {
      result.current.actions.startAnalysis()
    })
    expect(result.current.state.isAnalyzing).toBe(true)

    // 2. setResults 호출 (버그)
    act(() => {
      result.current.actions.setResults({ data: 'test' })
    })
    expect(result.current.state.isAnalyzing).toBe(true)  // ❌ 여전히 true (버그!)
  })
})
```

---

## 📊 영향받은 파일 목록

**2025-10-29 기준 수정 완료** (6개):

| 파일 | 라인 | 수정일 |
|------|------|--------|
| [descriptive/page.tsx](../../app/(dashboard)/statistics/descriptive/page.tsx) | 168 | 2025-10-29 |
| [anova/page.tsx](../../app/(dashboard)/statistics/anova/page.tsx) | 251 | 2025-10-29 |
| [correlation/page.tsx](../../app/(dashboard)/statistics/correlation/page.tsx) | 313 | 2025-10-29 |
| [regression/page.tsx](../../app/(dashboard)/statistics/regression/page.tsx) | 223 | 2025-10-29 |
| [one-sample-t/page.tsx](../../app/(dashboard)/statistics/one-sample-t/page.tsx) | 132 | 2025-10-29 |
| [normality-test/page.tsx](../../app/(dashboard)/statistics/normality-test/page.tsx) | 157 | 2025-10-29 |

---

## 🚨 예방 방법

### 1. ESLint 규칙 추가 (권장)

```json
// .eslintrc.json
{
  "rules": {
    "no-restricted-syntax": [
      "error",
      {
        "selector": "CallExpression[callee.property.name='setResults']",
        "message": "Use completeAnalysis() instead of setResults() to properly reset isAnalyzing flag"
      }
    ]
  }
}
```

### 2. 코드 리뷰 체크리스트

**통계 페이지 분석 로직 리뷰 시 확인 항목**:
- [ ] `actions.startAnalysis()` 호출 확인
- [ ] `actions.completeAnalysis()` 사용 확인 (`setResults()` 사용 금지)
- [ ] try-catch 에러 처리 확인
- [ ] `actions.setError()` 호출 확인 (catch 블록)

### 3. 타입 레벨 제약 (고급)

```typescript
// hooks/use-statistics-page.ts
export type StatisticsPageActions<TResult, TVariables> = {
  startAnalysis: () => void
  completeAnalysis: (results: TResult, nextStepNum?: number) => void

  // setResults를 private으로 만들거나 deprecated 마킹
  /** @deprecated Use completeAnalysis() instead */
  setResults: (results: TResult) => void

  setError: (error: string | null) => void
  // ...
}
```

---

## 📚 관련 문서

- [useStatisticsPage Hook 구현](../../hooks/use-statistics-page.ts)
- [통계 페이지 코딩 표준](./STATISTICS_PAGE_CODING_STANDARDS.md)
- [Phase 1 완료 보고서](./phase1-settimeout-removal-complete.md)

---

## 💡 학습 포인트

### 1. 상태 전환의 원자성

**교훈**: 여러 관련 상태를 변경할 때는 하나의 함수로 원자적(atomic) 처리해야 합니다.

```typescript
// ❌ 나쁜 예: 상태 전환이 분리됨
setResults(data)
setIsAnalyzing(false)
setCurrentStep(3)

// ✅ 좋은 예: 하나의 함수로 원자적 처리
completeAnalysis(data, 3)  // 내부에서 3가지 모두 처리
```

### 2. 상태 머신 패턴

**분석 워크플로우는 상태 머신**:
```
idle → analyzing → completed → idle
```

**각 전환마다 필요한 작업**:
- `idle → analyzing`: isAnalyzing = true
- `analyzing → completed`: results 설정 + isAnalyzing = false + 단계 이동
- `analyzing → error`: error 설정 + isAnalyzing = false

### 3. 타입 안전성의 한계

**TypeScript는 이 버그를 잡지 못함**:
```typescript
// 타입 체크는 통과하지만 런타임 버그
actions.setResults(mockResults)  // ✅ 타입 OK, ❌ 로직 버그!
```

**해결**: 단위 테스트 + 통합 테스트 필수

---

## ✅ 체크리스트

**새 통계 페이지 작성 시**:
- [ ] `actions.startAnalysis()` 단일 호출 (이중 호출 금지)
- [ ] `actions.completeAnalysis()` 사용 (`setResults()` 금지)
- [ ] try-catch 에러 처리 추가
- [ ] `actions.setError()` 호출 (catch 블록)
- [ ] TypeScript 컴파일 확인 (`npx tsc --noEmit`)
- [ ] 브라우저 수동 테스트 (재분석 시나리오)

**기존 코드 리뷰 시**:
- [ ] `setResults()` 사용 여부 검색
- [ ] 버튼 비활성화 로직 확인
- [ ] 상태 전환 플로우 검증
- [ ] 에러 케이스 처리 확인

---

**작성자**: Claude Code
**업데이트**: 2025-10-29
**관련 이슈**: isAnalyzing 버튼 잠김 버그
