import type { StudySchema } from './study-schema'
import {
  getMethodsAutomationScope,
  type MethodsGateRuleId,
  type ResolvedMethodsAutomationScope,
} from './methods-scope'
import { getMaterialsSourceSummary, hasUnsafeSpeciesSource } from './materials-source-contract'
import {
  getPreprocessingSourceSummary,
  hasBlockingPreprocessingIssue,
  hasReviewablePreprocessingGap,
} from './preprocessing-source-contract'

export type MethodsReadinessStatus = 'ready' | 'needs-review' | 'blocked'

export type MethodsChecklistItemStatus =
  | 'complete'
  | 'needs-input'
  | 'warning'
  | 'blocked'

export type MethodsChecklistItemId =
  | 'research-purpose'
  | 'analysis-rationale'
  | 'variable-roles'
  | 'materials-source'
  | 'preprocessing-source'
  | 'sample-description'
  | 'missing-data'
  | 'assumption-checks'
  | 'post-hoc-method'
  | 'software-provenance'

export type MethodsPromptPriority = 'required' | 'recommended'

export type MethodsPromptField =
  | 'researchQuestion'
  | 'analysisRationale'
  | 'dataDescription'
  | 'missingDataHandling'
  | 'assumptionDecision'
  | 'postHocMethod'

export interface MethodsChecklistItem {
  id: MethodsChecklistItemId
  section: 'methods'
  label: string
  status: MethodsChecklistItemStatus
  message: string
  gateRule?: MethodsGateRuleId
  evidence?: string
  action?: string
}

export interface MethodsUserPrompt {
  id: string
  field: MethodsPromptField
  priority: MethodsPromptPriority
  label: string
  helperText: string
  placeholder: string
}

export interface MethodsDraftReadiness {
  status: MethodsReadinessStatus
  title: string
  summary: string
  canGenerateDraft: boolean
  shouldReviewBeforeInsert: boolean
  blockingCount: number
  warningCount: number
  promptCount: number
  blockingGateRules: MethodsGateRuleId[]
  reviewGateRules: MethodsGateRuleId[]
  checklist: MethodsChecklistItem[]
  prompts: MethodsUserPrompt[]
  scope: ResolvedMethodsAutomationScope
}

function text(
  language: 'ko' | 'en',
  ko: string,
  en: string,
): string {
  return language === 'ko' ? ko : en
}

function hasDefinedNumber(value: number | undefined): boolean {
  return typeof value === 'number' && Number.isFinite(value)
}

function buildResearchPurposeItem(
  schema: StudySchema,
  language: 'ko' | 'en',
): MethodsChecklistItem {
  const hasPurpose = Boolean(
    schema.study.context
    || schema.study.researchQuestion
    || schema.study.hypothesis,
  )

  return {
    id: 'research-purpose',
    section: 'methods',
    label: text(language, '연구 목적', 'Research purpose'),
    status: hasPurpose ? 'complete' : 'needs-input',
    message: hasPurpose
      ? text(language, '분석 목적 문장을 Methods 초안에 연결할 수 있습니다.', 'The analysis purpose can be linked to the Methods draft.')
      : text(language, 'Methods 첫 문장에 들어갈 연구 목적이 필요합니다.', 'A study purpose is needed for the opening Methods sentence.'),
    gateRule: hasPurpose ? undefined : 'missing-study-purpose',
    evidence: schema.study.context ?? schema.study.researchQuestion ?? schema.study.hypothesis,
    action: hasPurpose
      ? undefined
      : text(language, '연구 목적을 한 문장으로 입력하세요.', 'Add the study purpose in one sentence.'),
  }
}

