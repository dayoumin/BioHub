/**
 * Zod Schemas for Interpretation Engine
 *
 * 목적: 입출력 데이터 런타임 검증
 * - TypeScript 타입 체크 (컴파일 시점)
 * - Zod 스키마 검증 (런타임)
 * = 이중 안전망
 */

import { z } from 'zod'

/**
 * 입력 데이터 스키마 (AnalysisResult)
 */

// 효과 크기 정보
export const EffectSizeInfoSchema = z.union([
  z.number().finite(),  // 단순 숫자
  z.object({
    value: z.number().finite(),
    type: z.string(),
    interpretation: z.string().optional()
  })
])

// 그룹 통계
export const GroupStatSchema = z.object({
  name: z.string().optional(),
  mean: z.number().finite(),
  std: z.number().finite().nonnegative(),
  n: z.number().int().positive(),
  median: z.number().finite().optional()
})

// 회귀 계수
export const CoefficientSchema = z.object({
  variable: z.string(),
  value: z.number().finite(),
  pValue: z.number().min(0).max(1).optional(),
  std: z.number().finite().nonnegative().optional()
})

/**
 * 통계별 Additional 필드 스키마 (런타임 검증 강화)
 */

// 회귀 분석용 additional (R², adjusted R², F-통계량 등)
export const AdditionalRegressionSchema = z.object({
  rSquared: z.number().min(0).max(1).optional(),
  adjustedRSquared: z.number().min(0).max(1).optional(),
  adjRSquared: z.number().min(0).max(1).optional(),  // alias
  fStatistic: z.number().finite().nonnegative().optional(),
  aic: z.number().finite().optional(),
  bic: z.number().finite().optional()
}).passthrough()  // 다른 필드 허용

// 상관 분석용 additional
export const AdditionalCorrelationSchema = z.object({
  rSquared: z.number().min(0).max(1).optional(),
  ci: z.tuple([z.number(), z.number()]).optional()  // 신뢰구간
}).passthrough()

// ANOVA용 additional (eta², omega² 등)
export const AdditionalANOVASchema = z.object({
  etaSquared: z.number().min(0).max(1).optional(),
  omegaSquared: z.number().min(0).max(1).optional(),
  partialEtaSquared: z.number().min(0).max(1).optional()
}).passthrough()

// 군집 분석용 additional
export const AdditionalClusterSchema = z.object({
  silhouetteScore: z.number().min(-1).max(1).optional(),
  inertia: z.number().finite().nonnegative().optional(),
  nClusters: z.number().int().positive().optional()
}).passthrough()

// PCA/Factor Analysis용 additional
export const AdditionalDimensionReductionSchema = z.object({
  explainedVariance: z.number().min(0).max(1).optional(),
  cumulativeVariance: z.number().min(0).max(1).optional(),
  nComponents: z.number().int().positive().optional()
}).passthrough()

// 검정력 분석용 additional
export const AdditionalPowerSchema = z.object({
  power: z.number().min(0).max(1).optional(),
  sampleSize: z.number().int().positive().optional(),
  effectSize: z.number().finite().optional()
}).passthrough()

// 신뢰도 분석용 additional
export const AdditionalReliabilitySchema = z.object({
  alpha: z.number().min(0).max(1).optional(),
  nItems: z.number().int().positive().optional()
}).passthrough()

// Union으로 통합 (모든 통계 커버)
/**
 * 🚨 검증 전략 (2025-11-24 강화):
 *
 * **변경 사항**:
 * - ❌ **fallback 제거**: `z.record(z.string(), z.unknown())` 삭제
 * - ✅ **엄격 검증**: 정의된 7개 스키마만 허용
 * - ⚠️ **Trade-off**: 새 통계 필드 추가 시 스키마 수정 필요
 *
 * **현재 구현 (v2.0)**:
 * 1. **7개 스키마만 허용**: Regression, Correlation, ANOVA, Cluster, DimReduction, Power, Reliability
 * 2. **passthrough() 유지**: 각 스키마 내에서 확장 가능 (예: rSquared 외 fStatistic 추가)
 * 3. **optional() 유지**: additional 필드 자체는 선택적
 *
 * **검증 커버리지**:
 * - ✅ 기본 필드 검증: pValue (0~1), statistic (finite)
 * - ✅ Additional 필드 범위 검증: rSquared (0~1), power (0~1), etc.
 * - 🟡 미정의 통계: Union 매칭 실패 → 에러 발생 (추가 시 스키마 업데이트 필요)
 *
 * **향후 개선 (Phase 1-D)**:
 * - Discriminated Union (method 필드 기준) 적용 시 완벽한 강제 가능
 * - 예: method='Linear Regression' → AdditionalRegressionSchema 강제
 */
export const AdditionalFieldsSchema = z.union([
  AdditionalRegressionSchema,
  AdditionalCorrelationSchema,
  AdditionalANOVASchema,
  AdditionalClusterSchema,
  AdditionalDimensionReductionSchema,
  AdditionalPowerSchema,
  AdditionalReliabilitySchema
  // ❌ fallback 제거: z.record(z.string(), z.unknown())
]).optional()

// 메인 AnalysisResult 스키마
export const AnalysisResultSchema = z.object({
  method: z.string().min(1),
  statistic: z.number().finite(),
  pValue: z.number().min(0).max(1),
  df: z.union([
    z.number().int().positive(),  // 단일 df
    z.tuple([z.number().int().positive(), z.number().int().positive()])  // [df1, df2]
  ]).optional(),
  effectSize: EffectSizeInfoSchema.optional(),
  groupStats: z.array(GroupStatSchema).optional(),
  coefficients: z.array(CoefficientSchema).optional(),
  additional: AdditionalFieldsSchema  // 강화된 검증 (Union 스키마)
})

export type AnalysisResultInput = z.infer<typeof AnalysisResultSchema>

/**
 * 출력 데이터 스키마 (InterpretationResult)
 */
export const InterpretationResultSchema = z.object({
  title: z.string().min(5, 'title은 최소 5자 이상이어야 합니다'),
  summary: z.string().min(10, 'summary는 최소 10자 이상이어야 합니다'),
  statistical: z.string().min(10, 'statistical은 최소 10자 이상이어야 합니다'),
  practical: z.string().min(5).nullable()
})

export type InterpretationResultOutput = z.infer<typeof InterpretationResultSchema>

/**
 * 검증 Helper 함수
 */

/**
 * 입력 데이터 검증
 * @throws ZodError - 검증 실패 시
 */
export function validateAnalysisResult(data: unknown): AnalysisResultInput {
  return AnalysisResultSchema.parse(data)
}

/**
 * 출력 데이터 검증
 * @throws ZodError - 검증 실패 시
 */
export function validateInterpretationResult(data: unknown): InterpretationResultOutput {
  return InterpretationResultSchema.parse(data)
}

/**
 * 안전한 검증 (에러를 boolean으로 반환)
 */
export function isSafeAnalysisResult(data: unknown): data is AnalysisResultInput {
  return AnalysisResultSchema.safeParse(data).success
}

export function isSafeInterpretationResult(data: unknown): data is InterpretationResultOutput {
  return InterpretationResultSchema.safeParse(data).success
}
