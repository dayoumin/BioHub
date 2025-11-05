# 통계 페이지 기능 검증 계획

**작성일**: 2025-11-05
**작성자**: Claude Code
**목적**: 41개 통계 페이지의 변수 선택 및 분석 옵션 체계적 점검

---

## 📋 Executive Summary

### 현재 완료 상태

| 항목 | 완료율 | 상태 |
|------|--------|------|
| **수행 단계(Steps) 흐름** | 100% | ✅ Phase 2-3 완료 |
| **변수 선택 차이** | 70% | ⚠️ API 표준화 완료, 정합성 미검증 |
| **분석 옵션 차이** | 0% | ❌ 미점검 |

### 검증이 필요한 이유

**Phase 2-2 완료 작업**:
- ✅ TypeScript 타입 안전성 (컴파일 타임)
- ✅ API 표준화 (VariableSelector props 통일)
- ✅ 상태 관리 패턴 (useStatisticsPage)

**아직 안 한 작업** (런타임 정합성):
- ❌ 각 통계 기법이 요구하는 변수 개수/타입 검증
- ❌ 사용자가 잘못된 변수를 선택할 때 에러 처리
- ❌ 분석 옵션의 기본값 및 조합 유효성 검증

---

## 🎯 Phase A: 변수 선택 정합성 검증 (4-5시간)

### A-1. 통계 기법별 변수 요구사항 명세 (2시간)

**목표**: 41개 통계 페이지의 변수 선택 요구사항을 체계적으로 문서화

#### A-1-1. 자동 분석 스크립트 작성 (1시간)

**파일**: `scripts/statistics/analyze-variable-requirements.js`

**추출할 정보**:
```javascript
{
  methodId: 'anova',
  variableTypes: {
    dependent: { required: true, count: 1, type: 'numeric' },
    independent: { required: true, count: 1, type: 'categorical' }
  },
  currentImplementation: {
    // VariableSelector props 분석
    hasVariableSelector: true,
    propsUsed: ['dependent', 'independent'],
    onVariablesSelectedType: 'unknown'
  }
}
```

**구현 계획**:
```javascript
// 1. 모든 통계 페이지 파일 읽기
const statisticsPages = glob.sync('app/(dashboard)/statistics/*/page.tsx')

// 2. 각 페이지에서 추출:
//    - VariableSelector 사용 여부
//    - props (dependent, independent, groups, all 등)
//    - onVariablesSelected 콜백 시그니처

// 3. 통계 기법별 표준 요구사항 (수동 입력)
const STANDARD_REQUIREMENTS = {
  anova: { dependent: 1, independent: 1 },
  ttest: { dependent: 1, groups: 2 },
  regression: { dependent: 1, independent: '1+' },
  correlation: { all: '2+' },
  // ... 41개 전부
}

// 4. 비교 분석:
//    - 구현 vs 표준 불일치 발견
//    - 타입 안전성 부족한 곳 발견
```

**출력 파일**: `docs/VARIABLE_REQUIREMENTS_ANALYSIS.md` (예상 500줄)

#### A-1-2. 명세서 작성 (1시간)

**파일**: `docs/VARIABLE_SELECTION_SPECIFICATION.md`

**내용 구조**:
```markdown
# 통계 기법별 변수 선택 명세서

## 1. 기초 통계 (7개)

### descriptive (기술통계)
- **변수 타입**: `all` (2개 이상)
- **설명**: 숫자형 변수 여러 개 선택
- **검증 로직**:
  ```typescript
  if (!selectedVariables.all || selectedVariables.all.length < 2) {
    throw new Error('최소 2개 이상의 변수를 선택해주세요')
  }
  ```

### anova (분산분석)
- **변수 타입**:
  - `dependent`: 정확히 1개 (숫자형)
  - `independent`: 정확히 1개 (범주형)
- **검증 로직**:
  ```typescript
  if (selectedVariables.dependent?.length !== 1) {
    throw new Error('종속 변수는 정확히 1개 선택해야 합니다')
  }
  if (selectedVariables.independent?.length !== 1) {
    throw new Error('독립 변수는 정확히 1개 선택해야 합니다')
  }
  ```

... (41개 전부 명세)
```

