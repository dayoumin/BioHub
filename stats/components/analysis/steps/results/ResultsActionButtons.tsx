'use client'

import { useState } from 'react'
import {
  ArrowLeft,
  FileText,
  BarChart3,
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmAlertDialog } from '@/components/common/ConfirmAlertDialog'
import type { ExportFormat, ExportContentOptions } from '@/lib/services/export/export-types'
import type { TerminologyDictionary } from '@/lib/terminology/terminology-types'

export interface ResultsActionButtonsProps {
  onBackToVariables: () => void
  onOpenGraphStudio: () => void
  onReanalyze: () => void
  onNewAnalysisConfirm: () => void
  onChangeMethodConfirm: () => void
  onSaveTemplate: () => void

  // 내보내기 다이얼로그
  exportDialogOpen: boolean
  onExportDialogOpenChange: (open: boolean) => void
  exportFormat: ExportFormat
  onExportFormatChange: (format: ExportFormat) => void
  exportOptions: ExportContentOptions
  onExportOptionsChange: (options: ExportContentOptions) => void
  onExportWithOptions: () => void
  isExporting: boolean
  hasUploadedData: boolean

  t: Pick<TerminologyDictionary, 'results'>
}

export function ResultsActionButtons({
  onBackToVariables,
  onOpenGraphStudio,
  onReanalyze,
  onNewAnalysisConfirm,
  onChangeMethodConfirm,
  onSaveTemplate,
  exportDialogOpen,
  onExportDialogOpenChange,
  exportFormat,
  onExportFormatChange,
  exportOptions,
  onExportOptionsChange,
  onExportWithOptions,
  isExporting,
  hasUploadedData,
  t,
}: ResultsActionButtonsProps): React.ReactElement {
  const [showNewAnalysisConfirm, setShowNewAnalysisConfirm] = useState(false)
  const [showChangeMethodConfirm, setShowChangeMethodConfirm] = useState(false)

  return (
    <>
      {/* ===== 액션 버튼 ===== */}
      <div className="flex items-center gap-2 flex-wrap pt-4 pb-2 mt-2 bg-surface-container/30 -mx-1 px-3 rounded-xl" data-testid="action-buttons">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBackToVariables}
          className="text-muted-foreground hover:text-foreground text-sm h-9"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          {t.results.buttons.backToVariables}
        </Button>

        <div className="flex-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground text-sm h-9 px-2"
              aria-label={t.results.buttons.moreActions}
              data-testid="more-actions-btn"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowChangeMethodConfirm(true)} data-testid="change-method-btn">
              <RefreshCw className="w-4 h-4 mr-2" />
              {t.results.buttons.changeMethod}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onSaveTemplate}>
              <FileText className="w-4 h-4 mr-2" />
              {t.results.buttons.saveTemplate}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenGraphStudio} data-testid="open-graph-studio-btn">
              <BarChart3 className="w-4 h-4 mr-2" />
              Graph Studio
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-5 bg-surface-container-highest/50" />

        <Button
          variant="secondary"
          size="sm"
          onClick={onReanalyze}
          className="text-sm h-9"
          data-testid="reanalysis-btn"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          {t.results.buttons.reanalyze}
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={() => setShowNewAnalysisConfirm(true)}
          className="text-sm h-9"
          data-testid="new-analysis-btn"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          {t.results.buttons.newAnalysis}
        </Button>
      </div>

      {/* 새 분석 시작 확인 */}
      <ConfirmAlertDialog
        open={showNewAnalysisConfirm}
        onOpenChange={setShowNewAnalysisConfirm}
        title={t.results.confirm.newAnalysis.title}
        description={t.results.confirm.newAnalysis.description}
        cancelLabel={t.results.confirm.newAnalysis.cancel}
        confirmLabel={t.results.confirm.newAnalysis.confirm}
        onConfirm={onNewAnalysisConfirm}
      />

      {/* 방법 변경 확인 */}
      <ConfirmAlertDialog
        open={showChangeMethodConfirm}
        onOpenChange={setShowChangeMethodConfirm}
        title={t.results.confirm.changeMethod.title}
        description={t.results.confirm.changeMethod.description}
        cancelLabel={t.results.confirm.changeMethod.cancel}
        confirmLabel={t.results.confirm.changeMethod.confirm}
        onConfirm={onChangeMethodConfirm}
      />

      {/* 내보내기 옵션 다이얼로그 */}
      <Dialog open={exportDialogOpen} onOpenChange={onExportDialogOpenChange}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{t.results.exportDialog.title}</DialogTitle>
            <DialogDescription>
              {t.results.exportDialog.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label>{t.results.exportDialog.formatLabel}</Label>
              <RadioGroup
                value={exportFormat}
                onValueChange={(value) => onExportFormatChange(value as ExportFormat)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="docx" id="export-docx" />
                  <Label htmlFor="export-docx">Word (.docx)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="xlsx" id="export-xlsx" />
                  <Label htmlFor="export-xlsx">Excel (.xlsx)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="html" id="export-html" />
                  <Label htmlFor="export-html">HTML (.html)</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>{t.results.exportDialog.contentLabel}</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="opt-interpretation"
                    checked={!!exportOptions.includeInterpretation}
                    onCheckedChange={(checked) => onExportOptionsChange({ ...exportOptions, includeInterpretation: !!checked })}
                  />
                  <Label htmlFor="opt-interpretation">{t.results.exportDialog.includeInterpretation}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="opt-raw-data"
                    checked={!!exportOptions.includeRawData}
                    disabled={!hasUploadedData}
                    onCheckedChange={(checked) => onExportOptionsChange({ ...exportOptions, includeRawData: !!checked })}
                  />
                  <Label htmlFor="opt-raw-data">{t.results.exportDialog.includeRawData}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="opt-methodology"
                    checked={!!exportOptions.includeMethodology}
                    onCheckedChange={(checked) => onExportOptionsChange({ ...exportOptions, includeMethodology: !!checked })}
                  />
                  <Label htmlFor="opt-methodology">{t.results.exportDialog.includeMethodology}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="opt-references"
                    checked={!!exportOptions.includeReferences}
                    onCheckedChange={(checked) => onExportOptionsChange({ ...exportOptions, includeReferences: !!checked })}
                  />
                  <Label htmlFor="opt-references">{t.results.exportDialog.includeReferences}</Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onExportDialogOpenChange(false)}>
              {t.results.exportDialog.cancel}
            </Button>
            <Button onClick={onExportWithOptions} disabled={isExporting}>
              {t.results.exportDialog.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
