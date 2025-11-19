'use client'

import { memo, useMemo, useState, useCallback, useEffect } from 'react'
import { CheckCircle, AlertTriangle, XCircle, Info, BarChart, LineChart, BarChart3 } from 'lucide-react'
import { ValidationResults, ColumnStatistics } from '@/types/smart-flow'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { HistogramChart, BoxPlotChart, BarChart as BarChartComponent } from '@/components/charts/StatisticalChartsImproved'
import { PlotlyChartImproved } from '@/components/charts/PlotlyChartImproved'
import { getHeatmapLayout, getModalLayout, CHART_STYLES } from '@/lib/plotly-config'
import { workerManager, shouldUseWorker } from '@/lib/services/worker-manager'
import type { Data } from 'plotly.js'

interface DataValidationStepProps {
  validationResults: ValidationResults | null
  data: any[] | null
}

// Type guard for ValidationResults with columnStats
function hasColumnStats(results: ValidationResults | null): results is ValidationResults & { columnStats: ColumnStatistics[] } {
  return results !== null && 'columnStats' in results && Array.isArray(results.columnStats)
}

export const DataValidationStepWithCharts = memo(function DataValidationStepWithCharts({
  validationResults,
  data
}: DataValidationStepProps) {
  const [selectedColumn, setSelectedColumn] = useState<ColumnStatistics | null>(null)
  const [showVisualization, setShowVisualization] = useState(false)

  if (!validationResults || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">데이터를 먼저 업로드해주세요.</p>
      </div>
    )
  }

  const hasErrors = validationResults.errors.length > 0
  const hasWarnings = validationResults.warnings.length > 0

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

  // Optimized Pearson correlation calculation
  const calculateCorrelation = useCallback((x: number[], y: number[]): number => {
    const n = Math.min(x.length, y.length)
    if (n < 2) return 0

    // Use single-pass algorithm for efficiency
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0

    for (let i = 0; i < n; i++) {
      sumX += x[i]
      sumY += y[i]
      sumXY += x[i] * y[i]
      sumX2 += x[i] * x[i]
      sumY2 += y[i] * y[i]
    }

    const numerator = n * sumXY - sumX * sumY
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

    return denominator === 0 ? 0 : numerator / denominator
  }, [])

  // State for async correlation matrix calculation
  const [correlationMatrix, setCorrelationMatrix] = useState<{
    matrix: number[][]
    labels: string[]
  } | null>(null)
  const [isCalculatingCorrelation, setIsCalculatingCorrelation] = useState(false)
  const [correlationProgress, setCorrelationProgress] = useState(0)

  // Calculate correlation matrix with Web Worker for large datasets
  useEffect(() => {
    if (!numericColumns.length || numericColumns.length < 2 || !data) {
      setCorrelationMatrix(null)
      return
    }

    const columnsToUse = numericColumns.slice(0, 10)
    const calculateMatrix = async () => {
      setIsCalculatingCorrelation(true)
      setCorrelationProgress(0)

      try {
        if (shouldUseWorker(data.length)) {
          // Use Web Worker for large datasets
          const result = await workerManager.calculateCorrelationMatrix(
            data,
            columnsToUse,
            (progress) => {
              setCorrelationProgress(progress.percentage)
            }
          )
          setCorrelationMatrix(result)
        } else {
          // Use synchronous calculation for small datasets
          const labels = columnsToUse.map(col => col.name)
          const columnDataCache = new Map<string, number[]>()

          for (const col of columnsToUse) {
            const colData = data
              .map(row => {
                const val = row[col.name]
                return typeof val === 'number' ? val : Number(val)
              })
              .filter(v => !isNaN(v) && isFinite(v))
            columnDataCache.set(col.name, colData)
          }

          const matrix: number[][] = []
          for (let i = 0; i < columnsToUse.length; i++) {
            const row: number[] = []
            const col1Data = columnDataCache.get(columnsToUse[i].name) || []

            for (let j = 0; j < columnsToUse.length; j++) {
              if (i === j) {
                row.push(1)
              } else if (j < i && matrix[j]) {
                row.push(matrix[j][i])
              } else {
                const col2Data = columnDataCache.get(columnsToUse[j].name) || []
                if (col1Data.length > 1 && col2Data.length > 1) {
                  const correlation = calculateCorrelation(col1Data, col2Data)
                  row.push(correlation)
                } else {
                  row.push(0)
                }
              }
            }
            matrix.push(row)
          }

          setCorrelationMatrix({ matrix, labels })
        }
      } catch (error) {
        console.error('상관계수 계산 오류:', error)
        setCorrelationMatrix(null)
      } finally {
        setIsCalculatingCorrelation(false)
        setCorrelationProgress(100)
      }
    }

    calculateMatrix()
  }, [numericColumns.length, data?.length]) // 배열 자체가 아닌 길이만 의존성으로

  const getColumnData = (columnName: string) => {
    if (!data) return []
    return data.map(row => row[columnName]).filter(v => v !== null && v !== undefined && v !== '')
  }

  const getNumericColumnData = (columnName: string) => {
    return getColumnData(columnName).map(Number).filter(v => !isNaN(v))
  }

  return (
    <div className="space-y-6">
      {/* 데이터 검증 개요 */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">데이터 품질 검증 보고서</h2>
        <p className="text-muted-foreground text-sm mb-4">
          업로드된 데이터의 구조, 품질, 통계적 특성을 종합적으로 분석하여 분석 가능성을 평가합니다.
        </p>
      </div>

      {/* 검증 요약 카드 */}
      <div className={`rounded-lg p-6 ${
        hasErrors ? 'bg-gray-100 dark:bg-gray-900' :
        hasWarnings ? 'bg-gray-50 dark:bg-gray-800' :
        'bg-white dark:bg-gray-950'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {hasErrors ? (
              <XCircle className="w-6 h-6 text-gray-800 dark:text-gray-200" />
            ) : hasWarnings ? (
              <AlertTriangle className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            ) : (
              <CheckCircle className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            )}
            <div>
              <h3 className="text-lg font-semibold">
                {hasErrors ? '데이터 검증 실패' :
                 hasWarnings ? '데이터 검증 완료 (주의 필요)' :
                 '데이터 검증 통과'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {hasErrors ? '데이터에 심각한 문제가 발견되어 분석을 진행할 수 없습니다.' :
                 hasWarnings ? '일부 주의사항이 있지만 분석 진행이 가능합니다.' :
                 '데이터 품질이 우수하여 모든 통계 분석이 가능합니다.'}
              </p>
            </div>
          </div>
          <Badge variant={hasErrors ? 'destructive' : hasWarnings ? 'secondary' : 'default'}>
            품질 {hasErrors ? '불량' : hasWarnings ? '양호' : '우수'}
          </Badge>
        </div>

        {/* 핵심 지표 요약 */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm uppercase tracking-wider text-muted-foreground">데이터 구조</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-background rounded-lg p-3 border">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">관측치</p>
                <Badge variant="outline" className="text-xs">Rows</Badge>
              </div>
              <p className="text-2xl font-bold">{validationResults.totalRows.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">데이터 포인트</p>
            </div>
            <div className="bg-white dark:bg-background rounded-lg p-3 border">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">변수</p>
                <Badge variant="outline" className="text-xs">Columns</Badge>
              </div>
              <p className="text-2xl font-bold">{validationResults.columnCount}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {numericColumns.length > 0 && `수치형 ${numericColumns.length}개`}
              </p>
            </div>
            <div className="bg-white dark:bg-background rounded-lg p-3 border">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">결측률</p>
                <Badge variant="outline" className="text-xs">Missing</Badge>
              </div>
              <p className="text-2xl font-bold">
                {((validationResults.missingValues / (validationResults.totalRows * validationResults.columnCount)) * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                총 {validationResults.missingValues.toLocaleString()}개 셀
              </p>
            </div>
            <div className="bg-white dark:bg-background rounded-lg p-3 border">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">형식</p>
                <Badge variant="outline" className="text-xs">Format</Badge>
              </div>
              <p className="text-2xl font-bold">{validationResults.dataType}</p>
              <p className="text-xs text-muted-foreground mt-1">데이터 형식</p>
            </div>
          </div>

          {/* 데이터 품질 지표 */}
          {columnStats && (
            <div className="mt-4">
              <h4 className="font-medium text-sm uppercase tracking-wider text-muted-foreground mb-3">품질 지표</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">완전성</p>
                    <p className="text-xs text-muted-foreground">데이터 충실도</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {(100 - ((validationResults.missingValues / (validationResults.totalRows * validationResults.columnCount)) * 100)).toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-success-bg dark:bg-success-bg rounded-lg">
                  <div>
                    <p className="text-sm font-medium">일관성</p>
                    <p className="text-xs text-muted-foreground">타입 일치도</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-success dark:text-success">
                      {(((columnStats.length - columnStats.filter(s => s.type === 'mixed').length) / columnStats.length) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">정확성</p>
                    <p className="text-xs text-muted-foreground">이상치 비율</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {(() => {
                        const totalOutliers = columnStats.reduce((sum, col) => sum + (col.outliers?.length || 0), 0)
                        const totalNumericValues = columnStats.reduce((sum, col) => sum + (col.type === 'numeric' ? col.numericCount : 0), 0)
                        return totalNumericValues > 0 ? (100 - ((totalOutliers / totalNumericValues) * 100)).toFixed(1) : '100.0'
                      })()}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 상세 분석 섹션 */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">상세 분석 결과</h3>
          <p className="text-sm text-muted-foreground">
            통계 분석 전 반드시 확인해야 할 데이터 특성을 다각도로 검토합니다
          </p>
        </div>
      </div>

      {/* 상세 정보 탭 */}
      <Tabs defaultValue="variables" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="variables" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            변수 정보
          </TabsTrigger>
          <TabsTrigger value="statistics" className="flex items-center gap-2">
            <BarChart className="w-4 h-4" />
            기초 통계
          </TabsTrigger>
          <TabsTrigger value="visualization" className="flex items-center gap-2">
            <LineChart className="w-4 h-4" />
            시각화
          </TabsTrigger>
          <TabsTrigger value="issues" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            문제점
          </TabsTrigger>
        </TabsList>

        {/* 변수 정보 탭 */}
        <TabsContent value="variables" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>발견된 변수</CardTitle>
            </CardHeader>
            <CardContent>
              {columnStats ? (
                <div className="space-y-3">
                  {columnStats.map((stat, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{stat.name}</span>
                        <Badge variant={
                          stat.type === 'numeric' ? 'default' :
                          stat.type === 'categorical' ? 'secondary' : 'destructive'
                        }>
                          {stat.type === 'numeric' ? '수치형' :
                           stat.type === 'categorical' ? '범주형' : '혼합'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>고유값: {stat.uniqueValues}개</span>
                          <span>결측: {stat.missingCount}개</span>
                          {stat.type === 'mixed' && (
                            <span className="text-gray-600 dark:text-gray-400">
                              수치 {stat.numericCount}개, 문자 {stat.textCount}개
                            </span>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedColumn(stat)
                            setShowVisualization(true)
                          }}
                        >
                          <BarChart3 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {validationResults.variables.map((variable, index) => (
                    <span key={index} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                      {variable}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 기초 통계 탭 */}
        <TabsContent value="statistics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>수치형 변수 기초통계</CardTitle>
            </CardHeader>
            <CardContent>
              {numericColumns.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">변수명</th>
                        <th className="text-right p-2">평균</th>
                        <th className="text-right p-2">중앙값</th>
                        <th className="text-right p-2">표준편차</th>
                        <th className="text-right p-2">최소값</th>
                        <th className="text-right p-2">최대값</th>
                        <th className="text-right p-2">이상치</th>
                        <th className="text-right p-2">시각화</th>
                      </tr>
                    </thead>
                    <tbody>
                      {numericColumns.map((stat, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="p-2 font-medium">{stat.name}</td>
                          <td className="text-right p-2">{stat.mean?.toFixed(2)}</td>
                          <td className="text-right p-2">{stat.median?.toFixed(2)}</td>
                          <td className="text-right p-2">{stat.std?.toFixed(2)}</td>
                          <td className="text-right p-2">{stat.min?.toFixed(2)}</td>
                          <td className="text-right p-2">{stat.max?.toFixed(2)}</td>
                          <td className="text-right p-2">
                            {stat.outliers?.length || 0}개
                            {stat.outliers && stat.outliers.length > 0 && (
                              <span className="text-gray-600 dark:text-gray-400 ml-1">
                                ({((stat.outliers.length / stat.numericCount) * 100).toFixed(1)}%)
                              </span>
                            )}
                          </td>
                          <td className="text-right p-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedColumn(stat)
                                setShowVisualization(true)
                              }}
                            >
                              <BarChart className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground">수치형 변수가 없습니다.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 시각화 탭 */}
        <TabsContent value="visualization" className="space-y-4">
          {/* 디버깅 정보 */}
          {(!columnStats || columnStats.length === 0) ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">
                  시각화를 표시할 데이터가 없습니다. 데이터를 먼저 업로드하고 검증을 완료해주세요.
                </p>
                <p className="text-center text-sm text-muted-foreground mt-2">
                  (수치형 변수: {numericColumns.length}개, 범주형 변수: {categoricalColumns.length}개)
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* 상관관계 히트맵 */}
              {numericColumns.length >= 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle>변수 간 상관관계</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isCalculatingCorrelation ? (
                      <div className="h-[400px] flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          상관계수 계산 중... {correlationProgress}%
                        </p>
                        <div className="w-64 mt-2 bg-gray-200 rounded-full h-2.5">
                          <div
                            className="bg-primary h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${correlationProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    ) : correlationMatrix ? (
                      <PlotlyChartImproved
                      data={[{
                        z: correlationMatrix.matrix,
                        x: correlationMatrix.labels,
                        y: correlationMatrix.labels,
                        type: 'heatmap',
                        ...CHART_STYLES.heatmap,
                        text: correlationMatrix.matrix.map(row => row.map(val => val.toFixed(2))),
                        texttemplate: '%{text}',
                        textfont: { size: 10 }
                      } as unknown as Data]}
                      layout={getHeatmapLayout({
                        title: { text: 'Pearson 상관계수' },
                        height: 400
                      })}
                    />
                    ) : (
                      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                        <p>상관계수를 계산할 수 있는 데이터가 없습니다</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

          {/* 각 변수별 분포 차트 */}
          <div className="grid gap-4 md:grid-cols-2">
            {numericColumns.slice(0, 4).map((stat, idx) => {
              const columnData = getNumericColumnData(stat.name)
              return (
                <Card key={idx}>
                  <CardHeader>
                    <CardTitle className="text-sm">{stat.name} 분포</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <PlotlyChartImproved
                      data={[{
                        x: columnData,
                        type: 'box',
                        ...CHART_STYLES.box,
                        name: stat.name,
                        boxmean: 'sd',
                        orientation: 'h',
                        hovertemplate:
                          '최대: %{x[5]}<br>' +
                          'Q3: %{x[4]}<br>' +
                          '중앙값: %{x[3]}<br>' +
                          'Q1: %{x[2]}<br>' +
                          '최소: %{x[1]}<br>' +
                          '평균: %{mean}<br>' +
                          '표준편차: %{sd}<extra></extra>'
                      } as Data]}
                      layout={{
                        ...getModalLayout({
                          title: { text: '' },
                          xaxis: { title: { text: '' } },
                          height: 250,
                          showlegend: false
                        }),
                        margin: { l: 10, r: 10, t: 10, b: 40 }
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

          {/* 범주형 변수 차트 */}
          {categoricalColumns.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {categoricalColumns.slice(0, 2).map((stat, idx) => {
                if (!stat.topCategories || stat.topCategories.length === 0) return null

                return (
                  <Card key={idx}>
                    <CardHeader>
                      <CardTitle className="text-sm">{stat.name} 빈도</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                      <PlotlyChartImproved
                        data={[{
                          x: stat.topCategories.slice(0, 10).map(c => c.value),
                          y: stat.topCategories.slice(0, 10).map(c => c.count),
                          type: 'bar',
                          ...CHART_STYLES.bar,
                          hovertemplate: '%{x}: %{y}개<extra></extra>'
                        } as Data]}
                        layout={{
                          ...getModalLayout({
                            title: { text: '' },
                            xaxis: { title: { text: '' } },
                            yaxis: { title: { text: '빈도' } },
                            height: 250,
                            showlegend: false
                          }),
                          margin: { l: 50, r: 10, t: 10, b: 50 }
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
          )}
            </>
          )}
        </TabsContent>

        {/* 문제점 탭 */}
        <TabsContent value="issues" className="space-y-4">
          {hasErrors && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-gray-100">
                  <XCircle className="inline w-5 h-5 mr-2" />
                  오류
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                  {validationResults.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {hasWarnings && (
            <Card className="border-yellow-200">
              <CardHeader>
                <CardTitle className="text-gray-800 dark:text-gray-200">
                  <AlertTriangle className="inline w-5 h-5 mr-2" />
                  경고
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  {validationResults.warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {!hasErrors && !hasWarnings && (
            <Card className="border-success-border">
              <CardHeader>
                <CardTitle className="text-gray-700 dark:text-gray-300">
                  <CheckCircle className="inline w-5 h-5 mr-2" />
                  확인사항
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  <li>• 모든 데이터가 정상적으로 로드되었습니다</li>
                  <li>• 데이터 타입이 일관성 있게 검출되었습니다</li>
                  <li>• 통계 분석을 진행할 준비가 되었습니다</li>
                </ul>
              </CardContent>
            </Card>
          )}

          {/* 데이터 품질 요약 */}
          <Card>
            <CardHeader>
              <CardTitle>
                <Info className="inline w-5 h-5 mr-2" />
                데이터 품질 요약
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>결측값 비율</span>
                <span className="font-medium">
                  {((validationResults.missingValues / (validationResults.totalRows * validationResults.columnCount)) * 100).toFixed(1)}%
                </span>
              </div>
              {columnStats && (
                <>
                  <div className="flex justify-between">
                    <span>혼합 타입 변수</span>
                    <span className="font-medium">
                      {columnStats.filter(s => s.type === 'mixed').length}개
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>이상치 포함 변수</span>
                    <span className="font-medium">
                      {columnStats.filter(s => s.outliers && s.outliers.length > 0).length}개
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 변수별 문제점 상세 */}
          {columnStats && columnStats.some(s => s.type === 'mixed' || (s.outliers && s.outliers.length > 0) || s.missingCount > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>변수별 문제점 상세</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {columnStats
                    .filter(s => s.type === 'mixed' || (s.outliers && s.outliers.length > 0) || s.missingCount > 0)
                    .map((stat, idx) => (
                      <div key={idx} className="p-3 border rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{stat.name}</span>
                          <Badge variant={stat.type === 'mixed' ? 'destructive' : 'secondary'}>
                            {stat.type === 'numeric' ? '수치형' : stat.type === 'categorical' ? '범주형' : '혼합'}
                          </Badge>
                        </div>
                        <div className="text-sm space-y-1 text-muted-foreground">
                          {stat.type === 'mixed' && (
                            <p>• 혼합 타입: 수치 {stat.numericCount}개, 문자 {stat.textCount}개</p>
                          )}
                          {stat.missingCount > 0 && (
                            <p>• 결측값: {stat.missingCount}개 ({((stat.missingCount / validationResults.totalRows) * 100).toFixed(1)}%)</p>
                          )}
                          {stat.outliers && stat.outliers.length > 0 && (
                            <p>• 이상치: {stat.outliers.length}개 ({((stat.outliers.length / stat.numericCount) * 100).toFixed(1)}%)</p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 권장사항 */}
          <Card>
            <CardHeader>
              <CardTitle>
                <LineChart className="inline w-5 h-5 mr-2" />
                데이터 처리 권장사항
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2">
                {columnStats && columnStats.some(s => s.type === 'mixed') && (
                  <li className="flex items-start gap-2">
                    <span className="text-gray-600 dark:text-gray-400">⚠</span>
                    <span>혼합 타입 변수는 분석 전에 타입을 통일하거나 분리하는 것을 권장합니다.</span>
                  </li>
                )}
                {columnStats && columnStats.some(s => s.outliers && s.outliers.length > 0) && (
                  <li className="flex items-start gap-2">
                    <span className="text-gray-500 dark:text-gray-500">💡</span>
                    <span>이상치가 발견되었습니다. 비모수 검정 방법 사용을 고려해보세요.</span>
                  </li>
                )}
                {columnStats && columnStats.some(s => s.missingCount > validationResults.totalRows * 0.2) && (
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600">📊</span>
                    <span>결측값이 20% 이상인 변수가 있습니다. 해당 변수 제외 또는 대체값 사용을 고려하세요.</span>
                  </li>
                )}
                {!hasErrors && !hasWarnings && (
                  <li className="flex items-start gap-2">
                    <span className="text-gray-700 dark:text-gray-300">✅</span>
                    <span>데이터 품질이 양호합니다. 모든 통계 분석 방법을 사용할 수 있습니다.</span>
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 변수 상세 시각화 다이얼로그 */}
      <Dialog open={showVisualization} onOpenChange={setShowVisualization}>
        <DialogContent className="max-w-[1400px] w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedColumn?.name} 상세 분석</DialogTitle>
          </DialogHeader>

          {selectedColumn && (
            <div className="space-y-4">
              {selectedColumn.type === 'numeric' ? (
                <>
                  <Tabs defaultValue="histogram" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="histogram">히스토그램</TabsTrigger>
                      <TabsTrigger value="boxplot">박스플롯</TabsTrigger>
                    </TabsList>

                    <TabsContent value="histogram" className="mt-4">
                      <div className="h-[400px] w-full">
                        <PlotlyChartImproved
                          data={[{
                            x: getNumericColumnData(selectedColumn.name),
                            type: 'histogram',
                            ...CHART_STYLES.histogram,
                            nbinsx: 20,
                            name: selectedColumn.name,
                            hovertemplate: '%{x}: %{y}개<extra></extra>'
                          } as Data]}
                          layout={getModalLayout({
                            title: { text: '' },
                            xaxis: { title: { text: selectedColumn.name } },
                            yaxis: { title: { text: '빈도' } },
                            height: 380,
                            showlegend: false,
                            margin: { l: 50, r: 30, t: 20, b: 50 }
                          })}
                          config={{
                            displayModeBar: true,
                            displaylogo: false,
                            responsive: true
                          }}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="boxplot" className="mt-4">
                      <div className="h-[400px] w-full">
                        <PlotlyChartImproved
                          data={[{
                            y: getNumericColumnData(selectedColumn.name),
                            type: 'box',
                            ...CHART_STYLES.box,
                            name: selectedColumn.name,
                            boxmean: true,
                            hovertemplate: '%{y}<extra></extra>'
                          } as Data]}
                          layout={getModalLayout({
                            title: { text: '' },
                            yaxis: { title: { text: selectedColumn.name } },
                            height: 380,
                            showlegend: false,
                            margin: { l: 60, r: 30, t: 20, b: 40 }
                          })}
                          config={{
                            displayModeBar: true,
                            displaylogo: false,
                            responsive: true
                          }}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div className="bg-muted rounded p-3">
                      <p className="text-sm text-muted-foreground">평균</p>
                      <p className="text-lg font-bold">{selectedColumn.mean?.toFixed(2)}</p>
                    </div>
                    <div className="bg-muted rounded p-3">
                      <p className="text-sm text-muted-foreground">표준편차</p>
                      <p className="text-lg font-bold">{selectedColumn.std?.toFixed(2)}</p>
                    </div>
                    <div className="bg-muted rounded p-3">
                      <p className="text-sm text-muted-foreground">최소/최대</p>
                      <p className="text-lg font-bold">
                        {selectedColumn.min?.toFixed(2)} / {selectedColumn.max?.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-muted rounded p-3">
                      <p className="text-sm text-muted-foreground">이상치</p>
                      <p className="text-lg font-bold">{selectedColumn.outliers?.length || 0}개</p>
                    </div>
                  </div>
                </>
              ) : selectedColumn.type === 'categorical' && selectedColumn.topCategories ? (
                <div>
                  <BarChartComponent
                    categories={selectedColumn.topCategories.map(c => c.value)}
                    values={selectedColumn.topCategories.map(c => c.count)}
                    title="카테고리별 빈도"
                    orientation="h"
                  />
                </div>
              ) : (
                <p className="text-muted-foreground">혼합 타입 변수는 시각화가 제한됩니다.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
})