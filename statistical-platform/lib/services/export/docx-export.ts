/**
 * DOCX 내보내기 (docx 패키지)
 *
 * 구성:
 * - 제목 + 날짜
 * - 기본 결과 테이블
 * - APA 형식
 * - 해석
 * - 가정 검정 (조건부)
 * - 사후검정 (조건부)
 * - 회귀계수 (조건부)
 * - 집단통계 (조건부)
 * - 추가 지표 (조건부)
 * - AI 해석 (조건부)
 */

import type { NormalizedExportData, ExportResult, ExportRow } from './export-types'
import { buildFileName, downloadBlob } from './export-data-builder'

// Dynamic import
async function getDocx() {
  return import('docx')
}

// ─── 색상 상수 ───
const COLOR_PRIMARY = '4472C4'
const COLOR_LIGHT_GRAY = 'F2F2F2'
const COLOR_GREEN = '2E7D32'
const COLOR_MUTED = '666666'

/**
 * 2열 테이블 생성 (label-value 쌍)
 */
function buildKeyValueTable(
  rows: ExportRow[],
  docx: typeof import('docx'),
): InstanceType<typeof import('docx')['Table']> {
  const { Table, TableRow, TableCell, Paragraph, TextRun, WidthType, BorderStyle, AlignmentType } = docx

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        width: { size: 40, type: WidthType.PERCENTAGE },
        shading: { fill: COLOR_PRIMARY },
        children: [new Paragraph({
          children: [new TextRun({ text: '항목', bold: true, color: 'FFFFFF', size: 22 })],
          alignment: AlignmentType.CENTER,
        })],
      }),
      new TableCell({
        width: { size: 60, type: WidthType.PERCENTAGE },
        shading: { fill: COLOR_PRIMARY },
        children: [new Paragraph({
          children: [new TextRun({ text: '값', bold: true, color: 'FFFFFF', size: 22 })],
          alignment: AlignmentType.CENTER,
        })],
      }),
    ],
  })

  const dataRows = rows.map((r, idx) =>
    new TableRow({
      children: [
        new TableCell({
          shading: idx % 2 === 0 ? { fill: COLOR_LIGHT_GRAY } : undefined,
          children: [new Paragraph({
            children: [new TextRun({ text: r.label, size: 20 })],
          })],
        }),
        new TableCell({
          shading: idx % 2 === 0 ? { fill: COLOR_LIGHT_GRAY } : undefined,
          children: [new Paragraph({
            children: [new TextRun({ text: r.value, bold: true, size: 20 })],
          })],
        }),
      ],
    })
  )

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'D9D9D9' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D9D9D9' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'D9D9D9' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'D9D9D9' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'D9D9D9' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'D9D9D9' },
    },
    rows: [headerRow, ...dataRows],
  })
}

/**
 * 다열 테이블 생성
 */
function buildMultiColTable(
  headers: string[],
  rows: string[][],
  docx: typeof import('docx'),
  highlightCol?: number,
  highlightFn?: (val: string) => boolean,
): InstanceType<typeof import('docx')['Table']> {
  const { Table, TableRow, TableCell, Paragraph, TextRun, WidthType, BorderStyle, AlignmentType } = docx

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(h =>
      new TableCell({
        shading: { fill: COLOR_PRIMARY },
        children: [new Paragraph({
          children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 20 })],
          alignment: AlignmentType.CENTER,
        })],
      })
    ),
  })

  const dataRows = rows.map((row, rowIdx) =>
    new TableRow({
      children: row.map((cell, colIdx) => {
        const isHighlighted = highlightCol === colIdx && highlightFn?.(cell)
        return new TableCell({
          shading: rowIdx % 2 === 0 ? { fill: COLOR_LIGHT_GRAY } : undefined,
          children: [new Paragraph({
            children: [new TextRun({
              text: cell,
              size: 20,
              bold: isHighlighted,
              color: isHighlighted ? COLOR_GREEN : undefined,
            })],
            alignment: colIdx > 0 ? AlignmentType.CENTER : AlignmentType.LEFT,
          })],
        })
      }),
    })
  )

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'D9D9D9' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D9D9D9' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'D9D9D9' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'D9D9D9' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'D9D9D9' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'D9D9D9' },
    },
    rows: [headerRow, ...dataRows],
  })
}

/** 빈 줄 */
function spacer(docx: typeof import('docx')) {
  return new docx.Paragraph({ text: '' })
}

/** 섹션 헤딩 */
function heading(text: string, docx: typeof import('docx'), level: 1 | 2 = 2) {
  return new docx.Paragraph({
    text,
    heading: level === 1 ? docx.HeadingLevel.HEADING_1 : docx.HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
  })
}

/**
 * DOCX 내보내기 실행
 */