function buildVariableRolesItem(
  schema: StudySchema,
  language: 'ko' | 'en',
): MethodsChecklistItem {
  const roleVariables = schema.variables.filter((variable) =>
    variable.roles.some((role) => role !== 'display'),
  )
  const hasRoles = roleVariables.length > 0

  return {
    id: 'variable-roles',
    section: 'methods',
    label: text(language, '변수 역할', 'Variable roles'),
    status: hasRoles ? 'complete' : 'blocked',
    message: hasRoles
      ? text(language, '분석에 사용된 변수 역할이 확인되었습니다.', 'Variable roles used in the analysis are available.')
      : text(language, '독립/종속/집단 변수 역할이 없어 Methods를 안정적으로 작성할 수 없습니다.', 'Methods cannot be drafted reliably without independent, dependent, or grouping variable roles.'),
    gateRule: hasRoles ? undefined : 'missing-variable-roles',
    evidence: roleVariables.map((variable) => variable.label).join(', ') || undefined,
    action: hasRoles
      ? undefined
      : text(language, '변수 선택 단계에서 변수 역할을 다시 확인하세요.', 'Confirm variable roles in the variable selection step.'),
  }
}

function buildAnalysisRationaleItem(
  schema: StudySchema,
  language: 'ko' | 'en',
): MethodsChecklistItem {
  const hasRationale = Boolean(schema.study.analysisRationale)

  return {
    id: 'analysis-rationale',
    section: 'methods',
    label: text(language, '분석 선택 이유', 'Analysis rationale'),
    status: hasRationale ? 'complete' : 'needs-input',
    message: hasRationale
      ? text(language, '분석 방법 선택 이유를 Methods에 포함할 수 있습니다.', 'The rationale for the selected analysis can be included in Methods.')
      : text(language, '분석 방법 선택 이유는 결과만으로 추론하지 않습니다.', 'The rationale for selecting the analysis is not inferred from results alone.'),
    gateRule: hasRationale ? undefined : 'missing-model-rationale',
    evidence: schema.study.analysisRationale,
    action: hasRationale
      ? undefined
      : text(language, '이 분석 방법을 선택한 이유를 한 문장으로 입력하세요.', 'Add one sentence explaining why this analysis was selected.'),
  }
}

function buildMaterialsSourceItem(
  schema: StudySchema,
  language: 'ko' | 'en',
): MethodsChecklistItem {
  const hasUnsafeSpecies = hasUnsafeSpeciesSource(schema.materials)
  const hasSources = schema.materials.sources.length > 0

  if (hasUnsafeSpecies) {
    return {
      id: 'materials-source',
      section: 'methods',
      label: text(language, '재료/시료 source', 'Materials and samples source'),
      status: 'blocked',
      message: text(language, '검증되지 않은 species source가 있어 종명 또는 시료 문장을 확정할 수 없습니다.', 'Unverified species sources prevent confirmed species or sample statements.'),
      gateRule: 'unverified-species-source',
      evidence: schema.materials.errors.join('; ') || undefined,
      action: text(language, 'taxonomy/species checker 결과를 연결하거나 종명 표현을 사용자 확인 상태로 바꾸세요.', 'Attach taxonomy/species checker evidence or keep species wording user-confirmed.'),
    }
  }

  if (hasSources) {
    return {
      id: 'materials-source',
      section: 'methods',
      label: text(language, '재료/시료 source', 'Materials and samples source'),
      status: 'complete',
      message: text(language, 'provenance가 있는 재료/시료 source만 Methods에 사용할 수 있습니다.', 'Only provenance-backed materials and sample sources can be used in Methods.'),
      evidence: getMaterialsSourceSummary(schema.materials, language),
    }
  }

  return {
    id: 'materials-source',
    section: 'methods',
    label: text(language, '재료/시료 source', 'Materials and samples source'),
    status: 'needs-input',
    message: text(language, '재료/시료 source가 없어 표본 설명은 사용자 입력으로만 작성해야 합니다.', 'Materials and sample sources are unavailable; sample wording must come from user input.'),
    gateRule: 'missing-data-description',
    action: text(language, '데이터셋/시료/생물종 source를 프로젝트 entity 또는 사용자 입력으로 연결하세요.', 'Connect dataset, sample, or species sources through a project entity or user input.'),
  }
}

