/**
 * 결과 내보내기 공통 타입
 *
 * AnalysisResult → NormalizedExportData → 각 포맷별 내보내기
 */

import type { AnalysisResult } from '@/types/smart-flow'
import type { StatisticalResult } from '@/components/statistics/common/StatisticalResultCard'

// ─── 내보내기 포맷 ───
export type ExportFormat = 'docx' | 'xlsx' | 'html'

// ─── 내보내기 컨텍스트 (컴포넌트에서 전달) ───
export interface ExportContext {
  analysisResult: AnalysisResult
  statisticalResult: StatisticalResult
  aiInterpretation: string | null
  apaFormat: string | null
  dataInfo: {
    fileName: string | null
    totalRows: number
    columnCount: number
    variables: string[]
  } | null
}

// ─── 정규화된 내보내기 데이터 ───
export interface NormalizedExportData {
  title: string
  method: string
  date: string

  // 핵심 결과
  mainResults: ExportRow[]
  effectSize: {
    value: string
    type: string
    interpretation: string
  } | null
  confidenceInterval: {
    lower: string
    upper: string
    level: string
  } | null
  apaString: string | null
  interpretation: string

  // 상세 테이블
  assumptions: ExportAssumption[]
  postHocResults: ExportPostHoc[] | null
  groupStats: ExportGroupStat[] | null
  coefficients: ExportCoefficient[] | null
  additionalMetrics: ExportRow[]

  // AI 해석
  aiInterpretation: {
    summary: string
    detail: string
  } | null

  // 메타
  dataInfo: {
    fileName: string
    rows: number
    columns: number
  } | null
}

export interface ExportRow {
  label: string
  value: string
}

export interface ExportAssumption {
  name: string
  passed: boolean
  statistic: string
  pValue: string
}

export interface ExportPostHoc {
  comparison: string
  meanDiff: string
  pValue: string
  significant: boolean
}

export interface ExportGroupStat {
  name: string
  n: number
  mean: string
  std: string
}

export interface ExportCoefficient {
  name: string
  value: string
  stdError: string
  tValue: string
  pValue: string
}

export interface ExportResult {
  success: boolean
  fileName?: string
  error?: string
}