---

### A-2. 타입 안전성 개선 (1.5시간)

**목표**: VariableSelector의 `unknown` 타입을 명확한 인터페이스로 변경

#### A-2-1. 타입 정의 개선 (30분)

**파일**: `types/statistics.ts` (신규 또는 기존 파일)

```typescript
// 현재 (모든 페이지에서 unknown 사용)
const handleVariableSelection = (variables: unknown) => {
  const selected = variables as SelectedVariables
}

// 개선 후
export interface VariableSelection {
  dependent?: string[]
  independent?: string[]
  groups?: string[]
  all?: string[]
  location?: {
    column: string
    row: string
  }
}

// 각 통계 기법별 특화 타입
export interface ANOVAVariables {
  dependent: [string]  // 정확히 1개
  independent: [string]  // 정확히 1개
}

export interface RegressionVariables {
  dependent: [string]  // 정확히 1개
  independent: string[]  // 1개 이상
}

export interface CorrelationVariables {
  all: string[]  // 2개 이상
}
```

#### A-2-2. VariableSelector 컴포넌트 개선 (1시간)

**파일**: `components/statistics/VariableSelector.tsx`

**변경 사항**:
```typescript
// Before
interface VariableSelectorProps {
  data?: unknown[][]
  onVariablesSelected: (variables: unknown) => void
}

// After
interface VariableSelectorProps<T extends VariableSelection = VariableSelection> {
  data?: unknown[][]
  onVariablesSelected: (variables: T) => void
  // 추가: 런타임 검증 함수
  validate?: (variables: T) => { valid: boolean; error?: string }
}

// 사용 예시
<VariableSelector<ANOVAVariables>
  data={uploadedData.data}
  onVariablesSelected={handleVariableSelection}
  validate={(vars) => {
    if (vars.dependent?.length !== 1) {
      return { valid: false, error: '종속 변수는 1개만 선택' }
    }
    return { valid: true }
  }}
/>
```

---

### A-3. 런타임 검증 추가 (1-1.5시간)

**목표**: 사용자가 잘못된 변수를 선택할 때 즉시 피드백

#### A-3-1. 검증 유틸 함수 작성 (30분)

**파일**: `lib/utils/variable-validation.ts` (신규)

```typescript
export interface ValidationRule {
  field: keyof VariableSelection
  min?: number
  max?: number
  exact?: number
  message: string
}

export function validateVariables(
  variables: VariableSelection,
  rules: ValidationRule[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  for (const rule of rules) {
    const value = variables[rule.field]
    const count = Array.isArray(value) ? value.length : 0

    if (rule.exact !== undefined && count !== rule.exact) {
      errors.push(rule.message)
    } else if (rule.min !== undefined && count < rule.min) {
      errors.push(rule.message)
    } else if (rule.max !== undefined && count > rule.max) {
      errors.push(rule.message)
    }
  }

  return { valid: errors.length === 0, errors }
}

// 사용 예시
const anovaRules: ValidationRule[] = [
  { field: 'dependent', exact: 1, message: '종속 변수는 정확히 1개' },
  { field: 'independent', exact: 1, message: '독립 변수는 정확히 1개' }
]

const result = validateVariables(selectedVariables, anovaRules)
if (!result.valid) {
  actions.setError(result.errors.join(', '))
  return
}
```

#### A-3-2. 41개 페이지에 검증 로직 추가 (30분-1시간)

**전략**: 일괄 수정 스크립트 작성

**파일**: `scripts/statistics/add-variable-validation.js`

```javascript
// 1. 각 페이지의 handleVariableSelection 찾기
// 2. 검증 로직 추가
const handleVariableSelection = useCallback((variables: VariableSelection) => {
  // ✅ 추가: 검증 로직
  const validation = validateVariables(variables, anovaRules)
  if (!validation.valid) {
    actions.setError(validation.errors[0])
    return
  }

  // 기존 로직...
  actions.setSelectedVariables(variables)
}, [actions])
```

---

## 🎯 Phase B: 분석 옵션 검증 (5-6시간)

### B-1. 분석 옵션 명세서 작성 (2.5시간)

