'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  FlaskConical,
  Info,
  ChevronRight,
  CheckCircle2,
  ArrowRight,
  FileText,
  Users2,
  Calculator,
  TrendingUp,
  BarChart3,
} from 'lucide-react'
import { ProgressStepper } from '@/components/smart-flow/ProgressStepper'
import type { StepConfig } from '@/types/smart-flow'
import {
  type ExperimentDesign,
  type ResearchCriteria,
  DesignRecommendationEngine,
  getDesignById
} from '@/lib/experimental-design/config'

// 선택 단계 정의
type SelectionStep = 'purpose' | 'groups' | 'measurement' | 'recommendation'

// StepData는 ResearchCriteria와 동일하게 변경
type StepData = ResearchCriteria

// 실험설계 단계 구성
const DESIGN_STEPS: StepConfig[] = [
  {
    id: 1,
    name: '연구 목적',
    description: '분석 목표 설정',
    icon: Info
  },
  {
    id: 2,
    name: '집단 구조',
    description: '비교 그룹 선택',
    icon: Users2
  },
  {
    id: 3,
    name: '측정 방식',
    description: '데이터 수집 방법',
    icon: Calculator
  },
  {
    id: 4,
    name: '설계 추천',
    description: '최적 실험 설계',
    icon: CheckCircle2
  }
]

