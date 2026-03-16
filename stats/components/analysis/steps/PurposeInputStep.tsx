'use client'

import React, { useState, useMemo, useCallback, useEffect, useReducer, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { TrendingUp, GitCompare, PieChart, LineChart, Clock, Heart, ArrowRight, List, Layers, Calculator, Sparkles, Target, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import { FilterToggle } from '@/components/ui/filter-toggle'
import type { PurposeInputStepProps } from '@/types/analysis-navigation'
import type { AnalysisPurpose, AIRecommendation, ColumnStatistics, StatisticalMethod, AutoAnswerResult, AnalysisCategory, SubcategoryDefinition, FlowChatMessage } from '@/types/analysis'
import { logger } from '@/lib/utils/logger'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { useModeStore } from '@/lib/stores/mode-store'
import { StepHeader } from '@/components/analysis/common'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { DecisionTreeRecommender } from '@/lib/services/decision-tree-recommender'
import { llmRecommender } from '@/lib/services/llm-recommender'
import { PurposeBrowseSection } from './purpose/PurposeBrowseSection'
import { PurposeLegacySection } from './purpose/PurposeLegacySection'
import { getMethodsGroupedByCategory, getAllMethodsGrouped } from '@/lib/statistics/method-catalog'
import type { MethodGroup } from '@/lib/statistics/method-catalog'

// NEW: Guided Flow imports
import { GuidedQuestions } from './purpose/GuidedQuestions'
import { RecommendationResult } from './purpose/RecommendationResult'
import { createFlowReducer, initialFlowState, flowActions } from './purpose/FlowStateMachine'

// NEW: Progressive Questions imports (2025 UI/UX)
import { CategorySelector } from './purpose/CategorySelector'
import { SubcategorySelector } from './purpose/SubcategorySelector'

// NEW: Natural Language Input (AI Chat)
import { NaturalLanguageInput } from './purpose/NaturalLanguageInput'

// NEW: Auto Recommendation Confirm (자동 추천 → 확인 카드)
import { AutoRecommendationConfirm } from './purpose/AutoRecommendationConfirm'

// Terminology System
import { useTerminology } from '@/hooks/use-terminology'

// Pyodide Worker Prefetch
import { prefetchWorkerForMethod } from '@/lib/services/pyodide/prefetch-worker'

// Variable Detection (extracted service — Hub/Step 2 공용)
import { extractDetectedVariables } from '@/lib/services/variable-detection-service'

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

  // NEW: Guided Flow state (Terminology 사전 주입)
  const flowReducer = useMemo(
    () => createFlowReducer(t.decisionTree, t.flowStateMachine),
    [t.decisionTree, t.flowStateMachine]
  )
  const [flowState, flowDispatch] = useReducer(flowReducer, initialFlowState)

  // Store에서 초기 입력 모드 가져오기 (useState보다 먼저 선언)
  const storePurposeInputMode = useModeStore(state => state.purposeInputMode)

  const [selectedPurpose, setSelectedPurpose] = useState<AnalysisPurpose | null>(null)
  // Note: Variable selection is handled in VariableSelectionStep
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  // NEW: 입력 모드 (AI 추천 vs 직접 선택) - store에서 초기값 가져옴
  const [inputMode, setInputMode] = useState<'ai' | 'browse'>(storePurposeInputMode)
  const [aiProgress, setAiProgress] = useState(0)
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)

  // NEW: Manual method selection (user override)
  const [manualSelectedMethod, setManualSelectedMethod] = useState<StatisticalMethod | null>(null)

  // NEW: 입력 모드 변경 핸들러
  const handleInputModeChange = useCallback((mode: 'ai' | 'browse') => {
    setInputMode(mode)
    if (mode === 'ai') {
      // AI 추천 모드로 전환 — chatMessages는 보존하여 L1 로그 유지
      flowDispatch(flowActions.resetNavigation())
    } else {
      // 직접 선택 모드로 전환 - browseAll()이 browse 단계로 설정
      flowDispatch(flowActions.browseAll())
    }
  }, [flowDispatch])

  // WCAG 2.3.3: prefers-reduced-motion
  const prefersReducedMotion = useReducedMotion()

  // Zustand store
  const assumptionResults = useAnalysisStore(state => state.assumptionResults)
  const setSelectedMethod = useAnalysisStore(state => state.setSelectedMethod)
  const setDetectedVariables = useAnalysisStore(state => state.setDetectedVariables)
  const setSuggestedSettings = useAnalysisStore(state => state.setSuggestedSettings)
  const userQuery = useModeStore(state => state.userQuery)
  const setUserQuery = useModeStore(state => state.setUserQuery)
  const setLastAiRecommendation = useModeStore(state => state.setLastAiRecommendation)

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

  // Purpose 카드 선택 시 DecisionTree 추천 (가정 검정 Step 4 이전 후 항상 assumptions 없이 실행)
  // AI Chat 경로(handleAiSubmit)는 llmRecommender를 직접 사용하며 이 함수를 거치지 않음
  const analyzeAndRecommend = useCallback((purpose: AnalysisPurpose): AIRecommendation | null => {
    if (!data || data.length === 0) {
      logger.error('[Recommendation] Data is empty or null')
      return null
    }

    if (!validationResults) {
      logger.error('[Recommendation] validationResults is null')
      return null
    }

    try {
      // Note: recommendWithoutAssumptions은 동기 함수이므로
      // setIsAnalyzing/setAiProgress는 렌더 전에 리셋되어 UI에 반영되지 않음 → 제거
      return DecisionTreeRecommender.recommendWithoutAssumptions(purpose, validationResults, data)
    } catch (error) {
      logger.error('[Recommendation] DecisionTree error', { error })
      return null
    }
  }, [data, validationResults])

  // Purpose selection handler
  const handlePurposeSelect = useCallback((purpose: AnalysisPurpose) => {
    setSelectedPurpose(purpose)
    setRecommendation(null)
    setManualSelectedMethod(null)

    logger.info('Analysis purpose selected', { purpose })

    const result = analyzeAndRecommend(purpose)

    if (result === null) {
      logger.error('AI recommendation failed', { purpose })
    } else {
      setRecommendation(result)
      if (result.method) {
        prefetchWorkerForMethod(result.method)
      }
    }
  }, [analyzeAndRecommend])

  // Manual method selection from MethodBrowser
  const handleManualMethodSelect = useCallback((method: StatisticalMethod) => {
    logger.info('Manual method selected', { methodId: method.id, methodName: method.name })
    setManualSelectedMethod(method)
    prefetchWorkerForMethod(method)
  }, [])

  // Confirm and proceed
  const handleConfirmMethod = useCallback(() => {
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
        onPurposeSubmit(
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

    // Entering browse from guided flow should still show an AI recommendation.
    const purpose = flowState.selectedPurpose
    if (purpose) {
      setSelectedPurpose(purpose)

      if (!recommendation && !isAnalyzing) {
        const result = analyzeAndRecommend(purpose)
        if (result) {
          setRecommendation(result)
        } else {
          logger.error('AI recommendation failed in browse mode', { purpose })
        }
      }
    }
  }, [flowState.selectedPurpose, analyzeAndRecommend, isAnalyzing, recommendation])

  const handleGuidedBack = useCallback(() => {
    flowDispatch(flowActions.goBack())
  }, [])

  const handleSelectAlternative = useCallback((method: StatisticalMethod) => {
    flowDispatch(flowActions.selectMethod(method))
  }, [])

  const handleGuidedConfirm = useCallback(() => {
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
        onPurposeSubmit(
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

  const handleAiSubmit = useCallback(async (inputOverride?: string) => {
    const userInput = (inputOverride ?? flowState.aiChatInput)?.trim()
    if (!userInput) return
    // 중복 제출 방지
    if (flowState.isAiLoading) return

    // dispatch 전 이전 대화 캡처 (클로저 기준)
    const prevChatMessages = flowState.chatMessages

    // 1) 사용자 메시지 즉시 추가
    const userMessage: FlowChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userInput,
    }
    flowDispatch(flowActions.addChatMessage(userMessage))
    flowDispatch(flowActions.startAiChat())
    flowDispatch(flowActions.setAiInput(''))

    try {
      const { recommendation, responseText, provider } =
        await llmRecommender.recommendFromNaturalLanguage(
          userInput,
          validationResults ?? null,
          assumptionResults ?? null,
          data ?? null,
          prevChatMessages
        )

      // 2) 어시스턴트 응답 추가
      const assistantMessage: FlowChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: responseText || '',
        provider,
        recommendation: recommendation ?? undefined,
      }
      flowDispatch(flowActions.addChatMessage(assistantMessage))
      flowDispatch(flowActions.setAiProvider(provider))

      if (responseText) {
        flowDispatch(flowActions.setAiResponse(responseText))
      }

      if (recommendation) {
        flowDispatch(flowActions.setAiRecommendation(recommendation))
        // AI 추천 맥락을 store에 저장 (saveToHistory에서 HistoryRecord에 포함)
        setLastAiRecommendation({
          userQuery: userInput,
          confidence: recommendation.confidence,
          reasoning: recommendation.reasoning,
          warnings: recommendation.warnings,
          alternatives: recommendation.alternatives?.map(a => ({
            id: a.id,
            name: a.name,
            description: a.description || ''
          })),
          provider,
          ambiguityNote: recommendation.ambiguityNote,
        })
      } else if (!responseText?.trim()) {
        // responseText가 있으면 스레드에 이미 표시됨 — 에러 카드 억제
        flowDispatch(flowActions.aiChatError(t.purposeInput.messages.aiRecommendError))
      }
    } catch (error) {
      logger.error('AI Chat error', { error })
      // 에러도 assistant 버블로 표시 (사용자 메시지만 남는 어색한 스레드 방지)
      flowDispatch(flowActions.addChatMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: t.purposeInput.messages.genericError,
        isError: true,
      }))
      flowDispatch(flowActions.aiChatError(t.purposeInput.messages.genericError))
    }
  }, [flowState.aiChatInput, flowState.chatMessages, flowState.isAiLoading, validationResults, assumptionResults, data, t, setLastAiRecommendation])

  const handleAiSelectMethod = useCallback((method: StatisticalMethod) => {
    if (isNavigating) return

    setIsNavigating(true)

    try {
      setSelectedMethod(method)
      const detectedVars = extractDetectedVariables(method.id, validationResults, flowState.aiRecommendation)
      setDetectedVariables(detectedVars)
      setSuggestedSettings(flowState.aiRecommendation?.suggestedSettings ?? null)

      if (onPurposeSubmit) {
        onPurposeSubmit(t.purposeInput.aiLabels.recommendTitle, method)
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

  // Fix 3-C: Store의 purposeInputMode 변경 시 동기화
  // 이전 값을 useRef로 추적하여 불필요한 실행 방지
  const prevStoreModeRef = React.useRef(storePurposeInputMode)
  useEffect(() => {
    // 실제로 store 값이 변경된 경우에만 동기화 (초기 렌더 제외)
    if (prevStoreModeRef.current === storePurposeInputMode) return
    prevStoreModeRef.current = storePurposeInputMode

    setInputMode(storePurposeInputMode)
    // flowState 동기화: reset() 대신 개별 액션 사용 (AI 상태 보존)
    if (storePurposeInputMode === 'browse') {
      flowDispatch(flowActions.browseAll())
    } else {
      // ai 모드: category/browse에서 ai-chat으로 돌아가기
      // reset()은 AI 상태를 초기화하므로 사용하지 않음
      flowDispatch(flowActions.goBack())
    }
  }, [storePurposeInputMode, flowDispatch])

  // 탐색 완료 → AI 추천 자동 트리거 + Hub userQuery pre-fill
  // Note: 가정 검정이 Step 4로 이전(c3c4cb9b)되어 Step 2 진입 시 assumptionResults는 항상 null.
  //       데이터 존재 여부(data + validationResults)로 대체.
  const hasAutoTriggeredRef = useRef(false)
  const [isAutoTriggered, setIsAutoTriggered] = useState(false)
  useEffect(() => {
    if (hasAutoTriggeredRef.current) return

    if (data && data.length > 0 && validationResults !== null && !flowState.aiRecommendation && !flowState.isAiLoading) {
      // Case A/B: 탐색 완료 → 완전 자동 LLM 호출 (사용자 입력 불필요)
      hasAutoTriggeredRef.current = true
      setIsAutoTriggered(true)
      const query = userQuery ?? '이 데이터에 적합한 통계 분석 방법을 추천해주세요.'
      if (userQuery) setUserQuery(null)
      handleAiSubmit(query)
    } else if (userQuery && !flowState.aiChatInput && !flowState.aiRecommendation) {
      // Case C: 탐색 없이 userQuery만 있음 → 입력창 pre-fill만
      flowDispatch(flowActions.setAiInput(userQuery))
      setUserQuery(null)
    }
  }, [data, validationResults, userQuery, flowState.aiRecommendation, flowState.isAiLoading, flowState.aiChatInput, flowDispatch, setUserQuery, handleAiSubmit])

  // 사용자가 "AI에게 다시 질문" 클릭 → 채팅 모드로 전환
  const handleOpenChat = useCallback(() => {
    setIsAutoTriggered(false)
  }, [])

  // Cleanup
  useEffect(() => {
    return () => {
      setIsNavigating(false)
    }
  }, [])

  // 선택된 방법 확인 바 (browse / purpose 모드 공용)
  const renderSelectedMethodBar = useCallback((options?: {
    showOnManual?: boolean
    confirmTestId?: string
  }) => {
    const { showOnManual = false, confirmTestId } = options ?? {}
    const condition = showOnManual
      ? (selectedPurpose || manualSelectedMethod)
      : selectedPurpose
    if (!finalSelectedMethod || !condition || isAnalyzing) return null
    return (
      <div data-testid="selected-method-bar" className="flex items-center gap-3 px-4 py-2 rounded-xl bg-primary/5 border border-primary/20">
        <div className="text-sm">
          <span className="text-muted-foreground">{t.purposeInput.labels.selectionPrefix}</span>
          <span data-testid="final-selected-method-name" className="ml-1 font-semibold tracking-tight">{finalSelectedMethod.name}</span>
          {manualSelectedMethod && (
            <Badge variant="outline" className="ml-2 text-[10px]">{t.purposeInput.labels.directBadge}</Badge>
          )}
        </div>
        <Button
          onClick={handleConfirmMethod}
          disabled={isNavigating}
          className="gap-2 shadow-sm"
          data-testid={confirmTestId}
        >
          {t.purposeInput.buttons.useThisMethod}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    )
  }, [finalSelectedMethod, selectedPurpose, manualSelectedMethod, isAnalyzing, isNavigating, handleConfirmMethod, t])

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <StepHeader icon={Target} title={t.analysis.stepTitles.purposeInput} />

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
        {/* 자동 추천 로딩 중 — 전용 로딩 뷰 */}
        {flowState.step === 'ai-chat' && isAutoTriggered && flowState.isAiLoading && (
          <motion.div
            key="auto-loading"
            initial={prefersReducedMotion ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16 space-y-4"
          >
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">{t.naturalLanguageInput.autoLoading.title}</p>
              <p className="text-xs text-muted-foreground">{t.naturalLanguageInput.autoLoading.subtitle}</p>
            </div>
          </motion.div>
        )}

        {/* AI 자동 추천 확인 카드 (데이터 있고 + 자동 트리거 + 추천 완료) */}
        {flowState.step === 'ai-chat' && isAutoTriggered && !flowState.isAiLoading && flowState.aiRecommendation && (
          <AutoRecommendationConfirm
            key="auto-confirm"
            recommendation={flowState.aiRecommendation}
            provider={flowState.aiProvider}
            assumptionResults={assumptionResults}
            disabled={isNavigating}
            onConfirm={handleAiSelectMethod}
            onSelectAlternative={handleAiSelectMethod}
            onOpenChat={handleOpenChat}
            onBrowseAll={handleBrowseAll}
          />
        )}

        {/* AI 자동 추천 실패 또는 수동 입력 — 채팅 UI */}
        {flowState.step === 'ai-chat' && !isAutoTriggered && (
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
            chatMessages={flowState.chatMessages}
            assumptionResults={assumptionResults}
          />
        )}

        {/* 자동 추천 에러 시에도 채팅으로 폴백 */}
        {flowState.step === 'ai-chat' && isAutoTriggered && !flowState.isAiLoading && !flowState.aiRecommendation && (
          <NaturalLanguageInput
            key="ai-chat-fallback"
            inputValue={flowState.aiChatInput || ''}
            responseText={flowState.aiResponseText}
            error={flowState.aiError}
            recommendation={null}
            isLoading={false}
            onInputChange={handleAiInputChange}
            onSubmit={handleAiSubmit}
            onSelectMethod={handleAiSelectMethod}
            onGoToGuided={handleGoToGuided}
            onBrowseAll={handleBrowseAll}
            disabled={isNavigating}
            validationResults={validationResults}
            provider={flowState.aiProvider}
            chatMessages={flowState.chatMessages}
            assumptionResults={assumptionResults}
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
          <PurposeBrowseSection
            key="browse"
            browseMethodGroups={browseMethodGroups}
            manualSelectedMethod={manualSelectedMethod}
            recommendedMethodId={recommendation?.method?.id}
            onMethodSelect={handleManualMethodSelect}
            onBack={handleGuidedBack}
            dataProfile={dataProfile}
            selectedMethodBar={renderSelectedMethodBar({ showOnManual: true, confirmTestId: 'confirm-method-btn' })}
            t={{ back: t.purposeInput.buttons.back, allMethods: t.purposeInput.buttons.allMethods }}
          />
        )}
      </AnimatePresence>

      {/* LEGACY: Purpose Selection - Only show when in 'purpose' step (for backward compatibility) */}
      {flowState.step === 'purpose' && (
        <PurposeLegacySection
          analysisPurposes={analysisPurposes}
          selectedPurpose={selectedPurpose}
          guidedSelectedPurpose={flowState.selectedPurpose}
          isAnalyzing={isAnalyzing}
          aiProgress={aiProgress}
          prefersReducedMotion={prefersReducedMotion}
          onPurposeSelect={(purpose) => {
            handleGuidedPurposeSelect(purpose)
            handlePurposeSelect(purpose)
          }}
          selectedMethodBar={renderSelectedMethodBar()}
          t={{
            purposeHeading: t.purposeInput.labels.purposeHeading,
            purposeHelp: t.purposeInput.messages.purposeHelp,
            analyzingTitle: t.analysis.statusMessages.analyzing,
            guidanceAlert: t.purposeInput.messages.guidanceAlert,
          }}
        />
      )}
    </div>
  )
}
