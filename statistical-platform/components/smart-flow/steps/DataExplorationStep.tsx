'use client'

import { memo, useState, useMemo, useCallback } from 'react'
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
import { Plus, X, TrendingUp, ChartScatter } from 'lucide-react'
import { ValidationResults, DataRow } from '@/types/smart-flow'
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
  // 수치형 변수 목록
  const numericVariables = useMemo(() => {
    if (!validationResults?.columnStats) return []
    return validationResults.columnStats
      .filter(col => col.type === 'numeric')
      .map(col => col.name)
  }, [validationResults])

  // Scatterplot 구성 목록
  const [scatterplots, setScatterplots] = useState<ScatterplotConfig[]>(() => {
    // 초기값: 첫 2개 변수 자동 추가
    if (numericVariables.length >= 2) {
      return [{
        id: '1',
        xVariable: numericVariables[0],
        yVariables: [numericVariables[1]]
      }]
    }
    return []
  })

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

  // 상관계수 행렬 계산
  const correlationMatrix = useMemo(() => {
    if (numericVariables.length < 2) return []

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
                    산점도 #{config.id}
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
                {/* X축 선택 */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium w-20">X축:</label>
                  <Select
                    value={config.xVariable}
                    onValueChange={(value) => updateXVariable(config.id, value)}
                  >
                    <SelectTrigger className="w-[200px]">
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
                <div className="flex items-start gap-4">
                  <label className="text-sm font-medium w-20 pt-2">Y축:</label>
                  <div className="flex-1 space-y-2">
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
                    <Select
                      onValueChange={(value) => addYVariable(config.id, value)}
                    >
                      <SelectTrigger className="w-[200px]">
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
                        <div className="mt-2 text-xs text-muted-foreground bg-background p-3 rounded-lg border">
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

              <div className="mt-4 text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
})

export default DataExplorationStep
