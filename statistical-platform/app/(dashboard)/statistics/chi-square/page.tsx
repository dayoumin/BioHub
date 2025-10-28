'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Info,
  PlayCircle,
  Grid3X3,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  Plus,
  Minus
} from 'lucide-react'
import { StatisticsPageLayout } from '@/components/statistics/StatisticsPageLayout'
import { VariableSelector } from '@/components/variable-selection/VariableSelector'
import { StatisticalResultCard } from '@/components/statistics/common/StatisticalResultCard'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { VariableMapping } from '@/components/variable-selection/types'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import type { StatisticalResult } from '@/components/statistics/common/StatisticalResultCard'

type ChiSquareTest = 'independence' | 'goodness-of-fit' | 'fishers-exact'

interface TestDescription {
  name: string
  description: string
  use_cases: string[]
  requirements: string
  icon: React.ReactNode
}

const testDescriptions: Record<ChiSquareTest, TestDescription> = {
  'independence': {
    name: '독립성 검정',
    description: '두 범주형 변수 간의 연관성을 검정합니다.',
    use_cases: [
      '성별과 선호도의 관련성',
      '치료법과 치료결과의 독립성',
      '지역과 투표성향의 연관성'
    ],
    requirements: '2×2 이상의 분할표',
    icon: <Grid3X3 className="w-5 h-5" />
  },
  'goodness-of-fit': {
    name: '적합도 검정',
    description: '관측 빈도가 기대 분포와 일치하는지 검정합니다.',
    use_cases: [
      '주사위 공정성 검정',
      '정규분포 적합성',
      '예상 비율과 실제 비율 비교'
    ],
    requirements: '1차원 빈도 데이터',
    icon: <BarChart3 className="w-5 h-5" />
  },
  'fishers-exact': {
    name: 'Fisher 정확 검정',
    description: '작은 표본의 2×2 분할표를 정확하게 검정합니다.',
    use_cases: [
      '표본 크기가 작을 때',
      '기대빈도가 5 미만일 때',
      '정확한 p-value가 필요할 때'
    ],
    requirements: '2×2 분할표',
    icon: <CheckCircle2 className="w-5 h-5" />
  }
}