function buildPreprocessingSourceItem(
  schema: StudySchema,
  language: 'ko' | 'en',
): MethodsChecklistItem {
  if (hasBlockingPreprocessingIssue(schema.preprocessing)) {
    return {
      id: 'preprocessing-source',
      section: 'methods',
      label: text(language, '전처리 source', 'Preprocessing source'),
      status: 'blocked',
      message: text(language, '데이터 검증 오류가 남아 있어 전처리/Methods 문장을 생성하지 않습니다.', 'Validation errors remain, so preprocessing and Methods text should not be drafted.'),
      gateRule: 'validation-errors',
      evidence: schema.preprocessing.errors.join('; '),
      action: text(language, '데이터 검증 오류를 먼저 수정하세요.', 'Resolve validation errors before drafting.'),
    }
  }

  if (hasReviewablePreprocessingGap(schema.preprocessing)) {
    return {
      id: 'preprocessing-source',
      section: 'methods',
      label: text(language, '전처리 source', 'Preprocessing source'),
      status: 'needs-input',
      message: text(language, '결측/변환/제외 관련 전처리 기록은 있으나 사용자 확인이 필요합니다.', 'Preprocessing records exist for missingness, transformation, or exclusion, but user confirmation is required.'),
      gateRule: 'missing-data-handling',
      evidence: getPreprocessingSourceSummary(schema.preprocessing, language),
      action: text(language, '결측 처리, 변환, 제외 기준의 실제 처리 이유를 확인하세요.', 'Confirm the actual rationale for missing-data handling, transformations, or exclusions.'),
    }
  }

  return {
    id: 'preprocessing-source',
    section: 'methods',
    label: text(language, '전처리 source', 'Preprocessing source'),
    status: 'complete',
    message: text(language, '검증된 전처리 source 범위 안에서만 Methods 문장을 작성합니다.', 'Methods text will be limited to verified preprocessing sources.'),
    evidence: getPreprocessingSourceSummary(schema.preprocessing, language),
  }
}

function buildSampleDescriptionItem(
  schema: StudySchema,
  language: 'ko' | 'en',
): MethodsChecklistItem {
  const hasRows = hasDefinedNumber(schema.source.rowCount)
  const hasVariables = schema.source.variables.length > 0
  const hasDescription = Boolean(schema.study.dataDescription)
  const isComplete = hasRows && hasVariables && hasDescription
  const isPartial = hasRows && hasVariables

  return {
    id: 'sample-description',
    section: 'methods',
    label: text(language, '데이터/표본 설명', 'Data and sample description'),
    status: isComplete ? 'complete' : isPartial ? 'needs-input' : 'warning',
    message: isComplete
      ? text(language, '데이터 설명과 표본 규모를 Methods에 포함할 수 있습니다.', 'Data description and sample size can be included in Methods.')
      : isPartial
        ? text(language, '표본 규모는 확인되었지만 데이터셋 설명이 부족합니다.', 'Sample size is available, but the dataset description is incomplete.')
        : text(language, '표본 규모나 변수 목록이 불완전합니다.', 'Sample size or variable metadata is incomplete.'),
    gateRule: isComplete ? undefined : 'missing-data-description',
    evidence: hasRows
      ? text(language, `${schema.source.rowCount}행, ${schema.source.variables.length}개 변수`, `${schema.source.rowCount} rows, ${schema.source.variables.length} variables`)
      : undefined,
    action: isComplete
      ? undefined
      : text(language, '데이터셋/대상/집단 설명을 짧게 입력하세요.', 'Add a short dataset, subject, or group description.'),
  }
}

