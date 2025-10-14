"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { BarChart3, FileText, TrendingUp, Activity, Database, Clock, Eye, Download, Calendar, Target } from "lucide-react"
import Link from "next/link"
import { useAppStore } from "@/lib/store"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts"
import { useMemo } from "react"

export default function DashboardPage() {
  const { 
    datasets, 
    projects, 
    analysisResults, 
    getActiveDatasets, 
    getRecentAnalyses, 
    getCompletedAnalyses 
  } = useAppStore()

  const activeDatasets = getActiveDatasets()
  const recentAnalyses = getRecentAnalyses(10)
  const completedAnalyses = getCompletedAnalyses()
  
  // 실제 데이터 기반 통계
  const totalProjects = projects.length
  const totalDatasets = datasets.length
  const totalAnalyses = analysisResults.length
  const successRate = analysisResults.length > 0 
    ? (completedAnalyses.length / analysisResults.length) * 100 
    : 0

  // 차트 데이터 생성
  const chartData = useMemo(() => {
    // 분석 타입별 통계
    const analysisTypeCount = analysisResults.reduce((acc, analysis) => {
      const type = analysis.testType || 'Other'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const analysisTypeData = Object.entries(analysisTypeCount).map(([type, count]) => ({
      name: type,
      count,
      percentage: ((count / totalAnalyses) * 100).toFixed(1)
    }))

    // 월별 분석 활동 (최근 6개월)
    const monthlyActivity = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthName = date.toLocaleDateString('ko-KR', { month: 'short' })
      const monthAnalyses = analysisResults.filter(analysis => {
        const analysisDate = new Date(analysis.createdAt)
        return analysisDate.getMonth() === date.getMonth() && 
               analysisDate.getFullYear() === date.getFullYear()
      }).length
      
      monthlyActivity.push({
        month: monthName,
        analyses: monthAnalyses,
        datasets: datasets.filter(dataset => {
          const datasetDate = new Date(dataset.uploadedAt)
          return datasetDate.getMonth() === date.getMonth() && 
                 datasetDate.getFullYear() === date.getFullYear()
        }).length
      })
    }

    // 데이터셋 상태별 분포
    const datasetStatusCount = datasets.reduce((acc, dataset) => {
      acc[dataset.status] = (acc[dataset.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const datasetStatusData = Object.entries(datasetStatusCount).map(([status, count]) => ({
      name: status === 'active' ? '활성' : status === 'processed' ? '처리됨' : '오류',
      value: count,
      color: status === 'active' ? '#8884d8' : status === 'processed' ? '#82ca9d' : '#ff8042'
    }))

    return {
      analysisTypeData,
      monthlyActivity,
      datasetStatusData
    }
  }, [analysisResults, datasets, totalAnalyses])

  // 최근 성과 메트릭
  const recentMetrics = useMemo(() => {
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recent30Analyses = analysisResults.filter(a => new Date(a.createdAt) > last30Days)
    const recent30Datasets = datasets.filter(d => new Date(d.uploadedAt) > last30Days)
    
    return {
      recent30Analyses: recent30Analyses.length,
      recent30Datasets: recent30Datasets.length,
      avgAnalysesPerWeek: (recent30Analyses.length / 4.3).toFixed(1),
      mostUsedTest: Object.entries(
        analysisResults.reduce((acc, a) => {
          acc[a.testType] = (acc[a.testType] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      ).sort(([,a], [,b]) => b - a)[0]?.[0] || 'None'
    }
  }, [analysisResults, datasets])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">분석 대시보드</h1>
        <p className="text-muted-foreground">
          통계 분석 이력과 데이터 현황을 한눈에 확인하고 관리하세요.
        </p>
      </div>

      {/* Real Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">프로젝트</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              {totalProjects === 0 ? '프로젝트를 시작해보세요' : '활성 프로젝트'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">데이터셋</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDatasets}</div>
            <p className="text-xs text-muted-foreground">
              활성 데이터셋 {activeDatasets.length}개
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">수행한 분석</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAnalyses}</div>
            <p className="text-xs text-muted-foreground">
              완료된 분석 {completedAnalyses.length}개
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">성공률</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">분석 완료율</p>
          </CardContent>
        </Card>
      </div>

      {/* Real Data Activity Overview */}
      <Tabs defaultValue="analyses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analyses">분석 기록</TabsTrigger>
          <TabsTrigger value="reports">분석 보고서</TabsTrigger>
          <TabsTrigger value="datasets">데이터셋 관리</TabsTrigger>
          <TabsTrigger value="analytics">데이터 분석</TabsTrigger>
          <TabsTrigger value="quick-actions">빠른 시작</TabsTrigger>
        </TabsList>
        
        <TabsContent value="analyses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>분석 기록</CardTitle>
              <CardDescription>
                수행한 통계 분석들을 시간순으로 확인하고 결과를 다시 볼 수 있습니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentAnalyses.length === 0 ? (
                <div className="text-center py-8">
                  <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">아직 분석한 결과가 없습니다</h3>
                  <p className="text-muted-foreground mb-4">
                    통계 분석을 시작해서 결과를 확인해보세요
                  </p>
                  <Link href="/smart-analysis">
                    <Button>
                      <Activity className="h-4 w-4 mr-2" />
                      분석 시작하기
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentAnalyses.map((analysis) => (
                    <div key={analysis.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{analysis.testName}</p>
                          <Badge variant={
                            analysis.status === 'completed' ? 'default' : 
                            analysis.status === 'failed' ? 'destructive' : 'secondary'
                          }>
                            {analysis.status === 'completed' ? '완료' : 
                             analysis.status === 'failed' ? '실패' : '진행중'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{analysis.datasetName}</p>
                        <p className="text-xs text-muted-foreground">
                          {analysis.createdAt.toLocaleDateString()} {analysis.createdAt.toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {analysis.status === 'completed' && (
                          <>
                            <div className="text-right text-sm">
                              <div>p = {analysis.results.pValue.toFixed(3)}</div>
                              {analysis.results.effectSize && (
                                <div className="text-muted-foreground">
                                  ES = {analysis.results.effectSize}
                                </div>
                              )}
                            </div>
                            <Link href={`/results/${analysis.id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                보기
                              </Button>
                            </Link>
                          </>
                        )}
                        {analysis.status === 'running' && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground animate-spin" />
                            <span className="text-sm text-muted-foreground">처리중...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>분석 보고서</CardTitle>
              <CardDescription>
                완료된 분석들을 보고서 형태로 다운로드하고 공유할 수 있습니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              {completedAnalyses.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">생성된 보고서가 없습니다</h3>
                  <p className="text-muted-foreground mb-4">
                    분석을 완료하면 자동으로 보고서가 생성됩니다
                  </p>
                  <Link href="/smart-analysis">
                    <Button>
                      <Activity className="h-4 w-4 mr-2" />
                      분석 시작하기
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {completedAnalyses.map((analysis) => (
                    <div key={analysis.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{analysis.testName}</h4>
                          <Badge variant="default">완료</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{analysis.datasetName}</p>
                        <div className="text-xs text-muted-foreground">
                          결과: p = {analysis.results.pValue.toFixed(3)} | 
                          {analysis.results.effectSize && ` 효과크기 = ${analysis.results.effectSize}`}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {analysis.createdAt.toLocaleDateString()} {analysis.createdAt.toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/results/${analysis.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            보기
                          </Button>
                        </Link>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          다운로드
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="datasets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>데이터셋 관리</CardTitle>
              <CardDescription>
                업로드된 데이터셋들을 확인하고 관리할 수 있습니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              {datasets.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">업로드된 데이터셋이 없습니다</h3>
                  <p className="text-muted-foreground mb-4">
                    CSV 파일을 업로드해서 분석을 시작해보세요
                  </p>
                  <Link href="/data">
                    <Button>
                      <Database className="h-4 w-4 mr-2" />
                      데이터 업로드
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {datasets.map((dataset) => (
                    <div key={dataset.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium">{dataset.name}</p>
                        <p className="text-sm text-muted-foreground">{dataset.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{dataset.rows.toLocaleString()} 행</span>
                          <span>{dataset.columns} 열</span>
                          <span>{dataset.format.toUpperCase()}</span>
                          <span>{
                            dataset.uploadedAt instanceof Date 
                              ? dataset.uploadedAt.toLocaleDateString()
                              : new Date(dataset.uploadedAt).toLocaleDateString()
                          }</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          dataset.status === 'active' ? 'default' : 
                          dataset.status === 'error' ? 'destructive' : 'secondary'
                        }>
                          {dataset.status === 'active' ? '활성' : 
                           dataset.status === 'error' ? '오류' : '처리됨'}
                        </Badge>
                        <Link href={`/statistics?dataset=${dataset.id}`}>
                          <Button variant="outline" size="sm">
                            <Activity className="h-4 w-4 mr-1" />
                            분석
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* 분석 타입별 분포 */}
            <Card>
              <CardHeader>
                <CardTitle>분석 타입별 분포</CardTitle>
                <CardDescription>
                  사용된 통계 검정 방법들의 분포를 확인하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.analysisTypeData.length === 0 ? (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    분석 데이터가 없습니다
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.analysisTypeData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (!active || !payload || !payload[0]) return null
                            const data = payload[0].payload
                            return (
                              <div className="bg-background border rounded p-2 shadow">
                                <p className="font-medium">{data.name}</p>
                                <p className="text-sm">{data.count}회 사용 ({data.percentage}%)</p>
                              </div>
                            )
                          }}
                        />
                        <Bar dataKey="count" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* 월별 활동 추이 */}
            <Card>
              <CardHeader>
                <CardTitle>월별 분석 활동</CardTitle>
                <CardDescription>
                  최근 6개월간의 분석 및 데이터셋 업로드 추이
                </CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.monthlyActivity.length === 0 ? (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    활동 데이터가 없습니다
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData.monthlyActivity}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip 
                          content={({ active, payload, label }) => {
                            if (!active || !payload) return null
                            return (
                              <div className="bg-background border rounded p-2 shadow">
                                <p className="font-medium">{label}</p>
                                <p className="text-sm">분석: {payload[0]?.value}회</p>
                                <p className="text-sm">데이터셋: {payload[1]?.value}개</p>
                              </div>
                            )
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="analyses" 
                          stroke="#8884d8" 
                          strokeWidth={2}
                          name="분석"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="datasets" 
                          stroke="#82ca9d" 
                          strokeWidth={2}
                          name="데이터셋"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            {/* 데이터셋 상태별 분포 */}
            <Card>
              <CardHeader>
                <CardTitle>데이터셋 상태 분포</CardTitle>
                <CardDescription>
                  업로드된 데이터셋들의 현재 상태별 분포
                </CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.datasetStatusData.length === 0 ? (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    데이터셋이 없습니다
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData.datasetStatusData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {chartData.datasetStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* 성과 메트릭 */}
            <Card>
              <CardHeader>
                <CardTitle>성과 메트릭</CardTitle>
                <CardDescription>
                  최근 30일간의 주요 통계 지표들
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">최근 30일 분석</div>
                        <div className="text-sm text-muted-foreground">수행된 분석 수</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold">{recentMetrics.recent30Analyses}</div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Database className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">새 데이터셋</div>
                        <div className="text-sm text-muted-foreground">최근 30일 업로드</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold">{recentMetrics.recent30Datasets}</div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">주간 평균 분석</div>
                        <div className="text-sm text-muted-foreground">분석 빈도</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold">{recentMetrics.avgAnalysesPerWeek}</div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Target className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">선호 검정</div>
                        <div className="text-sm text-muted-foreground">가장 자주 사용됨</div>
                      </div>
                    </div>
                    <div className="text-lg font-bold">{recentMetrics.mostUsedTest}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="quick-actions" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>빠른 시작</CardTitle>
                <CardDescription>
                  자주 사용하는 기능들에 빠르게 접근하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/smart-analysis">
                  <div className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-3 rounded transition-colors">
                    <Activity className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">AI 분석 시작</div>
                      <div className="text-sm text-muted-foreground">데이터 업로드부터 결과까지</div>
                    </div>
                  </div>
                </Link>
                <Link href="/statistics">
                  <div className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-3 rounded transition-colors">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">전문가 분석</div>
                      <div className="text-sm text-muted-foreground">개별 통계 테스트 실행</div>
                    </div>
                  </div>
                </Link>
                <Link href="/data">
                  <div className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-3 rounded transition-colors">
                    <Database className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">데이터 관리</div>
                      <div className="text-sm text-muted-foreground">파일 업로드 및 관리</div>
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>최근 활동</CardTitle>
                <CardDescription>
                  최근 수행한 작업들을 확인하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analysisResults.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">최근 활동이 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentAnalyses.slice(0, 3).map((analysis) => (
                      <div key={analysis.id} className="text-sm">
                        <div className="font-medium">{analysis.testName}</div>
                        <div className="text-muted-foreground">
                          {analysis.createdAt.toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}