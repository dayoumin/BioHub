/**
 * AnalysisResult → NormalizedExportData 변환
 *
 * 모든 내보내기 포맷이 공유하는 정규화된 중간 데이터 구조를 생성합니다.
 * 기존 result-converter.ts와 ResultsActionStep의 클립보드 로직을 참고합니다.
 */

import type { AnalysisResult, EffectSizeInfo } from '@/types/smart-flow'
import type {
  ExportContext,
  NormalizedExportData,
  ExportRow,
  ExportAssumption,
  ExportPostHoc,
  ExportGroupStat,
  ExportCoefficient,
} from './export-types'

/** AI 해석을 요약/상세로 분리 */
export function splitInterpretation(text: string): { summary: string; detail: string } {
  // 1) 명시적 `### 상세 해석` 헤더가 있으면 정확히 분리
  const detailPattern = /###\s*상세\s*해석/
  const match = text.match(detailPattern)

  if (match?.index !== undefined) {
    const summary = text.substring(0, match.index).trim()
    const rawDetail = text.substring(match.index).trim()
    const cleanSummary = summary.replace(/###\s*한줄\s*요약\s*\r?\n?/, '').trim()
    const cleanDetail = rawDetail.replace(/###\s*상세\s*해석\s*\r?\n?/, '').trim()
    return { summary: cleanSummary, detail: cleanDetail }
  }

  // 2) 헤더 없지만 볼드 소제목(**...**)이 있으면 첫 소제목 기준으로 분리
  const cleanText = text.replace(/###\s*한줄\s*요약\s*\r?\n?/, '').trim()
  const boldHeadingMatch = cleanText.match(/\r?\n\s*\*\*[^*]+\*\*/)
  if (boldHeadingMatch?.index !== undefined && boldHeadingMatch.index > 10) {
    const summary = cleanText.substring(0, boldHeadingMatch.index).trim()
    const detail = cleanText.substring(boldHeadingMatch.index).trim()
    if (summary.length > 10 && detail.length > 20) {
      return { summary, detail }
    }
  }

  // 3) 빈 줄(\n\n) 기준: 첫 단락을 요약, 나머지를 상세
  const paragraphs = cleanText.split(/\r?\n\r?\n+/)
  if (paragraphs.length >= 2) {
    const summary = paragraphs[0].trim()
    const detail = paragraphs.slice(1).join('\n\n').trim()
    if (summary.length > 10 && detail.length > 30) {
      return { summary, detail }
    }
  }

  return { summary: cleanText, detail: '' }
}

/** 숫자 포맷 */
function fmt(n: number | undefined | null, decimals = 4): string {
  if (n == null || isNaN(n)) return '-'
  return n.toFixed(decimals)
}

/** p-value 포맷 */
function fmtP(p: number | undefined | null): string {
  if (p == null || isNaN(p)) return '-'
  if (p < 0.001) return '< .001'
  return p.toFixed(4)
}

/** 효과크기 값/타입 추출 */
function extractEffectSize(es: number | EffectSizeInfo | undefined): {
  value: number | null; type: string
} {
  if (es === undefined) return { value: null, type: '' }
  if (typeof es === 'number') return { value: es, type: '' }
  return { value: es.value, type: es.type ?? '' }
}

/** 효과크기 해석 (export용 — 영문 고정값) */
function interpretEffectSize(value: number, type: string): string {
  const abs = Math.abs(value)
  if (type === 'etaSquared' || type === 'eta_squared') {
    if (abs < 0.01) return 'Small'
    if (abs < 0.06) return 'Medium'
    if (abs < 0.14) return 'Large'
    return 'Very Large'
  }
  if (type === 'r' || type === 'phi' || type === 'cramersV') {
    if (abs < 0.1) return 'Small'
    if (abs < 0.3) return 'Medium'
    if (abs < 0.5) return 'Large'
    return 'Very Large'
  }
  // Cohen's d default
  if (abs < 0.2) return 'Small'
  if (abs < 0.5) return 'Medium'
  if (abs < 0.8) return 'Large'
  return 'Very Large'
}

/** 추가 지표 추출 (rSquared, RMSE, accuracy 등) */
function buildAdditionalMetrics(result: AnalysisResult): ExportRow[] {
  const rows: ExportRow[] = []
  const add = result.additional
  if (!add) return rows

  if (add.rSquared != null) rows.push({ label: 'R²', value: fmt(add.rSquared) })
  if (add.adjustedRSquared != null) rows.push({ label: 'Adj R²', value: fmt(add.adjustedRSquared) })
  if (add.rmse != null) rows.push({ label: 'RMSE', value: fmt(add.rmse) })
  if (add.aic != null) rows.push({ label: 'AIC', value: fmt(add.aic, 2) })
  if (add.bic != null) rows.push({ label: 'BIC', value: fmt(add.bic, 2) })
  if (add.accuracy != null) rows.push({ label: 'Accuracy', value: fmt(add.accuracy) })
  if (add.precision != null) rows.push({ label: 'Precision', value: fmt(add.precision) })
  if (add.recall != null) rows.push({ label: 'Recall', value: fmt(add.recall) })
  if (add.f1Score != null) rows.push({ label: 'F1 Score', value: fmt(add.f1Score) })
  if (add.rocAuc != null) rows.push({ label: 'ROC AUC', value: fmt(add.rocAuc) })
  if (add.silhouetteScore != null) rows.push({ label: 'Silhouette', value: fmt(add.silhouetteScore) })
  if (add.power != null) rows.push({ label: 'Power', value: fmt(add.power) })
  if (add.requiredSampleSize != null) rows.push({ label: 'Required N', value: String(add.requiredSampleSize) })

  return rows
}

function buildMethodologyText(method: string): string {
  const m = method.toLowerCase()

  if (m.includes('t-test') || m.includes('t test') || m.includes('t검정')) {
    return '독립/대응 표본의 평균 차이를 t-검정을 통해 검정했습니다. 유의수준(alpha)은 기본적으로 0.05를 사용합니다.'
  }
  if (m.includes('anova') || m.includes('분산분석')) {
    return '집단 간 평균 차이를 분산분석(ANOVA)으로 검정했습니다. 필요 시 사후검정 결과를 함께 해석합니다.'
  }
  if (m.includes('chi') || m.includes('카이')) {
    return '범주형 변수 간 독립성을 카이제곱 검정으로 평가했습니다. 기대빈도 조건을 확인해 해석했습니다.'
  }
  if (m.includes('regression') || m.includes('회귀')) {
    return '종속변수와 독립변수 간 관계를 회귀분석으로 추정했습니다. 계수, 유의성, 설명력을 함께 검토했습니다.'
  }
  if (m.includes('correlation') || m.includes('상관')) {
    return '변수 간 선형/순위 상관을 상관분석으로 평가했습니다. 상관계수와 p-value를 함께 보고했습니다.'
  }

  return '선택한 통계 방법의 가정과 검정 절차를 기준으로 결과를 산출했습니다.'
}

function buildReferences(method: string): string[] {
  const common = [
    'Field, A. (2013). Discovering Statistics Using IBM SPSS Statistics (4th ed.). Sage.',
    'Cohen, J. (1988). Statistical Power Analysis for the Behavioral Sciences (2nd ed.). Routledge.',
  ]

  const m = method.toLowerCase()
  if (m.includes('anova') || m.includes('t-test') || m.includes('t test') || m.includes('regression')) {
    return [
      ...common,
      'Tabachnick, B. G., & Fidell, L. S. (2019). Using Multivariate Statistics (7th ed.). Pearson.',
    ]
  }
  if (m.includes('chi') || m.includes('카이')) {
    return [
      ...common,
      'Agresti, A. (2018). An Introduction to Categorical Data Analysis (3rd ed.). Wiley.',
    ]
  }
  if (m.includes('correlation') || m.includes('상관')) {
    return [
      ...common,
      'Schober, P., Boer, C., & Schwarte, L. A. (2018). Correlation coefficients: appropriate use and interpretation.',
    ]
  }

  return common
}

function stringifyRawValue(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(v => stringifyRawValue(v)).join(', ')
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return '[object]'
    }
  }
  return String(value)
}

function buildRawDataPreview(
  rawDataRows: ExportContext['rawDataRows'],
  maxRows = 200,
): NormalizedExportData['rawData'] {
  if (!rawDataRows || rawDataRows.length === 0) return null

  const previewRows = rawDataRows.slice(0, maxRows)
  const columnSet = new Set<string>()
  for (const row of previewRows) {
    for (const key of Object.keys(row)) {
      columnSet.add(key)
    }
  }
  const columns = Array.from(columnSet)
  if (columns.length === 0) return null

  const rows = previewRows.map(row => columns.map(col => stringifyRawValue(row[col])))
  return { columns, rows }
}

/**
 * ExportContext → NormalizedExportData 변환
 */
export function buildExportData(ctx: ExportContext): NormalizedExportData {
  const {
    analysisResult: r,
    statisticalResult: sr,
    aiInterpretation,
    apaFormat,
    dataInfo,
    exportOptions,
    rawDataRows,
  } = ctx
  const now = new Date()
  const includeInterpretation = exportOptions?.includeInterpretation ?? true
  const includeRawData = exportOptions?.includeRawData ?? false
  const includeMethodology = exportOptions?.includeMethodology ?? false
  const includeReferences = exportOptions?.includeReferences ?? false

  // ── 기본 결과 행 ──
  const mainResults: ExportRow[] = []
  const statName = sr.statisticName || 'Statistic'
  mainResults.push({ label: `${statName}`, value: fmt(r.statistic) })

  if (r.df !== undefined) {
    const dfStr = Array.isArray(r.df) ? (r.df as number[]).join(', ') : String(r.df)
    mainResults.push({ label: 'df', value: dfStr })
  }

  mainResults.push({ label: 'p-value', value: fmtP(r.pValue) })

  // ── 효과크기 ──
  const { value: esValue, type: esType } = extractEffectSize(r.effectSize)
  let effectSize: NormalizedExportData['effectSize'] = null
  if (esValue != null) {
    effectSize = {
      value: fmt(esValue),
      type: esType,
      interpretation: interpretEffectSize(esValue, esType),
    }
    mainResults.push({ label: 'Effect Size', value: fmt(esValue) })
  }

  // omega squared (ANOVA)
  if (r.omegaSquared) {
    mainResults.push({ label: 'ω²', value: fmt(r.omegaSquared.value) })
  }

  // ── 신뢰구간 ──
  let confidenceInterval: NormalizedExportData['confidenceInterval'] = null
  if (r.confidence) {
    confidenceInterval = {
      lower: fmt(r.confidence.lower),
      upper: fmt(r.confidence.upper),
      level: `${((r.confidence.level ?? 0.95) * 100).toFixed(0)}%`,
    }
    mainResults.push({
      label: `CI (${confidenceInterval.level})`,
      value: `[${confidenceInterval.lower}, ${confidenceInterval.upper}]`,
    })
  }

  // ── 가정 검정 ──
  const assumptions: ExportAssumption[] = []
  if (r.assumptions) {
    const items = Array.isArray(r.assumptions) ? r.assumptions : Object.values(r.assumptions)
    for (const a of items) {
      if (a && typeof a === 'object' && 'name' in a) {
        const item = a as { name: string; passed?: boolean; testStatistic?: number; pValue?: number }
        assumptions.push({
          name: item.name,
          passed: item.passed ?? true,
          statistic: fmt(item.testStatistic, 3),
          pValue: fmtP(item.pValue),
        })
      }
    }
  }

  // ── 사후검정 ──
  let postHocResults: ExportPostHoc[] | null = null
  if (r.postHoc?.length) {
    postHocResults = r.postHoc.map(ph => ({
      comparison: `${ph.group1} vs ${ph.group2}`,
      meanDiff: fmt(ph.meanDiff, 3),
      pValue: fmtP(ph.pvalue),
      significant: ph.significant ?? false,
    }))
  }

  // ── 집단통계 ──
  let groupStats: ExportGroupStat[] | null = null
  if (r.groupStats?.length) {
    groupStats = r.groupStats.map(g => ({
      name: g.name ?? '',
      n: g.n,
      mean: fmt(g.mean, 3),
      std: fmt(g.std, 3),
    }))
  }

  // ── 회귀계수 ──
  let coefficients: ExportCoefficient[] | null = null
  if (r.coefficients?.length) {
    coefficients = r.coefficients.map(c => ({
      name: c.name,
      value: fmt(c.value),
      stdError: fmt(c.stdError),
      tValue: fmt(c.tValue, 3),
      pValue: fmtP(c.pvalue),
    }))
  }

  // ── AI 해석 ──
  let aiInterp: NormalizedExportData['aiInterpretation'] = null
  if (includeInterpretation && aiInterpretation) {
    aiInterp = splitInterpretation(aiInterpretation)
  }

  // ── 데이터 정보 ──
  let dataInfoNorm: NormalizedExportData['dataInfo'] = null
  if (dataInfo) {
    dataInfoNorm = {
      fileName: dataInfo.fileName ?? 'unknown',
      rows: dataInfo.totalRows,
      columns: dataInfo.columnCount,
    }
  }
  const rawDataPreview = includeRawData ? buildRawDataPreview(rawDataRows) : null
  const methodology = includeMethodology ? buildMethodologyText(r.method) : null
  const references = includeReferences ? buildReferences(r.method) : null

  return {
    title: `${r.method} Analysis Report`,
    method: r.method,
    date: now.toLocaleDateString('ko-KR') + ' ' + now.toLocaleTimeString('ko-KR'),
    mainResults,
    effectSize,
    confidenceInterval,
    apaString: apaFormat,
    interpretation: includeInterpretation ? (r.interpretation ?? '') : '',
    assumptions,
    postHocResults,
    groupStats,
    coefficients,
    additionalMetrics: buildAdditionalMetrics(r),
    aiInterpretation: aiInterp,
    methodology,
    references,
    rawData: rawDataPreview,
    dataInfo: dataInfoNorm,
  }
}

/**
 * 파일명 생성 (한국어 + 날짜)
 */
export function buildFileName(method: string, ext: string): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const safeName = method.replace(/[/\\?%*:|"<>]/g, '_')
  return `${safeName}_분석결과_${dateStr}.${ext}`
}

/**
 * Blob → 다운로드
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * 클립보드 복사용 plain text 요약 생성
 */
export function generateSummaryText(result: AnalysisResult): string {
  const pValueText = result.pValue < 0.001 ? '< 0.001' : result.pValue.toFixed(4)

  let summary = `Statistical Analysis Summary\n`
  summary += `========================\n\n`
  summary += `Method: ${result.method}\n`
  summary += `Test Statistic: ${result.statistic.toFixed(4)}\n`
  summary += `p-value: ${pValueText}\n`

  if (result.effectSize !== undefined) {
    const esValue = typeof result.effectSize === 'number'
      ? result.effectSize
      : result.effectSize.value
    summary += `Effect Size: ${esValue.toFixed(4)}\n`
  }

  if (result.confidence) {
    summary += `95% CI: [${result.confidence.lower.toFixed(4)}, ${result.confidence.upper.toFixed(4)}]\n`
  }

  summary += `\nInterpretation:\n${result.interpretation}\n`

  if (result.assumptions) {
    summary += `\nAssumptions:\n`
    if (result.assumptions.normality) {
      const norm = result.assumptions.normality
      if (norm.group1) {
        summary += `- Normality (Group 1): ${norm.group1.isNormal ? 'Met' : 'Violated'} (p=${norm.group1?.pValue !== undefined ? norm.group1?.pValue.toFixed(4) : 'N/A'})\n`
      }
      if (norm.group2) {
        summary += `- Normality (Group 2): ${norm.group2.isNormal ? 'Met' : 'Violated'} (p=${norm.group2?.pValue !== undefined ? norm.group2?.pValue.toFixed(4) : 'N/A'})\n`
      }
    }
    if (result.assumptions.homogeneity) {
      const equalVariance = result.assumptions.homogeneity.levene?.equalVariance ?? result.assumptions.homogeneity.bartlett?.equalVariance ?? false
      const pValue = result.assumptions.homogeneity.levene?.pValue ?? result.assumptions.homogeneity.bartlett?.pValue
      const pValueStr = pValue !== undefined ? pValue.toFixed(4) : 'N/A'
      summary += `- Equal Variance: ${equalVariance ? 'Met' : 'Violated'} (p=${pValueStr})\n`
    }
  }

  return summary
}