export default function ExperimentalDesignPage() {
  const [currentStep, setCurrentStep] = useState<SelectionStep>('purpose')
  const [stepData, setStepData] = useState<StepData>({})
  const [recommendedDesign, setRecommendedDesign] = useState<ExperimentDesign | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  // 단계 매핑 helper
  const getStepId = (step: SelectionStep): number => {
    const stepMap = { purpose: 1, groups: 2, measurement: 3, recommendation: 4 }
    return stepMap[step]
  }

  const getStepByIndex = (id: number): SelectionStep => {
    const stepMap: SelectionStep[] = ['purpose', 'groups', 'measurement', 'recommendation']
    return stepMap[id - 1]
  }

  // 완료된 단계들
  const completedSteps = useMemo(() => {
    const steps: number[] = []
    if (stepData.purpose) steps.push(1)
    if (stepData.groups !== undefined) steps.push(2)
    if (stepData.repeated !== undefined) steps.push(3)
    if (recommendedDesign) steps.push(4)
    return steps
  }, [stepData, recommendedDesign])

  // 단계별 진행 (handleNext와 동일한 로직 사용)
  const handleStepComplete = useCallback(async (step: SelectionStep, data: Partial<StepData>) => {
    const newData = { ...stepData, ...data }
    setStepData(newData)
    setIsLoading(true)
    setError(null)

    try {
      // 다음 단계로 이동 (handleNext와 동일한 로직)
      if (step === 'purpose') {
        if (newData.purpose === 'compare') {
          setCurrentStep('groups')
        } else if (newData.purpose === 'relationship') {
          const design = getRecommendedDesign(newData)
          if (design) {
            setRecommendedDesign(design)
            setCurrentStep('recommendation')
          } else {
            throw new Error('상관 분석 설계를 추천할 수 없습니다')
          }
        } else if (newData.purpose === 'describe') {
          throw new Error('기술통계 설계는 아직 구현되지 않았습니다')
        }
      } else if (step === 'groups') {
        if (newData.groups === 2) {
          setCurrentStep('measurement')
        } else if (typeof newData.groups === 'number' && newData.groups > 2) {
          const design = getRecommendedDesign(newData)
          if (design) {
            setRecommendedDesign(design)
            setCurrentStep('recommendation')
          } else {
            throw new Error('다중 그룹 분석 설계를 추천할 수 없습니다')
          }
        }
      } else if (step === 'measurement') {
        const design = getRecommendedDesign(newData)
        if (design) {
          setRecommendedDesign(design)
          setCurrentStep('recommendation')
        } else {
          throw new Error('실험설계를 추천할 수 없습니다')
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }, [stepData])

  // 설계 추천 로직 (외부 엔진 사용)
  const getRecommendedDesign = (data: StepData): ExperimentDesign | null => {
    try {
      // 데이터 검증
      if (!DesignRecommendationEngine.validate(data)) {
        throw new Error('필수 데이터가 누락되었습니다')
      }

      // 추천 엔진 사용
      return DesignRecommendationEngine.recommend(data)
    } catch (error) {
      console.error('실험설계 추천 오류:', error)
      return null
    }
  }

  // 단계 클릭 핸들러
  const handleStepClick = (stepId: number) => {
    const targetStep = getStepByIndex(stepId)
    setCurrentStep(targetStep)
  }

  // 이전/다음 단계 네비게이션
  const canGoPrevious = currentStep !== 'purpose'
  const canGoNext = () => {
    if (currentStep === 'purpose') return !!stepData.purpose
    if (currentStep === 'groups') return stepData.groups !== undefined
    if (currentStep === 'measurement') return stepData.repeated !== undefined
    return false
  }

  const handlePrevious = () => {
    if (currentStep === 'groups') setCurrentStep('purpose')
    else if (currentStep === 'measurement') setCurrentStep('groups')
    else if (currentStep === 'recommendation') setCurrentStep('measurement')
  }

  const handleNext = async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (currentStep === 'purpose' && stepData.purpose) {
        if (stepData.purpose === 'compare') {
          setCurrentStep('groups')
        } else if (stepData.purpose === 'relationship') {
          const design = getRecommendedDesign(stepData)
          if (design) {
            setRecommendedDesign(design)
            setCurrentStep('recommendation')
          } else {
            throw new Error('상관 분석 설계를 추천할 수 없습니다')
          }
        }
      } else if (currentStep === 'groups' && typeof stepData.groups === 'number') {
        if (stepData.groups === 2) {
          setCurrentStep('measurement')
        } else if (stepData.groups > 2) {
          const design = getRecommendedDesign(stepData)
          if (design) {
            setRecommendedDesign(design)
            setCurrentStep('recommendation')
          } else {
            throw new Error('다중 그룹 분석 설계를 추천할 수 없습니다')
          }
        }
      } else if (currentStep === 'measurement' && stepData.repeated !== undefined) {
        const design = getRecommendedDesign(stepData)
        if (design) {
          setRecommendedDesign(design)
          setCurrentStep('recommendation')
        } else {
          throw new Error('실험설계를 추천할 수 없습니다')
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  // 새로 시작
  const handleRestart = () => {
    setCurrentStep('purpose')
    setStepData({})
    setRecommendedDesign(null)
    setError(null)
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <FlaskConical className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              실험설계 도우미
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            연구 목적에 맞는 최적의 실험설계를 찾고, 표본크기부터 통계분석까지 완벽한 연구계획을 수립하세요
          </p>
        </div>

        {/* 진행 상태 */}
        <ProgressStepper
          steps={DESIGN_STEPS}
          currentStep={getStepId(currentStep)}
          completedSteps={completedSteps}
          onStepClick={handleStepClick}
          variant="blue-purple"
          className="mb-8"
        />

        {/* 에러 표시 */}
        {error && (
          <Alert variant="destructive" className="mb-6 max-w-4xl mx-auto">
            <Info className="h-4 w-4" />
            <AlertTitle>오류 발생</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 단계별 컨텐츠 */}
        <div className="max-w-4xl mx-auto">
          {/* 1단계: 연구 목적 */}
          {currentStep === 'purpose' && (
            <Card className="border-2">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  <Info className="w-5 h-5 text-primary" />
                  연구 목적을 선택하세요
                </CardTitle>
                <CardDescription>
                  연구하고자 하는 주요 목적에 따라 적절한 실험설계가 결정됩니다
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-auto p-6 flex-col gap-3 hover:border-primary"
                    onClick={() => handleStepComplete('purpose', { purpose: 'compare' })}
                  >
                    <Users2 className="w-8 h-8 text-primary" />
                    <div className="text-center">
                      <div className="font-semibold">집단 간 차이 비교</div>
                      <div className="text-xs text-muted-foreground">그룹별 평균 차이 검정</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    className="h-auto p-6 flex-col gap-3 hover:border-primary"
                    onClick={() => handleStepComplete('purpose', { purpose: 'relationship' })}
                  >
                    <TrendingUp className="w-8 h-8 text-primary" />
                    <div className="text-center">
                      <div className="font-semibold">변수 간 관계 분석</div>
                      <div className="text-xs text-muted-foreground">상관관계, 예측 모델</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    className="h-auto p-6 flex-col gap-3 hover:border-primary"
                    onClick={() => handleStepComplete('purpose', { purpose: 'describe' })}
                  >
                    <BarChart3 className="w-8 h-8 text-primary" />
                    <div className="text-center">
                      <div className="font-semibold">현상 기술/탐색</div>
                      <div className="text-xs text-muted-foreground">기술통계, 분포 분석</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 2단계: 집단 구조 */}
          {currentStep === 'groups' && stepData.purpose === 'compare' && (
            <Card className="border-2">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  <Users2 className="w-5 h-5 text-primary" />
                  비교할 집단 구조를 선택하세요
                </CardTitle>
                <CardDescription>
                  집단의 수와 측정 방식에 따라 분석 방법이 달라집니다
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-auto p-6 flex-col gap-3 hover:border-primary"
                    onClick={() => handleStepComplete('groups', { groups: 2 })}
                  >
                    <div className="text-4xl font-bold text-primary">2</div>
                    <div className="text-center">
                      <div className="font-semibold">2개 그룹</div>
                      <div className="text-xs text-muted-foreground">A vs B 비교</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    className="h-auto p-6 flex-col gap-3 hover:border-primary"
                    onClick={() => handleStepComplete('groups', { groups: 3 })}
                  >
                    <div className="text-4xl font-bold text-primary">3+</div>
                    <div className="text-center">
                      <div className="font-semibold">3개 이상 그룹</div>
                      <div className="text-xs text-muted-foreground">다중 집단 비교</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 3단계: 측정 방식 */}
          {currentStep === 'measurement' && stepData.groups === 2 && (
            <Card className="border-2">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  <Calculator className="w-5 h-5 text-primary" />
                  측정 방식을 선택하세요
                </CardTitle>
                <CardDescription>
                  동일한 대상을 반복 측정하는지에 따라 분석이 달라집니다
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-auto p-6 flex-col gap-3 hover:border-primary"
                    onClick={() => handleStepComplete('measurement', { repeated: false })}
                  >
                    <Users2 className="w-8 h-8 text-primary" />
                    <div className="text-center">
                      <div className="font-semibold">독립 그룹</div>
                      <div className="text-xs text-muted-foreground">서로 다른 참가자</div>
                      <div className="text-xs text-muted-foreground mt-1">예: 남성 그룹 vs 여성 그룹</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    className="h-auto p-6 flex-col gap-3 hover:border-primary"
                    onClick={() => handleStepComplete('measurement', { repeated: true })}
                  >
                    <TrendingUp className="w-8 h-8 text-primary" />
                    <div className="text-center">
                      <div className="font-semibold">반복 측정</div>
                      <div className="text-xs text-muted-foreground">동일한 참가자</div>
                      <div className="text-xs text-muted-foreground mt-1">예: 치료 전 vs 치료 후</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 4단계: 추천 결과 */}
          {currentStep === 'recommendation' && recommendedDesign && (
            <div className="space-y-6">
              {/* 추천 설계 */}
              <Card className="border-2 border-green-500">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                      추천 실험설계
                    </CardTitle>
                    <Badge className="bg-green-100 text-green-800">
                      {recommendedDesign.complexity === 'easy' ? '쉬움' :
                       recommendedDesign.complexity === 'medium' ? '보통' : '어려움'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      {React.createElement(recommendedDesign.icon, { className: "w-6 h-6" })}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{recommendedDesign.name}</h3>
                      <p className="text-muted-foreground mb-4">{recommendedDesign.description}</p>

                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="font-medium text-primary">표본 크기</div>
                          <div>{recommendedDesign.sampleSize}</div>
                        </div>
                        <div>
                          <div className="font-medium text-primary">예상 기간</div>
                          <div>{recommendedDesign.duration}</div>
                        </div>
                        <div>
                          <div className="font-medium text-primary">통계 분석</div>
                          <div>{recommendedDesign.statisticalTests[0]}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* 상세 정보 */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">적용 예시</h4>
                      <ul className="text-sm space-y-1">
                        {recommendedDesign.examples.map((example, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                            {example}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">통계적 가정</h4>
                      <ul className="text-sm space-y-1">
                        {recommendedDesign.assumptions.map((assumption, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                            {assumption}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 다음 단계 안내 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowRight className="w-5 h-5 text-primary" />
                    다음 단계
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>실험 진행 가이드</AlertTitle>
                    <AlertDescription>
                      1. 연구계획서를 다운로드하여 세부사항을 확인하세요<br/>
                      2. 데이터 수집 후 "{recommendedDesign.statisticalTests[0]}" 페이지에서 분석하세요<br/>
                      3. 통계적 가정을 반드시 확인하고 결과를 해석하세요
                    </AlertDescription>
                  </Alert>

                  <div className="flex flex-wrap gap-3">
                    <Button className="bg-gradient-to-r from-blue-500 to-purple-500">
                      <FileText className="w-4 h-4 mr-2" />
                      연구계획서 다운로드
                    </Button>
                    <Button variant="outline">
                      <Calculator className="w-4 h-4 mr-2" />
                      통계분석 페이지로 이동
                    </Button>
                    <Button variant="outline" onClick={handleRestart}>
                      새 설계 만들기
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 네비게이션 버튼 */}
          {currentStep !== 'recommendation' && (
            <div className="flex justify-between items-center mt-8 pt-6 border-t">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={!canGoPrevious}
                className="flex items-center gap-2"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                이전 단계
              </Button>

              <Button
                onClick={handleNext}
                disabled={!canGoNext() || isLoading}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    처리중...
                  </>
                ) : (
                  <>
                    다음 단계
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}