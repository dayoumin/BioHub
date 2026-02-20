/**
 * 스마트 플로우 네비게이션을 위한 공통 인터페이스
 */

import {
  StatisticalMethod,
  ValidationResults,
  AnalysisResult,
  DataRow
} from './smart-flow'
import type { VariableMapping } from '@/lib/statistics/variable-mapping'

// VariableMapping은 @/lib/statistics/variable-mapping에서 re-export
export type { VariableMapping }

export interface StepNavigationProps {
  /** 다음 단계로 이동 */
  onNext?: () => void
  /** 이전 단계로 이동 */
  onPrevious?: () => void
  /** 다음 단계로 이동 가능 여부 */
  canGoNext?: boolean
  /** 이전 단계로 이동 가능 여부 */
  canGoPrevious?: boolean
  /** 현재 단계 번호 */
  currentStep?: number
  /** 전체 단계 수 */
  totalSteps?: number
}

export interface DataUploadStepProps extends StepNavigationProps {
  onUploadComplete: (file: File, data: DataRow[]) => void
}

export interface DataValidationStepProps extends StepNavigationProps {
  validationResults: ValidationResults | null
  data: DataRow[] | null
}

export interface PurposeInputStepProps extends StepNavigationProps {
  onPurposeSubmit: (purpose: string, method: StatisticalMethod) => void
  validationResults?: ValidationResults | null
  data?: DataRow[] | null
}

export interface AnalysisExecutionStepProps extends StepNavigationProps {
  selectedMethod: StatisticalMethod | null
  variableMapping: VariableMapping | null
  data?: DataRow[] | null
  onAnalysisComplete?: (results: AnalysisResult) => void
}

export interface ResultsActionStepProps extends StepNavigationProps {
  results: AnalysisResult | null
  onNewAnalysis: () => void
  onExport: () => void
}
