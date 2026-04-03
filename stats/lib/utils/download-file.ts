/**
 * 파일 다운로드 유틸
 *
 * 기존: export-data-builder.ts의 downloadBlob (Blob 전용)
 * 이 모듈: 텍스트 콘텐츠를 바로 다운로드하는 편의 함수
 */

/** Blob → 브라우저 다운로드 트리거 */
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

/** 텍스트 콘텐츠 → 파일 다운로드 */
export function downloadTextFile(
  content: string,
  filename: string,
  mimeType = 'text/plain;charset=utf-8',
): void {
  const blob = new Blob([content], { type: mimeType })
  downloadBlob(blob, filename)
}

/** CSV 다운로드 (BOM 포함, Excel 한글 호환) */
export function downloadCsvFile(content: string, filename: string): void {
  downloadTextFile('\uFEFF' + content, filename, 'text/csv;charset=utf-8')
}
