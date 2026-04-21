import type { TerminologyDictionary } from '../terminology-types'

export type TerminologySectionOwner = 'language' | 'mixed' | 'domain'
export type TerminologyPackSectionKey = Exclude<keyof TerminologyDictionary, 'domain' | 'language'>

/**
 * Top-level terminology section ownership map.
 *
 * New dictionary sections must be classified here first so that:
 * 1. language/domain pack extraction stays exhaustive, and
 * 2. cross-combo resolver behavior is explicit at compile time.
 */
export const TERMINOLOGY_SECTION_OWNERSHIP = {
  analysis: 'language',
  fitScore: 'language',
  analysisInfo: 'language',
  history: 'language',
  dataExploration: 'language',
  results: 'language',
  dataUpload: 'language',
  dataValidation: 'language',
  naturalLanguageInput: 'language',
  methodSelector: 'language',
  methodBrowser: 'language',
  template: 'language',
  methods: 'domain',
  validationDetails: 'language',
  validationSummary: 'language',
  resultsVisualization: 'language',
  methodSpecificResults: 'language',
  recommendedMethods: 'language',
  conversationalQuestion: 'language',
  variableMapping: 'language',
  questionFlowNav: 'language',
  reanalysis: 'language',
  methodManager: 'language',
  decisionTree: 'language',
  chartLabels: 'language',
  flowStateMachine: 'language',
  guidedQuestions: 'language',
  guidedQuestionData: 'language',
  progressiveCategoryData: 'language',
  autoAnswerEvidence: 'language',
  validation: 'mixed',
  success: 'mixed',
  selectorUI: 'mixed',
  displayName: 'domain',
  variables: 'domain',
  purposeInput: 'domain',
  hub: 'domain',
} as const satisfies Record<TerminologyPackSectionKey, TerminologySectionOwner>

type TerminologySectionOwnershipMap = typeof TERMINOLOGY_SECTION_OWNERSHIP

type KeysForOwner<Owner extends TerminologySectionOwner> = {
  [Key in keyof TerminologySectionOwnershipMap]:
    TerminologySectionOwnershipMap[Key] extends Owner ? Key : never
}[keyof TerminologySectionOwnershipMap]

function keysForOwner<Owner extends TerminologySectionOwner>(
  owner: Owner,
): KeysForOwner<Owner>[] {
  return Object.entries(TERMINOLOGY_SECTION_OWNERSHIP)
    .filter((entry): entry is [KeysForOwner<Owner>, Owner] => entry[1] === owner)
    .map(([key]) => key)
}

export const LANGUAGE_OWNED_TERMINOLOGY_KEYS = keysForOwner('language')
export const MIXED_OWNED_TERMINOLOGY_KEYS = keysForOwner('mixed')
export const DOMAIN_OWNED_TERMINOLOGY_KEYS = keysForOwner('domain')

export type LanguageOwnedTerminologyKey = typeof LANGUAGE_OWNED_TERMINOLOGY_KEYS[number]
export type MixedOwnedTerminologyKey = typeof MIXED_OWNED_TERMINOLOGY_KEYS[number]
export type DomainOwnedTerminologyKey = typeof DOMAIN_OWNED_TERMINOLOGY_KEYS[number]

export function getTerminologySectionOwner<Key extends keyof TerminologySectionOwnershipMap>(
  key: Key,
): TerminologySectionOwnershipMap[Key] {
  return TERMINOLOGY_SECTION_OWNERSHIP[key]
}
