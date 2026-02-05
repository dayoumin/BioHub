'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import {
  Save,
  FileDown,
  Copy,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MoreHorizontal,
  RefreshCw,
  FileText,
  Sparkles,
  BarChart3,
  Lightbulb,
  ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { AnalysisResult } from '@/types/smart-flow'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { PDFReportService } from '@/lib/services/pdf-report-service'
import { startNewAnalysis } from '@/lib/services/data-management'
import { convertToStatisticalResult } from '@/lib/statistics/result-converter'
import { TemplateSaveModal } from '@/components/smart-flow/TemplateSaveModal'
import { cn } from '@/lib/utils'
import { CollapsibleSection, StatisticCard } from '@/components/smart-flow/common'
import { useUI } from '@/contexts/ui-context'
import { checkOllamaStatus, OllamaStatus } from '@/lib/rag/utils/ollama-check'
import { ConfidenceIntervalDisplay } from '@/components/statistics/common/ConfidenceIntervalDisplay'
import { EffectSizeCard } from '@/components/statistics/common/EffectSizeCard'
import { AssumptionTestCard, type AssumptionTest } from '@/components/statistics/common/AssumptionTestCard'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { formatStatisticalResult } from '@/lib/statistics/formatters'

interface ResultsActionStepProps {
  results: AnalysisResult | null
}

// 효과크기 해석
function getEffectSizeInterpretation(value: number, type?: string): string {
  const absValue = Math.abs(value)
  switch (type) {
    case 'cohensD':
      if (absValue < 0.2) return '작음'
      if (absValue < 0.5) return '중간'
      if (absValue < 0.8) return '큼'
      return '매우 큼'
    case 'etaSquared':
      if (absValue < 0.01) return '작음'
      if (absValue < 0.06) return '중간'
      if (absValue < 0.14) return '큼'
      return '매우 큼'
    default:
      if (absValue < 0.2) return '작음'
      if (absValue < 0.5) return '중간'
      return '큼'
  }
}

// p-value 포맷팅
function formatPValue(p: number): string {
  if (p == null || isNaN(p)) return '-'
  if (p < 0.001) return '< .001'
  if (p < 0.01) return '< .01'
  if (p < 0.05) return '< .05'
  return p.toFixed(3)
}

