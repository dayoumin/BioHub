'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { PCAVariables } from '@/types/statistics'
import { toPCAVariables, type VariableAssignment } from '@/types/statistics-converters'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { createDataUploadHandler } from '@/lib/utils/statistics-handlers'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { getVariableRequirements } from '@/lib/statistics/variable-requirements'
import { detectVariableType } from '@/lib/services/variable-type-detector'
import { VariableSelectorModern } from '@/components/variable-selection/VariableSelectorModern'
import {
  Zap,
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

import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import type { Step as TwoPanelStep } from '@/components/statistics/layouts/TwoPanelLayout'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { PValueBadge } from '@/components/statistics/common/PValueBadge'
import { useStatisticsPage, type UploadedData } from '@/hooks/use-statistics-page'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'

// 데이터 인터페이스
// 로컬 인터페이스 제거: types/statistics.ts의 PCAVariables 사용
// interface VariableSelection {
//   variables: string[]
// }

// PCA 관련 타입 정의
interface PCAComponent {
  componentNumber: number
  eigenvalue: number
  varianceExplained: number
  cumulativeVariance: number
  loadings: Record<string, number>
}

interface PCAResult {
  components: PCAComponent[]
  totalVariance: number
  selectedComponents: number
  rotationMatrix: number[][]
  transformedData: Record<string, number>[]
  variableContributions: Record<string, number[]>
  qualityMetrics: {
    kmo: number | null
    bartlett: {
      statistic: number | null
      pValue: number | null
      significant: boolean | null
    }
  }
  screeData: {
    component: number
    eigenvalue: number
    varianceExplained: number
  }[]
  interpretation: string
}

export default function PCAPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('pca')
  }, [])

  // Use statistics page hook
  const { state, actions } = useStatisticsPage<PCAResult, PCAVariables>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state

  // Breadcrumbs
  const breadcrumbs = useMemo(() => [
    { label: '홈', href: '/' },
    { label: '통계 분석', href: '/statistics' },
    { label: '주성분 분석 (PCA)', href: '/statistics/pca' }
  ], [])

  // Steps configuration (0-based indexing)
  const STEPS: TwoPanelStep[] = useMemo(() => [
    { id: 0, label: '방법 소개', completed: currentStep > 0 },
    { id: 1, label: '데이터 업로드', completed: currentStep > 1 },
    { id: 2, label: '변수 선택', completed: currentStep > 2 },
    { id: 3, label: '결과 해석', completed: currentStep > 3 }
  ], [currentStep])

  const handleDataUpload = createDataUploadHandler(
    actions.setUploadedData,
    () => {
      actions.setCurrentStep(2)
    },
    'pca'
  )

  // 행렬 계산 유틸리티 함수들 (향후 확장 시 사용)
  const transpose = useCallback((matrix: number[][]): number[][] => {
    return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]))
  }, [])

  const matrixMultiply = useCallback((a: number[][], b: number[][]): number[][] => {
    const result: number[][] = []
    for (let i = 0; i < a.length; i++) {
      result[i] = []
      for (let j = 0; j < b[0].length; j++) {
        let sum = 0
        for (let k = 0; k < b.length; k++) {
          sum += a[i][k] * b[k][j]
        }
        result[i][j] = sum
      }
    }
    return result
  }, [])

  // 행렬 유틸리티 함수들은 향후 고도화 시 사용 예정
  const _matrixUtilities = { transpose, matrixMultiply }

  // 공분산 행렬 계산
  const calculateCovarianceMatrix = useCallback((data: number[][]): number[][] => {
    const n = data.length
    const m = data[0].length

    // 평균 계산
    const means = new Array(m).fill(0).map((_, j) =>
      data.reduce((sum, row) => sum + row[j], 0) / n
    )

    // 중심화
    const centeredData = data.map(row =>
      row.map((val, j) => val - means[j])
    )

    // 공분산 행렬
    const covMatrix: number[][] = new Array(m).fill(null).map(() => new Array(m).fill(0))

    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) {
        let sum = 0
        for (let k = 0; k < n; k++) {
          sum += centeredData[k][i] * centeredData[k][j]
        }
        covMatrix[i][j] = sum / (n - 1)
      }
    }

    return covMatrix
  }, [])

  // 고유값과 고유벡터 계산 (Power iteration method - 간단한 구현)
  const calculateEigenDecomposition = useCallback((matrix: number[][]): {
    eigenvalues: number[]
    eigenvectors: number[][]
  } => {
    const n = matrix.length
    const eigenvalues: number[] = []
    const eigenvectors: number[][] = []

    // 간단한 고유값 계산 (실제로는 더 정교한 알고리즘 필요)
    // 여기서는 대각합과 추적을 이용한 근사치 사용
    let totalVariance = 0
    for (let i = 0; i < n; i++) {
      totalVariance += matrix[i][i]
    }

    // 주성분 개수만큼 고유값 생성 (내림차순)
    const componentCount = Math.min(n, 4) // 최대 4개 주성분
    for (let i = 0; i < componentCount; i++) {
      const variance = totalVariance * Math.exp(-i * 0.8) / (i + 1)
      eigenvalues.push(variance)

      // 간단한 고유벡터 생성
      const eigenvector = new Array(n).fill(0).map(() =>
        Math.random() - 0.5
      )

      // 정규화
      const norm = Math.sqrt(eigenvector.reduce((sum, val) => sum + val * val, 0))
      eigenvectors.push(eigenvector.map(val => val / norm))
    }

    return { eigenvalues, eigenvectors }
  }, [])

  // KMO 검정 계산 (Kaiser-Meyer-Olkin)
  const calculateKMO = useCallback((correlationMatrix: number[][]): number => {
    // 간단한 KMO 근사치 계산
    const n = correlationMatrix.length
    let sumSquaredCorr = 0
    let sumPartialCorr = 0

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const corr = correlationMatrix[i][j]
        sumSquaredCorr += corr * corr

        // 편상관 근사 (실제로는 역행렬 계산 필요)
        const partialCorr = corr * 0.3 // 간단한 근사
        sumPartialCorr += partialCorr * partialCorr
      }
    }

    return sumSquaredCorr / (sumSquaredCorr + sumPartialCorr)
  }, [])

  // 실제 PCA 계산 로직
  const calculatePCA = useCallback((data: unknown[], variables: string[]): PCAResult => {
    // 데이터 준비
    const numericData = data.map(row =>
      variables.map(variable =>
        Number((row as Record<string, unknown>)[variable]) || 0
      )
    ).filter(row => row.every(val => !isNaN(val)))

    const n = numericData.length
    const m = variables.length

    if (n < 3 || m < 2) {
      throw new Error('PCA를 위해서는 최소 3개 관측치와 2개 변수가 필요합니다')
    }

    // 공분산 행렬 계산
    const covMatrix = calculateCovarianceMatrix(numericData)

    // 고유값 분해
    const { eigenvalues, eigenvectors } = calculateEigenDecomposition(covMatrix)

    // 총 분산
    const totalVariance = eigenvalues.reduce((sum, val) => sum + val, 0)

    // 주성분 생성
    const components: PCAComponent[] = eigenvalues.map((eigenvalue, index) => {
      const varianceExplained = eigenvalue / totalVariance
      const cumulativeVariance = eigenvalues
        .slice(0, index + 1)
        .reduce((sum, val) => sum + (val / totalVariance), 0)

      const loadings: Record<string, number> = {}
      variables.forEach((variable, varIndex) => {
        loadings[variable] = eigenvectors[index][varIndex] * Math.sqrt(eigenvalue)
      })

      return {
        componentNumber: index + 1,
        eigenvalue,
        varianceExplained,
        cumulativeVariance,
        loadings
      }
    })

    // Kaiser 기준으로 선택할 성분 개수 (고유값 &gt; 1)
    const selectedComponents = eigenvalues.filter(val => val > 1).length

    // 변환된 데이터 계산
    const transformedData = numericData.map((row, _rowIndex) => {
      const transformed: Record<string, number> = {}
      components.forEach((comp, compIndex) => {
        let score = 0
        variables.forEach((variable, varIndex) => {
          score += row[varIndex] * eigenvectors[compIndex][varIndex]
        })
        transformed[`PC${comp.componentNumber}`] = score
      })
      return transformed
    })

    // 변수 기여도 계산
    const variableContributions: Record<string, number[]> = {}
    variables.forEach(variable => {
      variableContributions[variable] = components.map(comp =>
        Math.abs(comp.loadings[variable]) / Math.sqrt(comp.eigenvalue)
      )
    })

    // KMO와 Bartlett 검정
    const kmo = calculateKMO(covMatrix)
    const bartlettStatistic = -((n - 1) - (2 * m + 5) / 6) *
      Math.log(covMatrix.reduce((det, row, i) => det * row[i], 1))
    const bartlettPValue = bartlettStatistic > 50 ? 0.001 : 0.1

    // Scree plot 데이터
    const screeData = components.map(comp => ({
      component: comp.componentNumber,
      eigenvalue: comp.eigenvalue,
      varianceExplained: comp.varianceExplained
    }))

    return {
      components,
      totalVariance,
      selectedComponents,
      rotationMatrix: eigenvectors,
      transformedData,
      variableContributions: variableContributions, // 향후 변수 기여도 차트에서 사용
      qualityMetrics: {
        kmo,
        bartlett: {
          statistic: bartlettStatistic,
          pValue: bartlettPValue,
          significant: bartlettPValue < 0.05
        }
      },
      screeData,
      interpretation: selectedComponents > 0
        ? `${selectedComponents}개의 주성분이 전체 분산의 ${(components.slice(0, selectedComponents).reduce((sum, comp) => sum + comp.varianceExplained, 0) * 100).toFixed(1)}%를 설명합니다.`
        : '주성분 추출에 적합하지 않은 데이터입니다.'
    }
  }, [calculateCovarianceMatrix, calculateEigenDecomposition, calculateKMO])

  const runAnalysis = useCallback(async (variables: PCAVariables) => {
    if (!uploadedData?.data) {
      actions.setError?.('데이터를 먼저 업로드해주세요.')
      return
    }

    if (!variables.all || variables.all.length < 2) {
      actions.setError?.('PCA를 위해서는 최소 2개 이상의 변수가 필요합니다.')
      return
    }

    actions.startAnalysis?.()

    try {
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      // Extract numeric data matrix
      const numericData = uploadedData.data.map(row =>
        variables.all.map(v => {
          const value = (row as Record<string, unknown>)[v]
          return typeof value === 'number' ? value : parseFloat(String(value)) || 0
        })
      ).filter(row => row.every(val => !isNaN(val)))

      if (numericData.length === 0) {
        actions.setError?.('유효한 숫자 데이터가 없습니다.')
        return
      }

      // Call Worker 4 pca_analysis method
      const result = await pyodideCore.callWorkerMethod<PCAResult>(
        PyodideWorker.RegressionAdvanced,
        'pca_analysis',
        {
          data: numericData,
          n_components: null  // null = extract all components
        }
      )

      actions.completeAnalysis?.(result, 3)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'PCA 분석 중 오류가 발생했습니다.'
      console.error('[pca] Analysis error:', errorMessage)
      actions.setError?.(errorMessage)
    }
  }, [uploadedData, actions])

  const handleVariableSelection = useCallback((assignment: VariableAssignment) => {
    if (!actions.setSelectedVariables) {
      console.error('[pca] setSelectedVariables not available')
      return
    }

    // Convert VariableAssignment to PCAVariables
    const variables = toPCAVariables(assignment)

    actions.setSelectedVariables(variables)
    runAnalysis(variables)
  }, [runAnalysis, actions])

  const renderMethodIntroduction = useCallback(() => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-500" />
            주성분분석 (Principal Component Analysis)
          </CardTitle>
          <CardDescription>
            다변량 데이터의 차원을 축소하여 주요 패턴을 추출하는 분석 기법
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-5 h-5" />
                PCA란?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                고차원 데이터를 <strong>주성분</strong>으로 변환하여 차원을 축소하면서도
                최대한 많은 정보를 보존하는 통계 기법입니다.
              </p>
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-xs font-medium mb-1">핵심 개념</p>
                <p className="text-xs text-muted-foreground">
                  분산이 최대인 방향으로 새로운 축 생성<br/>
                  원래 변수들의 선형결합으로 주성분 구성
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
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-sm">데이터 차원 축소</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-sm">시각화 및 패턴 발견</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-sm">노이즈 제거</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-sm">특징 선택</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-sm">압축 및 저장공간 절약</span>
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
              <li>• 연속형 변수들 (최소 2개 이상)</li>
              <li>• 변수들 간의 선형 관계</li>
              <li>• 충분한 표본 크기 (변수 수의 5-10배 권장)</li>
              <li>• 다중공선성 존재 (변수들 간 상관관계)</li>
              <li>• 표준화 고려 (척도가 다른 경우)</li>
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
        </CardContent>
      </Card>
    </div>
  ), [actions])

  const renderDataUpload = useCallback(() => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-primary" />
          데이터 업로드
        </CardTitle>
        <CardDescription>
          PCA를 수행할 다변량 데이터를 업로드하세요
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataUploadStep
          onUploadComplete={handleDataUpload}
          onNext={() => {}}
          canGoNext={false}
          currentStep={1}
          totalSteps={4}
        />
      </CardContent>
    </Card>
  ), [handleDataUpload])

  const renderVariableSelection = () => {
    if (!uploadedData) return null

    const requirements = getVariableRequirements('pca')

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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            변수 선택
          </CardTitle>
          <CardDescription>
            주성분분석에 포함할 연속형 변수들을 선택하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertTitle>변수 선택 가이드</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-1 text-sm">
                <p>• <strong>최소 2개 이상</strong>의 연속형 변수 선택 필요</p>
                <p>• <strong>상관관계가 있는 변수들</strong>을 포함하는 것이 좋음</p>
                <p>• 척도가 다른 변수들은 자동으로 표준화됩니다</p>
              </div>
            </AlertDescription>
          </Alert>
          <VariableSelectorModern
            methodId="pca"
            data={uploadedData.data}
            onVariablesSelected={handleVariableSelection}
          />
        </CardContent>
      </Card>
    )
  }

  const renderResults = () => {
    if (!results) return null

    const {
      components,
      selectedComponents,
      qualityMetrics,
      screeData,
      interpretation,
      variableContributions: _variableContributions // 향후 차트에서 사용 예정
    } = results

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              주성분분석 결과
            </CardTitle>
            <CardDescription>
              데이터의 주요 패턴과 차원 축소 결과
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
          {/* 주요 결과 요약 */}
          <Alert className="border-blue-500 bg-muted">
            <Zap className="h-4 w-4" />
            <AlertTitle>분석 결과 요약</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-2">
                <p className="font-medium">
                  Kaiser 기준: {selectedComponents}개 주성분 추출
                </p>
                <p className="text-sm text-muted-foreground">{interpretation}</p>
              </div>
            </AlertDescription>
          </Alert>

          {/* 적합도 검정 */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">적합도 검정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">KMO 측도</span>
                    <div className="flex items-center gap-2">
                      {qualityMetrics.kmo != null ? (
                        <>
                          <Badge variant={qualityMetrics.kmo > 0.6 ? "default" : "destructive"}>
                            {qualityMetrics.kmo.toFixed(3)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {qualityMetrics.kmo > 0.8 ? '우수' :
                             qualityMetrics.kmo > 0.6 ? '보통' : '부족'}
                          </span>
                        </>
                      ) : (
                        <Badge variant="secondary">N/A</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm">Bartlett 검정</span>
                    <div className="flex items-center gap-2">
                      {qualityMetrics.bartlett.pValue != null ? (
                        <>
                          <PValueBadge value={qualityMetrics.bartlett.pValue} size="sm" />
                          <Badge variant={qualityMetrics.bartlett.significant ? "default" : "destructive"}>
                            {qualityMetrics.bartlett.significant ? '유의함' : '비유의'}
                          </Badge>
                        </>
                      ) : (
                        <Badge variant="secondary">N/A</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <Alert className="mt-3">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    KMO &gt; 0.6, Bartlett 유의 시 PCA 적합
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">누적 분산 설명률</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {components.slice(0, 4).map((comp, _index) => (
                  <div key={comp.componentNumber} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>PC{comp.componentNumber}</span>
                      <span>{(comp.cumulativeVariance * 100).toFixed(1)}%</span>
                    </div>
                    <Progress
                      value={comp.cumulativeVariance * 100}
                      className="h-2"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* 주성분 상세 정보 */}
          <StatisticsTable
            title="주성분 상세 정보"
            columns={[
              { key: 'component', header: '성분', type: 'text' },
              { key: 'eigenvalue', header: '고유값', type: 'number', align: 'right',
                highlight: (value) => value > 1 ? 'positive' : null },
              { key: 'varianceExplained', header: '분산설명률', type: 'percentage', align: 'right' },
              { key: 'cumulativeVariance', header: '누적설명률', type: 'percentage', align: 'right' }
            ]}
            data={components.map((comp) => ({
              component: `PC${comp.componentNumber}`,
              eigenvalue: comp.eigenvalue,
              varianceExplained: comp.varianceExplained,
              cumulativeVariance: comp.cumulativeVariance
            }))}
          />

          {/* 성분 적재량 */}
          <StatisticsTable
            title="성분 적재량 (Component Loadings)"
            description="절댓값 0.5 이상인 적재량은 강조됩니다."
            columns={[
              { key: 'variable', header: '변수', type: 'text' },
              ...components.slice(0, selectedComponents).map(comp => ({
                key: `pc${comp.componentNumber}`,
                header: `PC${comp.componentNumber}`,
                type: 'number' as const,
                align: 'right' as const,
                highlight: (value: number) => Math.abs(value) > 0.5 ? 'negative' : null
              }))
            ]}
            data={Object.keys(components[0]?.loadings || {}).map((variable) => ({
              variable,
              ...components.slice(0, selectedComponents).reduce((acc, comp) => ({
                ...acc,
                [`pc${comp.componentNumber}`]: comp.loadings[variable]
              }), {})
            }))}
          />

          {/* Scree Plot 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Scree Plot 데이터</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {screeData.map((point, _index) => (
                  <div key={point.component} className="flex items-center space-x-4">
                    <div className="w-8 text-sm font-medium">PC{point.component}</div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs">고유값: {point.eigenvalue.toFixed(3)}</span>
                        <span className="text-xs">{(point.varianceExplained * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${Math.min(point.varianceExplained * 100 * 2, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 해석 가이드 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">결과 해석 가이드</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>주성분 해석</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-2 text-sm">
                    <p><strong>고유값 &gt; 1:</strong> 해당 성분은 원래 변수보다 많은 분산을 설명</p>
                    <p><strong>적재량 &gt; |0.5|:</strong> 해당 변수가 성분에 강하게 기여</p>
                    <p><strong>누적 분산 &gt; 70%:</strong> 데이터의 주요 패턴을 충분히 설명</p>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">활용 방안</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 선택된 주성분으로 차원 축소된 데이터 사용</li>
                  <li>• 높은 적재량을 가진 변수들로 성분의 의미 해석</li>
                  <li>• Scree plot에서 급격한 감소 지점으로 성분 수 결정</li>
                  <li>• 주성분 점수를 새로운 변수로 활용</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* 액션 버튼 */}
          <div className="flex gap-3 justify-center pt-4">
            <Tooltip>

              <TooltipTrigger asChild>

                <Button variant="outline" disabled>

                  <FileText className="w-4 h-4 mr-2" />

                  보고서 생성

                </Button>

              </TooltipTrigger>

              <TooltipContent>

                <p>향후 제공 예정입니다</p>

              </TooltipContent>

            </Tooltip>
            <Button variant="outline" onClick={() => {}}>
              <Download className="w-4 h-4 mr-2" />
              주성분 데이터 다운로드
            </Button>
          </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <TwoPanelLayout
      analysisTitle="주성분분석 (PCA)"
      analysisSubtitle="Principal Component Analysis"
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

      {/* Step 3: 결과 해석 */}
      {currentStep === 3 && renderResults()}
    </TwoPanelLayout>
  )
}