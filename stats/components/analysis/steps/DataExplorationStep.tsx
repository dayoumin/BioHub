'use client'

import { memo, useState, useMemo, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChartScatter, ListOrdered, ExternalLink, BarChart3, Flame, AlertTriangle, Lightbulb, Upload, FileText } from 'lucide-react'
import { ValidationResults, DataRow } from '@/types/analysis'
import { DataProfileSummary } from '@/components/common/analysis/DataProfileSummary'
import { EmptyState } from '@/components/common/EmptyState'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { useModeStore } from '@/lib/stores/mode-store'
import { StepHeader, CollapsibleSection } from '@/components/analysis/common'
import { DescriptiveStatsTable } from './exploration/DescriptiveStatsTable'
import { DistributionChartSection } from './exploration/DistributionChartSection'
import { ScatterHeatmapSection } from './exploration/ScatterHeatmapSection'
import { openDataWindow } from '@/lib/utils/open-data-window'
import { DataPreviewTable } from '@/components/common/analysis/DataPreviewTable'
import { DataUploadStep } from '@/components/analysis/steps/DataUploadStep'
import { OutlierDetailPanel } from '@/components/common/analysis/OutlierDetailPanel'
import { DataPrepGuide } from '@/components/statistics/common/DataPrepGuide'
import { TemplateSelector } from '@/components/analysis/TemplateSelector'
import { TemplateManagePanel } from '@/components/analysis/TemplateManagePanel'
import { useTemplateStore } from '@/lib/stores/template-store'
import type { AnalysisTemplate } from '@/types/analysis'
import { getExplorationProfile } from '@/lib/utils/exploration-profile'
import { useTerminology } from '@/hooks/use-terminology'
import { useDescriptiveStats } from '@/hooks/use-descriptive-stats'
import { useCorrelationData } from '@/hooks/use-correlation-data'

interface DataExplorationStepProps {
  validationResults: ValidationResults | null
  data: DataRow[]
  onUploadComplete?: (file: File, data: DataRow[]) => void
  existingFileName?: string
  /** 템플릿 선택 시 콜백 */
  onTemplateSelect?: (template: AnalysisTemplate) => void
}