function buildMissingDataItem(
  schema: StudySchema,
  language: 'ko' | 'en',
): MethodsChecklistItem {
  const missingValues = schema.preprocessing.validation.missingValues ?? schema.source.missingValues
  const hasMissingCount = hasDefinedNumber(missingValues)
  const hasErrors = hasBlockingPreprocessingIssue(schema.preprocessing) || schema.source.errors.length > 0

  if (hasErrors) {
    return {
      id: 'missing-data',
      section: 'methods',
      label: text(language, '결측/검증 오류', 'Missing data and validation errors'),
      status: 'blocked',
      message: text(language, '데이터 검증 오류가 남아 있어 Methods 작성 전에 해결해야 합니다.', 'Validation errors must be resolved before drafting Methods.'),
      gateRule: 'validation-errors',
      evidence: schema.preprocessing.errors.join('; ') || schema.source.errors.join('; '),
      action: text(language, '데이터 검증 오류를 먼저 수정하세요.', 'Resolve the validation errors first.'),
    }
  }

  if (!hasMissingCount) {
    return {
      id: 'missing-data',
      section: 'methods',
      label: text(language, '결측 처리', 'Missing data handling'),
      status: 'needs-input',
      message: text(language, '결측치 여부와 처리 방식이 확인되지 않았습니다.', 'Missingness and handling decisions are not documented.'),
      gateRule: 'missing-data-handling',
      action: text(language, '결측 처리 방식을 입력하세요.', 'Specify how missing values were handled.'),
    }
  }

  if ((missingValues ?? 0) > 0) {
    if (schema.study.missingDataHandling) {
      return {
        id: 'missing-data',
        section: 'methods',
        label: text(language, '결측 처리', 'Missing data handling'),
        status: 'complete',
        message: text(language, '결측 처리 방식이 Methods에 포함될 수 있습니다.', 'Missing data handling can be included in Methods.'),
        evidence: schema.study.missingDataHandling,
      }
    }

    return {
      id: 'missing-data',
      section: 'methods',
      label: text(language, '결측 처리', 'Missing data handling'),
      status: 'needs-input',
      message: text(language, '결측치가 있어 처리 방식을 Methods에 명시해야 합니다.', 'Missing values are present and their handling should be stated in Methods.'),
      gateRule: 'missing-data-handling',
      evidence: text(language, `결측치 ${missingValues}개`, `${missingValues} missing values`),
      action: text(language, '삭제, 대체, 분석별 제외 등 실제 처리 방식을 선택하세요.', 'Choose the actual handling strategy, such as deletion, imputation, or analysis-wise exclusion.'),
    }
  }

  return {
    id: 'missing-data',
    section: 'methods',
    label: text(language, '결측 처리', 'Missing data handling'),
    status: 'complete',
    message: text(language, '검증 기준상 결측치가 없습니다.', 'No missing values were detected by validation.'),
    evidence: text(language, '결측치 0개', '0 missing values'),
  }
}

