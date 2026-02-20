'use client'

import { useState, useCallback } from 'react'
import { FileDown, FileText, Table2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ExportService } from '@/lib/services/export/export-service'
import type { ExportFormat, ExportContext } from '@/lib/services/export/export-types'
import type { AnalysisResult } from '@/types/smart-flow'
import type { StatisticalResult } from '@/components/statistics/common/StatisticalResultCard'
import type { ResultsText } from '@/lib/terminology/terminology-types'

interface ExportDropdownProps {
  results: AnalysisResult
  statisticalResult: StatisticalResult
  interpretation: string | null
  apaFormat: string | null
  dataInfo: ExportContext['dataInfo']
  rawDataRows?: ExportContext['rawDataRows']
  t: ResultsText
}

export function ExportDropdown({
  results,
  statisticalResult,
  interpretation,
  apaFormat,
  dataInfo,
  rawDataRows,
  t,
}: ExportDropdownProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = useCallback(async (format: ExportFormat) => {
    setIsExporting(true)

    try {
      const context: ExportContext = {
        analysisResult: results,
        statisticalResult,
        aiInterpretation: interpretation,
        apaFormat,
        exportOptions: {
          includeInterpretation: true,
          includeRawData: false,
          includeMethodology: false,
          includeReferences: false,
          includeCharts: false,
        },
        dataInfo,
        rawDataRows: rawDataRows ?? null,
      }

      const result = await ExportService.export(context, format)

      if (result.success) {
        toast.success(t.toast.exportSuccess)
      } else {
        toast.error(t.toast.exportError, { description: result.error })
      }
    } catch (error) {
      console.error('Export failed:', error)
      toast.error(t.toast.exportError)
    } finally {
      setIsExporting(false)
    }
  }, [results, statisticalResult, interpretation, apaFormat, dataInfo, rawDataRows, t])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isExporting}
          className="flex-1"
          data-testid="export-dropdown"
        >
          <FileDown className="w-4 h-4 mr-1.5" />
          {isExporting ? t.buttons.exporting : t.buttons.export}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleExport('docx')}
          data-testid="export-docx"
        >
          <FileText className="w-4 h-4 mr-2" />
          {t.buttons.exportDocx}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport('xlsx')}
          data-testid="export-xlsx"
        >
          <Table2 className="w-4 h-4 mr-2" />
          {t.buttons.exportExcel}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport('html')}
          data-testid="export-html"
        >
          <FileText className="w-4 h-4 mr-2" />
          HTML (.html)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
