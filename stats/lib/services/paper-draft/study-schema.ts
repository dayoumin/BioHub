import { flattenAssumptions } from '@/lib/services/export/assumption-utils'
import type { ExportContext } from '@/lib/services/export/export-types'
import type { VariableMapping } from '@/lib/statistics/variable-mapping'
import type { ValidationResults } from '@/types/analysis'
import type { PaperSection, DraftContext, FlatAssumption } from './paper-types'
import { getMethodsAutomationScope } from './methods-scope'
import {
  buildMaterialsSourceContract,
  hasUnsafeSpeciesSource,
  type MaterialsSamplingContext,
  type MaterialsSourceContract,
  type MaterialsSourceInput,
} from './materials-source-contract'
import {
  buildPreprocessingSourceContract,
  type PreprocessingSourceContract,
  type PreprocessingStepInput,
} from './preprocessing-source-contract'

export type StudySchemaVariableRole =
  | 'independent'
  | 'dependent'
  | 'group'
  | 'time'
  | 'variable'
  | 'covariate'
  | 'within'
  | 'between'
  | 'blocking'
  | 'event'
  | 'censoring'
  | 'weight'
  | 'display'

export interface StudySchemaVariable {
  columnKey: string
  label: string
  unit?: string
  roles: StudySchemaVariableRole[]
}

export interface StudySchemaGroup {
  key: string
  label: string
}

export interface StudySchemaEffectSize {
  value: number
  type?: string
  interpretation?: string
}

export interface StudySchemaConfidenceInterval {
  lower: number
  upper: number
  estimate?: number
  level?: number
}

export interface StudySchemaAnalysisOption {
  key: string
  value: string | number | boolean
}

export interface StudySchemaIssue {
  code:
    | 'missingResearchQuestion'
    | 'missingHypothesis'
    | 'missingVariableDefinitions'
    | 'missingEffectSize'
    | 'missingConfidenceInterval'
    | 'missingAssumptionChecks'
    | 'missingPostHocMethod'
    | 'validationWarningsPresent'
    | 'validationErrorsPresent'
    | 'unverifiedSpeciesSource'
  severity: 'warning' | 'blocking'
  section: PaperSection | 'schema'
  message: string
}

export interface StudySchemaReadiness {
  methods: boolean
  results: boolean
  captions: boolean
}

export interface StudySchema {
  version: 1
  generatedAt: string
  language: 'ko' | 'en'
  study: {
    title?: string
    researchQuestion?: string
    hypothesis?: string
    context?: string
    dataDescription?: string
    analysisRationale?: string
    missingDataHandling?: string
    assumptionDecision?: string
  }
  source: {
    historyId?: string
    projectId?: string
    fileName?: string | null
    rowCount?: number
    columnCount?: number
    variables: string[]
    missingValues?: number
    duplicateRows?: number
    warnings: string[]
    errors: string[]
    sourceFingerprint: string
  }
  variables: StudySchemaVariable[]
  groups: StudySchemaGroup[]
  materials: MaterialsSourceContract
  preprocessing: PreprocessingSourceContract
  assumptions: FlatAssumption[]
  analysis: {
    methodId: string
    methodName: string
    canonicalMethodId?: string
    displayMethodName?: string
    executionVariant?: string
    testVariant?: string
    statistic: number
    statisticName?: string
    pValue: number
    df?: number | [number, number]
    effectSize?: StudySchemaEffectSize
    omegaSquared?: StudySchemaEffectSize
    confidenceInterval?: StudySchemaConfidenceInterval
    postHocMethod?: string
    postHocCount: number
    coefficientCount: number
    groupStatCount: number
    options: StudySchemaAnalysisOption[]
  }
  reporting: {
    apaFormat?: string | null
    aiInterpretation?: string | null
    dependentVariableLabel?: string
  }
  issues: StudySchemaIssue[]
  readiness: StudySchemaReadiness
}

