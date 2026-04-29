export type {
  PaperSection,
  PaperDraftOptions,
  DraftContext,
  CaptionItem,
  PaperDraft,
  PaperTable,
  DiscussionState,
  FlatAssumption,
  FlatAssumptionCategory,
} from './paper-types'
export type {
  StudySchema,
  StudySchemaVariable,
  StudySchemaVariableRole,
  StudySchemaGroup,
  StudySchemaEffectSize,
  StudySchemaConfidenceInterval,
  StudySchemaAnalysisOption,
  StudySchemaIssue,
  StudySchemaReadiness,
  BuildStudySchemaParams,
} from './study-schema'
export type {
  MaterialsSourceKind,
  MaterialsSourceOrigin,
  MaterialsVerificationStatus,
  MaterialsProhibitedClaimId,
  MaterialsSourceInput,
  MaterialsSource,
  MaterialsSamplingContext,
  MaterialsSourceContract,
  BuildMaterialsSourceContractParams,
} from './materials-source-contract'
export type {
  PreprocessingStepKind,
  PreprocessingStepOrigin,
  PreprocessingStepStatus,
  PreprocessingProhibitedClaimId,
  PreprocessingStepInput,
  PreprocessingStep,
  PreprocessingValidationEvidence,
  PreprocessingSourceContract,
  BuildPreprocessingSourceContractParams,
} from './preprocessing-source-contract'
export type { AnalysisPaperDraftSchemaOptions } from './analysis-paper-draft'
export type {
  MethodsReadinessStatus,
  MethodsChecklistItemStatus,
  MethodsChecklistItemId,
  MethodsPromptPriority,
  MethodsPromptField,
  MethodsChecklistItem,
  MethodsUserPrompt,
  MethodsDraftReadiness,
} from './methods-readiness'
export type {
  MethodsAutomationFactId,
  MethodsUserInputId,
  MethodsProhibitedClaimId,
  MethodsGateRuleId,
  ResolvedMethodsScopeItem,
  MethodsAutomationScopeDefinition,
  ResolvedMethodsAutomationScope,
} from './methods-scope'
export type {
  ResultsReadinessStatus,
  ResultsChecklistItemStatus,
  ResultsChecklistItemId,
  ResultsChecklistItem,
  ResultsDraftReadiness,
} from './results-readiness'
export type {
  ResultsAutomationFactId,
  ResultsUserInputId,
  ResultsProhibitedClaimId,
  ResultsGateRuleId,
  ResolvedResultsScopeItem,
  ResultsAutomationScopeDefinition,
  ResolvedResultsAutomationScope,
} from './results-scope'
export type {
  CaptionsReadinessStatus,
  CaptionsChecklistItemStatus,
  CaptionsChecklistItemId,
  BuildCaptionsDraftReadinessParams,
  CaptionsChecklistItem,
  CaptionsDraftReadiness,
} from './captions-readiness'
export type {
  CaptionsAutomationFactId,
  CaptionsUserInputId,
  CaptionsProhibitedClaimId,
  CaptionsGateRuleId,
  ResolvedCaptionsScopeItem,
  CaptionsAutomationScopeDefinition,
  ResolvedCaptionsAutomationScope,
} from './captions-scope'

export { generatePaperDraftFromSchema } from './paper-draft-service'
export { generateAnalysisPaperDraft, isReusableAnalysisStudySchema } from './analysis-paper-draft'
export { generatePaperTables } from './paper-tables'
export { buildStudySchema, collectStudySchemaIssues, buildDraftContextFromStudySchema } from './study-schema'
export { buildMaterialsSourceContract, hasUnsafeSpeciesSource, getMaterialsSourceSummary } from './materials-source-contract'
export {
  buildPreprocessingSourceContract,
  hasBlockingPreprocessingIssue,
  hasReviewablePreprocessingGap,
  getPreprocessingSourceSummary,
} from './preprocessing-source-contract'
export { buildMethodsDraftReadiness } from './methods-readiness'
export { getMethodsAutomationScope } from './methods-scope'
export { buildResultsDraftReadiness } from './results-readiness'
export { getResultsAutomationScope } from './results-scope'
export { buildCaptionsDraftReadiness } from './captions-readiness'
export { getCaptionsAutomationScope } from './captions-scope'
export { fmtP, fmt, getTemplate } from './paper-templates'
export type { TemplateInput, CategoryTemplate } from './paper-templates'
export { getMethodDisplayName } from './terminology-utils'
