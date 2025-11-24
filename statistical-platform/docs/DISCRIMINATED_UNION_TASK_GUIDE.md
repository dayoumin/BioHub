# Discriminated Union: Method 기반 엄격 검증 가이드

**작성일**: 2025-11-24
**예상 소요 시간**: 4시간
**현재 상태**: v2.0 (fallback 제거 완료)
**목표**: method 필드 기준 discriminated union 적용

---

## 📋 작업 개요

### 현재 문제 (v2.0)
```typescript
// 현재: Union + optional → 느슨한 매칭
export const AdditionalFieldsSchema = z.union([
  AdditionalRegressionSchema,    // passthrough() 허용
  AdditionalCorrelationSchema,
  AdditionalANOVASchema,
  // ... 7개 스키마
]).optional()
```

**문제점**:
1. ✅ **fallback 제거됨** (v2.0): `z.record()` 삭제로 7개 스키마만 허용
2. 🟡 **passthrough() 유지**: 각 스키마 내에서 정의되지 않은 필드 허용
3. 🟡 **optional()**: additional 필드 자체가 선택적 → method와 additional 간 매핑 강제 불가

**결과**:
- `method='Linear Regression'`인데 `additional.etaSquared` (ANOVA 전용) 포함 가능
- method와 additional 스키마 간 **타입 불일치 검증 불가**

---

### 목표 (v3.0 - Discriminated Union)
```typescript
// 이상적: method 필드 기준 discriminated union
export const AnalysisResultSchema = z.discriminatedUnion('method', [
  z.object({
    method: z.literal('Linear Regression'),
    statistic: z.number().finite(),
    pValue: z.number().min(0).max(1),
    // ...
    additional: AdditionalRegressionSchema.required()  // ✅ 엄격 강제
  }),
  z.object({
    method: z.literal('One-way ANOVA'),
    // ...
    additional: AdditionalANOVASchema.required()
  }),
  // ... (45개 통계)
])
```

**효과**:
- ✅ method='Linear Regression' → `additional.rSquared` 만 허용
- ✅ method='One-way ANOVA' → `additional.etaSquared` 만 허용
- ✅ **컴파일 타임 + 런타임 모두 강제**

---

## 🎯 작업 단계

### Step 1: 통계 방법 분류 (1시간)

#### 1-1. engine.ts에서 45개 통계 method명 추출
```bash
grep -oP "(?<=method: ')[^']+(?=')" lib/interpretation/engine.ts | sort | uniq > methods.txt
```

#### 1-2. method별 additional 필드 매핑 테이블 작성
```markdown
| Method | Additional Schema | 필수 필드 | 선택 필드 |
|--------|-------------------|----------|----------|
| Linear Regression | AdditionalRegressionSchema | rSquared | fStatistic, aic, bic |
| One-way ANOVA | AdditionalANOVASchema | - | etaSquared, omegaSquared |
| Pearson Correlation | AdditionalCorrelationSchema | rSquared | ci |
| Cluster Analysis | AdditionalClusterSchema | - | silhouetteScore, nClusters |
| PCA | AdditionalDimensionReductionSchema | - | explainedVariance, nComponents |
| Power Analysis | AdditionalPowerSchema | - | power, sampleSize, effectSize |
| Reliability (Cronbach) | AdditionalReliabilitySchema | alpha | nItems |
```

#### 1-3. additional이 없는 통계 처리
```typescript
// additional 필드가 없는 통계 (예: t-test, Chi-Square)
z.object({
  method: z.literal('Independent t-test'),
  statistic: z.number().finite(),
  pValue: z.number().min(0).max(1),
  // additional: 없음 (또는 z.never())
})
```

---

### Step 2: 새 스키마 작성 (1.5시간)

#### 2-1. 파일 구조 분리
```
lib/interpretation/schemas/
├── index.ts                        - 메인 export
├── common.ts                       - EffectSizeInfoSchema, GroupStatSchema 등
├── additional/
│   ├── regression.ts               - AdditionalRegressionSchema
│   ├── anova.ts                    - AdditionalANOVASchema
│   ├── correlation.ts              - AdditionalCorrelationSchema
│   ├── cluster.ts                  - AdditionalClusterSchema
│   ├── dimension-reduction.ts      - AdditionalDimensionReductionSchema
│   ├── power.ts                    - AdditionalPowerSchema
│   └── reliability.ts              - AdditionalReliabilitySchema
└── discriminated-analysis-result.ts - Discriminated Union 메인 스키마
```

