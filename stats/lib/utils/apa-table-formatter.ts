/**
 * APA 7th Edition 테이블 서식 생성 유틸리티
 *
 * StatisticsTable의 columns/data를 APA 서식 HTML로 변환하여
 * Word/Google Docs에 붙여넣기 시 APA 스타일이 유지되도록 함.
 *
 * APA 테이블 규칙:
 * - 3개 수평선만 사용 (상단, 헤더-본문 구분, 하단)
 * - 수직선 없음
 * - 통계 기호는 이탤릭 (t, F, p, M, SD, r, χ², η² 등)
 * - 숫자는 소수점 정렬 (right align)
 * - p-value는 APA 표기 (< .001, .045 등)
 */

import type { TableColumn, TableRow } from '@/components/statistics/common/StatisticsTable'
import { escapeHtml } from '@/lib/utils/html-escape'

/**
 * 헤더 텍스트 내 통계 기호를 HTML 이탤릭으로 변환
 *
 * 단일 패스 regex — 그리스 기호(ηp²)와 ASCII 기호(p)가 중복 매칭되는 것을 방지.
 * 그리스/특수 기호를 먼저 배치하여 우선 매칭 (ηp² before p).
 * 긴 대안 먼저 (ηp² before η²) — regex alternation은 좌측 우선.
 */
function italicizeStats(text: string): string {
  return text.replace(
    /(ηp²|η²|ω²|ε²|χ²|\b(?:SD|SE|df|R²|t|F|p|r|M|n|N|d|f|W|U|H|Z)\b)/g,
    '<em>$1</em>',
  )
}

/**
 * 숫자가 정수인지 판별 (APA에서 n, df 등은 소수점 없이 표시)
 */
function isIntegerValue(value: number): boolean {
  return Number.isFinite(value) && Math.floor(value) === value
}

/**
 * 컬럼의 정렬 방향 결정
 * column.align이 명시되면 우선, 아니면 type 기반 기본값
 */
function resolveAlign(col: TableColumn): string {
  if (col.align) return col.align
  // APA: 텍스트=좌측, 숫자=우측 (소수점 정렬 근사)
  return col.type === 'text' ? 'left' : 'right'
}

/**
 * 셀 값을 APA 텍스트로 포맷팅
 */
function formatCellValue(column: TableColumn, value: unknown): string {
  if (value === null || value === undefined) return '\u2014' // em dash

  switch (column.type) {
    case 'pvalue': {
      const num = Number(value)
      if (isNaN(num)) return escapeHtml(value)
      if (num < .001) return '< .001'
      // APA: 선행 0 제거 (0.045 → .045)
      return num.toFixed(3).replace(/^0\./, '.')
    }
    case 'number': {
      const num = Number(value)
      if (isNaN(num)) return escapeHtml(value)
      // 정수(n, df 등)는 소수점 없이, 실수는 3자리
      return isIntegerValue(num) ? String(num) : num.toFixed(3)
    }
    case 'percentage': {
      const num = Number(value)
      if (isNaN(num)) return escapeHtml(value)
      return `${(num * 100).toFixed(1)}%`
    }
    case 'ci': {
      if (Array.isArray(value) && value.length === 2) {
        return `[${Number(value[0]).toFixed(3)}, ${Number(value[1]).toFixed(3)}]`
      }
      return escapeHtml(value)
    }
    default:
      return escapeHtml(value)
  }
}

/**
 * columns/data → APA 서식 HTML 테이블 생성
 *
 * Word에 붙여넣기 시 APA 3-line 테이블로 표시됨.
 * CSS inline style 사용 (클립보드 HTML은 외부 CSS 참조 불가).
 */
export function generateApaHtml(
  columns: TableColumn[],
  data: TableRow[],
  title?: string,
): string {
  const borderStyle = '2px solid black'
  const thinBorder = '1px solid black'

  let html = '<table style="border-collapse:collapse;font-family:Times New Roman,serif;font-size:12pt;min-width:400px;">'

  // 테이블 제목 (APA: 이탤릭, 테이블 위에)
  if (title) {
    html += `<caption style="text-align:left;font-style:italic;padding-bottom:4px;caption-side:top;">${escapeHtml(title)}</caption>`
  }

  // 헤더 행 — 상단선 + 하단선 (APA 3-line 중 1, 2번째)
  html += '<thead><tr>'
  columns.forEach((col, i) => {
    const align = resolveAlign(col)
    const paddingLeft = i === 0 ? '8px' : '12px'
    const paddingRight = i === columns.length - 1 ? '8px' : '12px'
    // APA: 통계 기호만 이탤릭 (font-style:italic을 th에 일괄 적용하지 않음)
    html += `<th style="border-top:${borderStyle};border-bottom:${thinBorder};padding:6px ${paddingRight} 6px ${paddingLeft};text-align:${align};font-weight:normal;">`
    html += italicizeStats(escapeHtml(col.header))
    html += '</th>'
  })
  html += '</tr></thead>'

  // 데이터 행
  html += '<tbody>'
  data.forEach((row, rowIdx) => {
    const isLast = rowIdx === data.length - 1
    html += '<tr>'
    columns.forEach((col, i) => {
      const align = resolveAlign(col)
      const paddingLeft = i === 0 ? '8px' : '12px'
      const paddingRight = i === columns.length - 1 ? '8px' : '12px'
      // 마지막 행 하단선 (APA 3-line 중 3번째)
      const bottomBorder = isLast ? `border-bottom:${borderStyle};` : ''
      html += `<td style="${bottomBorder}padding:4px ${paddingRight} 4px ${paddingLeft};text-align:${align};">`
      html += formatCellValue(col, row[col.key])
      html += '</td>'
    })
    html += '</tr>'
  })
  html += '</tbody></table>'

  return html
}

/**
 * columns/data → APA 서식 일반 텍스트 (탭 구분)
 *
 * ClipboardItem 미지원 환경 fallback용.
 */
export function generateApaPlainText(
  columns: TableColumn[],
  data: TableRow[],
): string {
  const headers = columns.map(col => col.header).join('\t')
  const rows = data.map(row =>
    columns.map(col => formatCellValue(col, row[col.key])).join('\t'),
  ).join('\n')

  return `${headers}\n${rows}`
}

/**
 * APA 서식 HTML + plain text를 클립보드에 복사
 *
 * @returns 성공 여부
 */
export async function copyApaTable(
  columns: TableColumn[],
  data: TableRow[],
  title?: string,
): Promise<boolean> {
  const html = generateApaHtml(columns, data, title)
  const plainText = generateApaPlainText(columns, data)

  try {
    if (typeof ClipboardItem !== 'undefined') {
      const htmlBlob = new Blob([html], { type: 'text/html' })
      const textBlob = new Blob([plainText], { type: 'text/plain' })
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob,
        }),
      ])
    } else {
      await navigator.clipboard.writeText(plainText)
    }
    return true
  } catch {
    return false
  }
}
