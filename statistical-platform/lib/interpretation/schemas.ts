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
  additional: z.any().optional()  // any로 완화 (통계마다 필드 다름)
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
