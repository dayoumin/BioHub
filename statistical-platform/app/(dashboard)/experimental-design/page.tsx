'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'
import { ProgressStepper } from '@/components/smart-flow/ProgressStepper'
import type { StepConfig } from '@/types/smart-flow'
import {
  type ExperimentDesign,
  type ResearchCriteria,
  DesignRecommendationEngine,
  getDesignById
} from '@/lib/experimental-design/config'

// 선택 단계 정의
type SelectionStep = 'purpose' | 'groups' | 'measurement' | 'relationship-type' | 'research-details' | 'recommendation'

// 연구 세부정보 타입 정의
interface ResearchDetails {
  title: string
  hypothesis: string
  independentVariable: string
  dependentVariable: string
  plannedSampleSize: string
  studyPeriod: string
  researchContext: string
}

// StepData 확장
type StepData = ResearchCriteria & {
  researchDetails?: ResearchDetails
}

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
    name: '데이터 특성',
    description: '측정 방식 또는 관계 유형',
    icon: Calculator
  },
  {
    id: 4,
    name: '연구 정보',
    description: '연구 세부사항 입력',
    icon: FileText
  },
  {
    id: 5,
    name: '설계 추천',
    description: '최적 실험 설계',
    icon: CheckCircle2
  }
]

// 목적별 설계 ID 매핑 (컴포넌트 외부 - 불변)
const PURPOSE_TO_DESIGN_MAP: Record<string, string> = {
  'categorical': 'chi-square-design',
  'causal': 'quasi-experimental',
  'case-study': 'single-case-design',
  'time-analysis': 'time-series-design',
  'survival': 'survival-analysis',
  'dose-response': 'dose-response',
  'optimization': 'response-surface'
} as const

// 집단 구조별 설계 ID 매핑 (컴포넌트 외부 - 불변)
const GROUPS_TO_DESIGN_MAP: Record<string, string> = {
  '2x2': 'factorial-2x2',
  'mixed': 'mixed-design'
} as const

// 그룹 수 상수
const MIN_GROUPS_FOR_MEASUREMENT = 2
const MIN_GROUPS_FOR_MULTIPLE_COMPARISON = 3

