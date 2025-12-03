'use client'

import { useState, useMemo, useCallback, useEffect, useReducer } from 'react'
import { Check, TrendingUp, GitCompare, PieChart, LineChart, Clock, Heart, ArrowRight, AlertTriangle, AlertCircle, List, Sparkles, Layers, Calculator } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ContentTabs, ContentTabsContent } from '@/components/ui/content-tabs'
import { cn } from '@/lib/utils'
import { PurposeCard } from '@/components/common/analysis/PurposeCard'
import { AIAnalysisProgress } from '@/components/common/analysis/AIAnalysisProgress'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { PurposeInputStepProps } from '@/types/smart-flow-navigation'
import type { AnalysisPurpose, AIRecommendation, ColumnStatistics, StatisticalMethod, AutoAnswerResult } from '@/types/smart-flow'
import { logger } from '@/lib/utils/logger'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { useSettingsStore } from '@/lib/stores/settings-store'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { DecisionTreeRecommender } from '@/lib/services/decision-tree-recommender'
import { ollamaRecommender } from '@/lib/services/ollama-recommender'
import { FitScoreIndicator } from '@/components/smart-flow/visualization/FitScoreIndicator'
import { MethodBrowser } from './purpose/MethodBrowser'
import { getMethodsGroupedByCategory, getAllMethodsGrouped } from '@/lib/statistics/method-catalog'
import type { MethodGroup } from '@/lib/statistics/method-catalog'

// NEW: Guided Flow imports
import { GuidedQuestions } from './purpose/GuidedQuestions'
import { RecommendationResult } from './purpose/RecommendationResult'
import { flowReducer, initialFlowState, flowActions } from './purpose/FlowStateMachine'

/**
 * Phase 5: PurposeInputStep with Method Browser
 *
 * NEW FEATURES:
 * 1. Purpose selection shows AI recommendation + ALL available methods
 * 2. User can browse all methods by category
 * 3. User can ignore AI recommendation and select any method
 * 4. "Browse All" tab to see entire method catalog
 */

const ANALYSIS_PURPOSES = [
  {
    id: 'compare' as AnalysisPurpose,
    icon: <GitCompare className="w-5 h-5" />,
    title: '그룹 간 차이 비교',
    description: '두 개 이상의 그룹을 비교하여 평균이나 비율의 차이를 검정합니다.',
    examples: '예: 양식장별 어류 성장률 비교, 사료 종류에 따른 체중 증가 비교, 해역별 수온 차이'
  },
  {
    id: 'relationship' as AnalysisPurpose,
    icon: <TrendingUp className="w-5 h-5" />,
    title: '변수 간 관계 분석',
    description: '두 개 이상의 변수 사이의 상관관계나 연관성을 분석합니다.',
    examples: '예: 수온과 어류 성장률의 관계, 염분과 생존율의 관계, 체장과 체중의 관계'
  },
  {
    id: 'distribution' as AnalysisPurpose,
    icon: <PieChart className="w-5 h-5" />,
    title: '분포와 빈도 분석',
    description: '데이터의 분포 형태를 파악하고 각 범주의 빈도를 분석합니다.',
    examples: '예: 어류 체장 분포, 어종별 어획량 비율, 해역별 플랑크톤 밀도 분포'
  },
  {
    id: 'prediction' as AnalysisPurpose,
    icon: <LineChart className="w-5 h-5" />,
    title: '예측 모델링',
    description: '독립변수를 사용하여 종속변수를 예측하는 모델을 만듭니다.',
    examples: '예: 수온으로 어획량 예측, 사료량으로 성장률 예측, 환경요인으로 폐사율 예측'
  },
  {
    id: 'timeseries' as AnalysisPurpose,
    icon: <Clock className="w-5 h-5" />,
    title: '시계열 분석',
    description: '시간에 따른 데이터의 변화 패턴을 분석하고 미래를 예측합니다.',
    examples: '예: 월별 어획량 추이, 연도별 양식 생산량 변화, 계절별 수온 패턴'
  },
  {
    id: 'survival' as AnalysisPurpose,
    icon: <Heart className="w-5 h-5" />,
    title: '생존 분석',
    description: '시간에 따른 사건 발생까지의 기간을 분석하고 위험 요인을 파악합니다.',
    examples: '예: 치어 생존기간, 양식 시설 내구연수, 질병 발생 후 폐사까지 시간'
  },
  {
    id: 'multivariate' as AnalysisPurpose,
    icon: <Layers className="w-5 h-5" />,
    title: '다변량 분석',
    description: '여러 변수를 동시에 분석하여 차원 축소, 요인 추출, 군집화를 수행합니다.',
    examples: '예: 수질 지표 차원 축소(PCA), 양식장 유형화(군집), 어종 분류(판별분석)'
  },
  {
    id: 'utility' as AnalysisPurpose,
    icon: <Calculator className="w-5 h-5" />,
    title: '연구 설계 도구',
    description: '표본 크기 계산, 검정력 분석, 측정 도구 신뢰도 평가를 수행합니다.',
    examples: '예: 실험 설계 시 필요 표본수, 설문지 신뢰도(Cronbach α), 검정력 계산'
  }
]


