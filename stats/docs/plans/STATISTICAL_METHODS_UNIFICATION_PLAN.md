# 통계 방법 통합 계획서

## 1. 현황 분석

### 1.1 현재 구조

```
추천 시스템 (2개 병렬)
├── DecisionTree.ts (Guided Flow - 질문 기반)
│   └── METHODS: 31개 정의
│   └── 사용: FlowStateMachine → decide() 호출
│
└── DecisionTreeRecommender.ts (AI 추천 - 데이터 자동 분석)
    └── METHODS: inline 정의 (~15개)
    └── 사용: PurposeInputStep → recommend() 호출
```

### 1.2 문제점

1. **ID 불일치**: 같은 방법인데 ID가 다름
   - DecisionTree: `independent-t`, `paired-t`
   - Recommender: `independent-t-test`, `paired-t-test`

2. **커버리지 부족**: 48개 페이지 중 31개만 정의됨

3. **중복 정의**: 같은 방법이 두 곳에서 다르게 정의됨

4. **페이지 라우팅 불일치**: METHODS ID와 페이지 디렉토리명 불일치

---

## 2. 목표

1. **단일 진실 공급원(Single Source of Truth)**: 모든 통계 방법을 한 곳에서 정의
2. **48개 페이지 완전 커버**: 모든 통계 페이지로 라우팅 가능
3. **두 추천 시스템 일관성**: 같은 조건 → 같은 추천 결과
4. **ID = 페이지 경로**: method.id가 곧 라우팅 경로

---

## 3. 설계

### 3.1 새 파일 구조

```
lib/constants/
└── statistical-methods.ts    # 단일 진실 공급원 (NEW)

components/smart-flow/steps/purpose/
└── DecisionTree.ts           # METHODS import 사용

lib/services/
└── decision-tree-recommender.ts  # METHODS import 사용
```

### 3.2 statistical-methods.ts 설계

```typescript
// lib/constants/statistical-methods.ts

import type { StatisticalMethod } from '@/types/smart-flow'

/**
 * 48개 통계 방법 정의
 * ID = 페이지 경로 (예: 't-test' → /statistics/t-test)
 */
export const STATISTICAL_METHODS: Record<string, StatisticalMethod> = {
  // ============================================
  // 1. 평균 비교 (Mean Comparison)
  // ============================================
  't-test': {
    id: 't-test',
    name: '독립표본 t-검정',
    description: '두 독립 그룹의 평균 차이 검정',
    category: 't-test',
    aliases: ['independent-t', 'independent-t-test', 'student-t']
  },
  'welch-t': {
    id: 'welch-t',
    name: 'Welch t-검정',
    description: '등분산 가정 없이 두 그룹 평균 비교',
    category: 't-test'
  },
  'one-sample-t': {
    id: 'one-sample-t',
    name: '단일표본 t-검정',
    description: '표본 평균과 모집단 평균 비교',
    category: 't-test'
  },
  // ... 48개 전체
}

/**
 * 별칭(alias)으로 방법 찾기
 * 예: 'independent-t' → 't-test' 방법 반환
 */
export function getMethodByIdOrAlias(idOrAlias: string): StatisticalMethod | null {
  // 직접 매칭
  if (STATISTICAL_METHODS[idOrAlias]) {
    return STATISTICAL_METHODS[idOrAlias]
  }

  // alias 검색
  for (const method of Object.values(STATISTICAL_METHODS)) {
    if (method.aliases?.includes(idOrAlias)) {
      return method
    }
  }

  return null
}

/**
 * 카테고리별 방법 목록
 */
export function getMethodsByCategory(category: string): StatisticalMethod[] {
  return Object.values(STATISTICAL_METHODS).filter(m => m.category === category)
}

/**
 * 모든 방법 목록
 */
export function getAllMethods(): StatisticalMethod[] {
  return Object.values(STATISTICAL_METHODS)
}
```

### 3.3 카테고리 구조

| 카테고리 | 방법 수 | 포함 방법 |
|----------|--------|----------|
| t-test | 4 | t-test, welch-t, one-sample-t, (paired는 wilcoxon 계열) |
| anova | 5 | anova, ancova, manova, repeated-measures-anova, mixed-model |
| nonparametric | 12 | mann-whitney, wilcoxon, kruskal-wallis, friedman, sign-test, mcnemar, cochran-q, binomial-test, runs-test, ks-test, mood-median, non-parametric |
| correlation | 3 | correlation, partial-correlation, (pearson/spearman은 correlation 페이지) |
| regression | 5 | regression, poisson, ordinal-regression, stepwise, dose-response, response-surface |
| chi-square | 3 | chi-square, chi-square-goodness, chi-square-independence |
| descriptive | 4 | descriptive, normality-test, explore-data, means-plot |
| timeseries | 4 | arima, seasonal-decompose, stationarity-test, mann-kendall |
| survival | 3 | kaplan-meier, cox-regression, (log-rank은 kaplan-meier에 포함) |
| multivariate | 4 | pca, factor-analysis, cluster, discriminant |
| other | 3 | power-analysis, reliability, proportion-test |

---

## 4. 구현 단계

### Phase 1: 공통 METHODS 파일 생성
- [ ] `lib/constants/statistical-methods.ts` 생성
- [ ] 48개 방법 정의 (ID = 페이지 경로)
- [ ] aliases 필드로 기존 ID 호환성 유지
- [ ] 헬퍼 함수 구현

### Phase 2: DecisionTree.ts 수정
- [ ] METHODS 상수 제거
- [ ] `statistical-methods.ts`에서 import
- [ ] `getMethodByIdOrAlias()` 사용으로 기존 로직 유지

### Phase 3: DecisionTreeRecommender.ts 수정
- [ ] inline 방법 정의 제거
- [ ] `statistical-methods.ts`에서 import
- [ ] ID 매핑 테이블로 기존 호환성 유지

### Phase 4: 일관성 검증
- [ ] 동일 조건에서 두 시스템 추천 결과 비교 테스트
- [ ] 모든 48개 페이지 라우팅 테스트

### Phase 5: 정리
- [ ] 불필요한 코드 제거
- [ ] 문서 업데이트

---

## 5. 타입 확장

```typescript
// types/smart-flow.ts 수정

export interface StatisticalMethod {
  id: string
  name: string
  description: string
  category: MethodCategory
  /** 기존 ID 호환성을 위한 별칭 */
  aliases?: string[]
  /** 페이지 존재 여부 (일부는 상위 페이지에 포함) */
  hasOwnPage?: boolean
  /** 상위 페이지 ID (예: pearson → correlation) */
  parentPageId?: string
}

export type MethodCategory =
  | 't-test'
  | 'anova'
  | 'nonparametric'
  | 'correlation'
  | 'regression'
  | 'chi-square'
  | 'descriptive'
  | 'timeseries'
  | 'survival'
  | 'multivariate'
  | 'other'
```

---

## 6. 리스크 및 대응

| 리스크 | 대응 |
|--------|------|
| 기존 ID 사용하는 코드 깨짐 | aliases 필드로 하위 호환성 유지 |
| 추천 결과 변경 | 테스트로 기존 동작 검증 |
| 페이지 라우팅 오류 | ID = 페이지 경로 원칙 준수 |

---

## 7. 예상 결과

- **Before**: 2개 시스템, 다른 ID, 불일치 가능
- **After**: 1개 METHODS 소스, 일관된 ID, 48개 완전 커버

---

**작성일**: 2025-12-01
**상태**: 계획 수립 완료, Phase 1 시작 예정