function buildAssumptionChecksItem(
  schema: StudySchema,
  language: 'ko' | 'en',
): MethodsChecklistItem {
  const failedAssumptions = schema.assumptions.filter((assumption) => !assumption.passed)

  if (schema.assumptions.length === 0) {
    if (schema.study.assumptionDecision) {
      return {
        id: 'assumption-checks',
        section: 'methods',
        label: text(language, '가정 점검', 'Assumption checks'),
        status: 'complete',
        message: text(language, '가정 점검 판단 메모를 Methods에 포함할 수 있습니다.', 'The assumption decision note can be included in Methods.'),
        evidence: schema.study.assumptionDecision,
      }
    }

    return {
      id: 'assumption-checks',
      section: 'methods',
      label: text(language, '가정 점검', 'Assumption checks'),
      status: 'warning',
      message: text(language, '가정 점검 결과가 없어 Methods 품질이 낮아질 수 있습니다.', 'Assumption check results are unavailable, which may weaken Methods quality.'),
      gateRule: 'missing-assumption-decision',
      action: text(language, '가정 점검을 수행했는지 또는 생략 사유를 입력하세요.', 'State whether assumptions were checked or why they were omitted.'),
    }
  }

  if (failedAssumptions.length > 0) {
    if (schema.study.assumptionDecision) {
      return {
        id: 'assumption-checks',
        section: 'methods',
        label: text(language, '가정 점검', 'Assumption checks'),
        status: 'complete',
        message: text(language, '가정 위반에 대한 분석 판단을 Methods에 포함할 수 있습니다.', 'The analysis decision for violated assumptions can be included in Methods.'),
        evidence: schema.study.assumptionDecision,
      }
    }

    return {
      id: 'assumption-checks',
      section: 'methods',
      label: text(language, '가정 점검', 'Assumption checks'),
      status: 'warning',
      message: text(language, '일부 가정 위반이 있어 Methods에 분석 선택 또는 보정 이유를 설명해야 합니다.', 'Some assumptions were not met; Methods should explain the analysis choice or correction.'),
      gateRule: 'missing-assumption-decision',
      evidence: failedAssumptions.map((assumption) => assumption.testName).join(', '),
      action: text(language, '가정 위반 시 사용한 대안/보정/강건 분석 여부를 확인하세요.', 'Confirm the alternative, correction, or robust analysis used for violated assumptions.'),
    }
  }

  return {
    id: 'assumption-checks',
    section: 'methods',
    label: text(language, '가정 점검', 'Assumption checks'),
    status: 'complete',
    message: text(language, '가정 점검 결과를 Methods에 포함할 수 있습니다.', 'Assumption checks can be included in Methods.'),
    evidence: schema.assumptions.map((assumption) => assumption.testName).join(', '),
  }
}

function buildPostHocMethodItem(
  schema: StudySchema,
  language: 'ko' | 'en',
): MethodsChecklistItem {
  if (schema.analysis.postHocCount === 0) {
    return {
      id: 'post-hoc-method',
      section: 'methods',
      label: text(language, '사후검정/보정', 'Post hoc and correction method'),
      status: 'complete',
      message: text(language, '사후검정 결과가 없어 보정 방법 입력이 필요하지 않습니다.', 'No post hoc results require a correction method.'),
    }
  }

  const hasMethod = Boolean(schema.analysis.postHocMethod)
  return {
    id: 'post-hoc-method',
    section: 'methods',
    label: text(language, '사후검정/보정', 'Post hoc and correction method'),
    status: hasMethod ? 'complete' : 'blocked',
    message: hasMethod
      ? text(language, '사후검정 보정 방법이 확인되었습니다.', 'The post hoc correction method is available.')
      : text(language, '사후검정 결과가 있지만 보정 방법이 없어 Methods를 확정할 수 없습니다.', 'Post hoc results exist, but the correction method is missing.'),
    gateRule: hasMethod ? undefined : 'missing-post-hoc-method',
    evidence: schema.analysis.postHocMethod,
    action: hasMethod
      ? undefined
      : text(language, 'Tukey, Bonferroni 등 실제 사용한 보정 방법을 입력하세요.', 'Specify the actual correction method, such as Tukey or Bonferroni.'),
  }
}

function buildSoftwareProvenanceItem(
  schema: StudySchema,
  language: 'ko' | 'en',
): MethodsChecklistItem {
  return {
    id: 'software-provenance',
    section: 'methods',
    label: text(language, '소프트웨어/재현성', 'Software and reproducibility'),
    status: 'complete',
    message: text(language, 'BioHub 기반 분석 provenance를 Methods에 포함할 수 있습니다.', 'BioHub analysis provenance can be included in Methods.'),
    evidence: text(language, `BioHub, ${schema.analysis.methodName}`, `BioHub, ${schema.analysis.methodName}`),
  }
}

function collectActiveGateRules(
  checklist: MethodsChecklistItem[],
  candidateRules: MethodsGateRuleId[],
  statuses: MethodsChecklistItemStatus[],
): MethodsGateRuleId[] {
  const activeRules = new Set<MethodsGateRuleId>()

  for (const item of checklist) {
    if (!item.gateRule || !statuses.includes(item.status)) continue
    if (candidateRules.includes(item.gateRule)) {
      activeRules.add(item.gateRule)
    }
  }

  return Array.from(activeRules)
}

