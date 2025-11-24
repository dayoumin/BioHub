'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Check, TrendingUp, GitCompare, PieChart, LineChart, Clock, ArrowRight, AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { PurposeCard } from '@/components/common/analysis/PurposeCard'
import { AIAnalysisProgress } from '@/components/common/analysis/AIAnalysisProgress'
import { DataProfileSummary } from '@/components/common/analysis/DataProfileSummary'
import { GuidanceCard } from '@/components/common/analysis/GuidanceCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { PurposeInputStepProps } from '@/types/smart-flow-navigation'
import type { AnalysisPurpose, AIRecommendation, VariableSelection, ColumnStatistics } from '@/types/smart-flow'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { logger } from '@/lib/utils/logger'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { DecisionTreeRecommender } from '@/lib/services/decision-tree-recommender'
import { ollamaRecommender } from '@/lib/services/ollama-recommender'

/**
 * Phase 4-B: PurposeInputStep 하이브리드 추천 시스템
 *
 * 변경 사항:
 * 1. ❌ Textarea 제거
 * 2. ✅ Decision Tree UI (5개 목적 카드)
 * 3. ✅ DataProfile 명시적 표시
 * 4. ✅ isAnalyzing 명시적 표시
 * 5. ✅ "이 방법으로 분석하기" 버튼으로 Step 4 분리
 * 6. ✅ Accordion으로 상세 정보 접기/펼치기
 * 7. ✅ Phase 4-B: Hybrid Recommender (Ollama → DecisionTree 폴백)
 */

const ANALYSIS_PURPOSES = [
  {
    id: 'compare' as AnalysisPurpose,
    icon: <GitCompare className="w-5 h-5" />,
    title: '그룹 간 차이 비교',
    description: '두 개 이상의 그룹을 비교하여 평균이나 비율의 차이를 검정합니다.',
    examples: '예: 남녀 간 키 차이, 약물 효과 비교, 교육 방법별 성적 비교'
  },
  {
    id: 'relationship' as AnalysisPurpose,
    icon: <TrendingUp className="w-5 h-5" />,
    title: '변수 간 관계 분석',
    description: '두 개 이상의 변수 사이의 상관관계나 연관성을 분석합니다.',
    examples: '예: 키와 몸무게의 관계, 공부시간과 성적의 관계'
  },
  {
    id: 'distribution' as AnalysisPurpose,
    icon: <PieChart className="w-5 h-5" />,
    title: '분포와 빈도 분석',
    description: '데이터의 분포 형태를 파악하고 각 범주의 빈도를 분석합니다.',
    examples: '예: 나이 분포, 성별 비율, 직업별 분포'
  },
  {
    id: 'prediction' as AnalysisPurpose,
    icon: <LineChart className="w-5 h-5" />,
    title: '예측 모델링',
    description: '독립변수를 사용하여 종속변수를 예측하는 모델을 만듭니다.',
    examples: '예: 공부시간으로 성적 예측, 온도로 판매량 예측'
  },
  {
    id: 'timeseries' as AnalysisPurpose,
    icon: <Clock className="w-5 h-5" />,
    title: '시계열 분석',
    description: '시간에 따른 데이터의 변화 패턴을 분석하고 미래를 예측합니다.',
    examples: '예: 월별 매출 추이, 연도별 인구 변화'
  }
]

