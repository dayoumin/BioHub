import type { ExportContext } from '@/lib/services/export/export-types'
import type { VariableMapping } from '@/lib/statistics/variable-mapping'
import type { ValidationResults } from '@/types/analysis'
import type { DraftContext, PaperDraft, PaperDraftOptions } from './paper-types'
import type { StudySchema } from './study-schema'
import { generatePaperDraft } from './paper-draft-service'
import {
  buildStudySchema,
  buildStudySchemaSourceFingerprint,
  isStudySchemaCompatible,
} from './study-schema'

export interface AnalysisPaperDraftSchemaOptions {
  variableMapping?: VariableMapping | null
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
  studySchema?: StudySchema
}

export function isReusableAnalysisStudySchema(
  exportCtx: ExportContext,
  draftCtx: DraftContext,
  methodId: string,
  options: PaperDraftOptions,
  schemaOptions: AnalysisPaperDraftSchemaOptions,
): boolean {
  if (!schemaOptions.studySchema) return false

  const sourceFingerprint = buildStudySchemaSourceFingerprint({
    exportContext: exportCtx,
    draftContext: draftCtx,
    methodId,
    variableMapping: schemaOptions.variableMapping ?? null,
    validationResults: schemaOptions.validationResults,
    analysisOptions: schemaOptions.analysisOptions,
    researchQuestion: schemaOptions.researchQuestion,
    hypothesis: schemaOptions.hypothesis,
    dataDescription: schemaOptions.dataDescription,
    analysisRationale: schemaOptions.analysisRationale,
    missingDataHandling: schemaOptions.missingDataHandling,
    assumptionDecision: schemaOptions.assumptionDecision,
    language: options.language,
  })

  return isStudySchemaCompatible(schemaOptions.studySchema, {
    methodId,
    historyId: schemaOptions.historyId,
    projectId: schemaOptions.projectId,
    fileName: exportCtx.dataInfo?.fileName,
    sourceFingerprint,
  })
}

/**
 * Analysis result-panel entry point.
 * Use document-writing adapters/writers for DocumentBlueprint drafting paths.
 */
export function generateAnalysisPaperDraft(
  exportCtx: ExportContext,
  draftCtx: DraftContext,
  methodId: string,
  options: PaperDraftOptions,
  schemaOptions: AnalysisPaperDraftSchemaOptions = {},
): PaperDraft {
  const reusableSchema = isReusableAnalysisStudySchema(
    exportCtx,
    draftCtx,
    methodId,
    options,
    schemaOptions,
  ) ? schemaOptions.studySchema : undefined

  const studySchema = reusableSchema
    ?? buildStudySchema({
      exportContext: exportCtx,
      draftContext: draftCtx,
      methodId,
      variableMapping: schemaOptions.variableMapping ?? null,
      validationResults: schemaOptions.validationResults,
      analysisOptions: schemaOptions.analysisOptions,
      title: schemaOptions.title,
      projectId: schemaOptions.projectId,
      historyId: schemaOptions.historyId,
      researchQuestion: schemaOptions.researchQuestion,
      hypothesis: schemaOptions.hypothesis,
      dataDescription: schemaOptions.dataDescription,
      analysisRationale: schemaOptions.analysisRationale,
      missingDataHandling: schemaOptions.missingDataHandling,
      assumptionDecision: schemaOptions.assumptionDecision,
      language: options.language,
    })

  return generatePaperDraft(exportCtx, draftCtx, methodId, options, studySchema)
}
