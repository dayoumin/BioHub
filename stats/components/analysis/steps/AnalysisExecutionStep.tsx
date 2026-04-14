'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { BarChart3, CheckCircle2, Loader2, AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  StatisticalExecutor,
  type StatisticalExecutorResult as ExecutorResult,
  pyodideStats,
  awaitPreemptiveAssumptions,
  executeAssumptionTests,
} from '@/lib/services'
import { transformExecutorResult } from '@/lib/utils/result-transformer'
import { getUserFriendlyErrorMessage } from '@/lib/constants/error-messages'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { normalizeSelectedMethod } from '@/lib/stores/analysis-transitions'
import { getMethodRequirements } from '@/lib/statistics/variable-requirements'
import { buildAnalysisExecutionContext } from '@/lib/utils/analysis-execution'
import { StepHeader, StatusIndicator, CollapsibleSection } from '@/components/analysis/common'
import { logger } from '@/lib/utils/logger'
import type { AnalysisExecutionStepProps } from '@/types/analysis-navigation'
import { useTerminology } from '@/hooks/use-terminology'

// Stage IDs (순서 고정)
const STAGE_IDS = ['prepare', 'preprocess', 'assumptions', 'analysis', 'additional', 'finalize'] as const
type StageId = typeof STAGE_IDS[number]

// 진행률 범위 정의
const STAGE_RANGES: Record<StageId, [number, number]> = {
  prepare: [0, 15],
  preprocess: [15, 30],
  assumptions: [30, 50],
  analysis: [50, 75],
  additional: [75, 90],
  finalize: [90, 100]
}