export const DataExplorationStep = memo(function DataExplorationStep({
  validationResults,
  data,
  onUploadComplete,
  existingFileName,
  onTemplateSelect
}: DataExplorationStepProps) {
  // Terminology System
  const t = useTerminology()

  // Store
  const { uploadedFile, uploadedFileName, selectedMethod } = useAnalysisStore()
  const { stepTrack } = useModeStore()
  const isQuickMode = stepTrack === 'quick'

  // 빠른 분석 모드: 방법에 맞는 탐색 프로필
  const profile = useMemo(
    () => getExplorationProfile(isQuickMode ? selectedMethod : null),
    [isQuickMode, selectedMethod]
  )

  // 템플릿 관련 상태
  const { recentTemplates, loadTemplates: loadTemplatesFromDB } = useTemplateStore()
  const [templatePanelOpen, setTemplatePanelOpen] = useState(false)

  // 데이터 교체 모드 (기존 데이터 있을 때 재업로드 허용)
  const [isReplaceMode, setIsReplaceMode] = useState(false)

  // 템플릿 목록 로드
  useEffect(() => {
    loadTemplatesFromDB()
  }, [loadTemplatesFromDB])

  // 템플릿 선택 핸들러
  const handleTemplateSelect = useCallback((template: AnalysisTemplate) => {
    onTemplateSelect?.(template)
  }, [onTemplateSelect])

  // 새 창으로 데이터 보기
  const handleOpenDataInNewWindow = useCallback(() => {
    if (!data || data.length === 0) return
    const columns = Object.keys(data[0])
    openDataWindow({
      fileName: uploadedFile?.name || uploadedFileName || t.dataExploration.fallbackFileName,
      columns,
      data
    })
  }, [data, uploadedFile, uploadedFileName, t])

  // 이상치 상세 모달 상태
  const [outlierModalOpen, setOutlierModalOpen] = useState(false)
  const [selectedOutlierVar, setSelectedOutlierVar] = useState<string | null>(null)

  // 데이터 미리보기 탭에서 하이라이트할 행들
  const [highlightedRows, setHighlightedRows] = useState<number[]>([])

  const [highlightedColumn, setHighlightedColumn] = useState<string | undefined>(undefined)

  // 이상치가 포함된 행만 미리보기에서 확인하기 위한 필터링 데이터
  const highlightedPreview = useMemo(() => {
    if (highlightedRows.length === 0) {
      return { rows: [] as DataRow[], rowIndices: [] as number[] }
    }

    const sortedIndices = Array.from(new Set(highlightedRows)).sort((a, b) => a - b)
    const rows: DataRow[] = []
    const rowIndices: number[] = []

    sortedIndices.forEach(idx => {
      const row = data[idx - 1]
      if (row !== undefined) {
        rows.push(row)
        rowIndices.push(idx)
      }
    })

    return { rows, rowIndices }
  }, [data, highlightedRows])

  // 기술통계 & 분포 섹션: EDA 핵심이므로 기본 펼침
  const [detailOpen, setDetailOpen] = useState(true)
  // 상관분석 섹션: 보조 정보이므로 기본 접힘
  const [correlationOpen, setCorrelationOpen] = useState(false)

  const {
    numericVariables,
    categoricalVariables,
    numericDistributions,
    totalOutlierCount,
    formatStat,
    getOutlierDetails
  } = useDescriptiveStats(validationResults, data)

  const { correlationMatrix, heatmapMatrix, getPairedData } = useCorrelationData(data, numericVariables)

  // 이상치 모달 열기 핸들러
  const handleOpenOutlierModal = useCallback((varName: string) => {
    setSelectedOutlierVar(varName)
    setOutlierModalOpen(true)
  }, [])

  // 이상치 데이터에서 보기 핸들러
  const handleViewOutliersInData = useCallback((rowIndices: number[]) => {
    setHighlightedRows(rowIndices)
    setHighlightedColumn(selectedOutlierVar ?? undefined)
  }, [selectedOutlierVar])

  // 데이터 교체 완료 핸들러
  const handleReplaceUploadComplete = useCallback((file: File, newData: DataRow[]) => {
    setIsReplaceMode(false)
    onUploadComplete?.(file, newData)
  }, [onUploadComplete])

  // 데이터 없을 때 또는 교체 모드: 업로드 영역 표시
  if (!validationResults || !data || data.length === 0 || isReplaceMode) {
    return (
      <div className="space-y-6" data-testid="data-exploration-empty">
        {/* 헤더 */}
        <StepHeader icon={ChartScatter} title={t.analysis.stepTitles.dataExploration} />

        {/* 데이터 교체 모드 배너 */}
        {isReplaceMode && (
          <Card className="border-info-border bg-info-bg">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-info" />
                  <span className="text-sm font-medium text-info">
                    {t.dataExploration.replaceMode.title}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsReplaceMode(false)}
                  className="text-xs h-7"
                >
                  {t.dataExploration.replaceMode.cancel}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <EmptyState
          icon={ChartScatter}
          title={isReplaceMode ? t.dataExploration.replaceMode.title : t.dataExploration.empty.title}
          description={isReplaceMode ? undefined : t.dataExploration.empty.description}
          action={
            onUploadComplete && (
              <DataUploadStep
                onUploadComplete={isReplaceMode ? handleReplaceUploadComplete : onUploadComplete}
                existingFileName={existingFileName}
              />
            )
          }
          className="border-dashed border-2 border-muted-foreground/25"
        />

        {/* 데이터 준비 안내: 빠른 분석이면 방법별, 아니면 범용 */}
        <DataPrepGuide
          methodId={isQuickMode && selectedMethod ? selectedMethod.id : undefined}
          defaultCollapsed
        />

        {/* 템플릿 선택 영역 (저장된 템플릿이 있을 때만 표시) */}
        {recentTemplates.length > 0 && (
          <Card>
            <CardContent className="py-4">
              <TemplateSelector
                compact
                maxItems={3}
                onSelect={handleTemplateSelect}
                onViewAll={() => setTemplatePanelOpen(true)}
              />
            </CardContent>
          </Card>
        )}

        {/* 템플릿 관리 패널 */}
        <TemplateManagePanel
          open={templatePanelOpen}
          onOpenChange={setTemplatePanelOpen}
          onSelect={handleTemplateSelect}
        />

        {/* 지원 기능 안내 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 bg-muted/20 border border-border/20 rounded-xl hover:bg-muted/30 transition-colors duration-200">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <ListOrdered className="h-4 w-4 text-primary" />
            </div>
            <h4 className="font-semibold text-sm tracking-tight">{t.dataExploration.features.descriptiveTitle}</h4>
            <p className="text-xs text-muted-foreground/80 mt-1.5 leading-relaxed">{t.dataExploration.features.descriptiveDesc}</p>
          </div>
          <div className="p-4 bg-muted/20 border border-border/20 rounded-xl hover:bg-muted/30 transition-colors duration-200">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <h4 className="font-semibold text-sm tracking-tight">{t.dataExploration.features.distributionTitle}</h4>
            <p className="text-xs text-muted-foreground/80 mt-1.5 leading-relaxed">{t.dataExploration.features.distributionDesc}</p>
          </div>
          <div className="p-4 bg-muted/20 border border-border/20 rounded-xl hover:bg-muted/30 transition-colors duration-200">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <Flame className="h-4 w-4 text-primary" />
            </div>
            <h4 className="font-semibold text-sm tracking-tight">{t.dataExploration.features.correlationTitle}</h4>
            <p className="text-xs text-muted-foreground/80 mt-1.5 leading-relaxed">{t.dataExploration.features.correlationDesc}</p>
          </div>
        </div>
      </div>
    )
  }

  // 수치형 변수 부족: 데이터 표시 + 경고
  if (numericVariables.length < 2) {
    return (
      <div className="space-y-6" data-testid="data-exploration-empty">
        {/* 헤더 + 다음 단계 버튼 */}
        <StepHeader icon={ChartScatter} title={t.analysis.stepTitles.dataExploration} />

        {isQuickMode && profile.focusHint && data.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-info-bg rounded-lg border border-info-border text-sm">
            <Lightbulb className="h-4 w-4 text-info flex-shrink-0" />
            <span className="text-info">{profile.focusHint}</span>
          </div>
        )}

        <DataProfileSummary
          sampleSize={data.length}
          numericVars={numericVariables.length}
          categoricalVars={categoricalVariables.length}
          missingValues={validationResults.missingValues}
          totalCells={data.length * validationResults.columnCount}
          recommendedType={data.length >= 30 ? 'parametric' : 'nonparametric'}
          status="warning"
          warnings={[t.dataExploration.warnings.fewNumericVars]}
        />

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{t.dataExploration.preview.title}</CardTitle>
                <CardDescription>{t.dataExploration.preview.topN(Math.min(20, data.length))}</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleOpenDataInNewWindow} className="gap-2">
                <ExternalLink className="w-4 h-4" />
                {t.dataExploration.preview.viewAll(data.length)}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <DataPreviewTable data={data} maxRows={20} defaultOpen={true} title="" height="300px" />
          </CardContent>
        </Card>

        {/* 빠른 분석: 업로드 직후 데이터 적합성 검증 */}
        {isQuickMode && selectedMethod && (
          <DataPrepGuide
            methodId={selectedMethod.id}
            uploadedData={data}
            defaultCollapsed
          />
        )}

        {!isQuickMode && (
          <Card className="border-warning-border bg-warning-bg">
            <CardContent className="py-6">
              <div className="text-center text-muted-foreground">
                <p>{t.dataExploration.warnings.correlationRequires}</p>
                <p className="text-sm mt-2">{t.dataExploration.warnings.currentStatus(numericVariables.length, categoricalVariables.length)}</p>
                <p className="text-sm mt-1">{t.dataExploration.warnings.nextStepHint}</p>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="data-exploration-step">
      {/* 헤더 */}
      <StepHeader icon={ChartScatter} title={t.analysis.stepTitles.dataExploration} />

      {isQuickMode && profile.focusHint && data.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-info-bg rounded-lg border border-info-border text-sm">
          <Lightbulb className="h-4 w-4 text-info flex-shrink-0" />
          <span className="text-info">{profile.focusHint}</span>
        </div>
      )}

      {/* ── 2-column 레이아웃 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">

        {/* ── 좌: 업로드 완료 카드 + 데이터 미리보기 ── */}
        <div className="space-y-4 min-w-0">

          {/* 업로드 완료 카드 (점선 테두리) */}
          <div className="flex items-center justify-between p-4 border-2 border-dashed border-border rounded-xl bg-muted/10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">
                  {uploadedFile?.name || uploadedFileName || t.dataExploration.fallbackFileName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t.dataExploration.columnPanel.rowColCount(data.length, validationResults?.columnCount ?? Object.keys(data[0] ?? {}).length)}
                </p>
              </div>
            </div>
            {onUploadComplete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReplaceMode(true)}
                className="gap-1.5 shrink-0"
                data-testid="replace-data-button"
              >
                <Upload className="w-3.5 h-3.5" />
                {t.dataExploration.replaceMode.button}
              </Button>
            )}
          </div>

          {/* 데이터 미리보기 */}
          <Card className="border-border/40 shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">{t.dataExploration.preview.title}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs font-mono tabular-nums">{t.dataExploration.columnPanel.rowCount(data.length)}</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenDataInNewWindow}
                    className="gap-1.5 h-7 text-xs"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {t.dataExploration.tabs.fullDataView(data.length)}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {highlightedRows.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2.5 bg-warning-bg rounded-lg border border-warning-border">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-warning">&#9679;</span>
                      <span className="font-medium text-warning-muted">
                        {t.dataExploration.highlight.description(highlightedColumn ?? '', highlightedRows.length)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => { setHighlightedRows([]); setHighlightedColumn(undefined) }}
                    >
                      {t.dataExploration.highlight.clearButton}
                    </Button>
                  </div>
                  {highlightedPreview.rowIndices.length > 0 ? (
                    <DataPreviewTable
                      data={highlightedPreview.rows}
                      maxRows={highlightedPreview.rows.length || 1}
                      defaultOpen={true}
                      title=""
                      height="300px"
                      rowIndices={highlightedPreview.rowIndices}
                      highlightRows={highlightedPreview.rowIndices}
                      highlightColumn={highlightedColumn}
                    />
                  ) : (
                    <div className="p-3 text-sm text-muted-foreground border rounded-md bg-muted/30">
                      {t.dataExploration.highlight.notFound}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {data.length <= 10 ? (
                    <DataPreviewTable data={data} maxRows={10} defaultOpen={true} title="" height="auto" />
                  ) : (
                    (() => {
                      const topRows = data.slice(0, 5)
                      const bottomRows = data.slice(-5)
                      const omittedCount = data.length - 10
                      const indices = [1, 2, 3, 4, 5].concat(
                        [...Array(5).keys()].map(i => data.length - 4 + i)
                      )
                      return (
                        <DataPreviewTable
                          data={[...topRows, ...bottomRows]}
                          maxRows={10}
                          defaultOpen={true}
                          title=""
                          height="auto"
                          omittedRows={omittedCount}
                          omitAfterIndex={4}
                          rowIndices={indices}
                        />
                      )
                    })()
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* 빠른 분석: 데이터 적합성 검증 */}
          {isQuickMode && selectedMethod && (
            <DataPrepGuide methodId={selectedMethod.id} uploadedData={data} defaultCollapsed />
          )}
        </div>

        {/* ── 우: 컬럼 정보 패널 ── */}
        <div className="space-y-4">
          <Card className="border-border/40 shadow-sm lg:sticky lg:top-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">{t.dataExploration.columnPanel.title}</CardTitle>
                {validationResults && (
                  <Badge
                    variant={!validationResults.isValid ? 'destructive' : (validationResults.warnings?.length ?? 0) > 0 ? 'outline' : 'secondary'}
                    className="text-[10px]"
                  >
                    {!validationResults.isValid ? t.dataExploration.columnPanel.statusError : (validationResults.warnings?.length ?? 0) > 0 ? t.dataExploration.columnPanel.statusWarning : t.dataExploration.columnPanel.statusNormal}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* 수치형 / 범주형 카운트 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/50">
                  <p className="text-[11px] text-muted-foreground">{t.dataExploration.columnPanel.numeric}</p>
                  <p className="text-lg font-semibold font-mono tabular-nums">{numericVariables.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200/50 dark:border-green-800/50">
                  <p className="text-[11px] text-muted-foreground">{t.dataExploration.columnPanel.categorical}</p>
                  <p className="text-lg font-semibold font-mono tabular-nums">{categoricalVariables.length}</p>
                </div>
              </div>

              {/* 요약 수치 */}
              <div className="space-y-0 text-sm">
                <div className="flex items-center justify-between py-1.5 border-b border-border/30">
                  <span className="text-muted-foreground">{t.dataExploration.columnPanel.sampleSize}</span>
                  <span className="font-mono tabular-nums font-medium">{data.length}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border/30">
                  <span className="text-muted-foreground">{t.dataExploration.columnPanel.missingValuesLabel}</span>
                  <span className="font-mono tabular-nums font-medium">{t.dataExploration.columnPanel.missingValues(validationResults?.missingValues ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-muted-foreground">{t.dataExploration.columnPanel.totalColumns}</span>
                  <span className="font-mono tabular-nums font-medium">{validationResults?.columnCount ?? 0}</span>
                </div>
              </div>

              {/* 권장 분석 유형 */}
              {data.length > 0 && (
                <div className="flex items-center justify-between py-1.5 text-sm">
                  <span className="text-muted-foreground">{t.dataExploration.columnPanel.recommendedAnalysis}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {data.length >= 30 ? t.dataExploration.columnPanel.parametric : t.dataExploration.columnPanel.nonParametric}
                  </Badge>
                </div>
              )}

              {/* 검증 오류 */}
              {validationResults && (validationResults.errors?.length ?? 0) > 0 && (
                <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/30">
                  <div className="flex items-start gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-destructive leading-relaxed">
                      {validationResults.errors?.map((e, i) => <p key={i}>{e}</p>)}
                    </div>
                  </div>
                </div>
              )}

              {/* 검증 경고 */}
              {validationResults && (validationResults.warnings?.length ?? 0) > 0 && (
                <div className="p-2.5 rounded-lg bg-warning-bg border border-warning-border">
                  <div className="flex items-start gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-warning flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-warning leading-relaxed">
                      {validationResults.warnings?.map((w, i) => <p key={i}>{w}</p>)}
                    </div>
                  </div>
                </div>
              )}

              {/* 컬럼 목록 */}
              {validationResults?.columnStats && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{t.dataExploration.columnPanel.columnList}</p>
                  <div className="max-h-[200px] overflow-y-auto space-y-0.5">
                    {validationResults.columnStats.map(col => (
                      <div key={col.name} className="flex items-center justify-between py-1 px-2 rounded text-xs hover:bg-muted/30 transition-colors">
                        <span className="truncate font-medium">{col.name}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0 ml-2">
                          {col.type === 'numeric' ? t.dataExploration.columnPanel.numericShort : t.dataExploration.columnPanel.categoricalShort}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── 상세 분석 (접이식) ── */}
      <CollapsibleSection
        label={t.dataExploration.tabs.statistics}
        icon={<ListOrdered className="h-4 w-4" />}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        badge={totalOutlierCount > 0 ? (
          <Badge variant="secondary" className="text-[10px] font-mono">
            {t.dataExploration.outlier.count(totalOutlierCount)}
          </Badge>
        ) : undefined}
        data-testid="detail-analysis-section"
      >
        <div className="space-y-6 pt-4">
          {/* 기술통계 테이블 (이상치 배너 + 테이블 + 해석 가이드) */}
          <DescriptiveStatsTable
            numericDistributions={numericDistributions}
            formatStat={formatStat}
            totalOutlierCount={totalOutlierCount}
            onOpenOutlierModal={handleOpenOutlierModal}
          />

          {/* 데이터 분포 시각화 */}
          <DistributionChartSection
            data={data}
            numericVariables={numericVariables}
            visibility={profile.distribution}
            defaultChartType={profile.defaultChartType ?? 'histogram'}
          />
        </div>
      </CollapsibleSection>

      {/* ── 상관분석 (접이식, 기본 접힘) ── */}
      {/* numericVariables >= 2 는 위 early return으로 보장됨 */}
      <CollapsibleSection
        label={t.dataExploration.features.correlationTitle}
        icon={<Flame className="h-4 w-4" />}
        open={correlationOpen}
        onOpenChange={setCorrelationOpen}
        data-testid="correlation-analysis-section"
      >
        <div className="space-y-6 pt-4">
          <ScatterHeatmapSection
            numericVariables={numericVariables}
            correlationMatrix={correlationMatrix}
            heatmapMatrix={heatmapMatrix}
            scatterVisibility={profile.scatterplots}
            heatmapVisibility={profile.correlationHeatmap}
            getPairedData={getPairedData}
          />
        </div>
      </CollapsibleSection>

      {/* 이상치 상세 모달 */}
      {selectedOutlierVar && (() => {
        const details = getOutlierDetails(selectedOutlierVar)
        if (!details) return null

        return (
          <OutlierDetailPanel
            open={outlierModalOpen}
            onOpenChange={setOutlierModalOpen}
            variableName={selectedOutlierVar}
            outliers={details.outliers}
            statistics={details.statistics}
            onViewInData={handleViewOutliersInData}
          />
        )
      })()}

    </div>
  )
})

export default DataExplorationStep
