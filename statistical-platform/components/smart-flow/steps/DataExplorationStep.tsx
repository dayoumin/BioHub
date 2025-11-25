'use client'

import { memo, useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Scatterplot } from '@/components/charts/scatterplot'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, X, TrendingUp, ChartScatter, Loader2, ListOrdered } from 'lucide-react'
import { ValidationResults, DataRow, ColumnStatistics, StatisticalAssumptions } from '@/types/smart-flow'
import { usePyodide } from '@/components/providers/PyodideProvider'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { logger } from '@/lib/utils/logger'

interface DataExplorationStepProps {
  validationResults: ValidationResults | null
  data: DataRow[]
  onNext: () => void
  onPrevious: () => void
}

interface ScatterplotConfig {
  id: string
  xVariable: string
  yVariables: string[]
}

/**
 * 상관계수 계산 (Pearson correlation coefficient)
 */
function calculateCorrelation(x: number[], y: number[]): { r: number; r2: number; n: number } {
  // x와 y는 이미 row-wise paired (길이 동일 보장)
  const n = x.length
  if (n < 2 || x.length !== y.length) return { r: 0, r2: 0, n: 0 }

  const sumX = x.reduce((sum, val) => sum + val, 0)
  const sumY = y.reduce((sum, val) => sum + val, 0)
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0)
  const sumXX = x.reduce((sum, val) => sum + val * val, 0)
  const sumYY = y.reduce((sum, val) => sum + val * val, 0)

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY))

  const r = denominator === 0 ? 0 : numerator / denominator
  const r2 = r * r

  return { r, r2, n }
}

