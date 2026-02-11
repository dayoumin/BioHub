/**
 * Excel 내보내기 (xlsx-js-style)
 *
 * 스타일링된 시트 구성:
 * - Sheet 1: 요약 (기본 결과 + 효과크기 + CI)
 * - Sheet 2: 집단통계 (있을 경우)
 * - Sheet 3: 사후검정 (있을 경우)
 * - Sheet 4: 회귀계수 (있을 경우)
 * - Sheet 5: 가정 검정 (있을 경우)
 * - Sheet 6: AI 해석 (있을 경우)
 */

import type { NormalizedExportData, ExportResult } from './export-types'
import { buildFileName, downloadBlob } from './export-data-builder'

// Dynamic import (번들에 포함되지 않음)
async function getXLSX(): Promise<typeof import('xlsx-js-style')> {
  return import('xlsx-js-style')
}

// ─── 스타일 상수 ───
const HEADER_STYLE = {
  font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
  fill: { fgColor: { rgb: '4472C4' } },
  border: {
    top: { style: 'thin' as const, color: { rgb: '000000' } },
    bottom: { style: 'thin' as const, color: { rgb: '000000' } },
    left: { style: 'thin' as const, color: { rgb: '000000' } },
    right: { style: 'thin' as const, color: { rgb: '000000' } },
  },
  alignment: { horizontal: 'center' as const },
}

const CELL_STYLE = {
  border: {
    top: { style: 'thin' as const, color: { rgb: 'D9D9D9' } },
    bottom: { style: 'thin' as const, color: { rgb: 'D9D9D9' } },
    left: { style: 'thin' as const, color: { rgb: 'D9D9D9' } },
    right: { style: 'thin' as const, color: { rgb: 'D9D9D9' } },
  },
}

const TITLE_STYLE = {
  font: { bold: true, sz: 14 },
}

const SUBTITLE_STYLE = {
  font: { color: { rgb: '666666' }, sz: 10 },
}

const SIGNIFICANT_STYLE = {
  ...CELL_STYLE,
  font: { bold: true, color: { rgb: '2E7D32' } },
}

type WorkSheet = ReturnType<typeof import('xlsx-js-style')['utils']['aoa_to_sheet']>

/** 시트에 스타일된 테이블 추가 */
function addStyledTable(
  XLSX: typeof import('xlsx-js-style'),
  wb: ReturnType<typeof import('xlsx-js-style')['utils']['book_new']>,
  sheetName: string,
  headers: string[],
  rows: string[][],
  options?: { colWidths?: number[]; title?: string }
): void {
  const data: unknown[][] = []

  // 제목 행 (옵션)
  if (options?.title) {
    data.push([options.title])
    data.push([]) // 빈 행
  }

  // 헤더
  data.push(headers)

  // 데이터
  for (const row of rows) {
    data.push(row)
  }

  const ws = XLSX.utils.aoa_to_sheet(data)

  // 헤더 스타일 적용
  const headerRowIdx = options?.title ? 2 : 0
  for (let c = 0; c < headers.length; c++) {
    const cellAddr = XLSX.utils.encode_cell({ r: headerRowIdx, c })
    if (ws[cellAddr]) {
      ws[cellAddr].s = HEADER_STYLE
    }
  }

  // 제목 스타일
  if (options?.title && ws['A1']) {
    ws['A1'].s = TITLE_STYLE
  }

  // 데이터 셀 스타일
  for (let r = headerRowIdx + 1; r < data.length; r++) {
    for (let c = 0; c < headers.length; c++) {
      const cellAddr = XLSX.utils.encode_cell({ r, c })
      if (ws[cellAddr]) {
        ws[cellAddr].s = CELL_STYLE
      }
    }
  }

  // 컬럼 너비
  if (options?.colWidths) {
    ws['!cols'] = options.colWidths.map(w => ({ wch: w }))
  } else {
    ws['!cols'] = headers.map(() => ({ wch: 18 }))
  }

  XLSX.utils.book_append_sheet(wb, ws, sheetName)
}

/**
 * Excel 내보내기 실행
 */
