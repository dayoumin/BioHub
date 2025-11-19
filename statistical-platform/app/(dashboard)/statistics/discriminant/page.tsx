'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { DiscriminantVariables } from '@/types/statistics'
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
  Layers,
  CheckCircle2
} from 'lucide-react'

import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { PValueBadge } from '@/components/statistics/common/PValueBadge'
import { EffectSizeCard } from '@/components/statistics/common/EffectSizeCard'
import type { Step as TwoPanelStep } from '@/components/statistics/layouts/TwoPanelLayout'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import type { UploadedData } from '@/hooks/use-statistics-page'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { createDataUploadHandler } from '@/lib/utils/statistics-handlers'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'

// 데이터 인터페이스
// 로컬 인터페이스 제거: types/statistics.ts의 DiscriminantVariables 사용
// interface VariableSelection {
//   dependentVariable: string
//   independentVariables: string[]
// }

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
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('discriminant')
  }, [])

  // Use statistics page hook
  const { state, actions } = useStatisticsPage<DiscriminantResult, DiscriminantVariables>({
    withUploadedData: true,
    withError: true,
    initialStep: 0
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state

  // Breadcrumbs
  const breadcrumbs = useMemo(() => [
    { label: '홈', href: '/' },
    { label: '판별분석' }
  ], [])

  // STEPS 정의 (Batch 3 표준)
  const STEPS: TwoPanelStep[] = useMemo(() => [
    { id: 0, label: '방법 소개' },
    { id: 1, label: '데이터 업로드' },
    { id: 2, label: '변수 선택' },
    { id: 3, label: '분석 결과' }
  ], [])

  const handleDataUpload = createDataUploadHandler(
    actions.setUploadedData,
    () => {
      actions.setCurrentStep(2)
    },
    'discriminant'
  )

  // Discriminant analysis using PyodideCore (Worker 4)
  const runAnalysis = useCallback(async (variables: DiscriminantVariables) => {
    if (!uploadedData?.data) {
      actions.setError?.('데이터를 먼저 업로드해주세요.')
      return
    }

    if (!variables.dependent || variables.independent.length === 0) {
      actions.setError?.('종속변수와 독립변수를 모두 선택해주세요.')
      return
    }

    actions.startAnalysis?.()

    try {
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      // Prepare data: extract groups and numeric data matrix
      const validData = uploadedData.data.filter(row =>
        row[variables.dependent] &&
        variables.independent.every(variable =>
          row[variable] !== null && row[variable] !== undefined && !isNaN(Number(row[variable]))
        )
      )

      if (validData.length === 0) {
        actions.setError?.('유효한 데이터가 없습니다.')
        return
      }

      const groups = validData.map(row => String(row[variables.dependent]))
      const dataMatrix = validData.map(row =>
        variables.independent.map(v => Number(row[v]) || 0)
      )

      // Call Worker 4 discriminant_analysis method
      const result = await pyodideCore.callWorkerMethod<DiscriminantResult>(
        PyodideWorker.RegressionAdvanced,
        'discriminant_analysis',
        {
          data: dataMatrix,
          groups: groups
        }
      )

      actions.completeAnalysis?.(result, 3)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '판별분석 중 오류가 발생했습니다.'
      console.error('[discriminant] Analysis error:', errorMessage)
      actions.setError?.(errorMessage)
    }
  }, [uploadedData, actions])


  // 종속변수 선택 핸들러 (Badge 클릭)
  const handleDependentSelect = useCallback((varName: string) => {
    actions.setSelectedVariables?.({
      dependent: varName,
      independent: selectedVariables?.independent ?? []
    })
    // ❌ NO setCurrentStep here - Critical Bug 예방!
  }, [selectedVariables, actions])

  // 독립변수 선택 핸들러 (Badge 클릭)
  const handleIndependentSelect = useCallback((varName: string) => {
    const current = selectedVariables?.independent ?? []
    const newIndependent = current.includes(varName)
      ? current.filter(v => v !== varName)
      : [...current, varName]
    actions.setSelectedVariables?.({
      dependent: selectedVariables?.dependent ?? '',
      independent: newIndependent
    })
    // ❌ NO setCurrentStep here - Critical Bug 예방!
  }, [selectedVariables, actions])

  // 다음 단계 핸들러 (setCurrentStep + runAnalysis)
  const handleNextStep = useCallback(async () => {
    if (!selectedVariables?.dependent || !selectedVariables?.independent || selectedVariables.independent.length < 2) {
      actions.setError?.('종속변수 1개와 독립변수 2개 이상을 선택해주세요.')
      return
    }
    actions.setCurrentStep?.(3)
    await runAnalysis(selectedVariables)
  }, [selectedVariables, actions, runAnalysis])

  const renderMethodIntroduction = useCallback(() => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">판별분석 개요</h3>
        <p className="text-sm text-muted-foreground">
          여러 개의 연속형 변수를 사용하여 그룹을 구별하고 새로운 관찰치를 가장 적합한 그룹으로 분류하는 통계 기법입니다.
        </p>
      </div>

      <div>
        <h4 className="text-base font-semibold mb-2">주요 가정</h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>판별변수는 연속형 (최소 1개 이상)</li>
          <li>그룹 변수는 범주형 (2개 이상 그룹)</li>
          <li>각 그룹의 충분한 표본 크기</li>
          <li>그룹 간 분산-공분산 행렬의 동질성</li>
        </ul>
      </div>

      <div>
        <h4 className="text-base font-semibold mb-2">활용 방법</h4>
        <p className="text-sm text-muted-foreground">
          고객 세분화, 의료 진단 분류, 품질 등급 분류, 신용 위험 평가, 종 구분 및 분류 등에 활용됩니다.
        </p>
      </div>
    </div>
  ), [])

  const renderDataUpload = useCallback(() => (
    <DataUploadStep
      onUploadComplete={handleDataUpload}
      onPrevious={() => actions.setCurrentStep?.(0)}
      onNext={() => actions.setCurrentStep?.(2)}
    />
  ), [handleDataUpload, actions])

  const renderVariableSelection = useCallback(() => {
    if (!uploadedData) return null

    return (
      <div className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>변수 선택 가이드</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1 text-sm">
              <p>• <strong>종속변수 (그룹):</strong> 분류하고자 하는 범주형 변수 1개 (2개 이상 그룹)</p>
              <p>• <strong>독립변수 (판별):</strong> 그룹을 구별하는데 사용할 연속형 변수 2개 이상</p>
              <p>• 그룹별로 충분한 관측치가 있는지 확인하세요</p>
            </div>
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-2">종속변수 (그룹 변수, 1개 선택)</h4>
            <div className="flex flex-wrap gap-2">
              {uploadedData.columns.map((column) => (
                <Badge
                  key={column}
                  variant={selectedVariables?.dependent === column ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => handleDependentSelect(column)}
                >
                  {selectedVariables?.dependent === column && (
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                  )}
                  {column}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">독립변수 (판별 변수, 2개 이상 선택)</h4>
            <div className="flex flex-wrap gap-2">
              {uploadedData.columns.map((column) => (
                <Badge
                  key={column}
                  variant={(selectedVariables?.independent ?? []).includes(column) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => handleIndependentSelect(column)}
                >
                  {(selectedVariables?.independent ?? []).includes(column) && (
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                  )}
                  {column}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => actions.setCurrentStep?.(1)}>
            이전
          </Button>
          <Button
            onClick={handleNextStep}
            disabled={
              !selectedVariables?.dependent ||
              !selectedVariables?.independent ||
              selectedVariables.independent.length < 2 ||
              isAnalyzing
            }
          >
            {isAnalyzing ? '분석 중...' : '다음 단계'}
          </Button>
        </div>
      </div>
    )
  }, [uploadedData, selectedVariables, error, isAnalyzing, handleDependentSelect, handleIndependentSelect, handleNextStep, actions])

  const renderResults = useCallback(() => {
    if (!results) return null

    const {
      functions,
      accuracy,
      confusionMatrix,
      groupCentroids,
      classificationResults,
      equalityTests,
      interpretation
    } = results

    const groups = Object.keys(confusionMatrix)

    return (
      <div className="space-y-6">
          {/* 주요 결과 요약 */}
          <Alert className="border-blue-500 bg-muted">
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
                    <div className="flex items-center gap-2">
                      <PValueBadge value={equalityTests.boxM.pValue} size="sm" />
                      <Badge variant={equalityTests.boxM.significant ? "destructive" : "default"}>
                        {equalityTests.boxM.significant ? '분산 이질' : '분산 동질'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm">Wilks&apos; Lambda</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{equalityTests.wilksLambda.statistic.toFixed(3)}</Badge>
                      <PValueBadge value={equalityTests.wilksLambda.pValue} size="sm" />
                    </div>
                  </div>
                </div>

                <Alert className="mt-3">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Wilks&apos; Lambda가 0에 가까울수록 판별력이 높습니다.
                    {equalityTests.wilksLambda.statistic < 0.5 ? ' (우수한 판별력)' :
                     equalityTests.wilksLambda.statistic < 0.8 ? ' (보통 판별력)' : ' (약한 판별력)'}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>

          {/* 판별함수 정보 */}
          <StatisticsTable
            title="판별함수 정보"
            columns={[
              { key: 'function', header: '함수', type: 'text' },
              { key: 'eigenvalue', header: '고유값', type: 'number', align: 'right' },
              { key: 'varianceExplained', header: '분산설명률', type: 'percentage', align: 'right' },
              { key: 'canonicalCorrelation', header: '정준상관', type: 'number', align: 'right',
                highlight: (value) => value > 0.5 ? 'positive' : value > 0.3 ? 'neutral' : null }
            ]}
            data={functions.map((func) => ({
              function: `Function ${func.functionNumber}`,
              eigenvalue: func.eigenvalue,
              varianceExplained: func.varianceExplained,
              canonicalCorrelation: func.canonicalCorrelation
            }))}
          />

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
          <StatisticsTable
            title="그룹 중심점 (Group Centroids)"
            columns={[
              { key: 'group', header: '그룹', type: 'text' },
              ...functions.map(func => ({
                key: `func${func.functionNumber}`,
                header: `Function ${func.functionNumber}`,
                type: 'number' as const,
                align: 'right' as const
              }))
            ]}
            data={groupCentroids.map((centroid) => ({
              group: centroid.group,
              ...functions.reduce((acc, func) => ({
                ...acc,
                [`func${func.functionNumber}`]: centroid.centroids[`Function${func.functionNumber}`] || 0
              }), {})
            }))}
          />

          {/* 판별계수 */}
          {functions.length > 0 && (
            <StatisticsTable
              title="판별계수 (Discriminant Coefficients)"
              description="절댓값이 큰 계수는 해당 변수의 판별 기여도가 높음을 의미합니다."
              columns={[
                { key: 'variable', header: '변수', type: 'text' },
                ...functions.map(func => ({
                  key: `func${func.functionNumber}`,
                  header: `Function ${func.functionNumber}`,
                  type: 'number' as const,
                  align: 'right' as const,
                  highlight: (value: number) => Math.abs(value) > 0.5 ? 'negative' : null
                }))
              ]}
              data={Object.keys(functions[0]?.coefficients || {}).map((variable) => ({
                variable,
                ...functions.reduce((acc, func) => ({
                  ...acc,
                  [`func${func.functionNumber}`]: func.coefficients[variable] || 0
                }), {})
              }))}
            />
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

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">활용 방안</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
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
    )
  }, [results])

  return (
    <TwoPanelLayout
      analysisTitle="판별분석"
      analysisSubtitle="Discriminant Analysis - 다변량 분류 및 그룹 예측"
      breadcrumbs={breadcrumbs}
      currentStep={currentStep}
      steps={STEPS}
      onStepChange={(step: number) => actions.setCurrentStep?.(step)}
      bottomPreview={uploadedData && currentStep >= 1 ? {
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