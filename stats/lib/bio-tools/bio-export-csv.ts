/**
 * Bio-Tools CSV 내보내기 유틸리티
 *
 * ExportableTable → CSV 문자열 변환, 파일 다운로드, 클립보드 복사.
 */

/** 내보내기 가능한 테이블 1개 */
export interface ExportableTable {
  title: string
  headers: string[]
  rows: (string | number | null)[][]
}

/** ExportableTable 배열 → CSV 문자열 (RFC 4180 호환) */
export function tablesToCsvString(tables: ExportableTable[]): string {
  const lines: string[] = []

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i]
    if (tables.length > 1) {
      lines.push(escapeCsvCell(table.title))
    }
    lines.push(table.headers.map(escapeCsvCell).join(','))
    for (const row of table.rows) {
      lines.push(row.map((v) => escapeCsvCell(v ?? '')).join(','))
    }
    if (i < tables.length - 1) lines.push('')
  }

  return lines.join('\n')
}

function escapeCsvCell(value: string | number | null): string {
  const str = String(value ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/** CSV 문자열을 파일로 다운로드 (BOM 포함 UTF-8) */
export function downloadAsCsv(content: string, filename: string): void {
  const bom = '\uFEFF'
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** CSV 문자열을 클립보드에 복사 */
export async function copyAsCsv(content: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(content)
    return true
  } catch {
    return false
  }
}
