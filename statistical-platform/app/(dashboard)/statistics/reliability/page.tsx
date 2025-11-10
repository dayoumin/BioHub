'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { ReliabilityVariables } from '@/types/statistics'
import { toReliabilityVariables, type VariableAssignment } from '@/types/statistics-converters'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Activity,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  Calculator,
  TrendingUp,
  FileSpreadsheet,
  Download
} from 'lucide-react'

// Components - 기존 시스템 사용
import { StatisticsPageLayout, StepCard, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelector } from '@/components/variable-selection/VariableSelector'

// Services & Types
import { pyodideStats } from '@/lib/services/pyodide-statistics'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { getVariableRequirements } from '@/lib/statistics/variable-requirements'
import type { UploadedData } from '@/hooks/use-statistics-page'

// Data interfaces
interface DataRow {
  [key: string]: string | number | null | undefined
}

interface ReliabilityResult {
  cronbachAlpha: number
  standardizedAlpha: number
  itemCount: number
  sampleSize: number
  itemStatistics: Array<{
    item: string
    mean: number
    stdDev: number
    correctedItemTotal: number
    alphaIfDeleted: number
  }>
  interItemCorrelations: {
    mean: number
    min: number
    max: number
    variance: number
  }
  scaleStatistics: {
    mean: number
    variance: number
    stdDev: number
  }
  assumptions: {
    missingValues: number
    itemsReverseCoded: string[]
    reliabilityLevel: 'excellent' | 'good' | 'acceptable' | 'questionable' | 'poor'
  }
}

