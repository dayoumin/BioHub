---
name: naming-convention
description: Python Worker I/O 및 TypeScript 명명 규칙. 코드 작성, 변수명, 함수명, 파일명 관련 작업 시 자동 적용.
user-invocable: false
---

# 명명 규칙 (Naming Convention)

## TypeScript/JavaScript 일반

| 항목 | 패턴 | 예시 |
|------|------|------|
| 변수/함수 | camelCase | `selectedMethod`, `handleClick` |
| 상수 | UPPER_SNAKE_CASE | `STATISTICAL_METHODS` |
| 타입/인터페이스 | PascalCase | `StatisticalMethod` |
| 컴포넌트 | PascalCase | `MethodBrowser.tsx` |
| 파일명 (일반) | kebab-case | `method-mapping.ts` |
| 파일명 (컴포넌트) | PascalCase | `MethodBrowser.tsx` |

## Python Worker I/O 규칙 (CRITICAL)

- **함수 파라미터**: `camelCase` (외부 인터페이스)
- **반환값 딕셔너리 키**: `camelCase` (외부 인터페이스)
- **TypeScript 타입 정의**: `camelCase`
- **Python 함수명**: `snake_case` (PEP8)
- **Python 내부 로컬 변수**: `snake_case` (PEP8)
- **TypeScript에서 Python 함수 호출**: 함수명 문자열은 `snake_case` 유지

```python
# Python Worker 올바른 예시
def binomialTest(successCount, totalCount, probability=0.5):  # 파라미터: camelCase
    # 내부 변수: snake_case (PEP8)
    p_value = binom_result.pvalue
    success_rate = successCount / totalCount

    # 반환 키: camelCase
    return {
        'pValue': float(p_value),
        'successCount': int(successCount),
        'proportion': float(success_rate)
    }

# 금지 (외부 인터페이스에 snake_case)
# def binomial_test(success_count, total_count):
#     return { 'p_value': p_value }
```

```typescript
// TypeScript 호출 예시
callWorkerMethod(2, 'binomialTest', {
  successCount: 10,  // camelCase
  totalCount: 100,
  probability: 0.5
})
// 응답: { pValue: 0.05, successCount: 10, proportion: 0.1 }
```

## 자주 틀리는 표기

| 올바른 표기 | 잘못된 표기 | 비고 |
|------------|------------|------|
| `cohensD` | `cohens_d`, `cohen_d` | 효과크기 |
| `etaSquared` | `eta_squared` | ANOVA 효과크기 |
| `pValue` | `pvalue`, `p_value` | 유의확률 |
| `rSquared` | `r_squared`, `rsquared` | 결정계수 |
| `fStatistic` | `f_statistic` | F 통계량 |
| `stdError` | `std_error` | 표준오차 |
| `adjRSquared` | `adj_r_squared` | 수정 결정계수 |
| `durbinWatson` | `durbin_watson` | 자기상관 검정 |
| `timeseries` | `time-series` | 카테고리명 |

## 자동 검증

- `__tests__/naming-convention.test.ts`가 위반 감지
- 상세 수정 이력: `stats/docs/PARAMETER_NAMING_FIX_CHECKLIST.md`