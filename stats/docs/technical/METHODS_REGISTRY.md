# Methods Registry - Single Source of Truth

**목적**: Python Worker와 TypeScript 간의 메서드 계약(Contract)을 단일 파일로 관리
**상태**: ✅ Phase 1 완료 (2025-12-17)

---

## 개요

`methods-registry.json`은 모든 통계 메서드의 정의를 한 곳에서 관리합니다.

### 해결하는 문제

| 문제 | 이전 | 이후 |
|------|------|------|
| 파라미터 불일치 | TS/Python 각각 정의 | 레지스트리에서 참조 |
| Worker 번호 하드코딩 | 각 파일에 분산 | `getWorkerForMethod()` |
| 메서드 존재 여부 | 런타임 에러 | `methodExists()` 사전 검증 |
| 문서 동기화 | 수동 관리 | 레지스트리에서 생성 가능 |

---

## 파일 구조

```
lib/constants/
├── methods-registry.json       # 메서드 정의 (Single Source of Truth)
└── methods-registry.types.ts   # TypeScript 타입 및 유틸리티
```

---

## 사용법

### 1. 메서드가 속한 Worker 찾기

```typescript
import { getWorkerForMethod } from '@/lib/constants/methods-registry.types'

const workerNum = getWorkerForMethod('t_test_two_sample')
// → 2
```

### 2. 메서드 정의 확인

```typescript
import { getMethodDefinition } from '@/lib/constants/methods-registry.types'

const def = getMethodDefinition('one_way_anova')
// → {
//     params: ['groups'],
//     returns: ['fStatistic', 'pValue', 'dfBetween', 'dfWithin', 'etaSquared', 'omegaSquared'],
//     description: '일원 분산분석'
//   }
```

### 3. 메서드 존재 여부 확인

```typescript
import { methodExists } from '@/lib/constants/methods-registry.types'

if (methodExists(userInput)) {
  // 안전하게 호출
}
```

### 4. Worker별 메서드 목록

```typescript
import { getWorkerMethods } from '@/lib/constants/methods-registry.types'

const worker3Methods = getWorkerMethods(3)
// → ['mann_whitney_test', 'wilcoxon_test', 'one_way_anova', ...]
```

### 5. 레지스트리 통계

```typescript
import { getRegistryStats } from '@/lib/constants/methods-registry.types'

const stats = getRegistryStats()
// → { totalMethods: 56, methodsByWorker: { 1: 13, 2: 14, 3: 18, 4: 21 } }
```

---

## 레지스트리 구조

```json
{
  "worker1": {
    "name": "descriptive",
    "description": "기술통계 및 기본 검정",
    "packages": ["numpy", "scipy"],
    "methods": {
      "descriptive_stats": {
        "params": ["data"],
        "returns": ["mean", "median", "mode", ...],
        "description": "기술통계량 계산"
      }
    }
  }
}
```

### 필드 설명

| 필드 | 설명 |
|------|------|
| `params` | 파라미터 이름 (`?` 접미사 = 옵셔널) |
| `returns` | 반환값 키 |
| `description` | 한글 설명 |

---

## Worker 분류

| Worker | 이름 | 용도 | 패키지 |
|--------|------|------|--------|
| 1 | descriptive | 기술통계, 정규성, 빈도 | numpy, scipy |
| 2 | hypothesis | t-검정, 카이제곱, 상관 | + statsmodels, pandas |
| 3 | nonparametric-anova | 비모수, ANOVA, 사후검정 | + scikit-learn |
| 4 | regression-advanced | 회귀, PCA, 군집, 생존 | + scikit-learn |

---

## 향후 계획 (Phase 2)

### 자동 코드 생성

레지스트리에서 TypeScript 래퍼 자동 생성:

```bash
npm run generate:methods
```

```typescript
// 자동 생성 예시
export async function tTestTwoSample(
  group1: number[],
  group2: number[],
  equalVar?: boolean
): Promise<TTestTwoSampleResult> {
  return core.callWorkerMethod(2, 't_test_two_sample', { group1, group2, equalVar })
}
```

### Python dispatcher

```python
# dispatcher.py
def dispatch(method_name: str, params: dict):
    return METHODS[method_name](**params)
```

---

## 관련 파일

- [methods-registry.json](../lib/constants/methods-registry.json) - 레지스트리 원본
- [methods-registry.types.ts](../lib/constants/methods-registry.types.ts) - TypeScript 유틸
- [methods-registry.test.ts](../__tests__/lib/methods-registry.test.ts) - 테스트

---

**Updated**: 2025-12-17