export function AnalysisExecutionStep({
  selectedMethod,
  variableMapping,
  onAnalysisComplete,
  onNext,
  onPrevious,
  canGoNext: _canGoNext,
  canGoPrevious: _canGoPrevious
}: AnalysisExecutionStepProps) {
  // Terminology System
  const t = useTerminology()

  // 실행 단계 (terminology 기반)
  const executionStages = useMemo(() =>
    STAGE_IDS.map(id => ({
      id,
      label: t.analysis.executionStages[id].label,
      range: STAGE_RANGES[id],
      message: t.analysis.executionStages[id].message
    }))
  , [t])

  // 상태 관리
  const [progress, setProgress] = useState(0)
  const [currentStage, setCurrentStage] = useState(executionStages[0])
  const [completedStages, setCompletedStages] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const cancelledRef = useRef(false)
  const [isCancelled, setIsCancelled] = useState(false)
  const [executionLog, setExecutionLog] = useState<string[]>([])
  const [showDetailedLog, setShowDetailedLog] = useState(false)
  const [estimatedTime, setEstimatedTime] = useState(5) // 초 단위
  const [analysisResult, setAnalysisResult] = useState<ExecutorResult | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [assumptionSkipped, setAssumptionSkipped] = useState(false)
  const analysisStartTimeRef = useRef(0)
  const autoNextTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Store에서 필요한 데이터만 개별 selector로 구독 (불필요한 리렌더링 방지)
  const uploadedData = useAnalysisStore(state => state.uploadedData)
  const existingAssumptionResults = useAnalysisStore(state => state.assumptionResults)
  const setAssumptionResults = useAnalysisStore(state => state.setAssumptionResults)
  const suggestedSettings = useAnalysisStore(state => state.suggestedSettings)
  const analysisOptions = useAnalysisStore(state => state.analysisOptions)
  const normalizedSelectedMethod = useMemo(
    () => normalizeSelectedMethod(selectedMethod),
    [selectedMethod]
  )
  const methodRequirements = useMemo(
    () => (normalizedSelectedMethod?.id ? getMethodRequirements(normalizedSelectedMethod.id) : undefined),
    [normalizedSelectedMethod?.id]
  )
  const {
    effectiveExecutionSettings,
    effectiveExecutionVariables,
    executionSettingEntries,
  } = useMemo(() => buildAnalysisExecutionContext({
    analysisOptions,
    methodRequirements,
    selectedMethodId: normalizedSelectedMethod?.id,
    suggestedSettings,
    variableMapping,
  }), [
    analysisOptions,
    methodRequirements,
    normalizedSelectedMethod?.id,
    suggestedSettings,
    variableMapping,
  ])

  /**
   * 로그 추가 함수
   */
  const logs = t.analysis.executionLogs

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString(logs.locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    setExecutionLog(prev => [...prev, `[${timestamp}] ${message}`])
    logger.info(message)
  }, [logs])

  /**
   * 진행 단계 업데이트
   */
  const updateStage = useCallback((stageId: string, progressValue: number) => {
    const stage = executionStages.find(s => s.id === stageId)
    if (stage) {
      setCurrentStage(stage)
      setProgress(progressValue)
      addLog(logs.stageStart(stage.label))
    }
  }, [addLog, executionStages, logs])

  /**
   * 분석 실행 함수
   */
  const runAnalysis = useCallback(async () => {
    if (!uploadedData || !normalizedSelectedMethod) {
      setError(t.analysis.execution.dataRequired)
      return
    }

    try {
      const executor = StatisticalExecutor.getInstance()
      const startTime = Date.now()
      analysisStartTimeRef.current = startTime

      // Stage 1: 환경 준비
      updateStage('prepare', 5)

      // Pyodide가 이미 초기화되어 있으면 빠르게 진행
      const isAlreadyInitialized = pyodideStats.isInitialized()
      if (isAlreadyInitialized) {
        addLog(logs.engineReadyCached)
        setProgress(15) // 빠르게 진행
      } else {
        addLog(logs.engineLoading)
        await pyodideStats.initialize()
        addLog(logs.engineReady)
      }

      if (cancelledRef.current) return

      setCompletedStages(['prepare'])
      updateStage('preprocess', 20)

      // Stage 2: 데이터 전처리
      // 데이터 정보 로깅
      addLog(logs.dataLoaded(uploadedData.length))

      // 결측값 처리
      const missingCount = uploadedData.filter(row =>
        Object.values(row).some(v => v === null || v === undefined || v === '')
      ).length
      if (missingCount > 0) {
        addLog(logs.missingHandled(missingCount))
      }

      if (cancelledRef.current) return

      setCompletedStages(prev => [...prev, 'preprocess'])
      updateStage('assumptions', 35)

      // Stage 3: 가정 검정 — 기존 결과(diagnostic bridge) > 선행 결과 > 직접 실행
      {
        addLog(logs.normalityTestStart)
        let assumptionResult: Awaited<ReturnType<typeof awaitPreemptiveAssumptions>> = null

        // Diagnostic Pipeline에서 이미 실행된 가정 검정 결과가 있으면 재사용
        if (existingAssumptionResults) {
          assumptionResult = existingAssumptionResults
          logger.info('기존 가정 검정 결과 재사용 (diagnostic pipeline)', { testedVariable: assumptionResult.testedVariable })
        } else {
          try {
            assumptionResult = await awaitPreemptiveAssumptions()
          } catch (err) {
            logger.error('선행 가정 검정 대기 실패', { error: err, method: normalizedSelectedMethod.id })
          }

          if (assumptionResult) {
            logger.info('선행 가정 검정 결과 사용', { testedVariable: assumptionResult.testedVariable })
          } else if (variableMapping) {
            try {
              assumptionResult = await executeAssumptionTests(variableMapping, uploadedData)
            } catch (err) {
              logger.error('가정 검정 실행 실패', { error: err, method: normalizedSelectedMethod.id })
            }
            if (!assumptionResult) {
              addLog(logs.assumptionSkipped)
              setAssumptionSkipped(true)
            }
          } else {
            addLog(logs.assumptionSkipped)
            setAssumptionSkipped(true)
          }
        }

        setAssumptionResults(assumptionResult)
      }

      if (cancelledRef.current) return

      setCompletedStages(prev => [...prev, 'assumptions'])
      updateStage('analysis', 60)

      // Stage 4: 주 분석 실행
      addLog(logs.methodExecuting(normalizedSelectedMethod.name))

      // 적용되는 설정 로그 표시
      addLog(logs.aiSettingsApplied(Number(effectiveExecutionSettings.alpha ?? 0.05)))
      if (typeof effectiveExecutionSettings.postHoc === 'string') {
        addLog(logs.aiPostHoc(effectiveExecutionSettings.postHoc))
      }
      if (typeof effectiveExecutionSettings.alternative === 'string') {
        addLog(logs.aiAlternative(effectiveExecutionSettings.alternative))
      }

      const result = await executor.executeMethod(
        normalizedSelectedMethod,
        uploadedData,
        effectiveExecutionVariables,
        effectiveExecutionSettings
      )

      if (cancelledRef.current) return

      setCompletedStages(prev => [...prev, 'analysis'])
      updateStage('additional', 80)

      // Stage 5: 추가 계산
      if (result.additionalInfo.effectSize) {
        addLog(logs.effectSizeDone)
      }
      if (result.additionalInfo.confidenceInterval) {
        addLog(logs.confidenceIntervalDone)
      }

      if (cancelledRef.current) return

      setCompletedStages(prev => [...prev, 'additional'])
      updateStage('finalize', 95)

      // Stage 6: 결과 정리
      addLog(logs.analysisDone)

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)
      addLog(logs.totalTime(totalTime))

      setCompletedStages(prev => [...prev, 'finalize'])
      setProgress(100)
      setAnalysisResult(result)

      // 결과 전달 - Executor 결과를 Smart Flow UI 타입으로 변환
      if (onAnalysisComplete) {
        const transformedResult = transformExecutorResult(result)
        onAnalysisComplete(transformedResult)
      }

      if (onNext) {
        if (autoNextTimeoutRef.current) clearTimeout(autoNextTimeoutRef.current)
        autoNextTimeoutRef.current = setTimeout(() => {
          onNext()
          autoNextTimeoutRef.current = null
        }, 2000)
      }

    } catch (err) {
      logger.error('분석 실행 오류', err)
      const friendlyMsg = err instanceof Error
        ? (err.message || getUserFriendlyErrorMessage(err))
        : t.analysis.execution.unknownError
      setError(friendlyMsg)
      addLog(logs.errorPrefix(friendlyMsg))
    }
  }, [
    uploadedData,
    normalizedSelectedMethod,
    effectiveExecutionVariables,
    effectiveExecutionSettings,
    methodRequirements,
    existingAssumptionResults,
    setAssumptionResults,
    updateStage,
    addLog,
    onAnalysisComplete,
    onNext,
    t,
    logs,
  ])

  /**
   * 취소 처리
   */
  const handleCancelConfirm = useCallback(() => {
    setShowCancelDialog(false)
    cancelledRef.current = true
    setIsCancelled(true)
    addLog(logs.userCancelled)
    if (onPrevious) onPrevious()
  }, [addLog, logs, onPrevious])

  // variableMapping 유효성: 어떤 키든 값이 있으면 유효
  const methodAllowsEmptyMapping = (methodRequirements?.variables.length ?? -1) === 0
  const hasValidMapping = methodAllowsEmptyMapping || Boolean(
    variableMapping &&
      Object.values(variableMapping).some(v =>
        v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : v !== '')
      )
  )

  const mappedVariableCount = useMemo(() => {
    if (!variableMapping) return 0
    return Object.values(variableMapping).reduce((sum, value) => {
      if (Array.isArray(value)) return sum + value.length
      if (typeof value === 'string') {
        return sum + value.split(',').map(v => v.trim()).filter(Boolean).length
      }
      return sum
    }, 0)
  }, [variableMapping])

  // 컴포넌트 마운트 시 분석 실행 (variableMapping이 유효할 때만)
  useEffect(() => {
    if (!isCancelled && !analysisResult && hasValidMapping) {
      logger.info('Starting analysis with variableMapping', { variableMapping })
      runAnalysis()
    } else if (!hasValidMapping && !analysisResult) {
      logger.warn('Waiting for valid variableMapping', { variableMapping })
    }
  }, [isCancelled, analysisResult, hasValidMapping, runAnalysis, variableMapping])

  // 예상 시간 업데이트
  useEffect(() => {
    const dataSize = uploadedData?.length || 0
    if (dataSize < 1000) setEstimatedTime(5)
    else if (dataSize < 10000) setEstimatedTime(15)
    else if (dataSize < 100000) setEstimatedTime(60)
    else setEstimatedTime(120)
  }, [uploadedData])

  useEffect(() => {
    return () => {
      if (autoNextTimeoutRef.current) {
        clearTimeout(autoNextTimeoutRef.current)
        autoNextTimeoutRef.current = null
      }
    }
  }, [])


  return (
    <div className="space-y-6" data-testid="analysis-execution-step">
      {/* 헤더 패턴: Icon + Title + Method Badge */}
      <StepHeader
          icon={BarChart3}
          title={t.analysis.stepTitles.analysisExecution}
          badge={selectedMethod ? { label: selectedMethod.name } : undefined}
        />

      {selectedMethod && hasValidMapping && (
        <Card className="border-border/50 bg-surface-container-lowest shadow-[0px_6px_24px_rgba(25,28,30,0.04)]">
          <CardContent className="px-5 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                  Step 4
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">분석 설정을 확인하고 실행 중입니다</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  선택한 방법과 변수 구성을 기준으로 결과를 계산하고 있습니다.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="rounded-lg border border-border/50 bg-muted/25 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  표본 {uploadedData?.length ?? 0}
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/25 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  변수 {mappedVariableCount}개
                </div>
                {executionSettingEntries.map(entry => (
                  <div
                    key={entry.key}
                    className="rounded-lg border border-border/50 bg-muted/25 px-3 py-1.5 text-xs font-medium text-muted-foreground"
                    data-testid={`execution-setting-${entry.key}`}
                  >
                    {entry.label === entry.value ? entry.label : `${entry.label} ${entry.value}`}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 변수 매핑 미완료 경고 */}
      {!hasValidMapping && !error && (
        <Alert variant="destructive" className="border-error-border/70 bg-error-bg/80 shadow-[0px_6px_24px_rgba(25,28,30,0.04)]">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{t.analysis.execution.dataRequired}</span>
            {onPrevious && (
              <Button variant="outline" size="sm" onClick={onPrevious} className="shrink-0">
                {t.analysis.layout.prevStep}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* 오류 표시 */}
      {error && (
        <Alert variant="destructive" className="border-error-border/70 bg-error-bg/80 shadow-[0px_6px_24px_rgba(25,28,30,0.04)]">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex flex-col gap-2">
            <div>{error}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={runAnalysis} className="shrink-0">
                다시 시도
              </Button>
              {onPrevious && (
                <Button variant="ghost" size="sm" onClick={onPrevious} className="shrink-0">
                  변수 수정
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* C1: 가정 검정 건너뜀 경고 */}
      {assumptionSkipped && !error && (
        <Alert className="border-warning-border/70 bg-warning-bg/80 shadow-[0px_6px_24px_rgba(25,28,30,0.04)]">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {logs.assumptionSkippedWarning}
          </AlertDescription>
        </Alert>
      )}

      {/* 메인 진행 상황 */}
      {progress === 100 ? (
        /* 완료: 성공 메시지 + 결과 보기 버튼 */
        <Card className="border-border/50 bg-surface-container-lowest shadow-[0px_8px_28px_rgba(25,28,30,0.05)]">
          <CardContent className="py-8 text-center space-y-4">
            <StatusIndicator status="success" title={t.analysis.statusMessages.analysisComplete} />
            {onNext && (
              <Button size="lg" className="h-11 gap-2 px-5" onClick={onNext}>
                <CheckCircle2 className="w-4 h-4" />
                결과 보기
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        /* 진행 중: Card 래핑 프로그레스 UI */
        <Card className="border-border/50 bg-surface-container-lowest shadow-[0px_8px_28px_rgba(25,28,30,0.05)]">
          <CardContent className="pt-7 pb-6">
            <div className="space-y-7">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="text-center lg:text-left">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
                    <BarChart3 className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{t.analysis.execution.runningTitle}</h3>
                  <p className="text-muted-foreground">{currentStage.message}</p>
                </div>
                {!error && (
                  <div className="flex justify-center lg:justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCancelDialog(true)}
                    >
                      <X className="w-4 h-4 mr-2" />
                      {t.analysis.execution.cancelButton}
                    </Button>
                  </div>
                )}
              </div>

              {/* 진행률 바 */}
              <div className="max-w-3xl">
                <Progress value={progress} className="h-3" />
                <div className="flex justify-between text-sm text-muted-foreground mt-2">
                  <span>{progress}%</span>
                  <span>{t.analysis.execution.estimatedTimeRemaining(
                    progress > 5 && analysisStartTimeRef.current
                      ? Math.max(1, Math.ceil(((Date.now() - analysisStartTimeRef.current) / 1000) * (100 - progress) / progress))
                      : Math.ceil(estimatedTime * (100 - progress) / 100)
                  )}</span>
                </div>
              </div>

              {/* 단계별 진행 상황 */}
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
                <div className="text-left space-y-3">
                {executionStages.map((stage) => {
                  const isCompleted = completedStages.includes(stage.id)
                  const isCurrent = currentStage.id === stage.id && !isCompleted

                  return (
                    <div key={stage.id} className="flex items-center gap-3">
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                      ) : isCurrent ? (
                        <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-muted flex-shrink-0" />
                      )}
                      <span className={`text-sm ${
                        isCompleted ? 'text-muted-foreground/60' :
                        isCurrent ? 'font-medium text-foreground' :
                        'text-muted-foreground/40'
                      }`}>
                        {stage.label}
                      </span>
                    </div>
                  )
                })}
                </div>
                <div className="rounded-2xl border border-border/40 bg-muted/20 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    현재 상태
                  </p>
                  <p className="mt-2 text-sm text-foreground">{currentStage.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    진행 로그는 아래에서 확인할 수 있습니다.
                  </p>
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <div className="rounded-md border border-border/50 bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                      완료 단계 {completedStages.length}/{executionStages.length}
                    </div>
                    <div className="rounded-md border border-border/50 bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                      예상 {estimatedTime}s
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 상세 실행 로그 (Collapsible) */}
      <CollapsibleSection
        label={t.analysis.execution.logSectionLabel(executionLog.length)}
        open={showDetailedLog}
        onOpenChange={setShowDetailedLog}
        contentClassName="pt-2"
      >
        <div className="bg-muted/50 rounded-lg border p-3 max-h-48 overflow-y-auto">
          {executionLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.analysis.execution.noLogs}</p>
          ) : (
            <div className="space-y-1">
              {executionLog.map((log, index) => (
                <div key={index} className="text-xs font-mono text-muted-foreground">
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* 취소 확인 다이얼로그 */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.analysis.execution.cancelButton}</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {t.analysis.execution.cancelConfirm}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.analysis.execution.resumeButton}</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelConfirm}>
              {t.analysis.execution.cancelButton}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
