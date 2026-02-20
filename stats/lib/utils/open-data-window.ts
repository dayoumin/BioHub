/**
 * 데이터를 새 창에서 보기 위한 유틸리티
 * 2024 Modern Pattern: Flex-based Full Viewport + Monochrome Design System
 *
 * @see docs/DESIGN_SYSTEM_SYNC_RULES.md - Section 6
 */

// HTML escape for XSS prevention
function escapeHtml(text: string | number | null | undefined): string {
  if (text == null) return ''
  const str = String(text)
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return str.replace(/[&<>"']/g, m => map[m])
}

export interface OpenDataWindowOptions {
  /** 파일명 (타이틀에 표시) */
  fileName: string
  /** 컬럼 목록 */
  columns: string[]
  /** 데이터 배열 */
  data: Record<string, unknown>[]
  /** 창 너비 (기본값: 1200) */
  width?: number
  /** 창 높이 (기본값: 800) */
  height?: number
}

/**
 * 데이터를 새 창에서 테이블 형태로 보여줍니다.
 *
 * @example
 * ```tsx
 * import { openDataWindow } from '@/lib/utils/open-data-window'
 *
 * const handleOpenNewWindow = useCallback(() => {
 *   if (!uploadedData) return
 *   openDataWindow({
 *     fileName: uploadedData.fileName,
 *     columns: uploadedData.columns,
 *     data: uploadedData.data
 *   })
 * }, [uploadedData])
 * ```
 */
export function openDataWindow(options: OpenDataWindowOptions): void {
  const { fileName, columns, data, width = 1200, height = 800 } = options

  if (!data || data.length === 0) return

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(fileName)} - 데이터 미리보기</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      height: 100%;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans KR', sans-serif;
      background: hsl(0 0% 96%);
    }
    .container {
      height: 100vh;
      display: flex;
      flex-direction: column;
      padding: 24px;
      gap: 16px;
    }
    .header {
      flex-shrink: 0;
      background: hsl(0 0% 100%);
      border: 1px solid hsl(0 0% 90%);
      border-radius: 12px;
      padding: 20px 24px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    h1 {
      font-size: 18px;
      font-weight: 600;
      color: hsl(0 0% 10%);
      margin-bottom: 4px;
    }
    .info {
      color: hsl(0 0% 45%);
      font-size: 14px;
    }
    .info strong {
      color: hsl(0 0% 20%);
      font-weight: 600;
    }
    .table-container {
      flex: 1;
      min-height: 0;
      background: hsl(0 0% 100%);
      border: 1px solid hsl(0 0% 90%);
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .table-wrapper {
      flex: 1;
      overflow: auto;
      min-height: 0;
    }
    .table-wrapper::-webkit-scrollbar { width: 8px; height: 8px; }
    .table-wrapper::-webkit-scrollbar-track { background: hsl(0 0% 96%); }
    .table-wrapper::-webkit-scrollbar-thumb { background: hsl(0 0% 80%); border-radius: 4px; }
    .table-wrapper::-webkit-scrollbar-thumb:hover { background: hsl(0 0% 65%); }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead { position: sticky; top: 0; z-index: 10; }
    th {
      background: hsl(0 0% 98%);
      color: hsl(0 0% 25%);
      font-weight: 600;
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid hsl(0 0% 90%);
      white-space: nowrap;
    }
    td {
      padding: 10px 16px;
      border-bottom: 1px solid hsl(0 0% 95%);
      color: hsl(0 0% 30%);
    }
    tr:hover td { background-color: hsl(0 0% 98%); }
    tr:last-child td { border-bottom: none; }
    .row-number {
      background: hsl(0 0% 98%);
      font-weight: 500;
      color: hsl(0 0% 55%);
      text-align: center;
      width: 50px;
      font-size: 12px;
      font-variant-numeric: tabular-nums;
    }
    tr:hover .row-number { background: hsl(0 0% 95%); color: hsl(0 0% 25%); }
    @media print {
      html, body { height: auto; overflow: visible; background: white; }
      .container { height: auto; padding: 0; }
      .header, .table-container { box-shadow: none; border: none; border-radius: 0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${escapeHtml(fileName)}</h1>
      <div class="info">총 <strong>${data.length.toLocaleString()}</strong>행 × <strong>${columns.length}</strong>개 변수</div>
    </div>
    <div class="table-container">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th class="row-number">#</th>
              ${columns.map(col => `<th>${escapeHtml(col)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map((row, idx) => `
              <tr>
                <td class="row-number">${idx + 1}</td>
                ${columns.map(col => `<td>${escapeHtml(String(row[col] ?? ''))}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</body>
</html>`

  const newWindow = window.open('', '_blank', `width=${width},height=${height},resizable=yes`)
  if (newWindow) {
    newWindow.document.write(html)
    newWindow.document.close()
  }
}
