'use client'

import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  ChartScatter,
  ExternalLink,
  ListOrdered,
  Loader2,
  Table2,
  TrendingUp,
} from 'lucide-react'

import { StepHeader } from '@/components/analysis/common'
import { TemplateManagePanel } from '@/components/analysis/TemplateManagePanel'
import { TemplateSelector } from '@/components/analysis/TemplateSelector'
import { DataPreviewTable } from '@/components/common/analysis/DataPreviewTable'
import { OutlierDetailPanel } from '@/components/common/analysis/OutlierDetailPanel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { DataUploadStep } from '@/components/analysis/steps/DataUploadStep'
import { DataPrepGuide } from '@/components/statistics/common/DataPrepGuide'
import { cn } from '@/lib/utils'
import { getExplorationProfile } from '@/lib/utils/exploration-profile'
import { useTerminology } from '@/hooks/use-terminology'
import { useCorrelationData } from '@/hooks/use-correlation-data'
import { useDescriptiveStats } from '@/hooks/use-descriptive-stats'
import { useLeveneTest } from '@/hooks/use-levene-test'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { useModeStore } from '@/lib/stores/mode-store'
import { useTemplateStore } from '@/lib/stores/template-store'
import { summarizeNormality } from '@/lib/utils/stats-math'
import type { AnalysisTemplate, DataRow, ValidationResults } from '@/types/analysis'

import { DescriptiveStatsTable } from './exploration/DescriptiveStatsTable'
import { DistributionChartSection } from './exploration/DistributionChartSection'
import { ScatterHeatmapSection } from './exploration/ScatterHeatmapSection'
import { SummaryCard, type CardId } from './exploration/SummaryCard'

const MAX_PREVIEW_VARS = 5

function mergeVisibility(...values: Array<'primary' | 'secondary' | 'hidden'>): 'primary' | 'secondary' | 'hidden' {
  if (values.includes('primary')) return 'primary'
  if (values.includes('secondary')) return 'secondary'
  return 'hidden'
}

interface DataExplorationStepProps {
  validationResults: ValidationResults | null
  data: DataRow[]
  onUploadComplete?: (file: File, data: DataRow[]) => void
  existingFileName?: string
  onTemplateSelect?: (template: AnalysisTemplate) => void
  onNext?: () => void
  canProceedNext?: boolean
  nextLabel?: string
}