export const DataExplorationStep = memo(function DataExplorationStep({
  validationResults,
  data,
  onNext,
  onPrevious
}: DataExplorationStepProps) {
  // Pyodide 및 Store
  const { isLoaded: pyodideLoaded, service: pyodideService } = usePyodide()
  const { setAssumptionResults } = useSmartFlowStore()

  // 가정 검정 상태
  const [isAssumptionLoading, setIsAssumptionLoading] = useState(false)
  const [assumptionResults, setLocalAssumptionResults] = useState<StatisticalAssumptions | null>(null)
  const assumptionRunId = useRef(0)

  // 수치형/범주형 변수 목록
  const numericVariables = useMemo(() => {
    if (!validationResults?.columnStats) return []
    return validationResults.columnStats
      .filter(col => col.type === 'numeric')
      .map(col => col.name)
  }, [validationResults])

  const categoricalVariables = useMemo(() => {
    if (!validationResults?.columnStats) return []
    return validationResults.columnStats
      .filter(col => col.type === 'categorical')
      .map(col => col.name)
  }, [validationResults])

  // Scatterplot 구성 목록
  const [scatterplots, setScatterplots] = useState<ScatterplotConfig[]>([])

  // 로딩 상태 (상관계수 행렬 계산용)
  const [isCalculating, setIsCalculating] = useState(false)

  // 가정 검정 자동 실행 (Step 2: 데이터 탐색)
  useEffect(() => {
    if (!pyodideLoaded || !pyodideService) return
    if (!data || !validationResults) return
    if (numericVariables.length === 0) return

    // 중복 실행 방지
    assumptionRunId.current++
    const currentRunId = assumptionRunId.current

    const timer = setTimeout(async () => {
      let isActive = true
      try {
        setIsAssumptionLoading(true)
        const testData: any = {}

        // 첫 번째 수치형 컬럼으로 정규성 검정
        const firstNumericCol = numericVariables[0]
        const values = data.map(row => parseFloat(String(row[firstNumericCol])))
          .filter(v => !isNaN(v))

        if (values.length >= 3) {
          testData.values = values
        }

        // 그룹이 여러 개 있으면 등분산성 검정
        if (categoricalVariables.length > 0) {
          const groupCol = categoricalVariables[0]
          const groups: number[][] = []

          const uniqueGroups = [...new Set(data.map(row => row[groupCol]))]
          for (const group of uniqueGroups) {
            const groupData = data
              .filter(row => row[groupCol] === group)
              .map(row => parseFloat(String(row[firstNumericCol])))
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
          alpha: 0.05,
          normalityRule: 'any'
        }) as StatisticalAssumptions

        if (isActive && currentRunId === assumptionRunId.current) {
          setLocalAssumptionResults(assumptions)
          setAssumptionResults(assumptions)
          logger.info('[DataExploration] 통계 가정 검정 완료', { summary: assumptions.summary })
        }
      } catch (error) {
        logger.error('[DataExploration] 가정 검정 실패', { error })
      } finally {
        if (isActive && currentRunId === assumptionRunId.current) {
          setIsAssumptionLoading(false)
        }
      }

      return () => { isActive = false }
    }, 200)

    return () => { clearTimeout(timer) }
  }, [data, validationResults, pyodideLoaded, pyodideService, numericVariables, categoricalVariables, setAssumptionResults])

  // 비동기 데이터 로딩 대응: numericVariables 업데이트 시 기본 산점도 추가
  useEffect(() => {
    if (numericVariables.length >= 2 && scatterplots.length === 0) {
      setScatterplots([{
        id: '1',
        xVariable: numericVariables[0],
        yVariables: [numericVariables[1]]
      }])
    }
  }, [numericVariables, scatterplots.length])

  // 변수 데이터 추출 (Raw - 필터링 없음, row index 유지)
  const getVariableDataRaw = useCallback((variableName: string): Array<number | null> => {
    return data.map(row => {
      const val = row[variableName]
      if (val === null || val === undefined || val === '') return null
      const num = Number(val)
      return isNaN(num) ? null : num
    })
  }, [data])

  // Row-wise pairwise deletion: X와 Y 모두 valid한 행만 유지
  const getPairedData = useCallback((var1: string, var2: string): { x: number[]; y: number[] } => {
    const raw1 = getVariableDataRaw(var1)
    const raw2 = getVariableDataRaw(var2)

    const paired: { x: number; y: number }[] = []
    for (let i = 0; i < Math.min(raw1.length, raw2.length); i++) {
      if (raw1[i] !== null && raw2[i] !== null) {
        paired.push({ x: raw1[i]!, y: raw2[i]! })
      }
    }

    return {
      x: paired.map(p => p.x),
      y: paired.map(p => p.y)
    }
  }, [getVariableDataRaw])

  // 새 Scatterplot 추가
  const addScatterplot = useCallback(() => {
    if (numericVariables.length < 2) return

    const newId = String(scatterplots.length + 1)
    const availableVars = numericVariables.filter(v =>
      !scatterplots.some(s => s.xVariable === v)
    )

    const xVar = availableVars[0] || numericVariables[0]
    const yOptions = numericVariables.filter(v => v !== xVar) // X ≠ Y 보장
    const yVar = availableVars[1] && availableVars[1] !== xVar
      ? availableVars[1]
      : yOptions[0]

    const newConfig: ScatterplotConfig = {
      id: newId,
      xVariable: xVar,
      yVariables: yVar ? [yVar] : []
    }

    setScatterplots(prev => [...prev, newConfig])
  }, [numericVariables, scatterplots])

  // Scatterplot 삭제
  const removeScatterplot = useCallback((id: string) => {
    setScatterplots(prev => prev.filter(s => s.id !== id))
  }, [])

  // X축 변수 변경
  const updateXVariable = useCallback((id: string, newX: string) => {
    setScatterplots(prev => prev.map(s =>
      s.id === id
        ? {
            ...s,
            xVariable: newX,
            yVariables: s.yVariables.filter(y => y !== newX) // X=Y 방지
          }
        : s
    ))
  }, [])

  // Y축 변수 추가
  const addYVariable = useCallback((id: string, newY: string) => {
    setScatterplots(prev => prev.map(s =>
      s.id === id && !s.yVariables.includes(newY)
        ? { ...s, yVariables: [...s.yVariables, newY] }
        : s
    ))
  }, [])

  // Y축 변수 제거
  const removeYVariable = useCallback((id: string, yToRemove: string) => {
    setScatterplots(prev => prev.map(s =>
      s.id === id
        ? { ...s, yVariables: s.yVariables.filter(y => y !== yToRemove) }
        : s
    ))
  }, [])

  // 상관계수 행렬 계산 (순수 함수 - 부작용 제거)
  const correlationMatrix = useMemo(() => {
    if (numericVariables.length < 2) {
      return []
    }

    const matrix: Array<{
      var1: string
      var2: string
      r: number
      r2: number
      strength: string
      color: string
    }> = []

    for (let i = 0; i < numericVariables.length; i++) {
      for (let j = i + 1; j < numericVariables.length; j++) {
        const var1 = numericVariables[i]
        const var2 = numericVariables[j]
        const { x: data1, y: data2 } = getPairedData(var1, var2)
        const { r, r2 } = calculateCorrelation(data1, data2)

        const absR = Math.abs(r)
        let strength = '약한'
        let color = 'bg-gray-100'

        if (absR >= 0.7) {
          strength = '매우 강한'
          color = 'bg-red-100 dark:bg-red-950'
        } else if (absR >= 0.5) {
          strength = '강한'
          color = 'bg-orange-100 dark:bg-orange-950'
        } else if (absR >= 0.3) {
          strength = '중간'
          color = 'bg-yellow-100 dark:bg-yellow-950'
        }

        matrix.push({ var1, var2, r, r2, strength, color })
      }
    }

    // 상관계수 절대값 내림차순 정렬
    return matrix.sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
  }, [numericVariables, getPairedData])

  // 로딩 상태 관리 (useEffect로 부작용 분리)
  useEffect(() => {
    if (numericVariables.length >= 2) {
      setIsCalculating(true)
      // 동기 계산이므로 즉시 완료
      const timer = setTimeout(() => setIsCalculating(false), 0)
      return () => clearTimeout(timer)
    } else {
      setIsCalculating(false)
    }
  }, [numericVariables.length])

  // 빈 상태 처리
  if (!validationResults || numericVariables.length < 2) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>📊 데이터 탐색</CardTitle>
            <CardDescription>
              변수 간 상관관계를 시각화하고 분석합니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>수치형 변수가 2개 이상 필요합니다.</p>
              <p className="text-sm mt-2">현재: {numericVariables.length}개</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button onClick={onPrevious} variant="outline">
            ← 이전
          </Button>
          <Button onClick={onNext}>
            다음 단계로 →
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartScatter className="h-5 w-5" />
            데이터 탐색
          </CardTitle>
          <CardDescription>
            변수 간 상관관계를 자유롭게 탐색하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline">{numericVariables.length}개 수치형 변수</Badge>
            <Badge variant="outline">{scatterplots.length}개 산점도</Badge>
            <Badge variant="outline">{correlationMatrix.length}개 상관관계</Badge>
          </div>
        </CardContent>
      </Card>

      {/* 네비게이션 버튼 */}
      <div className="flex justify-between">
        <Button onClick={onPrevious} variant="outline">
          ← 이전
        </Button>
        <Button onClick={onNext}>
          다음 단계로 →
        </Button>
      </div>

      {/* 기초 통계량 (상단 카드) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListOrdered className="h-5 w-5" />
            기초 통계량
          </CardTitle>
          <CardDescription>
            수치형 변수들의 기술통계 요약
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-semibold">변수명</th>
                  <th className="text-right p-2 font-semibold">평균</th>
                  <th className="text-right p-2 font-semibold">표준편차</th>
                  <th className="text-right p-2 font-semibold">중앙값</th>
                  <th className="text-right p-2 font-semibold">최소값</th>
                  <th className="text-right p-2 font-semibold">최대값</th>
                  <th className="text-right p-2 font-semibold">Q1</th>
                  <th className="text-right p-2 font-semibold">Q3</th>
                </tr>
              </thead>
              <tbody>
                {validationResults?.columnStats
                  ?.filter(col => col.type === 'numeric')
                  .map((col: ColumnStatistics) => (
                    <tr key={col.name} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{col.name}</td>
                      <td className="p-2 text-right">{col.mean?.toFixed(2) ?? 'N/A'}</td>
                      <td className="p-2 text-right">{col.std?.toFixed(2) ?? 'N/A'}</td>
                      <td className="p-2 text-right">{col.median?.toFixed(2) ?? 'N/A'}</td>
                      <td className="p-2 text-right">{col.min?.toFixed(2) ?? 'N/A'}</td>
                      <td className="p-2 text-right">{col.max?.toFixed(2) ?? 'N/A'}</td>
                      <td className="p-2 text-right">{col.q1?.toFixed(2) ?? 'N/A'}</td>
                      <td className="p-2 text-right">{col.q3?.toFixed(2) ?? 'N/A'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 가정 검정 결과 카드 */}
      {isAssumptionLoading && (
        <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              통계적 가정 검증 중...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              정규성, 등분산성 검정을 수행하고 있습니다. 잠시만 기다려주세요.
            </p>
          </CardContent>
        </Card>
      )}

      {!isAssumptionLoading && assumptionResults && (
        <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
          <CardHeader>
            <CardTitle className="text-base">🔍 통계적 가정 검증</CardTitle>
            <CardDescription>
              이 결과를 바탕으로 적절한 통계 검정 방법을 선택하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* 정규성 검정 결과 */}
              {assumptionResults.normality?.shapiroWilk && (
                <div className="p-3 bg-white dark:bg-background rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">📊 정규성 검정 (Shapiro-Wilk)</span>
                    <Badge variant={assumptionResults.normality.shapiroWilk.isNormal ? "default" : "secondary"}>
                      {assumptionResults.normality.shapiroWilk.isNormal ? '정규분포' : '비정규분포'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">통계량: </span>
                      <span className="font-mono">{(assumptionResults.normality.shapiroWilk.statistic ?? 0).toFixed(4)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">p-value: </span>
                      <span className="font-mono">{(assumptionResults.normality.shapiroWilk.pValue ?? 0).toFixed(4)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {assumptionResults.normality.shapiroWilk.isNormal
                      ? '✓ 정규분포 가정을 만족합니다 (p ≥ 0.05). 모수 검정 사용 가능합니다.'
                      : '⚠ 정규분포 가정을 만족하지 않습니다 (p < 0.05). 비모수 검정 고려가 필요합니다.'}
                  </p>
                </div>
              )}

              {/* 등분산성 검정 결과 */}
              {assumptionResults.homogeneity?.levene && (
                <div className="p-3 bg-white dark:bg-background rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">📏 등분산성 검정 (Levene)</span>
                    <Badge variant={assumptionResults.homogeneity.levene.equalVariance ? "default" : "secondary"}>
                      {assumptionResults.homogeneity.levene.equalVariance ? '등분산' : '이분산'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">통계량: </span>
                      <span className="font-mono">{(assumptionResults.homogeneity.levene.statistic ?? 0).toFixed(4)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">p-value: </span>
                      <span className="font-mono">{(assumptionResults.homogeneity.levene.pValue ?? 0).toFixed(4)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {assumptionResults.homogeneity.levene.equalVariance
                      ? '✓ 등분산 가정을 만족합니다 (p ≥ 0.05).'
                      : '⚠ 등분산 가정을 만족하지 않습니다 (p < 0.05). Welch 검정 고려가 필요합니다.'}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs: 산점도 vs 상관계수 행렬 */}
      <Tabs defaultValue="scatterplots" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="scatterplots">
            <ChartScatter className="h-4 w-4 mr-2" />
            산점도
          </TabsTrigger>
          <TabsTrigger value="correlation">
            <TrendingUp className="h-4 w-4 mr-2" />
            상관계수 행렬
          </TabsTrigger>
        </TabsList>

        {/* 산점도 Tab */}
        <TabsContent value="scatterplots" className="space-y-4">
          {scatterplots.map(config => (
            <Card key={config.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    산점도
                  </CardTitle>
                  {scatterplots.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeScatterplot(config.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* X/Y축 좌우 배치 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* X축 선택 */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">X축</label>
                    <Select
                      value={config.xVariable}
                      onValueChange={(value) => updateXVariable(config.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {numericVariables.map(v => (
                          <SelectItem key={v} value={v}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Y축 선택 (다중) */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Y축</label>
                    <Select
                      onValueChange={(value) => addYVariable(config.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Y축 변수 추가..." />
                      </SelectTrigger>
                      <SelectContent>
                        {numericVariables
                          .filter(v => v !== config.xVariable && !config.yVariables.includes(v))
                          .map(v => (
                            <SelectItem key={v} value={v}>
                              {v}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 선택된 Y축 변수들 (바로 아래 배치) */}
                {config.yVariables.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {config.yVariables.map(y => (
                      <Badge key={y} variant="secondary" className="flex items-center gap-1">
                        {y}
                        <button
                          onClick={() => removeYVariable(config.id, y)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Scatterplot 렌더링 (Y축마다) */}
                <div className="space-y-4">
                  {config.yVariables.map(yVar => {
                    const { x: xData, y: yData } = getPairedData(config.xVariable, yVar)
                    const scatterData = xData.map((x, i) => ({ x, y: yData[i] }))
                    const { r, r2 } = calculateCorrelation(xData, yData)

                    return (
                      <div key={yVar}>
                        <Scatterplot
                          data={scatterData}
                          title={`${config.xVariable} vs ${yVar}`}
                          xAxisLabel={config.xVariable}
                          yAxisLabel={yVar}
                          showTrendLine={true}
                          correlationCoefficient={r}
                        />
                        <div className="mt-2 text-sm text-muted-foreground bg-background p-3 rounded-lg border">
                          <p className="font-medium mb-1">📊 통계 요약:</p>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <span className="font-medium">상관계수 (r):</span> {r.toFixed(3)}
                            </div>
                            <div>
                              <span className="font-medium">결정계수 (r²):</span> {r2.toFixed(3)}
                            </div>
                            <div>
                              <span className="font-medium">표본 크기 (n):</span> {xData.length}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* 산점도 추가 버튼 */}
          <Button
            onClick={addScatterplot}
            variant="outline"
            className="w-full"
            disabled={scatterplots.length >= numericVariables.length}
          >
            <Plus className="h-4 w-4 mr-2" />
            산점도 추가
          </Button>
        </TabsContent>

        {/* 상관계수 행렬 Tab */}
        <TabsContent value="correlation">
          <Card>
            <CardHeader>
              <CardTitle>상관계수 행렬</CardTitle>
              <CardDescription>
                모든 변수 쌍의 상관관계 (강도 순 정렬)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isCalculating ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <div className="text-center">
                    <p className="text-sm font-medium">상관계수 계산 중...</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {numericVariables.length}개 변수 분석
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {correlationMatrix.map(({ var1, var2, r, r2, strength, color }) => (
                      <div
                        key={`${var1}-${var2}`}
                        className={`p-3 rounded-lg border ${color}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{var1}</span>
                            <span className="text-muted-foreground">↔</span>
                            <span className="font-medium">{var2}</span>
                          </div>
                          <Badge variant={Math.abs(r) >= 0.5 ? 'default' : 'secondary'}>
                            {strength} 상관
                          </Badge>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground grid grid-cols-3 gap-2">
                          <div>r = {r.toFixed(3)}</div>
                          <div>r² = {r2.toFixed(3)}</div>
                          <div>
                            {r > 0 ? '양의 상관' : r < 0 ? '음의 상관' : '무상관'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="font-medium mb-1">💡 상관계수 해석:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong>|r| ≥ 0.7</strong>: 매우 강한 상관</li>
                      <li><strong>0.5 ≤ |r| &lt; 0.7</strong>: 강한 상관</li>
                      <li><strong>0.3 ≤ |r| &lt; 0.5</strong>: 중간 상관</li>
                      <li><strong>|r| &lt; 0.3</strong>: 약한 상관</li>
                      <li><strong>r &gt; 0</strong>: 양의 상관 (같이 증가)</li>
                      <li><strong>r &lt; 0</strong>: 음의 상관 (반대로 변화)</li>
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
})

export default DataExplorationStep