const mergeMethodGroups = (primary: MethodGroup[], fallback: MethodGroup[]): MethodGroup[] => {
  const merged: MethodGroup[] = []
  const categoryMap = new Map<string, MethodGroup>()
  const seenMethodIds = new Set<string>()

  const addGroup = (group: MethodGroup) => {
    const existing = categoryMap.get(group.category)
    const dedupedMethods = group.methods.filter(method => {
      if (seenMethodIds.has(method.id)) return false
      seenMethodIds.add(method.id)
      return true
    })

    if (dedupedMethods.length === 0) return

    if (existing) {
      existing.methods.push(...dedupedMethods)
    } else {
      const nextGroup: MethodGroup = {
        ...group,
        methods: [...dedupedMethods]
      }
      categoryMap.set(group.category, nextGroup)
      merged.push(nextGroup)
    }
  }

  primary.forEach(addGroup)
  fallback.forEach(addGroup)

  return merged
}


/**
 * Extract detected variables based on method and validation results
 */
function extractDetectedVariables(
  methodId: string,
  validationResults: { columns?: ColumnStatistics[] } | null | undefined,
  recommendation?: AIRecommendation | null
): {
  groupVariable?: string
  dependentCandidate?: string
  numericVars?: string[]
  factors?: string[]
  pairedVars?: [string, string]
} {
  const numericCols = validationResults?.columns
    ?.filter((col: ColumnStatistics) => col.type === 'numeric')
    ?.map((col: ColumnStatistics) => col.name) || []
  const categoricalCols = validationResults?.columns
    ?.filter((col: ColumnStatistics) => col.type === 'categorical')
    ?.map((col: ColumnStatistics) => col.name) || []

  const detectedVars: {
    groupVariable?: string
    dependentCandidate?: string
    numericVars?: string[]
    factors?: string[]
    pairedVars?: [string, string]
  } = {}

  // Group variable from recommendation or first categorical
  if (recommendation?.detectedVariables?.groupVariable?.name) {
    detectedVars.groupVariable = recommendation.detectedVariables.groupVariable.name
  } else if (categoricalCols.length > 0) {
    detectedVars.groupVariable = categoricalCols[0]
  }

  // Dependent candidate from recommendation or first numeric
  if (recommendation?.detectedVariables?.dependentVariables?.[0]) {
    detectedVars.dependentCandidate = recommendation.detectedVariables.dependentVariables[0]
  } else if (numericCols.length > 0) {
    detectedVars.dependentCandidate = numericCols[0]
  }

  // Method-specific detection
  if (methodId === 'two-way-anova' || methodId === 'three-way-anova') {
    detectedVars.factors = categoricalCols.slice(0, 2)
  } else if (methodId === 'paired-t-test' || methodId === 'paired-t' || methodId === 'wilcoxon' || methodId === 'wilcoxon-signed-rank') {
    if (numericCols.length >= 2) {
      detectedVars.pairedVars = [numericCols[0], numericCols[1]]
    }
  } else if (methodId === 'pearson-correlation' || methodId === 'spearman-correlation' || methodId === 'correlation') {
    detectedVars.numericVars = numericCols
  } else {
    detectedVars.numericVars = numericCols
  }

  return detectedVars
}

