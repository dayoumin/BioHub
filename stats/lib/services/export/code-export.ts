/**
 * 재현 가능 코드 내보내기 — 진입점
 *
 * HistoryRecord → CodeTemplateInput 변환 후 메서드별 템플릿으로 코드 생성.
 * ExportService와 별도 파이프라인 (입력 구조가 다름).
 */

import type { HistoryRecord } from '@/lib/utils/storage-types'
import type { VariableMapping } from '@/lib/statistics/variable-mapping'
import type { StatisticalMethod, AnalysisOptions, AnalysisResult } from '@/types/analysis'
import type {
  CodeLanguage,
  CodeTemplateInput,
  CodeExportResult,
} from './code-template-types'
import { getCodeTemplate } from './code-templates/registry'
import { downloadBlob } from './export-data-builder'

// ─── 현재 분석 상태에서 코드 내보내기용 입력 ───

export interface CodeExportParams {
  method: StatisticalMethod | null
  variableMapping: VariableMapping | null
  analysisOptions?: AnalysisOptions | null
  dataFileName: string | null
  dataRowCount: number
  results?: Pick<AnalysisResult, 'statistic' | 'pValue' | 'effectSize' | 'assumptions' | 'postHocMethod'> | null
}

// ─── 내부 유틸 ───

/** HistoryRecord의 'two-sided' → R의 'two.sided' */
function toRAlternative(alt: string): string {
  return alt === 'two-sided' ? 'two.sided' : alt
}

/** R alternative 변환 적용 (Python은 그대로) */
function applyLanguageTransforms(
  input: CodeTemplateInput,
  language: CodeLanguage,
): CodeTemplateInput {
  if (language !== 'R') return input
  return {
    ...input,
    options: {
      ...input.options,
      // R 전용: alternative 값 변환. 타입은 넓혀둠 (템플릿에서 문자열로만 사용)
      alternative: toRAlternative(input.options.alternative),
    },
  }
}

/** 기대 결과 추출 (주석에 포함할 BioHub 결과값) */
function buildExpectedResults(
  results: { statistic?: number; pValue?: number; effectSize?: number | { value: number } } | null,
): CodeTemplateInput['expectedResults'] {
  if (!results) return undefined
  const es = results.effectSize
  const effectSize = typeof es === 'number' ? es : typeof es === 'object' && es !== null ? es.value : undefined
  return {
    statistic: typeof results.statistic === 'number' ? results.statistic : undefined,
    pValue: typeof results.pValue === 'number' ? results.pValue : undefined,
    effectSize,
  }
}

function extractEqualVariance(
  results: { assumptions?: AnalysisResult['assumptions'] } | Record<string, unknown> | null,
): boolean | undefined {
  if (!results) return undefined

  const assumptions = 'assumptions' in results ? results.assumptions : undefined
  if (!assumptions || typeof assumptions !== 'object' || Array.isArray(assumptions)) return undefined

  const homogeneity = 'homogeneity' in assumptions ? assumptions.homogeneity : undefined
  if (!homogeneity || typeof homogeneity !== 'object' || Array.isArray(homogeneity)) return undefined

  const levene = 'levene' in homogeneity ? homogeneity.levene : undefined
  if (levene && typeof levene === 'object' && !Array.isArray(levene) && 'equalVariance' in levene) {
    return typeof levene.equalVariance === 'boolean' ? levene.equalVariance : undefined
  }

  const bartlett = 'bartlett' in homogeneity ? homogeneity.bartlett : undefined
  if (bartlett && typeof bartlett === 'object' && !Array.isArray(bartlett) && 'equalVariance' in bartlett) {
    return typeof bartlett.equalVariance === 'boolean' ? bartlett.equalVariance : undefined
  }

  return undefined
}

function extractPostHocMethod(
  results: { postHocMethod?: string } | Record<string, unknown> | null,
): string | undefined {
  if (!results) return undefined
  const method = 'postHocMethod' in results ? results.postHocMethod : undefined
  return typeof method === 'string' ? method : undefined
}

// ─── 코드 헤더 ───

function buildHeader(input: CodeTemplateInput): string {
  const c = '#' // R, Python 모두 동일
  const lines = [
    `${c} ${'─'.repeat(50)}`,
    `${c} BioHub Reproducible Analysis`,
    `${c} Method: ${input.meta.methodName}`,
    `${c} Data: ${input.dataFileName} (n=${input.meta.dataRowCount})`,
    `${c} Generated: ${input.meta.generatedAt}`,
    `${c} ${'─'.repeat(50)}`,
  ]

  if (input.expectedResults?.pValue !== undefined) {
    lines.push(`${c}`, `${c} Expected results (from BioHub):`)
    if (input.expectedResults.statistic !== undefined) {
      lines.push(`${c}   statistic = ${input.expectedResults.statistic.toFixed(4)}`)
    }
    lines.push(`${c}   p-value   = ${input.expectedResults.pValue.toFixed(4)}`)
    if (input.expectedResults.effectSize !== undefined) {
      lines.push(`${c}   effect    = ${input.expectedResults.effectSize.toFixed(4)}`)
    }
  }

  return lines.join('\n')
}

