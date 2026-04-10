import {
  DEFAULT_ANALYSIS_OPTIONS,
  type AIRecommendation,
  type AnalysisOptions,
  type DiagnosticReport,
  type StatisticalAssumptions,
  type SuggestedSettings,
} from '@/types/analysis'
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

export function createHistoryRestorePatch(data: HistoryLoadResult): AnalysisTransitionPatch {
  return {
    analysisPurpose: data.analysisPurpose,
    selectedMethod: data.selectedMethod,
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
    selectedMethod: data.selectedMethod,
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
