'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { ClusterVariables } from '@/types/statistics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle, XCircle, Users, Target, Zap, BarChart3, Activity, CheckCircle2 } from 'lucide-react'
import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import type { Step as TwoPanelStep } from '@/components/statistics/layouts/TwoPanelLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { useStatisticsPage, type UploadedData } from '@/hooks/use-statistics-page'
import { createDataUploadHandler } from '@/lib/utils/statistics-handlers'
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'

// 군집분석 결과 인터페이스
interface ClusterAnalysisResult {
  method: 'kmeans' | 'hierarchical'
  numClusters: number
  clusterAssignments: number[]
  centroids?: number[][]
  inertia?: number
  silhouetteScore: number
  calinski_harabasz_score: number
  davies_bouldin_score: number
  withinClusterSumSquares: number[]
  totalWithinSS: number
  betweenClusterSS: number
  totalSS: number
  clusterSizes: number[]
  clusterStatistics: {
    cluster: number
    size: number
    centroid: number[]
    withinSS: number
    avgSilhouette: number
  }[]
  optimalK?: {
    elbow: number
    silhouette: number
    gap: number
  }
}

export default function ClusterAnalysisPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('cluster-analysis')
  }, [])

  // Use statistics page hook
  const { state, actions } = useStatisticsPage<ClusterAnalysisResult, ClusterVariables>({
    withUploadedData: true,
    withError: true,
    initialStep: 0
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state

  // Breadcrumbs
  const breadcrumbs = useMemo(() => [
    { label: '홈', href: '/' },
    { label: '군집분석' }
  ], [])

  // Page-specific state
  const [clusterMethod, setClusterMethod] = useState<'kmeans' | 'hierarchical'>('kmeans')
  const [numClusters, setNumClusters] = useState<number>(3)
  const [autoOptimalK, setAutoOptimalK] = useState<boolean>(true)
  const [linkageMethod, setLinkageMethod] = useState<'ward' | 'complete' | 'average' | 'single'>('ward')
  const [distanceMetric, setDistanceMetric] = useState<'euclidean' | 'manhattan' | 'cosine'>('euclidean')

  // STEPS 정의 (Batch 3 표준)
  const STEPS: TwoPanelStep[] = useMemo(() => [
    { id: 0, label: '방법 소개' },
    { id: 1, label: '데이터 업로드' },
    { id: 2, label: '변수 선택' },
    { id: 3, label: '분석 결과' }
  ], [])

  // 데이터 업로드 핸들러
  const handleDataUpload = createDataUploadHandler(
    actions.setUploadedData,
    () => {
      actions.setCurrentStep(2)
    },
    'cluster'
  )

  // 변수 선택 핸들러 (Badge 클릭)
  const handleVariableSelect = useCallback((varName: string) => {
    const current = selectedVariables?.all ?? []
    const newAll = current.includes(varName)
      ? current.filter(v => v !== varName)
      : [...current, varName]
    actions.setSelectedVariables?.({ all: newAll })
    // ❌ NO setCurrentStep here - Critical Bug 예방!
  }, [selectedVariables, actions])

  // 다음 단계 핸들러 (setCurrentStep + runAnalysis)
  const handleNextStep = useCallback(async () => {
    if (!selectedVariables?.all || selectedVariables.all.length < 2) {
      actions.setError?.('최소 2개 이상의 변수를 선택해주세요.')
      return
    }
    actions.setCurrentStep?.(3)
    await runAnalysis()
  }, [selectedVariables, actions])

  // 군집분석 실행 (Worker 4 사용)
  const runAnalysis = useCallback(async () => {
    if (!uploadedData?.data.length || !selectedVariables?.all || selectedVariables.all.length === 0) {
      actions.setError?.('데이터와 변수를 선택해주세요.')
      return
    }

    if (selectedVariables.all.length < 2) {
      actions.setError?.('최소 2개 이상의 변수를 선택해주세요.')
      return
    }

    actions.startAnalysis?.()

    try {
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      // Extract numeric data matrix
      const numericData = uploadedData.data.map(row =>
        selectedVariables.all.map(v => {
          const value = (row as Record<string, unknown>)[v]
          return typeof value === 'number' ? value : parseFloat(String(value)) || 0
        })
      ).filter(row => row.every(val => !isNaN(val)))

      if (numericData.length === 0) {
        actions.setError?.('유효한 숫자 데이터가 없습니다.')
        return
      }

      // Determine final number of clusters
      let finalNumClusters = numClusters

      // Note: Optimal K selection can be implemented in Worker 4 if needed
      // For now, use user-specified numClusters

      // Call Worker 4 cluster_analysis method
      const result = await pyodideCore.callWorkerMethod<ClusterAnalysisResult>(
        PyodideWorker.RegressionAdvanced,
        'cluster_analysis',
        {
          data: numericData,
          method: 'kmeans',
          num_clusters: finalNumClusters
        }
      )

      actions.completeAnalysis?.(result, 3)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.'
      console.error('[cluster] Analysis error:', errorMessage)
      actions.setError?.(errorMessage)
    }
  }, [uploadedData, selectedVariables, numClusters, actions])

  // 변수 선택 페이지
  const variableSelectionStep = useMemo(() => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">분석 변수 선택</h3>
        <p className="text-sm text-muted-foreground mb-4">
          군집분석에 사용할 연속형 변수들을 선택해주세요. (최소 2개 이상)
        </p>
      </div>

      {uploadedData?.data.length && (
        <div className="flex flex-wrap gap-2">
          {uploadedData.columns.map((column) => (
            <Badge
              key={column}
              variant={(selectedVariables?.all ?? []).includes(column) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => handleVariableSelect(column)}
            >
              {(selectedVariables?.all ?? []).includes(column) && (
                <CheckCircle2 className="mr-1 h-3 w-3" />
              )}
              {column}
            </Badge>
          ))}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Label htmlFor="method" className="text-base font-medium">군집분석 방법</Label>
          <Select value={clusterMethod} onValueChange={(value: 'kmeans' | 'hierarchical') => setClusterMethod(value)}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kmeans">K-means 군집분석</SelectItem>
              <SelectItem value="hierarchical">계층적 군집분석</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="autoOptimal"
            checked={autoOptimalK}
            onChange={(e) => setAutoOptimalK(e.target.checked)}
            className="rounded border-gray-300"
          />
          <Label htmlFor="autoOptimal" className="text-sm font-medium">
            최적 군집 수 자동 결정
          </Label>
        </div>

        {!autoOptimalK && (
          <div>
            <Label htmlFor="numClusters" className="text-base font-medium">군집 수</Label>
            <Input
              id="numClusters"
              type="number"
              min="2"
              max="10"
              value={numClusters}
              onChange={(e) => setNumClusters(parseInt(e.target.value) || 3)}
              className="mt-2"
            />
          </div>
        )}

        {clusterMethod === 'hierarchical' && (
          <>
            <div>
              <Label htmlFor="linkage" className="text-base font-medium">연결 방법</Label>
              <Select value={linkageMethod} onValueChange={(value: 'ward' | 'complete' | 'average' | 'single') => setLinkageMethod(value)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ward">Ward 방법</SelectItem>
                  <SelectItem value="complete">완전 연결</SelectItem>
                  <SelectItem value="average">평균 연결</SelectItem>
                  <SelectItem value="single">단일 연결</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="distance" className="text-base font-medium">거리 측정법</Label>
              <Select value={distanceMetric} onValueChange={(value: 'euclidean' | 'manhattan' | 'cosine') => setDistanceMetric(value)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="euclidean">유클리드 거리</SelectItem>
                  <SelectItem value="manhattan">맨하탄 거리</SelectItem>
                  <SelectItem value="cosine">코사인 거리</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>

      {error && (
        <Alert>
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => actions.setCurrentStep?.(2)}>
          이전
        </Button>
        <Button
          onClick={handleNextStep}
          disabled={(selectedVariables?.all ?? []).length < 2 || isAnalyzing}
        >
          {isAnalyzing ? '분석 중...' : '다음 단계'}
        </Button>
      </div>
    </div>
  ), [uploadedData, selectedVariables, clusterMethod, numClusters, autoOptimalK, linkageMethod, distanceMetric, error, isAnalyzing, handleVariableSelect, handleNextStep, actions])

  // 결과 해석 페이지
  const resultsStep = useMemo(() => {
    if (!results) return null

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">군집분석 결과</h3>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              K-means 군집분석
            </Badge>
            <Badge variant="outline">
              {results.numClusters}개 군집
            </Badge>
            <Badge variant="outline">
              {uploadedData?.data.length ?? 0}개 데이터 포인트
            </Badge>
          </div>
        </div>

        {/* 주요 결과 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">실루엣 스코어</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {results.silhouetteScore.toFixed(3)}
              </div>
              <p className="text-xs text-muted-foreground">
                {results.silhouetteScore > 0.5 ? '좋은 군집화' :
                 results.silhouetteScore > 0.25 ? '보통 군집화' : '약한 군집화'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Calinski-Harabasz 지수</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {results.calinski_harabasz_score.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                높을수록 좋은 군집화
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Davies-Bouldin 지수</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {results.davies_bouldin_score.toFixed(3)}
              </div>
              <p className="text-xs text-muted-foreground">
                낮을수록 좋은 군집화
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 탭 컨텐츠 */}
        <Tabs defaultValue="statistics" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="statistics">군집 통계</TabsTrigger>
            <TabsTrigger value="performance">성능 지표</TabsTrigger>
            <TabsTrigger value="interpretation">해석</TabsTrigger>
            <TabsTrigger value="visualization">시각화</TabsTrigger>
          </TabsList>

          <TabsContent value="statistics" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>군집별 상세 통계</CardTitle>
                <CardDescription>각 군집의 크기와 특성</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 px-4 py-2 text-left">군집</th>
                        <th className="border border-gray-200 px-4 py-2 text-left">크기</th>
                        <th className="border border-gray-200 px-4 py-2 text-left">비율(%)</th>
                        <th className="border border-gray-200 px-4 py-2 text-left">군집 내 제곱합</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.clusterStatistics.map((stat) => (
                        <tr key={stat.cluster}>
                          <td className="border border-gray-200 px-4 py-2">군집 {stat.cluster}</td>
                          <td className="border border-gray-200 px-4 py-2">{stat.size}</td>
                          <td className="border border-gray-200 px-4 py-2">
                            {((stat.size / (uploadedData?.data.length ?? 1)) * 100).toFixed(1)}%
                          </td>
                          <td className="border border-gray-200 px-4 py-2">
                            {stat.withinSS.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>분산 분해</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>총 제곱합 (TSS):</span>
                    <span className="font-mono">{results.totalSS.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>군집 간 제곱합 (BSS):</span>
                    <span className="font-mono">{results.betweenClusterSS.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>군집 내 제곱합 (WSS):</span>
                    <span className="font-mono">{results.totalWithinSS.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>설명 비율:</span>
                    <span className="font-mono">
                      {((results.betweenClusterSS / results.totalSS) * 100).toFixed(1)}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>군집 품질 지표</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>실루엣 스코어:</span>
                    <span className="font-mono">{results.silhouetteScore.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Calinski-Harabasz:</span>
                    <span className="font-mono">{results.calinski_harabasz_score.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Davies-Bouldin:</span>
                    <span className="font-mono">{results.davies_bouldin_score.toFixed(3)}</span>
                  </div>
                  {results.optimalK && (
                    <div className="border-t pt-2 space-y-2">
                      <div className="flex justify-between">
                        <span>최적 K (엘보우):</span>
                        <span className="font-mono">{results.optimalK.elbow}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>최적 K (실루엣):</span>
                        <span className="font-mono">{results.optimalK.silhouette}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="interpretation" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>결과 해석 및 권장사항</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">군집화 품질 평가</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      {results.silhouetteScore > 0.5 ? (
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      ) : results.silhouetteScore > 0.25 ? (
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span>
                        실루엣 스코어 {results.silhouetteScore.toFixed(3)}는{' '}
                        {results.silhouetteScore > 0.5 ? '매우 좋은' :
                         results.silhouetteScore > 0.25 ? '보통' : '약한'} 군집화를 의미합니다.
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      <span>
                        전체 분산의 {((results.betweenClusterSS / results.totalSS) * 100).toFixed(1)}%가
                        군집 간 차이로 설명됩니다.
                      </span>
                    </div>

                    {results.davies_bouldin_score < 1 && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        <span>
                          Davies-Bouldin 지수 {results.davies_bouldin_score.toFixed(3)}는
                          잘 분리된 군집을 나타냅니다.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">군집별 특성</h4>
                  <div className="space-y-2 text-sm">
                    {results.clusterStatistics.map((stat) => (
                      <div key={stat.cluster} className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>
                          군집 {stat.cluster}: {stat.size}개 데이터 포인트
                          ({((stat.size / (uploadedData?.data.length ?? 1)) * 100).toFixed(1)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">분석 방법론</h4>
                  <div className="text-sm space-y-1">
                    <p>• <strong>방법:</strong> K-means 군집분석</p>
                    <p>• <strong>군집 수:</strong> {results.numClusters}개</p>
                    <p>• <strong>변수:</strong> {selectedVariables?.all?.join(', ') ?? 'N/A'}</p>
                    {results.optimalK && (
                      <p>• <strong>최적화:</strong> 엘보우 방법과 실루엣 분석을 통한 최적 군집 수 결정</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="visualization" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>시각화 안내</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <p>
                    실제 구현에서는 다음과 같은 시각화가 제공됩니다:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>산점도 매트릭스:</strong> 변수 간 관계와 군집별 분포</li>
                    <li><strong>군집 산점도:</strong> 주성분 공간에서의 군집 시각화</li>
                    <li><strong>실루엣 플롯:</strong> 각 데이터 포인트의 군집 적합도</li>
                    <li><strong>엘보우 플롯:</strong> 최적 군집 수 결정 과정</li>
                    <li><strong>군집 중심점:</strong> 각 군집의 특성 시각화</li>
                  </ul>
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">Pyodide 통합 예정</span>
                    </div>
                    <p className="text-sm mt-1">
                      scikit-learn을 통한 정확한 군집분석과 matplotlib/seaborn을 통한
                      전문적인 시각화가 구현될 예정입니다.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => {
            if (actions.setCurrentStep) {
              actions.setCurrentStep(2)
            }
          }}>
            이전
          </Button>
          <Button onClick={() => {
            window.location.reload()
          }}>
            새 분석 시작
          </Button>
        </div>
      </div>
    )
  }, [results, uploadedData?.data.length, selectedVariables, actions])

  // Render 함수들
  const renderMethodIntroduction = useCallback(() => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">군집분석 개요</h3>
        <p className="text-sm text-muted-foreground">
          유사한 특성을 가진 개체들을 그룹화하는 비지도 학습 분석입니다.
        </p>
      </div>

      <div>
        <h4 className="text-base font-semibold mb-2">주요 가정</h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>연속형 변수 (수치형 데이터)</li>
          <li>변수 간 스케일 차이 고려 필요</li>
          <li>이상치에 민감할 수 있음</li>
          <li>군집 수 사전 지정 필요 (K-means)</li>
        </ul>
      </div>

      <div>
        <h4 className="text-base font-semibold mb-2">활용 방법</h4>
        <p className="text-sm text-muted-foreground">
          K-means: 구형 군집에 적합, 빠른 속도. 계층적 군집분석: 덴드로그램 제공, 군집 수 유연. 실루엣 분석: 군집 품질 평가.
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

  const renderVariableSelection = useCallback(() => variableSelectionStep, [variableSelectionStep])

  const renderResults = useCallback(() => resultsStep, [resultsStep])

  return (
    <TwoPanelLayout
      analysisTitle="군집분석"
      analysisSubtitle="유사한 특성을 가진 개체들을 그룹화하는 비지도 학습 분석"
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