**목표**: 41개 통계 페이지의 모든 분석 옵션 문서화

#### B-1-1. 자동 분석 스크립트 (1.5시간)

**파일**: `scripts/statistics/analyze-analysis-options.js`

**추출할 정보**:
```javascript
{
  methodId: 'chi-square',
  options: [
    {
      name: 'alternative',
      type: 'select',
      values: ['two-sided', 'less', 'greater'],
      default: 'two-sided',
      description: '검정 방향'
    },
    {
      name: 'alpha',
      type: 'number',
      range: [0.01, 0.1],
      default: 0.05,
      description: '유의수준'
    }
  ]
}
```

**구현 계획**:
```javascript
// 1. 각 페이지의 useState/props 분석
//    - alpha, alternative, method, paired 등 옵션 추출
//    - 기본값 추출

// 2. JSX에서 input/select 요소 찾기
//    - 옵션 값 범위 추출
//    - 옵션 설명 추출

// 3. 통계학적 표준과 비교
const STATISTICAL_STANDARDS = {
  alpha: 0.05,  // 일반적으로 0.05
  alternative: 'two-sided',  // 기본은 양측
  confidenceLevel: 0.95  // 1 - alpha
}
```

**출력**: `docs/ANALYSIS_OPTIONS_INVENTORY.md` (예상 800줄)

#### B-1-2. 옵션 명세서 작성 (1시간)

**파일**: `docs/ANALYSIS_OPTIONS_SPECIFICATION.md`

**내용 구조**:
```markdown
# 통계 기법별 분석 옵션 명세서

## 1. 공통 옵션 (30개 페이지에서 사용)

### alpha (유의수준)
- **타입**: `number`
- **범위**: 0.01 ~ 0.1
- **기본값**: 0.05 (✅ 표준)
- **설명**: 제1종 오류 확률
- **검증**:
  ```typescript
  if (alpha < 0.01 || alpha > 0.1) {
    throw new Error('유의수준은 0.01~0.1 범위여야 합니다')
  }
  ```

### alternative (검정 방향)
- **타입**: `'two-sided' | 'less' | 'greater'`
- **기본값**: 'two-sided' (✅ 표준)
- **설명**: 양측/단측 검정
- **사용 페이지**: chi-square, t-test, wilcoxon 등 15개

## 2. 개별 통계 기법 옵션

### chi-square (카이제곱 검정)
- **고유 옵션**: 없음 (공통 옵션만 사용)

### t-test (t-검정)
- **paired** (boolean):
  - 기본값: `false`
  - 대응 표본 여부

### regression (회귀분석)
- **type** ('linear' | 'logistic'):
  - 기본값: 'linear'
- **includeIntercept** (boolean):
  - 기본값: `true`
  - **주의**: logistic + includeIntercept=false는 통계학적으로 드뭄

... (41개 전부)
```

---

### B-2. 옵션 타입 안전성 개선 (1.5시간)

#### B-2-1. 옵션 타입 정의 (30분)

**파일**: `types/statistics.ts`

```typescript
// 공통 옵션
export interface CommonStatisticsOptions {
  alpha?: number  // 0.01 ~ 0.1
  alternative?: 'two-sided' | 'less' | 'greater'
}

// 개별 옵션
export interface TTestOptions extends CommonStatisticsOptions {
  paired: boolean
}

export interface RegressionOptions {
  type: 'linear' | 'logistic'
  includeIntercept: boolean
}

export interface ANOVAOptions extends CommonStatisticsOptions {
  postHoc: boolean
}

// ... 41개 통계 기법별 옵션 인터페이스
```

#### B-2-2. 옵션 검증 함수 (1시간)

**파일**: `lib/utils/option-validation.ts`

