'use client'

import { useEffect, useState, useCallback } from 'react'
import { BarChart3, CheckCircle2, Loader2, AlertCircle, Pause, Play, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import type { StatisticalMethod } from '@/lib/statistics/method-mapping'
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import type { StatisticalAssumptions } from '@/types/smart-flow'

// 진행 단계 정의
const EXECUTION_STAGES = [
  { id: 'prepare', label: '분석 환경 준비', range: [0, 15], message: '분석 환경 준비 중...' },
  { id: 'preprocess', label: '데이터 전처리', range: [15, 30], message: '데이터 전처리 중...' },
  { id: 'assumptions', label: '통계적 가정 검증', range: [30, 50], message: '통계적 가정 검증 중...' },
  { id: 'analysis', label: '통계 분석 실행', range: [50, 75], message: '통계 분석 실행 중...' },
  { id: 'additional', label: '추가 통계량 계산', range: [75, 90], message: '추가 통계량 계산 중...' },
  { id: 'finalize', label: '결과 정리', range: [90, 100], message: '결과 정리 중...' }
]

export function AnalysisExecutionStep({
  selectedMethod,
  variableMapping,
  onAnalysisComplete,
  onNext,
  onPrevious,
  canGoNext,
  canGoPrevious
}: AnalysisExecutionStepProps) {
  // 상태 관리
  const [progress, setProgress] = useState(0)
  const [currentStage, setCurrentStage] = useState(EXECUTION_STAGES[0])
  const [completedStages, setCompletedStages] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPaused, setIsPaused] = useState(false)
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
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    setExecutionLog(prev => [...prev, `[${timestamp}] ${message}`])
    logger.info(message)
  }, [])

  /**
   * 진행 단계 업데이트
   */
  const updateStage = useCallback((stageId: string, progressValue: number) => {
    const stage = EXECUTION_STAGES.find(s => s.id === stageId)
    if (stage) {
      setCurrentStage(stage)
      setProgress(progressValue)
      addLog(stage.label + ' 시작')
    }
  }, [addLog])

  /**
   * 분석 실행 함수
   */
  const runAnalysis = useCallback(async () => {
    if (!uploadedData || !selectedMethod) {
      setError('분석에 필요한 데이터나 방법이 선택되지 않았습니다.')
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
        addLog('통계 엔진 준비 완료 (캐시됨)')
        setProgress(15) // 빠르게 진행
      } else {
        addLog('통계 엔진을 불러오는 중... (3-5초 소요)')
        await pyodideStats.initialize()
        addLog('통계 엔진 준비 완료')
      }

      if (isCancelled) return

      setCompletedStages(['prepare'])
      updateStage('preprocess', 20)

      // Stage 2: 데이터 전처리
      await new Promise(resolve => setTimeout(resolve, 500))

      // 데이터 정보 로깅
      addLog(`데이터 로드 완료 (n=${uploadedData.length})`)

      // 결측값 처리
      const missingCount = uploadedData.filter(row =>
        Object.values(row).some(v => v === null || v === undefined || v === '')
      ).length
      if (missingCount > 0) {
        addLog(`결측값 처리 완료 (제거: ${missingCount}개)`)
      }

      if (isCancelled) return

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
              addLog('정규성 검정 (Shapiro-Wilk) 시작...')
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
                addLog(`정규성 검정 완료 (p=${shapiroResult.pValue.toFixed(4)})`)
              }
            }
          } catch (error) {
            logger.warn('Shapiro-Wilk 검정 실패', { error })
            addLog('정규성 검정 실패 (데이터 부족 또는 오류)')
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
                  groupMap.get(groupValue)!.push(numericValue)
                }
              }

              // 2개 이상의 그룹이 있고, 각 그룹에 3개 이상의 데이터가 있을 때
              const groups = Array.from(groupMap.values())
              if (groups.length >= 2 && groups.every(g => g.length >= 3)) {
                addLog('등분산성 검정 (Levene) 시작...')
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
                  addLog(`등분산성 검정 완료 (p=${leveneResult.pValue.toFixed(4)})`)
                }
              }
            }
          } catch (error) {
            logger.warn('Levene 검정 실패', { error })
            addLog('등분산성 검정 실패 (데이터 부족 또는 오류)')
          }
        }

        // 가정 검정 결과 저장
        if (Object.keys(assumptions).length > 0) {
          setAssumptionResults(assumptions)
          logger.info('가정 검정 결과 저장 완료', { assumptions })
        } else {
          addLog('가정 검정 스킵 (조건 미충족)')
        }
      }

      if (isCancelled) return

      setCompletedStages(prev => [...prev, 'assumptions'])
      updateStage('analysis', 60)

      // Stage 4: 주 분석 실행
      addLog(`${selectedMethod.name} 실행`)

      // LLM 추천 설정이 있으면 executor에 전달 (alpha, postHoc 등)
      if (suggestedSettings) {
        addLog(`AI 추천 설정 적용: α=${suggestedSettings.alpha ?? 0.05}`)
      }

      const result = await executor.executeMethod(
        selectedMethod,
        uploadedData,
        (variableMapping as Record<string, unknown>) || {},
        suggestedSettings
      )

      if (isCancelled) return

      setCompletedStages(prev => [...prev, 'analysis'])
      updateStage('additional', 80)

      // Stage 5: 추가 계산
      if (result.additionalInfo.effectSize) {
        addLog('효과크기 계산 완료')
      }
      if (result.additionalInfo.confidenceInterval) {
        addLog('신뢰구간 계산 완료')
      }

      if (isCancelled) return

      setCompletedStages(prev => [...prev, 'additional'])
      updateStage('finalize', 95)

      // Stage 6: 결과 정리
      await new Promise(resolve => setTimeout(resolve, 300))
      addLog('분석 완료!')

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)
      addLog(`총 소요 시간: ${totalTime}초`)

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
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다')
      addLog(`❌ 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`)
    }
  }, [uploadedData, selectedMethod, variableMapping, suggestedSettings, isCancelled, updateStage, addLog, onAnalysisComplete, onNext])

  /**
   * 일시정지/재개 처리
   */
  const handlePauseResume = () => {
    setIsPaused(!isPaused)
    addLog(isPaused ? '분석 재개' : '분석 일시정지')
  }

  /**
   * 취소 처리
   */
  const handleCancel = () => {
    if (window.confirm('정말 취소하시겠습니까?\n현재까지 계산된 결과는 저장되지 않습니다.')) {
      setIsCancelled(true)
      addLog('사용자가 분석을 취소했습니다')
      if (onPrevious) onPrevious()
    }
  }

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
          title="분석 실행"
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
        <StatusIndicator status="success" title="분석이 완료되었습니다" />
      ) : (
        /* 진행 중: Card 래핑 프로그레스 UI */
        <Card>
          <CardContent className="pt-8 pb-6">
            <div className="text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                  <BarChart3 className="w-10 h-10 text-primary animate-pulse" />
                </div>

                <h3 className="text-xl font-semibold mb-2">분석 수행 중</h3>
                <p className="text-muted-foreground">{currentStage.message}</p>
              </div>

              {/* 진행률 바 */}
              <div className="max-w-2xl mx-auto mb-6">
                <Progress value={progress} className="h-3" />
                <div className="flex justify-between text-sm text-muted-foreground mt-2">
                  <span>{progress}%</span>
                  <span>예상 남은 시간: {Math.ceil(estimatedTime * (100 - progress) / 100)}초</span>
                </div>
              </div>

              {/* 단계별 진행 상황 */}
              <div className="max-w-md mx-auto text-left space-y-3">
                {EXECUTION_STAGES.map((stage) => {
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

              {/* 컨트롤 버튼 */}
              {!error && (
                <div className="flex justify-center gap-3 mt-6">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span tabIndex={progress >= 75 ? 0 : undefined}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePauseResume}
                            disabled={progress >= 75}
                          >
                            {isPaused ? (
                              <>
                                <Play className="w-4 h-4 mr-2" />
                                계속
                              </>
                            ) : (
                              <>
                                <Pause className="w-4 h-4 mr-2" />
                                일시정지
                              </>
                            )}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {progress >= 75 && (
                        <TooltipContent>
                          <p>75% 이후에는 일시정지할 수 없습니다</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                  >
                    <X className="w-4 h-4 mr-2" />
                    취소
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 상세 실행 로그 (Collapsible) */}
      <CollapsibleSection
        label={`상세 실행 로그 (${executionLog.length}개)`}
        open={showDetailedLog}
        onOpenChange={setShowDetailedLog}
        contentClassName="pt-2"
      >
        <div className="bg-muted/50 rounded-lg border p-3 max-h-48 overflow-y-auto">
          {executionLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">로그가 없습니다</p>
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
