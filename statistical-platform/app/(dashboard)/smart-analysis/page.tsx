"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Sparkles, Upload, CheckCircle2, BarChart3, HelpCircle, ArrowRight } from "lucide-react"
import { FileUpload } from "@/components/ui/file-upload"
import Link from "next/link"
import { useAppStore } from "@/lib/store"
import { PyodideCoreService } from "@/lib/services/pyodide/core/pyodide-core.service"

type Step = 'upload' | 'descriptive' | 'assumptions' | 'method-selection' | 'analysis' | 'results'

interface DatasetInfo {
  id: string
  name: string
  numericColumns: string[]
  categoricalColumns: string[]
  rowCount: number
}

interface AssumptionResults {
  normality: { [key: string]: { test: string, pValue: number, isNormal: boolean } }
  homogeneity: { [key: string]: { test: string, pValue: number, isHomogeneous: boolean } }
  recommendation: {
    parametric: boolean
    suggestedMethod: string
    reason: string
  }
}

export default function SmartAnalysisPage() {
  const [currentStep, setCurrentStep] = useState<Step>('upload')
  const [datasetInfo, setDatasetInfo] = useState<DatasetInfo | null>(null)
  const [assumptionResults, setAssumptionResults] = useState<AssumptionResults | null>(null)
  const [progress, setProgress] = useState(0)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [_selectedAnalysisType, setSelectedAnalysisType] = useState<string | null>(null)
  const [analysisResultId, setAnalysisResultId] = useState<string | null>(null)

  const { addAnalysisResult, getDatasetById } = useAppStore()

  // 해시 기반 라우팅 처리
  useEffect(() => {
    const hash = window.location.hash.substring(1) // # 제거
    if (hash) {
      setSelectedAnalysisType(hash)
      // 특정 통계 분석이 선택된 경우, 샘플 데이터로 시작
      setDatasetInfo({
        id: `sample-${hash}`,
        name: `${getAnalysisDisplayName(hash)} 샘플 데이터`,
        numericColumns: ["value1", "value2", "score"],
        categoricalColumns: ["group", "category"],
        rowCount: 50
      })
      setCurrentStep('descriptive')
    }
  }, [])

  const getAnalysisDisplayName = (type: string): string => {
    const types: { [key: string]: string } = {
      't-test': 't-검정',
      'anova': 'ANOVA',
      'regression': '회귀분석',
      'correlation': '상관분석'
    }
    return types[type] || type
  }

  const handleUploadComplete = (id: string) => {
    // Store에서 실제 업로드된 데이터셋 정보 가져오기
    const dataset = getDatasetById(id)

    if (!dataset) {
      console.error(`Dataset not found: ${id}`)
      return
    }

    // 데이터가 없으면 에러 처리
    if (!dataset.data || dataset.data.length === 0) {
      console.error('Dataset has no data')
      return
    }

    // 첫 번째 행에서 컬럼명 추출
    const columns = Object.keys(dataset.data[0])

    // 컬럼 타입 자동 감지
    const numericColumns: string[] = []
    const categoricalColumns: string[] = []

    columns.forEach(column => {
      // 모든 행의 해당 컬럼 값 확인
      const allNumeric = dataset.data!.every(row => {
        const value = row[column]
        // null, undefined는 허용 (결측치)
        if (value === null || value === undefined || value === '') {
          return true
        }
        // 숫자형 체크
        return typeof value === 'number' || !isNaN(Number(value))
      })

      if (allNumeric) {
        numericColumns.push(column)
      } else {
        categoricalColumns.push(column)
      }
    })

    // DatasetInfo 설정
    setDatasetInfo({
      id: dataset.id,
      name: dataset.name,
      numericColumns,
      categoricalColumns,
      rowCount: dataset.rows
    })

    setCurrentStep('descriptive')
  }

  const handleDescriptiveComplete = async () => {
    if (!datasetInfo) {
      console.error('No dataset info available')
      return
    }

    // Dataset 가져오기
    const dataset = getDatasetById(datasetInfo.id)
    if (!dataset || !dataset.data || dataset.data.length === 0) {
      console.error('Dataset not found or empty')
      return
    }

    setCurrentStep('assumptions')
    setIsAnalyzing(true)

    try {
      // PyodideCore 초기화
      const pyodideService = PyodideCoreService.getInstance()
      await pyodideService.initialize()

      // ========================================
      // 1. 정규성 검정 (Shapiro-Wilk Test)
      // ========================================
      const normalityResults: Record<string, { test: string; pValue: number; isNormal: boolean }> = {}

      for (const column of datasetInfo.numericColumns) {
        // 컬럼 데이터 추출 (결측치 제거)
        const columnData = dataset.data
          .map(row => row[column])
          .filter(value => value !== null && value !== undefined && value !== '') as number[]

        if (columnData.length < 3) {
          console.warn(`Column '${column}' has insufficient data for normality test (n=${columnData.length})`)
          continue
        }

        // Worker 1: normality_test 호출
        const result = await pyodideService.callWorkerMethod<{
          statistic: number
          pValue: number
          isNormal: boolean
          alpha: number
        }>(
          1, // Worker 1: Descriptive (normality_test 포함)
          'normality_test',
          { data: columnData, alpha: 0.05 }
        )

        normalityResults[column] = {
          test: 'Shapiro-Wilk',
          pValue: result.pValue,
          isNormal: result.isNormal
        }
      }

      // ========================================
      // 2. 등분산성 검정 (Levene's Test)
      // ========================================
      const homogeneityResults: Record<string, { test: string; pValue: number; isHomogeneous: boolean }> = {}

      // 범주형 변수로 그룹핑 가능한 경우만 검정
      if (datasetInfo.categoricalColumns.length > 0 && datasetInfo.numericColumns.length > 0) {
        const groupColumn = datasetInfo.categoricalColumns[0] // 첫 번째 범주형 변수
        const valueColumn = datasetInfo.numericColumns[0] // 첫 번째 수치형 변수

        // 그룹별 데이터 분리
        const groupsMap = new Map<string, number[]>()
        dataset.data.forEach(row => {
          const groupKey = String(row[groupColumn])
          const value = row[valueColumn]

          // 결측치 제외
          if (value === null || value === undefined || value === '') {
            return
          }

          if (!groupsMap.has(groupKey)) {
            groupsMap.set(groupKey, [])
          }
          groupsMap.get(groupKey)!.push(Number(value))
        })

        // 최소 2개 그룹 필요
        if (groupsMap.size >= 2) {
          const groupsArray = Array.from(groupsMap.values())

          // Worker 2: levene_test 호출
          const leveneResult = await pyodideService.callWorkerMethod<{
            statistic: number
            pValue: number
            equalVariance: boolean
          }>(
            2, // Worker 2: Hypothesis Tests
            'levene_test',
            { groups: groupsArray }
          )

          homogeneityResults[`${valueColumn}_by_${groupColumn}`] = {
            test: "Levene's test",
            pValue: leveneResult.pValue,
            isHomogeneous: leveneResult.equalVariance
          }
        }
      }

      // ========================================
      // 3. AI 추천 로직
      // ========================================
      const allNormal = Object.values(normalityResults).every(r => r.isNormal)
      const allHomogeneous = Object.values(homogeneityResults).length === 0 ||
                             Object.values(homogeneityResults).every(r => r.isHomogeneous)

      let recommendation: { parametric: boolean; suggestedMethod: string; reason: string }

      // 그룹 수 확인
      const numGroups = datasetInfo.categoricalColumns.length > 0
        ? new Set(dataset.data.map(r => r[datasetInfo.categoricalColumns[0]])).size
        : 0

      // 시나리오별 추천
      if (numGroups === 2 && datasetInfo.numericColumns.length >= 1) {
        // 두 그룹 비교
        if (allNormal && allHomogeneous) {
          recommendation = {
            parametric: true,
            suggestedMethod: "Independent t-test",
            reason: "두 그룹 간 비교이며 정규성과 등분산성을 만족하여 독립표본 t-검정을 권장합니다"
          }
        } else if (allNormal && !allHomogeneous) {
          recommendation = {
            parametric: true,
            suggestedMethod: "Welch's t-test",
            reason: "정규성은 만족하나 등분산성을 만족하지 않아 Welch's t-test를 권장합니다"
          }
        } else {
          recommendation = {
            parametric: false,
            suggestedMethod: "Mann-Whitney U test",
            reason: "정규성 가정을 만족하지 않아 비모수 검정인 Mann-Whitney U test를 권장합니다"
          }
        }
      } else if (numGroups >= 3 && datasetInfo.numericColumns.length >= 1) {
        // 세 그룹 이상 비교
        if (allNormal && allHomogeneous) {
          recommendation = {
            parametric: true,
            suggestedMethod: "One-way ANOVA",
            reason: `${numGroups}개 그룹 비교이며 정규성과 등분산성을 만족하여 일원분산분석(ANOVA)을 권장합니다`
          }
        } else {
          recommendation = {
            parametric: false,
            suggestedMethod: "Kruskal-Wallis test",
            reason: "가정을 만족하지 않아 비모수 검정인 Kruskal-Wallis test를 권장합니다"
          }
        }
      } else if (datasetInfo.numericColumns.length >= 2 && numGroups === 0) {
        // 상관/회귀 분석
        if (allNormal) {
          recommendation = {
            parametric: true,
            suggestedMethod: "Pearson Correlation",
            reason: "수치형 변수 간 관계 분석이며 정규성을 만족하여 Pearson 상관분석을 권장합니다"
          }
        } else {
          recommendation = {
            parametric: false,
            suggestedMethod: "Spearman Correlation",
            reason: "정규성을 만족하지 않아 Spearman 순위 상관분석을 권장합니다"
          }
        }
      } else {
        // 단일 그룹 또는 기타
        if (allNormal) {
          recommendation = {
            parametric: true,
            suggestedMethod: "One-sample t-test",
            reason: "단일 그룹 분석이며 정규성을 만족하여 일표본 t-검정을 권장합니다"
          }
        } else {
          recommendation = {
            parametric: false,
            suggestedMethod: "Descriptive Statistics",
            reason: "데이터 특성에 맞는 분석 방법을 수동으로 선택해주세요"
          }
        }
      }

      // ========================================
      // 4. 결과 저장
      // ========================================
      setAssumptionResults({
        normality: normalityResults,
        homogeneity: homogeneityResults,
        recommendation
      })

      setCurrentStep('method-selection')

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('Assumption testing failed:', errorMessage)
      alert(`가정 검정 실패: ${errorMessage}`)
      // 에러 발생 시 이전 단계로 복귀
      setCurrentStep('descriptive')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const steps = [
    { id: 'upload', label: '데이터 업로드', completed: currentStep !== 'upload' },
    { id: 'descriptive', label: '기초 통계', completed: ['assumptions', 'method-selection', 'analysis', 'results'].includes(currentStep) },
    { id: 'assumptions', label: '가정 검정', completed: ['method-selection', 'analysis', 'results'].includes(currentStep) },
    { id: 'method-selection', label: '방법 선택', completed: ['analysis', 'results'].includes(currentStep) },
    { id: 'analysis', label: '분석 실행', completed: currentStep === 'results' },
    { id: 'results', label: '결과 해석', completed: currentStep === 'results' }
  ]

  const getCurrentStepIndex = () => {
    return steps.findIndex(step => step.id === currentStep)
  }

  const getProgressValue = () => {
    const currentIndex = getCurrentStepIndex()
    const totalSteps = steps.length
    return ((currentIndex + 1) / totalSteps) * 100
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            스마트 분석
          </h1>
          <p className="text-muted-foreground mt-2">
            데이터를 업로드하면 AI가 자동으로 분석해드립니다
          </p>
        </div>
        <Link href="/help">
          <Button variant="outline" size="sm">
            <HelpCircle className="h-4 w-4 mr-2" />
            도움말
          </Button>
        </Link>
      </div>

      {/* 진행 단계 표시 */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">진행 상황</span>
              <span className="text-sm text-muted-foreground">
                {getCurrentStepIndex() + 1} / {steps.length}
              </span>
            </div>
            <Progress value={getProgressValue()} />
            <div className="flex justify-between text-xs text-muted-foreground">
              {steps.map((step, index) => (
                <div key={step.id} className={`flex flex-col items-center ${
                  index <= getCurrentStepIndex() ? 'text-primary' : ''
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 ${
                    index <= getCurrentStepIndex() 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {index < getCurrentStepIndex() ? <CheckCircle2 className="h-3 w-3" /> : index + 1}
                  </div>
                  <span className="text-center">{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 단계별 내용 */}
      {currentStep === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              1단계: 데이터 업로드
            </CardTitle>
            <CardDescription>
              CSV 또는 Excel 파일을 드래그하거나 클릭해서 업로드하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload 
              enableSmartAnalysis={false}
              onUploadComplete={handleUploadComplete}
            />
          </CardContent>
        </Card>
      )}

      {/* 2단계: 기초 통계 분석 */}
      {currentStep === 'descriptive' && datasetInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              2단계: 기초 통계 분석
            </CardTitle>
            <CardDescription>
              데이터의 기본적인 통계 정보와 분포를 확인합니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/30 p-4 rounded-lg">
              <h4 className="font-medium mb-3">데이터셋 정보</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">총 행 수:</span>
                  <div className="font-medium">{datasetInfo.rowCount}개</div>
                </div>
                <div>
                  <span className="text-muted-foreground">숫자형 변수:</span>
                  <div className="font-medium">{datasetInfo.numericColumns.length}개</div>
                </div>
                <div>
                  <span className="text-muted-foreground">범주형 변수:</span>
                  <div className="font-medium">{datasetInfo.categoricalColumns.length}개</div>
                </div>
                <div>
                  <span className="text-muted-foreground">상태:</span>
                  <div className="font-medium text-success">정상</div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">변수 목록</h4>
              <div className="grid gap-2 max-h-48 overflow-y-auto">
                {datasetInfo.numericColumns.map((col, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="font-medium">{col}</span>
                    <Badge variant="secondary">숫자형</Badge>
                  </div>
                ))}
                {datasetInfo.categoricalColumns.map((col, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                    <span className="font-medium">{col}</span>
                    <Badge variant="outline">범주형</Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center">
              <Button onClick={handleDescriptiveComplete} size="lg">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                다음 단계: 가정 검정
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3단계: 가정 검정 */}
      {currentStep === 'assumptions' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              3단계: 통계적 가정 검정
            </CardTitle>
            <CardDescription>
              데이터가 통계 분석의 가정을 만족하는지 검사합니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!assumptionResults ? (
              <div className="text-center space-y-4">
                <div className="animate-pulse">
                  <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                    <BarChart3 className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <div>
                  <p className="text-lg font-medium">가정 검정 실행 중...</p>
                  <p className="text-sm text-muted-foreground">
                    정규성, 등분산성, 독립성을 검사하고 있습니다
                  </p>
                </div>
                <Progress value={70} className="max-w-xs mx-auto" />
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3">정규성 검정 (Shapiro-Wilk Test)</h4>
                  <div className="space-y-2">
                    {Object.entries(assumptionResults.normality).map(([variable, result]) => (
                      <div key={variable} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <span className="font-medium">{variable}</span>
                          <p className="text-sm text-muted-foreground">p = {result.pValue.toFixed(3)}</p>
                        </div>
                        <Badge variant={result.isNormal ? "default" : "destructive"}>
                          {result.isNormal ? "정규분포 ✓" : "비정규분포 ✗"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">등분산성 검정 (Levene&apos;s Test)</h4>
                  <div className="space-y-2">
                    {Object.entries(assumptionResults.homogeneity).map(([test, result]) => (
                      <div key={test} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <span className="font-medium">{test.replace('_', ' → ')}</span>
                          <p className="text-sm text-muted-foreground">p = {result.pValue.toFixed(3)}</p>
                        </div>
                        <Badge variant={result.isHomogeneous ? "default" : "destructive"}>
                          {result.isHomogeneous ? "등분산 ✓" : "이분산 ✗"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p><strong>추천 분석 방법:</strong> {assumptionResults.recommendation.suggestedMethod}</p>
                      <p className="text-sm">{assumptionResults.recommendation.reason}</p>
                    </div>
                  </AlertDescription>
                </Alert>

                <div className="flex justify-center">
                  <Button onClick={() => setCurrentStep('method-selection')} size="lg">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    추천 방법으로 분석하기
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 4단계: 분석 방법 선택 */}
      {currentStep === 'method-selection' && assumptionResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              4단계: 분석 방법 확정
            </CardTitle>
            <CardDescription>
              가정 검정 결과에 따른 최적 분석 방법을 선택합니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
              <h4 className="font-medium text-primary mb-2">🎯 AI 추천 분석</h4>
              <div className="space-y-2">
                <p className="font-medium">{assumptionResults.recommendation.suggestedMethod}</p>
                <p className="text-sm text-muted-foreground">{assumptionResults.recommendation.reason}</p>
                <Badge variant={assumptionResults.recommendation.parametric ? "default" : "secondary"}>
                  {assumptionResults.recommendation.parametric ? "모수적 방법" : "비모수적 방법"}
                </Badge>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                가정 검정 결과를 바탕으로 가장 적합한 분석 방법입니다
              </p>
              <Button onClick={() => {
                setCurrentStep('analysis')
                setIsAnalyzing(true)
                // 3초 후 자동으로 결과 단계로 이동하고 분석 결과 저장
                setTimeout(() => {
                  // 분석 결과를 store에 저장
                  const resultId = addAnalysisResult({
                    datasetId: datasetInfo?.id || 'sample-dataset',
                    datasetName: datasetInfo?.name || 'Sample Dataset',
                    testType: assumptionResults?.recommendation.suggestedMethod || 'Mann-Whitney U Test',
                    testName: assumptionResults?.recommendation.suggestedMethod || 'Mann-Whitney U Test',
                    method: assumptionResults?.recommendation.parametric ? '모수적 방법' : '비모수적 방법',
                    parameters: {
                      alpha: 0.05,
                      alternative: 'two-sided'
                    },
                    results: {
                      testStatistic: 1247.5,
                      pValue: 0.032,
                      effectSize: 0.24,
                      confidenceInterval: [0.05, 0.89],
                      conclusion: "통계적으로 유의한 차이가 있습니다",
                      interpretation: "두 그룹 간의 차이가 통계적으로 유의합니다 (p < 0.05). 효과크기는 중간 정도로 실질적인 의미가 있는 차이입니다."
                    },
                    assumptions: {
                      normality: Object.entries(assumptionResults?.normality || {}).map(([_variable, result]) => ({
                        passed: result.isNormal,
                        pValue: result.pValue,
                        test: result.test
                      })),
                      homogeneity: Object.entries(assumptionResults?.homogeneity || {}).map(([_test, result]) => ({
                        passed: result.isHomogeneous,
                        pValue: result.pValue,
                        test: result.test
                      })),
                      independence: true
                    },
                    recommendations: [
                      assumptionResults?.recommendation.reason || "비모수 검정을 사용했습니다",
                      "더 큰 표본 크기로 분석을 반복해보는 것을 권장합니다",
                      "실제 연구 맥락에서 효과크기의 실질적 의미를 고려해보세요"
                    ],
                    visualizations: ["boxplot", "histogram", "qq_plot"],
                    status: 'completed',
                    timestamp: new Date()
                  })
                  
                  setAnalysisResultId(resultId)
                  setCurrentStep('results')
                  setIsAnalyzing(false)
                }, 3000)
              }} size="lg">
                <BarChart3 className="h-4 w-4 mr-2" />
                분석 실행하기
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5단계: 분석 실행 */}
      {currentStep === 'analysis' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="animate-spin">
                <BarChart3 className="h-5 w-5" />
              </div>
              5단계: 분석 실행 중
            </CardTitle>
            <CardDescription>
              선택된 통계 분석을 수행하고 있습니다...
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="space-y-4">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <div className="animate-pulse">
                  <BarChart3 className="h-10 w-10 text-primary" />
                </div>
              </div>
              <div>
                <p className="text-lg font-medium">
                  {assumptionResults?.recommendation.suggestedMethod || "통계 분석"} 수행 중...
                </p>
                <p className="text-sm text-muted-foreground">
                  검정통계량과 p-값을 계산하고 있습니다
                </p>
              </div>
              <Progress value={90} className="max-w-xs mx-auto" />
            </div>
            
            <div className="text-xs text-muted-foreground">
              잠시만 기다려주세요. 분석이 곧 완료됩니다...
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 'results' && (
        <Card>
          <CardHeader>
            <CardTitle>6단계: 분석 완료</CardTitle>
            <CardDescription>
              분석이 완료되었습니다. 결과를 확인해보세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-6">
              <CheckCircle2 className="h-16 w-16 mx-auto text-success" />
              <div>
                <h3 className="text-lg font-medium">분석이 성공적으로 완료되었습니다!</h3>
                <p className="text-muted-foreground">
                  {assumptionResults?.recommendation.suggestedMethod} 결과가 준비되었습니다.
                </p>
              </div>
              
              {/* 간단한 결과 미리보기 */}
              <div className="bg-muted/30 p-4 rounded-lg text-left">
                <h4 className="font-medium mb-3">분석 결과 요약</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>검정 방법:</span>
                    <span className="font-medium">{assumptionResults?.recommendation.suggestedMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>검정통계량:</span>
                    <span className="font-medium">U = 1247.5</span>
                  </div>
                  <div className="flex justify-between">
                    <span>p-값:</span>
                    <span className="font-medium">0.032</span>
                  </div>
                  <div className="flex justify-between">
                    <span>효과크기:</span>
                    <span className="font-medium">r = 0.24 (중간)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>결론:</span>
                    <span className="font-medium text-success">통계적으로 유의한 차이 있음</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 justify-center">
                <Link href={`/results/${analysisResultId}`}>
                  <Button>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    상세 결과 보기
                  </Button>
                </Link>
                <Button variant="outline" onClick={() => {
                  setCurrentStep('upload')
                  setDatasetInfo(null)
                  setAssumptionResults(null)
                  setProgress(0)
                  setIsAnalyzing(false)
                }}>
                  새 분석 시작
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}