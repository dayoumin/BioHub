'use client'

import React, { useState } from 'react'
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
  Calculator,
  PlayCircle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  Info,
  Download
} from 'lucide-react'
import { StatisticsPageLayout } from '@/components/statistics/StatisticsPageLayout'
import { ProfessionalVariableSelector } from '@/components/variable-selection/ProfessionalVariableSelector'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { VariableMapping } from '@/components/variable-selection/types'
import { BoxPlot } from '@/components/charts/BoxPlot'
import { BarChartWithCI } from '@/components/charts/BarChartWithCI'
import { usePyodideService } from '@/hooks/use-pyodide-service'

interface DescriptiveStats {
  n: number
  mean: number
  median: number
  mode: number[]
  std: number
  variance: number
  sem: number
  min: number
  max: number
  range: number
  q1: number
  q3: number
  iqr: number
  skewness: number
  kurtosis: number
  cv: number
  ci95: [number, number]
  percentiles: Record<number, number>
  outliers: number[]
}

interface GroupStats {
  [key: string]: DescriptiveStats
}

export default function DescriptiveStatisticsPage() {
  const [variableMapping, setVariableMapping] = useState<VariableMapping>({})
  const [stats, setStats] = useState<DescriptiveStats | GroupStats | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [activeTab, setActiveTab] = useState('summary')
  const [showOutliers, setShowOutliers] = useState(true)
  const [showCI, setShowCI] = useState(true)
  const [ciLevel, setCiLevel] = useState('95')
  const [groupBy, setGroupBy] = useState<string | null>(null)
  const { pyodideService } = usePyodideService()

  const handleAnalysis = async () => {
    setIsAnalyzing(true)

    // 모의 데이터 생성
    setTimeout(() => {
      const mockStats: DescriptiveStats = {
        n: 150,
        mean: 25.34,
        median: 24.8,
        mode: [24, 25],
        std: 5.67,
        variance: 32.15,
        sem: 0.46,
        min: 12.3,
        max: 42.1,
        range: 29.8,
        q1: 21.5,
        q3: 28.9,
        iqr: 7.4,
        skewness: 0.234,
        kurtosis: -0.156,
        cv: 22.38,
        ci95: [24.43, 26.25],
        percentiles: {
          5: 16.2,
          10: 18.1,
          25: 21.5,
          50: 24.8,
          75: 28.9,
          90: 32.4,
          95: 35.1
        },
        outliers: [42.1, 12.3, 41.5]
      }

      // 그룹별 분석인 경우
      if (groupBy) {
        const groupStats: GroupStats = {
          'Group A': { ...mockStats, mean: 23.5, std: 4.8 },
          'Group B': { ...mockStats, mean: 26.7, std: 5.9 },
          'Group C': { ...mockStats, mean: 25.1, std: 6.2 }
        }
        setStats(groupStats)
      } else {
        setStats(mockStats)
      }

      setIsAnalyzing(false)
      setActiveTab('summary')
    }, 1500)
  }

  const renderCentralTendency = (data: DescriptiveStats) => {
    const columns = [
      { key: 'measure', header: '측정치', type: 'text' as const },
      { key: 'value', header: '값', type: 'number' as const },
      { key: 'description', header: '설명', type: 'text' as const }
    ]

    const rows = [
      {
        measure: '평균 (Mean)',
        value: data.mean,
        description: '모든 값의 산술 평균'
      },
      {
        measure: '중앙값 (Median)',
        value: data.median,
        description: '정렬된 데이터의 중간값'
      },
      {
        measure: '최빈값 (Mode)',
        value: data.mode[0] || '-',
        description: '가장 빈번하게 나타나는 값'
      }
    ]

    return <StatisticsTable columns={columns} data={rows} title="중심경향 측정치" />
  }

  const renderDispersion = (data: DescriptiveStats) => {
    const columns = [
      { key: 'measure', header: '측정치', type: 'text' as const },
      { key: 'value', header: '값', type: 'number' as const },
      { key: 'description', header: '설명', type: 'text' as const }
    ]

    const rows = [
      {
        measure: '표준편차 (SD)',
        value: data.std,
        description: '평균으로부터의 평균적 거리'
      },
      {
        measure: '분산 (Variance)',
        value: data.variance,
        description: '표준편차의 제곱'
      },
      {
        measure: '표준오차 (SEM)',
        value: data.sem,
        description: '평균의 표준오차'
      },
      {
        measure: '범위 (Range)',
        value: data.range,
        description: '최대값 - 최소값'
      },
      {
        measure: '사분위범위 (IQR)',
        value: data.iqr,
        description: 'Q3 - Q1'
      },
      {
        measure: '변동계수 (CV)',
        value: data.cv,
        description: '(표준편차/평균) × 100%'
      }
    ]

    return <StatisticsTable columns={columns} data={rows} title="산포도 측정치" />
  }

  const renderDistributionShape = (data: DescriptiveStats) => {
    return (
      <Card>
        <CardHeader>
          <CardTitle>분포 형태</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">왜도 (Skewness)</Label>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{data.skewness.toFixed(3)}</span>
                {data.skewness > 0.5 ? (
                  <Badge variant="outline" className="gap-1">
                    <TrendingUp className="w-3 h-3" />
                    오른쪽 꼬리
                  </Badge>
                ) : data.skewness < -0.5 ? (
                  <Badge variant="outline" className="gap-1">
                    <TrendingDown className="w-3 h-3" />
                    왼쪽 꼬리
                  </Badge>
                ) : (
                  <Badge variant="outline">대칭</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {Math.abs(data.skewness) < 0.5 ? '거의 대칭적 분포' :
                 Math.abs(data.skewness) < 1 ? '약간 비대칭' :
                 '강한 비대칭'}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">첨도 (Kurtosis)</Label>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{data.kurtosis.toFixed(3)}</span>
                {data.kurtosis > 0 ? (
                  <Badge variant="outline">뾰족함</Badge>
                ) : data.kurtosis < 0 ? (
                  <Badge variant="outline">평평함</Badge>
                ) : (
                  <Badge variant="outline">정규분포</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {Math.abs(data.kurtosis) < 0.5 ? '정규분포와 유사' :
                 data.kurtosis > 0 ? '정규분포보다 뾰족함' :
                 '정규분포보다 평평함'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderPercentiles = (data: DescriptiveStats) => {
    const columns = [
      { key: 'percentile', header: '백분위수', type: 'text' as const },
      { key: 'value', header: '값', type: 'number' as const }
    ]

    const rows = Object.entries(data.percentiles).map(([p, value]) => ({
      percentile: `P${p}`,
      value
    }))

    return <StatisticsTable columns={columns} data={rows} title="백분위수" compactMode />
  }

  return (
    <StatisticsPageLayout
      title="기술통계"
      description="데이터의 중심경향, 산포도, 분포 형태를 종합적으로 분석"
    >
      <div className="space-y-6">
        {/* 변수 선택 */}
        <ProfessionalVariableSelector
          title="분석할 변수 선택"
          description="기술통계를 계산할 연속형 변수를 선택하세요"
          onMappingChange={setVariableMapping}
        />

        {/* 분석 옵션 */}
        <Card>
          <CardHeader>
            <CardTitle>분석 옵션</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="outliers"
                  checked={showOutliers}
                  onCheckedChange={setShowOutliers}
                />
                <Label htmlFor="outliers">이상치 표시</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="ci"
                  checked={showCI}
                  onCheckedChange={setShowCI}
                />
                <Label htmlFor="ci">신뢰구간 표시</Label>
              </div>

              <div className="flex items-center gap-2">
                <Label>신뢰수준</Label>
                <Select value={ciLevel} onValueChange={setCiLevel} disabled={!showCI}>
                  <SelectTrigger className="w-24">
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
          </CardContent>
        </Card>

        {/* 분석 실행 */}
        <div className="flex justify-end">
          <Button
            size="lg"
            onClick={handleAnalysis}
            disabled={Object.keys(variableMapping).length === 0 || isAnalyzing}
          >
            {isAnalyzing ? (
              <>분석 중...</>
            ) : (
              <>
                <Calculator className="mr-2 h-5 w-5" />
                기술통계 분석
              </>
            )}
          </Button>
        </div>

        {/* 결과 표시 */}
        {stats && !isAnalyzing && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="summary">요약</TabsTrigger>
              <TabsTrigger value="visualization">시각화</TabsTrigger>
              <TabsTrigger value="details">상세 통계</TabsTrigger>
              <TabsTrigger value="export">내보내기</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-6">
              {/* 주요 통계량 카드 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">표본 크기</p>
                        <p className="text-2xl font-bold">
                          {typeof stats === 'object' && 'n' in stats ? stats.n : '-'}
                        </p>
                      </div>
                      <Activity className="w-8 h-8 text-muted-foreground/20" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">평균</p>
                        <p className="text-2xl font-bold">
                          {typeof stats === 'object' && 'mean' in stats ? stats.mean.toFixed(2) : '-'}
                        </p>
                      </div>
                      <Calculator className="w-8 h-8 text-muted-foreground/20" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">표준편차</p>
                        <p className="text-2xl font-bold">
                          {typeof stats === 'object' && 'std' in stats ? stats.std.toFixed(2) : '-'}
                        </p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-muted-foreground/20" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">중앙값</p>
                        <p className="text-2xl font-bold">
                          {typeof stats === 'object' && 'median' in stats ? stats.median.toFixed(2) : '-'}
                        </p>
                      </div>
                      <BarChart3 className="w-8 h-8 text-muted-foreground/20" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 상세 테이블 */}
              {typeof stats === 'object' && 'mean' in stats && (
                <>
                  {renderCentralTendency(stats)}
                  {renderDispersion(stats)}
                  {renderDistributionShape(stats)}
                </>
              )}
            </TabsContent>

            <TabsContent value="visualization" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* BoxPlot */}
                {typeof stats === 'object' && 'mean' in stats && (
                  <BoxPlot
                    data={[{
                      name: '데이터',
                      min: stats.min,
                      q1: stats.q1,
                      median: stats.median,
                      q3: stats.q3,
                      max: stats.max,
                      mean: stats.mean,
                      outliers: showOutliers ? stats.outliers : []
                    }]}
                    title="Box Plot"
                    description="5개 요약 통계량과 이상치"
                    showMean={true}
                    showOutliers={showOutliers}
                  />
                )}

                {/* 히스토그램 자리 */}
                <Card>
                  <CardHeader>
                    <CardTitle>히스토그램</CardTitle>
                    <CardDescription>데이터 분포</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      히스토그램 차트 (구현 예정)
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 신뢰구간 시각화 */}
              {showCI && typeof stats === 'object' && 'mean' in stats && (
                <BarChartWithCI
                  data={[{
                    name: '평균',
                    value: stats.mean,
                    ci: stats.ci95,
                    se: stats.sem
                  }]}
                  title={`${ciLevel}% 신뢰구간`}
                  description="평균의 신뢰구간"
                  showCI={true}
                  ciLevel={parseInt(ciLevel)}
                  height={200}
                />
              )}
            </TabsContent>

            <TabsContent value="details" className="space-y-6">
              {typeof stats === 'object' && 'mean' in stats && (
                <>
                  {renderPercentiles(stats)}

                  {/* 이상치 정보 */}
                  {showOutliers && stats.outliers.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>이상치 분석</CardTitle>
                        <CardDescription>
                          IQR 방법으로 탐지된 이상치 ({stats.outliers.length}개)
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {stats.outliers.map((outlier, i) => (
                              <Badge key={i} variant="outline">
                                {outlier.toFixed(2)}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            이상치 기준: Q1 - 1.5×IQR 미만 또는 Q3 + 1.5×IQR 초과
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* 신뢰구간 정보 */}
                  {showCI && (
                    <Card>
                      <CardHeader>
                        <CardTitle>신뢰구간</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="text-lg">
                            평균의 {ciLevel}% 신뢰구간: [{stats.ci95[0].toFixed(3)}, {stats.ci95[1].toFixed(3)}]
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {ciLevel}% 확률로 모집단 평균이 이 구간 내에 있습니다.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="export" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>결과 내보내기</CardTitle>
                  <CardDescription>
                    분석 결과를 다양한 형식으로 내보낼 수 있습니다
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
                      Word
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