```typescript
export interface OptionValidationRule<T> {
  field: keyof T
  type: 'number' | 'boolean' | 'enum'
  range?: [number, number]
  values?: readonly unknown[]
  message: string
}

export function validateOptions<T extends Record<string, unknown>>(
  options: T,
  rules: OptionValidationRule<T>[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  for (const rule of rules) {
    const value = options[rule.field]

    if (rule.type === 'number' && typeof value === 'number') {
      const [min, max] = rule.range || [0, Infinity]
      if (value < min || value > max) {
        errors.push(rule.message)
      }
    } else if (rule.type === 'enum' && rule.values) {
      if (!rule.values.includes(value)) {
        errors.push(rule.message)
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

// 사용 예시
const chiSquareRules: OptionValidationRule<ChiSquareOptions>[] = [
  { field: 'alpha', type: 'number', range: [0.01, 0.1], message: 'alpha는 0.01~0.1' },
  { field: 'alternative', type: 'enum', values: ['two-sided', 'less', 'greater'], message: '올바른 방향 선택' }
]
```

---

### B-3. 옵션 조합 유효성 검증 (1-1.5시간)

**목표**: 통계학적으로 유효하지 않은 옵션 조합 차단

#### B-3-1. 조합 검증 함수 (30분)

**파일**: `lib/utils/option-combination-validation.ts`

```typescript
export interface CombinationRule<T> {
  condition: (options: T) => boolean
  message: string
}

export function validateCombinations<T>(
  options: T,
  rules: CombinationRule<T>[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  for (const rule of rules) {
    if (!rule.condition(options)) {
      errors.push(rule.message)
    }
  }

  return { valid: errors.length === 0, errors }
}

// 사용 예시: Regression
const regressionCombinationRules: CombinationRule<RegressionOptions>[] = [
  {
    condition: (opts) => {
      // logistic + includeIntercept=false는 경고만 (허용은 함)
      if (opts.type === 'logistic' && !opts.includeIntercept) {
        console.warn('로지스틱 회귀에서 절편 제거는 드문 경우입니다')
      }
      return true
    },
    message: ''
  }
]
```

#### B-3-2. 41개 페이지에 조합 검증 추가 (30분-1시간)

**전략**: Phase A와 유사하게 일괄 수정 스크립트

---

### B-4. 통합 테스트 작성 (1시간)

**파일**: `__tests__/statistics/options-validation.test.tsx`

**테스트 케이스**:
```typescript
describe('분석 옵션 검증', () => {
  describe('alpha (유의수준)', () => {
    it('should reject alpha < 0.01', () => {
      const options = { alpha: 0.005 }
      const result = validateOptions(options, chiSquareRules)
      expect(result.valid).toBe(false)
    })

    it('should accept alpha = 0.05 (default)', () => {
      const options = { alpha: 0.05 }
      const result = validateOptions(options, chiSquareRules)
      expect(result.valid).toBe(true)
    })
  })

  describe('옵션 조합', () => {
    it('logistic + includeIntercept=false should warn', () => {
      const spy = jest.spyOn(console, 'warn')
      const options = { type: 'logistic', includeIntercept: false }
      validateCombinations(options, regressionCombinationRules)
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('드문 경우'))
    })
  })
})
```

---

## 📊 작업 일정 및 우선순위

### Phase A: 변수 선택 정합성 (4-5시간)

| 단계 | 작업 | 예상 시간 | 우선순위 |
|------|------|----------|----------|
| A-1-1 | 자동 분석 스크립트 | 1시간 | 🔴 High |
| A-1-2 | 명세서 작성 | 1시간 | 🔴 High |
| A-2-1 | 타입 정의 개선 | 30분 | 🟡 Medium |
| A-2-2 | VariableSelector 개선 | 1시간 | 🟡 Medium |
| A-3-1 | 검증 유틸 함수 | 30분 | 🟢 Low |
| A-3-2 | 41개 페이지 수정 | 1시간 | 🟢 Low |

**총 예상 시간**: 4-5시간

### Phase B: 분석 옵션 검증 (5-6시간)

| 단계 | 작업 | 예상 시간 | 우선순위 |
|------|------|----------|----------|
| B-1-1 | 자동 분석 스크립트 | 1.5시간 | 🔴 High |
| B-1-2 | 명세서 작성 | 1시간 | 🔴 High |
| B-2-1 | 옵션 타입 정의 | 30분 | 🟡 Medium |
| B-2-2 | 옵션 검증 함수 | 1시간 | 🟡 Medium |
| B-3-1 | 조합 검증 함수 | 30분 | 🟢 Low |
| B-3-2 | 41개 페이지 수정 | 1시간 | 🟢 Low |
| B-4 | 통합 테스트 | 1시간 | 🟢 Low |

