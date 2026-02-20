'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { FactorAnalysisVariables } from '@/types/statistics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ContentTabs, ContentTabsContent } from '@/components/ui/content-tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle2, XCircle, Target, BarChart3, Activity, Zap, TrendingUp, Info ,
  Grid3X3,
  Layers,
  MessageSquare
} from 'lucide-react'

// Components
import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import type { Step as TwoPanelStep } from '@/components/statistics/layouts/TwoPanelLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { PValueBadge } from '@/components/statistics/common/PValueBadge'
import { ResultInterpretation } from '@/components/statistics/common/ResultInterpretation'

// Services & Hooks
import { useStatisticsPage, type UploadedData } from '@/hooks/use-statistics-page'
import { ResultContextHeader } from '@/components/statistics/common/ResultContextHeader'
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import { AnalysisGuidePanel } from '@/components/statistics/common/AnalysisGuidePanel'
import { AssumptionChecklist } from '@/components/statistics/common/AssumptionChecklist'
import { useAnalysisGuide } from '@/hooks/use-analysis-guide'

// 요인분석 결과 인터페이스
interface FactorAnalysisResult {
  method: 'exploratory' | 'confirmatory'
  numFactors: number
  extraction: 'principal' | 'maximum_likelihood' | 'principal_axis'
  rotation: 'none' | 'varimax' | 'promax' | 'oblimin'
  factorLoadings: number[][]
  communalities: number[]
  eigenvalues: number[]
  varianceExplained: {
    total: number[]
    cumulative: number[]
    percentage: number[]
  }
  factorScores?: number[][]
  rotatedLoadings?: number[][]
  kmo: number
  bartlettTest: {
    statistic: number
    pValue: number
    significant: boolean
  }
  adequacySampling: boolean
  factorNames: string[]
  variableNames: string[]
  goodnessOfFit?: {
    chisq: number
    df: number
    pValue: number
    rmsea: number
    cfi: number
    tli: number
  }
}

