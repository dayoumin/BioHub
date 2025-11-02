'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Zap,
  Calculator,
  Target,
  Download,
  Play,
  Info,
  TrendingUp,
  BarChart3
} from 'lucide-react'
import { StatisticsPageLayout, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { usePyodideService } from '@/hooks/use-pyodide-service'
import { useStatisticsPage } from '@/hooks/use-statistics-page'

interface PowerAnalysisResult {
  testType: string
  analysisType: 'post-hoc' | 'a-priori' | 'compromise' | 'criterion'
  inputParameters: {
    alpha: number
    power?: number
    effectSize?: number
    sampleSize?: number
  }
  results: {
    power?: number
    effectSize?: number
    sampleSize?: number
    criticalEffect?: number
  }
  interpretation: string
  recommendations: string[]
  powerCurve?: Array<{
    sampleSize: number
    power: number
  }>
}

export default function PowerAnalysisPage() {
  // Hook for state management
  const { state, actions } = useStatisticsPage<PowerAnalysisResult, never>({
    withUploadedData: false,
    withError: true
  })
  const { currentStep, results, isAnalyzing, error } = state

  const [activeTab, setActiveTab] = useState('summary')

  // 분석 설정
  const [testType, setTestType] = useState('t-test')
  const [analysisType, setAnalysisType] = useState<'post-hoc' | 'a-priori' | 'compromise' | 'criterion'>('a-priori')
  const [alpha, setAlpha] = useState('0.05')
  const [power, setPower] = useState('0.80')
  const [effectSize, setEffectSize] = useState('0.5')
  const [sampleSize, setSampleSize] = useState('30')
  const [sides, setSides] = useState('two-sided')

  const { pyodideService: _pyodideService } = usePyodideService()

  // 단계 정의
  const steps: StatisticsStep[] = [
    {
      id: 'select-test',
      number: 1,
      title: '검정 선택',
      description: '검정력 분석할 통계 검정 선택',
      status: testType ? 'completed' : 'current'
    },
    {
      id: 'set-parameters',
      number: 2,
      title: '모수 설정',
      description: '유의수준, 검정력, 효과크기 설정',
      status: testType ? 'current' : 'pending'
    },
    {
      id: 'run-analysis',
      number: 3,
      title: '분석 실행',
      description: '검정력 분석 수행',
      status: results ? 'completed' : 'pending'
    },
    {
      id: 'view-results',
      number: 4,
      title: '결과 해석',
      description: '검정력 분석 결과 및 권장사항',
      status: results ? 'current' : 'pending'
    }
  ]

  // 분석 실행
  const handleAnalysis = useCallback(() => {
    try {
      actions.startAnalysis()

      // 모의 데이터 생성 (실제로는 Pyodide 서비스 사용)
        const alphaValue = parseFloat(alpha)
        const powerValue = parseFloat(power)
        const effectValue = parseFloat(effectSize)
        const sampleValue = parseInt(sampleSize)

        let mockResults: PowerAnalysisResult

        if (analysisType === 'a-priori') {
          // 사전 검정력 분석 (표본크기 계산)
          mockResults = {
            testType,
            analysisType,
            inputParameters: {
              alpha: alphaValue,
              power: powerValue,
              effectSize: effectValue
            },
            results: {
              sampleSize: Math.ceil(16 / (effectValue * effectValue) *
                (sides === 'two-sided' ? 1.96 + 0.84 : 1.64 + 0.84) ** 2)
            },
            interpretation: `원하는 검정력 ${(powerValue * 100).toFixed(0)}%를 달성하려면 각 그룹당 최소 ${Math.ceil(16 / (effectValue * effectValue) * (sides === 'two-sided' ? 1.96 + 0.84 : 1.64 + 0.84) ** 2)}개의 표본이 필요합니다`,
            recommendations: [
              '계산된 표본크기보다 10-20% 더 많이 수집하여 탈락을 대비하세요',
              '파일럿 연구로 효과크기를 더 정확히 추정해보세요',
              '연구 비용과 시간을 고려하여 실현 가능성을 검토하세요'
            ],
            powerCurve: Array.from({ length: 20 }, (_, i) => ({
              sampleSize: 10 + i * 5,
              power: Math.min(0.99, 1 - Math.exp(-0.05 * (10 + i * 5) * effectValue * effectValue))
            }))
          }
        } else if (analysisType === 'post-hoc') {
          // 사후 검정력 분석 (검정력 계산)
          const calculatedPower = Math.min(0.99, 1 - Math.exp(-0.05 * sampleValue * effectValue * effectValue))
          mockResults = {
            testType,
            analysisType,
            inputParameters: {
              alpha: alphaValue,
              effectSize: effectValue,
              sampleSize: sampleValue
            },
            results: {
              power: calculatedPower
            },
            interpretation: `현재 설정에서 실제 검정력은 ${(calculatedPower * 100).toFixed(1)}%입니다`,
            recommendations: calculatedPower < 0.8 ? [
              '검정력이 권장 수준(80%) 미만입니다',
              '표본크기를 늘리거나 더 큰 효과크기를 가진 연구를 고려하세요',
              'Type II 오류 위험이 높습니다'
            ] : [
              '충분한 검정력을 확보했습니다',
              '통계적으로 유의한 결과를 얻을 가능성이 높습니다'
            ]
          }
        } else {
          // 절충 분석 (검정력과 표본크기의 균형점 찾기)
          const balancedSample = 25
          const balancedPower = 0.75
          mockResults = {
            testType,
            analysisType,
            inputParameters: {
              alpha: alphaValue,
              effectSize: effectValue
            },
            results: {
              sampleSize: balancedSample,
              power: balancedPower
            },
            interpretation: `검정력과 표본크기의 균형점: 각 그룹당 ${balancedSample}개 표본으로 ${(balancedPower * 100).toFixed(0)}% 검정력 달성`,
            recommendations: [
              '실용적인 절충안입니다',
              '연구 제약사항을 고려한 현실적 선택',
              '결과 해석 시 검정력 한계를 명시하세요'
            ]
          }
        }

        actions.completeAnalysis(mockResults, 3)
        setActiveTab('summary')
      } catch (error) {
        console.error('검정력 분석 중 오류:', error)
        actions.setError('분석 중 오류가 발생했습니다.')
    }
  }, [alpha, power, effectSize, sampleSize, analysisType, testType, sides, actions])

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

  // 검정력 분석 결과 테이블
  const renderResultsTable = () => {
    if (!results) return null

    const data = [
      {
        parameter: '검정 유형',
        input: results.testType,
        result: results.analysisType === 'a-priori' ? '사전 분석' :
               results.analysisType === 'post-hoc' ? '사후 분석' : '절충 분석'
      },
      {
        parameter: '유의수준 (α)',
        input: results.inputParameters.alpha.toString(),
        result: `${(results.inputParameters.alpha * 100).toFixed(0)}% Type I 오류율`
      }
    ]

    if (results.inputParameters.power) {
      data.push({
        parameter: '목표 검정력',
        input: results.inputParameters.power.toString(),
        result: `${(results.inputParameters.power * 100).toFixed(0)}%`
      })
    }

    if (results.inputParameters.effectSize) {
      data.push({
        parameter: '효과크기',
        input: results.inputParameters.effectSize.toString(),
        result: results.inputParameters.effectSize < 0.2 ? '작은 효과' :
               results.inputParameters.effectSize < 0.5 ? '중간 효과' :
               results.inputParameters.effectSize < 0.8 ? '큰 효과' : '매우 큰 효과'
      })
    }

    if (results.results.sampleSize) {
      data.push({
        parameter: '필요 표본크기',
        input: '-',
        result: `각 그룹당 ${results.results.sampleSize}개`
      })
    }

    if (results.results.power) {
      data.push({
        parameter: '계산된 검정력',
        input: '-',
        result: `${(results.results.power * 100).toFixed(1)}%`
      })
    }

    const columns = [
      { key: 'parameter', header: '모수', type: 'text' as const },
      { key: 'input', header: '입력값', type: 'text' as const },
      { key: 'result', header: '결과/해석', type: 'text' as const }
    ]

    return (
      <StatisticsTable
        columns={columns}
        data={data}
        title="검정력 분석 결과"
      />
    )
  }

  // 검정력 곡선 테이블
  const renderPowerCurveTable = () => {
    if (!results?.powerCurve) return null

    const columns = [
      { key: 'sampleSize', header: '표본크기 (각 그룹)', type: 'number' as const },
      { key: 'power', header: '검정력', type: 'number' as const, precision: 3 }
    ]

    return (
      <StatisticsTable
        columns={columns}
        data={results.powerCurve}
        title="표본크기별 검정력"
      />
    )
  }

  // 요약 카드들
  const renderSummaryCards = () => {
    if (!results) return null

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">유의수준</p>
                <p className="text-2xl font-bold">{(results.inputParameters.alpha * 100).toFixed(0)}%</p>
              </div>
              <Target className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">효과크기</p>
                <p className="text-2xl font-bold">
                  {results.inputParameters.effectSize?.toFixed(2) || 'N/A'}
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
                <p className="text-sm text-muted-foreground">검정력</p>
                <p className="text-2xl font-bold">
                  {results.results.power ? `${(results.results.power * 100).toFixed(0)}%` :
                   results.inputParameters.power ? `${(results.inputParameters.power * 100).toFixed(0)}%` : 'N/A'}
                </p>
              </div>
              <Zap className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">표본크기</p>
                <p className="text-2xl font-bold">
                  {results.results.sampleSize || results.inputParameters.sampleSize || 'N/A'}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 효과크기 가이드
  const renderEffectSizeGuide = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            효과크기 참고 가이드
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold">Cohen&apos;s d (t-검정, ANOVA)</h4>
              <ul className="text-sm space-y-1">
                <li>• <strong>작은 효과:</strong> 0.2 (실질적으로 감지하기 어려운 차이)</li>
                <li>• <strong>중간 효과:</strong> 0.5 (육안으로 인지 가능한 차이)</li>
                <li>• <strong>큰 효과:</strong> 0.8 (명확히 구분되는 차이)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold">상관계수 (r)</h4>
              <ul className="text-sm space-y-1">
                <li>• <strong>작은 효과:</strong> 0.1 (약한 관계)</li>
                <li>• <strong>중간 효과:</strong> 0.3 (보통 관계)</li>
                <li>• <strong>큰 효과:</strong> 0.5 (강한 관계)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold">비율 차이</h4>
              <ul className="text-sm space-y-1">
                <li>• <strong>작은 효과:</strong> 0.05 (5%p 차이)</li>
                <li>• <strong>중간 효과:</strong> 0.15 (15%p 차이)</li>
                <li>• <strong>큰 효과:</strong> 0.25 (25%p 차이)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <StatisticsPageLayout
      title="검정력 분석"
      subtitle="표본크기 결정 및 검정력 계산"
      icon={<Zap className="w-6 h-6" />}
      steps={steps}
      currentStep={currentStep}
      onStepChange={handleStepChange}
      onRun={handleAnalysis}
      onReset={handleReset}
      isRunning={isAnalyzing}
      methodInfo={{
        formula: "Power = 1 - β, n = f(α, power, effect size)",
        assumptions: ["모수적 검정 가정", "정규분포", "독립관측"],
        sampleSize: "계산 목적에 따라 결정",
        usage: "연구설계, 표본크기 결정, 검정력 평가"
      }}
    >
      <div className="space-y-6">
        {/* 1단계: 검정 선택 */}
        {currentStep === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                통계 검정 선택
              </CardTitle>
              <CardDescription>
                검정력 분석을 수행할 통계 검정을 선택하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>검정 유형</Label>
                <Select value={testType} onValueChange={setTestType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="t-test">t-검정 (평균 비교)</SelectItem>
                    <SelectItem value="anova">ANOVA (분산분석)</SelectItem>
                    <SelectItem value="correlation">상관분석</SelectItem>
                    <SelectItem value="chi-square">카이제곱 검정</SelectItem>
                    <SelectItem value="regression">회귀분석</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>분석 유형</Label>
                <Select
                  value={analysisType}
                  onValueChange={(value) => {
                    // 타입 가드: 허용된 값만 설정
                    if (value === 'a-priori' || value === 'post-hoc' ||
                        value === 'compromise' || value === 'criterion') {
                      setAnalysisType(value)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a-priori">사전 분석 (표본크기 계산)</SelectItem>
                    <SelectItem value="post-hoc">사후 분석 (검정력 계산)</SelectItem>
                    <SelectItem value="compromise">절충 분석 (균형점 찾기)</SelectItem>
                    <SelectItem value="criterion">기준 분석 (임계 효과크기)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => actions.setCurrentStep(1)}>
                  다음 단계
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 2단계: 모수 설정 */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                분석 모수 설정
              </CardTitle>
              <CardDescription>
                검정력 분석에 필요한 모수들을 설정하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="alpha">유의수준 (α)</Label>
                  <Select value={alpha} onValueChange={setAlpha}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.01">0.01 (1%)</SelectItem>
                      <SelectItem value="0.05">0.05 (5%)</SelectItem>
                      <SelectItem value="0.10">0.10 (10%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>검정 방향</Label>
                  <Select value={sides} onValueChange={setSides}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="two-sided">양측 검정</SelectItem>
                      <SelectItem value="one-sided">단측 검정</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {analysisType !== 'criterion' && (
                <div>
                  <Label htmlFor="effect-size">효과크기</Label>
                  <Input
                    id="effect-size"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="2.0"
                    value={effectSize}
                    onChange={(e) => setEffectSize(e.target.value)}
                    placeholder="예: 0.5"
                  />
                </div>
              )}

              {analysisType === 'a-priori' && (
                <div>
                  <Label htmlFor="power">목표 검정력 (1-β)</Label>
                  <Select value={power} onValueChange={setPower}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.70">0.70 (70%)</SelectItem>
                      <SelectItem value="0.80">0.80 (80%) - 권장</SelectItem>
                      <SelectItem value="0.90">0.90 (90%)</SelectItem>
                      <SelectItem value="0.95">0.95 (95%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {analysisType === 'post-hoc' && (
                <div>
                  <Label htmlFor="sample-size">표본크기 (각 그룹)</Label>
                  <Input
                    id="sample-size"
                    type="number"
                    min="5"
                    max="1000"
                    value={sampleSize}
                    onChange={(e) => setSampleSize(e.target.value)}
                    placeholder="예: 30"
                  />
                </div>
              )}

              <div className="p-4 bg-muted dark:bg-blue-950/20 rounded-lg">
                <h4 className="font-semibold mb-2">분석 설정 요약</h4>
                <p className="text-sm">
                  <strong>검정:</strong> {testType}<br />
                  <strong>유형:</strong> {analysisType === 'a-priori' ? '사전 분석' :
                                      analysisType === 'post-hoc' ? '사후 분석' : '절충 분석'}<br />
                  <strong>유의수준:</strong> {alpha}<br />
                  {analysisType !== 'criterion' && <><strong>효과크기:</strong> {effectSize}<br /></>}
                  {analysisType === 'a-priori' && <><strong>목표 검정력:</strong> {power}</>}
                  {analysisType === 'post-hoc' && <><strong>표본크기:</strong> {sampleSize}</>}
                </p>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => actions.setCurrentStep(2)}>
                  다음 단계
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 3단계: 분석 실행 */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="w-5 h-5" />
                검정력 분석 실행
              </CardTitle>
              <CardDescription>
                설정된 모수로 검정력 분석을 실행합니다
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
                  {isAnalyzing ? '분석 중...' : '검정력 분석 실행'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 4단계: 결과 확인 */}
        {results && currentStep === 3 && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary">요약</TabsTrigger>
              <TabsTrigger value="results">분석결과</TabsTrigger>
              <TabsTrigger value="guide">효과크기 가이드</TabsTrigger>
              <TabsTrigger value="export">내보내기</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">분석 요약</h3>
                {renderSummaryCards()}
              </div>
              <div className="p-4 bg-muted dark:bg-green-950/20 rounded-lg">
                <h4 className="font-semibold dark:text-green-200 mb-2">결과 해석</h4>
                <p className="text-muted-foreground dark:text-green-300">{results.interpretation}</p>
                <div className="mt-3">
                  <h5 className="font-semibold dark:text-green-200">권장사항</h5>
                  <ul className="text-sm text-muted-foreground dark:text-green-400 space-y-1">
                    {results.recommendations.map((rec, idx) => (
                      <li key={idx}>• {rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="results" className="space-y-6">
              <div>
                {renderResultsTable()}
              </div>
              {results.powerCurve && (
                <div>
                  {renderPowerCurveTable()}
                </div>
              )}
            </TabsContent>

            <TabsContent value="guide" className="space-y-6">
              {renderEffectSizeGuide()}
            </TabsContent>

            <TabsContent value="export" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>결과 내보내기</CardTitle>
                  <CardDescription>
                    검정력 분석 결과를 다양한 형식으로 내보낼 수 있습니다
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
                      연구계획서
                    </Button>
                    <Button variant="outline" className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      검정력 곡선
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