/**
 * 논문 초안 생성 서비스 (템플릿 기반 즉시 생성)
 *
 * Methods/Results/Captions: 한글 + 영문 템플릿 (APA 7th 형식)
 * Discussion: null (외부 AI 영역 — BioHub에서 생성하지 않음)
 */

import { STATISTICAL_METHODS } from '@/lib/constants/statistical-methods'
import type { ExportContext } from '@/lib/services/export/export-types'
import { groupAssumptions } from '@/lib/services/export/assumption-utils'
import { getTemplate } from './paper-templates'
import type {
  PaperDraft,
  PaperDraftOptions,
  DraftContext,
} from './paper-types'
import { generatePaperTables } from './paper-tables'
import {
  buildDraftContextFromStudySchema,
  buildStudySchema,
  type StudySchema,
} from './study-schema'
import { buildMethodsDraftReadiness } from './methods-readiness'
import { buildResultsDraftReadiness } from './results-readiness'
import { buildCaptionsDraftReadiness } from './captions-readiness'

function assertSchemaMatchesExportContext(
  exportCtx: ExportContext,
  schema: StudySchema,
  language: 'ko' | 'en',
): void {
  const result = exportCtx.analysisResult
  const dataInfo = exportCtx.dataInfo
  const postHocCount = result.postHoc?.length ?? 0
  const coefficientCount = result.coefficients?.length ?? 0
  const groupStatCount = result.groupStats?.length ?? 0
  const resultMethodName = result.displayMethodName ?? result.method
  const currentVariables = dataInfo?.variables ?? []

  if (schema.language !== language) {
    throw new Error('StudySchema 언어와 요청 언어가 일치하지 않아 논문 초안을 생성할 수 없습니다.')
  }

  if (
    result.canonicalMethodId
    && schema.analysis.canonicalMethodId
    && schema.analysis.canonicalMethodId !== result.canonicalMethodId
  ) {
    throw new Error('StudySchema와 현재 분석 방법이 일치하지 않아 논문 초안을 생성할 수 없습니다.')
  }

  if (schema.analysis.methodName !== resultMethodName) {
    throw new Error('StudySchema와 현재 분석 방법이 일치하지 않아 논문 초안을 생성할 수 없습니다.')
  }

  if (
    schema.source.fileName !== (dataInfo?.fileName ?? null)
    || schema.source.rowCount !== dataInfo?.totalRows
    || schema.source.columnCount !== dataInfo?.columnCount
    || schema.source.variables.length !== currentVariables.length
    || schema.source.variables.some((variable, index) => variable !== currentVariables[index])
  ) {
    throw new Error('StudySchema와 현재 데이터 소스가 일치하지 않아 논문 초안을 생성할 수 없습니다.')
  }

  if (
    !Object.is(schema.analysis.statistic, result.statistic)
    || !Object.is(schema.analysis.pValue, result.pValue)
    || schema.analysis.postHocCount !== postHocCount
    || schema.analysis.coefficientCount !== coefficientCount
    || schema.analysis.groupStatCount !== groupStatCount
  ) {
    throw new Error('StudySchema와 현재 분석 결과가 일치하지 않아 논문 초안을 생성할 수 없습니다.')
  }
}

export function generatePaperDraftFromSchema(
  exportCtx: ExportContext,
  studySchema: StudySchema,
  options: PaperDraftOptions,
  draftCtx?: DraftContext,
): PaperDraft {
  const { analysisResult: r } = exportCtx
  const lang = options.language
  const generatedAt = new Date().toISOString()
  const resolvedSchema = studySchema
  assertSchemaMatchesExportContext(exportCtx, resolvedSchema, lang)
  const resolvedDraftCtx = draftCtx ?? buildDraftContextFromStudySchema(resolvedSchema)
  const postHocDisplay = options.postHocDisplay ?? 'significant-only'

  const tables = generatePaperTables(
    r,
    resolvedDraftCtx,
    lang,
    postHocDisplay,
  )

  const methodId = resolvedSchema.analysis.methodId
  const category = STATISTICAL_METHODS[methodId]?.category ?? 'other'
  const assumptions = resolvedSchema.assumptions
  const grouped = groupAssumptions(assumptions)
  const template = getTemplate(methodId, category)
  const methodsReadiness = buildMethodsDraftReadiness(resolvedSchema, lang)
  const resultsReadiness = buildResultsDraftReadiness(resolvedSchema, lang)
  const input = {
    r,
    assumptions,
    grouped,
    ctx: resolvedDraftCtx,
    lang,
    methodId,
    options,
    schema: resolvedSchema,
  }
  const candidateCaptions = template.captions(input)
  const captionsReadiness = buildCaptionsDraftReadiness(resolvedSchema, {
    tableCount: tables.length,
    figureCount: candidateCaptions.filter((caption) => caption.kind === 'figure').length,
    hasFigureSource: Boolean(r.visualizationData?.type),
  }, lang)

  return {
    methods: methodsReadiness.canGenerateDraft ? template.methods(input) : null,
    results: resultsReadiness.canGenerateDraft ? template.results(input) : null,
    captions: captionsReadiness.canGenerateDraft ? candidateCaptions : null,
    discussion: null,  // Phase B: LLM 생성
    tables,
    language: lang,
    postHocDisplay,
    generatedAt,
    model: null,
    context: resolvedDraftCtx,
    studySchema: resolvedSchema,
    methodsReadiness,
    resultsReadiness,
    captionsReadiness,
  }
}

/**
 * 논문 초안 생성 (Methods + Results + Captions 즉시 생성, Discussion = null)
 *
 * @deprecated 제품 경로에서는 `generateAnalysisPaperDraft()` 또는
 * `generatePaperDraftFromSchema()`를 사용한다. 이 함수는 기존 테스트/호환을
 * 위한 저수준 adapter로만 유지한다.
 *
 * @param exportCtx  - 분석 결과 번들 (ResultsActionStep에서 전달)
 * @param draftCtx   - 사용자 확인 컨텍스트 (변수명/단위/집단명 등)
 * @param methodId   - 선택된 분석 메서드 ID (selectedMethod.id)
 * @param options    - 언어, 섹션, 사후검정 표시 옵션
 */
export function generatePaperDraft(
  exportCtx: ExportContext,
  draftCtx: DraftContext,
  methodId: string,
  options: PaperDraftOptions,
  studySchema?: StudySchema,
): PaperDraft {
  const schema = studySchema ?? buildStudySchema({
    exportContext: exportCtx,
    draftContext: draftCtx,
    methodId,
    variableMapping: null,
    language: options.language,
  })

  return generatePaperDraftFromSchema(exportCtx, schema, options, draftCtx)
}
