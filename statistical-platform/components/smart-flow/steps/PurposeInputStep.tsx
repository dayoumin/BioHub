'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Check, TrendingUp, GitCompare, PieChart, LineChart, Clock, Heart, ArrowRight, AlertTriangle, AlertCircle, List, Sparkles } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { PurposeCard } from '@/components/common/analysis/PurposeCard'
import { AIAnalysisProgress } from '@/components/common/analysis/AIAnalysisProgress'
import { GuidanceCard } from '@/components/common/analysis/GuidanceCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { PurposeInputStepProps } from '@/types/smart-flow-navigation'
import type { AnalysisPurpose, AIRecommendation, VariableSelection, ColumnStatistics, StatisticalMethod } from '@/types/smart-flow'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { logger } from '@/lib/utils/logger'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { useSettingsStore } from '@/lib/stores/settings-store'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { DecisionTreeRecommender } from '@/lib/services/decision-tree-recommender'
import { ollamaRecommender } from '@/lib/services/ollama-recommender'
import { ConfidenceGauge } from '@/components/smart-flow/visualization/ConfidenceGauge'
import { AssumptionResultChart } from '@/components/smart-flow/visualization/AssumptionResultChart'
import { MethodBrowser } from './purpose/MethodBrowser'
import { getMethodsGroupedByCategory, getAllMethodsGrouped } from '@/lib/statistics/method-catalog'
import type { MethodGroup } from '@/lib/statistics/method-catalog'

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
  },
  {
    id: 'survival' as AnalysisPurpose,
    icon: <Heart className="w-5 h-5" />,
    title: '생존 분석',
    description: '시간에 따른 사건 발생까지의 기간을 분석하고 위험 요인을 파악합니다.',
    examples: '예: 환자 생존기간, 장비 고장까지 시간, 고객 이탈 분석'
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

      // Step 2: DecisionTree
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
      logger.error('[Hybrid] AI analysis error', { error })
      return null
    } finally {
      setIsAnalyzing(false)
      setAiProgress(0)
    }
  }, [assumptionResults, validationResults, data, useOllamaForRecommendation])

  // Purpose selection handler
  const handlePurposeSelect = useCallback(async (purpose: AnalysisPurpose) => {
    setSelectedPurpose(purpose)
    setRecommendation(null)
    setManualSelectedMethod(null) // Reset manual selection
    setAnalysisError(false)
    setActiveTab('recommended')

    // Reset variable selections
    setSelectedGroupVariable(null)
    setSelectedDependentVariable(null)
    setSelectedVariables([])

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
  const handleConfirmMethod = useCallback(() => {
    if (!finalSelectedMethod || !selectedPurpose || isNavigating || isAnalyzing) return

    setIsNavigating(true)

    try {
      // Save to store
      setSelectedMethod(finalSelectedMethod)

      // Detect variables
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

      // Group variable
      if (recommendation?.detectedVariables?.groupVariable?.name) {
        detectedVars.groupVariable = recommendation.detectedVariables.groupVariable.name
      } else if (categoricalCols.length > 0) {
        detectedVars.groupVariable = categoricalCols[0]
      }

      // Dependent candidate
      if (recommendation?.detectedVariables?.dependentVariables?.[0]) {
        detectedVars.dependentCandidate = recommendation.detectedVariables.dependentVariables[0]
      } else if (numericCols.length > 0) {
        detectedVars.dependentCandidate = numericCols[0]
      }

      // Method-specific detection
      const methodId = finalSelectedMethod.id
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

      setDetectedVariables(detectedVars)
      logger.info('Detected variables saved to store', { methodId, detectedVars })

      // Call parent callback
      if (onPurposeSubmit) {
        onPurposeSubmit(
          ANALYSIS_PURPOSES.find(p => p.id === selectedPurpose)?.title || '',
          finalSelectedMethod
        )
      }

      // Reset navigation state after callback (in case navigation doesn't happen)
      // Use setTimeout to allow parent to navigate first
      setTimeout(() => {
        setIsNavigating(false)
      }, 1000)
    } catch (error) {
      logger.error('Navigation failed', { error })
      setIsNavigating(false)
    }
  }, [finalSelectedMethod, selectedPurpose, isNavigating, isAnalyzing, recommendation, setSelectedMethod, setDetectedVariables, onPurposeSubmit, validationResults])

  // Cleanup
  useEffect(() => {
    return () => {
      setIsNavigating(false)
    }
  }, [])

  return (
    <div className="w-full h-full flex flex-col space-y-6">

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
                selected={selectedPurpose === purpose.id}
                onClick={() => handlePurposeSelect(purpose.id)}
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

      {/* Method Selection Area - Shows after purpose selection */}
      {selectedPurpose && !isAnalyzing && (
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
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'recommended' | 'browse')}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="recommended" className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI 추천
                </TabsTrigger>
                <TabsTrigger value="browse" className="flex items-center gap-2">
                  <List className="w-4 h-4" />
                  전체 방법 보기
                </TabsTrigger>
              </TabsList>

              {/* AI Recommended Tab */}
              <TabsContent value="recommended" className="mt-0">
                {recommendation ? (
                  <div className="space-y-4">
                    {/* Recommendation Card */}
                    <div className={cn(
                      "p-4 rounded-lg border-2",
                      !manualSelectedMethod ? "border-primary bg-primary/5" : "border-border"
                    )}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Sparkles className="w-5 h-5 text-amber-500" />
                            <span className="font-semibold">{recommendation.method.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {recommendation.confidence >= 0.95 ? 'LLM' : 'Rule-based'}
                            </Badge>
                            {!manualSelectedMethod && (
                              <Badge variant="default" className="text-xs">Selected</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {recommendation.method.description}
                          </p>
                        </div>
                        <ConfidenceGauge
                          value={recommendation.confidence * 100}
                          size="sm"
                        />
                      </div>

                      {/* Reasoning */}
                      <div className="mt-3">
                        <h4 className="text-sm font-medium mb-2">추천 이유:</h4>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {recommendation.reasoning.slice(0, 3).map((reason, idx) => (
                            <li key={idx}>• {reason}</li>
                          ))}
                        </ul>
                      </div>

                      {manualSelectedMethod && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={handleUseRecommendation}
                        >
                          AI 추천 사용하기
                        </Button>
                      )}
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
              </TabsContent>

              {/* Browse All Tab */}
              <TabsContent value="browse" className="mt-0">
                <MethodBrowser
                  methodGroups={browseMethodGroups}
                  selectedMethod={manualSelectedMethod}
                  recommendedMethodId={recommendation?.method.id}
                  onMethodSelect={handleManualMethodSelect}
                  dataProfile={dataProfile}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Action Button */}
      {finalSelectedMethod && selectedPurpose && !isAnalyzing && (
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div>
            <span className="text-sm text-muted-foreground">선택된 방법:</span>
            <span className="ml-2 font-semibold">{finalSelectedMethod.name}</span>
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
      {!selectedPurpose && !isAnalyzing && (
        <Alert>
          <AlertDescription>
            위에서 분석 목적을 선택하면 AI가 최적의 통계 방법을 추천합니다.
            추천을 무시하고 원하는 방법을 직접 선택할 수도 있습니다.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
