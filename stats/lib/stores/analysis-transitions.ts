import {
  DEFAULT_ANALYSIS_OPTIONS,
  isStatisticalMethodCategory,
  type AIRecommendation,
  type AnalysisOptions,
  type DiagnosticReport,
  type StatisticalMethod,
  type StatisticalAssumptions,
  type SuggestedSettings,
} from '@/types/analysis'
import { getMethodByAlias, promoteMethodToCanonical } from '@/lib/constants/statistical-methods'
import type { VariableMapping } from '@/lib/statistics/variable-mapping'
import type { AnalysisState, DetectedVariables } from './analysis-store'
import type { HistoryLoadResult, HistorySettingsResult } from './history-store'

export type AnalysisTransitionPatch = Partial<Pick<
  AnalysisState,
  | 'currentStep'
  | 'completedSteps'
  | 'selectedMethod'
  | 'variableMapping'
  | 'cachedAiRecommendation'
  | 'detectedVariables'
  | 'suggestedSettings'
  | 'analysisOptions'
  | 'assumptionResults'
  | 'diagnosticReport'
  | 'results'
  | 'uploadedData'
  | 'dataCharacteristics'
  | 'validationResults'
  | 'uploadedFile'
  | 'uploadedFileName'
  | 'analysisPurpose'
  | 'isLoading'
  | 'error'
>>

const _analysisTransitionTypeHints: {
  cachedAiRecommendation?: AIRecommendation | null
  suggestedSettings?: SuggestedSettings | null
  analysisOptions?: AnalysisOptions
  assumptionResults?: StatisticalAssumptions | null
  diagnosticReport?: DiagnosticReport | null
  variableMapping?: VariableMapping | null
  detectedVariables?: DetectedVariables | null
} = {}

void _analysisTransitionTypeHints

export function buildQuickAdvanceState(completedSteps: number[]): {
  completedSteps: number[]
  currentStep: number
} {
  return {
    completedSteps: [...new Set([...completedSteps, 1, 2])],
    currentStep: 3,
  }
}

export function createDiagnosticUploadReplacementPatch(): AnalysisTransitionPatch {
  return {
    currentStep: 1,
    completedSteps: [],
    selectedMethod: null,
    variableMapping: null,
    cachedAiRecommendation: null,
    detectedVariables: null,
    suggestedSettings: null,
    analysisOptions: { ...DEFAULT_ANALYSIS_OPTIONS },
    assumptionResults: null,
    diagnosticReport: null,
    results: null,
  }
}

export function createManualMethodBrowsingPatch(): AnalysisTransitionPatch {
  return {
    assumptionResults: null,
    suggestedSettings: null,
    diagnosticReport: null,
  }
}

/**
 * selectedMethod.id invariant: analysis-store에 들어오는 모든 id는 canonical로 정규화한다.
 * legacy alias('t-test', 'anova' 등)는 getMethodByAlias로 canonical entry를 조회해 id/category를
 * 승격한다. 원본 name은 보존하고, description이 비어 있거나 없을 때만 canonical 설명으로 보완한다.
 */
export function normalizeSelectedMethod(
  method: unknown
): StatisticalMethod | null {
  if (!method) return null
  if (typeof method !== 'object') return null
  const candidate = method as Record<string, unknown>
  if (!('id' in candidate) || !('name' in candidate) || !('category' in candidate)) return null
  if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string' || typeof candidate.category !== 'string') {
    return null
  }

  const description = typeof candidate.description === 'string' ? candidate.description : ''
  const canonical = getMethodByAlias(candidate.id)

  if (!canonical && !isStatisticalMethodCategory(candidate.category)) return null

  const base: StatisticalMethod = {
    id: candidate.id,
    name: candidate.name,
    category: canonical
      ? canonical.category
      : (candidate.category as StatisticalMethod['category']),
    description,
  }

  return promoteMethodToCanonical(base)
}

export function createHistoryRestorePatch(data: HistoryLoadResult): AnalysisTransitionPatch {
  return {
    analysisPurpose: data.analysisPurpose,
    selectedMethod: normalizeSelectedMethod(data.selectedMethod),
    variableMapping: data.variableMapping,
    results: data.results,
    uploadedFileName: data.uploadedFileName,
    currentStep: data.currentStep,
    completedSteps: data.completedSteps,
    uploadedData: null,
    dataCharacteristics: null,
    validationResults: null,
    assumptionResults: null,
    uploadedFile: null,
    cachedAiRecommendation: null,
    detectedVariables: null,
    suggestedSettings: null,
    analysisOptions: data.analysisOptions,
    diagnosticReport: null,
    isLoading: false,
    error: null,
  }
}

export function createHistorySettingsRestorePatch(data: HistorySettingsResult): AnalysisTransitionPatch {
  return {
    uploadedData: null,
    uploadedFile: null,
    uploadedFileName: null,
    validationResults: null,
    results: null,
    error: null,
    dataCharacteristics: null,
    assumptionResults: null,
    selectedMethod: normalizeSelectedMethod(data.selectedMethod),
    variableMapping: data.variableMapping,
    analysisPurpose: data.analysisPurpose,
    cachedAiRecommendation: null,
    detectedVariables: null,
    suggestedSettings: null,
    analysisOptions: data.analysisOptions,
    diagnosticReport: null,
    isLoading: false,
    currentStep: 1,
    completedSteps: [],
  }
}