export function ResultsActionStep({ results }: ResultsActionStepProps) {
  const [isSaved, setIsSaved] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [detailedResultsOpen, setDetailedResultsOpen] = useState(false)
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)
  // AI 채팅 상태
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null)
  const { openChatPanel } = useUI()

  // Ollama 상태 확인
  useEffect(() => {
    checkOllamaStatus().then(setOllamaStatus).catch(() => setOllamaStatus(null))
  }, [])


  const {
    saveToHistory,
    reset,
    setCurrentStep,
    setUploadedData,
    setUploadedFile,
    setValidationResults,
    setResults,
    setIsReanalysisMode,
    uploadedData,
    variableMapping,
    uploadedFileName,
    selectedMethod,
  } = useSmartFlowStore()

  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const copiedTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
    }
  }, [])

  // AnalysisResult -> StatisticalResult 변환
  const statisticalResult = useMemo(() => {
    if (!results) return null

    const variables: string[] = []
    if (variableMapping?.dependentVar) {
      if (Array.isArray(variableMapping.dependentVar)) {
        variables.push(...variableMapping.dependentVar)
      } else {
        variables.push(variableMapping.dependentVar)
      }
    }
    if (variableMapping?.independentVar) {
      if (Array.isArray(variableMapping.independentVar)) {
        variables.push(...variableMapping.independentVar)
      } else {
        variables.push(variableMapping.independentVar)
      }
    }
    if (variableMapping?.groupVar) {
      variables.push(variableMapping.groupVar)
    }

    return convertToStatisticalResult(results, {
      sampleSize: uploadedData?.length,
      groups: results.groupStats?.length,
      variables: variables.length > 0 ? variables : undefined,
      timestamp: new Date()
    })
  }, [results, uploadedData, variableMapping])

  // 유의성 판단
  const isSignificant = useMemo(() => {
    if (!statisticalResult) return false
    return statisticalResult.pValue < (statisticalResult.alpha || 0.05)
  }, [statisticalResult])

  // 가정 충족 여부
  const assumptionsPassed = useMemo(() => {
    if (!statisticalResult?.assumptions) return true
    return statisticalResult.assumptions.every(a => a.passed !== false)
  }, [statisticalResult])

  // 가정 미충족 시 진단 섹션 자동 열림
  useEffect(() => {
    if (!assumptionsPassed) {
      setDiagnosticsOpen(true)
    }
  }, [assumptionsPassed])

  // AssumptionTest[] 매핑 (AssumptionTestCard용)
  const assumptionTests = useMemo((): AssumptionTest[] => {
    if (!statisticalResult?.assumptions) return []
    return statisticalResult.assumptions.map((a) => ({
      name: a.name,
      description: a.description,
      statistic: a.testStatistic,
      testStatistic: a.testStatistic,
      pValue: a.pValue,
      passed: a.passed,
      recommendation: a.recommendation,
      severity: a.severity ?? (a.passed === false ? 'medium' as const : 'low' as const),
      alpha: 0.05,
    }))
  }, [statisticalResult])

  // Layer 2 표시 여부 (상세 결과 + 메타데이터)
  const hasDetailedResults = useMemo(() => {
    if (!statisticalResult) return false
    return !!(
      statisticalResult.confidenceInterval ||
      statisticalResult.effectSize ||
      (statisticalResult.additionalResults && statisticalResult.additionalResults.length > 0) ||
      uploadedFileName ||
      uploadedData
    )
  }, [statisticalResult, uploadedFileName, uploadedData])

  // Layer 3 표시 여부 (가정검정, 권장사항, 경고, 대안 중 하나라도 있을 때)
  const hasDiagnostics = useMemo(() => {
    if (!statisticalResult) return false
    return !!(
      (statisticalResult.assumptions && statisticalResult.assumptions.length > 0) ||
      (statisticalResult.recommendations && statisticalResult.recommendations.length > 0) ||
      (statisticalResult.warnings && statisticalResult.warnings.length > 0) ||
      (statisticalResult.alternatives && statisticalResult.alternatives.length > 0)
    )
  }, [statisticalResult])

  // APA 형식 요약
  const apaFormat = useMemo(() => {
    if (!statisticalResult || statisticalResult.df === undefined) return null
    return formatStatisticalResult(
      statisticalResult.statisticName || 'Statistic',
      statisticalResult.statistic,
      statisticalResult.df,
      statisticalResult.pValue
    )
  }, [statisticalResult])

  // Handlers
  const handleSaveToHistory = useCallback(async () => {
    const defaultName = `분석 ${new Date().toLocaleString('ko-KR')}`
    const name = prompt('분석 이름을 입력하세요:', defaultName)

    if (name && name.trim()) {
      const sanitizedName = name.trim().slice(0, 100)
      try {
        await saveToHistory(sanitizedName)
        setIsSaved(true)
        toast.success('저장되었습니다')

        if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
        savedTimeoutRef.current = setTimeout(() => {
          setIsSaved(false)
          savedTimeoutRef.current = null
        }, 3000)
      } catch (err) {
        toast.error('저장 실패', {
          description: err instanceof Error ? err.message : '알 수 없는 오류'
        })
      }
    }
  }, [saveToHistory])

  const handleReanalyze = useCallback(() => {
    setUploadedData(null)
    setUploadedFile(null)
    setValidationResults(null)
    setResults(null)
    setIsReanalysisMode(true)
    setCurrentStep(1)

    toast.info('새 데이터를 업로드하세요', {
      description: selectedMethod ? `${selectedMethod.name} 분석이 준비되어 있습니다` : ''
    })
  }, [setUploadedData, setUploadedFile, setValidationResults, setResults, setIsReanalysisMode, setCurrentStep, selectedMethod])

  const handleNewAnalysis = useCallback(async () => {
    try {
      await startNewAnalysis()
      toast.info('새 분석을 시작합니다')
    } catch (error) {
      console.error('Failed to start new analysis:', error)
      reset()
      toast.info('새 분석을 시작합니다')
    }
  }, [reset])

  const handleGeneratePDF = useCallback(async () => {
    if (!results) return
    setIsGeneratingPDF(true)

    try {
      const dataInfo = uploadedData && uploadedData.length > 0 ? {
        totalRows: uploadedData.length,
        columnCount: Object.keys(uploadedData[0] || {}).length,
        variables: Object.keys(uploadedData[0] || {})
      } : undefined

      await PDFReportService.generateReport({
        title: `${results.method} Analysis Report`,
        date: new Date(),
        analysisResult: results,
        dataInfo,
        chartElement: chartRef.current
      })

      toast.success('PDF 보고서가 생성되었습니다')
    } catch (error) {
      console.error('PDF 생성 실패:', error)
      toast.error('PDF 생성에 실패했습니다')
    } finally {
      setIsGeneratingPDF(false)
    }
  }, [results, uploadedData])

  
  const handleAIChat = useCallback(() => {
    // 분석 결과를 채팅 컨텍스트로 전달 (향후 구현 예정)
    openChatPanel()
    toast.info('AI 도우미가 열렸습니다', {
      description: '분석 결과에 대해 질문해 보세요'
    })
  }, [openChatPanel])

  const handleCopyResults = useCallback(async () => {
    if (!results) return

    try {
      const summary = PDFReportService.generateSummaryText(results)
      await navigator.clipboard.writeText(summary)

      setIsCopied(true)
      toast.success('복사되었습니다')

      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
      copiedTimeoutRef.current = setTimeout(() => {
        setIsCopied(false)
        copiedTimeoutRef.current = null
      }, 2000)
    } catch (err) {
      console.error('복사 실패:', err)
      toast.error('복사 실패')
    }
  }, [results])

  if (!results || !statisticalResult) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">분석을 먼저 실행해주세요.</p>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-6" ref={chartRef}>
        {/* ===== 메인 결과 카드 ===== */}
        <Card className={cn(
          "overflow-hidden",
          !assumptionsPassed ? "border-amber-300" :
          isSignificant ? "border-green-300" : "border-gray-200"
        )}>
          {/* 헤더: 분석명 + 시간 */}
          <CardHeader className="pb-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                {!assumptionsPassed ? (
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                ) : isSignificant ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-400" />
                )}
                {statisticalResult.testName}
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {new Date().toLocaleString('ko-KR', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            {/* ===== 핵심 결론 (1줄) ===== */}
            <div className={cn(
              "p-3 rounded-lg text-center font-medium",
              !assumptionsPassed ? "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200" :
              isSignificant ? "bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-200" :
              "bg-gray-50 text-gray-600 dark:bg-gray-900/30 dark:text-gray-300"
            )}>
              {!assumptionsPassed ? (
                "⚠️ 일부 가정 미충족 - 결과 해석에 주의 필요"
              ) : isSignificant ? (
                "✓ 통계적으로 유의한 차이가 있습니다"
              ) : (
                "통계적으로 유의한 차이가 없습니다"
              )}
            </div>

            {/* ===== 핵심 숫자 3개 ===== */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 통계량 */}
              <StatisticCard label="통계량" tooltip="검정통계량: 귀무가설 하에서 표본 데이터가 얼마나 극단적인지 나타냅니다.">
                <p className="text-xl font-bold font-mono">
                  {statisticalResult.statisticName || 't'} = {(statisticalResult.statistic ?? 0).toFixed(2)}
                </p>
                {statisticalResult.df && (
                  <p className="text-xs text-muted-foreground mt-1">
                    df = {Array.isArray(statisticalResult.df) ? statisticalResult.df.join(', ') : statisticalResult.df}
                  </p>
                )}
              </StatisticCard>

              {/* p-value */}
              <StatisticCard label="유의확률" tooltip="p < 0.05이면 통계적으로 유의합니다.">
                <p className={cn(
                  "text-xl font-bold font-mono",
                  isSignificant ? "text-green-600 dark:text-green-400" : "text-gray-500"
                )}>
                  p {formatPValue(statisticalResult.pValue)}
                </p>
                <Badge variant={isSignificant ? "default" : "secondary"} className="mt-1 text-xs">
                  {isSignificant ? '유의함' : '유의하지 않음'}
                </Badge>
              </StatisticCard>

              {/* 효과크기 */}
              <StatisticCard label="효과크기" tooltip="효과크기: 실질적인 효과의 크기를 나타냅니다. 작음(<0.2), 중간(0.2-0.5), 큼(>0.5)">
                {statisticalResult.effectSize ? (
                  <>
                    <p className="text-xl font-bold font-mono">
                      {(statisticalResult.effectSize.value ?? 0).toFixed(2)}
                    </p>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {getEffectSizeInterpretation(statisticalResult.effectSize.value, statisticalResult.effectSize.type)}
                    </Badge>
                  </>
                ) : (
                  <p className="text-xl font-bold text-muted-foreground">-</p>
                )}
              </StatisticCard>
            </div>

            {/* ===== 해석 ===== */}
            {statisticalResult.interpretation && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  💡 {statisticalResult.interpretation}
                </p>
              </div>
            )}

            {/* ===== Layer 2: 상세 결과 (접기/펼치기) ===== */}
            {hasDetailedResults && (
              <CollapsibleSection
                label="상세 결과"
                open={detailedResultsOpen}
                onOpenChange={setDetailedResultsOpen}
                contentClassName="pt-3 space-y-4"
                icon={<BarChart3 className="h-3.5 w-3.5" />}
              >
                {/* 신뢰구간 */}
                {statisticalResult.confidenceInterval && (
                  <ConfidenceIntervalDisplay
                    label="신뢰구간"
                    lower={statisticalResult.confidenceInterval.lower}
                    upper={statisticalResult.confidenceInterval.upper}
                    estimate={statisticalResult.confidenceInterval.estimate}
                    level={Math.round((statisticalResult.confidenceInterval.level ?? 0.95) * 100)}
                    showVisualization
                    showInterpretation
                    className="border-0 shadow-none bg-transparent"
                  />
                )}

                {/* 효과크기 상세 스케일 */}
                {statisticalResult.effectSize && (
                  <EffectSizeCard
                    title="효과크기 상세"
                    value={statisticalResult.effectSize.value}
                    type={statisticalResult.effectSize.type}
                    showInterpretation
                    showVisualScale
                    className="border-0 shadow-none bg-transparent"
                  />
                )}

                {/* 추가 결과 테이블 (그룹통계, 사후검정, 회귀계수) */}
                {statisticalResult.additionalResults?.map((table, idx) => (
                  <StatisticsTable
                    key={idx}
                    title={table.title}
                    columns={(table.columns as Array<{ key: string; label: string }>).map(col => ({
                      key: col.key,
                      header: col.label,
                    }))}
                    data={table.data}
                    compactMode
                    className="border-0 shadow-none"
                  />
                ))}

                {/* APA 형식 요약 */}
                {apaFormat && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">APA 형식</p>
                    <code className="text-sm font-mono">{apaFormat}</code>
                  </div>
                )}

                {/* 메타데이터 */}
                <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t">
                  {uploadedFileName && (
                    <div>
                      <span className="text-muted-foreground">파일: </span>
                      <span className="font-medium">{uploadedFileName}</span>
                    </div>
                  )}
                  {uploadedData && (
                    <div>
                      <span className="text-muted-foreground">데이터: </span>
                      <span className="font-medium">{uploadedData.length}행 × {Object.keys(uploadedData[0] || {}).length}열</span>
                    </div>
                  )}
                  {statisticalResult.variables && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">변수: </span>
                      <span className="font-medium">{statisticalResult.variables.join(', ')}</span>
                    </div>
                  )}
                </div>
              </CollapsibleSection>
            )}

            {/* ===== Layer 3: 진단 & 권장 (접기/펼치기) ===== */}
            {hasDiagnostics && (
              <CollapsibleSection
                label="진단 & 권장"
                open={diagnosticsOpen}
                onOpenChange={setDiagnosticsOpen}
                contentClassName="pt-3 space-y-4"
                icon={<Lightbulb className="h-3.5 w-3.5" />}
                badge={
                  !assumptionsPassed ? (
                    <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                      주의
                    </Badge>
                  ) : undefined
                }
              >
                {/* 가정 검정 상세 */}
                {assumptionTests.length > 0 && (
                  <AssumptionTestCard
                    tests={assumptionTests}
                    testType={statisticalResult.testType}
                    showRecommendations
                    showDetails
                    className="border-0 shadow-none bg-transparent"
                  />
                )}

                {/* 권장사항 */}
                {statisticalResult.recommendations && statisticalResult.recommendations.length > 0 && (
                  <div className="space-y-2" data-testid="recommendations-section">
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-blue-600" />
                      권장사항
                    </p>
                    <ul className="space-y-1.5">
                      {statisticalResult.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <ChevronRight className="w-3 h-3 mt-1 shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 경고 (generateWarnings()는 가정 관련 경고만 생성 → AssumptionTestCard와 중복 제거) */}
                {statisticalResult.warnings && statisticalResult.warnings.length > 0 &&
                  assumptionTests.length === 0 && (
                  <Alert variant="destructive" data-testid="warnings-section">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>주의사항</AlertTitle>
                    <AlertDescription>
                      <ul className="mt-1 space-y-1">
                        {statisticalResult.warnings.map((warning, idx) => (
                          <li key={idx} className="text-sm">{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* 대안 분석 방법 (AssumptionTestCard가 testType으로 이미 표시하는 경우 중복 제거) */}
                {statisticalResult.alternatives && statisticalResult.alternatives.length > 0 &&
                  !statisticalResult.testType && (
                  <div className="space-y-2" data-testid="alternatives-section">
                    <p className="text-sm font-medium">대안 분석 방법</p>
                    <div className="space-y-1.5">
                      {statisticalResult.alternatives.map((alt, idx) => (
                        <div key={idx} className={cn("p-2.5 rounded-lg border text-sm",
                          alt.action ? "hover:bg-muted/50 cursor-pointer transition-colors" : ""
                        )} onClick={alt.action}>
                          <span className="font-medium">{alt.name}</span>
                          <span className="text-muted-foreground ml-1.5">{alt.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </CollapsibleSection>
            )}
          </CardContent>
        </Card>

        {/* ===== 액션 버튼 (1줄) ===== */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Primary Actions */}
          <Button
            variant={isSaved ? "default" : "outline"}
            size="sm"
            onClick={handleSaveToHistory}
            className="flex-1"
          >
            <Save className="w-4 h-4 mr-1.5" />
            {isSaved ? '저장됨' : '저장'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleGeneratePDF}
            disabled={isGeneratingPDF}
            className="flex-1"
          >
            <FileDown className="w-4 h-4 mr-1.5" />
            {isGeneratingPDF ? '생성중...' : 'PDF'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyResults}
            className="flex-1"
          >
            <Copy className="w-4 h-4 mr-1.5" />
            {isCopied ? '복사됨' : '복사'}
          </Button>

          {/* AI Chat Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAIChat}
                  disabled={!ollamaStatus?.hasInferenceModel}
                  className={cn(
                    "flex-1",
                    ollamaStatus?.hasInferenceModel
                      ? "border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-950/30"
                      : ""
                  )}
                >
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  AI 해석
                </Button>
              </span>
            </TooltipTrigger>
            {!ollamaStatus?.hasInferenceModel && (
              <TooltipContent>
                <p>AI 모델(Ollama)이 설정되지 않았습니다</p>
              </TooltipContent>
            )}
          </Tooltip>

          {/* More Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTemplateModalOpen(true)}>
                <FileText className="w-4 h-4 mr-2" />
                템플릿으로 저장
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleReanalyze}>
                <RefreshCw className="w-4 h-4 mr-2" />
                다른 데이터로 재분석
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleNewAnalysis}>
                <RotateCcw className="w-4 h-4 mr-2" />
                새 분석 시작
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* 템플릿 저장 모달 */}
        <TemplateSaveModal
          open={templateModalOpen}
          onOpenChange={setTemplateModalOpen}
          onSaved={() => {
            toast.success('템플릿이 저장되었습니다')
          }}
        />
      </div>
    </TooltipProvider>
  )
}