export default function ReliabilityAnalysisPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('reliability')
  }, [])

  // Hook for state management
  const { state, actions } = useStatisticsPage<ReliabilityResult, ReliabilityVariables>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, selectedVariables, results: analysisResult, isAnalyzing, error } = state
  const [analysisOptions, setAnalysisOptions] = useState({
    model: 'alpha' as 'alpha' | 'split-half' | 'parallel',
    scaleIfDeleted: true,
    itemStatistics: true,
    interItemCorr: true,
    confidence: 95
  })

  // Pyodide instance
  const [pyodide, setPyodide] = useState<typeof pyodideStats | null>(null)

  // Initialize Pyodide
  useEffect(() => {
    const initPyodide = async () => {
      try {
        await pyodideStats.initialize()
        setPyodide(pyodideStats)
      } catch (err) {
        console.error('Pyodide 초기화 실패:', err)
        actions.setError?.('통계 엔진을 초기화할 수 없습니다.')
      }
    }
    initPyodide()
  }, [])

  // Steps configuration
  const steps: StatisticsStep[] = [
    {
      id: 'method',
      number: 1,
      title: '분석 방법',
      description: '신뢰도 분석 방법 이해',
      status: currentStep === 0 ? 'current' : currentStep > 0 ? 'completed' : 'pending'
    },
    {
      id: 'upload',
      number: 2,
      title: '데이터 업로드',
      description: '분석할 데이터 파일 업로드',
      status: currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : 'pending'
    },
    {
      id: 'variables',
      number: 3,
      title: '변수 선택',
      description: '신뢰도 분석할 항목들 선택',
      status: currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : 'pending'
    },
    {
      id: 'results',
      number: 4,
      title: '결과 해석',
      description: 'Cronbach\'s α 결과 확인',
      status: currentStep === 3 ? 'current' : 'pending'
    }
  ]

  // Event handlers
  const handleDataUpload = useCallback((file: File, data: unknown[]) => {
    if (!actions.setUploadedData || !actions.setCurrentStep || !actions.setError) {
      console.error('Actions are not available')
      return
    }

    // Validate data is array of objects
    if (!Array.isArray(data) || data.length === 0) {
      actions.setError?.('올바른 데이터 형식이 아닙니다.')
      return
    }

    // Extract columns from first row
    const firstRow = data[0]
    if (!firstRow || typeof firstRow !== 'object') {
      actions.setError?.('데이터 구조가 올바르지 않습니다.')
      return
    }

    const columns = Object.keys(firstRow as Record<string, unknown>)

    const uploadedDataObj: UploadedData = {
      data: data as Record<string, unknown>[],
      fileName: file.name,
      columns
    }

    actions.setUploadedData?.(uploadedDataObj)
    actions.setCurrentStep(2)
    actions.setError?.('')
  }, [actions])

  const handleVariableSelection = useCallback((variables: VariableAssignment) => {
    const typedVars = toReliabilityVariables(variables)
    actions.setSelectedVariables?.(typedVars)
    if (typedVars.items && typedVars.items.length >= 2) {
      runAnalysis(variables)
    }
  }, [actions])

  const runAnalysis = async (variables: VariableAssignment) => {
    if (!uploadedData || !pyodide || !variables.variables || variables.variables.length < 2) {
      if (actions.setError) {
        actions.setError('분석을 실행할 수 없습니다. 데이터와 변수를 확인해주세요.')
      }
      return
    }

    actions.startAnalysis?.()
    actions.setError('')

    try {
      // Extract variable names array
      const variableNames: string[] = Array.isArray(variables.variables)
        ? variables.variables
        : typeof variables.variables === 'string'
        ? [variables.variables]
        : []

      if (variableNames.length < 2) {
        throw new Error('최소 2개 이상의 변수를 선택해야 합니다.')
      }

      // Extract numeric data for selected variables
      const itemsMatrix: number[][] = []
      for (const row of uploadedData.data) {
        const rowData: number[] = []
        for (const varName of variableNames) {
          const value = row[varName]
          const numValue = typeof value === 'number' ? value : parseFloat(String(value))
          if (isNaN(numValue)) {
            throw new Error(`변수 "${varName}"에 숫자가 아닌 값이 포함되어 있습니다.`)
          }
          rowData.push(numValue)
        }
        itemsMatrix.push(rowData)
      }

      // Call pyodideStats.cronbachAlpha with numeric matrix
      const pyodideResult = await pyodide.cronbachAlpha(itemsMatrix)

      // Transform to ReliabilityResult format
      const result: ReliabilityResult = {
        cronbachAlpha: pyodideResult.alpha,
        standardizedAlpha: pyodideResult.alpha, // Same as cronbach's alpha for now
        itemCount: variableNames.length,
        sampleSize: uploadedData.data.length,
        itemStatistics: variableNames.map((varName: string, idx: number) => {
          // Calculate item statistics
          const values = uploadedData.data.map(row => {
            const val = row[varName]
            return typeof val === 'number' ? val : parseFloat(String(val))
          })
          const mean = values.reduce((a, b) => a + b, 0) / values.length
          const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
          const stdDev = Math.sqrt(variance)

          return {
            item: varName,
            mean,
            stdDev,
            correctedItemTotal: pyodideResult.itemTotalCorrelations?.[idx] ?? 0,
            alphaIfDeleted: pyodideResult.alpha // Placeholder - would need Python to calculate
          }
        }),
        interItemCorrelations: {
          mean: pyodideResult.itemTotalCorrelations
            ? pyodideResult.itemTotalCorrelations.reduce((a, b) => a + b, 0) / pyodideResult.itemTotalCorrelations.length
            : 0,
          min: pyodideResult.itemTotalCorrelations
            ? Math.min(...pyodideResult.itemTotalCorrelations)
            : 0,
          max: pyodideResult.itemTotalCorrelations
            ? Math.max(...pyodideResult.itemTotalCorrelations)
            : 0,
          variance: 0 // Placeholder
        },
        scaleStatistics: {
          mean: 0, // Placeholder
          variance: 0,
          stdDev: 0
        },
        assumptions: {
          missingValues: 0,
          itemsReverseCoded: [],
          reliabilityLevel:
            pyodideResult.alpha >= 0.9 ? 'excellent' :
            pyodideResult.alpha >= 0.8 ? 'good' :
            pyodideResult.alpha >= 0.7 ? 'acceptable' :
            pyodideResult.alpha >= 0.6 ? 'questionable' : 'poor'
        }
      }

      actions.completeAnalysis?.(result, 3)
    } catch (err) {
      console.error('신뢰도 분석 실패:', err)
      actions.setError(err instanceof Error ? err.message : '신뢰도 분석 중 오류가 발생했습니다.')
    }
  }

  const getAlphaInterpretation = (alpha: number) => {
    if (alpha >= 0.9) return { level: 'Excellent', color: 'bg-muted0', description: '우수한 신뢰도' }
    if (alpha >= 0.8) return { level: 'Good', color: 'bg-muted0', description: '양호한 신뢰도' }
    if (alpha >= 0.7) return { level: 'Acceptable', color: 'bg-muted0', description: '수용 가능한 신뢰도' }
    if (alpha >= 0.6) return { level: 'Questionable', color: 'bg-muted0', description: '의문스러운 신뢰도' }
    return { level: 'Poor', color: 'bg-muted0', description: '낮은 신뢰도' }
  }

  return (
    <StatisticsPageLayout
      title="신뢰도 분석"
      subtitle="Cronbach&apos;s Alpha Reliability Analysis"
      description="측정도구의 내적 일관성을 평가하는 신뢰도 분석"
      icon={<Activity className="w-6 h-6" />}
      steps={steps}
      currentStep={currentStep}
      onStepChange={actions.setCurrentStep}
      methodInfo={{
        formula: "α = (k/(k-1)) × (1 - (Σσᵢ²/σₜ²))",
        assumptions: [
          "항목들이 동일한 구성개념을 측정해야 함",
          "항목 간 상관관계가 존재해야 함",
          "일차원성 가정(단일 요인)"
        ],
        sampleSize: "최소 30개 이상의 사례 권장",
        usage: "설문지, 척도, 검사도구의 신뢰도 검증"
      }}
    >
      {/* Step 1: 방법론 소개 */}
      {currentStep === 0 && (
        <StepCard
          title="신뢰도 분석 소개"
          description="Cronbach&apos;s α를 이용한 내적 일관성 신뢰도 평가"
          icon={<Info className="w-5 h-5 text-blue-500" />}
        >
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    분석 목적
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    측정도구(설문지, 척도)의 내적 일관성을 평가하여 신뢰도를 검증합니다.
                  </p>
                  <ul className="text-sm space-y-1">
                    <li>• 항목 간 일관성 측정</li>
                    <li>• 척도의 신뢰도 평가</li>
                    <li>• 문항 개선 방향 제시</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    해석 기준
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>α ≥ 0.9</span>
                      <Badge className="bg-muted0">우수</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>α ≥ 0.8</span>
                      <Badge className="bg-muted0">양호</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>α ≥ 0.7</span>
                      <Badge className="bg-muted0">수용가능</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>α &lt; 0.7</span>
                      <Badge className="bg-muted0">개선필요</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>주의사항</AlertTitle>
              <AlertDescription>
                신뢰도 분석을 위해서는 최소 2개 이상의 측정 항목이 필요하며,
                모든 항목이 동일한 구성개념을 측정해야 합니다.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end">
              <Button onClick={() => actions.setCurrentStep?.(1)}>
                다음: 데이터 업로드
              </Button>
            </div>
          </div>
        </StepCard>
      )}

      {/* Step 2: 데이터 업로드 */}
      {currentStep === 1 && (
        <StepCard
          title="데이터 업로드"
          description="신뢰도 분석할 데이터 파일을 업로드하세요"
          icon={<FileSpreadsheet className="w-5 h-5 text-green-500" />}
        >
          <DataUploadStep
            onUploadComplete={handleDataUpload}
            currentStep={1}
            totalSteps={4}
          />

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => actions.setCurrentStep?.(0)}>
              이전
            </Button>
          </div>
        </StepCard>
      )}

      {/* Step 3: 변수 선택 */}
      {currentStep === 2 && uploadedData && (
        <StepCard
          title="변수 선택"
          description="신뢰도 분석할 항목들을 선택하세요"
          icon={<BarChart3 className="w-5 h-5 text-primary" />}
        >
          <VariableSelector
            methodId="reliability"
            data={uploadedData.data}
            onVariablesSelected={handleVariableSelection}
            onBack={() => actions.setCurrentStep?.(1)}
          />

          {/* 분석 옵션 */}
          {selectedVariables && selectedVariables.items && selectedVariables.items.length >= 2 && (
            <div className="mt-6 p-4 border rounded-lg">
              <h4 className="font-medium mb-3">분석 옵션</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">신뢰도 모델</Label>
                  <RadioGroup
                    value={analysisOptions.model}
                    onValueChange={(value: string) => {
                      if (value === 'alpha' || value === 'split-half' || value === 'parallel') {
                        setAnalysisOptions(prev => ({ ...prev, model: value }))
                      }
                    }}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="alpha" id="alpha" />
                      <Label htmlFor="alpha" className="text-sm">Cronbach&apos;s Alpha</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="split-half" id="split-half" />
                      <Label htmlFor="split-half" className="text-sm">반분법 (Split-half)</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label htmlFor="confidence" className="text-sm">신뢰구간 (%)</Label>
                  <Input
                    id="confidence"
                    type="number"
                    value={analysisOptions.confidence}
                    onChange={(e) => setAnalysisOptions(prev => ({
                      ...prev,
                      confidence: parseInt(e.target.value) || 95
                    }))}
                    min={90}
                    max={99}
                    className="mt-1 w-20"
                  />
                </div>
              </div>
            </div>
          )}
        </StepCard>
      )}

      {/* Step 4: 결과 */}
      {currentStep === 3 && analysisResult && (
        <div className="space-y-6">
          {/* 주요 결과 카드 */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {analysisResult.cronbachAlpha.toFixed(3)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Cronbach&apos;s α</p>
                  <Badge
                    className={`mt-2 ${getAlphaInterpretation(analysisResult.cronbachAlpha).color} text-white`}
                  >
                    {getAlphaInterpretation(analysisResult.cronbachAlpha).description}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-muted-foreground">
                    {analysisResult.itemCount}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">분석 항목 수</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-muted-foreground">
                    {analysisResult.sampleSize}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">표본 크기</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 상세 결과 */}
          <Tabs defaultValue="items" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="items">항목 통계</TabsTrigger>
              <TabsTrigger value="correlations">상관 분석</TabsTrigger>
              <TabsTrigger value="interpretation">해석 가이드</TabsTrigger>
            </TabsList>

            <TabsContent value="items">
              <Card>
                <CardHeader>
                  <CardTitle>항목별 통계량</CardTitle>
                  <CardDescription>각 항목이 전체 신뢰도에 미치는 영향</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border p-2 text-left">항목</th>
                          <th className="border p-2 text-right">평균</th>
                          <th className="border p-2 text-right">표준편차</th>
                          <th className="border p-2 text-right">항목-전체 상관</th>
                          <th className="border p-2 text-right">삭제 시 α</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysisResult.itemStatistics.map((item, index) => (
                          <tr key={index} className="hover:bg-muted/50">
                            <td className="border p-2 font-medium">{item.item}</td>
                            <td className="border p-2 text-right font-mono">{item.mean.toFixed(2)}</td>
                            <td className="border p-2 text-right font-mono">{item.stdDev.toFixed(2)}</td>
                            <td className="border p-2 text-right font-mono">{item.correctedItemTotal.toFixed(3)}</td>
                            <td className="border p-2 text-right font-mono">
                              <span className={item.alphaIfDeleted > analysisResult.cronbachAlpha ? 'text-muted-foreground' : 'text-muted-foreground'}>
                                {item.alphaIfDeleted.toFixed(3)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="correlations">
              <Card>
                <CardHeader>
                  <CardTitle>항목 간 상관관계</CardTitle>
                  <CardDescription>측정 항목들 간의 상관관계 통계</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>평균 상관계수:</span>
                        <span className="font-mono">{analysisResult.interItemCorrelations.mean.toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>최소 상관계수:</span>
                        <span className="font-mono">{analysisResult.interItemCorrelations.min.toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>최대 상관계수:</span>
                        <span className="font-mono">{analysisResult.interItemCorrelations.max.toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>상관계수 분산:</span>
                        <span className="font-mono">{analysisResult.interItemCorrelations.variance.toFixed(4)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="interpretation">
              <Card>
                <CardHeader>
                  <CardTitle>결과 해석 가이드</CardTitle>
                  <CardDescription>신뢰도 분석 결과의 해석 방법</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>전체 신뢰도 평가</AlertTitle>
                    <AlertDescription>
                      현재 척도의 Cronbach&apos;s α = {analysisResult.cronbachAlpha.toFixed(3)}로
                      {getAlphaInterpretation(analysisResult.cronbachAlpha).description} 수준입니다.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <h4 className="font-medium">개선 권장사항</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {analysisResult.itemStatistics.some(item => item.alphaIfDeleted > analysisResult.cronbachAlpha) && (
                        <li>• 삭제 시 α가 증가하는 항목들을 검토하여 제거를 고려하세요</li>
                      )}
                      {analysisResult.interItemCorrelations.mean < 0.3 && (
                        <li>• 항목 간 상관관계가 낮습니다. 구성개념의 일치성을 검토하세요</li>
                      )}
                      <li>• 항목-전체 상관이 0.3 미만인 항목들을 재검토하세요</li>
                      <li>• 표본 크기가 충분한지 확인하세요 (권장: n ≥ 30)</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => actions.setCurrentStep?.(2)}>
              이전: 변수 선택
            </Button>
            <div className="space-x-2">
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                결과 내보내기
              </Button>
              <Button onClick={() => actions.setCurrentStep?.(0)}>
                새로운 분석
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 로딩 상태 */}
      {isAnalyzing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-96">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <Activity className="w-8 h-8 animate-spin text-primary" />
                <div className="text-center">
                  <p className="font-medium">신뢰도 분석 중...</p>
                  <p className="text-sm text-muted-foreground">잠시만 기다려주세요</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 오류 표시 */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </StatisticsPageLayout>
  )
}