export interface BuildStudySchemaParams {
  exportContext: ExportContext
  draftContext: DraftContext
  methodId: string
  variableMapping: VariableMapping | null
  validationResults?: ValidationResults | null
  analysisOptions?: Record<string, unknown> | null
  title?: string
  projectId?: string
  historyId?: string
  researchQuestion?: string
  hypothesis?: string
  dataDescription?: string
  analysisRationale?: string
  missingDataHandling?: string
  assumptionDecision?: string
  materialSources?: MaterialsSourceInput[]
  sampling?: Partial<MaterialsSamplingContext>
  preprocessingSteps?: PreprocessingStepInput[]
  language?: 'ko' | 'en'
}

type FingerprintValue =
  | string
  | number
  | boolean
  | null
  | FingerprintValue[]
  | { [key: string]: FingerprintValue }

const VARIABLE_ROLE_SOURCES: ReadonlyArray<{
  role: StudySchemaVariableRole
  key: keyof VariableMapping
}> = [
  { role: 'independent', key: 'independentVar' },
  { role: 'dependent', key: 'dependentVar' },
  { role: 'group', key: 'groupVar' },
  { role: 'time', key: 'timeVar' },
  { role: 'variable', key: 'variables' },
  { role: 'covariate', key: 'covariate' },
  { role: 'within', key: 'within' },
  { role: 'between', key: 'between' },
  { role: 'blocking', key: 'blocking' },
  { role: 'event', key: 'event' },
  { role: 'censoring', key: 'censoring' },
  { role: 'weight', key: 'weight' },
] as const

function toStringArray(value: string | string[] | undefined): string[] {
  if (!value) return []
  return Array.isArray(value) ? value.filter((entry) => entry.length > 0) : [value]
}

function normalizeEffectSize(
  value: unknown
): StudySchemaEffectSize | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { value }
  }
  if (typeof value !== 'object' || value === null) return undefined

  const record = value as Record<string, unknown>
  const rawValue = record['value']
  if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) return undefined

  const type = typeof record['type'] === 'string' ? record['type'] : undefined
  const interpretation = typeof record['interpretation'] === 'string'
    ? record['interpretation']
    : undefined

  return {
    value: rawValue,
    type,
    interpretation,
  }
}

function normalizeFingerprintValue(value: unknown): FingerprintValue {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeFingerprintValue(entry))
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    return Object.keys(record)
      .sort()
      .reduce<{ [key: string]: FingerprintValue }>((acc, key) => {
        acc[key] = normalizeFingerprintValue(record[key])
        return acc
      }, {})
  }

  return null
}

