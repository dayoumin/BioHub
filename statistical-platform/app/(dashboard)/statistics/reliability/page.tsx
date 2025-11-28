'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
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
import { ContentTabs, ContentTabsContent } from '@/components/ui/content-tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Activity,
  BarChart3,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Calculator,
  TrendingUp,
  FileSpreadsheet,
  Download
,
  List,
  Network,
  MessageSquare
} from 'lucide-react'

// Components
import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import type { Step as TwoPanelStep } from '@/components/statistics/layouts/TwoPanelLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'

// Services & Types
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { ResultContextHeader } from '@/components/statistics/common/ResultContextHeader'
import type { UploadedData } from '@/hooks/use-statistics-page'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'

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
  const [analysisTimestamp, setAnalysisTimestamp] = useState<Date | null>(null)
  const [activeResultTab, setActiveResultTab] = useState('items')
  const [analysisOptions, setAnalysisOptions] = useState({
    model: 'alpha' as 'alpha' | 'split-half' | 'parallel',
    scaleIfDeleted: true,
    itemStatistics: true,
    interItemCorr: true,
    confidence: 95
  })

  // Pyodide ready state
  const [pyodideReady, setPyodideReady] = useState(false)

  // Initialize Pyodide
  useEffect(() => {
    const initPyodide = async () => {
      try {
        const pyodideCore = PyodideCoreService.getInstance()
        await pyodideCore.initialize()
        setPyodideReady(true)
      } catch (err) {
        console.error('PyodideCore 초기화 실패:', err)
        actions.setError?.('통계 엔진을 초기화할 수 없습니다.')
      }
    }
    initPyodide()
  }, [])

  // Breadcrumbs
  const breadcrumbs = useMemo(() => [
    { label: '홈', href: '/' },
    { label: '통계 분석', href: '/statistics' },
    { label: '신뢰도 분석', href: '/statistics/reliability' }
  ], [])

  // Steps configuration (0-based indexing)
  const STEPS: TwoPanelStep[] = useMemo(() => [
    {
      id: 0,
      label: '방법 소개',
      completed: currentStep > 0
    },
    {
      id: 1,
      label: '데이터 업로드',
      completed: currentStep > 1
    },
    {
      id: 2,
      label: '변수 선택',
      completed: currentStep > 2
    },
    {
      id: 3,
      label: '결과 해석',
      completed: currentStep > 3
    }
  ], [currentStep])

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

  // Badge-based 변수 선택 핸들러
  const handleItemSelect = useCallback((varName: string) => {
    const current = selectedVariables?.items ?? []
    const newItems = current.includes(varName)
      ? current.filter(v => v !== varName)
      : [...current, varName]

    actions.setSelectedVariables?.({ items: newItems })
    // ❌ NO setCurrentStep here - Critical Bug 예방!
  }, [selectedVariables, actions])

  const runAnalysis = useCallback(async (variables: VariableAssignment) => {
    if (!uploadedData || !pyodideReady || !variables.variables || variables.variables.length < 2) {
      if (actions.setError) {
        actions.setError('분석을 실행할 수 없습니다. 데이터와 변수를 확인해주세요.')
      }
      return
    }

    actions.startAnalysis?.()
    actions.setError('')

    try {
      const pyodideCore = PyodideCoreService.getInstance()

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

      // Call Worker 1 cronbach_alpha method
      const pyodideResult = await pyodideCore.callWorkerMethod<{
        alpha: number
        itemTotalCorrelations?: number[]
      }>(PyodideWorker.Descriptive, 'cronbach_alpha', { items_matrix: itemsMatrix })

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

      setAnalysisTimestamp(new Date())
      actions.completeAnalysis?.(result, 3)
    } catch (err) {
      console.error('신뢰도 분석 실패:', err)
      actions.setError(err instanceof Error ? err.message : '신뢰도 분석 중 오류가 발생했습니다.')
    }
  }, [uploadedData, pyodideReady, actions])

  // "다음 단계" 버튼 핸들러 (setCurrentStep + runAnalysis)
  const handleNextStep = useCallback(async () => {
    if (!selectedVariables?.items || selectedVariables.items.length < 2) {
      actions.setError?.('최소 2개 이상의 항목을 선택해주세요.')
      return
    }

    actions.setCurrentStep?.(3)
    await runAnalysis({ variables: selectedVariables.items })
  }, [selectedVariables, actions, runAnalysis])

  const getAlphaInterpretation = (alpha: number) => {
    if (alpha >= 0.9) return { level: 'Excellent', color: 'bg-muted0', description: '우수한 신뢰도' }
    if (alpha >= 0.8) return { level: 'Good', color: 'bg-muted0', description: '양호한 신뢰도' }
    if (alpha >= 0.7) return { level: 'Acceptable', color: 'bg-muted0', description: '수용 가능한 신뢰도' }
    if (alpha >= 0.6) return { level: 'Questionable', color: 'bg-muted0', description: '의문스러운 신뢰도' }
    return { level: 'Poor', color: 'bg-muted0', description: '낮은 신뢰도' }
  }

  // Render functions (useCallback)
  const renderMethodIntroduction = useCallback(() => (
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
  ), [actions])

  const renderDataUpload = useCallback(() => (
    <div className="space-y-4">
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
    </div>
  ), [handleDataUpload, actions])

  const renderVariableSelection = useCallback(() => {
    if (!uploadedData) return null

    return (
      <div className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>변수 선택 안내</AlertTitle>
          <AlertDescription>
            신뢰도 분석할 항목들을 선택하세요 (최소 2개 이상).
            모든 항목은 동일한 구성개념을 측정해야 합니다.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>분석 항목 선택 (2개 이상)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {uploadedData.columns.map(column => (
                <Badge
                  key={column}
                  variant={selectedVariables?.items?.includes(column) ? "default" : "outline"}
                  className="cursor-pointer px-3 py-2"
                  onClick={() => handleItemSelect(column)}
                >
                  {selectedVariables?.items?.includes(column) && (
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                  )}
                  {column}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 분석 옵션 */}
        {selectedVariables && selectedVariables.items && selectedVariables.items.length >= 2 && (
          <div className="p-4 border rounded-lg">
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

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => actions.setCurrentStep?.(1)}>
            이전
          </Button>
          <Button
            onClick={handleNextStep}
            disabled={!selectedVariables?.items || selectedVariables.items.length < 2}
          >
            다음 단계: 분석 실행
          </Button>
        </div>
      </div>
    )
  }, [uploadedData, selectedVariables, handleItemSelect, analysisOptions, handleNextStep, actions])

  const renderResults = useCallback(() => {
    if (!analysisResult) return null

    return (
        <div className="space-y-6">
          <ResultContextHeader
            analysisType="신뢰도 분석"
            analysisSubtitle="Reliability Analysis"
            fileName={uploadedData?.fileName}
            variables={selectedVariables?.items || []}
            sampleSize={uploadedData?.data?.length}
            timestamp={analysisTimestamp ?? undefined}
          />
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
          <ContentTabs
              tabs={[
                { id: 'items', label: '항목 통계', icon: List },
                { id: 'correlations', label: '상관 분석', icon: Network },
                { id: 'interpretation', label: '해석 가이드', icon: MessageSquare }
              ]}
              activeTab={activeResultTab}
              onTabChange={setActiveResultTab}
              className="mb-4"
            />
            <div className="space-y-4">
            

            <ContentTabsContent tabId="items" show={activeResultTab === 'items'}>
              <Card>
                <CardHeader>
                  <CardTitle>항목별 통계량</CardTitle>
                  <CardDescription>각 항목이 전체 신뢰도에 미치는 영향</CardDescription>
                </CardHeader>
                <CardContent>
                  <StatisticsTable
                    title="항목별 통계량"
                    columns={[
                      { key: 'item', header: '항목', type: 'text', align: 'left' },
                      { key: 'mean', header: '평균', type: 'number', align: 'right', formatter: (v: number) => v.toFixed(2) },
                      { key: 'stdDev', header: '표준편차', type: 'number', align: 'right', formatter: (v: number) => v.toFixed(2) },
                      { key: 'correctedItemTotal', header: '항목-전체 상관', type: 'number', align: 'right', formatter: (v: number) => v.toFixed(3) },
                      { key: 'alphaIfDeleted', header: '삭제 시 α', type: 'custom', align: 'right', formatter: (v) => v }
                    ] as const}
                    data={analysisResult.itemStatistics.map((item, index) => ({
                      item: item.item,
                      mean: item.mean,
                      stdDev: item.stdDev,
                      correctedItemTotal: item.correctedItemTotal,
                      alphaIfDeleted: (
                        <span className={item.alphaIfDeleted > analysisResult.cronbachAlpha ? 'text-muted-foreground' : 'text-muted-foreground'}>
                          {item.alphaIfDeleted.toFixed(3)}
                        </span>
                      )
                    }))}
                    bordered
                    compactMode
                  />
                </CardContent>
              </Card>
            </ContentTabsContent>

            <ContentTabsContent tabId="correlations" show={activeResultTab === 'correlations'}>
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
            </ContentTabsContent>

            <ContentTabsContent tabId="interpretation" show={activeResultTab === 'interpretation'}>
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
            </ContentTabsContent>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => actions.setCurrentStep?.(2)}>
              이전: 변수 선택
            </Button>
            <div className="space-x-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" disabled>
                    <Download className="w-4 h-4 mr-2" />
                    결과 내보내기
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>향후 제공 예정입니다</p>
                </TooltipContent>
              </Tooltip>
              <Button onClick={() => actions.setCurrentStep?.(0)}>
                새로운 분석
              </Button>
            </div>
          </div>
        </div>
    )
  }, [analysisResult, actions, uploadedData, selectedVariables, analysisTimestamp])

  return (
    <TwoPanelLayout
      analysisTitle="신뢰도 분석"
      analysisSubtitle="Cronbach's Alpha Reliability Analysis"
      breadcrumbs={breadcrumbs}
      currentStep={currentStep}
      steps={STEPS}
      onStepChange={(step: number) => actions.setCurrentStep?.(step)}
      bottomPreview={uploadedData && currentStep >= 1 ? {
        data: uploadedData.data,
        fileName: uploadedData.fileName,
        maxRows: 5
      } : undefined}
    >
      {/* Step 0: 방법 소개 */}
      {currentStep === 0 && renderMethodIntroduction()}

      {/* Step 1: 데이터 업로드 */}
      {currentStep === 1 && renderDataUpload()}

      {/* Step 2: 변수 선택 */}
      {currentStep === 2 && renderVariableSelection()}

      {/* Step 3: 결과 */}
      {currentStep === 3 && renderResults()}

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
    </TwoPanelLayout>
  )
}