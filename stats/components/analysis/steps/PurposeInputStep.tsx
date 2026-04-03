'use client'

import React, { useState, useMemo, useCallback, useEffect, useReducer, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { TrendingUp, GitCompare, PieChart, LineChart, Clock, Heart, ArrowRight, List, Layers, Calculator, Target, Loader2, Database, Hash, Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

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
 * userQuery를 AnalysisPurpose로 분류 (키워드 기반).
 * PURPOSE_CATEGORIES.keywords를 재활용하고, ID 불일치만 매핑.
 * 매칭 실패 시 null → AI 채팅 fallback.
 */
import { PURPOSE_CATEGORIES } from '@/lib/constants/purpose-categories'

/** PURPOSE_CATEGORIES.id → AnalysisPurpose 매핑 (불일치하는 것만) */
const CATEGORY_TO_PURPOSE: Record<string, AnalysisPurpose> = {
  descriptive: 'distribution',
  tools: 'utility',
}

const VALID_PURPOSES = new Set<string>([
  'compare', 'relationship', 'distribution', 'prediction',
  'timeseries', 'survival', 'multivariate', 'utility',
])

const PURPOSE_KEYWORD_ENTRIES = PURPOSE_CATEGORIES
  .filter(cat => !cat.disabled && cat.methodIds.length > 0)
  .map(cat => ({
    keywords: cat.keywords.map(kw => kw.toLowerCase()),
    purpose: CATEGORY_TO_PURPOSE[cat.id] ?? cat.id,
  }))
  .filter((entry): entry is { keywords: string[]; purpose: AnalysisPurpose } =>
    VALID_PURPOSES.has(entry.purpose)
  )

function classifyPurpose(query: string): AnalysisPurpose | null {
  const lower = query.toLowerCase()
  let bestPurpose: AnalysisPurpose | null = null
  let bestScore = 0
  for (const { keywords, purpose } of PURPOSE_KEYWORD_ENTRIES) {
    const score = keywords.filter(kw => lower.includes(kw)).length
    if (score > bestScore) {
      bestScore = score
      bestPurpose = purpose
    }
  }
  return bestScore > 0 ? bestPurpose : null
}

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

  const [selectedPurpose, setSelectedPurpose] = useState<AnalysisPurpose | null>(null)
  // Note: Variable selection is handled in VariableSelectionStep
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiProgress, setAiProgress] = useState(0)
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)

  // NEW: Manual method selection (user override)
  const [manualSelectedMethod, setManualSelectedMethod] = useState<StatisticalMethod | null>(null)

  // WCAG 2.3.3: prefers-reduced-motion
  const prefersReducedMotion = useReducedMotion()

  // Zustand store
  const setAssumptionResults = useAnalysisStore(state => state.setAssumptionResults)
  const setSelectedMethod = useAnalysisStore(state => state.setSelectedMethod)
  const cachedAiRecommendation = useAnalysisStore(state => state.cachedAiRecommendation)
  const setCachedAiRecommendation = useAnalysisStore(state => state.setCachedAiRecommendation)
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

    // 이전 질문의 가정 검정 결과 초기화 (새 추천에 오염 방지)
    setAssumptionResults(null)

    try {
      const { recommendation, responseText, provider } =
        await llmRecommender.recommendFromNaturalLanguage(
          userInput,
          validationResults ?? null,
          null, // 이전 assumptionResults 사용 안 함 — 새 추천 후 재계산
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
        let finalRecommendation = recommendation

        // 3) 가정 검정 실행 (variableAssignments 기반, 불변 패턴)
        if (recommendation.variableAssignments && data && data.length > 0 && validationResults) {
          try {
            const { runAssumptionTests } = await import('@/lib/services/assumption-testing-service')
            const testResults = await runAssumptionTests(
              recommendation.variableAssignments,
              data,
              validationResults
            )
            if (testResults) {
              setAssumptionResults(testResults)

              // 가정 검정 결과를 assumptions에 병합 (불변)
              const mergedAssumptions = [...(recommendation.assumptions || [])]
              if (testResults.normality?.shapiroWilk) {
                const idx = mergedAssumptions.findIndex(a => a.name.includes('정규'))
                const entry = {
                  name: '정규성 (Shapiro-Wilk)',
                  passed: testResults.normality.shapiroWilk.isNormal,
                  pValue: testResults.normality.shapiroWilk.pValue,
                }
                if (idx >= 0) mergedAssumptions[idx] = entry
                else mergedAssumptions.push(entry)
              }
              if (testResults.homogeneity?.levene) {
                const idx = mergedAssumptions.findIndex(a => a.name.includes('등분산'))
                const entry = {
                  name: '등분산성 (Levene)',
                  passed: testResults.homogeneity.levene.equalVariance,
                  pValue: testResults.homogeneity.levene.pValue,
                }
                if (idx >= 0) mergedAssumptions[idx] = entry
                else mergedAssumptions.push(entry)
              }

              // 가정 미충족 시 경고 추가 (불변)
              const normFailed = testResults.normality?.shapiroWilk && !testResults.normality.shapiroWilk.isNormal
              const homFailed = testResults.homogeneity?.levene && !testResults.homogeneity.levene.equalVariance
              const mergedWarnings = [...(recommendation.warnings || [])]
              if (normFailed) mergedWarnings.push('정규성 가정이 충족되지 않습니다. 비모수 검정을 고려해주세요.')
              if (homFailed) mergedWarnings.push('등분산성 가정이 충족되지 않습니다. Welch 보정 또는 비모수 검정을 고려해주세요.')

              finalRecommendation = {
                ...recommendation,
                assumptions: mergedAssumptions,
                warnings: mergedWarnings.length > 0 ? mergedWarnings : recommendation.warnings,
              }
            }
          } catch (err) {
            logger.warn('Assumption tests failed, proceeding without', { error: err })
          }
        }

        flowDispatch(flowActions.setAiRecommendation(finalRecommendation))
        setCachedAiRecommendation(finalRecommendation)
        // AI 추천 맥락을 store에 저장 (saveToHistory에서 HistoryRecord에 포함)
        setLastAiRecommendation({
          userQuery: userInput,
          confidence: finalRecommendation.confidence,
          reasoning: finalRecommendation.reasoning,
          warnings: finalRecommendation.warnings,
          alternatives: finalRecommendation.alternatives?.map(a => ({
            id: a.id,
            name: a.name,
            description: a.description || ''
          })),
          provider,
          ambiguityNote: finalRecommendation.ambiguityNote,
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
  }, [flowState.aiChatInput, flowState.chatMessages, flowState.isAiLoading, validationResults, data, t, setLastAiRecommendation, setAssumptionResults, setCachedAiRecommendation])

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

  const handleGoToAiChat = useCallback(() => {
    flowDispatch(flowActions.goToAiChat())
  }, [])

  // Step 2 진입 시 상태별 분기:
  // - Path E (뒤로가기): 캐시된 추천 → AI 확인 카드로 직행
  // - Path D (Hub 채팅 + 데이터): userQuery → 목적 분류 시도 → Guided 또는 AI fallback
  // - Path C (데이터 없이 채팅): AI 채팅 입력창 pre-fill
  // - Path A (데이터만): 기본 화면 (CategorySelector)
  const hasAutoTriggeredRef = useRef(false)
  const [isAutoTriggered, setIsAutoTriggered] = useState(false)
  useEffect(() => {
    if (hasAutoTriggeredRef.current) return

    // Path E: 캐시된 추천이 있으면 AI 확인 카드로 직행
    if (cachedAiRecommendation && data && data.length > 0 && !flowState.aiRecommendation) {
      hasAutoTriggeredRef.current = true
      setIsAutoTriggered(true)
      flowDispatch(flowActions.goToAiChat())
      flowDispatch(flowActions.setAiRecommendation(cachedAiRecommendation))
      if (userQuery) setUserQuery(null)
      return
    }

    // Path D: userQuery가 있고 데이터도 있으면 → 목적 분류 시도
    if (userQuery && data && data.length > 0 && validationResults !== null && !flowState.aiRecommendation && !flowState.isAiLoading) {
      hasAutoTriggeredRef.current = true
      const query = userQuery
      setUserQuery(null)

      const purpose = classifyPurpose(query)
      const matchedCategory = purpose
        ? t.progressiveCategoryData.find(cat =>
            cat.subcategories.some(sub => sub.mapsToPurpose === purpose)
          )
        : null

      if (matchedCategory) {
        flowDispatch(flowActions.selectCategory(matchedCategory.id))
      } else {
        setIsAutoTriggered(true)
        flowDispatch(flowActions.goToAiChat())
        handleAiSubmit(query)
      }
      return
    }

    // Path C: 데이터 없이 userQuery만 → AI 채팅 입력창 pre-fill
    if (userQuery && !flowState.aiChatInput && !flowState.aiRecommendation) {
      flowDispatch(flowActions.goToAiChat())
      flowDispatch(flowActions.setAiInput(userQuery))
      setUserQuery(null)
    }

    // Path A: 데이터만 있고 userQuery 없음 → 기본 화면 (CategorySelector)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- t.progressiveCategoryData는 도메인 전환 시에만 변경되는 정적 데이터
  }, [data, validationResults, userQuery, flowState.aiRecommendation, flowState.isAiLoading, flowState.aiChatInput, flowDispatch, setUserQuery, handleAiSubmit, cachedAiRecommendation])

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
      <div data-testid="selected-method-bar" className="flex items-center gap-3 px-5 py-3 rounded-lg bg-surface-container-lowest shadow-[0_2px_8px_rgba(25,28,30,0.04)]">
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
          className="gap-2"
          data-testid={confirmTestId}
        >
          {t.purposeInput.buttons.useThisMethod}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    )
  }, [finalSelectedMethod, selectedPurpose, manualSelectedMethod, isAnalyzing, isNavigating, handleConfirmMethod, t])

  // 데이터 요약 배지 — category / ai-chat 뷰에서만 StepHeader에 표시
  const dataSummaryBadge = (flowState.step === 'category' || flowState.step === 'ai-chat') && dataProfile ? (
    <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container">
        <Database className="w-3 h-3" />
        {t.naturalLanguageInput.dataSummary.dimension(dataProfile.totalRows, dataProfile.numericVars + dataProfile.categoricalVars)}
      </span>
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container">
        <Hash className="w-3 h-3" />
        {t.naturalLanguageInput.dataSummary.numeric(dataProfile.numericVars)}
      </span>
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container">
        <Tag className="w-3 h-3" />
        {t.naturalLanguageInput.dataSummary.categorical(dataProfile.categoricalVars)}
      </span>
    </div>
  ) : undefined

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <StepHeader icon={Target} title={t.analysis.stepTitles.purposeInput} action={dataSummaryBadge} />

      <AnimatePresence mode="wait">
        {/* 자동 추천 로딩 중 — 전용 로딩 뷰 */}
        {flowState.step === 'ai-chat' && isAutoTriggered && flowState.isAiLoading && (
          <motion.div
            key="auto-loading"
            initial={prefersReducedMotion ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 space-y-6"
          >
            <div className="w-14 h-14 rounded-lg bg-surface-container flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
            <div className="text-center space-y-1.5">
              <p className="text-sm font-medium text-foreground">{t.naturalLanguageInput.autoLoading.title}</p>
              <p className="text-xs text-muted-foreground">{t.naturalLanguageInput.autoLoading.subtitle}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAutoTriggered(false)
                handleBrowseAll()
              }}
              className="text-xs text-muted-foreground hover:text-foreground hover:bg-surface-container gap-1.5"
            >
              <List className="w-3.5 h-3.5" />
              {t.purposeInput.inputModes.directSelect}
            </Button>
          </motion.div>
        )}

        {/* AI 자동 추천 확인 카드 (데이터 있고 + 자동 트리거 + 추천 완료) */}
        {flowState.step === 'ai-chat' && isAutoTriggered && !flowState.isAiLoading && flowState.aiRecommendation && (
          <AutoRecommendationConfirm
            key="auto-confirm"
            recommendation={flowState.aiRecommendation}
            provider={flowState.aiProvider}
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
            provider={flowState.aiProvider}
            chatMessages={flowState.chatMessages}
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
            provider={flowState.aiProvider}
            chatMessages={flowState.chatMessages}
          />
        )}

        {/* Category Selection (기본 화면) */}
        {flowState.step === 'category' && (
          <CategorySelector
            key="category"
            onSelect={handleCategorySelect}
            onBrowseAll={handleBrowseAll}
            onAiChat={handleGoToAiChat}
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
