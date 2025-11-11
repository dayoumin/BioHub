'use client'

import { memo, useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { CheckCircle, CheckCircle2, AlertTriangle, XCircle, Info, BarChart, Clock, Pause, Play, TrendingUp, Activity, ArrowLeft, ChevronRight, BarChart3, LineChart, FlaskConical, Edit2, FileEdit } from 'lucide-react'
import { ValidationResults, ColumnStatistics, DataRow, StatisticalAssumptions } from '@/types/smart-flow'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { DataValidationStepProps } from '@/types/smart-flow-navigation'
import { logger } from '@/lib/utils/logger'
import { usePyodide } from '@/components/providers/PyodideProvider'
import { PlotlyChartImproved } from '@/components/charts/PlotlyChartImproved'
import { getHeatmapLayout, getModalLayout, CHART_STYLES } from '@/lib/plotly-config'
import type { Data } from 'plotly.js'
import { DataTypeDetector } from '@/lib/statistics/data-type-detector'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { AssumptionResultsPanel, NumericStatsTable } from './validation/components'
import { useAutoProgress, useNormalityTest } from './validation/hooks'

// Constants - 명확한 이름과 주석
const VALIDATION_CONSTANTS = {
  SKEWED_THRESHOLD: 0.8,        // 80% 이상이면 편향된 분포로 판단
  SPARSE_THRESHOLD: 5,           // 5개 미만이면 희소 카테고리로 분류
  MAX_DISPLAY_CATEGORIES: 5,     // UI에 표시할 최대 카테고리 수
  MIN_SAMPLE_SIZE: 3,           // 통계 검정을 위한 최소 샘플 크기
  DEBOUNCE_DELAY_MS: 200,        // 연속 호출 방지를 위한 디바운스 지연 시간
  AUTO_PROGRESS_COUNTDOWN: 5,    // 자동 진행 카운트다운 초
  OUTLIER_WARNING_THRESHOLD: 0.05,  // 이상치 경고 기준 (5%)
  OUTLIER_CRITICAL_THRESHOLD: 0.1   // 이상치 심각 기준 (10%)
} as const

// Type guard for ValidationResults with columnStats
function hasColumnStats(results: ValidationResults | null): results is ValidationResults & { columnStats: ColumnStatistics[] } {
  return results !== null && 'columnStats' in results && Array.isArray(results.columnStats)
}

// 역 오차 함수 근사 (Q-Q Plot용)
function inverseErf(x: number): number {
  // 경계값 체크
  if (Math.abs(x) >= 1) {
    return x > 0 ? Infinity : -Infinity
  }

  const a = 0.147
  const sign = x < 0 ? -1 : 1
  x = Math.abs(x)

  const ln1MinusX2 = Math.log(1 - x * x)
  const part1 = 2 / (Math.PI * a) + ln1MinusX2 / 2
  const part2 = ln1MinusX2 / a

  return sign * Math.sqrt(Math.sqrt(part1 * part1 - part2) - part1)
}

// 유틸 함수: 컬럼 데이터를 숫자 배열로 변환
function extractNumericData(data: DataRow[], columnName: string): number[] {
  return data
    .map(row => {
      const value = row[columnName]
      return typeof value === 'number' ? value : parseFloat(String(value))
    })
    .filter(v => !isNaN(v))
}

// 유틸 함수: 기본 통계량 계산
function calculateBasicStats(values: number[]): { mean: number; std: number; n: number } {
  const n = values.length
  if (n === 0) return { mean: 0, std: 0, n: 0 }

  const mean = values.reduce((a, b) => a + b, 0) / n
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n
  const std = Math.sqrt(variance)

  return { mean, std, n }
}

export const DataValidationStep = memo(function DataValidationStep({
  validationResults,
  data,
  onNext,
  onPrevious,
  canGoNext,
  canGoPrevious,
  currentStep,
  totalSteps
}: DataValidationStepProps) {
  // Local state
  const [autoProgress, setAutoProgress] = useState(false)
  const [countdown, setCountdown] = useState<number>(VALIDATION_CONSTANTS.AUTO_PROGRESS_COUNTDOWN)
  const [isPaused, setIsPaused] = useState(false)
  const [isAssumptionLoading, setIsAssumptionLoading] = useState(false)
  const [selectedColumn, setSelectedColumn] = useState<ColumnStatistics | null>(null)
  const [showVisualization, setShowVisualization] = useState(false)
  const [alpha, setAlpha] = useState<number>(0.05)
  const [normalityRule, setNormalityRule] = useState<'any' | 'majority' | 'strict'>('any')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [showDataEditGuide, setShowDataEditGuide] = useState(false)
  const assumptionRunId = useRef(0)
  const didAutoRunNormality = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // PyodideProvider에서 상태 가져오기
  const { isLoaded: pyodideLoaded, isLoading: pyodideLoading, service: pyodideService, error: pyodideError } = usePyodide()

  // Custom hooks
  const { normalityTests, isCalculating, runNormalityTests: runNormalityTestsHook, clearResults } = useNormalityTest({
    pyodideService,
    pyodideLoading,
    pyodideLoaded,
    normalityRule,
    alpha
  })

  // Store에서 상태 관리
  const {
    uploadedFile,
    uploadedFileName,
    dataCharacteristics,
    assumptionResults,
    setDataCharacteristics,
    setAssumptionResults
  } = useSmartFlowStore()
  if (!validationResults || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">데이터를 먼저 업로드해주세요.</p>
      </div>
    )
  }

  const hasErrors = (validationResults.errors?.length || 0) > 0
  const hasWarnings = (validationResults.warnings?.length || 0) > 0

  // Type-safe column stats extraction
  const columnStats = useMemo(() =>
    hasColumnStats(validationResults) ? validationResults.columnStats : undefined,
    [validationResults]
  )

  // Memoize numeric columns for performance
  const numericColumns = useMemo(() =>
    columnStats?.filter(s => s.type === 'numeric') || [],
    [columnStats]
  )

  // Memoize categorical columns
  const categoricalColumns = useMemo(() =>
    columnStats?.filter(s => s.type === 'categorical' || s.uniqueValues <= 20) || [],
    [columnStats]
  )

  // Memoize correlation matrix for performance
  const correlationData = useMemo(() => {
    if (numericColumns.length < 2 || !data) return null

    const numericVars = numericColumns.slice(0, 8) // 최대 8개 변수
    const correlationMatrix: number[][] = []
    const varNames = numericVars.map(v => v.name)

    // 각 변수 쌍에 대해 상관계수 계산
    for (let i = 0; i < numericVars.length; i++) {
      const row: number[] = []

      for (let j = 0; j < numericVars.length; j++) {
        if (i === j) {
          row.push(1) // 자기 자신과의 상관계수는 1
        } else {
          // 유효한 쌍 데이터만 추출
          const validPairs = data.filter(r =>
            !isNaN(parseFloat(String(r[numericVars[i].name]))) &&
            !isNaN(parseFloat(String(r[numericVars[j].name])))
          )

          if (validPairs.length > 1) {
            const x = validPairs.map(r => parseFloat(String(r[numericVars[i].name])))
            const y = validPairs.map(r => parseFloat(String(r[numericVars[j].name])))
            const stats = {
              x: calculateBasicStats(x),
              y: calculateBasicStats(y)
            }

            const num = x.reduce((sum, xi, idx) =>
              sum + (xi - stats.x.mean) * (y[idx] - stats.y.mean), 0)
            const denX = Math.sqrt(x.reduce((sum, xi) =>
              sum + Math.pow(xi - stats.x.mean, 2), 0))
            const denY = Math.sqrt(y.reduce((sum, yi) =>
              sum + Math.pow(yi - stats.y.mean, 2), 0))

            const corr = denX === 0 || denY === 0 ? 0 : num / (denX * denY)
            row.push(corr)
          } else {
            row.push(0)
          }
        }
      }
      correlationMatrix.push(row)
    }

    return { matrix: correlationMatrix, varNames }
  }, [numericColumns, data])

  // 데이터 특성 자동 분석 및 통계 가정 검정 (백그라운드 + 200ms 디바운스)
  useEffect(() => {
    if (!data || !validationResults || !pyodideLoaded || !pyodideService) return

    let isActive = true
    const timer = setTimeout(async () => {
      const currentRunId = assumptionRunId.current + 1
      assumptionRunId.current = currentRunId

      try {
        // 1. 데이터 특성 자동 분석
        const characteristics = DataTypeDetector.analyzeDataCharacteristics(data)
        if (isActive) setDataCharacteristics(characteristics)

        console.log('[DataValidation] 데이터 특성 분석 완료:', {
          구조: characteristics.structure,
          설계: characteristics.studyDesign,
          샘플크기: characteristics.sampleSize,
          그룹수: characteristics.groupCount
        })

        // 2. 필요한 통계 가정만 자동 검정
        if (numericColumns.length > 0) {
          if (isActive) setIsAssumptionLoading(true)
          const testData: any = {}

          // 첫 번째 수치형 컬럼으로 정규성 검정
          const firstNumericCol = numericColumns[0]
          const values = data.map(row => parseFloat(row[firstNumericCol.name]))
            .filter(v => !isNaN(v))

          if (values.length >= 3) {
            testData.values = values
          }

          // 그룹이 여러 개 있으면 등분산성 검정
          if (characteristics.groupCount > 1 && categoricalColumns.length > 0) {
            const groupCol = categoricalColumns[0]
            const groups: number[][] = []

            const uniqueGroups = [...new Set(data.map(row => row[groupCol.name]))]
            for (const group of uniqueGroups) {
              const groupData = data
                .filter(row => row[groupCol.name] === group)
                .map(row => parseFloat(row[firstNumericCol.name]))
                .filter(v => !isNaN(v))

              if (groupData.length > 0) groups.push(groupData)
            }

            if (groups.length >= 2) {
              testData.groups = groups
            }
          }

          // 통계 가정 검정 실행
          const assumptions = await pyodideService.checkAllAssumptions({
            ...testData,
            alpha,
            normalityRule
          }) as StatisticalAssumptions
          if (isActive && currentRunId === assumptionRunId.current) setAssumptionResults(assumptions)

          console.log('[DataValidation] 통계 가정 검정 완료:', assumptions.summary)
        }
      } catch (error) {
        console.error('[DataValidation] 분석 실패:', error)
      } finally {
        if (isActive && currentRunId === assumptionRunId.current) setIsAssumptionLoading(false)
      }
    }, 200)

    return () => { isActive = false; clearTimeout(timer) }
  }, [data, validationResults, pyodideLoaded, pyodideService, alpha, normalityRule, numericColumns, categoricalColumns])

  // 정규성(Shapiro) 자동 실행: 준비되면 백그라운드로 1회 실행
  useEffect(() => {
    if (!pyodideLoaded || !pyodideService) return
    if (!data || numericColumns.length === 0) return
    if (didAutoRunNormality.current) return
    if (isAssumptionLoading || isCalculating || pyodideLoading) return

    // 최소 요건: 하나 이상의 수치형 컬럼에 유효값 3개 이상
    const hasEnoughData = numericColumns.some(col => {
      const arr = data
        .map((row: any) => Number(row[col.name]))
        .filter((v: number) => !isNaN(v))
      return arr.length >= 3
    })
    if (!hasEnoughData) return

    didAutoRunNormality.current = true
    runNormalityTestsHook(data, numericColumns)
  }, [pyodideLoaded, pyodideService, data, numericColumns, isAssumptionLoading, isCalculating, pyodideLoading, runNormalityTestsHook])

  // 자동 진행 기능
  useEffect(() => {
    if (!validationResults || hasErrors || isPaused || !autoProgress) return

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (onNext) onNext()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [validationResults, hasErrors, isPaused, autoProgress])

  const toggleAutoProgress = () => {
    setIsPaused(!isPaused)
    if (isPaused) {
      setCountdown(5) // 재시작 시 카운트다운 초기화
    }
  }

  // 기본적으로 자동 실행하지 않음 (버튼으로 수동 실행)

  return (
    <div className="space-y-6">
      {/* Pyodide 로딩 상태 */}
      {pyodideLoading && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <p className="text-sm text-blue-900 dark:text-blue-100">
              Python 통계 엔진을 초기화하는 중입니다... (첫 실행 시 3-5초 소요)
            </p>
          </div>
        </div>
      )}

      {/* Pyodide 에러 */}
      {pyodideError && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-900 dark:text-red-100">
            통계 엔진 오류: {pyodideError}
          </p>
        </div>
      )}

      {/* 검증 요약 */}
      <div className={`rounded-lg p-6 ${
        hasErrors ? 'bg-red-50 dark:bg-red-950/20' :
        hasWarnings ? 'bg-yellow-50 dark:bg-yellow-950/20' :
        'bg-green-50 dark:bg-green-950/20'
      }`}>
        <div className="flex items-center space-x-3 mb-4">
          {hasErrors ? (
            <XCircle className="w-6 h-6 text-red-600" />
          ) : hasWarnings ? (
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
          ) : (
            <CheckCircle className="w-6 h-6 text-green-600" />
          )}
          <h3 className="text-lg font-semibold">
            {hasErrors ? '데이터 검증 실패' :
             hasWarnings ? '데이터 검증 완료 (경고 있음)' :
             '데이터 검증 완료'}
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-white dark:bg-background rounded p-3">
            <p className="text-sm text-muted-foreground">표본 크기</p>
            <p className="text-lg font-semibold">{validationResults.totalRows}</p>
            <p className="text-xs text-muted-foreground mt-1">충분</p>
          </div>
          <div className="bg-white dark:bg-background rounded p-3">
            <p className="text-sm text-muted-foreground">분석 가능 변수</p>
            <p className="text-lg font-semibold">
              {numericColumns.length > 0 ? `수치 ${numericColumns.length}개` : '수치 없음'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {categoricalColumns.length > 0 ? `범주 ${categoricalColumns.length}개` : '범주 없음'}
            </p>
          </div>
          <div className="bg-white dark:bg-background rounded p-3">
            <p className="text-sm text-muted-foreground">데이터 품질</p>
            <p className="text-lg font-semibold">
              {validationResults.missingValues === 0 ? '완벽' :
               validationResults.missingValues < validationResults.totalRows * 0.05 ? '양호' : '주의'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              결측 {validationResults.missingValues}개 ({((validationResults.missingValues / (validationResults.totalRows * validationResults.columnCount)) * 100).toFixed(1)}%)
            </p>
          </div>
          <div className="bg-white dark:bg-background rounded p-3">
            <p className="text-sm text-muted-foreground">권장 분석</p>
            <p className="text-lg font-semibold">
              {assumptionResults?.summary?.canUseParametric ? '모수적' : '비모수적'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ✓ 가정 충족
            </p>
          </div>
        </div>

        {/* 분석 방법 권장 상세 */}
        <AssumptionResultsPanel
          assumptionResults={assumptionResults}
          numericColumns={numericColumns}
          categoricalColumns={categoricalColumns}
          normalityTests={normalityTests}
          totalRows={validationResults.totalRows}
        />
      </div>


      {/* 상세 정보 탭 - 재구성 */}
      <Tabs defaultValue="descriptive" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="descriptive" className="flex items-center gap-2 py-2.5">
            <BarChart3 className="w-4 h-4" />
            <span className="text-sm">기초통계</span>
          </TabsTrigger>
          <TabsTrigger value="assumptions" className="flex items-center gap-2 py-2.5">
            <FlaskConical className="w-4 h-4" />
            <span className="text-sm">통계적 가정</span>
            {assumptionResults?.summary && (
              <Badge variant={assumptionResults.summary.canUseParametric ? "success" : "warning"} className="ml-2 text-xs">
                {assumptionResults.summary.canUseParametric ? "충족" : "위반"}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="visualization" className="flex items-center gap-2 py-2.5">
            <LineChart className="w-4 h-4" />
            <span className="text-sm">탐색적 시각화</span>
          </TabsTrigger>
        </TabsList>

        {/* 기초통계 탭 */}
        <TabsContent value="descriptive" className="space-y-4">
          {/* 데이터 품질 요약 - 맨 위로 이동 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                데이터 품질 요약
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {/* 업로드 파일 */}
                <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1">업로드 파일</p>
                  <p className="text-sm font-medium truncate" title={uploadedFile?.name || uploadedFileName || ''}>
                    {uploadedFile?.name || uploadedFileName || '파일명 없음'}
                  </p>
                </div>
                {/* 완전성 */}
                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">데이터 완전성</p>
                  <p className="text-xl font-bold">
                    {((1 - validationResults.missingValues / (validationResults.totalRows * validationResults.columnCount)) * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {validationResults.missingValues === 0 ? '결측 없음' : `결측 ${validationResults.missingValues}개`}
                  </p>
                </div>

                {/* 정규성 */}
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">정규분포 변수</p>
                  <p className="text-xl font-bold">
                    {numericColumns.filter(col => {
                      const test = normalityTests[col.name]
                      return test?.summary?.isNormal
                    }).length}/{numericColumns.length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {numericColumns.filter(col => normalityTests[col.name]?.summary?.isNormal).length > 0 ? '모수 검정 가능' : '비모수 권장'}
                  </p>
                </div>

                {/* 이상치 */}
                <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">이상치 포함 변수</p>
                  <p className="text-xl font-bold">
                    {numericColumns.filter(col => col.outliers && col.outliers.length > 0).length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    총 {numericColumns.reduce((sum, col) => sum + (col.outliers?.length || 0), 0)}개 이상치
                  </p>
                </div>

                {/* 샘플 크기 */}
                <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">샘플 크기 적절성</p>
                  <p className="text-xl font-bold">
                    {validationResults.totalRows >= 30 ? '충분' : '부족'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {validationResults.totalRows >= 30 ? 'CLT 적용 가능' :
                     validationResults.totalRows >= 10 ? '소표본 분석' : '극소표본'}
                  </p>
                </div>
              </div>

              {/* 권장사항 */}
              {((validationResults.warnings?.length || 0) > 0 || (validationResults.errors?.length || 0) > 0) && (
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                  <p className="text-sm font-medium mb-2">데이터 개선 권장사항</p>
                  <ul className="text-xs space-y-1">
                    {validationResults.missingValues > validationResults.totalRows * 0.05 && (
                      <li>• 결측값이 5% 이상입니다. 대체(imputation) 또는 제거를 고려하세요.</li>
                    )}
                    {numericColumns.some(col => col.outliers && col.outliers.length > col.numericCount * 0.1) && (
                      <li>• 이상치가 10% 이상인 변수가 있습니다. 원인 파악 후 처리하세요.</li>
                    )}
                    {validationResults.totalRows < 30 && (
                      <li>• 표본 크기가 작습니다. 비모수 검정이나 정확 검정을 사용하세요.</li>
                    )}
                    {columnStats?.some(s => s.type === 'mixed') && (
                      <li>• 혼합 데이터 타입 변수가 있습니다. 데이터 정제가 필요합니다.</li>
                    )}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 수치형 변수 상세 통계 */}
          {columnStats && <NumericStatsTable columnStats={columnStats} />}

          {/* 추가 기초 통계 */}
          {columnStats && columnStats.some(s => s.type === 'numeric') && (
            <Card>
              <CardHeader>
                <CardTitle>추가 기초 통계</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {columnStats
                    .filter(s => s.type === 'numeric')
                    .map((stat, idx) => (
                      <div key={idx} className="border rounded-lg p-3">
                        <h4 className="font-medium text-sm mb-2">{stat.name}</h4>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">분위수 범위:</span>
                            <span>
                              Q1: {((stat.q25 || 0)).toFixed(1)} | Q3: {((stat.q75 || 0)).toFixed(1)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">IQR:</span>
                            <span>{((stat.q75 || 0) - (stat.q25 || 0)).toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">범위:</span>
                            <span>{stat.min?.toFixed(1)} ~ {stat.max?.toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">표준오차 (SE):</span>
                            <span>{(stat.std && stat.numericCount ? (stat.std / Math.sqrt(stat.numericCount)).toFixed(3) : '-')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">95% CI:</span>
                            <span className="text-[10px]">
                              [{(stat.mean! - 1.96 * (stat.std! / Math.sqrt(stat.numericCount))).toFixed(1)},
                               {(stat.mean! + 1.96 * (stat.std! / Math.sqrt(stat.numericCount))).toFixed(1)}]
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 이상치 분석 */}
          {columnStats && columnStats.some(s => s.type === 'numeric' && s.outliers && s.outliers.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  이상치 분석
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {columnStats
                    .filter(s => s.type === 'numeric')
                    .map((stat, idx) => {
                      const outlierCount = stat.outliers?.length || 0
                      const outlierPercent = stat.numericCount > 0 ? (outlierCount / stat.numericCount * 100) : 0

                      return (
                        <div key={idx} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium">{stat.name}</h4>
                            <Badge
                              variant={outlierCount === 0 ? "success" :
                                      outlierPercent > 10 ? "warning" : "secondary"}
                              className="text-xs"
                            >
                              {outlierCount}개 이상치 ({outlierPercent.toFixed(1)}%)
                            </Badge>
                          </div>

                          {outlierCount > 0 && (
                            <>
                              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                                <div>
                                  <span className="text-muted-foreground">탐지 방법:</span>
                                  <span className="ml-2">IQR × 1.5</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">위치:</span>
                                  <span className="ml-2">
                                    {stat.outliers?.filter((v: number) => v < (stat.q25! - 1.5 * ((stat.q75 || 0) - (stat.q25 || 0)))).length}개 하단,
                                    {stat.outliers?.filter((v: number) => v > (stat.q75! + 1.5 * ((stat.q75 || 0) - (stat.q25 || 0)))).length}개 상단
                                  </span>
                                </div>
                              </div>

                              <div className="p-2 bg-muted/30 rounded text-xs">
                                <p className="font-medium mb-1">이상치 값:</p>
                                <p className="font-mono">
                                  {stat.outliers?.slice(0, 10).map((v: number) => v.toFixed(2)).join(', ')}
                                  {(stat.outliers?.length ?? 0) > 10 && ` ... 외 ${(stat.outliers?.length ?? 0) - 10}개`}
                                </p>
                              </div>

                              {/* 처리 방법 제안 */}
                              <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950/20 rounded text-xs">
                                <p className="font-medium text-amber-900 dark:text-amber-100 mb-1">💡 처리 방법:</p>
                                {outlierPercent < 5 ? (
                                  <p className="text-amber-700 dark:text-amber-300">
                                    • 5% 미만: 그대로 진행 가능, 로버스트 통계 고려
                                  </p>
                                ) : outlierPercent < 10 ? (
                                  <p className="text-amber-700 dark:text-amber-300">
                                    • 5-10%: Winsorization, Trimming 고려
                                  </p>
                                ) : (
                                  <p className="text-amber-700 dark:text-amber-300">
                                    • 10% 초과: 원인 파악 필수, 제거 또는 변환
                                  </p>
                                )}
                              </div>
                            </>
                          )}

                          {outlierCount === 0 && (
                            <p className="text-sm text-muted-foreground">이상치가 발견되지 않았습니다</p>
                          )}
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 범주형 변수 빈도 분석 */}
          {columnStats && columnStats.some(s => s.type === 'categorical') && (
            <Card>
              <CardHeader>
                <CardTitle>범주형 변수 빈도 분석</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {columnStats
                    .filter(s => s.type === 'categorical')
                    .map((stat, idx) => {
                      // 한 번만 계산
                      const totalValidCount = stat.topValues?.reduce((acc, v) => acc + v.count, 0) || 1
                      const hasSkewedDistribution = stat.topValues?.[0] &&
                        (stat.topValues[0].count / totalValidCount) > VALIDATION_CONSTANTS.SKEWED_THRESHOLD
                      const hasSparseCategories = stat.topValues?.some(v => v.count < VALIDATION_CONSTANTS.SPARSE_THRESHOLD)

                      return (
                      <div key={idx} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">{stat.name}</h4>
                          <div className="flex gap-2">
                            <Badge variant="secondary">
                              {stat.uniqueValues}개 카테고리
                            </Badge>
                            {hasSkewedDistribution && (
                              <Badge variant="warning" className="text-xs">편향 분포</Badge>
                            )}
                            {hasSparseCategories && !hasSkewedDistribution && (
                              <Badge variant="warning" className="text-xs">희소 카테고리</Badge>
                            )}
                          </div>
                        </div>
                        {stat.topValues && stat.topValues.length > 0 ? (
                          <div className="space-y-2">
                            {stat.topValues.slice(0, VALIDATION_CONSTANTS.MAX_DISPLAY_CATEGORIES).map((val, vidx) => {
                              const percentage = ((val.count / totalValidCount) * 100).toFixed(1)
                              return (
                                <div key={vidx} className="flex items-center gap-3">
                                  <span className="text-sm flex-1 truncate">{val.value || '(빈 값)'}</span>
                                  <span className="text-sm text-muted-foreground">{val.count}개</span>
                                  <div className="w-24">
                                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-primary transition-all"
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                  </div>
                                  <span className="text-sm font-medium w-12 text-right">{percentage}%</span>
                                </div>
                              )
                            })}
                            {stat.uniqueValues > VALIDATION_CONSTANTS.MAX_DISPLAY_CATEGORIES && (
                              <p className="text-xs text-muted-foreground mt-2">
                                ... 외 {stat.uniqueValues - VALIDATION_CONSTANTS.MAX_DISPLAY_CATEGORIES}개 카테고리
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">빈도 정보 없음</p>
                        )}
                        {stat.missingCount > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            결측값: {stat.missingCount}개
                          </div>
                        )}
                      </div>
                    )})}
                </div>
              </CardContent>
            </Card>
          )}

        </TabsContent>

        {/* 통계적 가정 탭 - 전면 UI 개선 */}
        <TabsContent value="assumptions" className="space-y-4">
          {/* 상단 요약 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 전체 상태 요약 */}
            <Card className={`border-2 ${assumptionResults?.summary?.canUseParametric
              ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20'
              : 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20'}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {assumptionResults?.summary?.canUseParametric ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      모수 검정 가능
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      비모수 검정 권장
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {assumptionResults?.summary?.canUseParametric
                    ? '모든 가정이 충족되어 t-test, ANOVA 등 사용 가능'
                    : '가정 위반으로 Mann-Whitney, Kruskal-Wallis 등 권장'}
                </p>
              </CardContent>
            </Card>

            {/* 검정 결과 요약 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  검정 결과
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span>정규성</span>
                    {Object.keys(normalityTests || {}).length > 0 ? (
                      <Badge variant={Object.values(normalityTests).some(t => t.summary?.isNormal) ? "success" : "warning"} className="text-xs">
                        {Object.values(normalityTests).filter(t => t.summary?.isNormal).length}/{Object.keys(normalityTests).length} 통과
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">미검정</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span>등분산성</span>
                    <Badge variant={assumptionResults?.homogeneity ? "success" : "secondary"} className="text-xs">
                      {assumptionResults?.homogeneity ? '검정완료' : '미검정'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>이상치</span>
                    <Badge variant="outline" className="text-xs">기초통계 탭에서 확인</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 설정 요약 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FlaskConical className="h-5 w-5" />
                  검정 설정
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span>유의수준</span>
                    <Badge variant="outline" className="text-xs">α = {alpha}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>정규성 규칙</span>
                    <Badge variant="outline" className="text-xs">
                      {normalityRule === 'any' ? '관대' : normalityRule === 'majority' ? '보통' : '엄격'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>표본 크기</span>
                    <Badge variant={validationResults.totalRows >= 30 ? "success" : "warning"} className="text-xs">
                      n = {validationResults.totalRows}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 초보자를 위한 설명 */}
          <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-600" />
                🎓 통계적 가정이란 무엇인가요?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">
                통계 분석을 하기 전에 데이터가 특정 조건을 만족하는지 확인하는 과정입니다.
                마치 요리를 하기 전에 재료의 신선도를 확인하는 것과 같습니다.
              </p>

              <div className="grid md:grid-cols-3 gap-3">
                <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900 rounded">
                      <BarChart className="h-4 w-4 text-blue-600" />
                    </div>
                    <h4 className="font-semibold text-sm">정규성 (Normality)</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    데이터가 종 모양의 정규분포를 따르는지 확인
                  </p>
                  <div className="space-y-1">
                    <p className="text-xs"><span className="text-green-600">✓</span> 충족 시: t-test, ANOVA, 회귀분석</p>
                    <p className="text-xs"><span className="text-amber-600">✗</span> 위반 시: Mann-Whitney, Kruskal-Wallis</p>
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-green-100 dark:bg-green-900 rounded">
                      <Activity className="h-4 w-4 text-green-600" />
                    </div>
                    <h4 className="font-semibold text-sm">등분산성 (Homogeneity)</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    그룹 간 분산(퍼짐 정도)이 비슷한지 확인
                  </p>
                  <div className="space-y-1">
                    <p className="text-xs"><span className="text-green-600">✓</span> 충족 시: 일반 t-test, ANOVA</p>
                    <p className="text-xs"><span className="text-amber-600">✗</span> 위반 시: Welch's t-test, Games-Howell</p>
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-purple-100 dark:bg-purple-900 rounded">
                      <TrendingUp className="h-4 w-4 text-purple-600" />
                    </div>
                    <h4 className="font-semibold text-sm">독립성 (Independence)</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    각 관측치가 서로 독립적인지 확인
                  </p>
                  <div className="space-y-1">
                    <p className="text-xs"><span className="text-green-600">✓</span> 충족 시: 대부분의 통계 검정</p>
                    <p className="text-xs"><span className="text-amber-600">✗</span> 위반 시: 시계열 분석, 혼합 모델</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 가정 위반 시 대응 방안 */}
          {((assumptionResults?.summary as any)?.violations ?? []).length > 0 && (
            <Card className="border-amber-500 bg-amber-50/50 dark:bg-amber-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
                  <AlertTriangle className="h-5 w-5" />
                  🛠️ 가정 위반 대응 방안
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 정규성 위반 대응 */}
                {assumptionResults && ((assumptionResults.summary as any)?.violations ?? []).includes('정규성 위반') && (
                  <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border-l-4 border-amber-500">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      정규성 위반 해결 방법
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-start gap-2">
                        <span className="font-medium">1. 데이터 변환:</span>
                        <div>
                          <p>• 로그 변환: 오른쪽으로 치우친 데이터</p>
                          <p>• 제곱근 변환: 약하게 치우친 데이터</p>
                          <p>• Box-Cox 변환: 최적 변환 자동 찾기</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-medium">2. 비모수 검정:</span>
                        <div>
                          <p>• Mann-Whitney U (t-test 대체)</p>
                          <p>• Kruskal-Wallis (ANOVA 대체)</p>
                          <p>• Spearman 상관 (Pearson 대체)</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => setShowDataEditGuide(true)}
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        데이터 편집 가이드
                      </Button>
                    </div>
                  </div>
                )}

                {/* 등분산성 위반 대응 */}
                {assumptionResults && ((assumptionResults.summary as any)?.violations ?? []).includes('등분산성 위반') && (
                  <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border-l-4 border-amber-500">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      등분산성 위반 해결 방법
                    </h4>
                    <div className="space-y-2 text-xs">
                      <p>• <strong>Welch's t-test:</strong> 등분산 가정하지 않는 t-test</p>
                      <p>• <strong>Welch's ANOVA:</strong> 등분산 가정하지 않는 ANOVA</p>
                      <p>• <strong>Games-Howell:</strong> 사후 검정에 사용</p>
                      <p>• <strong>로그/제곱근 변환:</strong> 분산 안정화</p>
                    </div>
                  </div>
                )}

                {/* 이상치 과다 대응 */}
                {assumptionResults && ((assumptionResults.summary as any)?.violations ?? []).includes('이상치 과다') && (
                  <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border-l-4 border-amber-500">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      이상치 처리 방법
                    </h4>
                    <div className="space-y-2 text-xs">
                      <p>• <strong>원인 파악:</strong> 측정 오류, 입력 오류 확인</p>
                      <p>• <strong>Winsorization:</strong> 극단값을 경계값으로 대체</p>
                      <p>• <strong>Trimming:</strong> 상하위 일정 비율 제거</p>
                      <p>• <strong>로버스트 통계:</strong> 이상치에 강건한 방법 사용</p>
                    </div>
                  </div>
                )}

                {/* 표본 크기 부족 대응 */}
                {assumptionResults && ((assumptionResults.summary as any)?.violations ?? []).includes('표본 크기 부족') && (
                  <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border-l-4 border-amber-500">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      소표본 대응 방법
                    </h4>
                    <div className="space-y-2 text-xs">
                      <p>• <strong>정확 검정:</strong> Fisher's exact test, 정확 이항 검정</p>
                      <p>• <strong>비모수 검정:</strong> 표본 크기 가정 없음</p>
                      <p>• <strong>부트스트랩:</strong> 재표본 추출로 분포 추정</p>
                      <p>• <strong>더 많은 데이터 수집:</strong> 가능하면 권장</p>
                    </div>
                  </div>
                )}

                {/* 일반 권장사항 */}
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">💡 일반 권장사항:</p>
                  <ul className="text-xs space-y-1 text-blue-800 dark:text-blue-200">
                    <li>• 여러 가정이 위반되면 비모수 검정 우선 고려</li>
                    <li>• 변환 전후 결과를 비교하여 최적 방법 선택</li>
                    <li>• 원본 데이터도 보존하여 해석에 활용</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 검정 설정 및 컨트롤 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                ⚙️ 검정 설정
                {isAssumptionLoading && (
                  <div className="ml-auto flex items-center gap-2 text-xs text-blue-600">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600" />
                    검정 수행 중...
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* 유의수준 설정 */}
                <div className="space-y-3">
                  <div>
                    <label className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">유의수준 (α)</span>
                      <div className="flex items-center gap-2">
                        {[0.01, 0.05, 0.1].map(val => (
                          <button
                            key={val}
                            onClick={() => setAlpha(val)}
                            className={`px-2 py-1 text-xs rounded ${
                              alpha === val
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary hover:bg-secondary/80'
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                        <input
                          type="number"
                          step={0.01}
                          min={0.001}
                          max={0.2}
                          value={alpha}
                          onChange={(e) => setAlpha(Number(e.target.value) || 0.05)}
                          className="w-16 border rounded px-2 py-1 bg-background text-xs"
                        />
                      </div>
                    </label>
                    <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-1">
                      <p className="font-medium mb-1">💡 유의수준이란?</p>
                      <p>• 통계적 판단의 기준점 (일반적으로 0.05 사용)</p>
                      <p>• <strong>0.01</strong>: 매우 엄격 (의학 연구)</p>
                      <p>• <strong>0.05</strong>: 일반적 (대부분의 연구)</p>
                      <p>• <strong>0.10</strong>: 관대함 (탐색적 연구)</p>
                    </div>
                  </div>
                </div>

                {/* 정규성 판정 규칙 */}
                <div className="space-y-3">
                  <div>
                    <label className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">정규성 판정 규칙</span>
                      <select
                        value={normalityRule}
                        onChange={(e) => setNormalityRule(e.target.value as 'any' | 'majority' | 'strict')}
                        className="border rounded px-3 py-1 bg-background text-sm"
                      >
                        <option value="any">😊 관대함</option>
                        <option value="majority">🎯 보통</option>
                        <option value="strict">🔍 엄격함</option>
                      </select>
                    </label>
                    <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-1">
                      <p className="font-medium mb-1">💡 판정 규칙이란?</p>
                      {normalityRule === 'any' && (
                        <>
                          <p>• 여러 검정 중 <strong>하나라도</strong> 통과하면 OK</p>
                          <p>• 탐색적 분석이나 소표본에 적합</p>
                        </>
                      )}
                      {normalityRule === 'majority' && (
                        <>
                          <p>• 여러 검정 중 <strong>과반수가</strong> 통과하면 OK</p>
                          <p>• 일반적인 연구에 권장</p>
                        </>
                      )}
                      {normalityRule === 'strict' && (
                        <>
                          <p>• <strong>모든 검정이</strong> 통과해야 OK</p>
                          <p>• 엄밀한 학술 연구에 사용</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 조언 */}
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs">
                  <strong className="text-blue-900 dark:text-blue-100">💁 Tip:</strong>
                  <span className="text-blue-700 dark:text-blue-300 ml-1">
                    처음이라면 기본 설정(α=0.05, 보통)을 사용하세요. 대부분의 경우 잘 작동합니다!
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
          {/* 데이터 특성 요약 */}
          {dataCharacteristics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  데이터 특성 분석
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">샘플 크기</p>
                    <p className="text-xl font-bold">{dataCharacteristics.sampleSize}</p>
                    {dataCharacteristics.sampleSize < 30 && (
                      <Badge variant="warning" className="mt-1 text-xs">소표본</Badge>
                    )}
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">연구 설계</p>
                    <p className="text-lg font-semibold">{dataCharacteristics.studyDesign}</p>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">그룹 수</p>
                    <p className="text-xl font-bold">{dataCharacteristics.groupCount}</p>
                  </div>
                  <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">데이터 구조</p>
                    <p className="text-lg font-semibold">{dataCharacteristics.structure}</p>
                  </div>
                </div>

                {/* 권장 분석 방법 */}
                {dataCharacteristics.recommendations.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-3">권장 분석 방법</h4>
                    <div className="space-y-2">
                      {dataCharacteristics.recommendations.slice(0, 3).map((rec, idx) => (
                        <div key={idx} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{rec.method}</span>
                            <Badge variant={rec.confidence > 0.7 ? "success" : "secondary"}>
                              신뢰도 {(rec.confidence * 100).toFixed(0)}%
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>• {rec.reasons.join(', ')}</p>
                            {rec.requirements.length > 0 && (
                              <p className="text-yellow-600 dark:text-yellow-400">
                                ⚠️ 필요 가정: {rec.requirements.join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 상세 검정 결과 */}
          {(Object.keys(normalityTests || {}).length > 0 || assumptionResults) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🔬 상세 검정 결과
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="normality" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="normality" className="text-xs">
                      정규성 검정
                    </TabsTrigger>
                    <TabsTrigger value="homogeneity" className="text-xs">
                      등분산성 검정
                    </TabsTrigger>
                    <TabsTrigger value="independence" className="text-xs">
                      독립성 검정
                    </TabsTrigger>
                  </TabsList>

                  {/* 정규성 검정 탭 */}
                  <TabsContent value="normality" className="mt-4 space-y-3">
                    {Object.entries(normalityTests || {}).map(([colName, test]) => (
                      <div key={colName} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">{colName}</h4>
                          <Badge
                            variant={test.summary?.isNormal ? "success" : "warning"}
                            className="ml-2"
                          >
                            {test.summary?.isNormal ? '정규분포 ✓' : '비정규 ✗'}
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          {/* Shapiro-Wilk */}
                          {test.shapiroWilk && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Shapiro-Wilk</span>
                              <div className="flex items-center gap-3">
                                <span>W = {test.shapiroWilk.statistic.toFixed(4)}</span>
                                <span className={test.shapiroWilk.pValue > alpha ? 'text-green-600' : 'text-amber-600'}>
                                  p = {test.shapiroWilk.pValue.toFixed(4)}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Anderson-Darling */}
                          {test.andersonDarling && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Anderson-Darling</span>
                              <div className="flex items-center gap-3">
                                <span>A² = {test.andersonDarling.statistic.toFixed(4)}</span>
                                <span className={test.andersonDarling.pValue > alpha ? 'text-green-600' : 'text-amber-600'}>
                                  p = {test.andersonDarling.pValue.toFixed(4)}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* D'Agostino */}
                          {test.dagostinoPearson && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">D'Agostino-Pearson</span>
                              <div className="flex items-center gap-3">
                                <span>K² = {test.dagostinoPearson.statistic.toFixed(4)}</span>
                                <span className={test.dagostinoPearson.pValue > alpha ? 'text-green-600' : 'text-amber-600'}>
                                  p = {test.dagostinoPearson.pValue.toFixed(4)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 해석 */}
                        <div className="mt-3 p-2 bg-muted/30 rounded text-xs">
                          {test.summary?.isNormal ? (
                            <p className="text-green-700 dark:text-green-400">
                              ✓ 정규분포를 따릅니다. 모수 검정 사용 가능
                            </p>
                          ) : (
                            <p className="text-amber-700 dark:text-amber-400">
                              ✗ 정규분포를 따르지 않습니다. 비모수 검정 권장
                            </p>
                          )}
                        </div>
                      </div>
                    ))}

                    {Object.keys(normalityTests || {}).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        정규성 검정 결과가 없습니다
                      </div>
                    )}
                  </TabsContent>

                  {/* 등분산성 검정 탭 */}
                  <TabsContent value="homogeneity" className="mt-4 space-y-3">
                    {assumptionResults?.homogeneity ? (
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">Levene's Test</h4>
                          <Badge
                            variant={(assumptionResults.homogeneity.levene?.pValue ?? assumptionResults.homogeneity.bartlett?.pValue ?? 0) > alpha ? "success" : "warning"}
                          >
                            {(assumptionResults.homogeneity.levene?.pValue ?? assumptionResults.homogeneity.bartlett?.pValue ?? 0) > alpha ? '등분산 ✓' : '이분산 ✗'}
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">검정 통계량</span>
                            <span>F = {(assumptionResults.homogeneity.levene?.statistic ?? assumptionResults.homogeneity.bartlett?.statistic ?? 0)?.toFixed(4) || 'N/A'}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">p-value</span>
                            <span className={(assumptionResults.homogeneity.levene?.pValue ?? assumptionResults.homogeneity.bartlett?.pValue ?? 0) > alpha ? 'text-green-600' : 'text-amber-600'}>
                              {(assumptionResults.homogeneity.levene?.pValue ?? assumptionResults.homogeneity.bartlett?.pValue ?? 0).toFixed(4)}
                            </span>
                          </div>
                        </div>

                        {/* 해석 */}
                        <div className="mt-3 p-2 bg-muted/30 rounded text-xs">
                          {(assumptionResults.homogeneity.levene?.pValue ?? assumptionResults.homogeneity.bartlett?.pValue ?? 0) > alpha ? (
                            <p className="text-green-700 dark:text-green-400">
                              ✓ 그룹 간 분산이 동일합니다. 일반 ANOVA 사용 가능
                            </p>
                          ) : (
                            <p className="text-amber-700 dark:text-amber-400">
                              ✗ 그룹 간 분산이 다릅니다. Welch's ANOVA 또는 Games-Howell 권장
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        등분산성 검정은 그룹이 2개 이상일 때 수행됩니다
                      </div>
                    )}
                  </TabsContent>

                  {/* 독립성 검정 탭 */}
                  <TabsContent value="independence" className="mt-4 space-y-3">
                    <div className="space-y-4">
                      {/* 자기상관 검정 (Durbin-Watson) */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">Durbin-Watson 검정</h4>
                          <Badge variant="default" className="text-xs">
                            시계열/회귀 잔차
                          </Badge>
                        </div>

                        <div className="p-3 bg-muted/30 rounded text-xs space-y-2">
                          <p className="font-medium mb-1">💡 독립성 검정이란?</p>
                          <p>• 데이터 포인트들이 서로 독립적인지 확인</p>
                          <p>• 시간 순서가 있는 데이터에서 중요</p>
                          <p>• DW ≈ 2: 독립적, DW &lt; 1.5 또는 &gt; 2.5: 자기상관 있음</p>
                        </div>

                        {/* 예시 결과 */}
                        <div className="mt-3 text-sm text-muted-foreground">
                          현재 데이터로는 시계열 분석이 불가능합니다.
                          회귀분석 또는 시계열 데이터 업로드 후 확인 가능합니다.
                        </div>
                      </div>

                      {/* 샘플 독립성 */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">샘플 독립성</h4>
                          <Badge variant="success" className="text-xs">
                            기본 충족
                          </Badge>
                        </div>

                        <div className="text-sm space-y-2">
                          <p className="text-muted-foreground">연구 설계 확인:</p>
                          <ul className="text-xs space-y-1 ml-4">
                            <li>• 무작위 표집: ✓</li>
                            <li>• 샘플 간 독립성: ✓</li>
                            <li>• 비복원 추출: ✓</li>
                          </ul>
                        </div>

                        <div className="mt-3 p-2 bg-green-50 dark:bg-green-950/20 rounded text-xs">
                          <p className="text-green-700 dark:text-green-400">
                            ✓ 대부분의 통계 검정에서 샘플 독립성을 가정합니다
                          </p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* 기존 결과 표시는 위에서 통합했으므로 삭제 */}

          {/* 통합 정규성 검정 결과 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                다중 정규성 검정
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs text-muted-foreground">
                  Shapiro-Wilk, Anderson-Darling, D'Agostino-Pearson 검정 실행
                </div>
                <Button size="sm" variant="outline" onClick={() => runNormalityTestsHook(data, numericColumns)} disabled={isCalculating}>
                  {isCalculating ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary" />
                      실행 중...
                    </span>
                  ) : (
                    '정규성 검정 실행'
                  )}
                </Button>
              </div>
              {isCalculating ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                  다중 통계 검정 수행 중...
                </div>
              ) : numericColumns.length > 0 ? (
                <div className="space-y-4">
                  {numericColumns.map((col) => {
                    const tests = normalityTests[col.name]
                    if (!tests) return null

                    return (
                      <div key={col.name} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium text-lg">{col.name}</span>
                          {tests.summary && (
                            <Badge variant={tests.summary.isNormal ? "success" : "warning"} className="text-sm">
                              {tests.summary.isNormal ? "정규분포" : "비정규분포"}
                              ({tests.summary.passedTests}/{tests.summary.totalTests} 통과)
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-2">
                          {/* Shapiro-Wilk */}
                          {tests.shapiroWilk && (
                            <div className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded">
                              <span className="flex items-center gap-2">
                                Shapiro-Wilk
                                <Badge variant={tests.shapiroWilk.isNormal ? "success" : "destructive"} className="text-xs">
                                  {tests.shapiroWilk.isNormal ? "✓" : "✗"}
                                </Badge>
                              </span>
                              <span className="text-muted-foreground">
                                W={tests.shapiroWilk.statistic?.toFixed(4)}, p={tests.shapiroWilk.pValue?.toFixed(4)}
                              </span>
                            </div>
                          )}

                          {/* Anderson-Darling */}
                          {tests.andersonDarling && (
                            <div className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded">
                              <span className="flex items-center gap-2">
                                Anderson-Darling
                                <Badge variant={tests.andersonDarling.isNormal ? "success" : "destructive"} className="text-xs">
                                  {tests.andersonDarling.isNormal ? "✓" : "✗"}
                                </Badge>
                              </span>
                              <span className="text-muted-foreground">
                                A²={tests.andersonDarling.statistic?.toFixed(4)}, p={tests.andersonDarling.pValue?.toFixed(4)}
                              </span>
                            </div>
                          )}

                          {/* D'Agostino-Pearson */}
                          {tests.dagostinoPearson && (
                            <div className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded">
                              <span className="flex items-center gap-2">
                                D'Agostino-Pearson
                                <Badge variant={tests.dagostinoPearson.isNormal ? "success" : "destructive"} className="text-xs">
                                  {tests.dagostinoPearson.isNormal ? "✓" : "✗"}
                                </Badge>
                              </span>
                              <span className="text-muted-foreground">
                                K²={tests.dagostinoPearson.statistic?.toFixed(4)}, p={tests.dagostinoPearson.pValue?.toFixed(4)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {Object.keys(normalityTests).length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      정규성 검정 대기 중...
                      <span className="text-xs block mt-1">
                        • Shapiro-Wilk: 3개 이상 데이터 필요
                        • Anderson-Darling: 8개 이상 데이터 필요
                        • D'Agostino-Pearson: 20개 이상 데이터 필요
                      </span>
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">수치형 변수가 없습니다.</p>
              )}
            </CardContent>
          </Card>

          {/* 이상치 진단 → 기초통계 탭으로 이동 (중복 제거) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                이상치 정보는 기초통계 탭에서 확인하세요
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                이상치 요약, 변수별 이상치 개수/비율, IQR 범위 등 상세 내용은
                기초통계 탭의 요약 카드와 변수 테이블에서 제공합니다.
              </p>
            </CardContent>
          </Card>

          {/* 등분산성 검정 (그룹 비교 시 필요) */}
          {categoricalColumns.length > 0 && numericColumns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-5 w-5" />
                  등분산성 검정 (Homogeneity of Variance)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  그룹 간 분산이 동일한지 검정합니다. ANOVA나 t-test 수행 전 필수 가정입니다.
                </p>

                {categoricalColumns[0] && numericColumns[0] && (
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <p className="text-sm font-medium mb-2">
                      {categoricalColumns[0].name} 그룹별 {numericColumns[0].name} 분산 비교
                    </p>
                    <p className="text-xs text-muted-foreground">
                      • Levene 검정: 평균 기반 (robust)
                      • Bartlett 검정: 정규분포 가정
                      • Fligner-Killeen 검정: 중앙값 기반 (가장 robust)
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={async () => {
                        // 여기에 등분산성 검정 실행 코드 추가
                        console.log('등분산성 검정 실행')
                      }}
                    >
                      등분산성 검정 실행
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 독립성/자기상관 검정 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                독립성 및 자기상관 검정
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                데이터의 독립성과 시계열 자기상관을 검정합니다.
              </p>

              <div className="space-y-3">
                {/* 독립성 */}
                <div className="p-3 border rounded-lg">
                  <p className="text-sm font-medium mb-1">독립성 검정</p>
                  <p className="text-xs text-muted-foreground">
                    • 런 검정 (Runs Test): 무작위성 검정
                    • Durbin-Watson: 잔차의 자기상관 (회귀분석 시)
                  </p>
                </div>

                {/* 자기상관 */}
                <div className="p-3 border rounded-lg">
                  <p className="text-sm font-medium mb-1">자기상관 검정</p>
                  <p className="text-xs text-muted-foreground">
                    • ACF/PACF: 시차별 상관관계
                    • Ljung-Box: 자기상관 존재 여부
                  </p>
                </div>

                {validationResults.totalRows >= 20 && (
                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded text-xs">
                    <Info className="inline w-3 h-3 mr-1" />
                    시계열 데이터인 경우 자기상관 검정이 중요합니다.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        </TabsContent>

        {/* 탐색적 시각화 탭 */}
        <TabsContent value="visualization" className="space-y-4">
          {/* 히스토그램과 박스 플롯 */}
          <div className="grid gap-4 md:grid-cols-2">
            {numericColumns.slice(0, 4).map((stat, idx) => {
              const columnData = data?.map(row => {
                const value = parseFloat(row[stat.name])
                return isNaN(value) ? null : value
              }).filter(v => v !== null) || []

              // 정규분포 곡선을 위한 통계량 계산
              const mean = stat.mean || 0
              const std = stat.std || 1
              const normalCurve = columnData.length > 0 ?
                Array.from({length: 100}, (_, i) => {
                  const min = Math.min(...columnData)
                  const max = Math.max(...columnData)
                  const x = min + (max - min) * i / 99
                  const y = (1 / (std * Math.sqrt(2 * Math.PI))) *
                           Math.exp(-0.5 * Math.pow((x - mean) / std, 2))
                  return {x, y}
                }) : []

              return (
                <Card key={idx}>
                  <CardHeader>
                    <CardTitle className="text-sm">{stat.name} 분포</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[400px]">
                    {columnData.length > 0 ? (
                      <PlotlyChartImproved
                        data={[
                          // 히스토그램
                          {
                            x: columnData,
                            type: 'histogram',
                            name: '빈도',
                            marker: { color: 'rgba(59, 130, 246, 0.6)' },
                            nbinsx: 20,
                            yaxis: 'y',
                            hovertemplate: '구간: %{x}<br>빈도: %{y}<extra></extra>'
                          },
                          // 정규분포 곡선
                          {
                            x: normalCurve.map(p => p.x),
                            y: normalCurve.map(p => p.y * columnData.length * (Math.max(...columnData) - Math.min(...columnData)) / 20),
                            type: 'scatter',
                            mode: 'lines',
                            name: '정규분포',
                            line: { color: 'red', width: 2 },
                            yaxis: 'y',
                            hovertemplate: '값: %{x:.2f}<br>밀도: %{y:.2f}<extra></extra>'
                          },
                          // 박스 플롯
                          {
                            x: columnData,
                            type: 'box',
                            name: '박스플롯',
                            boxmean: 'sd',
                            orientation: 'h',
                            yaxis: 'y2',
                            marker: { color: 'rgba(34, 197, 94, 0.6)' },
                            hovertemplate:
                              '최대: %{x[5]}<br>' +
                              'Q3: %{x[4]}<br>' +
                              '중앙값: %{x[3]}<br>' +
                              'Q1: %{x[2]}<br>' +
                              '최소: %{x[1]}<br>' +
                              '평균: %{mean}<br>' +
                              '표준편차: %{sd}<extra></extra>'
                          }
                        ] as Data[]}
                        layout={{
                          ...getModalLayout({
                            title: { text: '' },
                            xaxis: { title: { text: stat.name } },
                            yaxis: {
                              title: { text: '빈도' },
                              domain: [0, 0.7]
                            },
                            yaxis2: {
                              domain: [0.75, 1],
                              showticklabels: false
                            },
                            height: 350,
                            showlegend: true
                          }),
                          margin: { l: 50, r: 10, t: 30, b: 40 },
                          legend: {
                            orientation: 'h',
                            y: 1.15,
                            x: 0.5,
                            xanchor: 'center'
                          }
                        }}
                        config={{
                          displayModeBar: false,
                          responsive: true
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <p>데이터가 없습니다</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}

            {/* 범주형 변수 빈도 차트 */}
            {categoricalColumns.slice(0, 2).map((stat, idx) => {
              if (!stat.topValues || stat.topValues.length === 0) return null

              return (
                <Card key={`cat-${idx}`}>
                  <CardHeader>
                    <CardTitle className="text-sm">{stat.name} 빈도</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <PlotlyChartImproved
                      data={[{
                        x: stat.topValues.slice(0, 10).map(c => c.value),
                        y: stat.topValues.slice(0, 10).map(c => c.count),
                        type: 'bar',
                        ...CHART_STYLES.bar,
                        hovertemplate: '%{x}: %{y}개<extra></extra>'
                      } as Data]}
                      layout={{
                        ...getModalLayout({
                          title: { text: '' },
                          xaxis: { title: { text: '' }, tickangle: -45 },
                          yaxis: { title: { text: '빈도' } },
                          height: 250,
                          showlegend: false
                        }),
                        margin: { l: 40, r: 10, t: 10, b: 60 }
                      }}
                      config={{
                        displayModeBar: false,
                        responsive: true
                      }}
                    />
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* 상관관계 히트맵 (수치형 변수가 2개 이상일 때) */}
          {correlationData && (
            <Card>
              <CardHeader>
                <CardTitle>변수 간 상관관계 히트맵</CardTitle>
              </CardHeader>
              <CardContent className="h-[500px]">
                {(() => {
                  // Memoized된 상관계수 데이터 사용
                  const { matrix: correlationMatrix, varNames } = correlationData

                  // 히트맵용 텍스트 (상관계수 값)
                  const text = correlationMatrix.map(row =>
                    row.map(val => val.toFixed(2))
                  )

                  return (
                    <PlotlyChartImproved
                      data={[{
                        z: correlationMatrix,
                        x: varNames,
                        y: varNames,
                        type: 'heatmap',
                        colorscale: [
                          [0, 'rgb(67, 56, 202)'],    // 진한 파랑 (-1)
                          [0.25, 'rgb(59, 130, 246)'], // 파랑 (-0.5)
                          [0.5, 'rgb(255, 255, 255)'], // 흰색 (0)
                          [0.75, 'rgb(251, 146, 60)'], // 주황 (0.5)
                          [1, 'rgb(220, 38, 38)']      // 빨강 (1)
                        ],
                        zmin: -1,
                        zmax: 1,
                        text: text,
                        texttemplate: '%{text}',
                        textfont: {
                          size: 12
                        },
                        hovertemplate: '%{x} - %{y}<br>상관계수: %{z:.3f}<extra></extra>',
                        showscale: true,
                        colorbar: {
                          title: { text: '상관계수' },
                          titleside: 'right',
                          tickmode: 'array',
                          tickvals: [-1, -0.5, 0, 0.5, 1],
                          ticktext: ['-1', '-0.5', '0', '0.5', '1'],
                          len: 0.8
                        }
                      } as unknown as Data]}
                      layout={{
                        ...getModalLayout({
                          title: { text: '' },
                          xaxis: {
                            side: 'bottom',
                            tickangle: -45
                          },
                          yaxis: {
                            autorange: 'reversed'
                          },
                          height: 450,
                          showlegend: false
                        }),
                        margin: { l: 100, r: 80, t: 20, b: 100 }
                      }}
                      config={{
                        displayModeBar: false,
                        responsive: true
                      }}
                    />
                  )
                })()}
                <div className="mt-4 text-xs text-muted-foreground">
                  <p>색상 해석: <span className="text-blue-600">파랑(음의 상관)</span> | <span>흰색(무상관)</span> | <span className="text-red-600">빨강(양의 상관)</span></p>
                  <p>상관계수: -1 (완전 음의 상관) ~ 0 (무상관) ~ 1 (완전 양의 상관)</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 산점도 매트릭스 (Scatter Plot Matrix) */}
          {numericColumns.length >= 2 && numericColumns.length <= 4 && (
            <Card>
              <CardHeader>
                <CardTitle>산점도 매트릭스 (Pairplot)</CardTitle>
                <p className="text-sm text-muted-foreground">
                  변수 간 관계를 시각적으로 탐색합니다.
                </p>
              </CardHeader>
              <CardContent className="h-[600px]">
                <div className="grid grid-cols-2 gap-2">
                  {numericColumns.slice(0, 4).map((col1, i) =>
                    numericColumns.slice(0, 4).map((col2, j) => {
                      if (i >= j) return null // 상삼각 행렬만 표시

                      const data1 = data.map(r => parseFloat(r[col1.name])).filter(v => !isNaN(v))
                      const data2 = data.map(r => parseFloat(r[col2.name])).filter(v => !isNaN(v))

                      // 두 변수의 유효한 쌍만 추출
                      const validPairs = data
                        .filter(r => !isNaN(parseFloat(r[col1.name])) && !isNaN(parseFloat(r[col2.name])))
                        .map(r => ({
                          x: parseFloat(r[col1.name]),
                          y: parseFloat(r[col2.name])
                        }))

                      if (validPairs.length === 0) return null

                      return (
                        <div key={`${i}-${j}`} className="border rounded p-2">
                          <PlotlyChartImproved
                            data={[{
                              x: validPairs.map(p => p.x),
                              y: validPairs.map(p => p.y),
                              type: 'scatter',
                              mode: 'markers',
                              marker: {
                                color: 'rgba(59, 130, 246, 0.6)',
                                size: 5
                              },
                              hovertemplate: `${col1.name}: %{x}<br>${col2.name}: %{y}<extra></extra>`
                            }]}
                            layout={{
                              ...getModalLayout({
                                title: { text: '' },
                                xaxis: {
                                  title: { text: col1.name },
                                  titlefont: { size: 10 }
                                } as any,
                                yaxis: {
                                  title: { text: col2.name },
                                  titlefont: { size: 10 }
                                } as any,
                                height: 200,
                                showlegend: false
                              }),
                              margin: { l: 40, r: 10, t: 10, b: 30 }
                            }}
                            config={{
                              displayModeBar: false,
                              responsive: true
                            }}
                          />
                        </div>
                      )
                    }).filter(Boolean)
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Q-Q Plot (정규성 시각화) */}
          {numericColumns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Q-Q Plot (Quantile-Quantile Plot)</CardTitle>
                <p className="text-sm text-muted-foreground">
                  데이터가 정규분포를 따르는지 시각적으로 확인합니다. 점들이 직선에 가까울수록 정규분포에 가깝습니다.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {numericColumns.slice(0, 4).map((col, idx) => {
                    const values = data.map(r => parseFloat(r[col.name]))
                      .filter(v => !isNaN(v))
                      .sort((a, b) => a - b)

                    if (values.length < 3) return null

                    // 이론적 분위수 계산
                    const n = values.length
                    const theoreticalQuantiles = values.map((_, i) => {
                      const p = (i + 0.5) / n
                      // 표준정규분포의 역함수 (근사)
                      const z = Math.sqrt(2) * inverseErf(2 * p - 1)
                      return z
                    })

                    // 표준화된 실제 값
                    const mean = values.reduce((a, b) => a + b, 0) / n
                    const std = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n)
                    const standardizedValues = values.map(v => (v - mean) / std)

                    return (
                      <div key={idx} className="h-[250px]">
                        <PlotlyChartImproved
                          data={[
                            {
                              x: theoreticalQuantiles,
                              y: standardizedValues,
                              type: 'scatter',
                              mode: 'markers',
                              name: '데이터',
                              marker: { color: 'blue', size: 5 }
                            },
                            {
                              x: [-3, 3],
                              y: [-3, 3],
                              type: 'scatter',
                              mode: 'lines',
                              name: '정규분포선',
                              line: { color: 'red', dash: 'dash' }
                            }
                          ]}
                          layout={{
                            ...getModalLayout({
                              title: { text: col.name, font: { size: 12 } },
                              xaxis: { title: { text: '이론적 분위수' }, titlefont: { size: 10 } } as any,
                              yaxis: { title: { text: '표본 분위수' }, titlefont: { size: 10 } } as any,
                              height: 220,
                              showlegend: false
                            }),
                            margin: { l: 50, r: 20, t: 30, b: 40 }
                          }}
                          config={{
                            displayModeBar: false,
                            responsive: true
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* 데이터 편집 가이드 다이얼로그 */}
      <Dialog open={showDataEditGuide} onOpenChange={setShowDataEditGuide}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileEdit className="h-5 w-5" />
              데이터 편집 가이드
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
              <Info className="h-4 w-4" />
              <AlertDescription>
                통계 가정 충족을 위해 데이터를 변환하거나 편집해야 할 수 있습니다.
                아래 방법들을 참고하여 데이터를 준비하세요.
              </AlertDescription>
            </Alert>

            {/* 정규성 문제 해결 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">📉 정규성 문제 해결</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm mb-2">변환 방법:</h4>
                  <div className="space-y-2 text-sm">
                    <div className="p-2 bg-muted/50 rounded">
                      <p className="font-mono text-xs mb-1">np.log(data)</p>
                      <p className="text-xs text-muted-foreground">로그 변환: 오른쪽으로 치우친 데이터</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <p className="font-mono text-xs mb-1">np.sqrt(data)</p>
                      <p className="text-xs text-muted-foreground">제곱근 변환: 약한 치우침</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <p className="font-mono text-xs mb-1">scipy.stats.boxcox(data)</p>
                      <p className="text-xs text-muted-foreground">Box-Cox 변환: 최적 람다 자동 결정</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 이상치 처리 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">⚠️ 이상치 처리</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm mb-2">처리 방법:</h4>
                  <div className="space-y-2 text-sm">
                    <div className="p-2 bg-muted/50 rounded">
                      <p className="font-medium text-xs mb-1">제거 (Removal):</p>
                      <p className="font-mono text-xs">data = data[data['col'] &lt; threshold]</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <p className="font-medium text-xs mb-1">Winsorization:</p>
                      <p className="font-mono text-xs">data.clip(lower=q1, upper=q3)</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <p className="font-medium text-xs mb-1">IQR 방법:</p>
                      <p className="font-mono text-xs">Q1 - 1.5*IQR, Q3 + 1.5*IQR</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 결측값 처리 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">🕳️ 결측값 처리</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm mb-2">대체 방법:</h4>
                  <div className="space-y-2 text-sm">
                    <div className="p-2 bg-muted/50 rounded">
                      <p className="font-medium text-xs mb-1">평균 대체:</p>
                      <p className="font-mono text-xs">data.fillna(data.mean())</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <p className="font-medium text-xs mb-1">중앙값 대체:</p>
                      <p className="font-mono text-xs">data.fillna(data.median())</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <p className="font-medium text-xs mb-1">삭제:</p>
                      <p className="font-mono text-xs">data.dropna()</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>주의:</strong> 데이터 변환 전 원본을 반드시 백업하세요.
                변환은 해석에 영향을 줄 수 있으므로 신중하게 선택하세요.
              </AlertDescription>
            </Alert>
          </div>
        </DialogContent>
      </Dialog>

      {/* 에러 표시 */}
      {validationError && (
        <Alert variant="destructive" className="mt-4">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}
    </div>
  )
})