export default function FactorAnalysisPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('factor-analysis')
  }, [])

  // Use statistics page hook
  const { state, actions } = useStatisticsPage<FactorAnalysisResult, FactorAnalysisVariables>({
    withUploadedData: true,
    withError: true
  })

  // Analysis Guide Hook
  const { methodMetadata, assumptionItems } = useAnalysisGuide({
    methodId: 'factor-analysis'
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state

  // Page-specific state
  const [analysisType, setAnalysisType] = useState<'exploratory' | 'confirmatory'>('exploratory')
  const [extractionMethod, setExtractionMethod] = useState<'principal' | 'maximum_likelihood' | 'principal_axis'>('principal')
  const [rotationMethod, setRotationMethod] = useState<'none' | 'varimax' | 'promax' | 'oblimin'>('varimax')
  const [numFactors, setNumFactors] = useState<number>(0)
  const [autoFactorSelection, setAutoFactorSelection] = useState<boolean>(true)
  const [analysisTimestamp, setAnalysisTimestamp] = useState<Date | null>(null)
  const [activeResultTab, setActiveResultTab] = useState('loadings')

  // Breadcrumbs
  const breadcrumbs = useMemo(() => [
    { label: '홈', href: '/' },
    { label: '통계 분석', href: '/statistics' },
    { label: '요인분석', href: '/statistics/factor-analysis' }
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
      label: '옵션 설정',
      completed: currentStep > 3
    },
    {
      id: 4,
      label: '결과 해석',
      completed: currentStep > 4
    }
  ], [currentStep])
  const [minEigenvalue, setMinEigenvalue] = useState<number>(1.0)

  // 데이터 업로드 핸들러
  const handleDataUpload = useCallback((file: File, data: unknown[]) => {
    if (!actions.setUploadedData || !actions.setCurrentStep || !actions.setError) {
      console.error('Actions are not available')
      return
    }

    if (!Array.isArray(data) || data.length === 0) {
      actions.setError('유효한 데이터가 없습니다.')
      return
    }

    const firstRow = data[0] as Record<string, unknown>
    const columns = Object.keys(firstRow).filter(key => {
      const value = firstRow[key]
      return typeof value === 'number' || !isNaN(parseFloat(String(value)))
    })

    if (columns.length < 3) {
      actions.setError('요인분석을 위해서는 최소 3개 이상의 숫자형 변수가 필요합니다.')
      return
    }

    const uploadedDataObj = {
      fileName: file.name,
      data: data as Record<string, unknown>[],
      columns
    }

    actions.setUploadedData?.(uploadedDataObj)
    actions.setCurrentStep(2)
    actions.setError?.('')
  }, [actions])

  // Badge-based 변수 선택 핸들러
  const handleItemSelect = useCallback((varName: string) => {
    const current = selectedVariables?.dependent ?? []
    const newItems = current.includes(varName)
      ? current.filter(v => v !== varName)
      : [...current, varName]

    actions.setSelectedVariables?.({ dependent: newItems })
    // ❌ NO setCurrentStep here - Critical Bug 예방!
  }, [selectedVariables, actions])

  // 요인분석 실행
  const handleRunAnalysis = useCallback(async () => {
    if (!uploadedData?.data.length || !(selectedVariables?.dependent ?? []).length) {
      actions.setError?.('데이터와 변수를 선택해주세요.')
      return
    }

    if ((selectedVariables?.dependent ?? []).length < 3) {
      actions.setError?.('요인분석을 위해서는 최소 3개 이상의 변수가 필요합니다.')
      return
    }

    if (analysisType === 'confirmatory') {
      actions.setError?.('확인적 요인분석(CFA)은 추후 구현 예정입니다.')
      return
    }

    actions.startAnalysis?.()

    try {
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      // Extract numeric data matrix
      const numericData = uploadedData.data.map(row =>
        (selectedVariables?.dependent ?? []).map(v => {
          const value = (row as Record<string, unknown>)[v]
          return typeof value === 'number' ? value : parseFloat(String(value)) || 0
        })
      ).filter(row => row.every(val => !isNaN(val)))

      if (numericData.length === 0) {
        actions.setError?.('유효한 숫자 데이터가 없습니다.')
        return
      }

      // Determine number of factors
      let finalNumFactors = numFactors
      if (autoFactorSelection) {
        // Automatic factor selection based on variable count (eigenvalue-based selection handled by Python)
        finalNumFactors = Math.max(2, Math.min(5, Math.floor((selectedVariables?.dependent ?? []).length / 2)))
      }

      // Call Worker 4 factor_analysis_method
      const result = await pyodideCore.callWorkerMethod<FactorAnalysisResult>(
        PyodideWorker.RegressionAdvanced,
        'factor_analysis_method',
        {
          data: numericData,
          n_factors: finalNumFactors,
          rotation: rotationMethod,
          extraction: extractionMethod
        }
      )

      actions.completeAnalysis?.(result, 3)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.'
      console.error('[factor-analysis] Analysis error:', errorMessage)
      actions.setError?.(errorMessage)
    }
  }, [uploadedData, selectedVariables, analysisType, numFactors, autoFactorSelection, rotationMethod, extractionMethod, actions])

  // 방법 소개 (Step 0)
  const renderMethodIntroduction = useCallback(() => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            요인분석이란?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            다수의 관찰된 변수들 간의 상관관계를 분석하여 이들을 설명하는 소수의 잠재 요인을 찾는 다변량 통계기법입니다.
          </p>
          <ul className="text-sm space-y-1">
            <li>• 설문조사 데이터의 차원 축소</li>
            <li>• 심리학 연구에서 잠재 구조 발견</li>
            <li>• 마케팅 세분화</li>
          </ul>
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>주요 가정</AlertTitle>
        <AlertDescription className="space-y-1">
          <div>• 변수들 간의 선형 관계</div>
          <div>• 연속형 변수 (정규분포 권장)</div>
          <div>• 충분한 표본 크기 (변수 수의 3-5배)</div>
          <div>• 변수들 간의 상관관계 존재</div>
        </AlertDescription>
      </Alert>

      
      {methodMetadata && (
        <AnalysisGuidePanel
          method={methodMetadata}
          sections={['variables', 'assumptions']}
          defaultExpanded={['variables']}
        />
      )}

      {assumptionItems.length > 0 && (
        <AssumptionChecklist
          assumptions={assumptionItems}
          showProgress={true}
          collapsible={true}
          title="Analysis Assumptions"
          description="Factor Analysis assumptions to verify before analysis."
        />
      )}

      <div className="flex justify-end">
        <Button onClick={() => actions.setCurrentStep?.(1)}>
          다음: 데이터 업로드
        </Button>
      </div>
    </div>
  ), [actions, methodMetadata, assumptionItems])

  // 변수 선택 페이지 (Step 2)
  const variableSelectionStep = useMemo(() => (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>변수 선택 안내</AlertTitle>
        <AlertDescription>
          요인분석에 사용할 연속형 변수들을 선택해주세요 (최소 3개 이상). 표본 수는 변수 수의 3-5배 이상 권장됩니다.
        </AlertDescription>
      </Alert>

      {uploadedData && uploadedData.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>분석 변수 선택 (3개 이상)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {uploadedData.columns.map((column) => (
                <Badge
                  key={column}
                  variant={(selectedVariables?.dependent ?? []).includes(column) ? "default" : "outline"}
                  className="cursor-pointer px-3 py-2"
                  onClick={() => handleItemSelect(column)}
                >
                  {(selectedVariables?.dependent ?? []).includes(column) && (
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                  )}
                  {column}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <div>
          <Label htmlFor="analysisType" className="text-base font-medium">분석 유형</Label>
          <Select value={analysisType} onValueChange={(value: 'exploratory' | 'confirmatory') => setAnalysisType(value)}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="exploratory">탐색적 요인분석 (EFA)</SelectItem>
              <SelectItem value="confirmatory">확인적 요인분석 (CFA)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="extraction" className="text-base font-medium">요인 추출 방법</Label>
          <Select value={extractionMethod} onValueChange={(value: 'principal' | 'maximum_likelihood' | 'principal_axis') => setExtractionMethod(value)}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="principal">주성분 분석</SelectItem>
              <SelectItem value="maximum_likelihood">최대우도법</SelectItem>
              <SelectItem value="principal_axis">주축 분해법</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="rotation" className="text-base font-medium">요인 회전 방법</Label>
          <Select value={rotationMethod} onValueChange={(value: 'none' | 'varimax' | 'promax' | 'oblimin') => setRotationMethod(value)}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">회전 없음</SelectItem>
              <SelectItem value="varimax">Varimax (직교회전)</SelectItem>
              <SelectItem value="promax">Promax (사각회전)</SelectItem>
              <SelectItem value="oblimin">Oblimin (사각회전)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="autoFactor"
            checked={autoFactorSelection}
            onChange={(e) => setAutoFactorSelection(e.target.checked)}
            className="rounded border-gray-300"
          />
          <Label htmlFor="autoFactor" className="text-sm font-medium">
            요인 수 자동 결정 (고유값 ≥ 1.0 기준)
          </Label>
        </div>

        {!autoFactorSelection && (
          <div>
            <Label htmlFor="numFactors" className="text-base font-medium">요인 수</Label>
            <Input
              id="numFactors"
              type="number"
              min="1"
              max={Math.floor((selectedVariables?.dependent ?? []).length / 2)}
              value={numFactors}
              onChange={(e) => setNumFactors(parseInt(e.target.value) || 1)}
              className="mt-2"
            />
          </div>
        )}

        {autoFactorSelection && (
          <div>
            <Label htmlFor="minEigenvalue" className="text-base font-medium">최소 고유값</Label>
            <Input
              id="minEigenvalue"
              type="number"
              min="0.1"
              max="3.0"
              step="0.1"
              value={minEigenvalue}
              onChange={(e) => setMinEigenvalue(parseFloat(e.target.value) || 1.0)}
              className="mt-2"
            />
          </div>
        )}
      </div>

      {(selectedVariables?.dependent ?? []).length > 0 && uploadedData && uploadedData.data.length > 0 && (
        <div className="p-4 bg-muted rounded-lg">
          <div className="text-sm space-y-1">
            <p><strong>선택된 변수:</strong> {(selectedVariables?.dependent ?? []).length}개</p>
            <p><strong>표본 크기:</strong> {uploadedData.data.length}개</p>
            <p><strong>권장 최소 표본:</strong> {(selectedVariables?.dependent ?? []).length * 3}개</p>
            <p><strong>표본 적절성:</strong> {uploadedData.data.length >= (selectedVariables?.dependent ?? []).length * 3 ? '✅ 적절' : '⚠️ 부족'}</p>
          </div>
        </div>
      )}

      {error && (
        <Alert>
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => actions.setCurrentStep(2)}>
          이전
        </Button>
        <Button
          onClick={handleRunAnalysis}
          disabled={(selectedVariables?.dependent ?? []).length < 3 || isAnalyzing || analysisType === 'confirmatory'}
        >
          {isAnalyzing ? '분석 중...' : '요인분석 실행'}
        </Button>
      </div>
    </div>
  ), [uploadedData, selectedVariables, analysisType, extractionMethod, rotationMethod, autoFactorSelection, numFactors, minEigenvalue, error, isAnalyzing, handleRunAnalysis, handleItemSelect, actions])

  // 결과 해석 페이지
  const resultsStep = useMemo(() => {
    if (!results) return null

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">요인분석 결과</h3>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              {results.method === 'exploratory' ? '탐색적' : '확인적'} 요인분석
            </Badge>
            <Badge variant="outline">
              {results.numFactors}개 요인
            </Badge>
            <Badge variant="outline">
              {results.variableNames.length}개 변수
            </Badge>
            <Badge variant="outline">
              {results.extraction === 'principal' ? '주성분' : results.extraction === 'maximum_likelihood' ? '최대우도' : '주축분해'}
            </Badge>
          </div>
        </div>

        {/* 주요 결과 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">KMO 표본적절성</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {results.kmo.toFixed(3)}
              </div>
              <p className="text-xs text-muted-foreground">
                {results.kmo >= 0.9 ? '훌륭함' :
                 results.kmo >= 0.8 ? '우수함' :
                 results.kmo >= 0.7 ? '양호함' :
                 results.kmo >= 0.6 ? '보통' : '부적절'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">누적 분산설명력</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {results.varianceExplained.cumulative[results.numFactors - 1]?.toFixed(1) || '0.0'}%
              </div>
              <p className="text-xs text-muted-foreground">
                {results.numFactors}개 요인으로 설명
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bartlett 검정</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {results.bartlettTest.significant ? '유의함' : '비유의'}
              </div>
              <p className="text-xs text-muted-foreground">
                p = {results.bartlettTest.pValue.toFixed(4)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 탭 컨텐츠 */}
        
          <ContentTabs
              tabs={[
                { id: 'loadings', label: '요인 로딩', icon: Grid3X3 },
                { id: 'eigenvalues', label: '고유값', icon: BarChart3 },
                { id: 'communalities', label: '공통성', icon: Layers },
                { id: 'interpretation', label: '해석', icon: MessageSquare }
              ]}
              activeTab={activeResultTab}
              onTabChange={setActiveResultTab}
              className="mb-4"
            />
            <div className="space-y-4">

          <ContentTabsContent tabId="loadings" show={activeResultTab === 'loadings'} className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>요인 로딩 행렬</CardTitle>
                <CardDescription>각 변수가 각 요인에 미치는 영향력</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 px-4 py-2 text-left">변수</th>
                        {results.factorNames.map(name => (
                          <th key={name} className="border border-gray-200 px-4 py-2 text-center">{name}</th>
                        ))}
                        <th className="border border-gray-200 px-4 py-2 text-center">공통성</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.variableNames.map((variable, i) => (
                        <tr key={variable}>
                          <td className="border border-gray-200 px-4 py-2 font-medium">{variable}</td>
                          {results.factorLoadings[i].map((loading, j) => (
                            <td key={j} className="border border-gray-200 px-4 py-2 text-center font-mono">
                              <span className={Math.abs(loading) >= 0.5 ? 'font-bold text-muted-foreground' : ''}>
                                {loading.toFixed(3)}
                              </span>
                            </td>
                          ))}
                          <td className="border border-gray-200 px-4 py-2 text-center font-mono">
                            {results.communalities[i].toFixed(3)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  <p>• 굵은 글씨: |로딩| ≥ 0.5 (높은 요인 부하)</p>
                  <p>• 공통성: 각 변수가 모든 요인으로 설명되는 분산 비율</p>
                </div>
              </CardContent>
            </Card>
          </ContentTabsContent>

          <ContentTabsContent tabId="eigenvalues" show={activeResultTab === 'eigenvalues'} className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>고유값과 분산설명력</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-200 px-4 py-2">요인</th>
                          <th className="border border-gray-200 px-4 py-2">고유값</th>
                          <th className="border border-gray-200 px-4 py-2">분산(%)</th>
                          <th className="border border-gray-200 px-4 py-2">누적(%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.varianceExplained.total.map((eigenvalue, i) => (
                          <tr key={i}>
                            <td className="border border-gray-200 px-4 py-2 text-center">{i + 1}</td>
                            <td className="border border-gray-200 px-4 py-2 text-center font-mono">
                              {eigenvalue.toFixed(3)}
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-center font-mono">
                              {results.varianceExplained.percentage[i].toFixed(1)}
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-center font-mono">
                              {results.varianceExplained.cumulative[i].toFixed(1)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>스크리 플롯</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-sm">
                    <p>실제 구현에서는 다음과 같은 시각화가 제공됩니다:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li><strong>스크리 플롯:</strong> 고유값의 크기 순서대로 표시</li>
                      <li><strong>분산설명력 막대그래프:</strong> 각 요인별 설명력</li>
                      <li><strong>누적 분산 곡선:</strong> 요인 수에 따른 누적 설명력</li>
                    </ul>
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">Pyodide 통합 예정</span>
                      </div>
                      <p className="text-sm mt-1">
                        scikit-learn의 FactorAnalysis와 matplotlib을 통한
                        전문적인 시각화가 구현될 예정입니다.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ContentTabsContent>

          <ContentTabsContent tabId="communalities" show={activeResultTab === 'communalities'} className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>공통성 분석</CardTitle>
                <CardDescription>각 변수가 요인들로 설명되는 정도</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-3">변수별 공통성</h4>
                    <div className="space-y-2">
                      {results.variableNames.map((variable, i) => (
                        <div key={variable} className="flex justify-between items-center py-1">
                          <span className="text-sm">{variable}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${results.communalities[i] * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-mono w-12">
                              {results.communalities[i].toFixed(3)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">공통성 해석 기준</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        <span><strong>0.7 이상:</strong> 매우 좋음</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        <span><strong>0.5-0.7:</strong> 양호함</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        <span><strong>0.3-0.5:</strong> 보통</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                        <span><strong>0.3 미만:</strong> 낮음 (제외 고려)</span>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <p className="text-sm">
                        <strong>권장사항:</strong> 공통성이 0.3 미만인 변수는
                        요인분석에서 제외하거나 추가 검토가 필요합니다.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </ContentTabsContent>

          <ContentTabsContent tabId="interpretation" show={activeResultTab === 'interpretation'} className="mt-4">
            <ResultInterpretation
              result={{
                summary: `KMO 값 ${results.kmo.toFixed(3)}로 ${
                  results.kmo >= 0.9 ? '훌륭한' :
                  results.kmo >= 0.8 ? '우수한' :
                  results.kmo >= 0.7 ? '양호한' :
                  results.kmo >= 0.6 ? '보통의' : '부적절한'
                } 표본 적절성을 보입니다. ${results.numFactors}개 요인이 전체 분산의 ${results.varianceExplained.cumulative[results.numFactors - 1]?.toFixed(1)}%를 설명합니다.`,
                details: `Bartlett 검정: χ² = ${results.bartlettTest.statistic.toFixed(2)}, p = ${results.bartlettTest.pValue.toFixed(4)} (${results.bartlettTest.significant ? '유의함' : '비유의'})
분석 유형: ${results.method === 'exploratory' ? '탐색적 요인분석 (EFA)' : '확인적 요인분석 (CFA)'}
추출 방법: ${results.extraction === 'principal' ? '주성분 분석' : results.extraction === 'maximum_likelihood' ? '최대우도법' : '주축 분해법'}
회전 방법: ${results.rotation === 'none' ? '회전 없음' : results.rotation === 'varimax' ? 'Varimax' : results.rotation === 'promax' ? 'Promax' : 'Oblimin'}`,
                recommendation: `${results.varianceExplained.cumulative[results.numFactors - 1] >= 60
                  ? '분산설명력이 60% 이상으로 양호합니다.'
                  : '분산설명력이 60% 미만입니다. 요인 수 조정을 고려해보세요.'} 요인점수를 활용한 후속 분석(회귀, 군집)과 신뢰도 분석을 권장합니다.`,
                caution: results.kmo < 0.6 || !results.bartlettTest.significant
                  ? 'KMO 값이 낮거나 Bartlett 검정이 유의하지 않아 요인분석 적합성이 의심됩니다. 변수 선택을 재검토해주세요.'
                  : '요인 로딩이 0.3 미만인 변수는 제외를 고려하세요. 확인적 요인분석(CFA)으로 구조 검증을 권장합니다.'
              }}
              title="요인분석 결과 해석"
            />
          </ContentTabsContent>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => actions.setCurrentStep(2)}>
            이전
          </Button>
          <Button onClick={() => {
            if (!actions.setCurrentStep || !actions.setSelectedVariables || !actions.setUploadedData) {
              console.error('[factor-analysis] Required actions not available')
              window.location.reload()
              return
            }
            actions.setCurrentStep(1)
            actions.setSelectedVariables({ dependent: [] })
            actions.setUploadedData(null)
          }}>
            새 분석 시작
          </Button>
        </div>
      </div>
    )
  }, [results, uploadedData, selectedVariables, actions])

  return (
    <TwoPanelLayout
      analysisTitle="요인분석"
      analysisSubtitle="Factor Analysis"
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
      {currentStep === 0 && renderMethodIntroduction()}
      {currentStep === 1 && (
        <DataUploadStep
          onUploadComplete={handleDataUpload}
          currentStep={1}
          totalSteps={5}
        />
      )}
      {currentStep === 2 && variableSelectionStep}
      {currentStep === 4 && resultsStep}
    </TwoPanelLayout>
  )
}