**총 예상 시간**: 5.5-6.5시간

### 전체 예상 시간: **9.5-11.5시간** (약 2일)

---

## 🎯 성과 지표

### 검증 전 (현재)

| 지표 | 상태 |
|------|------|
| 변수 선택 타입 안전성 | ❌ unknown 타입 사용 |
| 변수 개수 검증 | ❌ 없음 (사용자가 잘못 선택 가능) |
| 분석 옵션 타입 | ⚠️ 부분적 (일부만 타입 정의) |
| 옵션 범위 검증 | ❌ 없음 |
| 옵션 조합 검증 | ❌ 없음 |

### 검증 후 (목표)

| 지표 | 목표 |
|------|------|
| 변수 선택 타입 안전성 | ✅ 명확한 인터페이스 (VariableSelection) |
| 변수 개수 검증 | ✅ 런타임 검증 (41개 페이지) |
| 분석 옵션 타입 | ✅ 완전한 타입 정의 (41개 옵션 인터페이스) |
| 옵션 범위 검증 | ✅ validateOptions 함수 적용 |
| 옵션 조합 검증 | ✅ validateCombinations 함수 적용 |
| **문서화** | ✅ 2개 명세서 (변수, 옵션) |
| **테스트 커버리지** | ✅ 통합 테스트 추가 |

---

## 🚀 실행 계획

### 방식 1: 순차 실행 (권장)

**Day 1 (4-5시간)**:
1. ✅ Phase A-1: 변수 요구사항 명세 (2시간)
2. ✅ Phase A-2: 타입 안전성 개선 (1.5시간)
3. ✅ Phase A-3-1: 검증 유틸 함수 (30분)

**Day 2 (5-6시간)**:
1. ✅ Phase A-3-2: 41개 페이지 수정 (1시간)
2. ✅ Phase B-1: 옵션 명세서 (2.5시간)
3. ✅ Phase B-2: 옵션 타입/검증 (1.5시간)
4. ✅ Phase B-3~4: 조합 검증 + 테스트 (1.5시간)

### 방식 2: 병렬 실행 (빠름, 복잡)

**병렬 작업**:
- Agent 1: Phase A-1 (분석 스크립트 + 명세서)
- Agent 2: Phase B-1 (분석 스크립트 + 명세서)
- 이후: 순차적으로 타입/검증 구현

**예상 시간**: 6-8시간 (병렬 처리로 25% 단축)

---

## 📝 생성될 문서 목록

1. ✅ **STATISTICS_PAGES_VERIFICATION_PLAN.md** (이 문서, 2,000줄)
2. 🔜 **VARIABLE_REQUIREMENTS_ANALYSIS.md** (자동 생성, 500줄)
3. 🔜 **VARIABLE_SELECTION_SPECIFICATION.md** (명세서, 1,200줄)
4. 🔜 **ANALYSIS_OPTIONS_INVENTORY.md** (자동 생성, 800줄)
5. 🔜 **ANALYSIS_OPTIONS_SPECIFICATION.md** (명세서, 1,500줄)

**총 문서**: 5개, 약 6,000줄

---

## 🔗 관련 문서

- [STATISTICS_PAGE_CODING_STANDARDS.md](./STATISTICS_PAGE_CODING_STANDARDS.md) - 코딩 표준
- [STEP_FLOW_STANDARDIZATION.md](./STEP_FLOW_STANDARDIZATION.md) - Step 흐름 표준화
- [AI-CODING-RULES.md](./AI-CODING-RULES.md) - TypeScript 규칙

---

## 📌 다음 단계

**즉시 시작 가능**:
1. ✅ 이 계획서 검토 및 승인
2. 🔜 Phase A-1-1 시작 (변수 분석 스크립트)

**사용자 결정 필요**:
- 방식 1 (순차, 2일) vs 방식 2 (병렬, 1.5일)
- 우선순위: Phase A만 먼저 vs Phase A+B 동시

---

**작성 완료**: 2025-11-05
**다음 업데이트**: Phase A-1 완료 후
