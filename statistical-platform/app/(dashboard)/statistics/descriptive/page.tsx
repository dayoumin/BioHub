'use client'

/**
 * 기술통계 페이지 - TwoPanelLayout
 *
 * 회귀분석 페이지 패턴 적용:
 * - TwoPanelLayout 사용
 * - 단계별 UI
 * - 우측 챗봇 패널 지원
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calculator, TrendingUp, BarChart3, Info, CheckCircle, Table as TableIcon } from 'lucide-react'
import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { DataTableViewer } from '@/components/statistics/common/DataTableViewer'
import { VariableSelectorPanel, COMMON_ROLES } from '@/components/variable-selection/VariableSelectorPanel'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import type { UploadedData } from '@/hooks/use-statistics-page'
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'

// Types
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

interface DescriptiveVariables {
  variables: string[]
}

const STEPS = [
  { id: 1, label: '데이터 업로드' },
  { id: 2, label: '변수 선택' },
  { id: 3, label: '옵션 설정' },
  { id: 4, label: '분석 결과' }
]

export default function DescriptiveStatsPage() {
  useEffect(() => {
    addToRecentStatistics('descriptive')
  }, [])

  const { state, actions } = useStatisticsPage<DescriptiveResults, DescriptiveVariables>({
    withUploadedData: true,
    withError: true,
    initialStep: 1
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state

  const pyodideCore = useMemo(() => PyodideCoreService.getInstance(), [])

  // 옵션 상태
  const [activeTab, setActiveTab] = useState('summary')
  const [showAdvanced, setShowAdvanced] = useState(true)
  const [showConfidenceInterval, setShowConfidenceInterval] = useState(true)
  const [confidenceLevel, setConfidenceLevel] = useState('95')

  // Breadcrumbs
  const breadcrumbs = [
    { label: '홈', href: '/' },
    { label: '기술통계' }
  ]

  // Steps with completed status
  const stepsWithCompleted = useMemo(() => {
    return STEPS.map(step => ({
      ...step,
      completed: step.id < currentStep
    }))
  }, [currentStep])

  // 데이터 업로드 핸들러
  const handleDataUpload = useCallback((file: File, data: Array<Record<string, unknown>>) => {
    const columns = data.length > 0 ? Object.keys(data[0]) : []
    if (actions.setUploadedData) {
      actions.setUploadedData({ data, fileName: file.name, columns })
    }
    actions.setCurrentStep(2)
  }, [actions])

  // 변수 선택 핸들러 (Step 이동은 "다음 단계" 버튼에서만)
  const handleVariableSelect = useCallback((vars: Partial<DescriptiveVariables>) => {
    if (actions.setSelectedVariables && vars.variables !== undefined) {
      actions.setSelectedVariables({ variables: vars.variables })
      // ❌ actions.setCurrentStep(3) 제거: "다음 단계" 버튼 클릭 시에만 이동
    }
  }, [actions])

  // 분석 실행
  const handleAnalysis = useCallback(async () => {
    if (!uploadedData || !selectedVariables || !actions.startAnalysis) return

    actions.startAnalysis()

    try {
      const data = uploadedData.data
      const variableNames = selectedVariables.variables

      if (!variableNames || variableNames.length === 0) {
        if (actions.setError) actions.setError('분석할 변수를 선택해주세요.')
        return
      }

      const variableResults: DescriptiveStats[] = []
      const totalCases = data.length

      // 행 단위로 결측치 계산: 선택된 변수 중 하나라도 결측이면 해당 행은 결측 행
      let rowsWithMissing = 0
      for (const row of data) {
        let hasMissing = false
        for (const variable of variableNames) {
          if (typeof row === 'object' && row !== null && variable in row) {
            const value = (row as Record<string, unknown>)[variable]
            const isValidNumber = typeof value === 'number' ||
              (typeof value === 'string' && !isNaN(parseFloat(value)))
            if (!isValidNumber) {
              hasMissing = true
              break
            }
          } else {
            hasMissing = true
            break
          }
        }
        if (hasMissing) rowsWithMissing++
      }

      // 각 변수별로 분석
      for (const variable of variableNames) {
        const values: number[] = []
        let missing = 0

        for (const row of data) {
          if (typeof row === 'object' && row !== null && variable in row) {
            const value = (row as Record<string, unknown>)[variable]
            if (typeof value === 'number') {
              values.push(value)
            } else if (typeof value === 'string') {
              const num = parseFloat(value)
              if (!isNaN(num)) {
                values.push(num)
              } else {
                missing++
              }
            } else {
              missing++
            }
          } else {
            missing++
          }
        }

        if (values.length === 0) {
          if (actions.setError) actions.setError(`변수 "${variable}"에 유효한 숫자 데이터가 없습니다.`)
          return
        }

        // PyodideCore 호출
        const result = await pyodideCore.callWorkerMethod<{
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
        }>(
          PyodideWorker.Descriptive,
          'descriptive_stats',
          {
            data: values,
            confidence_level: parseFloat(confidenceLevel) / 100
          }
        )

        variableResults.push({
          variable,
          ...result,
          missing
        })
      }

      const analysisResult: DescriptiveResults = {
        variables: variableResults,
        totalCases,
        validCases: totalCases - rowsWithMissing,
        missingCases: rowsWithMissing,
        analysisDate: new Date().toLocaleString('ko-KR')
      }

      if (actions.completeAnalysis) {
        actions.completeAnalysis(analysisResult, 4)
      }
      setActiveTab('summary')
    } catch (err) {
      if (actions.setError) {
        actions.setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다')
      }
    }
  }, [uploadedData, selectedVariables, confidenceLevel, actions, pyodideCore])

  // 요약 카드 렌더링
  const renderSummaryCards = () => {
    if (!results) return null

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">전체 케이스</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{results.totalCases}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">유효 케이스</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{results.validCases}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">결측치</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{results.missingCases}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

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
        title="기술통계량"
        columns={columns}
        data={results.variables}
      />
    )
  }

  return (
    <TwoPanelLayout
      currentStep={currentStep}
      steps={stepsWithCompleted}
      onStepChange={actions.setCurrentStep}
      analysisTitle="기술통계"
      analysisSubtitle="Descriptive Statistics"
      analysisIcon={<BarChart3 className="h-5 w-5 text-primary" />}
      breadcrumbs={breadcrumbs}
    >
      {/* Step 1: 데이터 업로드 */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">데이터 업로드</h2>
              <p className="text-sm text-muted-foreground">
                분석할 데이터 파일을 업로드하세요 (CSV 또는 Excel)
              </p>
            </div>
            {uploadedData && (
              <DataTableViewer
                data={uploadedData.data}
                columns={uploadedData.columns}
                fileName={uploadedData.fileName}
                trigger={
                  <Button variant="outline" size="sm">
                    <TableIcon className="w-4 h-4 mr-2" />
                    데이터 전체보기
                  </Button>
                }
              />
            )}
          </div>

          <DataUploadStep
            onUploadComplete={handleDataUpload}
            onNext={() => actions.setCurrentStep(2)}
            canGoNext={!!uploadedData}
          />

          {/* 업로드 후 데이터 요약 */}
          {uploadedData && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary">
                      {uploadedData.fileName}
                    </Badge>
                    <span className="text-muted-foreground">
                      {uploadedData.data.length.toLocaleString()}행 × {uploadedData.columns.length}열
                    </span>
                  </div>
                  <Button
                    onClick={() => actions.setCurrentStep(2)}
                    size="sm"
                  >
                    다음 단계
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step 2: 변수 선택 */}
      {currentStep === 2 && uploadedData && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">변수 선택</h2>
              <p className="text-sm text-muted-foreground">
                기술통계를 계산할 수치형 변수를 선택하세요 (여러 개 선택 가능)
              </p>
            </div>
            <DataTableViewer
              data={uploadedData.data}
              columns={uploadedData.columns}
              fileName={uploadedData.fileName}
              trigger={
                <Button variant="outline" size="sm">
                  <TableIcon className="w-4 h-4 mr-2" />
                  데이터 확인
                </Button>
              }
            />
          </div>

          <VariableSelectorPanel
            data={uploadedData.data}
            columns={uploadedData.columns}
            roles={COMMON_ROLES.descriptive}
            assignment={selectedVariables ? { variables: selectedVariables.variables } : {}}
            onAssignmentChange={(assignment) => {
              const vars = assignment.variables
              if (vars) {
                const variableArray = Array.isArray(vars) ? vars : [vars]
                handleVariableSelect({ variables: variableArray })
              } else {
                handleVariableSelect({ variables: [] })
              }
            }}
            onComplete={() => actions.setCurrentStep(3)}
          />
        </div>
      )}

      {/* Step 3: 옵션 설정 */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">옵션 설정</h2>
            <p className="text-sm text-muted-foreground">
              표시할 통계량과 신뢰구간을 설정하세요
            </p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                <CardTitle>통계량 옵션</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="advanced">고급 통계량 표시 (분산, IQR, 왜도, 첨도)</Label>
                <Switch
                  id="advanced"
                  checked={showAdvanced}
                  onCheckedChange={setShowAdvanced}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="ci">신뢰구간 표시</Label>
                <Switch
                  id="ci"
                  checked={showConfidenceInterval}
                  onCheckedChange={setShowConfidenceInterval}
                />
              </div>

              {showConfidenceInterval && (
                <div>
                  <Label htmlFor="ci-level">신뢰수준</Label>
                  <Select value={confidenceLevel} onValueChange={setConfidenceLevel}>
                    <SelectTrigger id="ci-level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="90">90%</SelectItem>
                      <SelectItem value="95">95%</SelectItem>
                      <SelectItem value="99">99%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button
                onClick={handleAnalysis}
                disabled={isAnalyzing}
                className="w-full"
                size="lg"
              >
                <Calculator className="w-4 h-4 mr-2" />
                {isAnalyzing ? '분석 중...' : '기술통계 계산'}
              </Button>

              {error && (
                <div className="text-sm text-destructive">{error}</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 4: 결과 확인 */}
      {currentStep === 4 && results && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="summary">요약</TabsTrigger>
            <TabsTrigger value="table">통계표</TabsTrigger>
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
        </Tabs>
      )}
    </TwoPanelLayout>
  )
}
