/**
 * Validation Hooks
 *
 * @description
 * DataValidationStep에서 사용하는 커스텀 훅 통합 export
 */

// Auto Progress
export {
  useAutoProgress,
  type UseAutoProgressOptions,
  type UseAutoProgressReturn
} from './useAutoProgress'

// Normality Test
export {
  useNormalityTest,
  type UseNormalityTestOptions,
  type UseNormalityTestReturn,
  type NormalityTestResult,
  type NormalityRule
} from './useNormalityTest'