export function PurposeInputStep({
  onPurposeSubmit,
  validationResults,
  data
}: PurposeInputStepProps) {
  const [selectedPurpose, setSelectedPurpose] = useState<AnalysisPurpose | null>(null)
  const [selectedGroupVariable, setSelectedGroupVariable] = useState<string | null>(null)
  const [selectedDependentVariable, setSelectedDependentVariable] = useState<string | null>(null)
  const [selectedVariables, setSelectedVariables] = useState<string[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiProgress, setAiProgress] = useState(0)
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null)
  const [analysisError, setAnalysisError] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false) // 중복 클릭 방지

  // WCAG 2.3.3: prefers-reduced-motion 감지
  const prefersReducedMotion = useReducedMotion()

  // Zustand store - assumptionResults 및 setSelectedMethod 사용
  const assumptionResults = useSmartFlowStore(state => state.assumptionResults)
  const setSelectedMethod = useSmartFlowStore(state => state.setSelectedMethod)

  // DataProfile 계산 (Step 2 결과 요약)
  const dataProfile = useMemo(() => {
    if (!validationResults || !data) return null

    const numericVars = validationResults.columns?.filter(
      (col: { type: string }) => col.type === 'numeric'
    ).length || 0

    const categoricalVars = validationResults.columns?.filter(
      (col: { type: string }) => col.type === 'categorical'
    ).length || 0

    const totalCells = data.length * (validationResults.columnCount || 0)
    const missingValues = validationResults.missingValues || 0

    return {
      sampleSize: data.length,
      numericVars,
      categoricalVars,
      missingValues,
      totalCells,
      recommendedType: (() => {
        const n = data.length

        // 1. 소표본 (n < 30) → 무조건 비모수
        if (n < 30) return 'nonparametric' as const

        // 2. 대표본이지만 가정 검정 결과가 있으면 그것 우선
        if (assumptionResults?.summary?.canUseParametric !== undefined) {
          return assumptionResults.summary.canUseParametric ? 'parametric' as const : 'nonparametric' as const
        }

        // 3. 가정 검정 없음 → 보수적 접근 (비모수 권장)
        // 이유: n≥30이어도 데이터가 심하게 비대칭이거나 이상치가 많을 수 있음
        return 'nonparametric' as const
      })()
    }
  }, [validationResults, data])

  // 변수 목록 계산
  const numericColumns = useMemo(() => {
    return validationResults?.columns?.filter(
      (col): col is ColumnStatistics => col.type === 'numeric'
    ) || []
  }, [validationResults])

  const categoricalColumns = useMemo(() => {
    return validationResults?.columns?.filter(
      (col): col is ColumnStatistics => col.type === 'categorical'
    ) || []
  }, [validationResults])

  // 변수 선택 완료 여부
  const isVariableSelectionComplete = useMemo(() => {
    if (!selectedPurpose) return false

    switch (selectedPurpose) {
      case 'compare':
        return !!selectedGroupVariable && !!selectedDependentVariable
      case 'relationship':
        return selectedVariables.length >= 2
      case 'distribution':
        return true // 변수 선택 불필요
      case 'prediction':
        return selectedVariables.length >= 2
      case 'timeseries':
        return selectedVariables.length >= 1
      default:
        return false
    }
  }, [selectedPurpose, selectedGroupVariable, selectedDependentVariable, selectedVariables])

  // 변수 선택 핸들러
  const handleGroupVariableChange = useCallback((value: string) => {
    setSelectedGroupVariable(value)
    setRecommendation(null) // 추천 초기화
  }, [])

  const handleDependentVariableChange = useCallback((value: string) => {
    setSelectedDependentVariable(value)
    setRecommendation(null) // 추천 초기화
  }, [])

  const handleVariablesChange = useCallback((variable: string, checked: boolean) => {
    setSelectedVariables(prev =>
      checked ? [...prev, variable] : prev.filter(v => v !== variable)
    )
    setRecommendation(null) // 추천 초기화
  }, [])

  // 변수 선택 완료 시 자동 AI 추천
  useEffect(() => {
    if (isVariableSelectionComplete && selectedPurpose && !isAnalyzing && !recommendation) {
      // 변수 선택 완료되면 자동으로 AI 추천 실행
      const timer = setTimeout(() => {
        analyzeAndRecommend(selectedPurpose)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isVariableSelectionComplete, selectedPurpose, isAnalyzing, recommendation])

    // Phase 4-B: 하이브리드 AI 추천 (Ollama → DecisionTree 폴백)
  const analyzeAndRecommend = useCallback(async (purpose: AnalysisPurpose): Promise<AIRecommendation | null> => {
    try {
      setIsAnalyzing(true)
      setAiProgress(0)

      // ✅ 데이터 검증
      if (!data || data.length === 0) {
        logger.error('Data is empty or null')
        return null
      }

      // ✅ Null 안전성: assumptionResults 체크 (AI Review Fix #4)
      if (!assumptionResults) {
        logger.warn('assumptionResults is null, using basic recommendation')

        // 가정 검정 없이 기본 추천 (비모수 검정 우선)
        setAiProgress(100)
        return DecisionTreeRecommender.recommendWithoutAssumptions(
          purpose,
          validationResults,
          data
        )
      }

      // Step 1: Ollama Health Check
      setAiProgress(20)
      const ollamaAvailable = await ollamaRecommender.checkHealth()

      if (ollamaAvailable) {
        // ✅ Ollama 사용 가능 → LLM 추천 (95% 정확도)
        logger.info('[Hybrid] Using Ollama LLM for recommendation')

        setAiProgress(40)
        const ollamaResult = await ollamaRecommender.recommend(
          purpose,
          assumptionResults,
          validationResults,
          data
        )

        setAiProgress(100)

        if (ollamaResult) {
          logger.info('[Hybrid] Ollama recommendation SUCCESS', {
            method: ollamaResult.method.id,
            confidence: ollamaResult.confidence
          })
          return ollamaResult
        } else {
          // Ollama 응답 파싱 실패 → DecisionTree 폴백
          logger.warn('[Hybrid] Ollama parsing failed, falling back to DecisionTree')
          setAiProgress(60)
        }
      } else {
        // ✅ Ollama 사용 불가 → DecisionTree 폴백 (85-89% 정확도)
        logger.info('[Hybrid] Ollama unavailable, using DecisionTree')
        setAiProgress(60)
      }

      // Step 2: DecisionTree 폴백
      setAiProgress(80)
      const decisionTreeResult = DecisionTreeRecommender.recommend(
        purpose,
        assumptionResults,
        validationResults,
        data
      )

      setAiProgress(100)

      logger.info('[Hybrid] DecisionTree recommendation SUCCESS', {
        method: decisionTreeResult.method.id,
        confidence: decisionTreeResult.confidence
      })

      return decisionTreeResult
    } catch (error) {
      logger.error('[Hybrid] AI 분석 중 오류 발생', { error })
      // 에러 시 null 반환 (UI에서 에러 메시지 표시)
      return null
    } finally {
      // 항상 로딩 상태 초기화
      setIsAnalyzing(false)
      setAiProgress(0)
    }
  }, [assumptionResults, validationResults, data])

  // 목적 선택 핸들러
  const handlePurposeSelect = useCallback(async (purpose: AnalysisPurpose) => {
    setSelectedPurpose(purpose)
    setRecommendation(null)
    setAnalysisError(false)

    // 변수 선택 초기화
    setSelectedGroupVariable(null)
    setSelectedDependentVariable(null)
    setSelectedVariables([])

    logger.info('Analysis purpose selected', { purpose })

    // 분포 분석은 변수 선택 불필요 → 즉시 AI 추천
    if (purpose === 'distribution') {
      const result = await analyzeAndRecommend(purpose)

      if (result === null) {
        logger.error('AI 추천 실패', { purpose })
        setAnalysisError(true)
      } else {
        setRecommendation(result)
        setAnalysisError(false)
      }
    }
    // 다른 목적은 변수 선택 후 AI 추천 (useEffect에서 처리)
  }, [analyzeAndRecommend])

  // "이 방법으로 분석하기" 버튼 (중복 클릭 방지 + 에러 복구)
  const handleConfirmMethod = useCallback(() => {
    if (!recommendation || !selectedPurpose || isNavigating || isAnalyzing) return

    setIsNavigating(true)

    try {
      // Step 4로 넘어가기 전 스토어에 저장
      setSelectedMethod(recommendation.method)

      // 부모 콜백 호출 (onPurposeSubmit 내부에서 goToNextStep() 호출됨)
      if (onPurposeSubmit) {
        onPurposeSubmit(
          ANALYSIS_PURPOSES.find(p => p.id === selectedPurpose)?.title || '',
          recommendation.method
        )
      }

      // ✅ 정상 케이스: goToNextStep()은 동기 함수로 즉시 currentStep 변경
      // → 컴포넌트 언마운트 → React가 자동으로 상태 정리

      // ❌ onNext() 중복 호출 제거:
      // onPurposeSubmit (handlePurposeSubmit)이 이미 goToNextStep()을 호출하므로
      // 여기서 다시 호출하면 Step 4를 건너뛰고 Step 5로 이동하는 버그 발생
    } catch (error) {
      // ⚠️ 엣지 케이스: onPurposeSubmit() 호출 실패 시 (미래의 검증 로직 추가 등)
      // → 컴포넌트가 언마운트되지 않으므로 isNavigating 수동 리셋 필요
      logger.error('Navigation failed', { error })
      setIsNavigating(false)
    }
  }, [recommendation, selectedPurpose, isNavigating, isAnalyzing, setSelectedMethod, onPurposeSubmit])

  // ✅ Cleanup: 컴포넌트 언마운트 시 상태 리셋 (추가 안전장치)
  useEffect(() => {
    return () => {
      // 정상 네비게이션 시에는 이미 언마운트되어 실행 안 됨
      // 비정상 케이스에서만 실행됨 (메모리 누수 방지)
      setIsNavigating(false)
    }
  }, [])

  return (
    <div className="w-full h-full flex flex-col space-y-6">
      {/* Step 2 결과 요약 */}
      {dataProfile && (
        <DataProfileSummary
          sampleSize={dataProfile.sampleSize}
          numericVars={dataProfile.numericVars}
          categoricalVars={dataProfile.categoricalVars}
          missingValues={dataProfile.missingValues}
          totalCells={dataProfile.totalCells}
          recommendedType={dataProfile.recommendedType}
          title="데이터 요약 (Step 2 결과)"
        />
      )}

      {/* 분석 목적 선택 (Decision Tree) */}
      <div>
        <h3 className="text-lg font-semibold mb-3" id="purpose-selection-label">
          어떤 분석을 하고 싶으신가요?
        </h3>
        {/* ✅ Issue #3 Fix: ARIA radio group semantics */}
        <div
          role="radiogroup"
          aria-labelledby="purpose-selection-label"
          aria-describedby="purpose-selection-help"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {ANALYSIS_PURPOSES.map((purpose, index) => (
            <div
              key={purpose.id}
              className={prefersReducedMotion ? '' : 'animate-slide-in'}
              style={prefersReducedMotion ? undefined : {
                animationDelay: `${index * 150}ms`,
                animationFillMode: 'backwards'
              }}
            >
              <PurposeCard
                icon={purpose.icon}
                title={purpose.title}
                description={purpose.description}
                examples={purpose.examples}
                selected={selectedPurpose === purpose.id}
                onClick={() => handlePurposeSelect(purpose.id)}
                disabled={isAnalyzing}
              />
            </div>
          ))}
        </div>
        {/* Screen reader용 추가 설명 */}
        <div id="purpose-selection-help" className="sr-only">
          5개 중 하나의 분석 목적을 선택하세요. 선택하면 AI가 최적의 통계 방법을 추천합니다.
        </div>
      </div>

      {/* AI 분석 진행 상태 */}
      {isAnalyzing && (
        <AIAnalysisProgress
          progress={aiProgress}
          title="데이터 분석 중..."
        />
      )}

      {/* AI 추천 결과 - 상세 정보 */}
      {recommendation && !isAnalyzing && (
        <>
          {/* 다음 단계 안내 카드 (최상단 배치) */}
          <GuidanceCard
            title="분석 방법이 결정되었습니다!"
            description={
              <>
                <strong>{recommendation.method.name}</strong> 방법으로 분석합니다.
              </>
            }
            steps={[
              { emoji: '1️⃣', text: '분석에 사용할 변수 선택' },
              { emoji: '2️⃣', text: '자동 분석 실행 + 가정 검정' },
              { emoji: '3️⃣', text: '결과 확인 및 해석' }
            ]}
            ctaText="변수 선택하기"
            ctaIcon={<ArrowRight className="w-4 h-4" />}
            onCtaClick={handleConfirmMethod}
            ctaDisabled={isNavigating || isAnalyzing}
            animationDelay={500}
            data-testid="step3-guidance-card"
          />

          <Card className={`border-2 border-primary bg-primary/5 ${prefersReducedMotion ? '' : 'animate-in fade-in slide-in-from-bottom-4 duration-700'}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-primary" />
                    추천: {recommendation.method.name}
                    {/* 출처 배지: Ollama 사용 여부 표시 */}
                    {recommendation.confidence >= 0.95 ? (
                      <Badge variant="default" className="text-xs">LLM</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Rule-based</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    신뢰도: {(recommendation.confidence * 100).toFixed(0)}%
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
            {/* 추천 이유 */}
            <div>
              <h4 className="font-medium mb-2">추천 이유:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {recommendation.reasoning.map((reason, idx) => (
                  <li
                    key={idx}
                    className={prefersReducedMotion ? '' : 'animate-slide-in'}
                    style={prefersReducedMotion ? undefined : {
                      animationDelay: `${idx * 150}ms`,
                      animationFillMode: 'backwards'
                    }}
                  >
                    {reason}
                  </li>
                ))}
              </ul>
            </div>

            {/* Accordion으로 상세 정보 */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="assumptions">
                <AccordionTrigger>통계적 가정 검정 결과</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {recommendation.assumptions.map((assumption, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-background rounded">
                        <span className="text-sm">{assumption.name}</span>
                        <div className="flex items-center gap-2">
                          {assumption.pValue && (
                            <span className="text-xs text-muted-foreground">
                              p = {assumption.pValue.toFixed(3)}
                            </span>
                          )}
                          {assumption.passed ? (
                            <Check className="w-4 h-4 text-success" />
                          ) : (
                            <span className="text-xs text-destructive">불충족</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {recommendation.alternatives && recommendation.alternatives.length > 0 && (
                <AccordionItem value="alternatives">
                  <AccordionTrigger>대안 방법</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {recommendation.alternatives.map((alt, idx) => (
                        <div key={idx} className="p-3 bg-background rounded border">
                          <h5 className="font-medium text-sm">{alt.name}</h5>
                          <p className="text-xs text-muted-foreground mt-1">
                            {alt.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              <AccordionItem value="method-details">
                <AccordionTrigger>방법 상세 정보</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm">
                    <p><strong>설명:</strong> {recommendation.method.description}</p>
                    {recommendation.method.requirements && (
                      <>
                        {recommendation.method.requirements.minSampleSize && (
                          <p>
                            <strong>최소 표본 크기:</strong>{' '}
                            {recommendation.method.requirements.minSampleSize}
                          </p>
                        )}
                        {recommendation.method.requirements.assumptions && (
                          <div>
                            <strong>요구사항:</strong>
                            <ul className="list-disc list-inside ml-4 mt-1">
                              {recommendation.method.requirements.assumptions.map((assumption, idx) => (
                                <li key={idx}>{assumption}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
        </>
      )}

      {/* AI 분석 에러 메시지 */}
      {selectedPurpose && !recommendation && !isAnalyzing && analysisError && (
        <Alert variant="destructive" className={prefersReducedMotion ? '' : 'animate-in fade-in slide-in-from-bottom-4'}>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            AI 분석 중 오류가 발생했습니다. 다른 목적을 선택하거나 페이지를 새로고침 후 다시 시도해주세요.
          </AlertDescription>
        </Alert>
      )}

      {/* 선택 안내 */}
      {!selectedPurpose && !isAnalyzing && (
        <Alert>
          <AlertDescription>
            위에서 분석 목적을 선택하면 AI가 자동으로 최적의 통계 방법을 추천합니다.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