export default function ChiSquareTestPage() {
  const { state, actions } = useStatisticsPage<StatisticalResult>({
    withUploadedData: false,
    withError: false
  })
  const { variableMapping, results: result, isAnalyzing } = state
  const [selectedTest, setSelectedTest] = useState<ChiSquareTest>('independence')
  const [activeTab, setActiveTab] = useState('setup')
  const [alpha, setAlpha] = useState('0.05')

  // 분할표 상태
  const [tableRows, setTableRows] = useState(2)
  const [tableCols, setTableCols] = useState(2)
  const [contingencyTable, setContingencyTable] = useState<number[][]>(
    Array(2).fill(null).map(() => Array(2).fill(0))
  )

  const currentTest = testDescriptions[selectedTest]

  // 분할표 크기 변경
  const resizeTable = (rows: number, cols: number) => {
    const newTable = Array(rows).fill(null).map((_, i) =>
      Array(cols).fill(null).map((_, j) =>
        contingencyTable[i]?.[j] || 0
      )
    )
    setContingencyTable(newTable)
    setTableRows(rows)
    setTableCols(cols)
  }

  // 셀 값 변경
  const updateCell = (row: number, col: number, value: string) => {
    const newTable = [...contingencyTable]
    newTable[row][col] = parseInt(value) || 0
    setContingencyTable(newTable)
  }

  // Mock 분석 실행
  const runAnalysis = async () => {
    actions.startAnalysis()()

    setTimeout(() => {
      const mockResult: StatisticalResult = {
        testName: currentTest.name,
        testType: '카이제곱 검정',
        description: currentTest.description,
        statistic: 7.815,
        statisticName: 'χ²',
        df: selectedTest === 'independence' ? (tableRows - 1) * (tableCols - 1) :
            selectedTest === 'goodness-of-fit' ? tableCols - 1 : 1,
        pValue: 0.0052,
        alpha: parseFloat(alpha),
        effectSize: {
          value: 0.28,
          type: 'cramers_v'
        },
        assumptions: [
          {
            name: '최소 기대빈도',
            description: '모든 셀의 기대빈도가 5 이상이어야 함',
            pValue: null,
            passed: true,
            recommendation: '최소 기대빈도: 7.2'
          },
          {
            name: '표본 독립성',
            description: '각 관측치는 독립적이어야 함',
            pValue: null,
            passed: true,
            recommendation: '연구 설계상 독립성 보장'
          }
        ],
        additionalResults: {
          title: '분할표 및 기대빈도',
          columns: [
            { key: 'category', header: '범주', type: 'text' },
            { key: 'observed', header: '관측빈도', type: 'number' },
            { key: 'expected', header: '기대빈도', type: 'number' },
            { key: 'residual', header: '잔차', type: 'number' }
          ],
          data: [
            { category: 'A-1', observed: 25, expected: 20.5, residual: 4.5 },
            { category: 'A-2', observed: 15, expected: 19.5, residual: -4.5 },
            { category: 'B-1', observed: 30, expected: 34.5, residual: -4.5 },
            { category: 'B-2', observed: 40, expected: 35.5, residual: 4.5 }
          ]
        },
        interpretation: `카이제곱 검정 결과, χ²(${(tableRows - 1) * (tableCols - 1)}) = 7.815, p = 0.0052로 유의수준 0.05에서 통계적으로 유의합니다. 두 변수 간에 연관성이 있습니다.`,
        recommendations: [
          'Cramér\'s V = 0.28로 중간 정도의 효과크기를 보임',
          '잔차 분석을 통해 어느 셀이 독립성에서 벗어났는지 확인',
          '필요시 사후검정으로 세부 패턴 분석'
        ],
        sampleSize: 110,
        groups: tableRows * tableCols
      }

      setResults(mockResult)
      setActiveTab('results')
    }, 1500)
  }

  // 변수 요구사항 생성
  const getVariableRequirements = () => {
    if (selectedTest === 'independence') {
      return [
        {
          role: 'row_variable',
          name: '행 변수',
          description: '첫 번째 범주형 변수',
          required: true,
          multiple: false,
          allowedTypes: ['categorical', 'binary'] as const
        },
        {
          role: 'column_variable',
          name: '열 변수',
          description: '두 번째 범주형 변수',
          required: true,
          multiple: false,
          allowedTypes: ['categorical', 'binary'] as const
        }
      ]
    } else {
      return [
        {
          role: 'categorical',
          name: '범주 변수',
          description: '분석할 범주형 변수',
          required: true,
          multiple: false,
          allowedTypes: ['categorical'] as const
        }
      ]
    }
  }

  return (
    <StatisticsPageLayout
      title="카이제곱 검정"
      description="범주형 변수의 독립성과 적합도를 검정합니다"
      icon={<Grid3X3 className="w-8 h-8" />}
    >
      <div className="space-y-6">
        {/* 검정 방법 선택 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              카이제곱 검정 방법 선택
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={selectedTest}
              onValueChange={(value) => setSelectedTest(value as ChiSquareTest)}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(testDescriptions).map(([key, desc]) => (
                  <label
                    key={key}
                    htmlFor={key}
                    className={`
                      flex flex-col p-4 rounded-lg border cursor-pointer
                      transition-all duration-200
                      ${selectedTest === key
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-gray-200 hover:bg-gray-50'}
                    `}
                  >
                    <div className="flex items-start">
                      <RadioGroupItem value={key} id={key} className="mt-1" />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {desc.icon}
                          <span className="font-semibold">{desc.name}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {desc.description}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {desc.requirements}
                        </Badge>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="setup">데이터 입력</TabsTrigger>
            <TabsTrigger value="assumptions">가정 확인</TabsTrigger>
            <TabsTrigger value="results" disabled={!result}>결과</TabsTrigger>
          </TabsList>

          {/* 데이터 입력 탭 */}
          <TabsContent value="setup" className="space-y-6">
            {/* 분할표 입력 */}
            {selectedTest === 'independence' && (
              <Card>
                <CardHeader>
                  <CardTitle>분할표 입력</CardTitle>
                  <CardDescription>
                    관측 빈도를 직접 입력하거나 데이터에서 자동 계산합니다
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 표 크기 조절 */}
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <Label>행:</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resizeTable(Math.max(2, tableRows - 1), tableCols)}
                        disabled={tableRows <= 2}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-8 text-center">{tableRows}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resizeTable(tableRows + 1, tableCols)}
                        disabled={tableRows >= 10}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label>열:</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resizeTable(tableRows, Math.max(2, tableCols - 1))}
                        disabled={tableCols <= 2}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-8 text-center">{tableCols}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resizeTable(tableRows, tableCols + 1)}
                        disabled={tableCols >= 10}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* 분할표 */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20"></TableHead>
                          {Array(tableCols).fill(null).map((_, j) => (
                            <TableHead key={j} className="text-center">
                              열 {j + 1}
                            </TableHead>
                          ))}
                          <TableHead className="text-center bg-gray-50">합계</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contingencyTable.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">행 {i + 1}</TableCell>
                            {row.map((cell, j) => (
                              <TableCell key={j}>
                                <Input
                                  type="number"
                                  value={cell}
                                  onChange={(e) => updateCell(i, j, e.target.value)}
                                  className="w-20 text-center"
                                  min="0"
                                />
                              </TableCell>
                            ))}
                            <TableCell className="text-center font-medium bg-gray-50">
                              {row.reduce((sum, val) => sum + val, 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell className="font-medium bg-gray-50">합계</TableCell>
                          {Array(tableCols).fill(null).map((_, j) => (
                            <TableCell key={j} className="text-center font-medium bg-gray-50">
                              {contingencyTable.reduce((sum, row) => sum + row[j], 0)}
                            </TableCell>
                          ))}
                          <TableCell className="text-center font-bold bg-gray-100">
                            {contingencyTable.flat().reduce((sum, val) => sum + val, 0)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 또는 변수 선택 */}
            <VariableSelector
              requirements={getVariableRequirements()}
              onMappingChange={setSelectedVariables}
              title="또는 데이터에서 변수 선택"
              description="CSV 파일에서 범주형 변수를 선택하면 자동으로 분할표를 생성합니다"
            />

            {/* 분석 옵션 */}
            <Card>
              <CardHeader>
                <CardTitle>분석 옵션</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="alpha">유의수준 (α)</Label>
                      <Select value={alpha} onValueChange={setAlpha}>
                        <SelectTrigger id="alpha">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0.01">0.01</SelectItem>
                          <SelectItem value="0.05">0.05</SelectItem>
                          <SelectItem value="0.10">0.10</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Yates 연속성 보정</Label>
                      <Select defaultValue="auto">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">자동</SelectItem>
                          <SelectItem value="yes">적용</SelectItem>
                          <SelectItem value="no">미적용</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 실행 버튼 */}
            <div className="flex justify-end">
              <Button
                size="lg"
                onClick={runAnalysis}
                disabled={isAnalyzing || (selectedTest === 'independence' &&
                  contingencyTable.flat().reduce((sum, val) => sum + val, 0) === 0)}
                className="px-8"
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    분석 중...
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-5 h-5 mr-2" />
                    분석 실행
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* 가정 확인 탭 */}
          <TabsContent value="assumptions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>카이제곱 검정 가정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>주요 가정</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>관측치가 독립적이어야 함</li>
                      <li>각 범주가 상호 배타적이어야 함</li>
                      <li>기대빈도가 모든 셀에서 5 이상이어야 함</li>
                      <li>표본 크기가 충분히 커야 함 (n ≥ 20)</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                {selectedTest === 'fishers-exact' && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertTitle>Fisher 정확 검정 사용 시기</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>2×2 분할표에서만 사용</li>
                        <li>표본 크기가 작을 때 (n {'<'} 20)</li>
                        <li>기대빈도가 5 미만인 셀이 있을 때</li>
                        <li>정확한 p-value가 중요할 때</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 결과 탭 */}
          <TabsContent value="results" className="space-y-6">
            {result && (
              <>
                <StatisticalResultCard
                  result={result}
                  showAssumptions={true}
                  showEffectSize={true}
                  showInterpretation={true}
                  showActions={true}
                />

                {/* 추가 시각화 */}
                <Card>
                  <CardHeader>
                    <CardTitle>추가 분석</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <Button variant="outline">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        모자이크 플롯 생성
                      </Button>
                      <Button variant="outline">
                        <Grid3X3 className="w-4 h-4 mr-2" />
                        잔차 플롯 생성
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </StatisticsPageLayout>
  )
}