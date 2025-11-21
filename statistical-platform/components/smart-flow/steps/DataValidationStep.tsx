'use client'

import { memo, useMemo, useState, useEffect } from 'react'
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { ValidationResults, ColumnStatistics, DataRow, StatisticalAssumptions } from '@/types/smart-flow'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { DataValidationStepProps } from '@/types/smart-flow-navigation'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import { logger } from '@/lib/utils/logger'
import { usePyodide } from '@/components/providers/PyodideProvider'

// Type guard for ValidationResults with columnStats
function hasColumnStats(results: ValidationResults | null): results is ValidationResults & { columnStats: ColumnStatistics[] } {
  return results !== null && 'columnStats' in results && Array.isArray(results.columnStats)
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
  const [isValidating, setIsValidating] = useState(true)

  // Pyodide 로딩 상태 추적 (Bug #4 Fix)
  const { isLoaded: isPyodideLoaded } = usePyodide()

  // Store에서 상태 관리
  const {
    uploadedFile,
    uploadedFileName,
    setDataCharacteristics,
    setAssumptionResults
  } = useSmartFlowStore()

  // Type-safe column stats extraction
  const columnStats = useMemo(() =>
    hasColumnStats(validationResults) ? validationResults.columnStats : undefined,
    [validationResults]
  )

  // Memoize numeric/categorical columns
  const numericColumns = useMemo(() =>
    columnStats?.filter(s => s.type === 'numeric') || [],
    [columnStats]
  )

  const categoricalColumns = useMemo(() =>
    columnStats?.filter(s => s.type === 'categorical' || s.uniqueValues <= 20) || [],
    [columnStats]
  )

  // 가정 검정 수행 (Issue #2 Fix + Bug #4, #5 Fix)
  useEffect(() => {
    // Bug #4 Fix: Pyodide 초기화 대기
    if (!data || !validationResults || !isPyodideLoaded) {
      if (!isPyodideLoaded) {
        logger.info('Waiting for Pyodide to load before assumption tests')
      }
      return
    }

    const performAssumptionTests = async () => {
      try {
        // 1. 기본 데이터 특성 저장
        const characteristics = {
          sampleSize: data.length,
          structure: 'wide' as const,
          studyDesign: 'cross-sectional' as const,
          columns: [],
          groupCount: categoricalColumns.length > 0 ? 2 : 1,
          hasTimeComponent: false,
          hasPairedData: false,
          hasRepeatedMeasures: false,
          recommendations: []
        }
        setDataCharacteristics(characteristics)

        // 2. 가정 검정 수행 (수치형 변수가 있을 때만)
        if (numericColumns.length > 0) {
          logger.info('Starting assumption tests', {
            numericColumns: numericColumns.length
          })

          const pyodideCore = PyodideCoreService.getInstance()
          const assumptions: StatisticalAssumptions = {}

          // 2-1. Shapiro-Wilk 정규성 검정 (첫 번째 수치형 변수)
          try {
            const firstNumericCol = numericColumns[0].name
            const numericData = data
              .map(row => row[firstNumericCol])
              .filter((val): val is number => typeof val === 'number' && !isNaN(val))

            if (numericData.length >= 3) {
              const shapiroResult = await pyodideCore.shapiroWilkTest(numericData)

              if (shapiroResult.statistic !== undefined && shapiroResult.pValue !== undefined) {
                assumptions.normality = {
                  shapiroWilk: {
                    statistic: shapiroResult.statistic,
                    pValue: shapiroResult.pValue,
                    isNormal: shapiroResult.pValue > 0.05
                  }
                }
                logger.info('Shapiro-Wilk test completed', {
                  pValue: shapiroResult.pValue,
                  isNormal: shapiroResult.pValue > 0.05
                })
              }
            }
          } catch (error) {
            logger.warn('Shapiro-Wilk test failed', { error })
            // Bug #5 Fix: 실패 시 이전 결과 무효화
            setAssumptionResults(null)
          }

          // 2-2. Levene 등분산성 검정 (그룹 변수가 있을 때)
          if (categoricalColumns.length > 0 && numericColumns.length > 0) {
            try {
              const groupCol = categoricalColumns[0].name
              const numericCol = numericColumns[0].name

              // 그룹별 데이터 분리
              const groupMap = new Map<string, number[]>()
              for (const row of data) {
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
                const leveneResult = await pyodideCore.leveneTest(groups)

                if (leveneResult.statistic !== undefined && leveneResult.pValue !== undefined) {
                  assumptions.homogeneity = {
                    levene: {
                      statistic: leveneResult.statistic,
                      pValue: leveneResult.pValue,
                      equalVariance: leveneResult.pValue > 0.05
                    }
                  }
                  logger.info('Levene test completed', {
                    pValue: leveneResult.pValue,
                    equalVariance: leveneResult.pValue > 0.05
                  })
                }
              }
            } catch (error) {
              logger.warn('Levene test failed', { error })
              // Bug #5 Fix: 실패 시 이전 결과 무효화
              setAssumptionResults(null)
            }
          }

          // 3. 가정 검정 결과 스토어에 저장 (Issue #2 Fix + Bug #5 Fix)
          if (Object.keys(assumptions).length > 0) {
            setAssumptionResults(assumptions)
            logger.info('Assumption results saved to store', { assumptions })
          } else {
            // Bug #5 Fix: 가정 검정 실패/스킵 시 이전 결과 무효화
            setAssumptionResults(null)
            logger.warn('No assumption tests were performed (insufficient data)')
          }
        } else {
          // Bug #5 Fix: 수치형 변수 없을 때 이전 결과 무효화
          setAssumptionResults(null)
          logger.info('Skipping assumption tests (no numeric columns)')
        }

        setIsValidating(false)
      } catch (error) {
        logger.error('Assumption tests failed', { error })
        // Bug #5 Fix: 에러 발생 시 이전 결과 무효화
        setAssumptionResults(null)
        setIsValidating(false)
      }
    }

    performAssumptionTests()
  }, [data, validationResults, categoricalColumns, numericColumns, isPyodideLoaded, setDataCharacteristics, setAssumptionResults])

  if (!validationResults || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">데이터를 먼저 업로드해주세요.</p>
      </div>
    )
  }

  const hasErrors = (validationResults.errors?.length || 0) > 0
  const hasWarnings = (validationResults.warnings?.length || 0) > 0

  // Skeleton Loading
  if (isValidating) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  // Fade-in Animation
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* 검증 요약 카드 */}
      <Card className={`border-2 ${
        hasErrors ? 'border-error-border bg-error-bg' :
        hasWarnings ? 'border-warning-border bg-warning-bg' :
        'border-success-border bg-success-bg'
      }`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {hasErrors ? (
              <XCircle className="w-6 h-6 text-error" />
            ) : hasWarnings ? (
              <AlertTriangle className="w-6 h-6 text-warning" />
            ) : (
              <CheckCircle className="w-6 h-6 text-success" />
            )}
            <span>
              {hasErrors ? '데이터 검증 실패' :
               hasWarnings ? '데이터 검증 완료 (경고 있음)' :
               '데이터 준비 완료'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* 표본 크기 */}
            <div className="p-3 bg-white dark:bg-background rounded-lg border">
              <p className="text-xs text-muted-foreground mb-1">표본 크기</p>
              <p className="text-2xl font-bold">{validationResults.totalRows}</p>
              <Badge variant={validationResults.totalRows >= 30 ? "default" : "secondary"} className="mt-1">
                {validationResults.totalRows >= 30 ? '충분' : '소표본'}
              </Badge>
            </div>

            {/* 변수 */}
            <div className="p-3 bg-white dark:bg-background rounded-lg border">
              <p className="text-xs text-muted-foreground mb-1">분석 가능 변수</p>
              <p className="text-lg font-semibold">
                수치형 {numericColumns.length}개
              </p>
              <p className="text-sm text-muted-foreground">
                범주형 {categoricalColumns.length}개
              </p>
            </div>

            {/* 데이터 품질 */}
            <div className="p-3 bg-white dark:bg-background rounded-lg border">
              <p className="text-xs text-muted-foreground mb-1">데이터 품질</p>
              <p className="text-2xl font-bold">
                {validationResults.missingValues === 0 ? '완벽' :
                 validationResults.missingValues < validationResults.totalRows * 0.05 ? '양호' : '주의'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                결측 {validationResults.missingValues}개 ({((validationResults.missingValues / (validationResults.totalRows * validationResults.columnCount)) * 100).toFixed(1)}%)
              </p>
            </div>

            {/* 파일 정보 */}
            <div className="p-3 bg-white dark:bg-background rounded-lg border">
              <p className="text-xs text-muted-foreground mb-1">업로드 파일</p>
              <p className="text-sm font-medium truncate" title={uploadedFile?.name || uploadedFileName || ''}>
                {uploadedFile?.name || uploadedFileName || '파일명 없음'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {validationResults.columnCount}개 컬럼
              </p>
            </div>
          </div>

          {/* 에러/경고 메시지 */}
          {(hasErrors || hasWarnings) && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm font-medium mb-2">확인 필요 사항</p>
              <ul className="text-xs space-y-1">
                {validationResults.errors?.map((error: string, idx: number) => (
                  <li key={`error-${idx}`} className="text-error">• {error}</li>
                ))}
                {validationResults.warnings?.map((warning: string, idx: number) => (
                  <li key={`warning-${idx}`} className="text-warning">• {warning}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 안내 메시지 */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              데이터 검증이 완료되었습니다. 다음 단계에서 분석 목적을 선택하면
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>AI가 자동으로 최적의 통계 방법을 추천</strong>해드립니다.
            </p>
            <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span>상세 분석</span>
              </div>
              <span>→</span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse delay-150" />
                <span>가정 검정</span>
              </div>
              <span>→</span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse delay-300" />
                <span>AI 추천</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})
