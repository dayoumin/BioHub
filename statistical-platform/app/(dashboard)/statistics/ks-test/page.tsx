'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Activity,
  Upload,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  FileText,
  Download,
  Info,
  BarChart3
} from 'lucide-react'

import { StatisticsPageLayout, StepCard, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelector } from '@/components/variable-selection/VariableSelector'
import { getVariableRequirements } from '@/lib/statistics/variable-requirements'
import { detectVariableType } from '@/lib/services/variable-type-detector'

// 데이터 인터페이스
interface UploadedData {
  data: Record<string, unknown>[]
  fileName: string
  columns: string[]
}

interface VariableSelection {
  variables: string[]
}

// K-S 검정 타입 정의
interface KSTestResult {
  testType: 'one-sample' | 'two-sample'
  variable1: string
  variable2?: string
  statisticKS: number
  pValue: number
  criticalValue?: number
  significant: boolean
  interpretation: string
  effectSize?: number
  sampleSizes: {
    n1: number
    n2?: number
  }
  distributionInfo?: {
    expectedDistribution: string
    observedMean: number
    observedStd: number
    expectedMean?: number
    expectedStd?: number
  }
}

export default function KolmogorovSmirnovTestPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [uploadedData, setUploadedData] = useState<UploadedData | null>(null)
  const [selectedVariables, setSelectedVariables] = useState<VariableSelection | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResults, setAnalysisResults] = useState<KSTestResult | null>(null)

  // K-S 검정 단계 정의
  const steps: StatisticsStep[] = [
    {
      id: 'method',
      number: 1,
      title: 'K-S 검정 소개',
      description: '분포 동일성 검정 개념',
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
      description: '비교할 변수 선택',
      status: currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : 'pending'
    },
    {
      id: 'results',
      number: 4,
      title: '결과 해석',
      description: 'K-S 검정 결과 확인',
      status: currentStep === 3 ? 'current' : 'pending'
    }
  ]

  const handleDataUpload = useCallback((data: UploadedData) => {
    setUploadedData(data)
    setCurrentStep(2)
  }, [])

  // 표준정규분포 CDF 근사
  const normalCDF = useCallback((z: number): number => {
    const t = 1.0 / (1.0 + 0.2316419 * Math.abs(z))
    const d = 0.3989423 * Math.exp(-z * z / 2)
    let prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
    if (z > 0) prob = 1 - prob
    return prob
  }, [])

  // 일표본 K-S 검정 (정규분포 가정)
  const calculateOneSampleKS = useCallback((values: number[], variable: string): KSTestResult => {
    const n = values.length
    const sortedValues = [...values].sort((a, b) => a - b)

    // 표본 통계량
    const mean = values.reduce((sum, val) => sum + val, 0) / n
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1)
    const std = Math.sqrt(variance)

    // 경험적 분포함수와 이론적 정규분포의 최대 차이 계산
    let maxDifference = 0

    for (let i = 0; i < n; i++) {
      const empiricalCDF = (i + 1) / n
      const standardizedValue = (sortedValues[i] - mean) / std
      const theoreticalCDF = normalCDF(standardizedValue)

      const difference = Math.abs(empiricalCDF - theoreticalCDF)
      maxDifference = Math.max(maxDifference, difference)
    }

    // 임계값 계산 (근사식) - α = 0.05에서의 임계값
    const criticalValue = 1.36 / Math.sqrt(n)

    // p-value 근사 계산 (Kolmogorov 분포)
    const ksStatistic = maxDifference
    const lambda = ksStatistic * Math.sqrt(n)
    let pValue = 2 * Math.exp(-2 * lambda * lambda)

    // p-value 보정 (더 정확한 근사)
    if (pValue > 1) pValue = 1
    if (pValue < 0) pValue = 0

    const significant = ksStatistic > criticalValue

    return {
      testType: 'one-sample',
      variable1: variable,
      statisticKS: ksStatistic,
      pValue,
      criticalValue,
      significant,
      interpretation: significant
        ? '데이터가 정규분포를 따르지 않는 것으로 보임'
        : '데이터가 정규분포를 따르는 것으로 보임',
      sampleSizes: { n1: n },
      distributionInfo: {
        expectedDistribution: '정규분포',
        observedMean: mean,
        observedStd: std,
        expectedMean: mean,
        expectedStd: std
      }
    }
  }, [normalCDF])

  // 이표본 K-S 검정
  const calculateTwoSampleKS = useCallback((values1: number[], values2: number[], variable1: string, variable2: string): KSTestResult => {
    const n1 = values1.length
    const n2 = values2.length

    // 모든 값을 합쳐서 정렬
    const allValues = [...values1, ...values2].sort((a, b) => a - b)
    const uniqueValues = [...new Set(allValues)]

    let maxDifference = 0

    // 각 유니크한 값에서 경험적 분포함수 차이 계산
    for (const value of uniqueValues) {
      const cdf1 = values1.filter(v => v <= value).length / n1
      const cdf2 = values2.filter(v => v <= value).length / n2

      const difference = Math.abs(cdf1 - cdf2)
      maxDifference = Math.max(maxDifference, difference)
    }

    const ksStatistic = maxDifference

    // 이표본 K-S 검정의 임계값 (α = 0.05)
    const criticalValue = 1.36 * Math.sqrt((n1 + n2) / (n1 * n2))

    // p-value 근사 계산
    const effectiveN = (n1 * n2) / (n1 + n2)
    const lambda = ksStatistic * Math.sqrt(effectiveN)
    let pValue = 2 * Math.exp(-2 * lambda * lambda)

    if (pValue > 1) pValue = 1
    if (pValue < 0) pValue = 0

    const significant = ksStatistic > criticalValue

    // 효과크기 (Cohen's d 유사)
    const mean1 = values1.reduce((sum, val) => sum + val, 0) / n1
    const mean2 = values2.reduce((sum, val) => sum + val, 0) / n2
    const pooledStd = Math.sqrt((
      values1.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0) +
      values2.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0)
    ) / (n1 + n2 - 2))

    const effectSize = Math.abs(mean1 - mean2) / pooledStd

    return {
      testType: 'two-sample',
      variable1,
      variable2,
      statisticKS: ksStatistic,
      pValue,
      criticalValue,
      significant,
      interpretation: significant
        ? '두 집단의 분포가 유의하게 다름'
        : '두 집단의 분포가 유의하게 다르지 않음',
      effectSize,
      sampleSizes: { n1, n2 }
    }
  }, [])

  // 실제 K-S 검정 계산 로직
  const calculateKSTest = useCallback((data: unknown[], variable1: string, variable2?: string): KSTestResult => {
    const values1 = data.map(row => (row as Record<string, unknown>)[variable1])
      .filter(val => val != null && typeof val === 'number') as number[]

    if (variable2) {
      // 이표본 K-S 검정
      const values2 = data.map(row => (row as Record<string, unknown>)[variable2])
        .filter(val => val != null && typeof val === 'number') as number[]

      return calculateTwoSampleKS(values1, values2, variable1, variable2)
    } else {
      // 일표본 K-S 검정 (정규분포와 비교)
      return calculateOneSampleKS(values1, variable1)
    }
  }, [calculateOneSampleKS, calculateTwoSampleKS])

  const runAnalysis = useCallback(async (variables: VariableSelection) => {
    if (!uploadedData) return

    setIsAnalyzing(true)
    setCurrentStep(3)

    try {
      setTimeout(() => {
        const variable2 = variables.variables.length > 1 ? variables.variables[1] : undefined
        const result = calculateKSTest(uploadedData.data, variables.variables[0], variable2)
        setAnalysisResults(result)
        setIsAnalyzing(false)
      }, 1500)
    } catch (error) {
      console.error('K-S 검정 분석 중 오류:', error)
      setIsAnalyzing(false)
    }
  }, [uploadedData, calculateKSTest])

  const handleVariableSelection = useCallback((variables: VariableSelection) => {
    setSelectedVariables(variables)
    runAnalysis(variables)
  }, [runAnalysis])

  const renderMethodIntroduction = () => (
    <StepCard
      title="Kolmogorov-Smirnov 검정"
      description="분포의 동일성을 검정하는 비모수 통계 테스트"
      icon={<Info className="w-5 h-5 text-blue-500" />}
    >
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5" />
                K-S 검정이란?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                두 분포의 <strong>누적분포함수(CDF)</strong> 간의 최대 차이를 이용하여
                분포의 동일성을 검정하는 비모수 방법입니다.
              </p>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs font-medium mb-1">검정 통계량</p>
                <p className="text-xs text-blue-700">
                  D = max|F₁(x) - F₂(x)|<br/>
                  F₁, F₂: 각각의 경험적 분포함수
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                사용 사례
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">정규성 검정 (일표본)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">두 집단 분포 비교 (이표본)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">모델 적합도 검정</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">분포 가정 확인</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>가정 및 조건</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• 연속형 변수 (이산형도 가능하나 정확도 떨어짐)</li>
              <li>• 관측값들이 독립적이어야 함</li>
              <li>• 분포에 대한 가정이 필요하지 않음 (비모수)</li>
              <li>• 표본 크기가 클수록 검정력 증가</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="text-center">
          <Button
            onClick={() => setCurrentStep(1)}
            className="w-full md:w-auto"
          >
            데이터 업로드하기
          </Button>
        </div>
      </div>
    </StepCard>
  )

  const renderDataUpload = () => (
    <StepCard
      title="데이터 업로드"
      description="K-S 검정을 수행할 데이터를 업로드하세요"
      icon={<Upload className="w-5 h-5 text-primary" />}
    >
      <DataUploadStep onNext={handleDataUpload} />
    </StepCard>
  )

  const renderVariableSelection = () => {
    if (!uploadedData) return null

    const requirements = getVariableRequirements('kolmogorovSmirnov')

    const columns = Object.keys(uploadedData.data[0] || {})
    const variables = columns.map(col => ({
      name: col,
      type: detectVariableType(
        uploadedData.data.map(row => row[col]),
        col
      ),
      stats: {
        missing: uploadedData.data.filter(row => !row[col]).length,
        unique: [...new Set(uploadedData.data.map(row => row[col]))].length,
        min: Math.min(...uploadedData.data.map(row => Number(row[col]) || 0)),
        max: Math.max(...uploadedData.data.map(row => Number(row[col]) || 0))
      }
    }))

    return (
      <StepCard
        title="변수 선택"
        description="분포를 비교할 변수를 선택하세요"
        icon={<Users className="w-5 h-5 text-primary" />}
      >
        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertTitle>검정 유형</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1 text-sm">
              <p>• <strong>1개 변수 선택</strong>: 일표본 K-S 검정 (정규분포 가정 검정)</p>
              <p>• <strong>2개 변수 선택</strong>: 이표본 K-S 검정 (두 집단 분포 비교)</p>
            </div>
          </AlertDescription>
        </Alert>
        <VariableSelector
          variables={variables}
          requirements={requirements}
          onSelectionChange={handleVariableSelection}
          methodName="Kolmogorov-Smirnov 검정"
        />
      </StepCard>
    )
  }

  const renderResults = () => {
    if (!analysisResults) return null

    const {
      testType,
      variable1,
      variable2,
      statisticKS,
      pValue,
      criticalValue,
      significant,
      interpretation,
      effectSize,
      sampleSizes,
      distributionInfo
    } = analysisResults

    return (
      <StepCard
        title="K-S 검정 결과"
        description={`${testType === 'one-sample' ? '일표본' : '이표본'} 분포 검정 결과`}
        icon={<TrendingUp className="w-5 h-5 text-primary" />}
      >
        <div className="space-y-6">
          {/* 주요 결과 요약 */}
          <Alert className={significant ? "border-red-500 bg-red-50" : "border-green-500 bg-green-50"}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>검정 결과</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-2">
                <p className="font-medium">
                  D = {statisticKS.toFixed(4)}, p = {pValue.toFixed(3)}
                </p>
                <p>
                  {significant
                    ? "❌ 분포가 유의하게 다릅니다 (p < 0.05)"
                    : "✅ 분포가 유의하게 다르지 않습니다 (p ≥ 0.05)"}
                </p>
                <p className="text-sm text-muted-foreground">{interpretation}</p>
              </div>
            </AlertDescription>
          </Alert>

          {/* 검정 통계량 */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">검정 통계량</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center p-3 bg-primary/10 rounded-lg">
                  <p className="font-medium">K-S 통계량 (D)</p>
                  <p className="text-2xl font-bold text-primary">{statisticKS.toFixed(4)}</p>
                </div>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>p-value</span>
                    <Badge variant={significant ? "destructive" : "default"}>
                      {pValue < 0.001 ? '< 0.001' : pValue.toFixed(3)}
                    </Badge>
                  </div>
                  {criticalValue && (
                    <div className="flex justify-between">
                      <span>임계값 (α = 0.05)</span>
                      <Badge variant="outline">{criticalValue.toFixed(4)}</Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">표본 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>{variable1} 표본수</span>
                    <Badge>{sampleSizes.n1}</Badge>
                  </div>
                  {sampleSizes.n2 && variable2 && (
                    <div className="flex justify-between">
                      <span>{variable2} 표본수</span>
                      <Badge>{sampleSizes.n2}</Badge>
                    </div>
                  )}
                  {effectSize && (
                    <div className="flex justify-between">
                      <span>효과크기</span>
                      <Badge variant={effectSize > 0.8 ? "default" : effectSize > 0.5 ? "secondary" : "outline"}>
                        {effectSize.toFixed(3)}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 분포 정보 (일표본인 경우) */}
          {distributionInfo && testType === 'one-sample' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">분포 적합도 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="font-medium">관측 평균</p>
                    <p className="text-lg font-bold text-blue-600">{distributionInfo.observedMean.toFixed(3)}</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium">관측 표준편차</p>
                    <p className="text-lg font-bold text-gray-600">{distributionInfo.observedStd.toFixed(3)}</p>
                  </div>
                </div>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>분포 비교</AlertTitle>
                  <AlertDescription>
                    <p className="text-sm mt-2">
                      관측된 데이터와 {distributionInfo.expectedDistribution} 간의 최대 차이를 측정합니다.
                      D 값이 클수록 분포의 차이가 큼을 의미합니다.
                    </p>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* 해석 가이드 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">결과 해석 가이드</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>K-S 검정 해석</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-2 text-sm">
                    <p><strong>귀무가설(H₀):</strong> 두 분포가 동일하다</p>
                    <p><strong>대립가설(H₁):</strong> 두 분포가 다르다</p>
                    <p><strong>판단기준:</strong> p-value &lt; 0.05이면 귀무가설 기각</p>
                  </div>
                </AlertDescription>
              </Alert>

              {testType === 'two-sample' && effectSize && (
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-800 mb-2">효과크기 해석</h4>
                  <div className="text-sm text-purple-700 space-y-1">
                    <p>• <strong>작은 효과</strong>: 0.2 ~ 0.5</p>
                    <p>• <strong>중간 효과</strong>: 0.5 ~ 0.8</p>
                    <p>• <strong>큰 효과</strong>: 0.8 이상</p>
                    <p className="mt-2 font-medium">현재 효과크기: {effectSize.toFixed(3)}
                      ({effectSize < 0.5 ? '작음' : effectSize < 0.8 ? '중간' : '큼'})
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">주의사항</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• K-S 검정은 분포의 모든 측면(위치, 척도, 모양)을 고려합니다</li>
                  <li>• 표본 크기가 클수록 작은 차이도 유의하게 검출될 수 있습니다</li>
                  <li>• 이산형 데이터에서는 보수적인 결과를 보일 수 있습니다</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* 액션 버튼 */}
          <div className="flex gap-3 justify-center pt-4">
            <Button variant="outline" onClick={() => {}}>
              <FileText className="w-4 h-4 mr-2" />
              보고서 생성
            </Button>
            <Button variant="outline" onClick={() => {}}>
              <Download className="w-4 h-4 mr-2" />
              결과 다운로드
            </Button>
          </div>
        </div>
      </StepCard>
    )
  }

  return (
    <StatisticsPageLayout
      title="Kolmogorov-Smirnov 검정"
      subtitle="K-S Test - 분포의 동일성 검정"
      icon={<Activity className="w-6 h-6" />}
      methodInfo={{
        formula: 'D = max|F₁(x) - F₂(x)|, 임계값 = 1.36/√n (일표본)',
        assumptions: ['연속형 변수', '독립성', '비모수적'],
        sampleSize: '제한 없음 (클수록 검정력 증가)',
        usage: '정규성 검정, 분포 비교, 적합도 검정'
      }}
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      onRun={() => selectedVariables && runAnalysis(selectedVariables)}
      onReset={() => {
        setCurrentStep(0)
        setUploadedData(null)
        setSelectedVariables(null)
        setAnalysisResults(null)
      }}
      isRunning={isAnalyzing}
      showProgress={true}
      showTips={true}
    >
      {currentStep === 0 && renderMethodIntroduction()}
      {currentStep === 1 && renderDataUpload()}
      {currentStep === 2 && renderVariableSelection()}
      {currentStep === 3 && renderResults()}
    </StatisticsPageLayout>
  )
}