export async function exportExcel(data: NormalizedExportData): Promise<ExportResult> {
  try {
    const XLSX = await getXLSX()
    const wb = XLSX.utils.book_new()

    // ── Sheet 1: 요약 ──
    const summaryData: unknown[][] = [
      [data.title],
      [data.date],
      [],
      // 기본 결과
      ...data.mainResults.map(r => [r.label, r.value]),
    ]

    // APA 형식
    if (data.apaString) {
      summaryData.push([])
      summaryData.push(['APA Format', data.apaString])
    }

    // 해석
    summaryData.push([])
    summaryData.push(['Interpretation', data.interpretation])

    // 추가 지표
    if (data.additionalMetrics.length > 0) {
      summaryData.push([])
      summaryData.push(['Additional Metrics', ''])
      for (const m of data.additionalMetrics) {
        summaryData.push([m.label, m.value])
      }
    }

    // 데이터 정보
    if (data.dataInfo) {
      summaryData.push([])
      summaryData.push(['Data File', data.dataInfo.fileName])
      summaryData.push(['Rows', String(data.dataInfo.rows)])
      summaryData.push(['Columns', String(data.dataInfo.columns)])
    }

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
    // 제목/날짜 스타일
    if (summaryWs['A1']) summaryWs['A1'].s = TITLE_STYLE
    if (summaryWs['A2']) summaryWs['A2'].s = SUBTITLE_STYLE
    summaryWs['!cols'] = [{ wch: 25 }, { wch: 50 }]
    XLSX.utils.book_append_sheet(wb, summaryWs, '요약')

    // ── Sheet 2: 집단통계 ──
    if (data.groupStats) {
      addStyledTable(XLSX, wb, '집단통계',
        ['그룹', '표본수 (N)', '평균 (M)', '표준편차 (SD)'],
        data.groupStats.map(g => [g.name, String(g.n), g.mean, g.std]),
        { colWidths: [20, 12, 15, 15] }
      )
    }

    // ── Sheet 3: 사후검정 ──
    if (data.postHocResults) {
      const postHocRows = data.postHocResults.map(ph => [
        ph.comparison, ph.meanDiff, ph.pValue, ph.significant ? '유의함 *' : '-',
      ])
      addStyledTable(XLSX, wb, '사후검정',
        ['비교', '평균차', 'p-value', '유의성'],
        postHocRows,
        { colWidths: [25, 15, 15, 12] }
      )

      // 유의한 행에 스타일 적용
      const ws = wb.Sheets['사후검정'] as WorkSheet
      for (let r = 0; r < data.postHocResults.length; r++) {
        if (data.postHocResults[r].significant) {
          const cellAddr = XLSX.utils.encode_cell({ r: r + 1, c: 3 }) // 유의성 열
          if (ws[cellAddr]) {
            ws[cellAddr].s = SIGNIFICANT_STYLE
          }
        }
      }
    }

    // ── Sheet 4: 회귀계수 ──
    if (data.coefficients) {
      addStyledTable(XLSX, wb, '회귀계수',
        ['변수', '계수 (B)', '표준오차', 't값', 'p-value'],
        data.coefficients.map(c => [c.name, c.value, c.stdError, c.tValue, c.pValue]),
        { colWidths: [20, 15, 15, 12, 12] }
      )
    }

    // ── Sheet 5: 가정 검정 ──
    if (data.assumptions.length > 0) {
      addStyledTable(XLSX, wb, '가정검정',
        ['검정 항목', '통계량', 'p-value', '결과'],
        data.assumptions.map(a => [a.name, a.statistic, a.pValue, a.passed ? '충족' : '미충족']),
        { colWidths: [25, 15, 15, 12] }
      )
    }

    // ── Sheet 6: AI 해석 ──
    if (data.aiInterpretation) {
      const aiData: unknown[][] = [
        ['AI 분석 해석'],
        [],
        ['요약'],
        [data.aiInterpretation.summary],
      ]
      if (data.aiInterpretation.detail) {
        aiData.push([])
        aiData.push(['상세 해석'])
        aiData.push([data.aiInterpretation.detail])
      }
      const aiWs = XLSX.utils.aoa_to_sheet(aiData)
      if (aiWs['A1']) aiWs['A1'].s = TITLE_STYLE
      if (aiWs['A3']) aiWs['A3'].s = { font: { bold: true, sz: 11 } }
      // '상세 해석' 헤딩은 detail이 있을 때만 존재 (행 인덱스: 요약4행 + 빈행 + 헤딩 = A6)
      if (data.aiInterpretation.detail && aiWs['A6']) {
        aiWs['A6'].s = { font: { bold: true, sz: 11 } }
      }
      aiWs['!cols'] = [{ wch: 80 }]
      // 텍스트 줄바꿈
      for (const key of Object.keys(aiWs)) {
        if (key.startsWith('!')) continue
        if (aiWs[key]?.v && typeof aiWs[key].v === 'string') {
          aiWs[key].s = { ...aiWs[key].s, alignment: { wrapText: true, vertical: 'top' } }
        }
      }
      XLSX.utils.book_append_sheet(wb, aiWs, 'AI 해석')
    }

    // ── 파일 생성 ──
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const fileName = buildFileName(data.method, 'xlsx')
    downloadBlob(blob, fileName)

    return { success: true, fileName }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Excel export failed'
    return { success: false, error: msg }
  }
}