#### 2-2. discriminated-analysis-result.ts 작성
```typescript
import { z } from 'zod'
import {
  EffectSizeInfoSchema,
  GroupStatSchema,
  CoefficientSchema
} from './common'
import {
  AdditionalRegressionSchema,
  AdditionalANOVASchema,
  // ...
} from './additional'

/**
 * 기본 필드 (모든 통계 공통)
 */
const BaseAnalysisFields = {
  statistic: z.number().finite(),
  pValue: z.number().min(0).max(1),
  df: z.union([
    z.number().int().positive(),
    z.tuple([z.number().int().positive(), z.number().int().positive()])
  ]).optional(),
  effectSize: EffectSizeInfoSchema.optional(),
  groupStats: z.array(GroupStatSchema).optional(),
  coefficients: z.array(CoefficientSchema).optional()
}

/**
 * Discriminated Union: method 필드 기준
 */
export const AnalysisResultSchema = z.discriminatedUnion('method', [
  // 1. 회귀 분석 계열
  z.object({
    method: z.literal('Linear Regression'),
    ...BaseAnalysisFields,
    coefficients: z.array(CoefficientSchema),  // 필수
    additional: AdditionalRegressionSchema.required()
  }),
  z.object({
    method: z.literal('Logistic Regression'),
    ...BaseAnalysisFields,
    coefficients: z.array(CoefficientSchema),
    additional: AdditionalRegressionSchema.required()
  }),
  // 2. ANOVA 계열
  z.object({
    method: z.literal('One-way ANOVA'),
    ...BaseAnalysisFields,
    groupStats: z.array(GroupStatSchema).min(3),  // 3개 이상
    additional: AdditionalANOVASchema.optional()
  }),
  z.object({
    method: z.literal('Two-way ANOVA'),
    ...BaseAnalysisFields,
    groupStats: z.array(GroupStatSchema).min(4),
    additional: AdditionalANOVASchema.optional()
  }),
  // 3. 상관분석 계열
  z.object({
    method: z.literal('Pearson Correlation'),
    ...BaseAnalysisFields,
    additional: AdditionalCorrelationSchema.required()
  }),
  // ... (45개 통계 모두 작성)
])

export type AnalysisResultInput = z.infer<typeof AnalysisResultSchema>
```

---

### Step 3: 기존 코드 마이그레이션 (1시간)

#### 3-1. 기존 schemas.ts 백업
```bash
cp lib/interpretation/schemas.ts lib/interpretation/schemas.v2.backup.ts
```

#### 3-2. import 경로 업데이트
```typescript
// 기존
import { AnalysisResultSchema } from '@/lib/interpretation/schemas'

// 변경 후
import { AnalysisResultSchema } from '@/lib/interpretation/schemas'  // 동일 (index.ts에서 re-export)
```

#### 3-3. 기존 테스트 실행
```bash
npm test -- interpretation
```

**예상 에러**:
- ❌ `additional` 필드 누락 (required인데 제공 안 함)
- ❌ method와 additional 타입 불일치

**수정 방법**:
```typescript
// ❌ 에러: Linear Regression인데 additional 없음
const result = AnalysisResultSchema.parse({
  method: 'Linear Regression',
  statistic: 5.2,
  pValue: 0.03
})

// ✅ 수정: additional 추가
const result = AnalysisResultSchema.parse({
  method: 'Linear Regression',
  statistic: 5.2,
  pValue: 0.03,
  additional: { rSquared: 0.75 }  // ✅
})
```

---

### Step 4: 테스트 강화 (0.5시간)

#### 4-1. contracts.test.ts 업데이트
```typescript
describe('Discriminated Union: method별 additional 강제', () => {
  it('Linear Regression은 rSquared 필수', () => {
    expect(() => {
      AnalysisResultSchema.parse({
        method: 'Linear Regression',
        statistic: 5.2,
        pValue: 0.03
        // ❌ additional 누락
      })
    }).toThrow()  // ✅ 에러 발생
  })

  it('Linear Regression에 ANOVA 전용 필드는 에러', () => {
    expect(() => {
      AnalysisResultSchema.parse({
        method: 'Linear Regression',
        statistic: 5.2,
        pValue: 0.03,
        additional: {
          rSquared: 0.75,
          etaSquared: 0.15  // ❌ ANOVA 전용
        }
      })
    }).toThrow()  // ✅ passthrough 제거 시 에러
  })

  it('One-way ANOVA는 groupStats 3개 이상 필수', () => {
    expect(() => {
      AnalysisResultSchema.parse({
        method: 'One-way ANOVA',
        statistic: 5.2,
        pValue: 0.03,
        groupStats: [
          { mean: 50, std: 10, n: 30 },
          { mean: 55, std: 12, n: 30 }  // ❌ 2개만 (3개 필요)
        ]
      })
    }).toThrow()
  })
})
```

---

## 🚨 주의사항

### 1. passthrough() 제거 여부 결정

