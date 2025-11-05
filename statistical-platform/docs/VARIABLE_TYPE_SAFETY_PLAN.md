# Variable Type Safety 근본적 해결 계획

**작성일**: 2025-11-05
**목적**: VariableAssignment ↔ 특화 타입 간 타입 안전성 확보

---

## 🎯 문제 정의

### 현재 상황
```typescript
// VariableSelector.tsx
interface VariableSelectorProps {
  onVariablesSelected: (variables: VariableAssignment) => void  // 항상 이 타입 반환
}

export interface VariableAssignment {
  [role: string]: string | string[]  // 동적 키
}

// ancova/page.tsx
interface ANCOVAVariables {
  dependent: string      // 구조화된 타입
  independent: string[]
  covariates: string[]
}

// 타입 불일치!
const { actions } = useStatisticsPage<Result, ANCOVAVariables>()
actions.setSelectedVariables  // ANCOVAVariables | null 을 요구
<VariableSelector onVariablesSelected={actions.setSelectedVariables} />  // VariableAssignment 전달
```

### 근본 원인
- **VariableAssignment**: 동적 키, 느슨한 타입 (`{ [key: string]: string | string[] }`)
- **특화 타입**: 정적 키, 엄격한 타입 (`{ dependent: string, ... }`)
- 두 타입 간 **구조적 호환성 없음**

---

## 💡 해결 방안 (3가지 옵션)

### Option A: VariableSelector 제네릭화 (❌ 복잡도 높음)

```typescript
interface VariableSelectorProps<T> {
  onVariablesSelected: (variables: T) => void
}

// 각 통계 메서드별로 변환 로직 필요
```

**장점**: 타입 안전성 최대화
**단점**:
- VariableSelector 내부 로직 대폭 수정 필요
- 41개 통계 메서드별 변환 로직 구현
- 리스크 높음

### Option B: 타입 변환 레이어 추가 (✅ 권장)

```typescript
// types/statistics.ts
export function convertToANCOVAVariables(
  vars: VariableAssignment
): ANCOVAVariables {
  return {
    dependent: Array.isArray(vars.dependent) ? vars.dependent[0] : vars.dependent as string,
    independent: Array.isArray(vars.independent) ? vars.independent : [vars.independent as string],
    covariates: Array.isArray(vars.covariates) ? vars.covariates : []
  }
}

// ancova/page.tsx
<VariableSelector
  onVariablesSelected={(vars) => {
    const typedVars = convertToANCOVAVariables(vars)
    actions.setSelectedVariables?.(typedVars)
  }}
/>
```

**장점**:
- 타입 안전성 확보
- VariableSelector 수정 불필요
- 단계적 적용 가능
- 변환 로직 테스트 가능

**단점**:
- 41개 변환 함수 필요
- 약간의 보일러플레이트

### Option C: Union 타입 사용 (⚠️ 타입 안전성 낮음)

```typescript
type FlexibleVariables = VariableAssignment | ANCOVAVariables | ...

actions.setSelectedVariables: (vars: FlexibleVariables | null) => void
```

**장점**: 빠른 적용
**단점**: 타입 안전성 저하 (런타임 에러 위험)

---

## ✅ 선택: Option B (타입 변환 레이어)

### 구현 단계

#### Phase 1: 타입 변환 유틸리티 생성 (1시간)

```typescript
// types/statistics-converters.ts (NEW)

export function convertVariableAssignment<T>(
  vars: VariableAssignment,
  schema: VariableSchema<T>
): T {
  const result: any = {}

  for (const [key, config] of Object.entries(schema)) {
    const value = vars[config.source || key]

    if (!value) {
      if (config.required) {
        throw new Error(`Missing required field: ${key}`)
      }
      continue
    }

    // 타입 변환 로직
    if (config.type === 'string') {
      result[key] = Array.isArray(value) ? value[0] : value
    } else if (config.type === 'string[]') {
      result[key] = Array.isArray(value) ? value : [value]
    }
  }

  return result as T
}

// 스키마 정의
interface VariableSchema<T> {
  [K in keyof T]: {
    type: 'string' | 'string[]'
    source?: string  // VariableAssignment의 키 (다를 경우)
    required?: boolean
  }
}

// 각 통계 메서드별 스키마
export const ANCOVA_SCHEMA: VariableSchema<ANCOVAVariables> = {
  dependent: { type: 'string', required: true },
  independent: { type: 'string[]', required: true },
  covariates: { type: 'string[]', required: true }
}

// 편의 함수
export function toANCOVAVariables(vars: VariableAssignment): ANCOVAVariables {
  return convertVariableAssignment(vars, ANCOVA_SCHEMA)
}
```

#### Phase 2: 페이지 코드 수정 (2-2.5시간)

**패턴 1: VariableSelector 직접 사용** (16개 페이지)
```typescript
// Before
<VariableSelector onVariablesSelected={actions.setSelectedVariables} />

// After
<VariableSelector
  onVariablesSelected={(vars) => {
    const typedVars = toANCOVAVariables(vars)
    actions.setSelectedVariables?.(typedVars)
  }}
/>
```

**패턴 2: createVariableSelectionHandler 사용** (10개 페이지)
```typescript
// Before
const handler = createVariableSelectionHandler<ANCOVAVariables>(
  actions.setSelectedVariables,
  onNext,
  'ancova'
)

// After
const handler = createVariableSelectionHandler(
  (vars) => actions.setSelectedVariables?.(toANCOVAVariables(vars)),
  (vars) => onNext(toANCOVAVariables(vars)),
  'ancova'
)
```

#### Phase 3: 테스트 및 검증 (1시간)

1. **타입 체크**: `npx tsc --noEmit` → 0 errors
2. **단위 테스트**: 변환 함수 테스트 작성
3. **통합 테스트**: 대표 페이지 3개 (anova, ancova, correlation) 수동 테스트

---

## 📊 예상 결과

| 지표 | Before | After | 개선 |
|------|--------|-------|------|
| TypeScript 에러 | 26개 | **0개** | **-100%** |
| 타입 안전성 | 40% | **100%** | **+60%** |
| `as any` 사용 | 0개 | **0개** | 유지 |
| 런타임 타입 에러 위험 | 높음 | **낮음** | ✅ |

---

## 🔄 대안: 점진적 마이그레이션

모든 페이지를 한번에 수정하기 어려운 경우:

### Step 1: 임시 타입 호환성 (즉시)
```typescript
// lib/utils/statistics-handlers.ts
setSelectedVariables: ((mapping: T | null) => void) | undefined
→
setSelectedVariables: ((mapping: unknown) => void) | undefined
```
→ 컴파일 에러는 없지만 타입 안전성 저하

### Step 2: 변환 레이어 추가 (1-2주)
- 우선순위 높은 페이지부터 Option B 적용
- 나머지는 `unknown` 타입 유지

### Step 3: 전체 마이그레이션 (1개월)
- 모든 페이지에 변환 함수 적용
- `unknown` 타입 제거

---

## ✅ 최종 권장사항

**즉시 실행**: Option B (타입 변환 레이어)

**이유**:
1. **타입 안전성 100% 확보**
2. **장기적으로 유지보수 용이** (변환 로직 중앙화)
3. **단계적 적용 가능** (리스크 최소화)
4. **테스트 가능** (변환 함수 단위 테스트)

**예상 시간**: 4-4.5시간
**리스크**: 낮음 (타입 시스템이 에러 감지)
**영향 범위**: 26개 페이지

---

**작성자**: Claude Code (AI)
