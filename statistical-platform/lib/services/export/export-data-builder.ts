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
  const detailPattern = /###\s*상세\s*해석/
  const match = text.match(detailPattern)

  if (match?.index !== undefined) {
    const summary = text.substring(0, match.index).trim()
    const detail = text.substring(match.index).trim()
    const cleanSummary = summary.replace(/###\s*한줄\s*요약\s*\n?/, '').trim()
    return { summary: cleanSummary, detail }
  }

  const cleanText = text.replace(/###\s*한줄\s*요약\s*\n?/, '').trim()
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

/** 효과크기 해석 */
function interpretEffectSize(value: number, type: string): string {
  const abs = Math.abs(value)
  if (type === 'etaSquared' || type === 'eta_squared') {
    if (abs < 0.01) return 'Small'
    if (abs < 0.06) return 'Medium'
    if (abs < 0.14) return 'Large'
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

/**
 * ExportContext → NormalizedExportData 변환
 */
export function buildExportData(ctx: ExportContext): NormalizedExportData {
  const { analysisResult: r, statisticalResult: sr, aiInterpretation, apaFormat, dataInfo } = ctx
  const now = new Date()

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
  if (aiInterpretation) {
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

  return {
    title: `${r.method} Analysis Report`,
    method: r.method,
    date: now.toLocaleDateString('ko-KR') + ' ' + now.toLocaleTimeString('ko-KR'),
    mainResults,
    effectSize,
    confidenceInterval,
    apaString: apaFormat,
    interpretation: r.interpretation ?? '',
    assumptions,
    postHocResults,
    groupStats,
    coefficients,
    additionalMetrics: buildAdditionalMetrics(r),
    aiInterpretation: aiInterp,
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
