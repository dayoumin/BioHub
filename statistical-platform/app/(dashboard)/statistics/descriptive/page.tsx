'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileText,
  Calculator,
  Download,
  Play,
  Info,
  TrendingUp,
  Target
} from 'lucide-react'
import { StatisticsPageLayout, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelector } from '@/components/variable-selection/VariableSelector'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import type { VariableMapping, UploadedData } from '@/hooks/use-statistics-page'
import { usePyodideService } from '@/hooks/use-pyodide-service'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { createDataUploadHandler, createVariableSelectionHandler } from '@/lib/utils/statistics-handlers'

interface VariableAssignment {
  [role: string]: string | string[]
}

interface DescriptiveStats {
  variable: string
  n: number
  mean: number
  median: number
  mode: string
  std: number
  variance: number
  min: number
  max: number
  range: number
  q1: number
  q3: number
  iqr: number
  skewness: number
  kurtosis: number
  se: number
  ci_lower: number
  ci_upper: number
  missing: number
}

interface DescriptiveResults {
  variables: DescriptiveStats[]
  totalCases: number
  validCases: number
  missingCases: number
  analysisDate: string
}

export default function DescriptiveStatsPage() {
  // Custom hook: 공통 상태 관리
  const { state, actions } = useStatisticsPage<DescriptiveResults>({
    withUploadedData: true,
    withError: false
  })

  // 페이지 특정 상태 (activeTab, 옵션 등)
  const [activeTab, setActiveTab] = useState('summary')
  const [showAdvanced, setShowAdvanced] = useState(true)
  const [showConfidenceInterval, setShowConfidenceInterval] = useState(true)
  const [confidenceLevel, setConfidenceLevel] = useState('95')
  const { pyodideService: _pyodideService } = usePyodideService()

  // 편의를 위한 destructuring
  const { currentStep, variableMapping, uploadedData, results, isAnalyzing } = state

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
      description: '분석할 수치형 변수 선택',
      status: Object.keys(variableMapping).length > 0 ? 'completed' : uploadedData ? 'current' : 'pending'
    },
    {
      id: 'configure-options',
      number: 3,
      title: '옵션 설정',
      description: '통계량 및 신뢰구간 설정',
      status: Object.keys(variableMapping).length > 0 ? 'current' : 'pending'
    },
    {
      id: 'run-analysis',
      number: 4,
      title: '분석 실행',
      description: '기술통계 계산',
      status: results ? 'completed' : 'pending'
    },
    {
      id: 'view-results',
      number: 5,
      title: '결과 확인',
      description: '기술통계 결과 및 해석',
      status: results ? 'current' : 'pending'
    }
  ]

  // 분석 실행
  const handleAnalysis = async () => {
    try {
      actions.startAnalysis()

      // 모의 데이터 생성 (실제로는 Pyodide 서비스 사용)
      const mockResults: DescriptiveResults = {
        variables: [
          {
            variable: '키(cm)',
            n: 150,
            mean: 170.5,
            median: 171.0,
            mode: '170',
            std: 8.2,
            variance: 67.24,
            min: 155.0,
            max: 185.0,
            range: 30.0,
            q1: 165.0,
            q3: 176.0,
            iqr: 11.0,
            skewness: -0.12,
            kurtosis: -0.45,
            se: 0.67,
            ci_lower: 169.2,
            ci_upper: 171.8,
            missing: 0
          },
          {
            variable: '몸무게(kg)',
            n: 148,
            mean: 68.3,
            median: 67.5,
            mode: '67',
            std: 12.4,
            variance: 153.76,
            min: 45.0,
            max: 95.0,
            range: 50.0,
            q1: 60.0,
            q3: 75.0,
            iqr: 15.0,
            skewness: 0.25,
            kurtosis: -0.33,
            se: 1.02,
            ci_lower: 66.3,
            ci_upper: 70.3,
            missing: 2
          }
        ],
        totalCases: 150,
        validCases: 148,
        missingCases: 2,
        analysisDate: new Date().toLocaleString('ko-KR')
      }

      actions.completeAnalysis(mockResults, 4)
      setActiveTab('summary')
    } catch (err) {
      console.error('Analysis error:', err)
    }
  }

  // 단계 변경 처리
  const handleStepChange = (step: number) => {
    if (step <= currentStep + 1) {
      actions.setCurrentStep(step)
    }
  }

  // 초기화
  const handleReset = () => {
    actions.reset()
    setActiveTab('summary')
  }

  // 데이터 업로드 핸들러
  const handleDataUpload = createDataUploadHandler(
    actions.setUploadedData,
    () => actions.setCurrentStep(1),
    'descriptive'
  )

  // 변수 선택 핸들러
  const handleVariableSelection = createVariableSelectionHandler<VariableAssignment>(
    actions.setSelectedVariables,
    (variables) => {
      const mapping: VariableMapping = {
        variables: Array.isArray(variables.variables) ? variables.variables as string[] : [variables.variables as string]
      }
      actions.setSelectedVariables?.(mapping)
      actions.setCurrentStep(2)
    },
    'descriptive'
  )

  // 기술통계 테이블 렌더링
  const renderDescriptiveTable = () => {
    if (!results) return null

    const basicColumns = [
      { key: 'variable', header: '변수', type: 'text' as const },
      { key: 'n', header: 'N', type: 'number' as const },
      { key: 'mean', header: '평균', type: 'number' as const, precision: 2 },
      { key: 'median', header: '중앙값', type: 'number' as const, precision: 2 },
      { key: 'std', header: '표준편차', type: 'number' as const, precision: 2 },
      { key: 'min', header: '최솟값', type: 'number' as const, precision: 1 },
      { key: 'max', header: '최댓값', type: 'number' as const, precision: 1 }
    ]

    const advancedColumns = [
      { key: 'mode', header: '최빈값', type: 'text' as const },
      { key: 'variance', header: '분산', type: 'number' as const, precision: 2 },
      { key: 'range', header: '범위', type: 'number' as const, precision: 1 },
      { key: 'iqr', header: 'IQR', type: 'number' as const, precision: 2 },
      { key: 'skewness', header: '왜도', type: 'number' as const, precision: 3 },
      { key: 'kurtosis', header: '첨도', type: 'number' as const, precision: 3 }
    ]

    const ciColumns = [
      { key: 'se', header: '표준오차', type: 'number' as const, precision: 3 },
      { key: 'ci_lower', header: `CI 하한(${confidenceLevel}%)`, type: 'number' as const, precision: 2 },
      { key: 'ci_upper', header: `CI 상한(${confidenceLevel}%)`, type: 'number' as const, precision: 2 }
    ]

    const columns = [
      ...basicColumns,
      ...(showAdvanced ? advancedColumns : []),
      ...(showConfidenceInterval ? ciColumns : [])
    ]

    return (
      <StatisticsTable
        columns={columns}
        data={results.variables}
        title="기술통계 결과"
      />
    )
  }

  // 요약 통계 카드 렌더링
  const renderSummaryCards = () => {
    if (!results) return null

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">분석 변수</p>
                <p className="text-2xl font-bold">{results.variables.length}</p>
              </div>
              <FileText className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">총 케이스</p>
                <p className="text-2xl font-bold">{results.totalCases}</p>
              </div>
              <Calculator className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">유효 케이스</p>
                <p className="text-2xl font-bold">{results.validCases}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">결측값</p>
                <p className="text-2xl font-bold">{results.missingCases}</p>
              </div>
              <Info className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 변수별 세부 정보 렌더링
  const renderVariableDetails = () => {
    if (!results) return null

    return (
      <div className="space-y-4">
        {results.variables.map((variable, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                {variable.variable}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">중심 경향</p>
                  <p>평균: {variable.mean.toFixed(2)}</p>
                  <p>중앙값: {variable.median.toFixed(2)}</p>
                  <p>최빈값: {variable.mode}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">산포도</p>
                  <p>표준편차: {variable.std.toFixed(2)}</p>
                  <p>분산: {variable.variance.toFixed(2)}</p>
                  <p>범위: {variable.range.toFixed(1)}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">분포 형태</p>
                  <p>왜도: {variable.skewness.toFixed(3)}</p>
                  <p>첨도: {variable.kurtosis.toFixed(3)}</p>
                  <p>IQR: {variable.iqr.toFixed(2)}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">신뢰구간({confidenceLevel}%)</p>
                  <p>하한: {variable.ci_lower.toFixed(2)}</p>
                  <p>상한: {variable.ci_upper.toFixed(2)}</p>
                  <p>표준오차: {variable.se.toFixed(3)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <StatisticsPageLayout
      title="기술통계"
      subtitle="수치형 데이터의 기본 통계량 및 분포 특성 분석"
      icon={<FileText className="w-6 h-6" />}
      steps={steps}
      currentStep={currentStep}
      onStepChange={handleStepChange}
      onRun={handleAnalysis}
      onReset={handleReset}
      isRunning={isAnalyzing}
      methodInfo={{
        formula: "평균 = Σx/n, 표준편차 = √(Σ(x-μ)²/n), 왜도 = E[(X-μ)³]/σ³",
        assumptions: ["수치형 데이터", "독립적인 관측값"],
        sampleSize: "최소 제한 없음 (30개 이상 권장)",
        usage: "데이터 분포 파악, 이상치 탐지, 가정 검정"
      }}
    >
      <div className="space-y-6">
        {/* 1단계: 데이터 업로드 */}
        {currentStep === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                데이터 업로드
              </CardTitle>
              <CardDescription>
                분석할 데이터를 CSV 또는 Excel 형식으로 업로드하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataUploadStep
                onUploadComplete={handleDataUpload}
                onNext={() => actions.setCurrentStep(1)}
                canGoNext={false}
                currentStep={1}
                totalSteps={5}
              />
            </CardContent>
          </Card>
        )}

        {/* 2단계: 변수 선택 */}
        {currentStep === 1 && uploadedData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                분석할 변수 선택
              </CardTitle>
              <CardDescription>
                기술통계를 계산할 수치형(연속형, 이산형) 변수를 선택하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VariableSelector
                methodId="descriptive"
                data={uploadedData.data}
                onVariablesSelected={handleVariableSelection}
                onBack={() => actions.setCurrentStep(0)}
              />
            </CardContent>
          </Card>
        )}

        {/* 3단계: 옵션 설정 */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                분석 옵션 설정
              </CardTitle>
              <CardDescription>
                표시할 통계량과 신뢰구간 설정을 선택하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="advanced"
                    checked={showAdvanced}
                    onCheckedChange={setShowAdvanced}
                  />
                  <Label htmlFor="advanced">고급 통계량 표시</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="confidence"
                    checked={showConfidenceInterval}
                    onCheckedChange={setShowConfidenceInterval}
                  />
                  <Label htmlFor="confidence">신뢰구간 표시</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Label>신뢰수준</Label>
                  <Select value={confidenceLevel} onValueChange={setConfidenceLevel}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="90">90%</SelectItem>
                      <SelectItem value="95">95%</SelectItem>
                      <SelectItem value="99">99%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Button
                  onClick={() => actions.setCurrentStep(3)}
                  disabled={Object.keys(variableMapping).length === 0}
                >
                  다음 단계
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 4단계: 분석 실행 */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="w-5 h-5" />
                분석 실행
              </CardTitle>
              <CardDescription>
                설정된 옵션으로 기술통계를 계산합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Button
                  size="lg"
                  onClick={handleAnalysis}
                  disabled={isAnalyzing}
                  className="px-8"
                >
                  {isAnalyzing ? '분석 중...' : '기술통계 계산'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 5단계: 결과 확인 */}
        {results && currentStep === 4 && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary">요약</TabsTrigger>
              <TabsTrigger value="table">통계표</TabsTrigger>
              <TabsTrigger value="details">세부 정보</TabsTrigger>
              <TabsTrigger value="export">내보내기</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">분석 요약</h3>
                {renderSummaryCards()}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  분석 일시: {results.analysisDate}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="table" className="space-y-6">
              {renderDescriptiveTable()}
            </TabsContent>

            <TabsContent value="details" className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">변수별 세부 정보</h3>
                {renderVariableDetails()}
              </div>
            </TabsContent>

            <TabsContent value="export" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>결과 내보내기</CardTitle>
                  <CardDescription>
                    기술통계 결과를 다양한 형식으로 내보낼 수 있습니다
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Button variant="outline" className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      CSV
                    </Button>
                    <Button variant="outline" className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      Excel
                    </Button>
                    <Button variant="outline" className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      PDF
                    </Button>
                    <Button variant="outline" className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      SPSS
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </StatisticsPageLayout>
  )
}