'use client'

import { useState, useMemo, useCallback, useEffect, useReducer } from 'react'
import { AnimatePresence } from 'framer-motion'
import { TrendingUp, GitCompare, PieChart, LineChart, Clock, Heart, ArrowRight, ArrowLeft, List, Layers, Calculator, Sparkles, Info, Target } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FilterToggle } from '@/components/ui/filter-toggle'
import { PurposeCard } from '@/components/common/analysis/PurposeCard'
import { AIAnalysisProgress } from '@/components/common/analysis/AIAnalysisProgress'
import type { PurposeInputStepProps } from '@/types/smart-flow-navigation'
import type { AnalysisPurpose, AIRecommendation, ColumnStatistics, StatisticalMethod, AutoAnswerResult, AnalysisCategory, SubcategoryDefinition } from '@/types/smart-flow'
import { logger } from '@/lib/utils/logger'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { StepHeader } from '@/components/smart-flow/common'
import { useSettingsStore } from '@/lib/stores/settings-store'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { DecisionTreeRecommender } from '@/lib/services/decision-tree-recommender'
import { ollamaRecommender } from '@/lib/services/ollama-recommender'
import { llmRecommender } from '@/lib/services/llm-recommender'
import { MethodBrowser } from './purpose/MethodBrowser'
import { getMethodsGroupedByCategory, getAllMethodsGrouped } from '@/lib/statistics/method-catalog'
import type { MethodGroup } from '@/lib/statistics/method-catalog'

// NEW: Guided Flow imports
import { GuidedQuestions } from './purpose/GuidedQuestions'
import { RecommendationResult } from './purpose/RecommendationResult'
import { flowReducer, initialFlowState, flowActions } from './purpose/FlowStateMachine'

// NEW: Progressive Questions imports (2025 UI/UX)
import { CategorySelector } from './purpose/CategorySelector'
import { SubcategorySelector } from './purpose/SubcategorySelector'

// NEW: Natural Language Input (AI Chat)
import { NaturalLanguageInput } from './purpose/NaturalLanguageInput'

// Terminology System
import { useTerminology } from '@/hooks/use-terminology'

/**
 * Phase 5: PurposeInputStep with Method Browser
 *
 * NEW FEATURES:
 * 1. Purpose selection shows AI recommendation + ALL available methods
 * 2. User can browse all methods by category
 * 3. User can ignore AI recommendation and select any method
 * 4. "Browse All" tab to see entire method catalog
 */

// Purpose icons (텍스트는 terminology에서 동적으로 가져옴)
const PURPOSE_ICONS: Record<string, React.ReactNode> = {
  compare: <GitCompare className="w-5 h-5" />,
  relationship: <TrendingUp className="w-5 h-5" />,
  distribution: <PieChart className="w-5 h-5" />,
  prediction: <LineChart className="w-5 h-5" />,
  timeseries: <Clock className="w-5 h-5" />,
  survival: <Heart className="w-5 h-5" />,
  multivariate: <Layers className="w-5 h-5" />,
  utility: <Calculator className="w-5 h-5" />,
}