function buildPrompts(
  checklist: MethodsChecklistItem[],
  scope: ResolvedMethodsAutomationScope,
  language: 'ko' | 'en',
): MethodsUserPrompt[] {
  const prompts: MethodsUserPrompt[] = []
  const itemStatus = (id: MethodsChecklistItemId): MethodsChecklistItemStatus | undefined =>
    checklist.find((item) => item.id === id)?.status
  const isInScope = (gateRule: MethodsGateRuleId): boolean =>
    scope.blockedWhen.includes(gateRule) || scope.reviewWhen.includes(gateRule)

  if (itemStatus('research-purpose') === 'needs-input' && isInScope('missing-study-purpose')) {
    prompts.push({
      id: 'methods-research-purpose',
      field: 'researchQuestion',
      priority: 'recommended',
      label: text(language, '연구 목적', 'Research purpose'),
      helperText: text(language, 'Methods 첫 문장을 연구 맥락에 맞추기 위한 입력입니다.', 'Used to align the first Methods sentence with the study context.'),
      placeholder: text(language, '예: 사료 처리에 따른 체장 차이를 평가했다.', 'e.g., To evaluate differences in body length by feed treatment.'),
    })
  }

  if (itemStatus('analysis-rationale') === 'needs-input' && isInScope('missing-model-rationale')) {
    prompts.push({
      id: 'methods-analysis-rationale',
      field: 'analysisRationale',
      priority: 'recommended',
      label: text(language, '분석 선택 이유', 'Analysis rationale'),
      helperText: text(language, '회귀/모형 기반 분석은 왜 이 방법을 선택했는지 확인해야 합니다.', 'Model-based analyses should state why this method was selected.'),
      placeholder: text(language, '예: 연속형 반응변수와 예측변수 간 선형 관계를 평가하기 위해 선택했다.', 'e.g., This method was selected to evaluate a linear relationship between a continuous response and predictors.'),
    })
  }

  if (itemStatus('sample-description') !== 'complete' && isInScope('missing-data-description')) {
    prompts.push({
      id: 'methods-data-description',
      field: 'dataDescription',
      priority: 'recommended',
      label: text(language, '데이터/표본 설명', 'Data and sample description'),
      helperText: text(language, '대상, 집단, 기간, 측정 단위를 간단히 적습니다.', 'Briefly describe subjects, groups, time period, or measurements.'),
      placeholder: text(language, '예: 대조군과 처리군 각 20개체의 체장과 체중을 측정했다.', 'e.g., Body length and weight were measured in 20 control and 20 treatment subjects.'),
    })
  }

  if (itemStatus('missing-data') === 'needs-input' && isInScope('missing-data-handling')) {
    prompts.push({
      id: 'methods-missing-data-handling',
      field: 'missingDataHandling',
      priority: 'required',
      label: text(language, '결측 처리 방식', 'Missing data handling'),
      helperText: text(language, '결측치가 없더라도 검증 기준을 명시하면 Methods 신뢰도가 높아집니다.', 'Stating the handling rule improves Methods reliability even when no missing values remain.'),
      placeholder: text(language, '예: 결측값이 포함된 행은 해당 분석에서 제외했다.', 'e.g., Rows with missing values were excluded from the corresponding analysis.'),
    })
  }

  if (itemStatus('assumption-checks') === 'warning' && isInScope('missing-assumption-decision')) {
    prompts.push({
      id: 'methods-assumption-decision',
      field: 'assumptionDecision',
      priority: 'recommended',
      label: text(language, '가정 점검 판단', 'Assumption decision'),
      helperText: text(language, '가정 위반 또는 미점검 시 분석을 그대로 사용한 이유를 기록합니다.', 'Record why the selected analysis was retained when assumptions were violated or unavailable.'),
      placeholder: text(language, '예: 등분산 가정 위반으로 Welch 보정을 적용했다.', 'e.g., Welch correction was used because homogeneity of variance was violated.'),
    })
  }

  if (itemStatus('post-hoc-method') === 'blocked' && isInScope('missing-post-hoc-method')) {
    prompts.push({
      id: 'methods-post-hoc-method',
      field: 'postHocMethod',
      priority: 'required',
      label: text(language, '사후검정 보정 방법', 'Post hoc correction method'),
      helperText: text(language, '다중비교 결과를 보고하려면 보정 방법이 필요합니다.', 'A correction method is required to report multiple comparisons.'),
      placeholder: text(language, '예: Tukey HSD 보정을 적용했다.', 'e.g., Tukey HSD correction was applied.'),
    })
  }

  return prompts
}

