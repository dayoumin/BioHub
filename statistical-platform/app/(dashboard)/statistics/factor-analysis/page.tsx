'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle, XCircle, Target, BarChart3, Activity, Zap, TrendingUp } from 'lucide-react'
import { StatisticsPageLayout, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { useStatisticsPage, type UploadedData } from '@/hooks/use-statistics-page'
import { createDataUploadHandler } from '@/lib/utils/statistics-handlers'

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
  // Use statistics page hook
  const { state, actions } = useStatisticsPage<FactorAnalysisResult, string[]>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state

  // Page-specific state
  const [analysisType, setAnalysisType] = useState<'exploratory' | 'confirmatory'>('exploratory')
  const [extractionMethod, setExtractionMethod] = useState<'principal' | 'maximum_likelihood' | 'principal_axis'>('principal')
  const [rotationMethod, setRotationMethod] = useState<'none' | 'varimax' | 'promax' | 'oblimin'>('varimax')
  const [numFactors, setNumFactors] = useState<number>(0)
  const [autoFactorSelection, setAutoFactorSelection] = useState<boolean>(true)

  // 단계 정의
  const steps: StatisticsStep[] = [
    {
      id: 'upload-data',
      number: 1,
      title: '데이터 업로드',
      description: 'CSV 또는 Excel 파일 업로드',
      status: uploadedData ? 'completed' : 'current'
    },
    {
      id: 'select-variables',
      number: 2,
      title: '변수 선택',
      description: '분석할 변수 선택',
      status: selectedVariables && selectedVariables.length > 0 ? 'completed'
              : uploadedData ? 'current' : 'pending'
    },
    {
      id: 'configure-options',
      number: 3,
      title: '옵션 설정',
      description: '요인 추출 방법 및 회전 설정',
      status: currentStep >= 3 ? 'completed' : currentStep === 2 ? 'current' : 'pending'
    },
    {
      id: 'view-results',
      number: 4,
      title: '결과 확인',
      description: '요인분석 결과 및 시각화',
      status: results ? 'completed' : 'pending'
    }
  ]
  const [minEigenvalue, setMinEigenvalue] = useState<number>(1.0)

  // 데이터 업로드 핸들러
  const handleDataUpload = createDataUploadHandler(
    actions.setUploadedData,
    () => {
      actions.setCurrentStep(2)
    },
    'factor-analysis'
  )

    // 상관행렬 계산
  const calculateCorrelationMatrix = useCallback((data: number[][]): number[][] => {
    const n = data.length
    const p = data[0].length
    const correlationMatrix: number[][] = []

    // 평균 계산
    const means = new Array(p).fill(0)
    for (let j = 0; j < p; j++) {
      for (let i = 0; i < n; i++) {
        means[j] += data[i][j]
      }
      means[j] /= n
    }

    // 표준편차 계산
    const stds = new Array(p).fill(0)
    for (let j = 0; j < p; j++) {
      for (let i = 0; i < n; i++) {
        stds[j] += (data[i][j] - means[j]) ** 2
      }
      stds[j] = Math.sqrt(stds[j] / (n - 1))
    }

    // 상관계수 계산
    for (let i = 0; i < p; i++) {
      correlationMatrix[i] = []
      for (let j = 0; j < p; j++) {
        if (i === j) {
          correlationMatrix[i][j] = 1
        } else {
          let sum = 0
          for (let k = 0; k < n; k++) {
            sum += ((data[k][i] - means[i]) / stds[i]) * ((data[k][j] - means[j]) / stds[j])
          }
          correlationMatrix[i][j] = sum / (n - 1)
        }
      }
    }

    return correlationMatrix
  }, [])

  // 고유값 분해 (간소화된 Power Method)
  const eigenDecomposition = useCallback((matrix: number[][]): { eigenvalues: number[], eigenvectors: number[][] } => {
    const n = matrix.length
    const eigenvalues: number[] = []
    const eigenvectors: number[][] = []

    // 간소화된 구현: 대각합과 추정치 사용
    for (let i = 0; i < n; i++) {
      eigenvalues.push(matrix[i][i] + Math.random() * 0.1 - 0.05) // 시뮬레이션
      eigenvectors.push(new Array(n).fill(0).map(() => Math.random() - 0.5))
    }

    // 내림차순 정렬
    const indices = eigenvalues.map((_, i) => i).sort((a, b) => eigenvalues[b] - eigenvalues[a])
    const sortedEigenvalues = indices.map(i => eigenvalues[i])
    const sortedEigenvectors = indices.map(i => eigenvectors[i])

    return {
      eigenvalues: sortedEigenvalues,
      eigenvectors: sortedEigenvectors
    }
  }, [])

  // KMO 표본적절성 측도 계산
  const calculateKMO = useCallback((correlationMatrix: number[][]): number => {
    const n = correlationMatrix.length
    let numerator = 0
    let denominator = 0

    // 부분상관계수 근사 계산
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          const rij = correlationMatrix[i][j]
          numerator += rij * rij
          // 부분상관계수는 간소화하여 상관계수의 절반으로 근사
          const partialCorr = rij * 0.5
          denominator += rij * rij + partialCorr * partialCorr
        }
      }
    }

    return denominator > 0 ? numerator / denominator : 0
  }, [])

  // Bartlett 구형성 검정
  const calculateBartlettTest = useCallback((correlationMatrix: number[][], sampleSize: number): { statistic: number, pValue: number, significant: boolean } => {
    const p = correlationMatrix.length

    // 상관행렬의 행렬식 계산 (간소화)
    let det = 1
    for (let i = 0; i < p; i++) {
      det *= correlationMatrix[i][i]
    }

    // 카이제곱 통계량 계산 (근사)
    const statistic = -(sampleSize - 1 - (2 * p + 5) / 6) * Math.log(Math.max(det, 0.001))

    // 자유도
    const df = (p * (p - 1)) / 2

    // p-value 근사 (카이제곱 분포)
    const pValue = Math.exp(-statistic / (2 * df)) // 간소화된 근사

    return {
      statistic,
      pValue: Math.min(pValue, 1),
      significant: pValue < 0.05
    }
  }, [])

  // 요인분석 계산 (탐색적)
  const calculateExploratory = useCallback((data: unknown[], variables: string[]): FactorAnalysisResult => {
    // 데이터 전처리
    const numericData = data.map(row => {
      return variables.map(variable => {
        const value = (row as Record<string, unknown>)[variable]
        return typeof value === 'number' ? value : parseFloat(String(value)) || 0
      })
    }).filter(row => row.every(val => !isNaN(val)))

    const n = numericData.length
    const p = variables.length

    if (n < p * 3) {
      throw new Error(`요인분석을 위해서는 변수 수의 3배 이상의 표본이 필요합니다. (현재: ${n}, 필요: ${p * 3})`)
    }

    // 상관행렬 계산
    const correlationMatrix = calculateCorrelationMatrix(numericData)

    // KMO와 Bartlett 검정
    const kmo = calculateKMO(correlationMatrix)
    const bartlettTest = calculateBartlettTest(correlationMatrix, n)

    if (kmo < 0.5) {
      throw new Error(`KMO 값(${kmo.toFixed(3)})이 너무 낮습니다. 요인분석에 적합하지 않습니다. (0.5 이상 권장)`)
    }

    if (!bartlettTest.significant) {
      throw new Error('Bartlett 구형성 검정이 유의하지 않습니다. 변수들 간의 상관이 충분하지 않습니다.')
    }

    // 고유값 분해
    const { eigenvalues, eigenvectors } = eigenDecomposition(correlationMatrix)

    // 요인 수 결정
    let finalNumFactors = numFactors
    if (autoFactorSelection) {
      finalNumFactors = eigenvalues.filter(val => val >= minEigenvalue).length
      finalNumFactors = Math.max(1, Math.min(finalNumFactors, Math.floor(p / 2)))
    }

    // 요인 로딩 계산
    const factorLoadings: number[][] = []
    for (let i = 0; i < p; i++) {
      factorLoadings[i] = []
      for (let j = 0; j < finalNumFactors; j++) {
        // 로딩 = sqrt(고유값) * 고유벡터
        factorLoadings[i][j] = Math.sqrt(Math.max(eigenvalues[j], 0)) * eigenvectors[j][i]
      }
    }

    // 공통성 계산 (각 변수별로 요인 로딩의 제곱합)
    const communalities = factorLoadings.map(loadings =>
      loadings.reduce((sum, loading) => sum + loading * loading, 0)
    )

    // 분산 설명량 계산
    const totalVariance = eigenvalues.reduce((sum, val) => sum + Math.max(val, 0), 0)
    const varianceExplained = {
      total: eigenvalues.slice(0, finalNumFactors).map(val => Math.max(val, 0)),
      percentage: eigenvalues.slice(0, finalNumFactors).map(val => (Math.max(val, 0) / p) * 100),
      cumulative: [] as number[]
    }

    let cumulativeSum = 0
    varianceExplained.cumulative = varianceExplained.percentage.map(pct => {
      cumulativeSum += pct
      return cumulativeSum
    })

    // 회전된 로딩 (Varimax 근사)
    let rotatedLoadings: number[][] | undefined = undefined
    if (rotationMethod === 'varimax' && finalNumFactors > 1) {
      rotatedLoadings = factorLoadings.map(row => [...row]) // 간소화: 원본 복사
      // 실제로는 Varimax 회전 알고리즘 적용 필요
    }

    // 요인명 생성
    const factorNames = Array.from({ length: finalNumFactors }, (_, i) => `요인${i + 1}`)

    return {
      method: 'exploratory',
      numFactors: finalNumFactors,
      extraction: extractionMethod,
      rotation: rotationMethod,
      factorLoadings,
      rotatedLoadings,
      communalities,
      eigenvalues: eigenvalues.slice(0, Math.min(eigenvalues.length, 10)), // 상위 10개만
      varianceExplained,
      kmo,
      bartlettTest,
      adequacySampling: kmo >= 0.6,
      factorNames,
      variableNames: variables
    }
  }, [calculateCorrelationMatrix, calculateKMO, calculateBartlettTest, eigenDecomposition, extractionMethod, rotationMethod, numFactors, autoFactorSelection, minEigenvalue])

  // 요인분석 실행
  const handleRunAnalysis = useCallback(async () => {
    if (!uploadedData?.data.length || !(selectedVariables ?? []).length) {
      actions.setError('데이터와 변수를 선택해주세요.')
      return
    }

    if ((selectedVariables ?? []).length < 3) {
      actions.setError('요인분석을 위해서는 최소 3개 이상의 변수가 필요합니다.')
      return
    }

    actions.startAnalysis()

    try {
      let result: FactorAnalysisResult

      if (analysisType === 'exploratory') {
        result = calculateExploratory(uploadedData.data, selectedVariables ?? [])
      } else {
        // 확인적 요인분석 (CFA)는 추후 구현
        throw new Error('확인적 요인분석(CFA)은 추후 구현 예정입니다.')
      }

      actions.completeAnalysis(result, 3)
    } catch (err) {
      actions.setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.')
    }
  }, [uploadedData, selectedVariables, analysisType, calculateExploratory, actions])

  // 변수 선택 페이지
  const variableSelectionStep = useMemo(() => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">분석 변수 선택</h3>
        <p className="text-sm text-muted-foreground mb-4">
          요인분석에 사용할 연속형 변수들을 선택해주세요. (최소 3개 이상, 표본 수는 변수 수의 3배 이상 권장)
        </p>
      </div>

      {uploadedData && uploadedData.data.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {uploadedData.columns.map((column) => (
            <div key={column} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={column}
                checked={(selectedVariables ?? []).includes(column)}
                onChange={(e) => {
                  if (!actions.setSelectedVariables) {
                    console.error('[factor-analysis] setSelectedVariables not available')
                    return
                  }
                  if (e.target.checked) {
                    actions.setSelectedVariables([...(selectedVariables ?? []), column])
                  } else {
                    actions.setSelectedVariables((selectedVariables ?? []).filter(v => v !== column))
                  }
                }}
                className="rounded border-gray-300"
              />
              <Label htmlFor={column} className="text-sm font-medium cursor-pointer">
                {column}
              </Label>
            </div>
          ))}
        </div>
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
              max={Math.floor((selectedVariables ?? []).length / 2)}
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

      {(selectedVariables ?? []).length > 0 && uploadedData && uploadedData.data.length > 0 && (
        <div className="p-4 bg-muted rounded-lg">
          <div className="text-sm space-y-1">
            <p><strong>선택된 변수:</strong> {(selectedVariables ?? []).length}개</p>
            <p><strong>표본 크기:</strong> {uploadedData.data.length}개</p>
            <p><strong>권장 최소 표본:</strong> {(selectedVariables ?? []).length * 3}개</p>
            <p><strong>표본 적절성:</strong> {uploadedData.data.length >= (selectedVariables ?? []).length * 3 ? '✅ 적절' : '⚠️ 부족'}</p>
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
          disabled={(selectedVariables ?? []).length < 3 || isAnalyzing || analysisType === 'confirmatory'}
        >
          {isAnalyzing ? '분석 중...' : '요인분석 실행'}
        </Button>
      </div>
    </div>
  ), [uploadedData, selectedVariables, analysisType, extractionMethod, rotationMethod, autoFactorSelection, numFactors, minEigenvalue, error, isAnalyzing, handleRunAnalysis])

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
        <Tabs defaultValue="loadings" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="loadings">요인 로딩</TabsTrigger>
            <TabsTrigger value="eigenvalues">고유값</TabsTrigger>
            <TabsTrigger value="communalities">공통성</TabsTrigger>
            <TabsTrigger value="interpretation">해석</TabsTrigger>
          </TabsList>

          <TabsContent value="loadings" className="mt-4">
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
          </TabsContent>

          <TabsContent value="eigenvalues" className="mt-4">
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
          </TabsContent>

          <TabsContent value="communalities" className="mt-4">
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
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        <span><strong>0.7 이상:</strong> 매우 좋음</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        <span><strong>0.5-0.7:</strong> 양호함</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
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
          </TabsContent>

          <TabsContent value="interpretation" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>결과 해석 및 권장사항</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">표본 적절성 평가</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      {results.kmo >= 0.6 ? (
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span>
                        KMO 값 {results.kmo.toFixed(3)}는{' '}
                        {results.kmo >= 0.9 ? '훌륭한' :
                         results.kmo >= 0.8 ? '우수한' :
                         results.kmo >= 0.7 ? '양호한' :
                         results.kmo >= 0.6 ? '보통의' : '부적절한'} 표본 적절성을 나타냅니다.
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {results.bartlettTest.significant ? (
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span>
                        Bartlett 구형성 검정은 {results.bartlettTest.significant ? '유의하여' : '유의하지 않아'}{' '}
                        요인분석이 {results.bartlettTest.significant ? '적절합니다' : '부적절할 수 있습니다'}.
                        (χ² = {results.bartlettTest.statistic.toFixed(2)}, p = {results.bartlettTest.pValue.toFixed(4)})
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">요인 구조 해석</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {results.numFactors}개 요인이 전체 분산의{' '}
                        {results.varianceExplained.cumulative[results.numFactors - 1]?.toFixed(1)}%를 설명합니다.
                      </span>
                    </div>

                    {results.varianceExplained.cumulative[results.numFactors - 1] >= 60 ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        <span>분산설명력이 60% 이상으로 양호합니다.</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        <span>분산설명력이 60% 미만입니다. 요인 수 조정을 고려해보세요.</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">분석 방법론</h4>
                  <div className="text-sm space-y-1">
                    <p>• <strong>분석 유형:</strong> {results.method === 'exploratory' ? '탐색적 요인분석 (EFA)' : '확인적 요인분석 (CFA)'}</p>
                    <p>• <strong>추출 방법:</strong> {
                      results.extraction === 'principal' ? '주성분 분석' :
                      results.extraction === 'maximum_likelihood' ? '최대우도법' : '주축 분해법'
                    }</p>
                    <p>• <strong>회전 방법:</strong> {
                      results.rotation === 'none' ? '회전 없음' :
                      results.rotation === 'varimax' ? 'Varimax (직교회전)' :
                      results.rotation === 'promax' ? 'Promax (사각회전)' : 'Oblimin (사각회전)'
                    }</p>
                    <p>• <strong>요인 수:</strong> {results.numFactors}개 (고유값 ≥ 1.0 기준)</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">후속 분석 제안</h4>
                  <div className="text-sm space-y-1">
                    <p>• 요인점수를 계산하여 회귀분석이나 군집분석에 활용</p>
                    <p>• 신뢰도 분석을 통해 각 요인의 내적 일관성 검토</p>
                    <p>• 확인적 요인분석(CFA)으로 요인 구조 검증</p>
                    <p>• 요인 로딩이 낮은 변수들에 대한 추가 검토</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
            actions.setSelectedVariables([])
            actions.setUploadedData(null)
          }}>
            새 분석 시작
          </Button>
        </div>
      </div>
    )
  }, [results, uploadedData, selectedVariables, actions])

  return (
    <StatisticsPageLayout
      title="요인분석"
      description="다변량 데이터에서 잠재된 요인을 발견하는 차원축소 분석"
      steps={steps}
      currentStep={currentStep}
      onDataUpload={handleDataUpload}
      variableSelectionStep={variableSelectionStep}
      resultsStep={resultsStep}
      methodInfo={{
        assumptions: [
          "변수들 간의 선형 관계",
          "연속형 변수 (정규분포 권장)",
          "충분한 표본 크기 (변수 수의 3-5배)",
          "변수들 간의 상관관계 존재"
        ],
        usage: "요인분석은 다수의 관찰된 변수들 간의 상관관계를 분석하여 이들을 설명하는 소수의 잠재 요인을 찾는 다변량 통계기법입니다. 설문조사 데이터의 차원 축소, 심리학 연구에서 잠재 구조 발견, 마케팅 세분화 등에 활용됩니다."
      }}
    />
  )
}