export async function exportDocx(data: NormalizedExportData): Promise<ExportResult> {
  try {
    const docx = await getDocx()
    const { Document, Paragraph, Table, TextRun, HeadingLevel, Packer, AlignmentType } = docx

    const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = []

    // ── 제목 + 날짜 ──
    children.push(new Paragraph({
      text: data.title,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
    }))
    children.push(new Paragraph({
      children: [new TextRun({ text: data.date, color: COLOR_MUTED, size: 20 })],
      alignment: AlignmentType.CENTER,
    }))

    // 데이터 정보
    if (data.dataInfo) {
      children.push(new Paragraph({
        children: [new TextRun({
          text: `Data: ${data.dataInfo.fileName} (${data.dataInfo.rows} rows × ${data.dataInfo.columns} cols)`,
          color: COLOR_MUTED, size: 18, italics: true,
        })],
        alignment: AlignmentType.CENTER,
      }))
    }

    children.push(spacer(docx))

    // ── 기본 결과 테이블 ──
    children.push(heading('분석 결과', docx))
    children.push(buildKeyValueTable(data.mainResults, docx))

    // ── APA 형식 ──
    if (data.apaString) {
      children.push(spacer(docx))
      children.push(new Paragraph({
        children: [
          new TextRun({ text: 'APA: ', bold: true, size: 20 }),
          new TextRun({ text: data.apaString, italics: true, size: 20 }),
        ],
      }))
    }

    // ── 해석 ──
    children.push(spacer(docx))
    children.push(heading('해석', docx))
    children.push(new Paragraph({
      children: [new TextRun({ text: data.interpretation, size: 20 })],
    }))

    // ── 추가 지표 ──
    if (data.additionalMetrics.length > 0) {
      children.push(spacer(docx))
      children.push(heading('추가 지표', docx))
      children.push(buildKeyValueTable(data.additionalMetrics, docx))
    }

    // ── 집단통계 ──
    if (data.groupStats) {
      children.push(spacer(docx))
      children.push(heading('집단별 기술통계', docx))
      children.push(buildMultiColTable(
        ['그룹', 'N', '평균 (M)', '표준편차 (SD)'],
        data.groupStats.map(g => [g.name, String(g.n), g.mean, g.std]),
        docx,
      ))
    }

    // ── 사후검정 ──
    if (data.postHocResults) {
      children.push(spacer(docx))
      children.push(heading('사후검정', docx))
      children.push(buildMultiColTable(
        ['비교', '평균차', 'p-value', '유의성'],
        data.postHocResults.map(ph => [
          ph.comparison, ph.meanDiff, ph.pValue, ph.significant ? '유의함 *' : '-',
        ]),
        docx,
        3, // 유의성 열 하이라이트
        (val) => val.includes('유의함'),
      ))
    }

    // ── 회귀계수 ──
    if (data.coefficients) {
      children.push(spacer(docx))
      children.push(heading('회귀계수', docx))
      children.push(buildMultiColTable(
        ['변수', '계수 (B)', '표준오차', 't값', 'p-value'],
        data.coefficients.map(c => [c.name, c.value, c.stdError, c.tValue, c.pValue]),
        docx,
      ))
    }

    // ── 가정 검정 ──
    if (data.assumptions.length > 0) {
      children.push(spacer(docx))
      children.push(heading('가정 검정', docx))
      children.push(buildMultiColTable(
        ['검정 항목', '통계량', 'p-value', '결과'],
        data.assumptions.map(a => [a.name, a.statistic, a.pValue, a.passed ? '충족' : '미충족']),
        docx,
        3,
        (val) => val === '미충족',
      ))
    }

    // ── AI 해석 ──
    if (data.aiInterpretation) {
      children.push(spacer(docx))
      children.push(heading('AI 분석 해석', docx))

      // 요약
      children.push(new Paragraph({
        children: [new TextRun({ text: '요약', bold: true, size: 22 })],
        spacing: { after: 80 },
      }))
      // 마크다운 → 단순 텍스트 (줄바꿈 유지)
      for (const line of data.aiInterpretation.summary.split('\n')) {
        const cleanLine = line.replace(/[#*_`]/g, '').trim()
        if (cleanLine) {
          children.push(new Paragraph({
            children: [new TextRun({ text: cleanLine, size: 20 })],
          }))
        }
      }

      // 상세
      if (data.aiInterpretation.detail) {
        children.push(spacer(docx))
        children.push(new Paragraph({
          children: [new TextRun({ text: '상세 해석', bold: true, size: 22 })],
          spacing: { after: 80 },
        }))
        for (const line of data.aiInterpretation.detail.split('\n')) {
          const cleanLine = line.replace(/[#*_`]/g, '').trim()
          if (cleanLine) {
            children.push(new Paragraph({
              children: [new TextRun({ text: cleanLine, size: 20 })],
            }))
          }
        }
      }
    }

    // ── 문서 생성 ──
    const doc = new Document({
      sections: [{ children }],
    })

    const blob = await Packer.toBlob(doc)
    const fileName = buildFileName(data.method, 'docx')
    downloadBlob(blob, fileName)

    return { success: true, fileName }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'DOCX export failed'
    return { success: false, error: msg }
  }
}