export function buildMethodsDraftReadiness(
  schema: StudySchema,
  language: 'ko' | 'en' = schema.language,
): MethodsDraftReadiness {
  const scope = getMethodsAutomationScope(schema.analysis.methodId, language)
  const rawChecklist = [
    buildResearchPurposeItem(schema, language),
    buildVariableRolesItem(schema, language),
    ...(scope.reviewWhen.includes('missing-model-rationale')
      || scope.blockedWhen.includes('missing-model-rationale')
      ? [buildAnalysisRationaleItem(schema, language)]
      : []),
    buildMaterialsSourceItem(schema, language),
    buildPreprocessingSourceItem(schema, language),
    buildSampleDescriptionItem(schema, language),
    buildMissingDataItem(schema, language),
    buildAssumptionChecksItem(schema, language),
    buildPostHocMethodItem(schema, language),
    buildSoftwareProvenanceItem(schema, language),
  ]
  const scopedGateRules = [...scope.blockedWhen, ...scope.reviewWhen]
  const checklist = rawChecklist.filter((item) => (
    !item.gateRule
    || item.status === 'complete'
    || scopedGateRules.includes(item.gateRule)
  ))
  const blockingGateRules = collectActiveGateRules(checklist, scope.blockedWhen, ['blocked', 'warning', 'needs-input'])
  const reviewGateRules = collectActiveGateRules(checklist, scope.reviewWhen, ['blocked', 'warning', 'needs-input'])
    .filter((gateRule) => !blockingGateRules.includes(gateRule))
  const blockingCount = blockingGateRules.length
  const warningCount = reviewGateRules.length
  const prompts = buildPrompts(checklist, scope, language)
  const status: MethodsReadinessStatus = blockingCount > 0
    ? 'blocked'
    : warningCount > 0
      ? 'needs-review'
      : 'ready'

  return {
    status,
    title: status === 'ready'
      ? text(language, 'Methods 초안 작성 가능', 'Methods draft ready')
      : status === 'blocked'
        ? text(language, 'Methods 작성 전 필수 보완 필요', 'Required Methods inputs missing')
        : text(language, 'Methods 초안 작성 가능, 검토 필요', 'Methods draft available, review needed'),
    summary: status === 'ready'
      ? text(language, '현재 입력만으로 검토 가능한 Methods 초안을 만들 수 있습니다.', 'Current inputs are sufficient to produce a reviewable Methods draft.')
      : status === 'blocked'
        ? text(language, '필수 항목이 빠져 있어 자동 초안을 생성하지 않는 것이 안전합니다.', 'Required information is missing; automatic drafting should be blocked.')
        : text(language, '초안은 만들 수 있지만 사용자가 확인해야 할 항목이 있습니다.', 'A draft can be produced, but some items require user review.'),
    canGenerateDraft: blockingCount === 0,
    shouldReviewBeforeInsert: warningCount > 0,
    blockingCount,
    warningCount,
    promptCount: prompts.length,
    blockingGateRules,
    reviewGateRules,
    checklist,
    prompts,
    scope,
  }
}
