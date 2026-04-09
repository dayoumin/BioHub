'use client'

import { memo, useState, useMemo, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChartScatter, ListOrdered, ExternalLink, BarChart3, Flame, AlertTriangle, Lightbulb, Upload, FileText, Table2, TrendingUp, Maximize2, Loader2, CheckCircle2 } from 'lucide-react'
import { ValidationResults, DataRow } from '@/types/analysis'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { useModeStore } from '@/lib/stores/mode-store'
import { StepHeader } from '@/components/analysis/common'
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
import { summarizeNormality } from '@/lib/utils/stats-math'
import { useCorrelationData } from '@/hooks/use-correlation-data'
import { SummaryCard, type CardId } from './exploration/SummaryCard'
import { useLeveneTest } from '@/hooks/use-levene-test'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

/** 기초통계 미리보기에 표시할 최대 변수 수 */
const MAX_PREVIEW_VARS = 5

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

  // 현재 선택된 카드
  const [selectedCard, setSelectedCard] = useState<CardId>('overview')

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

  const {
    numericVariables,
    categoricalVariables,
    numericDistributions,
    totalOutlierCount,
    recommendedType,
    formatStat,
    getOutlierDetails
  } = useDescriptiveStats(validationResults, data)

  const { correlationMatrix, heatmapMatrix, getPairedData } = useCorrelationData(data, numericVariables)

  // 등분산성 검정 (Step 1 — 범주형 그룹 변수 자동 감지)
  const levene = useLeveneTest(validationResults, data, numericVariables[0])

  // 이상치 상세 정보 메모이제이션 (선택된 변수가 바뀔 때만 data 풀스캔)
  const outlierDetails = useMemo(
    () => selectedOutlierVar ? getOutlierDetails(selectedOutlierVar) : null,
    [selectedOutlierVar, getOutlierDetails]
  )

  // 이상치 모달 열기 핸들러
  const handleOpenOutlierModal = useCallback((varName: string) => {
    setSelectedOutlierVar(varName)
    setOutlierModalOpen(true)
  }, [])

  // 이상치 데이터에서 보기 핸들러
  const handleViewOutliersInData = useCallback((rowIndices: number[]) => {
    setHighlightedRows(rowIndices)
    setHighlightedColumn(selectedOutlierVar ?? undefined)
    // 이상치를 데이터에서 보려면 개요 카드로 이동
    setSelectedCard('overview')
  }, [selectedOutlierVar])

  // 데이터 교체 완료 핸들러
  const handleReplaceUploadComplete = useCallback((file: File, newData: DataRow[]) => {
    setIsReplaceMode(false)
    onUploadComplete?.(file, newData)
  }, [onUploadComplete])

  // 빠른 분석 모드 힌트 (2곳에서 사용)
  const focusHintBanner = isQuickMode && profile.focusHint && data.length > 0 ? (
    <div className="flex items-center gap-2 p-3 bg-info-bg rounded-lg border border-info-border text-sm">
      <Lightbulb className="h-4 w-4 text-info flex-shrink-0" />
      <span className="text-info">{profile.focusHint}</span>
    </div>
  ) : null

  // 데이터 미리보기 split (상단 5 + 하단 5)
  const splitPreview = useMemo(() => {
    if (data.length <= 10) return null
    return {
      rows: [...data.slice(0, 5), ...data.slice(-5)],
      omittedCount: data.length - 10,
      indices: [1, 2, 3, 4, 5].concat(
        [...Array(5).keys()].map(i => data.length - 4 + i)
      )
    }
  }, [data])

  // 결측값 수
  const missingCount = validationResults?.missingValues ?? 0

  // 풀스크린 기초통계 모달
  const [fullStatsOpen, setFullStatsOpen] = useState(false)

  // 문제 변수 우선 정렬 (정규성 실패 → 이상치 → 나머지)
  const sortedDistributions = useMemo(() => {
    return [...numericDistributions].sort((a, b) => {
      const aNorm = a.normality?.isNormal === false ? 0 : 1
      const bNorm = b.normality?.isNormal === false ? 0 : 1
      if (aNorm !== bNorm) return aNorm - bNorm
      if (b.outlierCount !== a.outlierCount) return b.outlierCount - a.outlierCount
      return 0
    })
  }, [numericDistributions])

  const previewDistributions = sortedDistributions.slice(0, MAX_PREVIEW_VARS)
  const hasMoreVars = sortedDistributions.length > MAX_PREVIEW_VARS

  // 카드 가시성 (Quick 모드 프로필 기반 — trivial 연산이므로 useMemo 불필요)
  const cardVisibility = {
    overview: profile.dataPreview,
    descriptive: numericVariables.length === 0 ? 'hidden' as const : profile.descriptiveStats,
    distribution: numericVariables.length === 0 ? 'hidden' as const : profile.distribution,
    correlation: numericVariables.length < 2 ? 'hidden' as const : profile.correlationHeatmap,
  }

  // 상관 요약 (카드 4용)
  const correlationSummary = useMemo(() => {
    if (correlationMatrix.length === 0) return null
    const maxPair = correlationMatrix[0] // correlationMatrix는 |r| 내림차순 정렬됨
    const MODERATE_CORRELATION = 0.5 // THRESHOLDS.EFFECT_SIZE.PEARSON_R.MODERATE (engine.ts)
    const significantCount = correlationMatrix.filter(p => Math.abs(p.r) >= MODERATE_CORRELATION).length
    return { maxR: maxPair?.r ?? 0, significantCount }
  }, [correlationMatrix])

  // 정규성 요약 (카드 3용) — summarizeNormality 재사용
  const normalitySummary = useMemo(() => {
    const hint = summarizeNormality(numericDistributions)
    return { normal: hint.normalCount, nonNormal: hint.testedCount - hint.normalCount }
  }, [numericDistributions])

  // 데이터 없을 때 또는 교체 모드: 업로드 영역 표시
  if (!validationResults || !data || data.length === 0 || isReplaceMode) {
    // ── 빠른 분석 모드: 방법 중심 컴팩트 레이아웃 ──
    if (isQuickMode && selectedMethod && !isReplaceMode) {
      return (
        <div className="space-y-5" data-testid="data-exploration-empty">
          <StepHeader icon={ChartScatter} title={t.analysis.stepTitles.dataPreparation} />

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

    // ── 일반 모드: 업로드 + 탐색 안내 ──
    return (
      <div className="space-y-6" data-testid="data-exploration-empty">
        <StepHeader icon={ChartScatter} title={t.analysis.stepTitles.dataExploration} />

        {!isReplaceMode && (
          <p className="text-sm text-muted-foreground">{t.dataExploration.empty.description}</p>
        )}

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

        {onUploadComplete && (
          <DataUploadStep
            onUploadComplete={isReplaceMode ? handleReplaceUploadComplete : onUploadComplete}
            existingFileName={existingFileName}
          />
        )}

        {/* 데이터 준비 안내 */}
        <DataPrepGuide defaultCollapsed />

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

        <TemplateManagePanel
          open={templatePanelOpen}
          onOpenChange={setTemplatePanelOpen}
          onSelect={handleTemplateSelect}
        />

        {/* 지원 기능 안내 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 bg-primary/5 border border-primary/15 rounded-xl hover:bg-primary/8 transition-colors duration-200">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <ListOrdered className="h-4 w-4 text-primary" />
            </div>
            <h4 className="font-semibold text-sm tracking-tight">{t.dataExploration.features.descriptiveTitle}</h4>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{t.dataExploration.features.descriptiveDesc}</p>
          </div>
          <div className="p-4 bg-primary/5 border border-primary/15 rounded-xl hover:bg-primary/8 transition-colors duration-200">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <h4 className="font-semibold text-sm tracking-tight">{t.dataExploration.features.distributionTitle}</h4>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{t.dataExploration.features.distributionDesc}</p>
          </div>
          <div className="p-4 bg-primary/5 border border-primary/15 rounded-xl hover:bg-primary/8 transition-colors duration-200">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <Flame className="h-4 w-4 text-primary" />
            </div>
            <h4 className="font-semibold text-sm tracking-tight">{t.dataExploration.features.correlationTitle}</h4>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{t.dataExploration.features.correlationDesc}</p>
          </div>
        </div>
      </div>
    )
  }

  // 수치형 변수 부족 경고 (early return 제거 → 메인 렌더에서 카드 가시성으로 처리)
  const fewNumericVarsWarning = numericVariables.length < 2 && !isQuickMode

  const columnCount = validationResults?.columnCount ?? Object.keys(data[0] ?? {}).length

  return (
    <div className="space-y-5" data-testid="data-exploration-step">
      {/* ── 헤더 ── */}
      <StepHeader icon={ChartScatter} title={t.analysis.stepTitles.dataExploration} />

      {focusHintBanner}

      {/* ── 컴팩트 요약 배지 바 ── */}
      <div className="flex items-center gap-2 flex-wrap p-3 bg-muted/30 rounded-xl border border-border/40">
        {/* 파일 정보 */}
        <div className="flex items-center gap-2 mr-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <FileText className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-sm font-medium truncate max-w-[200px]">
            {uploadedFile?.name || uploadedFileName || t.dataExploration.fallbackFileName}
          </span>
        </div>

        {/* 구분선 */}
        <div className="h-4 w-px bg-border/60" />

        {/* 행/열 배지 */}
        <Badge variant="secondary" className="text-xs font-mono tabular-nums gap-1">
          {data.length} {t.dataExploration.badgeBar.rows}
        </Badge>
        <Badge variant="secondary" className="text-xs font-mono tabular-nums gap-1">
          {columnCount} {t.dataExploration.badgeBar.cols}
        </Badge>

        {/* 구분선 */}
        <div className="h-4 w-px bg-border/60" />

        {/* 변수 타입 배지 */}
        <Badge variant="outline" className="text-xs gap-1 border-info-border text-info bg-info-bg">
          <span className="font-mono">{numericVariables.length}</span> {t.dataExploration.badgeBar.numeric}
        </Badge>
        <Badge variant="outline" className="text-xs gap-1 border-success-border text-success bg-success-bg">
          <span className="font-mono">{categoricalVariables.length}</span> {t.dataExploration.badgeBar.categorical}
        </Badge>

        {/* 결측치 */}
        {missingCount > 0 ? (
          <Badge variant="outline" className="text-xs gap-1 border-warning-border text-warning bg-warning-bg">
            {t.dataExploration.badgeBar.missing} <span className="font-mono">{missingCount}</span>
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs gap-1 border-success-border text-success bg-success-bg">
            <CheckCircle2 className="h-3 w-3" />
            결측 없음 ✓
          </Badge>
        )}

        {/* 이상치 배지 (클릭 시 기술통계 탭으로) */}
        {totalOutlierCount > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  role="button"
                  tabIndex={0}
                  className="text-xs gap-1 border-error-border text-error bg-error-bg cursor-pointer hover:bg-error-bg/80 transition-colors"
                  onClick={() => setSelectedCard('descriptive')}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedCard('descriptive') } }}
                >
                  <AlertTriangle className="h-3 w-3" />
                  {t.dataExploration.badgeBar.outlier} <span className="font-mono">{totalOutlierCount}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>클릭하면 이상치가 있는 변수와 상세 통계를 바로 확인할 수 있습니다.</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* 데이터 교체 버튼 (우측 정렬) */}
        {onUploadComplete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsReplaceMode(true)}
            className="ml-auto gap-1.5 h-7 text-xs text-muted-foreground hover:text-foreground"
            data-testid="replace-data-button"
          >
            <Upload className="w-3 h-3" />
            {t.dataExploration.replaceMode.button}
          </Button>
        )}
      </div>

      {/* 수치형 변수 부족 경고 */}
      {fewNumericVarsWarning && (
        <Card className="border-warning-border bg-warning-bg">
          <CardContent className="py-4">
            <div className="text-center text-muted-foreground text-sm">
              <p>{t.dataExploration.warnings.correlationRequires}</p>
              <p className="mt-1">{t.dataExploration.warnings.currentStatus(numericVariables.length, categoricalVariables.length)}</p>
              <p className="mt-1">{t.dataExploration.warnings.nextStepHint}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 요약 카드 대시보드 ── */}
      <div className="flex flex-wrap gap-3" role="group" aria-label={t.dataExploration.summaryCards.ariaLabel}>
        <SummaryCard
          id="overview"
          icon={Table2}
          title={t.dataExploration.summaryCards.overview}
          selected={selectedCard === 'overview'}
          visibility={cardVisibility.overview}
          onClick={setSelectedCard}
        >
          <p>{t.dataExploration.summaryCards.rowsCols(data.length, columnCount)}</p>
          <p>{t.dataExploration.summaryCards.numericCategorical(numericVariables.length, categoricalVariables.length)}</p>
          {missingCount > 0 && <p className="text-amber-600">{t.dataExploration.summaryCards.missingCount(missingCount)}</p>}
        </SummaryCard>

        <SummaryCard
          id="descriptive"
          icon={ListOrdered}
          title={t.dataExploration.summaryCards.descriptive}
          selected={selectedCard === 'descriptive'}
          visibility={cardVisibility.descriptive}
          onClick={setSelectedCard}
        >
          <p>{t.dataExploration.summaryCards.variables(numericDistributions.length)}</p>
          {totalOutlierCount > 0 && <p className="text-amber-600">{t.dataExploration.summaryCards.outlierCount(totalOutlierCount)}</p>}
          {totalOutlierCount === 0 && <p>{t.dataExploration.summaryCards.noOutliers}</p>}
        </SummaryCard>

        <SummaryCard
          id="distribution"
          icon={BarChart3}
          title={t.dataExploration.summaryCards.distribution}
          selected={selectedCard === 'distribution'}
          visibility={cardVisibility.distribution}
          onClick={setSelectedCard}
        >
          {normalitySummary.normal + normalitySummary.nonNormal > 0 ? (
            <p>{t.dataExploration.summaryCards.normalitySummary(normalitySummary.normal, normalitySummary.nonNormal)}</p>
          ) : (
            <p>{t.dataExploration.summaryCards.normalityTesting}</p>
          )}
          {levene.isLoading && <p>{t.dataExploration.summaryCards.homogeneityTesting}</p>}
          {levene.result && (
            <p>{levene.result.equalVariance ? t.dataExploration.summaryCards.homogeneityPass : t.dataExploration.summaryCards.homogeneityFail}</p>
          )}
          {!levene.isLoading && !levene.result && (
            <p>{levene.groupCandidates.length > 0 ? '등분산성 검정 조건을 충족하지 못했습니다.' : '그룹 변수가 없어 등분산성 검정은 아직 실행되지 않았습니다.'}</p>
          )}
        </SummaryCard>

        <SummaryCard
          id="correlation"
          icon={TrendingUp}
          title={t.dataExploration.summaryCards.correlation}
          selected={selectedCard === 'correlation'}
          visibility={cardVisibility.correlation}
          disabled={numericVariables.length < 2}
          onClick={setSelectedCard}
        >
          {correlationSummary ? (
            <>
              <p>{t.dataExploration.summaryCards.maxCorrelation(Math.abs(correlationSummary.maxR).toFixed(2))}</p>
              <p>{t.dataExploration.summaryCards.strongPairs(correlationSummary.significantCount)}</p>
            </>
          ) : (
            <p>{t.dataExploration.summaryCards.needsTwoNumeric}</p>
          )}
        </SummaryCard>
      </div>

      {/* ── 상세 패널: 데이터 미리보기 (CSS hidden — state 보존) ── */}
      <div className={selectedCard === 'overview' ? 'grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start' : 'hidden'}>
          {/* 좌: 데이터 미리보기 */}
          <div className="space-y-4 min-w-0">
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
                        <span className="text-warning" aria-hidden="true">&#9679;</span>
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
                ) : data.length <= 10 ? (
                  <DataPreviewTable data={data} maxRows={10} defaultOpen={true} title="" height="auto" />
                ) : splitPreview ? (
                  <DataPreviewTable
                    data={splitPreview.rows}
                    maxRows={10}
                    defaultOpen={true}
                    title=""
                    height="auto"
                    omittedRows={splitPreview.omittedCount}
                    omitAfterIndex={4}
                    rowIndices={splitPreview.indices}
                  />
                ) : null}
              </CardContent>
            </Card>

            {/* 빠른 분석: 데이터 적합성 검증 */}
            {isQuickMode && selectedMethod && (
              <DataPrepGuide methodId={selectedMethod.id} uploadedData={data} defaultCollapsed />
            )}
          </div>

          {/* 우: 컬럼 정보 패널 */}
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
              {/* 변수 타입 카운트 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-center">
                <div className="p-2 rounded-lg bg-muted/40">
                  <p className="text-[11px] text-muted-foreground">{t.dataExploration.columnPanel.numeric}</p>
                  <p className="text-lg font-semibold font-mono tabular-nums">{numericVariables.length}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/40">
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
                <div className="flex items-center justify-between py-1.5 border-b border-border/30">
                  <span className="text-muted-foreground">{t.dataExploration.columnPanel.totalColumns}</span>
                  <span className="font-mono tabular-nums font-medium">{validationResults?.columnCount ?? 0}</span>
                </div>
                {data.length > 0 && (
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-muted-foreground">{t.dataExploration.columnPanel.recommendedAnalysis}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {recommendedType === 'parametric' ? t.dataExploration.columnPanel.parametric : t.dataExploration.columnPanel.nonParametric}
                    </Badge>
                  </div>
                )}
              </div>

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

      {/* ── 상세 패널: 기초통계 (CSS hidden — state 보존) ── */}
      <div className={selectedCard === 'descriptive' ? 'space-y-4' : 'hidden'}>
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
              className="gap-1.5 text-xs"
            >
              <Maximize2 className="h-3 w-3" />
              전체 {sortedDistributions.length}개 변수 보기
            </Button>
          </div>
        )}
      </div>

      {/* 풀스크린 기초통계 Sheet */}
      <Sheet open={fullStatsOpen} onOpenChange={setFullStatsOpen}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>전체 변수 기초통계 ({sortedDistributions.length}개)</SheetTitle>
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

      {/* ── 상세 패널: 분포 & 검정 (CSS hidden — state 보존) ── */}
      <div className={selectedCard === 'distribution' ? 'space-y-4' : 'hidden'}>
        {/* 정규성 배지 격자 (profile.assumptionTests로 가시성 제어) */}
        {profile.assumptionTests !== 'hidden' && numericDistributions.some(d => d.normality) && (
          <Card className="border-border/40 shadow-sm">
            <CardContent className="py-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">정규성 검정 (Shapiro-Wilk)</p>
              <div className="flex flex-wrap gap-2">
                {sortedDistributions.map(dist => dist.normality ? (
                  <Badge
                    key={dist.name}
                    variant={dist.normality.isNormal ? 'secondary' : 'destructive'}
                    className="text-[11px] font-mono gap-1"
                  >
                    {dist.name} {dist.normality.isNormal ? '✓' : '✗'} p={dist.normality.pValue.toFixed(3)}
                  </Badge>
                ) : null)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 등분산성 검정 (profile.assumptionTests로 가시성 제어) */}
        {profile.assumptionTests !== 'hidden' && (
          <Card className="border-border/40 shadow-sm">
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">등분산성 검정 (Levene)</p>
                {levene.groupCandidates.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">그룹:</span>
                    <Select value={levene.groupVariable ?? ''} onValueChange={levene.setGroupVariable}>
                      <SelectTrigger className="h-7 w-[140px] text-xs" aria-label="등분산 검정 그룹 변수 선택">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {levene.groupCandidates.map(name => (
                          <SelectItem key={name} value={name} className="text-xs">{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              {levene.groupCandidates.length === 0 && (
                <div className="rounded-lg border border-info-border bg-info-bg px-3 py-2.5 text-xs text-info">
                  비교할 범주형 그룹 변수가 없어 Levene 등분산성 검정을 실행하지 않았습니다. 그룹 변수를 포함하는 분석에서는 Step 3에서 다시 확인됩니다.
                </div>
              )}
              {levene.groupCandidates.length > 0 && levene.isLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  등분산성 검정 중...
                </div>
              )}
              {levene.groupCandidates.length > 0 && levene.result && (
                <div className="flex items-center gap-3">
                  <Badge variant={levene.result.equalVariance ? 'secondary' : 'destructive'} className="text-[11px] font-mono">
                    {levene.result.equalVariance ? '✓ 등분산' : '✗ 이분산'} p={levene.result.pValue.toFixed(3)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {levene.result.equalVariance
                      ? '그룹 간 분산이 동일 → 모수 검정 적합'
                      : '그룹 간 분산 다름 → Welch 검정 또는 비모수 검정 권장'}
                  </span>
                </div>
              )}
              {levene.groupCandidates.length > 0 && !levene.isLoading && !levene.result && (
                <p className="text-xs text-muted-foreground">검정 불가 (그룹당 최소 3개 관측치 필요)</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* 분포 차트 */}
        <DistributionChartSection
          data={data}
          numericVariables={numericVariables}
          visibility={profile.distribution}
          defaultChartType={profile.defaultChartType ?? 'histogram'}
        />
      </div>

      {/* ── 상세 패널: 변수 간 관계 (CSS hidden — state 보존) ── */}
      <div className={selectedCard === 'correlation' ? undefined : 'hidden'}>
        <ScatterHeatmapSection
          numericVariables={numericVariables}
          correlationMatrix={correlationMatrix}
          heatmapMatrix={heatmapMatrix}
          scatterVisibility={profile.scatterplots}
          heatmapVisibility={profile.correlationHeatmap}
          getPairedData={getPairedData}
        />
      </div>

      {/* 이상치 상세 모달 */}
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

    </div>
  )
})

export default DataExplorationStep