function hashStableString(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function buildStudySchemaSourceFingerprint({
  exportContext,
  draftContext,
  methodId,
  variableMapping,
  validationResults,
  analysisOptions,
  researchQuestion,
  hypothesis,
  dataDescription,
  analysisRationale,
  missingDataHandling,
  assumptionDecision,
  materialSources,
  sampling,
  preprocessingSteps,
  language,
}: Pick<
  BuildStudySchemaParams,
  | 'exportContext'
  | 'draftContext'
  | 'methodId'
  | 'variableMapping'
  | 'validationResults'
  | 'analysisOptions'
  | 'researchQuestion'
  | 'hypothesis'
  | 'dataDescription'
  | 'analysisRationale'
  | 'missingDataHandling'
  | 'assumptionDecision'
  | 'materialSources'
  | 'sampling'
  | 'preprocessingSteps'
  | 'language'
>): string {
  const result = exportContext.analysisResult
  const fingerprintPayload = normalizeFingerprintValue({
    methodId,
    language: language ?? 'ko',
    draftContext,
    variableMapping,
    analysisOptions,
    researchQuestion,
    hypothesis,
    dataDescription,
    analysisRationale,
    missingDataHandling,
    assumptionDecision,
    validation: validationResults
      ? {
          missingValues: validationResults.missingValues,
          duplicateRows: validationResults.duplicateRows,
          warnings: validationResults.warnings,
          errors: validationResults.errors,
        }
      : null,
    dataInfo: exportContext.dataInfo
      ? {
          fileName: exportContext.dataInfo.fileName,
          totalRows: exportContext.dataInfo.totalRows,
          columnCount: exportContext.dataInfo.columnCount,
          variables: exportContext.dataInfo.variables,
        }
      : null,
    materials: {
      materialSources,
      sampling,
    },
    preprocessing: {
      preprocessingSteps,
    },
    result: {
      method: result.method,
      canonicalMethodId: result.canonicalMethodId,
      displayMethodName: result.displayMethodName,
      executionVariant: result.executionVariant,
      testVariant: result.testVariant,
      statistic: result.statistic,
      statisticName: result.statisticName,
      pValue: result.pValue,
      df: result.df,
      effectSize: result.effectSize,
      omegaSquared: result.omegaSquared,
      confidence: result.confidence,
      postHocMethod: result.postHocMethod,
      postHoc: result.postHoc,
      coefficients: result.coefficients,
      groupStats: result.groupStats,
      apaFormat: exportContext.apaFormat,
      aiInterpretation: exportContext.aiInterpretation,
    },
  })

  return `v1:${hashStableString(JSON.stringify(fingerprintPayload))}`
}

function buildVariables(
  variableMapping: VariableMapping | null,
  draftContext: DraftContext
): StudySchemaVariable[] {
  const byColumn = new Map<string, StudySchemaVariable>()

  for (const columnKey of Object.keys(draftContext.variableLabels)) {
    byColumn.set(columnKey, {
      columnKey,
      label: draftContext.variableLabels[columnKey] ?? columnKey,
      unit: draftContext.variableUnits[columnKey] || undefined,
      roles: ['display'],
    })
  }

  for (const source of VARIABLE_ROLE_SOURCES) {
    const raw = variableMapping?.[source.key]
    if (typeof raw !== 'string' && !Array.isArray(raw)) continue

    for (const columnKey of toStringArray(raw)) {
      const existing = byColumn.get(columnKey)
      if (existing) {
        if (existing.roles.includes('display')) {
          existing.roles = existing.roles.filter((role) => role !== 'display')
        }
        if (!existing.roles.includes(source.role)) {
          existing.roles.push(source.role)
        }
        continue
      }

      byColumn.set(columnKey, {
        columnKey,
        label: draftContext.variableLabels[columnKey] ?? columnKey,
        unit: draftContext.variableUnits[columnKey] || undefined,
        roles: [source.role],
      })
    }
  }

  return Array.from(byColumn.values())
}

function buildGroups(
  exportContext: ExportContext,
  draftContext: DraftContext
): StudySchemaGroup[] {
  const groupKeys = (exportContext.analysisResult.groupStats ?? [])
    .map((groupStat) => groupStat.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0)

  return Array.from(new Set(groupKeys)).map((key) => ({
    key,
    label: draftContext.groupLabels[key] ?? key,
  }))
}

function buildOptions(
  analysisOptions: Record<string, unknown> | null | undefined
): StudySchemaAnalysisOption[] {
  if (!analysisOptions) return []

  const entries: StudySchemaAnalysisOption[] = []
  for (const [key, value] of Object.entries(analysisOptions)) {
    if (
      typeof value === 'string'
      || typeof value === 'number'
      || typeof value === 'boolean'
    ) {
      entries.push({ key, value })
    }
  }
  return entries
}

function buildIssues(schema: Omit<StudySchema, 'issues' | 'readiness'>): StudySchemaIssue[] {
  const issues: StudySchemaIssue[] = []
  const methodsScope = getMethodsAutomationScope(schema.analysis.methodId, schema.language)

  if (!schema.study.researchQuestion) {
    issues.push({
      code: 'missingResearchQuestion',
      severity: 'warning',
      section: 'schema',
      message: '연구 질문이 비어 있습니다. Introduction/Abstract 자동화 품질이 떨어질 수 있습니다.',
    })
  }

  if (!schema.study.hypothesis) {
    issues.push({
      code: 'missingHypothesis',
      severity: 'warning',
      section: 'schema',
      message: '가설이 비어 있습니다. Results와 Discussion 연결 문장이 약해질 수 있습니다.',
    })
  }

  if (
    methodsScope.blockedWhen.includes('missing-variable-roles')
    && !schema.variables.some((variable) => variable.roles.some((role) => role !== 'display'))
  ) {
    issues.push({
      code: 'missingVariableDefinitions',
      severity: 'blocking',
      section: 'methods',
      message: '변수 정의가 없어 Methods 초안을 안정적으로 생성할 수 없습니다.',
    })
  }

  if (!schema.analysis.effectSize) {
    issues.push({
      code: 'missingEffectSize',
      severity: 'warning',
      section: 'results',
      message: '효과크기 정보가 없어 Results 서술이 축약될 수 있습니다.',
    })
  }

  if (!schema.analysis.confidenceInterval) {
    issues.push({
      code: 'missingConfidenceInterval',
      severity: 'warning',
      section: 'results',
      message: '신뢰구간 정보가 없어 Results와 figure caption 정보량이 제한됩니다.',
    })
  }

  if (schema.assumptions.length === 0) {
    issues.push({
      code: 'missingAssumptionChecks',
      severity: 'warning',
      section: 'methods',
      message: '가정 검정 정보가 없어 검증 가능한 Methods/Limitations 연결이 약해집니다.',
    })
  }

  if (
    methodsScope.blockedWhen.includes('missing-post-hoc-method')
    && schema.analysis.postHocCount > 0
    && !schema.analysis.postHocMethod
  ) {
    issues.push({
      code: 'missingPostHocMethod',
      severity: 'blocking',
      section: 'schema',
      message: '사후검정 결과가 있지만 보정 방법이 없어 Methods/Results 문장을 고정하기 어렵습니다.',
    })
  }

  if (schema.source.warnings.length > 0) {
    issues.push({
      code: 'validationWarningsPresent',
      severity: 'warning',
      section: 'schema',
      message: '데이터 검증 경고가 남아 있습니다. 자동 생성 문장에 주의 문구를 포함해야 합니다.',
    })
  }

  if (schema.source.errors.length > 0) {
    issues.push({
      code: 'validationErrorsPresent',
      severity: 'blocking',
      section: 'methods',
      message: '데이터 검증 오류가 남아 있어 Methods 초안을 생성할 수 없습니다.',
    })
  }

  if (hasUnsafeSpeciesSource(schema.materials)) {
    issues.push({
      code: 'unverifiedSpeciesSource',
      severity: 'blocking',
      section: 'methods',
      message: '검증되지 않은 species source가 있어 Materials/Samples 문장을 확정할 수 없습니다.',
    })
  }

  return issues
}

export function isStudySchemaCompatible(
  schema: StudySchema,
  params: {
    methodId: string
    historyId?: string
    projectId?: string
    fileName?: string | null
    sourceFingerprint?: string
  },
): boolean {
  if (schema.analysis.methodId !== params.methodId) return false
  if (params.historyId && schema.source.historyId && schema.source.historyId !== params.historyId) return false
  if (params.projectId && schema.source.projectId && schema.source.projectId !== params.projectId) return false
  if (params.fileName !== undefined && schema.source.fileName !== undefined && schema.source.fileName !== params.fileName) {
    return false
  }
  if (params.sourceFingerprint && schema.source.sourceFingerprint !== params.sourceFingerprint) {
    return false
  }
  return true
}

function buildReadiness(issues: StudySchemaIssue[]): StudySchemaReadiness {
  const blockingSections = new Set(
    issues
      .filter((issue) => issue.severity === 'blocking')
      .map((issue) => issue.section)
  )

  const methodsReady = !blockingSections.has('methods') && !blockingSections.has('schema')
  const resultsReady = !blockingSections.has('results') && !blockingSections.has('schema')

  return {
    methods: methodsReady,
    results: resultsReady,
    captions: resultsReady && !blockingSections.has('captions'),
  }
}

export function buildStudySchema({
  exportContext,
  draftContext,
  methodId,
  variableMapping,
  validationResults,
  analysisOptions,
  title,
  projectId,
  historyId,
  researchQuestion,
  hypothesis,
  dataDescription,
  analysisRationale,
  missingDataHandling,
  assumptionDecision,
  materialSources,
  sampling,
  preprocessingSteps,
  language,
}: BuildStudySchemaParams): StudySchema {
  const result = exportContext.analysisResult
  const variables = buildVariables(variableMapping, draftContext)
  const assumptions = flattenAssumptions(result.assumptions)
  const sourceFingerprint = buildStudySchemaSourceFingerprint({
    exportContext,
    draftContext,
    methodId,
    variableMapping,
    validationResults,
    analysisOptions,
    researchQuestion,
    hypothesis,
    dataDescription,
    analysisRationale,
    missingDataHandling,
    assumptionDecision,
    materialSources,
    sampling,
    preprocessingSteps,
    language,
  })
  const materials = buildMaterialsSourceContract({
    dataFileName: exportContext.dataInfo?.fileName ?? null,
    rowCount: exportContext.dataInfo?.totalRows,
    variables: exportContext.dataInfo?.variables ?? [],
    dataDescription,
    materialSources,
    sampling,
  })
  const preprocessing = buildPreprocessingSourceContract({
    validation: {
      missingValues: validationResults?.missingValues,
      duplicateRows: validationResults?.duplicateRows,
      warnings: validationResults?.warnings ?? [],
      errors: validationResults?.errors ?? [],
    },
    missingDataHandling,
    steps: preprocessingSteps,
  })
  const schemaWithoutIssues = {
    version: 1 as const,
    generatedAt: new Date().toISOString(),
    language: language ?? 'ko',
    study: {
      title,
      researchQuestion,
      hypothesis,
      context: draftContext.researchContext,
      dataDescription,
      analysisRationale,
      missingDataHandling,
      assumptionDecision,
    },
    source: {
      historyId,
      projectId,
      fileName: exportContext.dataInfo?.fileName ?? null,
      rowCount: exportContext.dataInfo?.totalRows,
      columnCount: exportContext.dataInfo?.columnCount,
      variables: exportContext.dataInfo?.variables ?? [],
      missingValues: validationResults?.missingValues,
      duplicateRows: validationResults?.duplicateRows,
      warnings: validationResults?.warnings ?? [],
      errors: validationResults?.errors ?? [],
      sourceFingerprint,
    },
    variables,
    groups: buildGroups(exportContext, draftContext),
    materials,
    preprocessing,
    assumptions,
    analysis: {
      methodId,
      methodName: result.displayMethodName ?? result.method,
      canonicalMethodId: result.canonicalMethodId,
      displayMethodName: result.displayMethodName,
      executionVariant: result.executionVariant,
      testVariant: result.testVariant,
      statistic: result.statistic,
      statisticName: result.statisticName,
      pValue: result.pValue,
      df: result.df,
      effectSize: normalizeEffectSize(result.effectSize ?? result.additional?.effectSize),
      omegaSquared: normalizeEffectSize(result.omegaSquared),
      confidenceInterval: result.confidence
        ? {
            lower: result.confidence.lower,
            upper: result.confidence.upper,
            estimate: result.confidence.estimate,
            level: result.confidence.level,
          }
        : undefined,
      postHocMethod: result.postHocMethod,
      postHocCount: result.postHoc?.length ?? 0,
      coefficientCount: result.coefficients?.length ?? 0,
      groupStatCount: result.groupStats?.length ?? 0,
      options: buildOptions(analysisOptions),
    },
    reporting: {
      apaFormat: exportContext.apaFormat,
      aiInterpretation: exportContext.aiInterpretation,
      dependentVariableLabel: draftContext.dependentVariable,
    },
  }

  const issues = buildIssues(schemaWithoutIssues)

  return {
    ...schemaWithoutIssues,
    issues,
    readiness: buildReadiness(issues),
  }
}

export function collectStudySchemaIssues(schema: Omit<StudySchema, 'issues' | 'readiness'>): StudySchemaIssue[] {
  return buildIssues(schema)
}

export function buildDraftContextFromStudySchema(schema: StudySchema): DraftContext {
  const variableLabels = Object.fromEntries(
    schema.variables.map((variable) => [variable.columnKey, variable.label])
  )
  const variableUnits = Object.fromEntries(
    schema.variables
      .filter((variable) => typeof variable.unit === 'string' && variable.unit.length > 0)
      .map((variable) => [variable.columnKey, variable.unit as string])
  )
  const groupLabels = Object.fromEntries(
    schema.groups.map((group) => [group.key, group.label])
  )
  const dependentVariable = schema.reporting.dependentVariableLabel
    ?? schema.variables.find((variable) => variable.roles.includes('dependent'))?.label

  return {
    variableLabels,
    variableUnits,
    groupLabels,
    dependentVariable,
    researchContext: schema.study.context,
  }
}
