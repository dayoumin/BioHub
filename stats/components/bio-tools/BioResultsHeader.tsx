'use client'

import { memo, useCallback } from 'react'
import { Save, Check, Download, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { TOAST } from '@/lib/constants/toast-messages'
import type { ExportableTable } from '@/lib/bio-tools/bio-export-csv'
import { tablesToCsvString, downloadAsCsv, copyAsCsv } from '@/lib/bio-tools/bio-export-csv'

interface BioResultsHeaderProps {
  onSave?: () => void
  isSaved?: boolean
  /** 내보내기 데이터 — 제공 시 CSV/복사 버튼 표시 */
  exportData?: ExportableTable[]
  /** 파일명에 사용할 도구 이름 */
  toolName?: string
}

/** 결과 섹션 상단 액션 바 — 저장 + 내보내기 */
export const BioResultsHeader = memo(function BioResultsHeader({ onSave, isSaved, exportData, toolName }: BioResultsHeaderProps): React.ReactElement {
  const handleDownload = useCallback(() => {
    if (!exportData?.length) return
    const csv = tablesToCsvString(exportData)
    const slug = toolName?.replace(/\s+/g, '_') ?? 'bio-tools'
    downloadAsCsv(csv, `${slug}_${Date.now()}.csv`)
  }, [exportData, toolName])

  const handleCopy = useCallback(async () => {
    if (!exportData?.length) return
    const csv = tablesToCsvString(exportData)
    const ok = await copyAsCsv(csv)
    if (ok) toast.success(TOAST.clipboard.copySuccess)
    else toast.error(TOAST.clipboard.copyError)
  }, [exportData])

  const hasExport = exportData && exportData.length > 0

  return (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold">분석 결과</h3>
      <div className="flex items-center gap-1.5">
        {hasExport && (
          <>
            <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 text-xs gap-1.5">
              <Copy className="h-3.5 w-3.5" />복사
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDownload} className="h-7 text-xs gap-1.5">
              <Download className="h-3.5 w-3.5" />CSV
            </Button>
          </>
        )}
        {onSave && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            disabled={isSaved}
            className="h-7 text-xs gap-1.5"
          >
            {isSaved ? (
              <><Check className="h-3.5 w-3.5" />저장됨</>
            ) : (
              <><Save className="h-3.5 w-3.5" />저장</>
            )}
          </Button>
        )}
      </div>
    </div>
  )
})
