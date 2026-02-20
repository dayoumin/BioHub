'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { BarChart3, CheckCircle2, Loader2, AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
// Fix 4-C: Tooltip imports 제거 (일시정지 버튼 제거로 불필요)
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { StatisticalExecutor } from '@/lib/services/executors'
import type { StatisticalExecutorResult as ExecutorResult } from '@/lib/services/executors'
import { pyodideStats } from '@/lib/services/pyodide-statistics'
import { transformExecutorResult } from '@/lib/utils/result-transformer'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { StepHeader, StatusIndicator, CollapsibleSection } from '@/components/smart-flow/common'
import { logger } from '@/lib/utils/logger'
import type { AnalysisExecutionStepProps } from '@/types/smart-flow-navigation'
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import type { StatisticalAssumptions } from '@/types/smart-flow'
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
  canGoNext,
  canGoPrevious
}: AnalysisExecutionStepProps) {
  // Terminology System
  const t = useTerminology()

  // 실행 단계 (terminology 기반)
  const executionStages = useMemo(() =>
    STAGE_IDS.map(id => ({
      id,
      label: t.smartFlow.executionStages[id].label,
      range: STAGE_RANGES[id],
      message: t.smartFlow.executionStages[id].message
    }))
  , [t])

  // 상태 관리
  const [progress, setProgress] = useState(0)
  const [currentStage, setCurrentStage] = useState(executionStages[0])
  const [completedStages, setCompletedStages] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  // Fix 4-B: useRef로 취소 플래그 관리 (stale closure 방지)
  const cancelledRef = useRef(false)
  const [isCancelled, setIsCancelled] = useState(false)
  const [executionLog, setExecutionLog] = useState<string[]>([])
  const [showDetailedLog, setShowDetailedLog] = useState(false)
  const [estimatedTime, setEstimatedTime] = useState(5) // 초 단위
  const [analysisResult, setAnalysisResult] = useState<ExecutorResult | null>(null)

  // Store에서 필요한 데이터만 개별 selector로 구독 (불필요한 리렌더링 방지)
  const uploadedData = useSmartFlowStore(state => state.uploadedData)
  const validationResults = useSmartFlowStore(state => state.validationResults)
  const setAssumptionResults = useSmartFlowStore(state => state.setAssumptionResults)
  const suggestedSettings = useSmartFlowStore(state => state.suggestedSettings)

  /**
   * 로그 추가 함수
   */
  const logs = t.smartFlow.executionLogs

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString(logs.locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    setExecutionLog(prev => [...prev, `[${timestamp}] ${message}`])
    logger.info(message)
  }, [logs.locale])

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
  }, [addLog, executionStages])

  /**
   * 분석 실행 함수
   */
  const runAnalysis = useCallback(async () => {
    if (!uploadedData || !selectedMethod) {
      setError(t.smartFlow.execution.dataRequired)
      return
    }

    try {
      const executor = StatisticalExecutor.getInstance()
      const startTime = Date.now()

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
      await new Promise(resolve => setTimeout(resolve, 500))

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

      // Stage 3: 가정 검정 (실제 PyodideCore 호출)
      const assumptions: StatisticalAssumptions = {}

      if (validationResults?.columnStats) {
        const numericColumns = validationResults.columnStats.filter(s => s.type === 'numeric')
        const categoricalColumns = validationResults.columnStats.filter(s =>
          s.type === 'categorical' || (s.type === 'numeric' && s.uniqueValues <= 20)
        )

        // Shapiro-Wilk 정규성 검정 (첫 번째 수치형 변수)
        if (numericColumns.length > 0 && uploadedData.length >= 3) {
          try {
            const firstNumericCol = numericColumns[0].name
            const numericData = uploadedData
              .map(row => row[firstNumericCol])
              .filter((val): val is number => typeof val === 'number' && !isNaN(val))

            if (numericData.length >= 3) {
              addLog(logs.normalityTestStart)
              const pyodideCore = PyodideCoreService.getInstance()
              const shapiroResult = await pyodideCore.shapiroWilkTest(numericData)

              if (shapiroResult.statistic !== undefined && shapiroResult.pValue !== undefined) {
                assumptions.normality = {
                  shapiroWilk: {
                    statistic: shapiroResult.statistic,
                    pValue: shapiroResult.pValue,
                    isNormal: shapiroResult.pValue > 0.05
                  }
                }
                addLog(logs.normalityTestDone(shapiroResult.pValue.toFixed(4)))
              }
            }
          } catch (error) {
            logger.warn('Shapiro-Wilk 검정 실패', { error })
            addLog(logs.normalityTestFailed)
          }
        }

        // Levene 등분산성 검정 (그룹 변수가 있을 때)
        if (categoricalColumns.length > 0 && numericColumns.length > 0 && uploadedData.length >= 6) {
          try {
            const numericCol = numericColumns[0].name
            const groupColumn = categoricalColumns.find(col => col.name !== numericCol)

            if (groupColumn) {
              const groupCol = groupColumn.name

              // 그룹별 데이터 분리
              const groupMap = new Map<string, number[]>()
              for (const row of uploadedData) {
                const groupValue = String(row[groupCol])
                const numericValue = row[numericCol]

                if (typeof numericValue === 'number' && !isNaN(numericValue)) {
                  if (!groupMap.has(groupValue)) {
                    groupMap.set(groupValue, [])
                  }
                  const group = groupMap.get(groupValue)
                  if (group) group.push(numericValue)
                }
              }

              // 2개 이상의 그룹이 있고, 각 그룹에 3개 이상의 데이터가 있을 때
              const groups = Array.from(groupMap.values())
              if (groups.length >= 2 && groups.every(g => g.length >= 3)) {
                addLog(logs.homogeneityTestStart)
                const pyodideCore = PyodideCoreService.getInstance()
                const leveneResult = await pyodideCore.leveneTest(groups)

                if (leveneResult.statistic !== undefined && leveneResult.pValue !== undefined) {
                  assumptions.homogeneity = {
                    levene: {
                      statistic: leveneResult.statistic,
                      pValue: leveneResult.pValue,
                      equalVariance: leveneResult.pValue > 0.05
                    }
                  }
                  addLog(logs.homogeneityTestDone(leveneResult.pValue.toFixed(4)))
                }
              }
            }
          } catch (error) {
            logger.warn('Levene 검정 실패', { error })
            addLog(logs.homogeneityTestFailed)
          }
        }

        // 가정 검정 결과 저장
        if (Object.keys(assumptions).length > 0) {
          setAssumptionResults(assumptions)
          logger.info('가정 검정 결과 저장 완료', { assumptions })
        } else {
          addLog(logs.assumptionSkipped)
        }
      }

      if (cancelledRef.current) return

      setCompletedStages(prev => [...prev, 'assumptions'])
      updateStage('analysis', 60)

      // Stage 4: 주 분석 실행
      addLog(logs.methodExecuting(selectedMethod.name))

      // Fix 4-A: 실제 적용되는 설정만 로그에 표시 (현재 alpha만 지원)
      if (suggestedSettings) {
        const appliedAlpha = suggestedSettings.alpha ?? 0.05
        addLog(logs.aiSettingsApplied(appliedAlpha))
        // postHoc, alternative는 아직 미지원 — 추천만 표시
        if (suggestedSettings.postHoc) {
          addLog(logs.aiPostHoc(suggestedSettings.postHoc))
        }
        if (suggestedSettings.alternative) {
          addLog(logs.aiAlternative(suggestedSettings.alternative))
        }
      }

      const result = await executor.executeMethod(
        selectedMethod,
        uploadedData,
        (variableMapping as Record<string, unknown>) || {},
        suggestedSettings
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
      await new Promise(resolve => setTimeout(resolve, 300))
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

      // 다음 단계로 자동 이동 (2초 후)
      setTimeout(() => {
        if (onNext) onNext()
      }, 2000)

    } catch (err) {
      logger.error('분석 실행 오류', err)
      setError(err instanceof Error ? err.message : t.smartFlow.execution.unknownError)
      addLog(logs.errorPrefix(err instanceof Error ? err.message : t.smartFlow.execution.unknownError))
    }
  }, [uploadedData, selectedMethod, variableMapping, suggestedSettings, updateStage, addLog, onAnalysisComplete, onNext, t, executionStages, logs])

  /**
   * 취소 처리 (Fix 4-B: ref로 즉시 반영)
   */
  const handleCancel = useCallback(() => {
    if (window.confirm(t.smartFlow.execution.cancelConfirm)) {
      cancelledRef.current = true
      setIsCancelled(true)
      addLog(logs.userCancelled)
      if (onPrevious) onPrevious()
    }
  }, [addLog, logs, onPrevious, t])

  // 컴포넌트 마운트 시 분석 실행 (variableMapping이 유효할 때만)
  useEffect(() => {
    // variableMapping 유효성 검사: groupVar 또는 dependentVar가 있어야 함
    const hasValidMapping = variableMapping && (
      (variableMapping as Record<string, unknown>).groupVar ||
      (variableMapping as Record<string, unknown>).dependentVar ||
      (variableMapping as Record<string, unknown>).variables
    )

    if (!isCancelled && !analysisResult && hasValidMapping) {
      logger.info('Starting analysis with variableMapping', { variableMapping })
      runAnalysis()
    } else if (!hasValidMapping && !analysisResult) {
      logger.warn('Waiting for valid variableMapping', { variableMapping })
    }
  }, [isCancelled, analysisResult, variableMapping, runAnalysis])

  // 예상 시간 업데이트
  useEffect(() => {
    const dataSize = uploadedData?.length || 0
    if (dataSize < 1000) setEstimatedTime(5)
    else if (dataSize < 10000) setEstimatedTime(15)
    else if (dataSize < 100000) setEstimatedTime(60)
    else setEstimatedTime(120)
  }, [uploadedData])

  return (
    <div className="space-y-6">
      {/* 헤더 패턴: Icon + Title + Method Badge */}
      <StepHeader
          icon={BarChart3}
          title={t.smartFlow.stepTitles.analysisExecution}
          badge={selectedMethod ? { label: selectedMethod.name } : undefined}
        />

      {/* 오류 표시 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 메인 진행 상황 */}
      {progress === 100 ? (
        /* 완료 시: 성공 배너 (green 패턴) */
        <StatusIndicator status="success" title={t.smartFlow.statusMessages.analysisComplete} />
      ) : (
        /* 진행 중: Card 래핑 프로그레스 UI */
        <Card>
          <CardContent className="pt-8 pb-6">
            <div className="text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                  <BarChart3 className="w-10 h-10 text-primary animate-pulse" />
                </div>

                <h3 className="text-xl font-semibold mb-2">{t.smartFlow.execution.runningTitle}</h3>
                <p className="text-muted-foreground">{currentStage.message}</p>
              </div>

              {/* 진행률 바 */}
              <div className="max-w-2xl mx-auto mb-6">
                <Progress value={progress} className="h-3" />
                <div className="flex justify-between text-sm text-muted-foreground mt-2">
                  <span>{progress}%</span>
                  <span>{t.smartFlow.execution.estimatedTimeRemaining(Math.ceil(estimatedTime * (100 - progress) / 100))}</span>
                </div>
              </div>

              {/* 단계별 진행 상황 */}
              <div className="max-w-md mx-auto text-left space-y-3">
                {executionStages.map((stage) => {
                  const isCompleted = completedStages.includes(stage.id)
                  const isCurrent = currentStage.id === stage.id && !isCompleted

                  return (
                    <div key={stage.id} className="flex items-center gap-3">
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                      ) : isCurrent ? (
                        <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-muted flex-shrink-0" />
                      )}
                      <span className={`text-sm ${
                        isCompleted ? 'text-muted-foreground line-through' :
                        isCurrent ? 'font-medium text-foreground' :
                        'text-muted-foreground/50'
                      }`}>
                        {stage.label}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* 취소 버튼 (Fix 4-C: 동작하지 않는 일시정지 버튼 제거) */}
              {!error && (
                <div className="flex justify-center gap-3 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                  >
                    <X className="w-4 h-4 mr-2" />
                    {t.smartFlow.execution.cancelButton}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 상세 실행 로그 (Collapsible) */}
      <CollapsibleSection
        label={t.smartFlow.execution.logSectionLabel(executionLog.length)}
        open={showDetailedLog}
        onOpenChange={setShowDetailedLog}
        contentClassName="pt-2"
      >
        <div className="bg-muted/50 rounded-lg border p-3 max-h-48 overflow-y-auto">
          {executionLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.smartFlow.execution.noLogs}</p>
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
    </div>
  )
}
