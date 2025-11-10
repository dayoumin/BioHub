'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { FrequencyTableVariables } from '@/types/statistics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
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
  BarChart3,
  Calculator,
  PieChart,
  Play,
  Info,
  Table
} from 'lucide-react'
import { StatisticsPageLayout, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelector } from '@/components/variable-selection/VariableSelector'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { VariableMapping } from '@/components/variable-selection/types'
import { usePyodideService } from '@/hooks/use-pyodide-service'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import type { UploadedData } from '@/hooks/use-statistics-page'
import { createDataUploadHandler, createVariableSelectionHandler } from '@/lib/utils/statistics-handlers'

interface FrequencyData {
  value: string
  frequency: number
  percent: number
  validPercent: number
  cumulativePercent: number
}

interface FrequencyResults {
  variable: string
  data: FrequencyData[]
  totalCount: number
  validCount: number
  missingCount: number
  uniqueValues: number
}

export default function FrequencyTablePage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('frequency-table')
  }, [])

  const { state, actions } = useStatisticsPage<FrequencyResults, FrequencyTableVariables>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, results, isAnalyzing, selectedVariables } = state
  const [activeTab, setActiveTab] = useState('summary')
  const [showPercentages, setShowPercentages] = useState(true)
  const [showCumulative, setShowCumulative] = useState(true)
  const [sortBy, setSortBy] = useState('frequency')
  const { pyodideService } = usePyodideService()

  // 단계 정의
  const steps: StatisticsStep[] = [
    {
      id: 'upload-data',
      number: 0,
      title: '데이터 업로드',
      description: '분석할 CSV/Excel 파일 업로드',
      status: uploadedData ? 'completed' : 'current'
    },
    {
      id: 'select-variable',
      number: 1,
      title: '변수 선택',
      description: '분석할 범주형 변수 선택',
      status: uploadedData && selectedVariables ? 'completed' : (uploadedData ? 'current' : 'pending')
    },
    {
      id: 'configure-options',
      number: 2,
      title: '옵션 설정',
      description: '표시 형식 및 정렬 옵션',
      status: selectedVariables ? 'current' : 'pending'
    },
    {
      id: 'run-analysis',
      number: 3,
      title: '분석 실행',
      description: '빈도표 생성 및 통계 계산',
      status: results ? 'completed' : 'pending'
    },
    {
      id: 'view-results',
      number: 4,
      title: '결과 확인',
      description: '빈도표 및 시각화 결과',
      status: results ? 'current' : 'pending'
    }
  ]

  // 변수 선택 핸들러 (공통 유틸 사용)
  const handleVariablesSelected = createVariableSelectionHandler(
    actions.setSelectedVariables,
    (mapping) => {
      if (Object.keys(mapping as unknown as VariableMapping).length > 0) {
        actions.setCurrentStep(2)
      }
    },
    'frequency-table'
  )

  // 분석 실행
  const handleAnalysis = useCallback(async () => {
    actions.startAnalysis()

    try {
      // 모의 데이터 생성 (실제로는 Pyodide 서비스 사용)
      const mockResults: FrequencyResults = {
        variable: '교육수준',
        data: [
          { value: '고등학교', frequency: 45, percent: 30.0, validPercent: 30.0, cumulativePercent: 30.0 },
          { value: '대학교', frequency: 75, percent: 50.0, validPercent: 50.0, cumulativePercent: 80.0 },
          { value: '대학원', frequency: 25, percent: 16.7, validPercent: 16.7, cumulativePercent: 96.7 },
          { value: '기타', frequency: 5, percent: 3.3, validPercent: 3.3, cumulativePercent: 100.0 }
        ],
        totalCount: 150,
        validCount: 150,
        missingCount: 0,
        uniqueValues: 4
      }

      actions.completeAnalysis(mockResults, 4)
      setActiveTab('summary')
    } catch (err) {
      actions.setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다')
    }
  }, [actions, setActiveTab])

  // 단계 변경 처리
  const handleStepChange = useCallback((step: number) => {
    if (step <= currentStep + 1) {
      actions.setCurrentStep(step)
    }
  }, [actions, currentStep])

  // 초기화
  const handleReset = useCallback(() => {
    actions.reset()
    setActiveTab('summary')
  }, [actions, setActiveTab])

  // 빈도표 렌더링
  const renderFrequencyTable = () => {
    if (!results) return null

    const columns = [
      { key: 'value', header: '값', type: 'text' as const },
      { key: 'frequency', header: '빈도', type: 'number' as const },
      ...(showPercentages ? [
        { key: 'percent', header: '비율(%)', type: 'number' as const },
        { key: 'validPercent', header: '유효 비율(%)', type: 'number' as const }
      ] : []),
      ...(showCumulative ? [
        { key: 'cumulativePercent', header: '누적 비율(%)', type: 'number' as const }
      ] : [])
    ]

    const data = [...results.data].sort((a, b) => {
      if (sortBy === 'frequency') return b.frequency - a.frequency
      if (sortBy === 'alphabetical') return a.value.localeCompare(b.value)
      if (sortBy === 'percent') return b.percent - a.percent
      return 0
    })

    return (
      <StatisticsTable
        columns={columns}
        data={data}
        title={`빈도표: ${results.variable}`}
      />
    )
  }

  // 요약 통계 렌더링
  const renderSummaryStats = () => {
    if (!results) return null

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">총 케이스</p>
                <p className="text-2xl font-bold">{results.totalCount}</p>
              </div>
              <Table className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">유효 케이스</p>
                <p className="text-2xl font-bold">{results.validCount}</p>
              </div>
              <Calculator className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">결측값</p>
                <p className="text-2xl font-bold">{results.missingCount}</p>
              </div>
              <Info className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">범주 수</p>
                <p className="text-2xl font-bold">{results.uniqueValues}</p>
              </div>
              <PieChart className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <StatisticsPageLayout
      title="빈도분석"
      subtitle="범주형 변수의 빈도와 비율 분석"
      icon={<BarChart3 className="w-6 h-6" />}
      steps={steps}
      currentStep={currentStep}
      onStepChange={handleStepChange}
      onRun={handleAnalysis}
      onReset={handleReset}
      isRunning={isAnalyzing}
      methodInfo={{
        formula: "빈도 = n_i, 비율 = n_i/N × 100%",
        assumptions: ["범주형 데이터", "서로 배타적인 범주"],
        sampleSize: "최소 제한 없음",
        usage: "명목형, 서열형 데이터의 분포 파악"
      }}
    >
      <div className="space-y-6">
        {/* 0단계: 데이터 업로드 */}
        {currentStep === 0 && (
          <DataUploadStep
            onUploadComplete={createDataUploadHandler(
              actions.setUploadedData,
              () => actions.setCurrentStep(1),
              'frequency-table'
            )}
          />
        )}

        {/* 1단계: 변수 선택 */}
        {currentStep === 1 && uploadedData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                분석할 변수 선택
              </CardTitle>
              <CardDescription>
                빈도분석을 수행할 범주형(명목형, 서열형) 변수를 선택하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VariableSelector
                methodId="frequency-table"
                data={uploadedData.data}
                onVariablesSelected={handleVariablesSelected}
                onBack={() => actions.setCurrentStep(0)}
              />
            </CardContent>
          </Card>
        )}

        {/* 2단계: 옵션 설정 */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                분석 옵션 설정
              </CardTitle>
              <CardDescription>
                빈도표 표시 형식과 정렬 옵션을 설정하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="percentages"
                    checked={showPercentages}
                    onCheckedChange={setShowPercentages}
                  />
                  <Label htmlFor="percentages">비율 표시</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="cumulative"
                    checked={showCumulative}
                    onCheckedChange={setShowCumulative}
                  />
                  <Label htmlFor="cumulative">누적 비율 표시</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Label>정렬 기준</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="frequency">빈도순</SelectItem>
                      <SelectItem value="alphabetical">알파벳순</SelectItem>
                      <SelectItem value="percent">비율순</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Button
                  onClick={() => actions.setCurrentStep(3)}
                  disabled={!selectedVariables}
                >
                  다음 단계
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 3단계: 분석 실행 */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="w-5 h-5" />
                분석 실행
              </CardTitle>
              <CardDescription>
                설정된 옵션으로 빈도분석을 실행합니다
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
                  {isAnalyzing ? '분석 중...' : '빈도분석 실행'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 4단계: 결과 확인 */}
        {results && currentStep === 4 && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="summary">요약</TabsTrigger>
              <TabsTrigger value="table">빈도표</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">요약 통계</h3>
                {renderSummaryStats()}
              </div>
            </TabsContent>

            <TabsContent value="table" className="space-y-6">
              {renderFrequencyTable()}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </StatisticsPageLayout>
  )
}