export function PurposeInputStep({
  onPurposeSubmit,
  validationResults,
  data
}: PurposeInputStepProps) {
  // NEW: Guided Flow state
  const [flowState, flowDispatch] = useReducer(flowReducer, initialFlowState)

  const [selectedPurpose, setSelectedPurpose] = useState<AnalysisPurpose | null>(null)
  // Note: Variable selection is handled in VariableSelectionStep
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiProgress, setAiProgress] = useState(0)
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null)
  const [analysisError, setAnalysisError] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)

  // NEW: Manual method selection (user override)
  const [manualSelectedMethod, setManualSelectedMethod] = useState<StatisticalMethod | null>(null)
  const [activeTab, setActiveTab] = useState<'recommended' | 'browse'>('recommended')

  // WCAG 2.3.3: prefers-reduced-motion
  const prefersReducedMotion = useReducedMotion()

  // Settings store - Ollama
  const useOllamaForRecommendation = useSettingsStore(state => state.useOllamaForRecommendation)

  // Zustand store
  const assumptionResults = useSmartFlowStore(state => state.assumptionResults)
  const setSelectedMethod = useSmartFlowStore(state => state.setSelectedMethod)
  const setDetectedVariables = useSmartFlowStore(state => state.setDetectedVariables)
  const methodCompatibility = useSmartFlowStore(state => state.methodCompatibility)

  // Data profile for MethodBrowser
  const dataProfile = useMemo(() => {
    if (!validationResults?.columns) return undefined
    const numericVars = validationResults.columns.filter((c: ColumnStatistics) => c.type === 'numeric').length
    const categoricalVars = validationResults.columns.filter((c: ColumnStatistics) => c.type === 'categorical').length
    return {
      totalRows: data?.length || 0,
      numericVars,
      categoricalVars
    }
  }, [validationResults, data])

  // All method groups (for Browse All tab)
  const allMethodGroups = useMemo(() => getAllMethodsGrouped(), [])

  // Method groups for current purpose
  const purposeMethodGroups = useMemo(() => {
    if (!selectedPurpose) return allMethodGroups
    return getMethodsGroupedByCategory(selectedPurpose)
  }, [selectedPurpose, allMethodGroups])

  // Merge purpose-first view with full catalog to avoid losing AI context when browsing
  const browseMethodGroups = useMemo(() => {
    const baseGroups = mergeMethodGroups(
      selectedPurpose ? purposeMethodGroups : allMethodGroups,
      allMethodGroups
    )

    const recommendedMethodFromCatalog = recommendation?.method
      ? allMethodGroups
        .flatMap(group => group.methods)
        .find(m => m.id === recommendation.method.id) || recommendation.method
      : null

    if (!recommendedMethodFromCatalog) return baseGroups

    const hasRecommended = baseGroups.some(group =>
      group.methods.some(method => method.id === recommendedMethodFromCatalog.id)
    )

    if (hasRecommended) return baseGroups

    return [
      ...baseGroups,
      {
        category: recommendedMethodFromCatalog.category,
        categoryLabel: recommendedMethodFromCatalog.category,
        methods: [recommendedMethodFromCatalog]
      }
    ]
  }, [selectedPurpose, purposeMethodGroups, allMethodGroups, recommendation])

  // The final selected method (manual override or AI recommendation)
  const finalSelectedMethod = useMemo(() => {
    return manualSelectedMethod || recommendation?.method || null
  }, [manualSelectedMethod, recommendation])

  // Phase 4-B: Hybrid AI recommendation
  const analyzeAndRecommend = useCallback(async (purpose: AnalysisPurpose): Promise<AIRecommendation | null> => {
    try {
      setIsAnalyzing(true)
      setAiProgress(0)

      if (!data || data.length === 0) {
        logger.error('Data is empty or null')
        return null
      }

      if (!assumptionResults) {
        logger.warn('assumptionResults is null, using basic recommendation')
        setAiProgress(100)
        return DecisionTreeRecommender.recommendWithoutAssumptions(
          purpose,
          validationResults,
          data
        )
      }

      // Step 1: Check Ollama setting
      if (useOllamaForRecommendation) {
        setAiProgress(20)
        const ollamaAvailable = await ollamaRecommender.checkHealth()

        if (ollamaAvailable) {
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
            logger.warn('[Hybrid] Ollama parsing failed, falling back to DecisionTree')
            setAiProgress(60)
          }
        } else {
          logger.info('[Hybrid] Ollama unavailable, using DecisionTree')
          setAiProgress(60)
        }
      } else {
        logger.info('[Hybrid] Ollama disabled in settings, using DecisionTree')
        setAiProgress(50)
      }

      // Step 2: DecisionTree with compatibility filtering
      setAiProgress(80)
      const decisionTreeResult = DecisionTreeRecommender.recommendWithCompatibility(
        purpose,
        assumptionResults,
        validationResults,
        data,
        methodCompatibility
      )

      setAiProgress(100)

      logger.info('[Hybrid] DecisionTree recommendation SUCCESS', {
        method: decisionTreeResult.method.id,
        confidence: decisionTreeResult.confidence
      })

      return decisionTreeResult
    } catch (error) {
      logger.error('[Hybrid] AI analysis error', { error })
      return null
    } finally {
      setIsAnalyzing(false)
      setAiProgress(0)
    }
  }, [assumptionResults, validationResults, data, useOllamaForRecommendation, methodCompatibility])

  // Purpose selection handler
  const handlePurposeSelect = useCallback(async (purpose: AnalysisPurpose) => {
    setSelectedPurpose(purpose)
    setRecommendation(null)
    setManualSelectedMethod(null) // Reset manual selection
    setAnalysisError(false)
    setActiveTab('recommended')

    logger.info('Analysis purpose selected', { purpose })

    // Run AI recommendation
    const result = await analyzeAndRecommend(purpose)

    if (result === null) {
      logger.error('AI recommendation failed', { purpose })
      setAnalysisError(true)
    } else {
      setRecommendation(result)
      setAnalysisError(false)
    }
  }, [analyzeAndRecommend])

  // Manual method selection from MethodBrowser
  const handleManualMethodSelect = useCallback((method: StatisticalMethod) => {
    logger.info('Manual method selected', { methodId: method.id, methodName: method.name })
    setManualSelectedMethod(method)
  }, [])

  // Use AI recommendation (reset manual selection)
  const handleUseRecommendation = useCallback(() => {
    setManualSelectedMethod(null)
    setActiveTab('recommended')
  }, [])

  // Confirm and proceed
  const handleConfirmMethod = useCallback(async () => {
    if (!finalSelectedMethod || !selectedPurpose || isNavigating || isAnalyzing) return

    setIsNavigating(true)

    try {
      // Save to store
      setSelectedMethod(finalSelectedMethod)

      // Extract and save detected variables
      const detectedVars = extractDetectedVariables(
        finalSelectedMethod.id,
        validationResults,
        recommendation
      )
      setDetectedVariables(detectedVars)
      logger.info('Detected variables saved to store', { methodId: finalSelectedMethod.id, detectedVars })

      // Call parent callback
      if (onPurposeSubmit) {
        await onPurposeSubmit(
          ANALYSIS_PURPOSES.find(p => p.id === selectedPurpose)?.title || '',
          finalSelectedMethod
        )
      }
    } catch (error) {
      logger.error('Navigation failed', { error })
    } finally {
      setIsNavigating(false)
    }
  }, [finalSelectedMethod, selectedPurpose, isNavigating, isAnalyzing, recommendation, setSelectedMethod, setDetectedVariables, onPurposeSubmit, validationResults])

  // NEW: Guided Flow handlers
  const handleGuidedPurposeSelect = useCallback((purpose: AnalysisPurpose) => {
    flowDispatch(flowActions.selectPurpose(purpose))
  }, [])

  const handleAnswerQuestion = useCallback((questionId: string, value: string) => {
    flowDispatch(flowActions.answerQuestion(questionId, value))
  }, [])

  const handleSetAutoAnswer = useCallback((questionId: string, result: AutoAnswerResult) => {
    flowDispatch(flowActions.setAutoAnswer(questionId, result))
  }, [])

  const handleGuidedComplete = useCallback(() => {
    if (!flowState.selectedPurpose) return
    flowDispatch(flowActions.completeQuestions())
  }, [flowState.selectedPurpose])

  const handleBrowseAll = useCallback(() => {
    flowDispatch(flowActions.browseAll())
    // Also set the tab to browse for the existing UI
    setActiveTab('browse')
  }, [])

  const handleGuidedBack = useCallback(() => {
    flowDispatch(flowActions.goBack())
  }, [])

  const handleSelectAlternative = useCallback((method: StatisticalMethod) => {
    flowDispatch(flowActions.selectMethod(method))
  }, [])

  const handleGuidedConfirm = useCallback(async () => {
    if (!flowState.result?.method || !flowState.selectedPurpose || isNavigating) return

    setIsNavigating(true)

    try {
      const method = flowState.result.method
      setSelectedMethod(method)

      // Extract and save detected variables (using shared helper)
      const detectedVars = extractDetectedVariables(method.id, validationResults)
      setDetectedVariables(detectedVars)

      if (onPurposeSubmit) {
        await onPurposeSubmit(
          ANALYSIS_PURPOSES.find(p => p.id === flowState.selectedPurpose)?.title || '',
          method
        )
      }
    } catch (error) {
      logger.error('Navigation failed', { error })
    } finally {
      setIsNavigating(false)
    }
  }, [flowState, isNavigating, setSelectedMethod, setDetectedVariables, onPurposeSubmit, validationResults])

  // Cleanup
  useEffect(() => {
    return () => {
      setIsNavigating(false)
    }
  }, [])

  return (
    <div className="w-full h-full flex flex-col space-y-6">

      {/* NEW: Guided Flow - Questions step */}
      {flowState.step === 'questions' && flowState.selectedPurpose && (
        <GuidedQuestions
          purpose={flowState.selectedPurpose}
          answers={flowState.answers}
          autoAnswers={flowState.autoAnswers}
          onAnswerQuestion={handleAnswerQuestion}
          onSetAutoAnswer={handleSetAutoAnswer}
          onComplete={handleGuidedComplete}
          onBrowseAll={handleBrowseAll}
          onBack={handleGuidedBack}
          validationResults={validationResults}
          assumptionResults={assumptionResults}
        />
      )}

      {/* NEW: Guided Flow - Result step */}
      {flowState.step === 'result' && flowState.result && (
        <RecommendationResult
          result={flowState.result}
          onConfirm={handleGuidedConfirm}
          onBrowseAll={handleBrowseAll}
          onBack={handleGuidedBack}
          onSelectAlternative={handleSelectAlternative}
        />
      )}

      {/* Purpose Selection - Only show when in 'purpose' or 'browse' step */}
      {(flowState.step === 'purpose' || flowState.step === 'browse') && (
      <>
      {/* Purpose Selection */}
      <div>
        <h3 className="text-lg font-semibold mb-3" id="purpose-selection-label">
          어떤 분석을 하고 싶으신가요?
        </h3>
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
                selected={selectedPurpose === purpose.id || flowState.selectedPurpose === purpose.id}
                onClick={() => {
                  // Use Guided Flow for purpose selection
                  handleGuidedPurposeSelect(purpose.id)
                  // Also run existing AI recommendation for Browse tab
                  handlePurposeSelect(purpose.id)
                }}
                disabled={isAnalyzing}
              />
            </div>
          ))}
        </div>
        <div id="purpose-selection-help" className="sr-only">
          5개 중 하나의 분석 목적을 선택하세요. 선택하면 AI가 최적의 통계 방법을 추천합니다.
        </div>
      </div>

      {/* AI Analysis Progress */}
      {isAnalyzing && (
        <AIAnalysisProgress
          progress={aiProgress}
          title="데이터 분석 중..."
        />
      )}

      {/* Method Selection Area - Only shows in 'browse' step (legacy mode) */}
      {flowState.step === 'browse' && selectedPurpose && !isAnalyzing && (
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <List className="w-5 h-5" />
              분석 방법 선택
            </CardTitle>
            <CardDescription>
              AI 추천을 사용하거나 직접 원하는 방법을 선택하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ContentTabs
              tabs={[
                { id: 'recommended', label: 'AI 추천', icon: Sparkles },
                { id: 'browse', label: '전체 방법 보기', icon: List }
              ]}
              activeTab={activeTab}
              onTabChange={(v) => setActiveTab(v as 'recommended' | 'browse')}
              className="mb-4"
            />

            {/* AI Recommended Tab */}
            <ContentTabsContent tabId="recommended" show={activeTab === 'recommended'}>
                {recommendation ? (
                  <div className="space-y-4">
                    {/* Recommendation Card - 점진적 공개 패턴 적용 */}
                    <div
                      data-testid="recommendation-card"
                      className={cn(
                        "rounded-lg border-2 overflow-hidden",
                        !manualSelectedMethod ? "border-primary bg-gradient-to-br from-primary/5 to-primary/10" : "border-border"
                      )}
                    >
                      {/* 메인 카드 - 항상 표시 (간단 버전) */}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <Sparkles className="w-5 h-5 text-amber-500" />
                              <span data-testid="recommended-method-name" className="font-semibold text-lg">{recommendation.method.name}</span>
                              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                {recommendation.confidence >= 0.95 ? 'LLM 추천' : 'AI 추천'}
                              </Badge>
                              {!manualSelectedMethod && (
                                <Badge variant="default" className="text-xs">선택됨</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {recommendation.method.description}
                            </p>
                          </div>
                        </div>

                        {/* 적합도 표시 (숫자 대신 언어 + 프로그레스 바) */}
                        <div className="mt-4">
                          <FitScoreIndicator score={recommendation.confidence * 100} />
                        </div>

                        {manualSelectedMethod && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-4"
                            onClick={handleUseRecommendation}
                          >
                            AI 추천 사용하기
                          </Button>
                        )}
                      </div>

                      {/* 추천 이유 - 점진적 공개 (Accordion) */}
                      <Accordion type="single" collapsible className="border-t">
                        <AccordionItem value="reasoning" className="border-0">
                          <AccordionTrigger className="px-4 py-2 text-sm hover:no-underline">
                            <span className="text-xs text-muted-foreground">왜 이 방법을 추천하나요?</span>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            <ul className="text-xs text-muted-foreground space-y-2">
                              {recommendation.reasoning.map((reason, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <Check className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                                  <span>{reason}</span>
                                </li>
                              ))}
                            </ul>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>

                    {/* Alternative methods */}
                    {recommendation.alternatives && recommendation.alternatives.length > 0 && (
                      <Accordion type="single" collapsible>
                        <AccordionItem value="alternatives" className="border rounded-lg">
                          <AccordionTrigger className="px-4 py-2 text-sm">
                            다른 추천 방법 ({recommendation.alternatives.length}개)
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            <div className="space-y-2">
                              {recommendation.alternatives.map((alt, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => setManualSelectedMethod({
                                    id: alt.id,
                                    name: alt.name,
                                    description: alt.description,
                                    category: alt.category
                                  })}
                                  className={cn(
                                    "w-full p-3 rounded-lg border text-left transition-all",
                                    "hover:border-primary hover:bg-primary/5",
                                    manualSelectedMethod?.id === alt.id && "border-primary bg-primary/5"
                                  )}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-sm">{alt.name}</span>
                                    {manualSelectedMethod?.id === alt.id && (
                                      <Check className="w-4 h-4 text-primary" />
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {alt.description}
                                  </p>
                                </button>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    )}

                    {/* Link to browse all */}
                    <div className="text-center pt-2">
                      <button
                        onClick={() => setActiveTab('browse')}
                        className="text-sm text-primary hover:underline"
                      >
                        원하는 방법이 없나요? 전체 목록 보기 →
                      </button>
                    </div>
                  </div>
                ) : analysisError ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                      AI 분석 중 오류가 발생했습니다. "전체 방법 보기" 탭에서 직접 선택하세요.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    분석 중...
                  </div>
                )}
            </ContentTabsContent>

            {/* Browse All Tab */}
            <ContentTabsContent tabId="browse" show={activeTab === 'browse'}>
              <MethodBrowser
                methodGroups={browseMethodGroups}
                selectedMethod={manualSelectedMethod}
                recommendedMethodId={recommendation?.method.id}
                onMethodSelect={handleManualMethodSelect}
                dataProfile={dataProfile}
              />
            </ContentTabsContent>
          </CardContent>
        </Card>
      )}

      {/* Action Button - Only shows in 'browse' step (legacy mode) */}
      {flowState.step === 'browse' && finalSelectedMethod && selectedPurpose && !isAnalyzing && (
        <div data-testid="selected-method-bar" className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div>
            <span className="text-sm text-muted-foreground">선택된 방법:</span>
            <span data-testid="final-selected-method-name" className="ml-2 font-semibold">{finalSelectedMethod.name}</span>
            {manualSelectedMethod && (
              <Badge variant="outline" className="ml-2 text-xs">직접 선택</Badge>
            )}
          </div>
          <Button
            onClick={handleConfirmMethod}
            disabled={isNavigating}
            className="gap-2"
          >
            이 방법으로 분석하기
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Initial guidance */}
      {!selectedPurpose && !isAnalyzing && flowState.step === 'purpose' && (
        <Alert>
          <AlertDescription>
            위에서 분석 목적을 선택하면 단계별 질문을 통해 최적의 통계 방법을 추천합니다.
          </AlertDescription>
        </Alert>
      )}
      </>
      )}
    </div>
  )
}
