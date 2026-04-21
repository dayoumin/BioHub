import type { TerminologyDictionary } from '../terminology-types'

export const LANGUAGE_OWNED_TERMINOLOGY_KEYS = [
  'analysis',
  'fitScore',
  'analysisInfo',
  'history',
  'dataExploration',
  'results',
  'dataUpload',
  'dataValidation',
  'naturalLanguageInput',
  'methodSelector',
  'methodBrowser',
  'template',
  'validationDetails',
  'validationSummary',
  'resultsVisualization',
  'methodSpecificResults',
  'recommendedMethods',
  'conversationalQuestion',
  'variableMapping',
  'questionFlowNav',
  'reanalysis',
  'methodManager',
  'decisionTree',
  'chartLabels',
  'flowStateMachine',
  'guidedQuestions',
  'guidedQuestionData',
  'progressiveCategoryData',
  'autoAnswerEvidence',
] as const satisfies readonly (keyof TerminologyDictionary)[]

export const DOMAIN_OWNED_TERMINOLOGY_KEYS = [
  'displayName',
  'variables',
  'purposeInput',
  'hub',
] as const satisfies readonly (keyof TerminologyDictionary)[]

export type LanguageOwnedTerminologyKey = typeof LANGUAGE_OWNED_TERMINOLOGY_KEYS[number]
export type DomainOwnedTerminologyKey = typeof DOMAIN_OWNED_TERMINOLOGY_KEYS[number]
