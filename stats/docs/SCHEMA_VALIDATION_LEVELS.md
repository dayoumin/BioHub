# Additional 스키마 검증 수준 명세

**작성일**: 2025-11-24
**버전**: v2.0 (fallback 제거)
**파일**: `lib/interpretation/schemas.ts`

---

## 📊 현재 검증 수준 (v2.0)

### ✅ 제거된 것 (엄격해짐)
```typescript
// ❌ v1.0 (제거됨)
export const AdditionalFieldsSchema = z.union([
  // ... 7개 스키마
  z.record(z.string(), z.unknown())  // ← fallback 삭제
]).optional()
```

**효과**:
- ❌ 임의 객체 통과 방지
- ✅ 7개 스키마 중 하나만 매칭

---

### 🟡 유지된 것 (유연성)

#### 1. `.passthrough()` (각 스키마 내)
```typescript
export const AdditionalRegressionSchema = z.object({
  rSquared: z.number().min(0).max(1).optional(),
  adjustedRSquared: z.number().min(0).max(1).optional(),
  fStatistic: z.number().finite().nonnegative().optional()
}).passthrough()  // ← 유지됨
```

**허용 예시**:
```typescript
// ✅ 통과
{ rSquared: 0.75, unknownField: 123 }

// ✅ 통과 (passthrough)
{ rSquared: 0.75, newMetric: "abc" }

// ❌ 거부 (범위 초과)
{ rSquared: 1.5 }
```

#### 2. `.optional()` (전체 필드)
```typescript
export const AdditionalFieldsSchema = z.union([
  // ...
]).optional()  // ← 유지됨
```

**효과**:
- `additional` 필드 자체가 선택적
- 없어도 검증 통과

---

## 🎯 검증 범위

### ✅ 검증되는 것
1. **7개 스키마 매칭**: Regression, Correlation, ANOVA, Cluster, DimReduction, Power, Reliability
2. **정의된 필드 범위**: `rSquared` (0~1), `power` (0~1), `silhouetteScore` (-1~1)
3. **기본 필드**: `statistic` (finite), `pValue` (0~1), `df` (positive int)

### 🟡 검증 안 되는 것 (의도적)
1. **미정의 필드**: passthrough로 인해 통과
2. **필드 부재**: optional로 인해 통과
3. **Method-Additional 매핑**: 현재 없음 (v3.0에서 추가 예정)

---

## 🚨 알려진 한계

### 1. Method와 Additional 불일치 허용
```typescript
// ❌ 논리적 오류지만 통과
{
  method: 'Linear Regression',
  additional: {
    etaSquared: 0.15  // ANOVA 전용인데!
  }
}
```

**이유**: Union 스키마는 method 필드를 고려하지 않음

**해결**: v3.0 Discriminated Union 적용 시 해결 예정

---

### 2. Passthrough로 인한 미정의 필드 허용
```typescript
// ✅ 통과 (의도된 동작)
{
  method: 'Linear Regression',
  additional: {
    rSquared: 0.75,
    customMetric: 999,  // 정의 안 됨
    experimentalValue: "test"  // 정의 안 됨
  }
}
```

**이유**: 새 통계 필드 추가 시 스키마 수정 부담 감소 (확장성)

**Trade-off**: 엄격성 ↓ vs 확장성 ↑

---

## 📈 버전 비교

| 항목 | v1.0 | v2.0 (현재) | v3.0 (예정) |
|------|------|------------|------------|
| **Fallback** | ✅ 있음 | ❌ 제거 | ❌ 제거 |
| **Passthrough** | ✅ 있음 | ✅ 있음 | 🤔 검토 중 |
| **Method 기반 강제** | ❌ 없음 | ❌ 없음 | ✅ 추가 예정 |
| **검증 엄격도** | 🟢 느슨 | 🟡 중간 | 🔴 엄격 |

---

## 🎯 v3.0 목표: Discriminated Union

```typescript
export const AnalysisResultSchema = z.discriminatedUnion('method', [
  z.object({
    method: z.literal('Linear Regression'),
    statistic: z.number().finite(),
    pValue: z.number().min(0).max(1),
    additional: AdditionalRegressionSchema.required()  // ✅ 강제
  }),
  z.object({
    method: z.literal('One-way ANOVA'),
    statistic: z.number().finite(),
    pValue: z.number().min(0).max(1),
    additional: AdditionalANOVASchema.optional()  // ✅ 선택적
  }),
  // ... 43개 통계
])
```

**효과**:
- ✅ Method='Linear Regression' → `additional.rSquared` 만 허용
- ✅ Method='One-way ANOVA' → `additional.etaSquared` 만 허용
- ✅ 컴파일 타임 + 런타임 모두 강제

**예상 작업**: 4시간 (43개 통계 discriminated union 작성)

---

## 📚 관련 문서

- [DISCRIMINATED_UNION_TASK_GUIDE.md](DISCRIMINATED_UNION_TASK_GUIDE.md) - v3.0 구현 가이드
- [RECONCILIATION_REPORT.md](RECONCILIATION_REPORT.md) - v2.0 검증 결과
- [schemas.ts](../lib/interpretation/schemas.ts) - 실제 구현 코드

---

**결론**: v2.0은 fallback 제거로 엄격성을 높였으나, passthrough로 인해 확장성을 유지합니다. 완전한 엄격 검증은 v3.0 discriminated union에서 달성됩니다.
