/**
 * 통합 내보내기 서비스
 *
 * ExportContext를 받아 NormalizedExportData로 변환 후
 * 선택된 포맷에 따라 해당 exporter를 호출합니다.
 */

import type { ExportContext, ExportFormat, ExportResult } from './export-types'
import { buildExportData } from './export-data-builder'

export class ExportService {
  static async export(
    context: ExportContext,
    format: ExportFormat,
  ): Promise<ExportResult> {
    // 1. 데이터 정규화
    const data = buildExportData(context)

    // 2. 포맷별 내보내기 (dynamic import로 코드 분할)
    switch (format) {
      case 'docx': {
        const { exportDocx } = await import('./docx-export')
        return exportDocx(data)
      }
      case 'xlsx': {
        const { exportExcel } = await import('./excel-export')
        return exportExcel(data)
      }
      default: {
        return { success: false, error: `Unsupported format: ${format}` }
      }
    }
  }
}
