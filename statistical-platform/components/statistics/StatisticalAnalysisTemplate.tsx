'use client'

import { useState, useCallback, useEffect, lazy, Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Upload, Play, Download, Info, FileText, BarChart3, Settings, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { StatisticalTest } from '@/lib/statistics/ui-config'

// 덩치 큰 모듈을 동적으로 import
let Papa: typeof import('papaparse').default | null = null
let StatisticalCalculator: any | null = null

// Preload 함수들
const preloadPapa = async () => {
  if (!Papa) {
    const module = await import('papaparse')
    Papa = module.default
  }
  return Papa
}

const preloadStatisticalCalculator = async () => {
  if (!StatisticalCalculator) {
    const module = await import('@/lib/statistics/statistical-calculator')
    StatisticalCalculator = module.StatisticalCalculator
  }
  return StatisticalCalculator
}

interface StatisticalAnalysisTemplateProps {
  method: StatisticalTest
  testDataPath?: string
}

interface AnalysisParameters {
  [key: string]: any
}

interface AnalysisResult {
  tables?: { name: string; data: any[] }[]
  charts?: { type: string; data: any }[]
  metrics?: { name: string; value: number | string }[]
  interpretation?: string
  error?: string
}

export function StatisticalAnalysisTemplate({ method, testDataPath }: StatisticalAnalysisTemplateProps) {
  const [activeTab, setActiveTab] = useState('upload')
  const [uploadedData, setUploadedData] = useState<any[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [parameters, setParameters] = useState<AnalysisParameters>({})
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [results, setResults] = useState<AnalysisResult | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  // 알림 표시 함수
  const showNotification = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }, [])

  // 탭 변경 시 필요한 모듈 preload
  useEffect(() => {
    if (activeTab === 'upload') {
      // 업로드 탭에서 Papa 미리 로드
      preloadPapa()
    } else if (activeTab === 'parameters') {
      // 파라미터 탭에서 StatisticalCalculator 미리 로드
      preloadStatisticalCalculator()
    }
  }, [activeTab])

  // 예제 데이터 로드
  const loadExampleData = useCallback(async () => {
    if (!testDataPath) return

    try {
      const response = await fetch(testDataPath)
      if (!response.ok) throw new Error('파일을 찾을 수 없습니다')

      const text = await response.text()
      const PapaModule = await preloadPapa()
      const parsed = PapaModule.parse(text, { header: true, dynamicTyping: true })

      if (parsed.data && parsed.data.length > 0) {
        // 빈 행 제거
        const cleanData = parsed.data.filter((row: any) =>
          Object.values(row).some(val => val !== null && val !== undefined && val !== '')
        )

        actions.setUploadedData(cleanData)
        setColumns(Object.keys(cleanData[0]))
        setActiveTab('parameters')
        showNotification('success', `예제 데이터 로드 완료: ${cleanData.length}개 행`)
      }
    } catch (error) {
      showNotification('error', '예제 데이터를 불러올 수 없습니다')
    }
  }, [testDataPath, showNotification])

  // 파일 업로드 처리
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      showNotification('error', 'CSV 파일만 업로드 가능합니다')
      return
    }

    try {
      const PapaModule = await preloadPapa()
      PapaModule.parse(file, {
      header: true,
      dynamicTyping: true,
      complete: (result) => {
        if (result.data && result.data.length > 0) {
          // 빈 행 제거
          const cleanData = result.data.filter((row: any) =>
            Object.values(row).some(val => val !== null && val !== undefined && val !== '')
          )

          actions.setUploadedData(cleanData)
          setColumns(Object.keys(cleanData[0]))
          setActiveTab('parameters')
          showNotification('success', `데이터 업로드 완료: ${cleanData.length}개 행`)
        }
      },
      error: (error) => {
        showNotification('error', `업로드 실패: ${error.message}`)
      }
    })
    } catch (err) {
      showNotification('error', '파일 처리 모듈 로드 실패')
    }
  }, [showNotification])

  // 파라미터 변경 처리
  const handleParameterChange = useCallback((name: string, value: any) => {
    setParameters(prev => ({ ...prev, [name]: value }))
  }, [])

  // 분석 실행
  const runAnalysis = useCallback(async () => {
    if (uploadedData.length === 0) {
      showNotification('error', '데이터를 먼저 업로드하세요')
      return
    }

    // 필수 파라미터 검증
    const requiredParams = getRequiredParameters(method.id)
    for (const param of requiredParams) {
      if (!parameters[param]) {
        showNotification('error', `필수 파라미터를 입력하세요: ${param}`)
        return
      }
    }

    actions.startAnalysis()
    try {
      // 실제 통계 계산 실행
      const Calculator = await preloadStatisticalCalculator()
      const result = await Calculator.calculate(
        method.id,
        uploadedData,
        parameters
      )

      if (result.success && result.data) {
        setResults(result.data)
        setActiveTab('results')
        showNotification('success', '분석이 완료되었습니다')
      } else {
        throw new Error(result.error || '분석 실패')
      }
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : '분석 중 오류 발생')
    } finally {
      setIsAnalyzing(false)
    }
  }, [uploadedData, parameters, method.id, showNotification])

  // 결과 다운로드
  const downloadResults = useCallback(() => {
    if (!results) return

    const content = JSON.stringify({
      method: method.name,
      date: new Date().toISOString(),
      parameters,
      results
    }, null, 2)

    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${method.id}_results_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)

    showNotification('info', '결과를 다운로드했습니다')
  }, [results, method, parameters, showNotification])

  return (
    <div className="space-y-6">
      {/* 알림 메시지 */}
      {notification && (
        <Alert className={notification.type === 'error' ? 'border-destructive' : ''}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{notification.type === 'success' ? '성공' : notification.type === 'error' ? '오류' : '알림'}</AlertTitle>
          <AlertDescription>{notification.message}</AlertDescription>
        </Alert>
      )}

      {/* 헤더 정보 */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl">{method.name}</CardTitle>
              <CardDescription className="mt-2">{method.description}</CardDescription>
            </div>
            <method.icon className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                언제 사용하나요?
              </h4>
              <p className="text-sm text-muted-foreground">{method.whenToUse}</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">예시</h4>
              <p className="text-sm text-muted-foreground">{method.example}</p>
            </div>
          </div>

          {/* 가정사항 */}
          {method.assumptions && method.assumptions.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">가정사항</h4>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                {method.assumptions.map((assumption, i) => (
                  <li key={i}>{assumption}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 메인 작업 영역 */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="upload">
                <Upload className="h-4 w-4 mr-2" />
                데이터
              </TabsTrigger>
              <TabsTrigger value="parameters" disabled={uploadedData.length === 0}>
                <Settings className="h-4 w-4 mr-2" />
                설정
              </TabsTrigger>
              <TabsTrigger value="analysis" disabled={uploadedData.length === 0}>
                <Play className="h-4 w-4 mr-2" />
                실행
              </TabsTrigger>
              <TabsTrigger value="results" disabled={!results}>
                <BarChart3 className="h-4 w-4 mr-2" />
                결과
              </TabsTrigger>
            </TabsList>

            {/* 데이터 업로드 탭 */}
            <TabsContent value="upload" className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="file-upload">CSV 파일 선택</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="mt-2"
                  />
                </div>

                {testDataPath && (
                  <div>
                    <Button
                      variant="outline"
                      onClick={loadExampleData}
                      className="w-full"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      예제 데이터 사용
                    </Button>
                  </div>
                )}

                {uploadedData.length > 0 && (
                  <Alert>
                    <AlertDescription>
                      데이터 로드 완료: {uploadedData.length}개 행, {columns.length}개 열
                      <div className="mt-2">
                        <strong>열 이름:</strong> {columns.join(', ')}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* 데이터 요구사항 표시 */}
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>데이터 요구사항</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      {method.sampleSizeMin && <li>최소 표본 크기: {method.sampleSizeMin}개</li>}
                      <li>데이터 타입: {method.dataTypes.join(', ')}</li>
                      <li>CSV 형식 (첫 행은 헤더)</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>

            {/* 파라미터 설정 탭 */}
            <TabsContent value="parameters" className="space-y-4">
              <div className="grid gap-4">
                <h3 className="font-medium">분석 파라미터 설정</h3>
                {renderParameterForm(method, columns, parameters, handleParameterChange)}
                <Button
                  onClick={() => setActiveTab('analysis')}
                  className="w-full"
                >
                  설정 완료 → 분석 실행
                </Button>
              </div>
            </TabsContent>

            {/* 분석 실행 탭 */}
            <TabsContent value="analysis" className="space-y-4">
              <div className="text-center space-y-4">
                <h3 className="text-lg font-medium">분석 준비 완료</h3>
                <p className="text-muted-foreground">
                  {method.name} 분석을 실행합니다
                </p>

                {/* 파라미터 요약 */}
                {Object.keys(parameters).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">설정된 파라미터</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-left text-sm space-y-1">
                        {Object.entries(parameters).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="font-medium">{key}:</span>
                            <span>{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Button
                  onClick={runAnalysis}
                  disabled={isAnalyzing}
                  size="lg"
                  className="w-full"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      분석 중...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      분석 실행
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* 결과 확인 탭 */}
            <TabsContent value="results" className="space-y-4">
              {results && (
                <div className="space-y-4">
                  {/* 주요 지표 */}
                  {results.metrics && results.metrics.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>주요 결과</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 md:grid-cols-3">
                          {results.metrics.map((metric, i) => (
                            <div key={i} className="text-center p-4 rounded-lg bg-muted">
                              <p className="text-sm text-muted-foreground mb-1">{metric.name}</p>
                              <p className="text-2xl font-bold">{metric.value}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* 결과 테이블 */}
                  {results.tables && results.tables.map((table, i) => (
                    <Card key={i}>
                      <CardHeader>
                        <CardTitle className="text-base">{table.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                {Object.keys(table.data[0] || {}).map(key => (
                                  <th key={key} className="text-left p-2 font-medium">{key}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {table.data.map((row, j) => (
                                <tr key={j} className="border-b">
                                  {Object.values(row).map((value: any, k) => (
                                    <td key={k} className="p-2">{value}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* 해석 */}
                  {results.interpretation && (
                    <Card>
                      <CardHeader>
                        <CardTitle>결과 해석</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm leading-relaxed">{results.interpretation}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* 다운로드 버튼 */}
                  <Button onClick={downloadResults} variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    결과 다운로드 (JSON)
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

// 동적 파라미터 폼 렌더링
function renderParameterForm(
  method: StatisticalTest,
  columns: string[],
  parameters: AnalysisParameters,
  onChange: (name: string, value: any) => void
) {
  // 메서드별 기본 파라미터
  const params = getMethodParameters(method.id, columns)

  if (params.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          이 분석 방법은 추가 파라미터 설정이 필요하지 않습니다.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      {params.map(param => (
        <div key={param.name} className="space-y-2">
          <Label htmlFor={param.name}>
            {param.label}
            {param.required && <span className="text-destructive ml-1">*</span>}
          </Label>

          {param.type === 'column-select' && (
            <Select
              value={parameters[param.name] || ''}
              onValueChange={(value) => onChange(param.name, value)}
            >
              <SelectTrigger id={param.name}>
                <SelectValue placeholder="열을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {columns.map(col => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {param.type === 'number' && (
            <Input
              id={param.name}
              type="number"
              value={parameters[param.name] ?? param.defaultValue ?? ''}
              onChange={(e) => onChange(param.name, parseFloat(e.target.value))}
              min={param.min}
              max={param.max}
              step={param.step}
              placeholder={param.placeholder}
            />
          )}

          {param.type === 'select' && param.options && (
            <Select
              value={parameters[param.name] || param.defaultValue}
              onValueChange={(value) => onChange(param.name, value)}
            >
              <SelectTrigger id={param.name}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {param.options.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {param.type === 'checkbox' && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id={param.name}
                checked={parameters[param.name] ?? param.defaultValue ?? false}
                onCheckedChange={(checked) => onChange(param.name, checked)}
              />
              <Label htmlFor={param.name} className="font-normal cursor-pointer">
                {param.checkboxLabel || param.label}
              </Label>
            </div>
          )}

          {param.type === 'multi-column-select' && (
            <div className="grid grid-cols-2 gap-2">
              {columns.map(col => {
                const selected: string[] = Array.isArray(parameters[param.name]) ? parameters[param.name] : (param.defaultValue || [])
                const isChecked = selected.includes(col)
                return (
                  <div key={col} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${param.name}_${col}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        const next = new Set<string>(selected)
                        if (checked) next.add(col); else next.delete(col)
                        onChange(param.name, Array.from(next))
                      }}
                    />
                    <Label htmlFor={`${param.name}_${col}`} className="font-normal cursor-pointer">
                      {col}
                    </Label>
                  </div>
                )
              })}
            </div>
          )}

          {param.description && (
            <p className="text-sm text-muted-foreground">{param.description}</p>
          )}
        </div>
      ))}
    </div>
  )
}

// 필수 파라미터 목록 가져오기
function getRequiredParameters(methodId: string): string[] {
  const requiredParams: Record<string, string[]> = {
    'oneSampleTTest': ['column', 'popmean'],
    'twoSampleTTest': ['value_column', 'group_column'],
    'pairedTTest': ['column1', 'column2'],
    'homogeneityTest': ['groupColumn', 'valueColumn'],
    'oneWayANOVA': ['groupColumn', 'valueColumn'],
    'twoWayANOVA': ['factor1Column', 'factor2Column', 'valueColumn'],
    'manova': ['dependentColumns', 'groupColumn'],
    'correlationAnalysis': ['columns'],
    'simpleLinearRegression': ['independentColumn', 'dependentColumn'],
    'multipleRegression': ['independentColumns', 'dependentColumn'],
    'logisticRegression': ['independentColumns', 'dependentColumn'],
    'mannWhitneyU': ['column1', 'column2'],
    'wilcoxonSignedRank': ['column1', 'column2'],
    'kruskalWallis': ['groupColumn', 'valueColumn'],
    'dunnTest': ['groupColumn', 'valueColumn'],
    'chiSquareTest': ['rowColumn', 'columnColumn'],
    'timeSeriesDecomposition': ['column'],
    'arimaForecast': ['column', 'p', 'd', 'q', 'steps'],
    'kaplanMeierSurvival': ['timeColumn', 'eventColumn'],
    'oneSampleProportionTest': ['column', 'expected_proportion']
  }
  return requiredParams[methodId] || []
}

// 메서드별 파라미터 정의
function getMethodParameters(methodId: string, columns: string[]) {
  const parameterMap: Record<string, any[]> = {
    'oneSampleTTest': [
      {
        name: 'column',
        label: '검정할 열',
        type: 'column-select',
        required: true,
        description: '분석할 데이터가 있는 열을 선택하세요'
      },
      {
        name: 'popmean',
        label: '모집단 평균',
        type: 'number',
        required: true,
        placeholder: '예: 100',
        description: '비교할 모집단의 평균값을 입력하세요'
      },
      {
        name: 'alternative',
        label: '대립가설',
        type: 'select',
        defaultValue: 'two-sided',
        options: [
          { value: 'two-sided', label: '양측검정 (≠)' },
          { value: 'less', label: '단측검정 (<)' },
          { value: 'greater', label: '단측검정 (>)' }
        ],
        description: '검정 방향을 선택하세요'
      },
      {
        name: 'confidence',
        label: '신뢰수준',
        type: 'number',
        defaultValue: 0.95,
        min: 0.9,
        max: 0.99,
        step: 0.01,
        description: '일반적으로 0.95 (95%) 사용'
      }
    ],
    'twoSampleTTest': [
      {
        name: 'value_column',
        label: '값 열',
        type: 'column-select',
        required: true,
        description: '비교할 수치 데이터가 있는 열'
      },
      {
        name: 'group_column',
        label: '그룹 열',
        type: 'column-select',
        required: true,
        description: '그룹을 구분하는 열 (2개 그룹만 가능)'
      },
      {
        name: 'equal_var',
        label: '등분산 가정',
        type: 'checkbox',
        defaultValue: true,
        checkboxLabel: '두 그룹의 분산이 같다고 가정',
        description: '확실하지 않으면 체크 해제 (Welch t-test 수행)'
      }
    ],
    'pairedTTest': [
      {
        name: 'column1',
        label: '사전 측정 열',
        type: 'column-select',
        required: true,
        description: '첫 번째(사전) 측정 열을 선택하세요'
      },
      {
        name: 'column2',
        label: '사후 측정 열',
        type: 'column-select',
        required: true,
        description: '두 번째(사후) 측정 열을 선택하세요'
      },
      {
        name: 'alternative',
        label: '대립가설',
        type: 'select',
        defaultValue: 'two-sided',
        options: [
          { value: 'two-sided', label: '양측검정 (≠)' },
          { value: 'less', label: '단측검정 (<)' },
          { value: 'greater', label: '단측검정 (>)' }
        ]
      }
    ],
    'homogeneityTest': [
      {
        name: 'valueColumn',
        label: '값 열',
        type: 'column-select',
        required: true
      },
      {
        name: 'groupColumn',
        label: '그룹 열',
        type: 'column-select',
        required: true
      },
      {
        name: 'method',
        label: '검정 방법',
        type: 'select',
        defaultValue: 'levene',
        options: [
          { value: 'levene', label: "Levene's Test" },
          { value: 'bartlett', label: "Bartlett's Test" },
          { value: 'fligner', label: 'Fligner-Killeen Test' }
        ]
      }
    ],
    'oneWayANOVA': [
      {
        name: 'valueColumn',
        label: '값 열',
        type: 'column-select',
        required: true
      },
      {
        name: 'groupColumn',
        label: '그룹 열',
        type: 'column-select',
        required: true
      },
      {
        name: 'postHoc',
        label: '사후검정',
        type: 'select',
        defaultValue: 'none',
        options: [
          { value: 'none', label: '없음' },
          { value: 'tukeyHSD', label: 'Tukey HSD' },
          { value: 'bonferroni', label: 'Bonferroni' },
          { value: 'gamesHowell', label: 'Games-Howell' }
        ]
      }
    ],
    'twoWayANOVA': [
      {
        name: 'valueColumn',
        label: '값 열',
        type: 'column-select',
        required: true
      },
      {
        name: 'factor1Column',
        label: '요인 1 열',
        type: 'column-select',
        required: true
      },
      {
        name: 'factor2Column',
        label: '요인 2 열',
        type: 'column-select',
        required: true
      },
      {
        name: 'interaction',
        label: '상호작용 포함',
        type: 'checkbox',
        defaultValue: true,
        checkboxLabel: '요인 상호작용 효과 포함'
      }
    ],
    'correlationAnalysis': [
      {
        name: 'columns',
        label: '변수 선택(2개 이상)',
        type: 'multi-column-select',
        required: true
      },
      {
        name: 'method',
        label: '상관계수 방법',
        type: 'select',
        defaultValue: 'pearson',
        options: [
          { value: 'pearson', label: 'Pearson' },
          { value: 'spearman', label: 'Spearman' },
          { value: 'kendall', label: 'Kendall' }
        ]
      }
    ],
    'simpleLinearRegression': [
      {
        name: 'independentColumn',
        label: '독립변수(X)',
        type: 'column-select',
        required: true
      },
      {
        name: 'dependentColumn',
        label: '종속변수(Y)',
        type: 'column-select',
        required: true
      }
    ],
    'multipleRegression': [
      {
        name: 'independentColumns',
        label: '독립변수들(2개 이상)',
        type: 'multi-column-select',
        required: true
      },
      {
        name: 'dependentColumn',
        label: '종속변수(Y)',
        type: 'column-select',
        required: true
      }
    ],
    'logisticRegression': [
      {
        name: 'independentColumns',
        label: '독립변수들(2개 이상)',
        type: 'multi-column-select',
        required: true
      },
      {
        name: 'dependentColumn',
        label: '종속변수(0/1)',
        type: 'column-select',
        required: true
      },
      {
        name: 'method',
        label: '최적화 방법',
        type: 'select',
        defaultValue: 'newton-cg',
        options: [
          { value: 'newton-cg', label: 'newton-cg' },
          { value: 'lbfgs', label: 'lbfgs' },
          { value: 'liblinear', label: 'liblinear' }
        ]
      },
      {
        name: 'maxIter',
        label: '최대 반복',
        type: 'number',
        defaultValue: 100,
        min: 50,
        max: 2000,
        step: 50
      }
    ],
    'mannWhitneyU': [
      {
        name: 'column1',
        label: '그룹1 값 열',
        type: 'column-select',
        required: true
      },
      {
        name: 'column2',
        label: '그룹2 값 열',
        type: 'column-select',
        required: true
      },
      {
        name: 'alternative',
        label: '대립가설',
        type: 'select',
        defaultValue: 'two-sided',
        options: [
          { value: 'two-sided', label: '양측' },
          { value: 'less', label: '단측(<)' },
          { value: 'greater', label: '단측(>)' }
        ]
      }
    ],
    'wilcoxonSignedRank': [
      {
        name: 'column1',
        label: '사전 열',
        type: 'column-select',
        required: true
      },
      {
        name: 'column2',
        label: '사후 열',
        type: 'column-select',
        required: true
      },
      {
        name: 'alternative',
        label: '대립가설',
        type: 'select',
        defaultValue: 'two-sided',
        options: [
          { value: 'two-sided', label: '양측' },
          { value: 'less', label: '단측(<)' },
          { value: 'greater', label: '단측(>)' }
        ]
      },
      {
        name: 'zeroMethod',
        label: '영값 처리',
        type: 'select',
        defaultValue: 'pratt',
        options: [
          { value: 'pratt', label: 'pratt' },
          { value: 'wilcox', label: 'wilcox' }
        ]
      }
    ],
    'kruskalWallis': [
      {
        name: 'valueColumn',
        label: '값 열',
        type: 'column-select',
        required: true
      },
      {
        name: 'groupColumn',
        label: '그룹 열',
        type: 'column-select',
        required: true
      },
      {
        name: 'postHoc',
        label: '사후검정',
        type: 'select',
        defaultValue: 'none',
        options: [
          { value: 'none', label: '없음' },
          { value: 'dunn', label: "Dunn's Test" }
        ]
      }
    ],
    'dunnTest': [
      {
        name: 'valueColumn',
        label: '값 열',
        type: 'column-select',
        required: true
      },
      {
        name: 'groupColumn',
        label: '그룹 열',
        type: 'column-select',
        required: true
      },
      {
        name: 'pAdjust',
        label: 'p-value 보정',
        type: 'select',
        defaultValue: 'holm',
        options: [
          { value: 'holm', label: 'Holm' },
          { value: 'bonferroni', label: 'Bonferroni' },
          { value: 'fdr', label: 'FDR (BH)' }
        ]
      }
    ],
    'chiSquareTest': [
      {
        name: 'rowColumn',
        label: '행 변수 열',
        type: 'column-select',
        required: true
      },
      {
        name: 'columnColumn',
        label: '열 변수 열',
        type: 'column-select',
        required: true
      },
      {
        name: 'correction',
        label: 'Yates 연속성 보정',
        type: 'checkbox',
        defaultValue: false
      }
    ],
    'timeSeriesDecomposition': [
      {
        name: 'column',
        label: '시계열 값 열',
        type: 'column-select',
        required: true
      },
      {
        name: 'period',
        label: '주기(선택)',
        type: 'number',
        description: '미지정 시 자동 감지'
      }
    ],
    'manova': [
      {
        name: 'dependentColumns',
        label: '종속변수 선택(2개 이상)',
        type: 'multi-column-select',
        required: true,
        description: '동시에 분석할 종속변수들을 선택하세요'
      },
      {
        name: 'groupColumn',
        label: '그룹 변수',
        type: 'column-select',
        required: true,
        description: '그룹을 구분하는 변수를 선택하세요'
      }
    ],
    'arimaForecast': [
      {
        name: 'column',
        label: '시계열 데이터 열',
        type: 'column-select',
        required: true
      },
      {
        name: 'p',
        label: '자기회귀 차수 (p)',
        type: 'number',
        required: true,
        defaultValue: 1,
        min: 0,
        max: 5,
        description: 'AR(p) - 과거 값의 개수'
      },
      {
        name: 'd',
        label: '차분 차수 (d)',
        type: 'number',
        required: true,
        defaultValue: 1,
        min: 0,
        max: 2,
        description: '비정상 시계열을 정상화하기 위한 차분 횟수'
      },
      {
        name: 'q',
        label: '이동평균 차수 (q)',
        type: 'number',
        required: true,
        defaultValue: 1,
        min: 0,
        max: 5,
        description: 'MA(q) - 과거 오차의 개수'
      },
      {
        name: 'steps',
        label: '예측 기간',
        type: 'number',
        required: true,
        defaultValue: 12,
        min: 1,
        description: '미래 예측할 시점 수'
      }
    ],
    'kaplanMeierSurvival': [
      {
        name: 'timeColumn',
        label: '생존시간 열',
        type: 'column-select',
        required: true,
        description: '사건 발생까지의 시간'
      },
      {
        name: 'eventColumn',
        label: '사건발생 열',
        type: 'column-select',
        required: true,
        description: '0=중도절단, 1=사건발생'
      }
    ],
    'pca': [
      {
        name: 'columns',
        label: '변수 선택(2개 이상)',
        type: 'multi-column-select',
        required: true
      },
      {
        name: 'nComponents',
        label: '주성분 개수(선택)',
        type: 'number'
      },
      {
        name: 'standardize',
        label: '표준화 사용',
        type: 'checkbox',
        defaultValue: true
      }
    ],
    'kMeansClustering': [
      {
        name: 'columns',
        label: '변수 선택(2개 이상)',
        type: 'multi-column-select',
        required: true
      },
      {
        name: 'nClusters',
        label: '클러스터 개수',
        type: 'number',
        defaultValue: 3,
        min: 2,
        step: 1
      },
      {
        name: 'standardize',
        label: '표준화 사용',
        type: 'checkbox',
        defaultValue: true
      }
    ],
    'hierarchicalClustering': [
      {
        name: 'columns',
        label: '변수 선택(2개 이상)',
        type: 'multi-column-select',
        required: true
      },
      {
        name: 'method',
        label: '연결 방법',
        type: 'select',
        defaultValue: 'ward',
        options: [
          { value: 'ward', label: 'ward' },
          { value: 'complete', label: 'complete' },
          { value: 'average', label: 'average' },
          { value: 'single', label: 'single' }
        ]
      },
      {
        name: 'nClusters',
        label: '클러스터 개수(선택)',
        type: 'number',
        step: 1
      },
      {
        name: 'standardize',
        label: '표준화 사용',
        type: 'checkbox',
        defaultValue: true
      }
    ],
    // 기본 파라미터 (메서드가 정의되지 않은 경우)
    'oneSampleProportionTest': [
      {
        name: 'column',
        label: '검정할 열',
        type: 'column-select',
        required: true,
        description: '성공/실패, 1/0, Yes/No 등의 이진 데이터가 있는 열'
      },
      {
        name: 'expected_proportion',
        label: '기대 비율',
        type: 'number',
        required: true,
        defaultValue: 0.5,
        min: 0,
        max: 1,
        step: 0.01,
        placeholder: '예: 0.5',
        description: '비교할 기준 비율 (0과 1 사이의 값)'
      },
      {
        name: 'alternative',
        label: '대립가설',
        type: 'select',
        defaultValue: 'two-sided',
        options: [
          { value: 'two-sided', label: '양측검정' },
          { value: 'greater', label: '단측검정 (크다)' },
          { value: 'less', label: '단측검정 (작다)' }
        ]
      },
      {
        name: 'confidence_level',
        label: '신뢰수준',
        type: 'number',
        defaultValue: 0.95,
        min: 0.8,
        max: 0.99,
        step: 0.01,
        description: '일반적으로 0.95 (95%) 사용'
      }
    ],
    'default': [
      {
        name: 'column',
        label: '분석할 열',
        type: 'column-select',
        required: true,
        description: '분석할 데이터 열을 선택하세요'
      }
    ]
  }

  return parameterMap[methodId] || parameterMap['default']
}