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
  results?: Pick<AnalysisResult, 'statistic' | 'pValue' | 'effectSize' | 'assumptions' | 'postHocMethod' | 'testVariant'> | null
}

// ─── 내부 유틸 ───

/** alternative 허용 값 화이트리스트 */
const VALID_ALTERNATIVES = new Set(['two-sided', 'two.sided', 'less', 'greater'])

/** 안전한 alternative 값 반환 (화이트리스트 외 → 'two-sided') */
function sanitizeAlternative(alt: string): string {
  return VALID_ALTERNATIVES.has(alt) ? alt : 'two-sided'
}

/** HistoryRecord의 'two-sided' → R의 'two.sided' */
function toRAlternative(alt: string): string {
  return alt === 'two-sided' ? 'two.sided' : alt
}

/** R alternative 변환 적용 (Python은 그대로) + alternative 화이트리스트 검증 */
function applyLanguageTransforms(
  input: CodeTemplateInput,
  language: CodeLanguage,
): CodeTemplateInput {
  const sanitized = sanitizeAlternative(input.options.alternative)
  const alternative = language === 'R' ? toRAlternative(sanitized) : sanitized
  return {
    ...input,
    options: {
      ...input.options,
      alternative,
    },
  }
}

/** effectSize가 number 또는 { value: number } 형태일 수 있음 */
function extractNumericEffectSize(es: unknown): number | undefined {
  if (typeof es === 'number') return es
  if (typeof es === 'object' && es !== null && 'value' in es) {
    const v = (es as { value: unknown }).value
    return typeof v === 'number' ? v : undefined
  }
  return undefined
}

/** 기대 결과 추출 (주석에 포함할 BioHub 결과값) */
function buildExpectedResults(
  results: { statistic?: unknown; pValue?: unknown; effectSize?: unknown } | null,
): CodeTemplateInput['expectedResults'] {
  if (!results) return undefined
  return {
    statistic: typeof results.statistic === 'number' ? results.statistic : undefined,
    pValue: typeof results.pValue === 'number' ? results.pValue : undefined,
    effectSize: extractNumericEffectSize(results.effectSize),
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

function resolveEqualVarianceOption(
  methodId: string,
  equalVariance: boolean | undefined,
  testVariant: string | undefined,
): boolean | undefined {
  if (methodId === 'welch-t' || testVariant === 'welch') {
    return false
  }

  return equalVariance
}

function extractPostHocMethod(
  results: { postHocMethod?: string } | Record<string, unknown> | null,
): string | undefined {
  if (!results) return undefined
  const method = 'postHocMethod' in results ? results.postHocMethod : undefined
  return typeof method === 'string' ? method : undefined
}

function extractTestVariant(
  results: { testVariant?: string } | Record<string, unknown> | null,
): string | undefined {
  if (!results) return undefined
  const variant = 'testVariant' in results ? results.testVariant : undefined
  return typeof variant === 'string' ? variant : undefined
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
  const testVariant = extractTestVariant(results)
  const equalVariance = resolveEqualVarianceOption(methodId, extractEqualVariance(results), testVariant)
  const postHocMethod = extractPostHocMethod(results) ?? (typeof options.postHocMethod === 'string' ? options.postHocMethod : undefined)

  const rawInput: CodeTemplateInput = {
    dataFileName: record.dataFileName,
    variableMapping: record.variableMapping ?? {},
    options: {
      confidenceLevel: typeof options.confidenceLevel === 'number' ? options.confidenceLevel : 0.95,
      alternative: typeof options.alternative === 'string' ? options.alternative : 'two-sided',
      equalVariance,
      testVariant,
      postHocMethod,
      testValue: typeof options.testValue === 'number' ? options.testValue : undefined,
    },
    expectedResults: buildExpectedResults(
      results
        ? { statistic: results.statistic, pValue: results.pValue, effectSize: results.effectSize }
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

  const testVariant = extractTestVariant(params.results ?? null)
  const equalVariance = resolveEqualVarianceOption(methodId, extractEqualVariance(params.results ?? null), testVariant)
  const postHocMethod = extractPostHocMethod(params.results ?? null)

  const rawInput: CodeTemplateInput = {
    dataFileName: params.dataFileName ?? 'data.csv',
    variableMapping: params.variableMapping ?? {},
    options: {
      confidenceLevel: 1 - (params.analysisOptions?.alpha ?? 0.05),
      alternative: 'two-sided',
      equalVariance,
      testVariant,
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