**Option A: passthrough() 완전 제거 (엄격)**
```typescript
export const AdditionalRegressionSchema = z.object({
  rSquared: z.number().min(0).max(1).optional(),
  adjustedRSquared: z.number().min(0).max(1).optional(),
  fStatistic: z.number().finite().nonnegative().optional()
  // passthrough() 제거 → 정의되지 않은 필드 에러
})
```

**Option B: passthrough() 유지 (유연)**
```typescript
export const AdditionalRegressionSchema = z.object({
  rSquared: z.number().min(0).max(1).optional(),
  // ...
}).passthrough()  // ✅ 확장 가능 (새 필드 추가 시 스키마 수정 불필요)
```

**권장**: Option B (passthrough 유지)
- 새 통계 필드 추가 시 스키마 수정 불필요
- discriminated union만으로도 method별 분리 달성

---

### 2. method명 정확성
```typescript
// ✅ 올바름 (engine.ts와 정확히 일치)
method: z.literal('Linear Regression')

// ❌ 틀림
method: z.literal('linear regression')  // 소문자
method: z.literal('LinearRegression')   // 띄어쓰기 없음
```

**검증 방법**:
```bash
# engine.ts에서 정확한 method명 추출
grep -oP "(?<=case ')[^']+(?=':)" lib/interpretation/engine.ts
```

---

### 3. 45개 통계 vs 43개 페이지

**참고**: engine.ts에는 **45개 해석 블록**이 있음
- 일부 통계는 여러 변형 (예: t-test → Independent/Paired)
- discriminated union은 **45개 블록 모두** 포함

---

### 4. TypeScript 컴파일 에러 대응

**예상 에러**:
```
Property 'additional' is missing in type '{ method: "Linear Regression"; ... }'
but required in type '{ method: "Linear Regression"; additional: { rSquared: number; }; ... }'.
```

**수정**:
- contracts.test.ts: `as AnalysisResult` → 명시적 타입 캐스팅
- engine-*.test.ts: additional 필드 추가

---

## 📊 진행 상황 추적

### Phase 1: 분석 및 설계 (1시간)
- [ ] 45개 통계 method명 추출
- [ ] method별 additional 매핑 테이블 작성
- [ ] 파일 구조 설계

### Phase 2: 스키마 작성 (1.5시간)
- [ ] schemas/ 디렉토리 생성
- [ ] common.ts 분리
- [ ] additional/ 스키마 7개 작성
- [ ] discriminated-analysis-result.ts 작성 (45개 union)

### Phase 3: 마이그레이션 (1시간)
- [ ] 기존 schemas.ts 백업
- [ ] index.ts 작성 (re-export)
- [ ] 테스트 실행 및 에러 수정

### Phase 4: 테스트 강화 (0.5시간)
- [ ] contracts.test.ts 업데이트 (+10개 테스트)
- [ ] 전체 테스트 실행 (351개 → 361개 목표)

---

## 🎯 완료 기준

1. ✅ 45개 통계 discriminated union 작성 완료
2. ✅ TypeScript 컴파일 에러 0개
3. ✅ `npm test -- interpretation` 전체 통과
4. ✅ method와 additional 타입 불일치 시 **컴파일 에러** 발생 확인
5. ✅ 기존 테스트 351개 모두 통과 + 신규 10개 추가 (361개)

---

## 📚 참고 자료

### 기존 파일
- `lib/interpretation/schemas.ts` (v2.0 - fallback 제거)
- `__tests__/lib/interpretation/contracts.test.ts` (49개 테스트)

### Zod 문서
- [Discriminated Unions](https://zod.dev/?id=discriminated-unions)
- [Literals](https://zod.dev/?id=literals)

### 관련 문서
- `docs/RECONCILIATION_REPORT.md` (v2.0 상태)
- `CLAUDE.md` (테스트 자동화 원칙)

---

## 💡 예상 효과

### v2.0 (현재)
```typescript
// ❌ 타입 불일치 허용
AnalysisResultSchema.parse({
  method: 'Linear Regression',
  additional: { etaSquared: 0.15 }  // ✅ 통과 (ANOVA 전용인데!)
})
```

### v3.0 (목표)
```typescript
// ✅ 타입 불일치 거부
AnalysisResultSchema.parse({
  method: 'Linear Regression',
  additional: { etaSquared: 0.15 }  // ❌ 에러! (rSquared 필요)
})

// ✅ 올바른 사용
AnalysisResultSchema.parse({
  method: 'Linear Regression',
  additional: { rSquared: 0.75 }  // ✅ 통과
})
```

---

**작성**: 2025-11-24
**다음 단계**: v3.0 완료 후 Phase 1-C 스냅샷 테스트에 통합
