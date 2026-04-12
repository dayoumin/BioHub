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
import type { ExportFormat, ExportContentOptions } from '@/lib/services'
import type { TerminologyDictionary } from '@/lib/terminology'

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
  showBackToVariables?: boolean

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
  showBackToVariables = true,
  t,
}: ResultsActionButtonsProps): React.ReactElement {
  const [showNewAnalysisConfirm, setShowNewAnalysisConfirm] = useState(false)
  const [showChangeMethodConfirm, setShowChangeMethodConfirm] = useState(false)
  const newAnalysisConfirm = t.results.confirm?.newAnalysis ?? {
    title: t.results.buttons.newAnalysis,
    description: '',
    cancel: '취소',
    confirm: t.results.buttons.newAnalysis,
  }
  const changeMethodConfirm = t.results.confirm?.changeMethod ?? {
    title: t.results.buttons.changeMethod,
    description: '',
    cancel: '취소',
    confirm: t.results.buttons.changeMethod,
  }

  return (
    <>
      {/* ===== 액션 버튼 ===== */}
      <div className="rounded-2xl border border-border/50 bg-surface-container-lowest px-4 py-4" data-testid="action-buttons">
        <div className="space-y-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">다음 작업</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              지금 결과를 다듬을지, 새 분석 흐름을 시작할지 선택할 수 있습니다.
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
            <div className="rounded-xl border border-border/50 bg-background/70 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                현재 결과 이어서
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                같은 데이터와 방법을 유지한 채 변수나 설정을 조정합니다.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {showBackToVariables ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onBackToVariables}
                    className="h-10 px-4 border-border/50"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                    {t.results.buttons.backToVariables}
                  </Button>
                ) : null}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onReanalyze}
                  className="h-10 px-4"
                  data-testid="reanalysis-btn"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  {t.results.buttons.reanalyze}
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-border/50 bg-surface-container-low/40 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                새 흐름 시작
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                현재 결과와 분리해서 새 데이터나 새 분석 목적부터 다시 시작합니다.
              </p>
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowNewAnalysisConfirm(true)}
                className="mt-4 h-10 w-full px-4"
                data-testid="new-analysis-btn"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                {t.results.buttons.newAnalysis}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/70 px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">보조 도구</p>
              <p className="mt-1 text-sm font-medium text-foreground">추가 작업</p>
              <p className="text-xs text-muted-foreground">
                방법 변경, 템플릿 저장, Graph Studio 이동
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 px-4 border-border/50"
                  aria-label={t.results.buttons.moreActions}
                  data-testid="more-actions-btn"
                >
                  <MoreHorizontal className="w-4 h-4 mr-1.5" />
                  <span>{t.results.buttons.moreActions}</span>
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
          </div>
        </div>
      </div>

      {/* 새 분석 시작 확인 */}
      <ConfirmAlertDialog
        open={showNewAnalysisConfirm}
        onOpenChange={setShowNewAnalysisConfirm}
        title={newAnalysisConfirm.title}
        description={newAnalysisConfirm.description}
        cancelLabel={newAnalysisConfirm.cancel}
        confirmLabel={newAnalysisConfirm.confirm}
        onConfirm={onNewAnalysisConfirm}
      />

      {/* 방법 변경 확인 */}
      <ConfirmAlertDialog
        open={showChangeMethodConfirm}
        onOpenChange={setShowChangeMethodConfirm}
        title={changeMethodConfirm.title}
        description={changeMethodConfirm.description}
        cancelLabel={changeMethodConfirm.cancel}
        confirmLabel={changeMethodConfirm.confirm}
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