export default function ExperimentalDesignPage() {
  const [currentStep, setCurrentStep] = useState<SelectionStep>('purpose')
  const [stepData, setStepData] = useState<StepData>({})
  const [recommendedDesign, setRecommendedDesign] = useState<ExperimentDesign | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const analysisPath = recommendedDesign?.analysisPath ?? null

  // 연구 세부정보 업데이트 헬퍼 함수
  const updateResearchDetails = useCallback((field: keyof ResearchDetails, value: string) => {
    setStepData(prev => ({
      ...prev,
      researchDetails: {
        title: '',
        hypothesis: '',
        independentVariable: '',
        dependentVariable: '',
        plannedSampleSize: '',
        studyPeriod: '',
        researchContext: '',
        ...prev.researchDetails, // 기존값 유지
        [field]: value // 변경된 필드만 업데이트
      }
    }))
  }, [])

  // 단계 매핑 helper (순수함수)
  const getStepId = (step: SelectionStep): number => {
    const stepMap = {
      purpose: 1,
      groups: 2,
      measurement: 3,
      'relationship-type': 3,
      'research-details': 4,
      recommendation: 5
    } as const
    return stepMap[step]
  }

  const getStepByIndex = (id: number, purpose?: string): SelectionStep => {
    if (id === 1) return 'purpose'
    if (id === 2) return 'groups'
    if (id === 3) return purpose === 'relationship' ? 'relationship-type' : 'measurement'
    if (id === 4) return 'research-details'
    return 'recommendation'
  }

  // 완료된 단계들
  const completedSteps = useMemo(() => {
    const steps: number[] = []
    if (stepData.purpose) steps.push(1)
    if (stepData.groups !== undefined) steps.push(2)
    if (stepData.repeated !== undefined || stepData.relationshipType) steps.push(3)
    if (stepData.researchDetails) steps.push(4)
    if (recommendedDesign) steps.push(5)
    return steps
  }, [stepData, recommendedDesign])

  // 설계 추천 로직 (외부 엔진 사용)
  const getRecommendedDesign = (data: StepData): ExperimentDesign => {
    // 데이터 검증
    if (!DesignRecommendationEngine.validate(data)) {
      throw new Error('필수 데이터가 누락되었습니다')
    }

    // 추천 엔진 사용
    const design = DesignRecommendationEngine.recommend(data)

    if (!design) {
      throw new Error('추천 가능한 실험설계가 없습니다')
    }

    return design
  }

  // 공통 단계 전환 로직
  const processStepTransition = useCallback(async (
    step: SelectionStep,
    data: StepData
  ): Promise<{ nextStep: SelectionStep; design?: ExperimentDesign }> => {
    // Purpose 단계
    if (step === 'purpose' && data.purpose) {
      if (data.purpose === 'compare') {
        return { nextStep: 'groups' }
      }
      if (data.purpose === 'relationship') {
        return { nextStep: 'relationship-type' }
      }
      // 매핑된 설계 ID 조회
      const designId = PURPOSE_TO_DESIGN_MAP[data.purpose]
      if (designId) {
        const design = getDesignById(designId)
        if (design) {
          return { nextStep: 'recommendation', design }
        }
      }
      throw new Error(`${data.purpose}에 해당하는 실험설계를 찾을 수 없습니다`)
    }

    // Groups 단계
    if (step === 'groups' && data.groups !== undefined) {
      if (data.groups === MIN_GROUPS_FOR_MEASUREMENT) {
        return { nextStep: 'measurement' }
      }
      // 매핑된 설계 ID 조회
      const designId = GROUPS_TO_DESIGN_MAP[String(data.groups)]
      if (designId) {
        const design = getDesignById(designId)
        if (design) {
          return { nextStep: 'recommendation', design }
        }
      }
      // 3개 이상 그룹
      if (typeof data.groups === 'number' && data.groups >= MIN_GROUPS_FOR_MULTIPLE_COMPARISON) {
        const design = getRecommendedDesign(data)
        return { nextStep: 'recommendation', design }
      }
      throw new Error('집단 구조에 맞는 실험설계를 찾을 수 없습니다')
    }

    // Measurement 단계
    if (step === 'measurement' && data.repeated !== undefined) {
      if (data.repeated === 'nonparametric') {
        const design = getDesignById('nonparametric-design')
        if (design) {
          return { nextStep: 'recommendation', design }
        }
      }
      if (data.repeated === 'time-series') {
        const design = getDesignById('repeated-measures-anova')
        if (design) {
          return { nextStep: 'recommendation', design }
        }
      }
      // 일반 측정 → 연구 정보 수집
      return { nextStep: 'research-details' }
    }

    // Relationship Type 단계
    if (step === 'relationship-type' && data.relationshipType) {
      if (data.relationshipType === 'correlation') {
        const design = getDesignById('correlation-study')
        if (design) {
          return { nextStep: 'recommendation', design }
        }
      }
      if (data.relationshipType === 'regression') {
        return { nextStep: 'research-details' }
      }
      throw new Error('관계 분석 유형에 맞는 실험설계를 찾을 수 없습니다')
    }

    // Research Details 단계
    if (step === 'research-details' && data.researchDetails?.title && data.researchDetails?.hypothesis) {
      const design = getRecommendedDesign(data)
      return { nextStep: 'recommendation', design }
    }

    throw new Error('단계 전환 중 오류가 발생했습니다')
  }, [])

  // 단계별 진행 (공통 로직 사용)
  const handleStepComplete = useCallback(async (step: SelectionStep, data: Partial<StepData>) => {
    const newData = { ...stepData, ...data }
    setStepData(newData)
    setIsLoading(true)
    setError(null)

    try {
      const result = await processStepTransition(step, newData)
      setCurrentStep(result.nextStep)
      if (result.design) {
        setRecommendedDesign(result.design)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }, [stepData, processStepTransition])

  // 단계 클릭 핸들러
  const handleStepClick = (stepId: number) => {
    const targetStep = getStepByIndex(stepId, stepData.purpose)
    setCurrentStep(targetStep)
  }

  // 이전/다음 단계 네비게이션
  const canGoPrevious = currentStep !== 'purpose'
  const canGoNext = () => {
    if (currentStep === 'purpose') return !!stepData.purpose
    if (currentStep === 'groups') return stepData.groups !== undefined
    if (currentStep === 'measurement') return stepData.repeated !== undefined
    if (currentStep === 'relationship-type') return !!stepData.relationshipType
    if (currentStep === 'research-details') return !!(stepData.researchDetails?.title && stepData.researchDetails?.hypothesis)
    return false
  }

  const handlePrevious = () => {
    if (currentStep === 'groups') setCurrentStep('purpose')
    else if (currentStep === 'measurement') setCurrentStep('groups')
    else if (currentStep === 'relationship-type') setCurrentStep('purpose')
    else if (currentStep === 'research-details') {
      if (stepData.purpose === 'compare') {
        if (stepData.groups === 2) setCurrentStep('measurement')
        else setCurrentStep('groups')
      } else if (stepData.purpose === 'relationship') {
        setCurrentStep('relationship-type')
      } else {
        setCurrentStep('purpose')
      }
    }
    else if (currentStep === 'recommendation') {
      setCurrentStep('research-details')
    }
  }

  const handleNext = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await processStepTransition(currentStep, stepData)
      setCurrentStep(result.nextStep)
      if (result.design) {
        setRecommendedDesign(result.design)
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
    <div className="min-h-screen bg-background">
      {/* 메인 콘텐츠 */}
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* 헤더 섹션 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                홈으로
              </Button>
            </Link>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">실험설계 도우미</h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            연구 목적에 맞는 최적의 실험설계를 찾고, 표본크기부터 통계분석까지 완벽한 연구계획을 수립하세요
          </p>
        </div>

        {/* 현재 단계 도움말 */}
        {currentStep !== 'recommendation' && (
          <Alert className="max-w-4xl mx-auto mb-4">
            <Info className="h-4 w-4" />
            <AlertTitle>
              {currentStep === 'purpose' && '1단계: 연구 목적을 선택하세요'}
              {currentStep === 'groups' && '2단계: 비교할 집단 구조를 선택하세요'}
              {currentStep === 'measurement' && '3단계: 측정 방식을 선택하세요'}
              {currentStep === 'relationship-type' && '변수 간 관계 유형을 선택하세요'}
              {currentStep === 'research-details' && '4단계: 연구 세부정보를 입력하세요'}
            </AlertTitle>
            <AlertDescription>
              {currentStep === 'purpose' && '연구의 주된 목적이 무엇인지 선택해주세요. 집단을 비교하려면 "차이 비교", 변수 관계를 알고 싶다면 "관계 분석"을 선택하세요.'}
              {currentStep === 'groups' && '비교하려는 집단이 몇 개인지, 어떤 구조인지 선택해주세요. 대부분의 경우 2개 그룹 비교나 3개 이상 그룹 비교를 사용합니다.'}
              {currentStep === 'measurement' && '같은 대상을 여러 번 측정하는지(전후 비교) 아니면 서로 다른 대상들을 비교하는지 선택해주세요.'}
              {currentStep === 'relationship-type' && '변수들 사이의 단순한 관계를 보고 싶다면 "상관분석", 한 변수로 다른 변수를 예측하고 싶다면 "회귀분석"을 선택하세요.'}
              {currentStep === 'research-details' && '맞춤형 연구계획서 생성을 위해 연구 제목과 가설을 입력해주세요. 다른 항목들도 채우시면 더욱 상세한 계획서를 받을 수 있습니다.'}
            </AlertDescription>
          </Alert>
        )}

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
            <AlertTitle>잠깐요!</AlertTitle>
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
                  어떤 연구를 하시나요? 아래에서 가장 가까운 목적을 선택해주세요. 선택에 따라 맞춤형 실험설계를 추천해드립니다.
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
                    onClick={() => handleStepComplete('purpose', { purpose: 'categorical' })}
                  >
                    <Calculator className="w-8 h-8 text-primary" />
                    <div className="text-center">
                      <div className="font-semibold">범주형 변수 관계</div>
                      <div className="text-xs text-muted-foreground">성별-질병, 처리-생존 등 관계</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    className="h-auto p-6 flex-col gap-3 hover:border-primary"
                    onClick={() => handleStepComplete('purpose', { purpose: 'causal' })}
                  >
                    <FlaskConical className="w-8 h-8 text-primary" />
                    <div className="text-center">
                      <div className="font-semibold">인과관계 추론</div>
                      <div className="text-xs text-muted-foreground">처리가 결과에 미치는 영향</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    className="h-auto p-6 flex-col gap-3 hover:border-primary"
                    onClick={() => handleStepComplete('purpose', { purpose: 'case-study' })}
                  >
                    <BarChart3 className="w-8 h-8 text-primary" />
                    <div className="text-center">
                      <div className="font-semibold">사례 연구</div>
                      <div className="text-xs text-muted-foreground">특정 개체/현상 집중 관찰</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    className="h-auto p-6 flex-col gap-3 hover:border-primary"
                    onClick={() => handleStepComplete('purpose', { purpose: 'time-analysis' })}
                  >
                    <TrendingUp className="w-8 h-8 text-primary" />
                    <div className="text-center">
                      <div className="font-semibold">시간 분석</div>
                      <div className="text-xs text-muted-foreground">시간 경과에 따른 변화</div>
                    </div>
                  </Button>

                </div>

                <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-auto p-6 flex-col gap-3 hover:border-primary"
                    onClick={() => handleStepComplete('purpose', { purpose: 'survival' })}
                  >
                    <Calculator className="w-8 h-8 text-primary" />
                    <div className="text-center">
                      <div className="font-semibold">생존 분석</div>
                      <div className="text-xs text-muted-foreground">폐사율, 생존률 연구</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    className="h-auto p-6 flex-col gap-3 hover:border-primary"
                    onClick={() => handleStepComplete('purpose', { purpose: 'dose-response' })}
                  >
                    <FlaskConical className="w-8 h-8 text-primary" />
                    <div className="text-center">
                      <div className="font-semibold">용량-반응 분석</div>
                      <div className="text-xs text-muted-foreground">농도별 독성, 효과 평가</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    className="h-auto p-6 flex-col gap-3 hover:border-primary"
                    onClick={() => handleStepComplete('purpose', { purpose: 'optimization' })}
                  >
                    <TrendingUp className="w-8 h-8 text-primary" />
                    <div className="text-center">
                      <div className="font-semibold">조건 최적화</div>
                      <div className="text-xs text-muted-foreground">최적 사육/실험 조건 찾기</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 관계형 분석 타입 선택 */}
          {currentStep === 'relationship-type' && stepData.purpose === 'relationship' && (
            <Card className="border-2">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  분석 유형을 선택하세요
                </CardTitle>
                <CardDescription>
                  변수 간 관계 분석의 목적에 따라 적절한 방법이 결정됩니다
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-auto p-6 flex-col gap-3 hover:border-primary"
                    onClick={() => handleStepComplete('relationship-type', { relationshipType: 'correlation' })}
                  >
                    <TrendingUp className="w-8 h-8 text-primary" />
                    <div className="text-center">
                      <div className="font-semibold">상관 분석</div>
                      <div className="text-xs text-muted-foreground">두 변수 간 관계의 강도</div>
                      <div className="text-xs text-muted-foreground mt-1">예: 키와 몸무게의 상관</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    className="h-auto p-6 flex-col gap-3 hover:border-primary"
                    onClick={() => handleStepComplete('relationship-type', { relationshipType: 'regression' })}
                  >
                    <Calculator className="w-8 h-8 text-primary" />
                    <div className="text-center">
                      <div className="font-semibold">예측 모델</div>
                      <div className="text-xs text-muted-foreground">여러 변수로 결과 예측</div>
                      <div className="text-xs text-muted-foreground mt-1">예: 성적 예측 모델</div>
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
                  연구에 참여하는 집단이 몇 개인지, 어떤 구조인지 알려주세요. 예를 들어 신약과 기존약을 비교한다면 2개 그룹입니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-auto p-6 flex-col gap-3 hover:border-primary"
                    onClick={() => handleStepComplete('groups', { groups: 2 })}
                  >
                    <div className="text-4xl font-bold text-primary">2</div>
                    <div className="text-center">
                      <div className="font-semibold">2개 그룹</div>
                      <div className="text-xs text-muted-foreground">실험군 vs 대조군</div>
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
                      <div className="text-xs text-muted-foreground">여러 처리법 동시 비교</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    className="h-auto p-6 flex-col gap-3 hover:border-primary"
                    onClick={() => handleStepComplete('groups', { groups: '2x2' })}
                  >
                    <div className="text-2xl font-bold text-primary">2×2</div>
                    <div className="text-center">
                      <div className="font-semibold">2요인 설계</div>
                      <div className="text-xs text-muted-foreground">성별×연령 등 조합 효과</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    className="h-auto p-6 flex-col gap-3 hover:border-primary"
                    onClick={() => handleStepComplete('groups', { groups: 'mixed' })}
                  >
                    <div className="text-2xl font-bold text-primary">혼합</div>
                    <div className="text-center">
                      <div className="font-semibold">혼합설계</div>
                      <div className="text-xs text-muted-foreground">그룹별로 반복 측정</div>
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
                  같은 사람이나 개체를 여러 번 측정하는지, 아니면 다른 대상들을 비교하는지 알려주세요. 예를 들어 치료 전후를 비교한다면 반복 측정입니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-auto p-6 flex-col gap-3 hover:border-primary"
                    onClick={() => handleStepComplete('measurement', { repeated: false })}
                  >
                    <Users2 className="w-8 h-8 text-primary" />
                    <div className="text-center">
                      <div className="font-semibold">독립 그룹</div>
                      <div className="text-xs text-muted-foreground">서로 다른 대상</div>
                      <div className="text-xs text-muted-foreground mt-1">예: A그룹 vs B그룹</div>
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
                      <div className="text-xs text-muted-foreground">동일한 대상</div>
                      <div className="text-xs text-muted-foreground mt-1">예: 처리 전 vs 처리 후</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    className="h-auto p-6 flex-col gap-3 hover:border-primary"
                    onClick={() => handleStepComplete('measurement', { repeated: 'nonparametric' })}
                  >
                    <Calculator className="w-8 h-8 text-primary" />
                    <div className="text-center">
                      <div className="font-semibold">비모수 방법</div>
                      <div className="text-xs text-muted-foreground">데이터가 정규분포 아님</div>
                      <div className="text-xs text-muted-foreground mt-1">예: 순위, 만족도 점수</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    className="h-auto p-6 flex-col gap-3 hover:border-primary"
                    onClick={() => handleStepComplete('measurement', { repeated: 'time-series' })}
                  >
                    <BarChart3 className="w-8 h-8 text-primary" />
                    <div className="text-center">
                      <div className="font-semibold">시계열 반복</div>
                      <div className="text-xs text-muted-foreground">여러 시점에서 측정</div>
                      <div className="text-xs text-muted-foreground mt-1">예: 성장 곡선, 변화 추이</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 4단계: 연구 정보 입력 */}
          {currentStep === 'research-details' && (
            <Card className="border-2">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  연구 세부정보를 입력하세요
                </CardTitle>
                <CardDescription>
                  개인화된 연구계획서를 위해 연구의 구체적인 내용을 입력해주세요. 모든 항목이 필수는 아니지만, 더 자��할수록 맞춤형 계획서를 받을 수 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium">연구 제목 *</Label>
                    <Input
                      id="title"
                      placeholder="예: 신약의 혈압 강하 효과 연구"
                      value={stepData.researchDetails?.title || ''}
                      onChange={(e) => updateResearchDetails('title', e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plannedSampleSize" className="text-sm font-medium">계획된 표본 크기</Label>
                    <Input
                      id="plannedSampleSize"
                      placeholder="예: 각 그룹 30명씩"
                      value={stepData.researchDetails?.plannedSampleSize || ''}
                      onChange={(e) => updateResearchDetails('plannedSampleSize', e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hypothesis" className="text-sm font-medium">연구 가설 *</Label>
                  <Textarea
                    id="hypothesis"
                    placeholder="예: 신약을 투여받은 그룹의 수축기 혈압이 위약 그룹보다 유의하게 낮을 것이다"
                    value={stepData.researchDetails?.hypothesis || ''}
                    onChange={(e) => updateResearchDetails('hypothesis', e.target.value)}
                    className="w-full min-h-[80px]"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="independentVariable" className="text-sm font-medium">독립변수 (처리/그룹)</Label>
                    <Input
                      id="independentVariable"
                      placeholder="예: 약물 종류 (신약, 위약)"
                      value={stepData.researchDetails?.independentVariable || ''}
                      onChange={(e) => updateResearchDetails('independentVariable', e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dependentVariable" className="text-sm font-medium">종속변수 (측정값)</Label>
                    <Input
                      id="dependentVariable"
                      placeholder="예: 수축기 혈압 (mmHg)"
                      value={stepData.researchDetails?.dependentVariable || ''}
                      onChange={(e) => updateResearchDetails('dependentVariable', e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="studyPeriod" className="text-sm font-medium">연구 기간</Label>
                    <Input
                      id="studyPeriod"
                      placeholder="예: 2025년 3월 - 2025년 8월 (6개월)"
                      value={stepData.researchDetails?.studyPeriod || ''}
                      onChange={(e) => updateResearchDetails('studyPeriod', e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="researchContext" className="text-sm font-medium">연구 배경/목적</Label>
                    <Textarea
                      id="researchContext"
                      placeholder="예: 기존 약물의 부작용을 줄이면서 효과를 유지하는 새로운 치료법 개발"
                      value={stepData.researchDetails?.researchContext || ''}
                      onChange={(e) => updateResearchDetails('researchContext', e.target.value)}
                      className="w-full min-h-[60px]"
                    />
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>입력 도움말</AlertTitle>
                  <AlertDescription>
                    <strong>연구 제목</strong>과 <strong>연구 가설</strong>은 필수 항목입니다. 다른 항목들은 선택사항이지만, 더 자세히 입력할수록 맞춤형 연구계획서를 받을 수 있습니다.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* 5단계: 추천 결과 */}
          {currentStep === 'recommendation' && recommendedDesign && (
            <div className="space-y-6">
              {/* 추천 설계 */}
              <Card className="border-2 border-primary">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="w-6 h-6 text-primary" />
                      당신에게 맞는 실험 방법
                    </CardTitle>
                    <Badge variant="secondary">
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
                          <div className="font-medium text-primary">필요한 대상 수</div>
                          <div>{recommendedDesign.sampleSize}</div>
                        </div>
                        <div>
                          <div className="font-medium text-primary">실험 기간</div>
                          <div>{recommendedDesign.duration}</div>
                        </div>
                        <div>
                          <div className="font-medium text-primary">분석 방법</div>
                          <div>{recommendedDesign.statisticalTests[0]}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* 상세 정보 */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">이런 연구에 사용해요</h4>
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
                      <h4 className="font-semibold mb-2">주의해야 할 점</h4>
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
                    <AlertTitle>다음에 할 일</AlertTitle>
                    <AlertDescription>
                      1. 추천된 실험설계를 참고하여 연구 계획을 세우세요<br/>
                      2. 실험이 끝나면 데이터를 모아서 &ldquo;{recommendedDesign.statisticalTests[0]}&rdquo; 분석을 해보세요<br/>
                      3. 분석 결과가 믿을 만한지 확인하고 의미를 해석해보세요
                    </AlertDescription>
                  </Alert>

                  <div className="flex flex-wrap gap-3">
                    {analysisPath ? (
                      <Button asChild>
                        <Link href={analysisPath}>
                          <Calculator className="w-4 h-4 mr-2" />
                          분석 준비 가이드 보기
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        disabled
                        title="해당 통계 분석 페이지는 아직 준비 중입니다."
                      >
                        <Calculator className="w-4 h-4 mr-2" />
                        분석 준비 가이드 보기
                      </Button>
                    )}
                    <Button variant="outline" onClick={handleRestart}>
                      새 설계 만들기
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ※ 분석 가이드는 실험이 끝난 뒤 결과를 정리할 때 활용하며, 장기 실험이라면 지금은
                    데이터 구조와 가정 체크리스트만 미리 확인해 두세요.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ※ 표본 크기와 기간은 일반적인 권장값이므로, 실제 연구에서는 검정력 분석을 통해
                    조정해 주세요.
                  </p>
                  {!analysisPath && (
                    <p className="text-xs text-muted-foreground">
                      통계 분석 페이지가 준비되는 대로 자동으로 연결됩니다.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* 네비게이션 버튼 */}
          {currentStep !== 'recommendation' && (
            <div className="mt-8 pt-6 border-t">
              {/* 진행 상태 안내 */}
              {!canGoNext() && (
                <Alert className="mb-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    {currentStep === 'purpose' && '위에서 연구 목적을 선택해주세요.'}
                    {currentStep === 'groups' && '위에서 집단 구조를 선택해주세요.'}
                    {currentStep === 'measurement' && '위에서 측정 방식을 선택해주세요.'}
                    {currentStep === 'relationship-type' && '위에서 관계 유형을 선택해주세요.'}
                    {currentStep === 'research-details' && '연구 제목과 가설을 입력해주세요.'}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-between items-center">
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
                  className="flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      추천하는 중...
                    </>
                  ) : (
                    <>
                      다음 단계
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 초보자를 위한 추가 도움말 */}
        {currentStep === 'purpose' && (
          <div className="mt-8 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">💡 처음 사용하시나요?</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <div>
                  <strong>차이 비교</strong>: 두 그룹을 비교하거나 처리 전후 차이를 보고 싶을 때
                  <div className="text-muted-foreground ml-4">예: 신약과 기존약의 효과 비교, 교육 전후 성적 변화</div>
                </div>
                <div>
                  <strong>관계 분석</strong>: 두 변수가 서로 관련이 있는지 알고 싶을 때
                  <div className="text-muted-foreground ml-4">예: 키와 몸무게의 관계, 공부시간과 성적의 관계</div>
                </div>
                <div>
                  <strong>특별한 상황</strong>: 시간 변화, 생존율, 용량별 효과 등을 분석할 때
                  <div className="text-muted-foreground ml-4">예: 장기간 성장 추이, 어류 폐사율, 농도별 독성 효과</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}