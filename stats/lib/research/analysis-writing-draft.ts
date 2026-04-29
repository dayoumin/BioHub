import type { AnalysisResult } from '@/types/analysis'
import type { VariableMapping } from '@/lib/statistics/variable-mapping'
import type { HistoryRecord } from '@/lib/utils/storage-types'
import { convertToStatisticalResult } from '@/lib/statistics/result-converter'
import { generateAnalysisPaperDraft } from '@/lib/services/paper-draft/analysis-paper-draft'
import type { DraftContext, PaperDraft } from '@/lib/services/paper-draft/paper-types'
import {
  buildStudySchemaSourceFingerprint,
  isStudySchemaCompatible,
} from '@/lib/services/paper-draft/study-schema'

function collectMappedVariables(variableMapping: VariableMapping | null | undefined): string[] {
  const variables = new Set<string>()
  const addValue = (value: string | string[] | undefined): void => {
    if (!value) {
      return
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item) {
          variables.add(item)
        }
      }
      return
    }
    variables.add(value)
  }

  addValue(variableMapping?.dependentVar)
  addValue(variableMapping?.independentVar)
  addValue(variableMapping?.variables)
  addValue(variableMapping?.covariate)
  addValue(variableMapping?.within)
  addValue(variableMapping?.between)
  addValue(variableMapping?.groupVar)
  addValue(variableMapping?.timeVar)

  return Array.from(variables)
}

function getDependentVariable(variableMapping: VariableMapping | null | undefined): string | undefined {
  if (!variableMapping?.dependentVar) {
    return undefined
  }
  return Array.isArray(variableMapping.dependentVar)
    ? variableMapping.dependentVar[0]
    : variableMapping.dependentVar
}

export function buildAnalysisWritingDraftContext(
  record: HistoryRecord,
  analysisResult: AnalysisResult,
): DraftContext {
  const variableMapping = record.variableMapping ?? null
  const mappedVariables = collectMappedVariables(variableMapping)
  const variableLabels = Object.fromEntries(mappedVariables.map((variableName) => [variableName, variableName]))
  const groupLabels = Object.fromEntries(
    (analysisResult.groupStats ?? [])
      .map((groupStat) => groupStat.name ?? '')
      .filter((groupName): groupName is string => groupName.length > 0)
      .map((groupName) => [groupName, groupName]),
  )
  const dependentVariable = getDependentVariable(variableMapping)

  return {
    variableLabels,
    variableUnits: {},
    groupLabels,
    dependentVariable: dependentVariable ? variableLabels[dependentVariable] ?? dependentVariable : undefined,
    researchContext: record.analysisPurpose ?? record.purpose ?? undefined,
  }
}

export function buildAnalysisWritingDraftFromHistory(
  record: HistoryRecord,
  language: 'ko' | 'en',
): PaperDraft {
  const analysisResult = record.results as AnalysisResult | null
  if (!analysisResult || !record.method?.id) {
    throw new Error(`분석 ${record.id}의 초안 생성 입력이 부족합니다.`)
  }

  const mappedVariables = collectMappedVariables(record.variableMapping ?? null)
  const statisticalResult = convertToStatisticalResult(analysisResult, {
    sampleSize: record.dataRowCount,
    groups: analysisResult.groupStats?.length,
    variables: mappedVariables.length > 0 ? mappedVariables : undefined,
    timestamp: new Date(record.timestamp),
  })

  const exportContext = {
    analysisResult,
    statisticalResult,
    aiInterpretation: record.aiInterpretation ?? null,
    apaFormat: record.apaFormat ?? null,
    exportOptions: {
      includeInterpretation: false,
      includeRawData: false,
      includeMethodology: false,
      includeReferences: false,
      language,
    },
    dataInfo: {
      fileName: record.dataFileName,
      totalRows: record.dataRowCount,
      columnCount: record.columnInfo?.length ?? mappedVariables.length,
      variables: record.columnInfo?.map((column) => column.name) ?? mappedVariables,
    },
    rawDataRows: null,
  }
  const cachedDraft = record.paperDraft
  const draftContext = cachedDraft?.context ?? buildAnalysisWritingDraftContext(record, analysisResult)

  if (cachedDraft?.studySchema && cachedDraft.language === language) {
    const sourceFingerprint = buildStudySchemaSourceFingerprint({
      exportContext,
      draftContext,
      methodId: record.method.id,
      variableMapping: record.variableMapping ?? null,
      analysisOptions: record.analysisOptions,
      language,
    })

    if (isStudySchemaCompatible(cachedDraft.studySchema, {
      methodId: record.method.id,
      historyId: record.id,
      projectId: record.projectId,
      fileName: record.dataFileName,
      sourceFingerprint,
    })) {
      return cachedDraft
    }
  }

  return generateAnalysisPaperDraft(
    exportContext,
    draftContext,
    record.method.id,
    {
      language,
      postHocDisplay: 'significant-only',
    },
    {
      variableMapping: record.variableMapping ?? null,
      analysisOptions: record.analysisOptions,
      projectId: record.projectId,
      historyId: record.id,
      dataDescription: record.dataFileName,
      studySchema: record.paperDraft?.studySchema,
    },
  )
}

export function safelyBuildAnalysisWritingDraftFromHistory(
  record: HistoryRecord,
  language: 'ko' | 'en',
): PaperDraft | null {
  try {
    return buildAnalysisWritingDraftFromHistory(record, language)
  } catch (error) {
    console.warn('[document-writing] skipped invalid analysis source:', record.id, error)
    return null
  }
}
