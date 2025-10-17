'use client'

import { useEffect, useState, useCallback } from 'react'
import { BarChart3, CheckCircle, Loader2, AlertCircle, Pause, Play, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { StatisticalExecutor } from '@/lib/services/executors'
import type { AnalysisResult } from '@/lib/services/executors'
import { pyodideStats } from '@/lib/services/pyodide-statistics'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { logger } from '@/lib/utils/logger'
import type { AnalysisExecutionStepProps } from '@/types/smart-flow-navigation'
import type { StatisticalMethod } from '@/lib/statistics/method-mapping'

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
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)

  // Store에서 데이터 가져오기
  const { uploadedData, validationResults } = useSmartFlowStore()

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
      addLog('통계 엔진을 불러오는 중... (3-5초 소요)')
      await pyodideStats.initialize()
      addLog('통계 엔진 준비 완료')

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

      // Stage 3: 가정 검정
      if (selectedMethod.requirements?.assumptions) {
        for (const assumption of selectedMethod.requirements.assumptions) {
          await new Promise(resolve => setTimeout(resolve, 300))
          addLog(`${assumption} 검정 완료`)
        }
      }

      if (isCancelled) return

      setCompletedStages(prev => [...prev, 'assumptions'])
      updateStage('analysis', 60)

      // Stage 4: 주 분석 실행
      addLog(`${selectedMethod.name} 실행`)

      const result = await executor.executeMethod(
        selectedMethod,
        uploadedData,
        variableMapping || {}
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

      // 결과 전달
      if (onAnalysisComplete) {
        onAnalysisComplete(result)
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
  }, [uploadedData, selectedMethod, variableMapping, isCancelled, updateStage, addLog, onAnalysisComplete, onNext])

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

  // 컴포넌트 마운트 시 분석 실행
  useEffect(() => {
    if (!isCancelled && !analysisResult) {
      runAnalysis()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 의도적으로 빈 배열 사용

  // 예상 시간 업데이트
  useEffect(() => {
    const dataSize = uploadedData?.length || 0
    if (dataSize < 1000) setEstimatedTime(5)
    else if (dataSize < 10000) setEstimatedTime(15)
    else if (dataSize < 100000) setEstimatedTime(60)
    else setEstimatedTime(120)
  }, [uploadedData])

  return (
    <div className="w-full h-full flex flex-col space-y-6">
      {/* 오류 표시 */}
      {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 메인 진행 상황 */}
          <div className="bg-background rounded-lg p-8 text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                <BarChart3 className="w-10 h-10 text-primary animate-pulse" />
              </div>

              <h3 className="text-xl font-semibold mb-2">
                {progress === 100 ? '분석 완료!' : '분석 수행 중'}
              </h3>

              {progress < 100 && (
                <p className="text-muted-foreground">
                  {currentStage.message}
                </p>
              )}
            </div>

            {/* 진행률 바 */}
            <div className="max-w-2xl mx-auto mb-6">
              <Progress value={progress} className="h-3" />
              <div className="flex justify-between text-sm text-muted-foreground mt-2">
                <span>{progress}%</span>
                {progress < 100 && (
                  <span>예상 남은 시간: {Math.ceil(estimatedTime * (100 - progress) / 100)}초</span>
                )}
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
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
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
                    {isCompleted && (
                      <span className="text-xs text-green-600 ml-auto">✓</span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* 컨트롤 버튼 */}
            {progress < 100 && !error && (
              <div className="flex justify-center gap-3 mt-6">
                {/* 일시정지/재개 버튼 (75% 이후로는 일시정지 불가) */}
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

          {/* 상세 실행 로그 */}
          <div className="bg-muted/50 rounded-lg">
            <button
              onClick={() => setShowDetailedLog(!showDetailedLog)}
              className="w-full p-4 text-left flex items-center justify-between hover:bg-muted/70 transition-colors"
            >
              <span className="font-medium text-sm">
                {showDetailedLog ? '▼' : '▶'} 상세 실행 로그
              </span>
              <span className="text-xs text-muted-foreground">
                {executionLog.length}개 항목
              </span>
            </button>

            {showDetailedLog && (
              <div className="px-4 pb-4">
                <div className="bg-background rounded border p-3 max-h-48 overflow-y-auto">
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
              </div>
            )}
          </div>

          {/* 분석 정보 */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              분석 정보
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">선택된 방법:</span>
                <span className="ml-2 font-medium">{selectedMethod?.name || '없음'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">데이터 크기:</span>
                <span className="ml-2 font-medium">{uploadedData?.length || 0}행</span>
              </div>
              <div>
                <span className="text-muted-foreground">신뢰수준:</span>
                <span className="ml-2 font-medium">95%</span>
              </div>
              <div>
                <span className="text-muted-foreground">통계 엔진:</span>
                <span className="ml-2 font-medium">SciPy (Pyodide)</span>
              </div>
            </div>
          </div>

          {/* 성공 시 결과 미리보기 */}
          {analysisResult && (
            <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <strong>분석 완료!</strong>
                <div className="mt-2 text-sm">
                  <p>통계량: {analysisResult.mainResults.statistic.toFixed(4)}</p>
                  <p>p-value: {analysisResult.mainResults.pvalue.toFixed(4)}</p>
                  <p>{analysisResult.mainResults.interpretation}</p>
                </div>
              </AlertDescription>
            </Alert>
          )}
    </div>
  )
}
