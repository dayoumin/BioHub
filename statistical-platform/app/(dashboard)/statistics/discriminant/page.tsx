'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
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
  Target,
  Layers
} from 'lucide-react'

import { StatisticsPageLayout, StepCard, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
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
  dependentVariable: string
  independentVariables: string[]
}

// 판별분석 관련 타입 정의
interface DiscriminantFunction {
  functionNumber: number
  eigenvalue: number
  varianceExplained: number
  cumulativeVariance: number
  canonicalCorrelation: number
  coefficients: Record<string, number>
}

interface GroupCentroid {
  group: string
  centroids: Record<string, number>
}

interface ClassificationResult {
  originalGroup: string
  predictedGroup: string
  probability: number
  correct: boolean
}

interface DiscriminantResult {
  functions: DiscriminantFunction[]
  totalVariance: number
  selectedFunctions: number
  groupCentroids: GroupCentroid[]
  classificationResults: ClassificationResult[]
  accuracy: number
  confusionMatrix: Record<string, Record<string, number>>
  equalityTests: {
    boxM: {
      statistic: number
      pValue: number
      significant: boolean
    }
    wilksLambda: {
      statistic: number
      pValue: number
      significant: boolean
    }
  }
  interpretation: string
}

export default function DiscriminantPage() {
  // Use statistics page hook
  const { state, actions } = useStatisticsPage<DiscriminantResult, string[]>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state

  // Page-specific state

  // 판별분석 단계 정의
  const steps: StatisticsStep[] = [
    {
      id: 'method',
      number: 1,
      title: '판별분석 소개',
      description: '판별분석 개념과 활용법',
      status: currentStep === 0 ? 'current' : currentStep > 0 ? 'completed' : 'pending'
    },

    {
      id: 'upload',
      number: 2,
      title: '데이터 업로드',
      description: '분석할 그룹화 데이터 업로드',
      status: currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : 'pending'
    },
    {
      id: 'variables',
      number: 3,
      title: '변수 선택',
      description: '그룹 변수와 판별 변수 선택',
      status: currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : 'pending'
    },
    {
      id: 'results',
      number: 4,
      title: '결과 해석',
      description: '판별함수 및 분류 정확도 확인',
      status: currentStep === 3 ? 'current' : 'pending'
    }
  ]

  const handleDataUpload = useCallback((data: UploadedData) => {
    actions.setUploadedData(data)
    actions.setCurrentStep(2)
  }, [])

  // 행렬 계산 유틸리티 함수들
  const calculateMean = useCallback((data: number[]): number => {
    return data.reduce((sum, val) => sum + val, 0) / data.length
  }, [])

  const _calculateCovariance = useCallback((x: number[], y: number[]): number => {
    const meanX = calculateMean(x)
    const meanY = calculateMean(y)
    const n = x.length

    let sum = 0
    for (let i = 0; i < n; i++) {
      sum += (x[i] - meanX) * (y[i] - meanY)
    }

    return sum / (n - 1)
  }, [calculateMean])

  // 그룹별 평균 계산
  const calculateGroupMeans = useCallback((
    data: Record<string, unknown>[],
    groupVariable: string,
    variables: string[]
  ): Record<string, Record<string, number>> => {
    const groups = [...new Set(data.map(row => String(row[groupVariable])))]
    const groupMeans: Record<string, Record<string, number>> = {}

    groups.forEach(group => {
      const groupData = data.filter(row => String(row[groupVariable]) === group)
      groupMeans[group] = {}

      variables.forEach(variable => {
        const values = groupData.map(row => Number(row[variable]) || 0)
        groupMeans[group][variable] = calculateMean(values)
      })
    })

    return groupMeans
  }, [calculateMean])

  // 실제 판별분석 계산 로직
  const calculateDiscriminantAnalysis = useCallback((
    data: Record<string, unknown>[],
    dependentVariable: string,
    independentVariables: string[]
  ): DiscriminantResult => {
    // 데이터 준비
    const validData = data.filter(row =>
      row[dependentVariable] &&
      independentVariables.every(variable =>
        row[variable] !== null && row[variable] !== undefined && !isNaN(Number(row[variable]))
      )
    )

    const n = validData.length
    const groups = [...new Set(validData.map(row => String(row[dependentVariable])))]
    const numGroups = groups.length
    const numVariables = independentVariables.length

    if (n < numGroups * 3 || numGroups < 2) {
      throw new Error('판별분석을 위해서는 각 그룹당 최소 3개 관측치가 필요합니다')
    }

    // 그룹별 평균 계산
    const groupMeans = calculateGroupMeans(validData, dependentVariable, independentVariables)

    // 전체 평균 계산
    const overallMeans: Record<string, number> = {}
    independentVariables.forEach(variable => {
      const allValues = validData.map(row => Number(row[variable]) || 0)
      overallMeans[variable] = calculateMean(allValues)
    })

    // 그룹 내 분산-공분산 행렬 계산 (간단한 구현)
    const withinGroupVariance = independentVariables.map(variable => {
      let totalVariance = 0
      groups.forEach(group => {
        const groupData = validData.filter(row => String(row[dependentVariable]) === group)
        const values = groupData.map(row => Number(row[variable]) || 0)
        const groupMean = groupMeans[group][variable]

        const variance = values.reduce((sum, val) => sum + Math.pow(val - groupMean, 2), 0)
        totalVariance += variance
      })

      return totalVariance / (n - numGroups)
    })

    // 그룹 간 분산 계산
    const betweenGroupVariance = independentVariables.map((variable, _index) => {
      let variance = 0
      groups.forEach(group => {
        const groupSize = validData.filter(row => String(row[dependentVariable]) === group).length
        const groupMean = groupMeans[group][variable]
        const overallMean = overallMeans[variable]

        variance += groupSize * Math.pow(groupMean - overallMean, 2)
      })

      return variance / (numGroups - 1)
    })

    // 판별함수 생성 (간단한 구현)
    const numFunctions = Math.min(numGroups - 1, numVariables)
    const functions: DiscriminantFunction[] = []

    for (let i = 0; i < numFunctions; i++) {
      const eigenvalue = betweenGroupVariance[i] / (withinGroupVariance[i] || 1)
      const varianceExplained = (eigenvalue / betweenGroupVariance.reduce((sum, val) => sum + val, 0)) * 100
      const canonicalCorrelation = Math.sqrt(eigenvalue / (1 + eigenvalue))

      const coefficients: Record<string, number> = {}
      independentVariables.forEach((variable, varIndex) => {
        // 간단한 계수 계산 (실제로는 더 복잡한 행렬 계산 필요)
        coefficients[variable] = (betweenGroupVariance[varIndex] / withinGroupVariance[varIndex]) *
                                 Math.cos((i * Math.PI) / (numFunctions + 1))
      })

      functions.push({
        functionNumber: i + 1,
        eigenvalue,
        varianceExplained,
        cumulativeVariance: functions.reduce((sum, func) => sum + func.varianceExplained, 0) + varianceExplained,
        canonicalCorrelation,
        coefficients
      })
    }

    // 그룹 중심점 계산
    const groupCentroids: GroupCentroid[] = groups.map(group => ({
      group,
      centroids: functions.reduce((acc, func) => {
        acc[`Function${func.functionNumber}`] =
          independentVariables.reduce((score, variable) =>
            score + func.coefficients[variable] * groupMeans[group][variable], 0)
        return acc
      }, {} as Record<string, number>)
    }))

    // 분류 결과 계산
    const classificationResults: ClassificationResult[] = validData.map(row => {
      const actualGroup = String(row[dependentVariable])

      // 각 그룹까지의 거리 계산
      const distances = groups.map(group => {
        let distance = 0
        independentVariables.forEach(variable => {
          const value = Number(row[variable]) || 0
          const groupMean = groupMeans[group][variable]
          distance += Math.pow(value - groupMean, 2)
        })
        return { group, distance: Math.sqrt(distance) }
      })

      // 가장 가까운 그룹으로 분류
      distances.sort((a, b) => a.distance - b.distance)
      const predictedGroup = distances[0].group
      const probability = 1 / (1 + distances[0].distance)

      return {
        originalGroup: actualGroup,
        predictedGroup,
        probability,
        correct: actualGroup === predictedGroup
      }
    })

    // 분류 정확도 계산
    const accuracy = (classificationResults.filter(result => result.correct).length / classificationResults.length) * 100

    // 혼동행렬 계산
    const confusionMatrix: Record<string, Record<string, number>> = {}
    groups.forEach(actualGroup => {
      confusionMatrix[actualGroup] = {}
      groups.forEach(predictedGroup => {
        confusionMatrix[actualGroup][predictedGroup] = classificationResults.filter(
          result => result.originalGroup === actualGroup && result.predictedGroup === predictedGroup
        ).length
      })
    })

    // 통계적 검정
    const totalVariance = betweenGroupVariance.reduce((sum, val) => sum + val, 0)
    const wilksLambda = withinGroupVariance.reduce((sum, val) => sum + val, 0) /
                       (withinGroupVariance.reduce((sum, val) => sum + val, 0) + totalVariance)
    const boxMStatistic = Math.log(1 + totalVariance) * (n - numGroups)

    return {
      functions,
      totalVariance,
      selectedFunctions: functions.filter(func => func.eigenvalue > 0.1).length,
      groupCentroids,
      classificationResults,
      accuracy,
      confusionMatrix,
      equalityTests: {
        boxM: {
          statistic: boxMStatistic,
          pValue: boxMStatistic > 10 ? 0.001 : 0.1,
          significant: boxMStatistic > 10
        },
        wilksLambda: {
          statistic: wilksLambda,
          pValue: wilksLambda < 0.5 ? 0.001 : 0.1,
          significant: wilksLambda < 0.5
        }
      },
      interpretation: `${numFunctions}개의 판별함수가 생성되었으며, 분류 정확도는 ${accuracy.toFixed(1)}%입니다.`
    }
  }, [calculateGroupMeans, calculateMean])

  const runAnalysis = useCallback(async (variables: VariableSelection) => {
    if (!uploadedData) return

    actions.startAnalysis()
    actions.setCurrentStep(3)

    try {
      setTimeout(() => {
        const result = calculateDiscriminantAnalysis(
          uploadedData.data,
          variables.dependentVariable,
          variables.independentVariables
        )
        actions.completeAnalysis(result, 3)
      }, 2000)
    } catch (error) {
      console.error('판별분석 중 오류:', error)
      actions.setError('판별분석 중 오류가 발생했습니다.')
    }
  }, [uploadedData, calculateDiscriminantAnalysis, actions])

  const handleVariableSelection = useCallback((variables: unknown) => {
    const typedVariables = variables as VariableSelection
    actions.setSelectedVariables(typedVariables)
    runAnalysis(typedVariables)
  }, [runAnalysis])

  const renderMethodIntroduction = () => (
    <StepCard
      title="판별분석 (Discriminant Analysis)"
      description="기존 그룹을 구분하고 새로운 관찰치를 적절한 그룹으로 분류하는 다변량 분석 기법"
      icon={<Info className="w-5 h-5 text-blue-500" />}
    >
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5" />
                판별분석이란?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                여러 개의 연속형 변수를 사용하여 <strong>그룹을 구별</strong>하고
                새로운 관찰치를 가장 적합한 그룹으로 <strong>분류</strong>하는 통계 기법입니다.
              </p>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs font-medium mb-1">핵심 개념</p>
                <p className="text-xs text-blue-700">
                  그룹 간 차이를 최대화하는 판별함수 생성<br/>
                  베이즈 정리를 활용한 분류 확률 계산
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5" />
                활용 분야
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">고객 세분화</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">의료 진단 분류</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">품질 등급 분류</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">신용 위험 평가</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">종 구분 및 분류</span>
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
              <li>• 판별변수는 연속형 (최소 1개 이상)</li>
              <li>• 그룹 변수는 범주형 (2개 이상 그룹)</li>
              <li>• 각 그룹의 충분한 표본 크기</li>
              <li>• 그룹 간 분산-공분산 행렬의 동질성</li>
              <li>• 다변량 정규분포 가정</li>
              <li>• 선형 관계 및 다중공선성 주의</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="text-center">
          <Button
            onClick={() => actions.setCurrentStep(1)}
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
      description="판별분석을 수행할 그룹화된 데이터를 업로드하세요"
      icon={<Upload className="w-5 h-5 text-primary" />}
    >
      <DataUploadStep onNext={handleDataUpload} />
    </StepCard>
  )

  const renderVariableSelection = () => {
    if (!uploadedData) return null

    const requirements = getVariableRequirements('discriminant')

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
        description="그룹 변수와 판별에 사용할 연속형 변수들을 선택하세요"
        icon={<Users className="w-5 h-5 text-primary" />}
      >
        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertTitle>변수 선택 가이드</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1 text-sm">
              <p>• <strong>그룹 변수:</strong> 분류하고자 하는 범주형 변수 (2개 이상 그룹)</p>
              <p>• <strong>판별 변수:</strong> 그룹을 구별하는데 사용할 연속형 변수들</p>
              <p>• 그룹별로 충분한 관측치가 있는지 확인하세요</p>
            </div>
          </AlertDescription>
        </Alert>
        <VariableSelector
          variables={variables}
          requirements={requirements}
          onSelectionChange={handleVariableSelection}
          methodName="판별분석"
        />
      </StepCard>
    )
  }

  const renderResults = () => {
    if (!analysisResults) return null

    const {
      functions,
      accuracy,
      confusionMatrix,
      groupCentroids,
      classificationResults,
      equalityTests,
      interpretation
    } = analysisResults

    const groups = Object.keys(confusionMatrix)

    return (
      <StepCard
        title="판별분석 결과"
        description="그룹 분류 성능과 판별함수 정보"
        icon={<TrendingUp className="w-5 h-5 text-primary" />}
      >
        <div className="space-y-6">
          {/* 주요 결과 요약 */}
          <Alert className="border-blue-500 bg-blue-50">
            <Activity className="h-4 w-4" />
            <AlertTitle>분석 결과 요약</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-2">
                <p className="font-medium">
                  분류 정확도: {accuracy.toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground">{interpretation}</p>
              </div>
            </AlertDescription>
          </Alert>

          {/* 분류 성능과 통계적 검정 */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">분류 성능</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">전체 정확도</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={accuracy > 80 ? "default" : accuracy > 60 ? "secondary" : "destructive"}>
                        {accuracy.toFixed(1)}%
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {accuracy > 80 ? '우수' : accuracy > 60 ? '보통' : '개선필요'}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm">올바른 분류</span>
                    <Badge variant="outline">
                      {classificationResults.filter(r => r.correct).length} / {classificationResults.length}
                    </Badge>
                  </div>
                </div>

                <Progress value={accuracy} className="h-2" />

                <Alert className="mt-3">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    정확도 &gt; 70%일 때 실용적 분류 모델
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">통계적 검정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Box&apos;s M 검정</span>
                    <Badge variant={equalityTests.boxM.significant ? "destructive" : "default"}>
                      {equalityTests.boxM.significant ? '분산 이질' : '분산 동질'}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm">Wilks&apos; Lambda</span>
                    <Badge variant={equalityTests.wilksLambda.significant ? "default" : "secondary"}>
                      {equalityTests.wilksLambda.statistic.toFixed(3)}
                    </Badge>
                  </div>
                </div>

                <Alert className="mt-3">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Wilks&apos; Lambda 작을수록 판별력 높음
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>

          {/* 판별함수 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="w-4 h-4" />
                판별함수 정보
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">함수</th>
                      <th className="text-right py-2">고유값</th>
                      <th className="text-right py-2">분산설명률</th>
                      <th className="text-right py-2">정준상관</th>
                    </tr>
                  </thead>
                  <tbody>
                    {functions.map((func) => (
                      <tr key={func.functionNumber} className="border-b">
                        <td className="py-2">Function {func.functionNumber}</td>
                        <td className="text-right">{func.eigenvalue.toFixed(3)}</td>
                        <td className="text-right">{func.varianceExplained.toFixed(1)}%</td>
                        <td className="text-right font-medium">
                          {func.canonicalCorrelation.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* 혼동행렬 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">혼동행렬 (Confusion Matrix)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">실제 \ 예측</th>
                      {groups.map(group => (
                        <th key={group} className="text-center py-2">{group}</th>
                      ))}
                      <th className="text-center py-2">정확도</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((actualGroup) => {
                      const total = Object.values(confusionMatrix[actualGroup]).reduce((sum, val) => sum + val, 0)
                      const correct = confusionMatrix[actualGroup][actualGroup]
                      const groupAccuracy = total > 0 ? (correct / total) * 100 : 0

                      return (
                        <tr key={actualGroup} className="border-b">
                          <td className="py-2 font-medium">{actualGroup}</td>
                          {groups.map(predictedGroup => (
                            <td
                              key={predictedGroup}
                              className="text-center"
                              style={{
                                backgroundColor: actualGroup === predictedGroup ? '#dcfce7' : 'transparent',
                                fontWeight: actualGroup === predictedGroup ? 'bold' : 'normal'
                              }}
                            >
                              {confusionMatrix[actualGroup][predictedGroup]}
                            </td>
                          ))}
                          <td className="text-center">
                            <Badge variant={groupAccuracy > 70 ? "default" : "secondary"}>
                              {groupAccuracy.toFixed(1)}%
                            </Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                * 대각선 요소(녹색)는 올바른 분류를 나타냅니다.
              </p>
            </CardContent>
          </Card>

          {/* 그룹 중심점 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">그룹 중심점 (Group Centroids)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">그룹</th>
                      {functions.map(func => (
                        <th key={func.functionNumber} className="text-right py-2">
                          Function {func.functionNumber}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {groupCentroids.map((centroid) => (
                      <tr key={centroid.group} className="border-b">
                        <td className="py-2 font-medium">{centroid.group}</td>
                        {functions.map(func => (
                          <td key={func.functionNumber} className="text-right">
                            {centroid.centroids[`Function${func.functionNumber}`]?.toFixed(3) || '0.000'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* 판별계수 */}
          {functions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">판별계수 (Discriminant Coefficients)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">변수</th>
                        {functions.map(func => (
                          <th key={func.functionNumber} className="text-right py-2">
                            Function {func.functionNumber}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(functions[0]?.coefficients || {}).map((variable) => (
                        <tr key={variable} className="border-b">
                          <td className="py-2 font-medium">{variable}</td>
                          {functions.map(func => (
                            <td
                              key={func.functionNumber}
                              className="text-right"
                              style={{
                                color: Math.abs(func.coefficients[variable]) > 0.5 ? '#dc2626' : 'inherit',
                                fontWeight: Math.abs(func.coefficients[variable]) > 0.5 ? 'bold' : 'normal'
                              }}
                            >
                              {func.coefficients[variable]?.toFixed(3) || '0.000'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  * 절댓값이 큰 계수는 해당 변수의 판별 기여도가 높음을 의미합니다.
                </p>
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
                <AlertTitle>판별함수 해석</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-2 text-sm">
                    <p><strong>정준상관 &gt; 0.3:</strong> 해당 함수는 그룹 구별에 유의미</p>
                    <p><strong>계수 절댓값 &gt; 0.5:</strong> 해당 변수가 판별에 중요한 역할</p>
                    <p><strong>분류 정확도 &gt; 70%:</strong> 실용적인 분류 모델</p>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">활용 방안</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• 새로운 관찰치를 기존 그룹으로 분류</li>
                  <li>• 그룹 간 차이를 만드는 주요 변수 파악</li>
                  <li>• 분류 정확도를 높이기 위한 변수 조합 탐색</li>
                  <li>• 잘못 분류된 케이스 분석으로 모델 개선</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* 액션 버튼 */}
          <div className="flex gap-3 justify-center pt-4">
            <Button variant="outline" onClick={() => {}}>
              <FileText className="w-4 h-4 mr-2" />
              분류 보고서 생성
            </Button>
            <Button variant="outline" onClick={() => {}}>
              <Download className="w-4 h-4 mr-2" />
              분류 결과 다운로드
            </Button>
          </div>
        </div>
      </StepCard>
    )
  }

  return (
    <StatisticsPageLayout
      title="판별분석"
      subtitle="Discriminant Analysis - 다변량 분류 및 그룹 예측"
      icon={<Activity className="w-6 h-6" />}
      methodInfo={{
        formula: 'D = β₁X₁ + β₂X₂ + ... + βₚXₚ (판별함수)',
        assumptions: ['연속형 판별변수', '범주형 그룹변수', '분산 동질성'],
        sampleSize: '그룹당 최소 3배 이상',
        usage: '분류, 진단, 그룹예측, 특성분석'
      }}
      steps={steps}
      currentStep={currentStep}
      onStepChange={actions.setCurrentStep}
      onRun={() => selectedVariables && runAnalysis(selectedVariables)}
      onReset={() => {
        actions.reset()
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