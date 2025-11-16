'use client'

/**
 * Mann-Kendall 추세 검정 페이지 - TwoPanelLayout
 *
 * 시계열 데이터의 단조 증가/감소 추세 검정
 * TwoPanelLayout으로 마이그레이션
 */

import { useCallback, useEffect, useMemo } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { MannKendallVariables } from '@/types/statistics'
import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  Home,
  ChartBar,
  Play,
  ChevronRight
} from 'lucide-react'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { useStatisticsPage, type UploadedData } from '@/hooks/use-statistics-page'
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import { extractRowValue } from '@/lib/utils/data-extraction'

interface MannKendallResult {
  trend: 'increasing' | 'decreasing' | 'no trend'
  h: boolean
  p: number
  z: number
  tau: number
  s: number
  var_s: number
  slope: number
  intercept: number
}

const STEPS = [
  { id: 1, label: '방법론 이해' },
  { id: 2, label: '데이터 업로드' },
  { id: 3, label: '변수 선택' },
  { id: 4, label: '결과 해석' }
]

export default function MannKendallPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('mann-kendall')
  }, [])

  const { state, actions } = useStatisticsPage<MannKendallResult, MannKendallVariables>({
    withUploadedData: true,
    withError: true,
    initialStep: 0
  })
  const { currentStep, uploadedData, selectedVariables, results, error, isAnalyzing } = state

  // Breadcrumbs
  const breadcrumbs = useMemo(() => [
    { label: '홈', href: '/' },
    { label: '비모수 통계', href: '/statistics#non-parametric' },
    { label: 'Mann-Kendall 추세 검정' }
  ], [])

  // Steps with completed state
  const stepsWithCompleted = useMemo(() => STEPS.map(step => ({
    ...step,
    completed: step.id === 1 ? currentStep > 0 :
              step.id === 2 ? !!uploadedData :
              step.id === 3 ? !!selectedVariables :
              step.id === 4 ? !!results : false
  })), [currentStep, uploadedData, selectedVariables, results])

  // Handler: Data upload
  const handleDataUpload = useCallback((file: File, data: Array<Record<string, unknown>>) => {
    const columns = data.length > 0 ? Object.keys(data[0]) : []
    if (actions.setUploadedData) {
      actions.setUploadedData({ data, fileName: file.name, columns })
    }
    actions.setCurrentStep(2)
  }, [actions])

  // Handler: Variable selection (single column)
  const handleDataSelect = useCallback((varName: string) => {
    const current = selectedVariables || { data: '' }
    const newData = current.data === varName ? '' : varName
    if (actions.setSelectedVariables) {
      actions.setSelectedVariables({ data: newData })
    }
  }, [selectedVariables, actions])

  // Helper: Get numeric columns
  const getNumericColumns = useCallback((data: UploadedData): string[] => {
    if (!data || data.data.length === 0) return []

    return data.columns.filter(col => {
      const firstNonNull = data.data.find(row => {
        const val = extractRowValue(row, col)
        return val !== null
      })
      if (!firstNonNull) return false
      const val = extractRowValue(firstNonNull, col)
      return typeof val === 'number'
    })
  }, [])

  // Analysis function
  const runAnalysis = useCallback(async (vars: MannKendallVariables) => {
    if (!uploadedData) {
      actions.setError('데이터를 먼저 업로드해주세요.')
      return
    }

    if (!vars.data) {
      actions.setError('시계열 변수를 선택해주세요.')
      return
    }

    actions.startAnalysis()

    try {
      const targetVariable = vars.data
      const data = uploadedData.data.map(row => {
        return extractRowValue(row, targetVariable)
      }).filter((v): v is number => v !== null)

      if (data.length < 4) {
        throw new Error('Mann-Kendall 검정은 최소 4개 이상의 유효한 데이터가 필요합니다.')
      }

      // PyodideCore Worker 1 호출
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      const result = await pyodideCore.callWorkerMethod<{
        trend: string
        tau: number
        zScore: number
        pValue: number
        senSlope: number
        intercept: number
        n: number
      }>(1, 'mann_kendall_test', { data })

      const typedResult: MannKendallResult = {
        trend: result.trend as 'increasing' | 'decreasing' | 'no trend',
        h: result.pValue < 0.05,
        p: result.pValue,
        z: result.zScore,
        tau: result.tau,
        s: 0, // Worker에서 반환하지 않으므로 0으로 설정
        var_s: 0, // Worker에서 반환하지 않으므로 0으로 설정
        slope: result.senSlope,
        intercept: result.intercept
      }

      actions.completeAnalysis(typedResult, 3)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.'
      actions.setError(errorMsg)
    }
  }, [uploadedData, actions])

  // Handler: Next step (Step 3 -> Analysis)
  const handleNextStep = useCallback(async () => {
    if (!selectedVariables?.data) {
      actions.setError('시계열 변수를 선택해주세요.')
      return
    }
    // Only here: step change + analysis
    await runAnalysis(selectedVariables)
  }, [selectedVariables, actions, runAnalysis])

  // Helper functions for trend display
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="w-4 h-4 text-muted-foreground" />
      case 'decreasing': return <TrendingDown className="w-4 h-4 text-muted-foreground" />
      case 'no trend': return <Minus className="w-4 h-4 text-gray-600" />
      default: return <Minus className="w-4 h-4 text-gray-600" />
    }
  }

  const getTrendLabel = (trend: string) => {
    switch (trend) {
      case 'increasing': return '증가 추세'
      case 'decreasing': return '감소 추세'
      case 'no trend': return '추세 없음'
      default: return '알 수 없음'
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing': return 'bg-muted text-muted-foreground border'
      case 'decreasing': return 'bg-muted text-muted-foreground border'
      case 'no trend': return 'bg-gray-50 text-gray-700 border-gray-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  // Render: Step 1 - Method Introduction
  const renderMethodIntroduction = useCallback(() => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Mann-Kendall 추세 검정</h2>
        <p className="text-sm text-muted-foreground">
          시계열 데이터의 단조 증가/감소 추세를 검정하는 비모수적 방법
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <CardTitle>언제 사용하나요?</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• 시계열 데이터의 증가/감소 추세 확인</li>
              <li>• 기후 데이터, 수질 모니터링 분석</li>
              <li>• 경제 지표의 장기 추세 분석</li>
              <li>• 정규분포를 따르지 않는 시계열 데이터</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <CardTitle>장점</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• 정규분포 가정 불필요 (비모수적)</li>
              <li>• 이상치에 강건함</li>
              <li>• Sen&apos;s slope로 추세 크기 정량화</li>
              <li>• 다양한 수정 방법 제공</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>검정 공식</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-muted/50 p-4 rounded-lg font-mono text-sm">
            S = Σ sgn(x<sub>j</sub> - x<sub>i</sub>), τ = S / [n(n-1)/2]
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• <strong>S</strong>: Kendall 통계량</p>
            <p>• <strong>τ (Tau)</strong>: 상관계수 (-1 ~ 1)</p>
            <p>• <strong>n</strong>: 관측값 개수</p>
          </div>
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>최소 표본 크기</AlertTitle>
        <AlertDescription>
          최소 4개의 관측값이 필요하며, 더 정확한 결과를 위해서는 10개 이상의 관측값을 권장합니다.
        </AlertDescription>
      </Alert>

      <div className="flex justify-end">
        <Button onClick={() => actions.setCurrentStep(1)} size="lg">
          다음 단계: 데이터 업로드
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  ), [actions])

  // Render: Step 2 - Data Upload
  const renderDataUpload = useCallback(() => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">데이터 업로드</h2>
        <p className="text-sm text-muted-foreground">
          시계열 데이터를 업로드하세요 (CSV, Excel 등)
        </p>
      </div>

      <DataUploadStep
        onUploadComplete={handleDataUpload}
        onNext={() => actions.setCurrentStep(2)}
        canGoNext={!!uploadedData}
      />
    </div>
  ), [handleDataUpload, actions, uploadedData])

  // Render: Step 3 - Variable Selection
  const renderVariableSelection = useCallback(() => {
    if (!uploadedData) {
      return (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>데이터 없음</AlertTitle>
          <AlertDescription>데이터를 먼저 업로드해주세요.</AlertDescription>
        </Alert>
      )
    }

    const numericColumns = getNumericColumns(uploadedData)

    if (numericColumns.length === 0) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>숫자형 변수 없음</AlertTitle>
          <AlertDescription>
            업로드된 데이터에 숫자형 변수가 없습니다. 숫자형 데이터를 포함한 파일을 업로드해주세요.
          </AlertDescription>
        </Alert>
      )
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">변수 선택</h2>
          <p className="text-sm text-muted-foreground">
            시간 순서대로 측정된 연속형 변수를 선택하세요
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>시계열 변수 (단일 선택)</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              추세를 검정할 시계열 데이터를 선택하세요
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label className="text-base font-semibold">숫자형 변수</Label>
              <div className="flex flex-wrap gap-2">
                {numericColumns.map((header: string) => (
                  <Badge
                    key={header}
                    variant={selectedVariables?.data === header ? 'default' : 'outline'}
                    className="cursor-pointer max-w-[200px] truncate"
                    title={header}
                    onClick={() => handleDataSelect(header)}
                  >
                    {header}
                    {selectedVariables?.data === header && (
                      <CheckCircle className="ml-1 h-3 w-3 flex-shrink-0" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 에러 메시지 */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 분석하기 버튼 */}
        <div className="flex gap-3">
          <Button
            onClick={handleNextStep}
            disabled={isAnalyzing || !selectedVariables?.data}
            size="lg"
            className="flex-1 md:flex-none md:w-auto shadow-lg"
          >
            {isAnalyzing ? '분석 중...' : results ? '다시 분석하기' : '분석하기'}
            <Play className="ml-2 h-4 w-4" />
          </Button>

          {/* 이미 결과가 있으면 "결과 보기" 버튼 표시 */}
          {results && !isAnalyzing && (
            <Button
              onClick={() => actions.setCurrentStep(3)}
              variant="outline"
              size="lg"
              className="flex-1 md:flex-none md:w-auto"
            >
              결과 보기
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    )
  }, [uploadedData, selectedVariables, error, isAnalyzing, results, getNumericColumns, handleDataSelect, handleNextStep, actions])

  // Render: Step 4 - Results
  const renderResults = useCallback(() => {
    if (!results) {
      return (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>결과 없음</AlertTitle>
          <AlertDescription>
            분석 결과가 없습니다. 변수를 선택하고 분석을 실행해주세요.
          </AlertDescription>
        </Alert>
      )
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">분석 완료</h2>
          <p className="text-sm text-muted-foreground">
            Mann-Kendall 추세 검정 결과를 확인하세요
          </p>
        </div>

        {/* 주요 결과 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">추세 결과</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {getTrendIcon(results.trend)}
                <div>
                  <div className="text-lg font-semibold">{getTrendLabel(results.trend)}</div>
                  <Badge className={getTrendColor(results.trend)}>
                    {results.h ? '유의함' : '유의하지 않음'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">p-value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {results.p < 0.001 ? '< 0.001' : results.p.toFixed(4)}
              </div>
              <div className="text-sm text-muted-foreground">
                {results.p < 0.05 ? '통계적으로 유의함' : '통계적으로 유의하지 않음'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Sen&apos;s Slope</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {results.slope.toFixed(6)}
              </div>
              <div className="text-sm text-muted-foreground">
                단위 시간당 변화량
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 상세 결과 탭 */}
        <Tabs defaultValue="statistics" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="statistics">통계량</TabsTrigger>
            <TabsTrigger value="interpretation">해석</TabsTrigger>
            <TabsTrigger value="assumptions">가정</TabsTrigger>
            <TabsTrigger value="visualization">시각화</TabsTrigger>
          </TabsList>

          <TabsContent value="statistics">
            <Card>
              <CardHeader>
                <CardTitle>Mann-Kendall 통계량</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">검정통계량 (Z)</span>
                      <span className="font-mono">{results.z.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Kendall&apos;s Tau</span>
                      <span className="font-mono">{results.tau.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">S 통계량</span>
                      <span className="font-mono">{results.s.toFixed(0)}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">분산 (Var(S))</span>
                      <span className="font-mono">{results.var_s.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">절편</span>
                      <span className="font-mono">{results.intercept.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">p-value</span>
                      <span className="font-mono">{results.p < 0.001 ? '< 0.001' : results.p.toFixed(6)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="interpretation">
            <Card>
              <CardHeader>
                <CardTitle>결과 해석</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-semibold">추세 해석</h4>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    {results.trend === 'increasing' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-muted-foreground">증가 추세 감지</span>
                        </div>
                        <p className="text-sm">
                          시계열 데이터에서 통계적으로 유의한 증가 추세가 발견되었습니다.
                          Sen&apos;s slope ({results.slope.toFixed(6)})는 단위 시간당 평균 증가량을 나타냅니다.
                        </p>
                      </div>
                    )}
                    {results.trend === 'decreasing' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <TrendingDown className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-muted-foreground">감소 추세 감지</span>
                        </div>
                        <p className="text-sm">
                          시계열 데이터에서 통계적으로 유의한 감소 추세가 발견되었습니다.
                          Sen&apos;s slope ({results.slope.toFixed(6)})는 단위 시간당 평균 감소량을 나타냅니다.
                        </p>
                      </div>
                    )}
                    {results.trend === 'no trend' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Minus className="w-4 h-4 text-gray-600" />
                          <span className="font-medium text-gray-700">추세 없음</span>
                        </div>
                        <p className="text-sm">
                          시계열 데이터에서 통계적으로 유의한 추세가 발견되지 않았습니다.
                          데이터는 시간에 따라 일정한 패턴을 보이지 않습니다.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">통계적 유의성</h4>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm">
                      p-value = {results.p < 0.001 ? '< 0.001' : results.p.toFixed(6)}
                      {results.p < 0.01 && ', 매우 강한 증거'}
                      {results.p >= 0.01 && results.p < 0.05 && ', 중간 정도의 증거'}
                      {results.p >= 0.05 && ', 약한 증거 또는 증거 없음'}
                    </p>
                    <p className="text-sm mt-2">
                      Kendall&apos;s Tau = {results.tau.toFixed(4)}
                      (상관의 강도: {Math.abs(results.tau) < 0.3 ? '약함' : Math.abs(results.tau) < 0.7 ? '중간' : '강함'})
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assumptions">
            <Card>
              <CardHeader>
                <CardTitle>Mann-Kendall 검정 가정</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <h4 className="font-semibold">비모수적 방법</h4>
                      <p className="text-sm text-muted-foreground">
                        정규분포 가정이 불필요하여 다양한 분포의 데이터에 적용 가능합니다.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <h4 className="font-semibold">독립성 가정</h4>
                      <p className="text-sm text-muted-foreground">
                        관측값들이 상호 독립적이어야 합니다. 자기상관이 있는 경우
                        Hamed-Rao 또는 Pre-whitening 수정 방법을 사용하세요.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <h4 className="font-semibold">최소 표본 크기</h4>
                      <p className="text-sm text-muted-foreground">
                        최소 4개의 관측값이 필요하며, 더 정확한 결과를 위해서는
                        10개 이상의 관측값을 권장합니다.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Activity className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <h4 className="font-semibold">단조성 가정</h4>
                      <p className="text-sm text-muted-foreground">
                        이 검정은 단조 증가 또는 단조 감소 추세만 감지할 수 있으며,
                        계절성이나 주기적 패턴은 감지하지 못합니다.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="visualization">
            <Card>
              <CardHeader>
                <CardTitle>시각화 가이드</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>추천 시각화</AlertTitle>
                    <AlertDescription>
                      시계열 플롯과 Sen&apos;s slope 추세선을 함께 표시하여 결과를 시각적으로 확인하세요.
                    </AlertDescription>
                  </Alert>

                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">해석 가이드</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• 추세선의 기울기 = Sen&apos;s slope ({results.slope.toFixed(6)})</li>
                      <li>• 추세선이 위로 향하면 증가 추세, 아래로 향하면 감소 추세</li>
                      <li>• p-value가 0.05 미만이면 추세가 통계적으로 유의함</li>
                      <li>• Kendall&apos;s Tau는 추세의 강도를 나타냄 (-1 ~ 1)</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    )
  }, [results])

  // Type annotation for onStepChange
  const handleStepChange = useCallback((step: number) => {
    actions.setCurrentStep(step)
  }, [actions])

  return (
    <TwoPanelLayout
      currentStep={currentStep}
      steps={stepsWithCompleted}
      onStepChange={handleStepChange}
      analysisTitle="Mann-Kendall 추세 검정"
      analysisSubtitle="Trend Test"
      analysisIcon={<TrendingUp className="h-5 w-5 text-primary" />}
      breadcrumbs={breadcrumbs}
      bottomPreview={uploadedData && currentStep >= 2 ? {
        data: uploadedData.data,
        fileName: uploadedData.fileName,
        maxRows: 10
      } : undefined}
    >
      {currentStep === 0 && renderMethodIntroduction()}
      {currentStep === 1 && renderDataUpload()}
      {currentStep === 2 && renderVariableSelection()}
      {currentStep === 3 && renderResults()}
    </TwoPanelLayout>
  )
}