// ─── 공통 파이프라인 ───

function generateAndDownload(
  methodId: string,
  methodName: string,
  rawInput: CodeTemplateInput,
  language: CodeLanguage,
): CodeExportResult {
  const template = getCodeTemplate(methodId, language)
  if (!template) {
    return {
      success: false,
      error: `${methodName}은(는) 아직 코드 내보내기를 지원하지 않습니다.`,
    }
  }

  const input = applyLanguageTransforms(rawInput, language)
  const header = buildHeader(rawInput)
  const body = template.generate(input)
  const content = `${header}\n\n${body}\n`

  const ext = language === 'R' ? 'R' : 'py'
  const baseName = rawInput.dataFileName.replace(/\.[^.]+$/, '') || 'data'
  const fileName = `${baseName}_${methodId}.${ext}`

  downloadBlob(new Blob([content], { type: 'text/plain;charset=utf-8' }), fileName)

  return { success: true, fileName, content }
}

// ─── 공개 API ───

/**
 * HistoryRecord로부터 R/Python 코드를 생성하고 다운로드.
 */
export function exportCode(
  record: HistoryRecord,
  language: CodeLanguage,
): CodeExportResult {
  const methodId = record.method?.id
  if (!methodId) {
    return { success: false, error: '분석 메서드 정보가 없습니다.' }
  }

  const options = record.analysisOptions ?? {}
  const results = record.results as Record<string, unknown> | null
  const equalVariance = extractEqualVariance(results)
  const postHocMethod = extractPostHocMethod(results) ?? (options.postHocMethod as string | undefined)

  const rawInput: CodeTemplateInput = {
    dataFileName: record.dataFileName,
    variableMapping: record.variableMapping ?? {},
    options: {
      confidenceLevel: (options.confidenceLevel as number) ?? 0.95,
      alternative: (options.alternative as string) ?? 'two-sided',
      equalVariance,
      postHocMethod,
      testValue: options.testValue as number | undefined,
    },
    expectedResults: buildExpectedResults(
      results
        ? { statistic: results.statistic as number, pValue: results.pValue as number, effectSize: results.effectSize as number }
        : null,
    ),
    meta: {
      generatedAt: new Date().toISOString().slice(0, 10),
      methodName: record.method?.name ?? 'Unknown',
      dataRowCount: record.dataRowCount,
    },
  }

  return generateAndDownload(methodId, record.method?.name ?? methodId, rawInput, language)
}

/**
 * 현재 분석 상태(스토어)에서 직접 코드 생성 + 다운로드.
 * ResultsActionStep에서 HistoryRecord 없이 사용.
 */
export function exportCodeFromAnalysis(
  params: CodeExportParams,
  language: CodeLanguage,
): CodeExportResult {
  const methodId = params.method?.id
  if (!methodId) {
    return { success: false, error: '분석 메서드 정보가 없습니다.' }
  }

  const equalVariance = extractEqualVariance(params.results ?? null)
  const postHocMethod = extractPostHocMethod(params.results ?? null)

  const rawInput: CodeTemplateInput = {
    dataFileName: params.dataFileName ?? 'data.csv',
    variableMapping: params.variableMapping ?? {},
    options: {
      confidenceLevel: 1 - (params.analysisOptions?.alpha ?? 0.05),
      alternative: 'two-sided',
      equalVariance,
      postHocMethod,
      testValue: params.analysisOptions?.testValue,
    },
    expectedResults: buildExpectedResults(params.results ?? null),
    meta: {
      generatedAt: new Date().toISOString().slice(0, 10),
      methodName: params.method?.name ?? 'Unknown',
      dataRowCount: params.dataRowCount,
    },
  }

  return generateAndDownload(methodId, params.method?.name ?? methodId, rawInput, language)
}

/**
 * 코드 내보내기 가능 여부 확인.
 * ExportDropdown에서 메뉴 활성화 판단에 사용.
 */
export function isCodeExportAvailable(methodId: string | undefined): boolean {
  if (!methodId) return false
  return getCodeTemplate(methodId, 'R') !== null
}
