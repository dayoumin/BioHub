export type PreprocessingStepKind =
  | 'missing-data-handling'
  | 'duplicate-removal'
  | 'row-filter'
  | 'variable-transform'
  | 'standardization'
  | 'outlier-exclusion'
  | 'imputation'

export type PreprocessingStepOrigin =
  | 'validation-metadata'
  | 'pipeline-log'
  | 'user-input'

export type PreprocessingStepStatus =
  | 'recorded'
  | 'user-confirmed'
  | 'unconfirmed'

export type PreprocessingProhibitedClaimId =
  | 'outlier-removal'
  | 'mcar'
  | 'mar'
  | 'variable-transform'
  | 'standardization'
  | 'exclusion-criteria'

export interface PreprocessingStepInput {
  id?: string
  kind: PreprocessingStepKind
  label: string
  origin: PreprocessingStepOrigin
  status?: PreprocessingStepStatus
  affectedVariables?: string[]
  rowCountDelta?: number
  rationale?: string
  evidence?: string
}

export interface PreprocessingStep {
  id: string
  kind: PreprocessingStepKind
  label: string
  origin: PreprocessingStepOrigin
  status: PreprocessingStepStatus
  affectedVariables: string[]
  rowCountDelta?: number
  rationale?: string
  evidence?: string
}

export interface PreprocessingValidationEvidence {
  missingValues?: number
  duplicateRows?: number
  warnings: string[]
  errors: string[]
}

export interface PreprocessingSourceContract {
  validation: PreprocessingValidationEvidence
  steps: PreprocessingStep[]
  prohibitedAutoClaims: PreprocessingProhibitedClaimId[]
  warnings: string[]
  errors: string[]
}

export interface BuildPreprocessingSourceContractParams {
  validation?: Partial<PreprocessingValidationEvidence>
  missingDataHandling?: string
  steps?: PreprocessingStepInput[]
}

const PROHIBITED_AUTO_CLAIMS: PreprocessingProhibitedClaimId[] = [
  'outlier-removal',
  'mcar',
  'mar',
  'variable-transform',
  'standardization',
  'exclusion-criteria',
]

function sanitizeText(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function sanitizeStringList(values: string[] | undefined): string[] {
  return (values ?? [])
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
}

function makeStepId(input: PreprocessingStepInput, index: number): string {
  if (input.id) return input.id
  return `${input.kind}:${input.label.toLowerCase().replace(/\s+/g, '-')}:${index}`
}

function normalizeStep(input: PreprocessingStepInput, index: number): PreprocessingStep {
  return {
    id: makeStepId(input, index),
    kind: input.kind,
    label: input.label,
    origin: input.origin,
    status: input.status ?? 'unconfirmed',
    affectedVariables: sanitizeStringList(input.affectedVariables),
    rowCountDelta: typeof input.rowCountDelta === 'number' && Number.isFinite(input.rowCountDelta)
      ? input.rowCountDelta
      : undefined,
    rationale: sanitizeText(input.rationale),
    evidence: sanitizeText(input.evidence),
  }
}

function buildWarnings(params: BuildPreprocessingSourceContractParams, steps: PreprocessingStep[]): string[] {
  const warnings: string[] = []
  const missingValues = params.validation?.missingValues

  if (typeof missingValues === 'number' && missingValues > 0 && !sanitizeText(params.missingDataHandling)) {
    warnings.push('Missing values are present but handling is not user-confirmed.')
  }

  const unconfirmedTransformSteps = steps.filter((step) =>
    (step.kind === 'variable-transform'
      || step.kind === 'standardization'
      || step.kind === 'outlier-exclusion'
      || step.kind === 'row-filter'
      || step.kind === 'imputation')
    && (step.status === 'unconfirmed' || !step.rationale),
  )

  if (unconfirmedTransformSteps.length > 0) {
    warnings.push('Preprocessing steps include transformations or exclusions without user-confirmed rationale.')
  }

  return warnings
}

export function buildPreprocessingSourceContract(
  params: BuildPreprocessingSourceContractParams,
): PreprocessingSourceContract {
  const steps = (params.steps ?? []).map((step, index) => normalizeStep(step, index))

  return {
    validation: {
      missingValues: params.validation?.missingValues,
      duplicateRows: params.validation?.duplicateRows,
      warnings: params.validation?.warnings ?? [],
      errors: params.validation?.errors ?? [],
    },
    steps,
    prohibitedAutoClaims: PROHIBITED_AUTO_CLAIMS,
    warnings: buildWarnings(params, steps),
    errors: params.validation?.errors ?? [],
  }
}

export function hasBlockingPreprocessingIssue(contract: PreprocessingSourceContract): boolean {
  return contract.errors.length > 0
}

export function hasReviewablePreprocessingGap(contract: PreprocessingSourceContract): boolean {
  return contract.warnings.length > 0
}

export function getPreprocessingSourceSummary(
  contract: PreprocessingSourceContract,
  language: 'ko' | 'en',
): string {
  const missingValues = contract.validation.missingValues
  const duplicateRows = contract.validation.duplicateRows
  const stepCount = contract.steps.length

  if (language === 'en') {
    return `Preprocessing source: ${stepCount} recorded step(s), ${missingValues ?? 'unknown'} missing value(s), ${duplicateRows ?? 'unknown'} duplicate row(s).`
  }

  return `전처리 source: 기록된 step ${stepCount}개, 결측 ${missingValues ?? '미확인'}개, 중복 행 ${duplicateRows ?? '미확인'}개`
}