const PURPOSE_IDS: AnalysisPurpose[] = [
  'compare', 'relationship', 'distribution', 'prediction',
  'timeseries', 'survival', 'multivariate', 'utility'
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
 *
 * 우선순위:
 * 1. recommendation.variableAssignments (LLM enhanced — 상세 역할별 매핑)
 * 2. recommendation.detectedVariables (기존 기본 감지)
 * 3. 데이터 기반 추론 (컬럼 타입별 첫 번째 선택)
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
  independentVars?: string[]
  covariates?: string[]
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
    independentVars?: string[]
    covariates?: string[]
  } = {}

  // ─── 1순위: LLM variableAssignments ───
  const va = recommendation?.variableAssignments
  if (va) {
    // LLM 환각 방지: 실제 데이터 컬럼에 존재하는 변수명만 허용
    const allCols = [...numericCols, ...categoricalCols]
    const validCol = (name: string) => allCols.includes(name)

    // Dependent
    if (va.dependent?.[0] && validCol(va.dependent[0])) {
      detectedVars.dependentCandidate = va.dependent[0]
    }
    // Factor (ANOVA group)
    const validFactors = va.factor?.filter(validCol)
    if (validFactors?.length) {
      if (validFactors.length === 1) {
        detectedVars.groupVariable = validFactors[0]
      } else {
        detectedVars.factors = validFactors
      }
    }
    // Independent (regression, t-test group)
    const validIndep = va.independent?.filter(validCol)
    if (validIndep?.length) {
      detectedVars.independentVars = validIndep
      // LLM이 factor 없이 independent만 보낸 경우,
      // 첫 번째 independent가 categorical이면 group-comparison용 groupVariable로 전환
      // (예: t-test에서 factor 대신 independent에 그룹 변수를 넣는 LLM 패턴 대응)
      // factor가 이미 설정됐으면 스킵 (factor 우선)
      if (!detectedVars.groupVariable && categoricalCols.includes(validIndep[0])) {
        detectedVars.groupVariable = validIndep[0]
      }
    }
    // Covariate (ANCOVA)
    const validCov = va.covariate?.filter(validCol)
    if (validCov?.length) {
      detectedVars.covariates = validCov
    }
    // Within (paired/repeated measures)
    if (va.within?.length === 2 && validCol(va.within[0]) && validCol(va.within[1])) {
      detectedVars.pairedVars = [va.within[0], va.within[1]]
    }
    // Between (between-subjects factor)
    if (va.between?.length && validCol(va.between[0]) && !detectedVars.groupVariable) {
      detectedVars.groupVariable = va.between[0]
    }
    // 유효한 할당이 1건이라도 있으면 1순위 결과 반환
    // 전부 환각이면 2순위 폴백으로 폴스루
    const hasAnyValid = detectedVars.dependentCandidate || detectedVars.groupVariable
      || detectedVars.factors?.length || detectedVars.independentVars?.length
      || detectedVars.covariates?.length || detectedVars.pairedVars
    if (hasAnyValid) {
      detectedVars.numericVars = numericCols
      return detectedVars
    }
  }

  // ─── 2순위: 기존 detectedVariables (하위 호환) ───
  if (recommendation?.detectedVariables?.groupVariable?.name) {
    detectedVars.groupVariable = recommendation.detectedVariables.groupVariable.name
  } else if (categoricalCols.length > 0) {
    detectedVars.groupVariable = categoricalCols[0]
  }

  if (recommendation?.detectedVariables?.dependentVariables?.[0]) {
    detectedVars.dependentCandidate = recommendation.detectedVariables.dependentVariables[0]
  } else if (numericCols.length > 0) {
    detectedVars.dependentCandidate = numericCols[0]
  }

  // ─── 3순위: 메서드별 데이터 기반 추론 ───
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
  // Terminology System
  const t = useTerminology()

  // 분석 목적 카드 (terminology 기반)
  const analysisPurposes = useMemo(() =>
    PURPOSE_IDS.map(id => ({
      id,
      icon: PURPOSE_ICONS[id],
      title: t.purposeInput.purposes[id].title,
      description: t.purposeInput.purposes[id].description,
      examples: t.purposeInput.purposes[id].examples
    }))
  , [t])

  // NEW: Guided Flow state
  const [flowState, flowDispatch] = useReducer(flowReducer, initialFlowState)

  // Store에서 초기 입력 모드 가져오기 (useState보다 먼저 선언)
  const storePurposeInputMode = useSmartFlowStore(state => state.purposeInputMode)

  const [selectedPurpose, setSelectedPurpose] = useState<AnalysisPurpose | null>(null)
  // Note: Variable selection is handled in VariableSelectionStep
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  // NEW: 입력 모드 (AI 추천 vs 직접 선택) - store에서 초기값 가져옴
  const [inputMode, setInputMode] = useState<'ai' | 'browse'>(storePurposeInputMode)
  const [aiProgress, setAiProgress] = useState(0)
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null)
  const [analysisError, setAnalysisError] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)

  // NEW: Manual method selection (user override)
  const [manualSelectedMethod, setManualSelectedMethod] = useState<StatisticalMethod | null>(null)
  const [activeTab, setActiveTab] = useState<'recommended' | 'browse'>('recommended')

  // NEW: 입력 모드 변경 핸들러
  const handleInputModeChange = useCallback((mode: 'ai' | 'browse') => {
    setInputMode(mode)
    if (mode === 'ai') {
      // AI 추천 모드로 전환 - reset()이 ai-chat 초기 상태로 설정
      flowDispatch(flowActions.reset())
    } else {
      // 직접 선택 모드로 전환 - browseAll()이 browse 단계로 설정
      flowDispatch(flowActions.browseAll())
    }
  }, [flowDispatch])

  // WCAG 2.3.3: prefers-reduced-motion
  const prefersReducedMotion = useReducedMotion()

  // Settings store - Ollama
  const useOllamaForRecommendation = useSettingsStore(state => state.useOllamaForRecommendation)

  // Zustand store
  const assumptionResults = useSmartFlowStore(state => state.assumptionResults)
  const setSelectedMethod = useSmartFlowStore(state => state.setSelectedMethod)
  const setDetectedVariables = useSmartFlowStore(state => state.setDetectedVariables)
  const setSuggestedSettings = useSmartFlowStore(state => state.setSuggestedSettings)
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

      const hasAssumptions = !!assumptionResults && Object.keys(assumptionResults).length > 0
      if (!hasAssumptions) {
        logger.warn('assumptionResults is null or empty, using basic recommendation')
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
    if (!finalSelectedMethod || (!selectedPurpose && !manualSelectedMethod) || isNavigating || isAnalyzing) return

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
      setSuggestedSettings(recommendation?.suggestedSettings ?? null)
      logger.info('Detected variables saved to store', { methodId: finalSelectedMethod.id, detectedVars })

      // Call parent callback
      if (onPurposeSubmit) {
        await onPurposeSubmit(
          analysisPurposes.find(p => p.id === selectedPurpose)?.title || '',
          finalSelectedMethod
        )
      }
    } catch (error) {
      logger.error('Navigation failed', { error })
    } finally {
      setIsNavigating(false)
    }
  }, [finalSelectedMethod, selectedPurpose, manualSelectedMethod, isNavigating, isAnalyzing, recommendation, setSelectedMethod, setDetectedVariables, setSuggestedSettings, onPurposeSubmit, validationResults, analysisPurposes])

  // NEW: Progressive Questions handlers (2025 UI/UX)
  const handleCategorySelect = useCallback((category: AnalysisCategory) => {
    flowDispatch(flowActions.selectCategory(category))
  }, [])

  const handleSubcategorySelect = useCallback((subcategory: SubcategoryDefinition) => {
    flowDispatch(flowActions.selectSubcategory(
      subcategory.id,
      subcategory.mapsToPurpose,
      subcategory.presetAnswers
    ))
  }, [])

  // LEGACY: Guided Flow handlers (kept for compatibility)
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

    // Entering browse from guided flow should still show an AI recommendation.
    const purpose = flowState.selectedPurpose
    if (purpose) {
      setSelectedPurpose(purpose)

      if (!recommendation && !isAnalyzing) {
        analyzeAndRecommend(purpose).then((result) => {
          if (result) {
            setRecommendation(result)
            setAnalysisError(false)
          } else {
            setAnalysisError(true)
          }
        })
      }
    }
  }, [flowState.selectedPurpose, analyzeAndRecommend, isAnalyzing, recommendation])

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
      setSuggestedSettings(null)

      if (onPurposeSubmit) {
        await onPurposeSubmit(
          analysisPurposes.find(p => p.id === flowState.selectedPurpose)?.title || '',
          method
        )
      }
    } catch (error) {
      logger.error('Navigation failed', { error })
    } finally {
      setIsNavigating(false)
    }
  }, [flowState, isNavigating, setSelectedMethod, setDetectedVariables, setSuggestedSettings, onPurposeSubmit, validationResults, analysisPurposes])

  // ============================================
  // AI Chat Handlers (NEW)
  // ============================================
  const handleAiInputChange = useCallback((value: string) => {
    flowDispatch(flowActions.setAiInput(value))
  }, [])

  const handleAiSubmit = useCallback(async () => {
    if (!flowState.aiChatInput?.trim()) return
    // 중복 제출 방지
    if (flowState.isAiLoading) return

    flowDispatch(flowActions.startAiChat())

    try {
      const { recommendation, responseText, provider } =
        await llmRecommender.recommendFromNaturalLanguage(
          flowState.aiChatInput,
          validationResults ?? null,
          assumptionResults ?? null,
          data ?? null
        )

      flowDispatch(flowActions.setAiProvider(provider))

      if (responseText) {
        flowDispatch(flowActions.setAiResponse(responseText))
      }

      if (recommendation) {
        flowDispatch(flowActions.setAiRecommendation(recommendation))
      } else {
        flowDispatch(flowActions.aiChatError(t.purposeInput.messages.aiRecommendError))
      }
    } catch (error) {
      logger.error('AI Chat error', { error })
      flowDispatch(flowActions.aiChatError(t.purposeInput.messages.genericError))
    }
  }, [flowState.aiChatInput, flowState.isAiLoading, validationResults, assumptionResults, data, t])

  const handleAiSelectMethod = useCallback(async (method: StatisticalMethod) => {
    if (isNavigating) return

    setIsNavigating(true)

    try {
      setSelectedMethod(method)
      const detectedVars = extractDetectedVariables(method.id, validationResults, flowState.aiRecommendation)
      setDetectedVariables(detectedVars)
      setSuggestedSettings(flowState.aiRecommendation?.suggestedSettings ?? null)

      if (onPurposeSubmit) {
        await onPurposeSubmit(t.purposeInput.aiLabels.recommendTitle, method)
      }
    } catch (error) {
      logger.error('Navigation failed', { error })
    } finally {
      setIsNavigating(false)
    }
  }, [isNavigating, setSelectedMethod, setDetectedVariables, setSuggestedSettings, validationResults, flowState.aiRecommendation, onPurposeSubmit, t])

  const handleGoToGuided = useCallback(() => {
    flowDispatch(flowActions.goToGuided())
  }, [])

  // Store의 purposeInputMode 변경 시 동기화
  useEffect(() => {
    if (storePurposeInputMode !== inputMode) {
      setInputMode(storePurposeInputMode)
      // flowState도 동기화
      if (storePurposeInputMode === 'browse') {
        flowDispatch(flowActions.browseAll())
      } else {
        flowDispatch(flowActions.reset())
      }
    }
  }, [storePurposeInputMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup
  useEffect(() => {
    return () => {
      setIsNavigating(false)
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <StepHeader icon={Target} title={t.smartFlow.stepTitles.purposeInput} />

      {/* 입력 모드 탭 (AI 추천 vs 직접 선택) */}
      <div className="flex items-center justify-between">
        <FilterToggle
          options={[
            { id: 'ai', label: t.purposeInput.inputModes.aiRecommend, icon: Sparkles },
            { id: 'browse', label: t.purposeInput.inputModes.directSelect, icon: List }
          ]}
          value={inputMode}
          onChange={(mode) => handleInputModeChange(mode as 'ai' | 'browse')}
          ariaLabel={t.purposeInput.inputModes.modeAriaLabel}
        />
      </div>

      <AnimatePresence mode="wait">
        {/* NEW: AI Chat - Natural Language Input (2025 UI/UX) */}
        {flowState.step === 'ai-chat' && (
          <NaturalLanguageInput
            key="ai-chat"
            inputValue={flowState.aiChatInput || ''}
            responseText={flowState.aiResponseText}
            error={flowState.aiError}
            recommendation={flowState.aiRecommendation}
            isLoading={flowState.isAiLoading}
            onInputChange={handleAiInputChange}
            onSubmit={handleAiSubmit}
            onSelectMethod={handleAiSelectMethod}
            onGoToGuided={handleGoToGuided}
            onBrowseAll={handleBrowseAll}
            disabled={isNavigating}
            validationResults={validationResults}
            provider={flowState.aiProvider}
          />
        )}

        {/* Category Selection (단계별 가이드) */}
        {flowState.step === 'category' && (
          <CategorySelector
            key="category"
            onSelect={handleCategorySelect}
            disabled={isAnalyzing}
          />
        )}

        {/* NEW: Subcategory Selection (2025 UI/UX) */}
        {flowState.step === 'subcategory' && flowState.selectedCategory && (
          <SubcategorySelector
            key="subcategory"
            categoryId={flowState.selectedCategory}
            onSelect={handleSubcategorySelect}
            onBack={handleGuidedBack}
            onBrowseAll={handleBrowseAll}
            disabled={isAnalyzing}
          />
        )}

        {/* Guided Flow - Questions step */}
        {flowState.step === 'questions' && flowState.selectedPurpose && (
          <GuidedQuestions
            key="questions"
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

        {/* Guided Flow - Result step */}
        {flowState.step === 'result' && flowState.result && (
          <RecommendationResult
            key="result"
            result={flowState.result}
            onConfirm={handleGuidedConfirm}
            onBrowseAll={handleBrowseAll}
            onBack={handleGuidedBack}
            onSelectAlternative={handleSelectAlternative}
          />
        )}

        {/* Browse All - Direct method selection */}
        {flowState.step === 'browse' && (
          <div key="browse">
            {/* Header with back button */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGuidedBack}
                  className="gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t.purposeInput.buttons.back}
                </Button>
                <h3 className="text-lg font-semibold">
                  {t.purposeInput.buttons.allMethods}
                </h3>
              </div>
              {/* Action Button - browse 모드에서는 수동 선택만으로 진행 가능 */}
              {finalSelectedMethod && (selectedPurpose || manualSelectedMethod) && !isAnalyzing && (
                <div data-testid="selected-method-bar" className="flex items-center gap-3">
                  <div className="text-sm">
                    <span className="text-muted-foreground">{t.purposeInput.labels.selectionPrefix}</span>
                    <span data-testid="final-selected-method-name" className="ml-1 font-semibold">{finalSelectedMethod.name}</span>
                    {manualSelectedMethod && (
                      <Badge variant="outline" className="ml-2 text-xs">{t.purposeInput.labels.directBadge}</Badge>
                    )}
                  </div>
                  <Button
                    onClick={handleConfirmMethod}
                    disabled={isNavigating}
                    className="gap-2"
                    data-testid="confirm-method-btn"
                  >
                    {t.purposeInput.buttons.useThisMethod}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Method Browser */}
            <MethodBrowser
              methodGroups={browseMethodGroups}
              selectedMethod={manualSelectedMethod}
              recommendedMethodId={recommendation?.method?.id}
              onMethodSelect={handleManualMethodSelect}
              dataProfile={dataProfile}
            />
          </div>
        )}
      </AnimatePresence>

      {/* LEGACY: Purpose Selection - Only show when in 'purpose' step (for backward compatibility) */}
      {flowState.step === 'purpose' && (
      <>
      {/* Header with Action Button (상단 배치) */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" id="purpose-selection-label">
          {t.purposeInput.labels.purposeHeading}
        </h3>
        {/* Action Button - browse step에서 상단에 표시 */}
        {finalSelectedMethod && selectedPurpose && !isAnalyzing && (
          <div data-testid="selected-method-bar" className="flex items-center gap-3">
            <div className="text-sm">
              <span className="text-muted-foreground">{t.purposeInput.labels.selectionPrefix}</span>
              <span data-testid="final-selected-method-name" className="ml-1 font-semibold">{finalSelectedMethod.name}</span>
              {manualSelectedMethod && (
                <Badge variant="outline" className="ml-2 text-xs">{t.purposeInput.labels.directBadge}</Badge>
              )}
            </div>
            <Button
              onClick={handleConfirmMethod}
              disabled={isNavigating}
              className="gap-2"
            >
              {t.purposeInput.buttons.useThisMethod}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Purpose Selection */}
      <div>
        <div
          role="radiogroup"
          aria-labelledby="purpose-selection-label"
          aria-describedby="purpose-selection-help"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {analysisPurposes.map((purpose, index) => (
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
          {t.purposeInput.messages.purposeHelp}
        </div>
      </div>

      {/* AI Analysis Progress */}
      {isAnalyzing && (
        <AIAnalysisProgress
          progress={aiProgress}
          title={t.smartFlow.statusMessages.analyzing}
        />
      )}

      {/* Initial guidance */}
      {!selectedPurpose && !isAnalyzing && flowState.step === 'purpose' && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {t.purposeInput.messages.guidanceAlert}
          </AlertDescription>
        </Alert>
      )}
      </>
      )}
    </div>
  )
}