export const DataExplorationStep = memo(function DataExplorationStep({
  validationResults,
  data,
  onUploadComplete,
  existingFileName,
  onTemplateSelect,
  onNext,
  canProceedNext = false,
  nextLabel,
}: DataExplorationStepProps) {
  const t = useTerminology()
  const { uploadedFile, uploadedFileName, selectedMethod } = useAnalysisStore()
  const { stepTrack } = useModeStore()
  const { recentTemplates, loadTemplates } = useTemplateStore()

  const isQuickMode = stepTrack === 'quick'
  const profile = useMemo(
    () => getExplorationProfile(isQuickMode ? selectedMethod : null),
    [isQuickMode, selectedMethod]
  )

  const [selectedCard, setSelectedCard] = useState<CardId>('descriptive')
  const [templatePanelOpen, setTemplatePanelOpen] = useState(false)
  const [previewSheetOpen, setPreviewSheetOpen] = useState(false)
  const [fullStatsOpen, setFullStatsOpen] = useState(false)
  const [outlierModalOpen, setOutlierModalOpen] = useState(false)
  const [selectedOutlierVar, setSelectedOutlierVar] = useState<string | null>(null)
  const [highlightedRows, setHighlightedRows] = useState<number[]>([])
  const [highlightedColumn, setHighlightedColumn] = useState<string | undefined>(undefined)

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  const handleTemplateSelect = useCallback((template: AnalysisTemplate) => {
    onTemplateSelect?.(template)
  }, [onTemplateSelect])

  const {
    numericVariables,
    categoricalVariables,
    numericDistributions,
    totalOutlierCount,
    recommendedType,
    formatStat,
    getOutlierDetails,
  } = useDescriptiveStats(validationResults, data)

  const { correlationMatrix, heatmapMatrix, getPairedData } = useCorrelationData(data, numericVariables)
  const levene = useLeveneTest(validationResults, data, numericVariables, numericVariables[0])

  const outlierDetails = useMemo(
    () => (selectedOutlierVar ? getOutlierDetails(selectedOutlierVar) : null),
    [getOutlierDetails, selectedOutlierVar]
  )

  const missingCount = validationResults?.missingValues ?? 0
  const columnCount = validationResults?.columnCount ?? Object.keys(data[0] ?? {}).length
  const warningCount = validationResults?.warnings?.length ?? 0
  const errorCount = validationResults?.errors?.length ?? 0
  const resolvedNextLabel = nextLabel ?? t.analysis.layout.nextStep

  const normalitySummary = useMemo(() => {
    const hint = summarizeNormality(numericDistributions)
    return {
      normal: hint.normalCount,
      nonNormal: hint.testedCount - hint.normalCount,
    }
  }, [numericDistributions])

  const correlationSummary = useMemo(() => {
    if (correlationMatrix.length === 0) return null
    const moderate = 0.5
    return {
      strongPairs: correlationMatrix.filter((pair) => Math.abs(pair.r) >= moderate).length,
    }
  }, [correlationMatrix])

  const leveneResultsByGroup = useMemo(() => {
    return levene.groupCandidates
      .map((groupVariable) => ({
        groupVariable,
        results: numericVariables
          .map((numericVariable) =>
            levene.results.find(
              (item) => item.groupVariable === groupVariable && item.numericVariable === numericVariable,
            ) ?? null,
          )
          .filter((item): item is NonNullable<typeof item> => item !== null),
      }))
      .filter((entry) => entry.results.length > 0)
  }, [levene.groupCandidates, levene.results, numericVariables])

  const leveneSummary = useMemo(() => {
    const total = levene.results.length
    const failed = levene.results.filter((item) => !item.equalVariance).length

    return { total, failed }
  }, [levene.results])

  const sortedDistributions = useMemo(() => {
    return [...numericDistributions].sort((a, b) => {
      const aNormal = a.normality?.isNormal === false ? 0 : 1
      const bNormal = b.normality?.isNormal === false ? 0 : 1
      if (aNormal !== bNormal) return aNormal - bNormal
      return b.outlierCount - a.outlierCount
    })
  }, [numericDistributions])

  const previewDistributions = useMemo(
    () => sortedDistributions.slice(0, MAX_PREVIEW_VARS),
    [sortedDistributions]
  )
  const hasMoreVars = sortedDistributions.length > MAX_PREVIEW_VARS

  const highlightedPreview = useMemo(() => {
    if (highlightedRows.length === 0) {
      return { rows: [] as DataRow[], rowIndices: [] as number[] }
    }

    const uniqueSorted = Array.from(new Set(highlightedRows)).sort((a, b) => a - b)
    const rows: DataRow[] = []
    const rowIndices: number[] = []

    uniqueSorted.forEach((index) => {
      const row = data[index - 1]
      if (row !== undefined) {
        rows.push(row)
        rowIndices.push(index)
      }
    })

    return { rows, rowIndices }
  }, [data, highlightedRows])

  const cardVisibility = useMemo(
    () => ({
      overview: data.length > 0 ? profile.dataPreview : 'hidden',
      descriptive: numericVariables.length > 0 ? profile.descriptiveStats : 'hidden',
      distribution: numericVariables.length > 0 ? profile.assumptionTests : 'hidden',
      visualization: numericVariables.length > 0 ? profile.distribution : 'hidden',
      correlation:
        numericVariables.length >= 2
          ? mergeVisibility(profile.scatterplots, profile.correlationHeatmap)
          : 'hidden',
    }),
    [data.length, numericVariables.length, profile]
  )

  const visibleCardOrder = useMemo(
    () =>
      (['descriptive', 'distribution', 'visualization', 'correlation', 'overview'] as const).filter(
        (cardId) => cardVisibility[cardId] !== 'hidden'
      ),
    [cardVisibility]
  )

  useEffect(() => {
    if (!visibleCardOrder.includes(selectedCard)) {
      setSelectedCard(visibleCardOrder[0] ?? 'overview')
    }
  }, [selectedCard, visibleCardOrder])

  const focusHintBanner =
    isQuickMode && profile.focusHint && data.length > 0 ? (
      <Card className="border-border/40 bg-muted/20">
        <CardContent className="py-3 text-sm text-muted-foreground">{profile.focusHint}</CardContent>
      </Card>
    ) : null

  const handleViewAllData = useCallback(() => {
    setHighlightedRows([])
    setHighlightedColumn(undefined)
    setPreviewSheetOpen(true)
  }, [])

  const handleViewOutliersInData = useCallback((rowIndices: number[]) => {
    setHighlightedRows(rowIndices)
    setHighlightedColumn(selectedOutlierVar ?? undefined)
    setPreviewSheetOpen(true)
  }, [selectedOutlierVar])

  const handleOpenOutlierModal = useCallback((varName: string) => {
    setSelectedOutlierVar(varName)
    setOutlierModalOpen(true)
  }, [])

  const primaryHeaderAction = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {data.length > 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5"
          onClick={handleViewAllData}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {t.dataExploration.tabs.fullDataView(data.length)}
        </Button>
      )}
      {data.length > 0 && onUploadComplete && (
        <DataUploadStep
          compact
          onUploadComplete={onUploadComplete}
          existingFileName={existingFileName}
        />
      )}
      {onNext && (
        <Button
          type="button"
          size="sm"
          className="h-9"
          onClick={onNext}
          disabled={!canProceedNext}
        >
          {resolvedNextLabel}
        </Button>
      )}
    </div>
  )

  if (!validationResults || data.length === 0) {
    if (isQuickMode && selectedMethod) {
      return (
        <div className="space-y-5" data-testid="data-exploration-empty">
          <StepHeader
            icon={ChartScatter}
            title={t.analysis.stepTitles.dataPreparation}
            action={primaryHeaderAction}
          />

          <DataPrepGuide methodId={selectedMethod.id} />

          {onUploadComplete && (
            <DataUploadStep
              onUploadComplete={onUploadComplete}
              existingFileName={existingFileName}
            />
          )}
        </div>
      )
    }

    return (
      <div className="space-y-6" data-testid="data-exploration-empty">
        <StepHeader
          icon={ChartScatter}
          title={t.analysis.stepTitles.dataExploration}
          action={primaryHeaderAction}
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
          <Card className="border-border/40 bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t.dataExploration.empty.title}</CardTitle>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t.dataExploration.empty.description}
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              {onUploadComplete && (
                <DataUploadStep
                  onUploadComplete={onUploadComplete}
                  existingFileName={existingFileName}
                />
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-border/40 bg-card shadow-sm">
              <CardContent className="grid gap-3 p-4">
                <div className="rounded-xl bg-muted/20 p-4">
                  <h4 className="text-sm font-semibold tracking-tight">
                    {t.dataExploration.features.descriptiveTitle}
                  </h4>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {t.dataExploration.features.descriptiveDesc}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/20 p-4">
                  <h4 className="text-sm font-semibold tracking-tight">
                    {t.dataExploration.features.distributionTitle}
                  </h4>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {t.dataExploration.features.distributionDesc}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/20 p-4">
                  <h4 className="text-sm font-semibold tracking-tight">
                    {t.dataExploration.features.correlationTitle}
                  </h4>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {t.dataExploration.features.correlationDesc}
                  </p>
                </div>
              </CardContent>
            </Card>

            {recentTemplates.length > 0 && (
              <Card className="border-border/40 bg-card shadow-sm">
                <CardContent className="p-4">
                  <TemplateSelector
                    compact
                    maxItems={3}
                    onSelect={handleTemplateSelect}
                    onViewAll={() => setTemplatePanelOpen(true)}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <TemplateManagePanel
          open={templatePanelOpen}
          onOpenChange={setTemplatePanelOpen}
          onSelect={handleTemplateSelect}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4" data-testid="data-exploration-step">
      <StepHeader
        icon={ChartScatter}
        title={t.analysis.stepTitles.dataExploration}
        action={primaryHeaderAction}
      />

      {focusHintBanner}

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="text-xs font-mono">
          {data.length} {t.dataExploration.badgeBar.rows}
        </Badge>
        <Badge variant="secondary" className="text-xs font-mono">
          {columnCount} {t.dataExploration.badgeBar.cols}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {t.dataExploration.insightPanel.statusVariables(numericVariables.length, categoricalVariables.length)}
        </Badge>
      </div>

      <div
        className={cn(
          'grid gap-3',
          cardVisibility.correlation !== 'hidden'
            ? 'md:grid-cols-2 2xl:grid-cols-4'
            : 'md:grid-cols-3'
        )}
        role="group"
        aria-label={t.dataExploration.summaryCards.ariaLabel}
      >
        <SummaryCard
          id="overview"
          icon={Table2}
          title={t.dataExploration.summaryCards.overview}
          selected={selectedCard === 'overview'}
          visibility={cardVisibility.overview}
          onClick={setSelectedCard}
        >
          <p>{`${t.dataExploration.summaryCards.rowsCols(data.length, columnCount)} / ${t.dataExploration.summaryCards.numericCategorical(numericVariables.length, categoricalVariables.length)}`}</p>
        </SummaryCard>

        <SummaryCard
          id="descriptive"
          icon={ListOrdered}
          title={t.dataExploration.summaryCards.descriptive}
          selected={selectedCard === 'descriptive'}
          visibility={cardVisibility.descriptive}
          onClick={setSelectedCard}
        >
          <p>{`${t.dataExploration.summaryCards.variables(numericDistributions.length)} / ${totalOutlierCount > 0 ? t.dataExploration.summaryCards.outlierCount(totalOutlierCount) : t.dataExploration.summaryCards.noOutliers}`}</p>
        </SummaryCard>

        <SummaryCard
          id="distribution"
          icon={BarChart3}
          title={t.dataExploration.summaryCards.distribution}
          selected={selectedCard === 'distribution'}
          visibility={cardVisibility.distribution}
          onClick={setSelectedCard}
        >
          <p>{`${t.dataExploration.normality.title} / ${t.dataExploration.homogeneity.title}`}</p>
        </SummaryCard>

        <SummaryCard
          id="visualization"
          icon={Table2}
          title={t.dataExploration.distribution.title}
          selected={selectedCard === 'visualization'}
          visibility={cardVisibility.visualization}
          onClick={setSelectedCard}
        >
          <p>{`${t.dataExploration.chartTypes.histogram} / ${t.dataExploration.chartTypes.boxplot}`}</p>
        </SummaryCard>

        <SummaryCard
          id="correlation"
          icon={TrendingUp}
          title={t.dataExploration.summaryCards.correlation}
          selected={selectedCard === 'correlation'}
          visibility={cardVisibility.correlation}
          onClick={setSelectedCard}
        >
          <p>{`${t.dataExploration.scatterTabs.scatter} / ${t.dataExploration.scatterTabs.heatmap}`}</p>
        </SummaryCard>
      </div>

      <div
        className={cn(
          'grid gap-5',
          selectedCard === 'visualization' || selectedCard === 'correlation'
            ? 'grid-cols-1'
            : 'xl:grid-cols-[minmax(0,3.35fr)_minmax(250px,0.9fr)]'
        )}
      >
        <div className="min-w-0 space-y-4">
          {selectedCard === 'descriptive' && (
            <Card className="border-border/40 bg-card shadow-sm">
              <CardContent className="space-y-4 p-4">
                <DescriptiveStatsTable
                  numericDistributions={previewDistributions}
                  formatStat={formatStat}
                  totalOutlierCount={totalOutlierCount}
                  onOpenOutlierModal={handleOpenOutlierModal}
                />
                {hasMoreVars && (
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFullStatsOpen(true)}
                    >
                      {t.dataExploration.tabs.statistics}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {selectedCard === 'distribution' && (
            <div className="space-y-4">
              {numericDistributions.some((dist) => dist.normality) && (
                <Card className="border-border/40 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{t.dataExploration.normality.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <div className="flex flex-wrap gap-2">
                      {sortedDistributions.map((dist) =>
                        dist.normality ? (
                          <Badge
                            key={dist.name}
                            variant={dist.normality.isNormal ? 'secondary' : 'destructive'}
                            className="text-[11px] font-mono"
                          >
                            {`${dist.name} p=${dist.normality.pValue.toFixed(3)}`}
                          </Badge>
                        ) : null,
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {normalitySummary.nonNormal > 0
                        ? t.dataExploration.normality.nonNormalReview(t.analysis.stepTitles.variableSelection)
                        : t.dataExploration.normality.normalReview(t.analysis.stepTitles.variableSelection)}
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card className="border-border/40 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t.dataExploration.homogeneity.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {levene.groupCandidates.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      {t.dataExploration.homogeneity.requiresGroupVariable}
                    </p>
                  )}
                  {levene.groupCandidates.length > 0 && levene.isLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t.dataExploration.assumptions.loading}
                    </div>
                  )}
                  {levene.groupCandidates.length > 0 && leveneSummary.total > 0 && (
                    <>
                      <p className="text-sm text-muted-foreground">
                        {leveneSummary.failed > 0
                          ? t.dataExploration.homogeneity.failedSummary(
                              leveneSummary.failed,
                              leveneSummary.total,
                              t.analysis.stepTitles.variableSelection,
                            )
                          : t.dataExploration.homogeneity.passedSummary(
                              leveneSummary.total,
                              t.analysis.stepTitles.variableSelection,
                            )}
                      </p>

                      <div className="space-y-3">
                        {leveneResultsByGroup.map((entry) => (
                          <div key={entry.groupVariable} className="rounded-xl bg-muted/20 p-3">
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-medium text-foreground">
                                {t.dataExploration.homogeneity.groupVariable(entry.groupVariable)}
                              </p>
                              <Badge variant="outline" className="text-[10px]">
                                {t.dataExploration.homogeneity.passCount(
                                  entry.results.filter((item) => item.equalVariance).length,
                                  entry.results.length,
                                )}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {entry.results.map((item) => (
                                <Badge
                                  key={`${entry.groupVariable}-${item.numericVariable}`}
                                  variant={item.equalVariance ? 'secondary' : 'destructive'}
                                  className="text-[11px] font-mono"
                                >
                                  {`${item.numericVariable} p=${item.pValue.toFixed(3)}`}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  {levene.groupCandidates.length > 0 && !levene.isLoading && leveneSummary.total === 0 && (
                    <p className="text-sm text-muted-foreground">
                      {t.dataExploration.homogeneity.insufficientCombinations}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          {selectedCard === 'visualization' && (
            <DistributionChartSection
              data={data}
              numericVariables={numericVariables}
              visibility={profile.distribution}
              defaultChartType={profile.defaultChartType ?? 'histogram'}
            />
          )}

          {selectedCard === 'correlation' && (
            <ScatterHeatmapSection
              numericVariables={numericVariables}
              correlationMatrix={correlationMatrix}
              heatmapMatrix={heatmapMatrix}
              scatterVisibility={profile.scatterplots}
              heatmapVisibility={profile.correlationHeatmap}
              getPairedData={getPairedData}
            />
          )}

          {selectedCard === 'overview' && (
            <Card className="border-border/40 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t.dataExploration.preview.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <DataPreviewTable
                  data={data}
                  maxRows={10}
                  defaultOpen
                  title=""
                  height="auto"
                />
              </CardContent>
            </Card>
          )}
        </div>

        <Card className={cn('border-border/40 shadow-sm xl:sticky xl:top-4 xl:self-start', (selectedCard === 'visualization' || selectedCard === 'correlation') && 'hidden')}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-medium">{t.dataExploration.columnPanel.title}</CardTitle>
              {validationResults && (
                <Badge
                  variant={
                    errorCount > 0 ? 'destructive' : warningCount > 0 ? 'outline' : 'secondary'
                  }
                  className="text-[10px]"
                >
                  {errorCount > 0
                    ? t.dataExploration.columnPanel.statusError
                    : warningCount > 0
                      ? t.dataExploration.columnPanel.statusWarning
                      : t.dataExploration.columnPanel.statusNormal}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {errorCount > 0 && (
              <div className="rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive">
                {validationResults?.errors?.map((message, index) => (
                  <p key={`${message}-${index}`}>{message}</p>
                ))}
              </div>
            )}

            {warningCount > 0 && (
              <div className="rounded-lg bg-warning-bg p-2.5 text-xs text-warning">
                {validationResults?.warnings?.map((message, index) => (
                  <p key={`${message}-${index}`}>{message}</p>
                ))}
              </div>
            )}

            <div className="space-y-1.5 pt-1">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {t.dataExploration.columnPanel.columnList}
              </p>
              <div className="max-h-[240px] space-y-1 overflow-y-auto">
                {validationResults?.columnStats?.map((column) => (
                  <div
                    key={column.name}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-xs"
                  >
                    <span className="truncate font-medium">{column.name}</span>
                    <Badge variant="outline" className="ml-2 shrink-0 text-[10px]">
                      {column.type === 'numeric'
                        ? t.dataExploration.columnPanel.numericShort
                        : t.dataExploration.columnPanel.categoricalShort}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
              {recommendedType === 'parametric'
                ? t.dataExploration.columnPanel.parametric
                : t.dataExploration.columnPanel.nonParametric}
            </div>
          </CardContent>
        </Card>
      </div>

      <Sheet open={previewSheetOpen} onOpenChange={setPreviewSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t.dataExploration.tabs.fullDataView(data.length)}</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {highlightedRows.length > 0 && highlightedPreview.rows.length > 0 ? (
              <DataPreviewTable
                data={highlightedPreview.rows}
                maxRows={highlightedPreview.rows.length}
                defaultOpen
                title=""
                height="auto"
                rowIndices={highlightedPreview.rowIndices}
                highlightRows={highlightedPreview.rowIndices}
                highlightColumn={highlightedColumn}
              />
            ) : (
              <DataPreviewTable
                data={data}
                maxRows={data.length}
                defaultOpen
                title=""
                height="auto"
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={fullStatsOpen} onOpenChange={setFullStatsOpen}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t.dataExploration.tabs.statistics}</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <DescriptiveStatsTable
              numericDistributions={sortedDistributions}
              formatStat={formatStat}
              totalOutlierCount={totalOutlierCount}
              onOpenOutlierModal={handleOpenOutlierModal}
            />
          </div>
        </SheetContent>
      </Sheet>

      {selectedOutlierVar && outlierDetails && (
        <OutlierDetailPanel
          open={outlierModalOpen}
          onOpenChange={setOutlierModalOpen}
          variableName={selectedOutlierVar}
          outliers={outlierDetails.outliers}
          statistics={outlierDetails.statistics}
          onViewInData={handleViewOutliersInData}
        />
      )}

      <TemplateManagePanel
        open={templatePanelOpen}
        onOpenChange={setTemplatePanelOpen}
        onSelect={handleTemplateSelect}
      />
    </div>
  )
})

export default DataExplorationStep


