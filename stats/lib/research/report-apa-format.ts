/**
 * 보고서용 APA 포맷 생성
 *
 * 전략:
 * 1. HistoryRecord.apaFormat(AI 생성 텍스트)이 있으면 그대로 사용 (~95%)
 * 2. 없으면 results에서 통계 타입 판별 → statistics-formatters로 생성
 *
 * BLAST 결과는 description + topHits 테이블로 렌더.
 */

import type { AnalysisRawData, BlastRawData } from './entity-resolver'
import type { RenderedContent } from './report-types'
import {
  formatTTestResult,
  formatFTestResult,
  formatChiSquareResult,
  formatCorrelationResult,
  formatEffectSize,
  formatCI,
  formatPValue,
} from '@/lib/utils/statistics-formatters'
import { extractNumber } from './entity-resolver'

// ── 통계 분석 APA ──

function buildApaFallback(results: Record<string, unknown>): string {
  const pValue = extractNumber(results, 'pValue')
  const tStat = extractNumber(results, 'tStatistic')
  const fStat = extractNumber(results, 'fStatistic')
  const chiSq = extractNumber(results, 'chiSquare')
  const corrCoef = extractNumber(results, 'correlationCoefficient')
  const df = extractNumber(results, 'df')
  const df1 = extractNumber(results, 'df1')
  const df2 = extractNumber(results, 'df2')

  const lines: string[] = []

  // 주 통계량
  if (tStat != null && df != null && pValue != null) {
    lines.push(formatTTestResult(tStat, df, pValue))
  } else if (fStat != null && df1 != null && df2 != null && pValue != null) {
    lines.push(formatFTestResult(fStat, df1, df2, pValue))
  } else if (chiSq != null && df != null && pValue != null) {
    lines.push(formatChiSquareResult(chiSq, df, pValue))
  } else if (corrCoef != null && pValue != null) {
    lines.push(formatCorrelationResult(corrCoef, pValue))
  } else if (pValue != null) {
    lines.push(`p ${formatPValue(pValue)}`)
  }

  // 효과크기
  const es = extractNumber(results, 'effectSize')
  if (es != null) {
    lines.push(`효과크기: ${formatEffectSize(es)}`)
  }

  // 신뢰구간
  const ci = results.confidenceInterval
  if (ci != null && typeof ci === 'object') {
    const ciObj = ci as Record<string, unknown>
    const lower = extractNumber(ciObj, 'lower')
    const upper = extractNumber(ciObj, 'upper')
    if (lower != null && upper != null) {
      lines.push(`95% CI ${formatCI(lower, upper)}`)
    }
  }

  return lines.join(', ') || '통계 결과 없음'
}

export function generateAnalysisContent(
  title: string,
  rawData: AnalysisRawData,
): RenderedContent {
  const body = rawData.apaFormat ?? (rawData.results ? buildApaFallback(rawData.results) : '')

  // 집단별 기술통계 테이블
  const rawGroupStats = rawData.results?.groupStats
  const groupStats = Array.isArray(rawGroupStats) ? rawGroupStats as Array<{
    name?: string; mean?: number; std?: number; n?: number
  }> : undefined

  const tables = groupStats && groupStats.length > 0
    ? [{
      caption: '기술 통계량',
      headers: ['집단', '평균', '표준편차', 'N'],
      rows: groupStats.map(g => [
        g.name ?? '-',
        g.mean != null ? g.mean.toFixed(3) : '-',
        g.std != null ? g.std.toFixed(3) : '-',
        g.n != null ? String(g.n) : '-',
      ]),
    }]
    : undefined

  return { heading: title, body, tables }
}

// ── BLAST 보고서 ──

export function generateBlastContent(
  title: string,
  rawData: BlastRawData,
): RenderedContent {
  const lines: string[] = []
  lines.push(rawData.description)

  const topHits = rawData.topHits.slice(0, 5)
  const tables = topHits.length > 0
    ? [{
      caption: 'Top BLAST Hits',
      headers: ['Species', 'Identity', 'Accession'],
      rows: topHits.map(h => {
        const pct = h.identity > 1 ? h.identity : h.identity * 100
        return [h.species, `${pct.toFixed(1)}%`, h.accession]
      }),
    }]
    : undefined

  return {
    heading: title,
    body: lines.join('\n'),
    tables,
  }
}
