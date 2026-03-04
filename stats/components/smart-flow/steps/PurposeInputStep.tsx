'use client'

import React, { useState, useMemo, useCallback, useEffect, useReducer, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import { TrendingUp, GitCompare, PieChart, LineChart, Clock, Heart, ArrowRight, ArrowLeft, List, Layers, Calculator, Sparkles, Info, Target } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import { FilterToggle } from '@/components/ui/filter-toggle'
import { PurposeCard } from '@/components/common/analysis/PurposeCard'
import { AIAnalysisProgress } from '@/components/common/analysis/AIAnalysisProgress'
import type { PurposeInputStepProps } from '@/types/smart-flow-navigation'
import type { AnalysisPurpose, AIRecommendation, ColumnStatistics, StatisticalMethod, AutoAnswerResult, AnalysisCategory, SubcategoryDefinition, FlowChatMessage } from '@/types/smart-flow'
import { logger } from '@/lib/utils/logger'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { StepHeader } from '@/components/smart-flow/common'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { DecisionTreeRecommender } from '@/lib/services/decision-tree-recommender'
import { llmRecommender } from '@/lib/services/llm-recommender'
import { MethodBrowser } from './purpose/MethodBrowser'
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


/** 그룹 비교 메서드 카테고리 (independent → groupVariable 자동 전환 대상) */
const GROUP_COMPARISON_CATEGORIES = new Set(['t-test', 'anova', 'chi-square', 'nonparametric'])

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
  /** Event variable for survival analysis (1=event, 0=censored) */
  eventVariable?: string
  /** LLM이 제안했으나 데이터에 없어서 필터된 변수명 목록 */
  filteredOutVars?: string[]
} {
  const numericCols = validationResults?.columns
    ?.filter((col: ColumnStatistics) => col.type === 'numeric')
    ?.map((col: ColumnStatistics) => col.name) || []
  const categoricalCols = validationResults?.columns
    ?.filter((col: ColumnStatistics) => col.type === 'categorical')
    ?.map((col: ColumnStatistics) => col.name) || []
  // Fix 1-A: 모든 컬럼 이름 (mixed 포함) — OpenRouter 필터와 동일한 기준
  const allCols = new Set(
    validationResults?.columns?.map((col: ColumnStatistics) => col.name) || []
  )

  const detectedVars: {
    groupVariable?: string
    dependentCandidate?: string
    numericVars?: string[]
    factors?: string[]
    pairedVars?: [string, string]
    independentVars?: string[]
    covariates?: string[]
    eventVariable?: string
    filteredOutVars?: string[]
  } = {}

  // ─── 1순위: LLM variableAssignments ───
  const va = recommendation?.variableAssignments
  if (va) {
    // Fix 1-A: Set 기반 검증 (mixed 타입 컬럼도 포함, OpenRouter 필터와 동일 기준)
    const validCol = (name: string) => allCols.has(name)

    // Fix 1-B: 필터된 변수 추적
    const filteredOut: string[] = []
    const trackFiltered = (arr?: string[]) => {
      arr?.forEach(name => { if (!validCol(name)) filteredOut.push(name) })
    }
    trackFiltered(va.dependent)
    trackFiltered(va.independent)
    trackFiltered(va.factor)
    trackFiltered(va.covariate)
    trackFiltered(va.within)
    trackFiltered(va.between)
    trackFiltered(va.event)
    trackFiltered(va.time)

    // Event (survival analysis: 1=event, 0=censored)
    if (va.event?.[0] && validCol(va.event[0])) {
      detectedVars.eventVariable = va.event[0]
    }
    // Time (survival analysis: alias for dependent)
    if (va.time?.[0] && validCol(va.time[0])) {
      detectedVars.dependentCandidate = va.time[0]
    }

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
      // Fix 1-C: 그룹 비교 메서드일 때만 independent → groupVariable 전환
      // regression 등에서는 independent를 그대로 유지
      const methodInfo = recommendation?.method
      const isGroupComparison = methodInfo?.category
        ? GROUP_COMPARISON_CATEGORIES.has(methodInfo.category)
        : false
      if (isGroupComparison && !detectedVars.groupVariable && categoricalCols.includes(validIndep[0])) {
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

    // Fix 1-B: 필터된 변수 정보 저장 (UI에서 경고 표시 가능)
    if (filteredOut.length > 0) {
      detectedVars.filteredOutVars = filteredOut
      logger.warn('LLM variable hallucination detected', {
        filteredOut,
        totalSuggested: filteredOut.length + Object.values(detectedVars).filter(Boolean).length,
        methodId
      })
    }

    // 유효한 할당이 1건이라도 있으면 1순위 결과 반환
    // 전부 환각이면 2순위 폴백으로 폴스루
    const hasAnyValid = detectedVars.dependentCandidate || detectedVars.groupVariable
      || detectedVars.factors?.length || detectedVars.independentVars?.length
      || detectedVars.covariates?.length || detectedVars.pairedVars
      || detectedVars.eventVariable
    if (hasAnyValid) {
      detectedVars.numericVars = numericCols
      return detectedVars
    }
  }

  // ─── 2순위: 기존 detectedVariables (하위 호환) ───
  // Fix 1-D: 2순위에서도 실제 컬럼 존재 여부 검증
  const legacyGroup = recommendation?.detectedVariables?.groupVariable?.name
  if (legacyGroup && allCols.has(legacyGroup)) {
    detectedVars.groupVariable = legacyGroup
  } else if (categoricalCols.length > 0) {
    detectedVars.groupVariable = categoricalCols[0]
  }

  const legacyDependent = recommendation?.detectedVariables?.dependentVariables?.[0]
  if (legacyDependent && allCols.has(legacyDependent)) {
    detectedVars.dependentCandidate = legacyDependent
  } else if (numericCols.length > 0) {
    detectedVars.dependentCandidate = numericCols[0]
  }

  // ─── 3순위: 메서드별 데이터 기반 추론 ───
  if (methodId === 'kaplan-meier' || methodId === 'cox-regression') {
    // 생존분석: binary 컬럼(0/1) → event, 나머지 numeric → time(dependent)
    const allColumns = validationResults?.columns || []
    const binaryCol = allColumns.find(
      (col: ColumnStatistics) => col.type === 'numeric' && col.uniqueValues === 2
        && col.min === 0 && col.max === 1
    )
    if (binaryCol && !detectedVars.eventVariable) {
      detectedVars.eventVariable = binaryCol.name
    }
    // time: 첫 번째 non-binary numeric 컬럼
    if (!detectedVars.dependentCandidate) {
      const timeCol = numericCols.find(n => n !== binaryCol?.name)
      if (timeCol) detectedVars.dependentCandidate = timeCol
    }
    // group: 첫 번째 non-ID categorical 컬럼 (optional — ID성 컬럼 제외)
    if (!detectedVars.groupVariable && categoricalCols.length > 0) {
      const allColumns = validationResults?.columns || []
      const nonIdCategorical = categoricalCols.find(name => {
        const col = allColumns.find((c: ColumnStatistics) => c.name === name)
        return !col?.idDetection?.isId
      })
      if (nonIdCategorical) {
        detectedVars.groupVariable = nonIdCategorical
      }
    }
    detectedVars.numericVars = numericCols
  } else if (methodId === 'two-way-anova' || methodId === 'three-way-anova') {
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

  // NEW: Guided Flow state (Terminology 사전 주입)
  const flowReducer = useMemo(
    () => createFlowReducer(t.decisionTree, t.flowStateMachine),
    [t.decisionTree, t.flowStateMachine]
  )
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
  const assumptionResults = useSmartFlowStore(state => state.assumptionResults)
  const setSelectedMethod = useSmartFlowStore(state => state.setSelectedMethod)
  const setDetectedVariables = useSmartFlowStore(state => state.setDetectedVariables)
  const setSuggestedSettings = useSmartFlowStore(state => state.setSuggestedSettings)
  const userQuery = useSmartFlowStore(state => state.userQuery)
  const setUserQuery = useSmartFlowStore(state => state.setUserQuery)
  const setLastAiRecommendation = useSmartFlowStore(state => state.setLastAiRecommendation)

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
      setIsAnalyzing(true)
      setAiProgress(100)
      return DecisionTreeRecommender.recommendWithoutAssumptions(purpose, validationResults, data)
    } catch (error) {
      logger.error('[Recommendation] DecisionTree error', { error })
      return null
    } finally {
      setIsAnalyzing(false)
      setAiProgress(0)
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
    }
  }, [analyzeAndRecommend])

  // Manual method selection from MethodBrowser
  const handleManualMethodSelect = useCallback((method: StatisticalMethod) => {
    logger.info('Manual method selected', { methodId: method.id, methodName: method.name })
    setManualSelectedMethod(method)
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
  const hasAutoTriggered = useRef(false)
  useEffect(() => {
    if (hasAutoTriggered.current) return

    if (data && data.length > 0 && validationResults !== null && !flowState.aiRecommendation && !flowState.isAiLoading) {
      // Case A/B: 탐색 완료 → 완전 자동 LLM 호출 (사용자 입력 불필요)
      hasAutoTriggered.current = true
      const query = userQuery ?? '이 데이터에 적합한 통계 분석 방법을 추천해주세요.'
      if (userQuery) setUserQuery(null)
      handleAiSubmit(query)
    } else if (userQuery && !flowState.aiChatInput && !flowState.aiRecommendation) {
      // Case C: 탐색 없이 userQuery만 있음 → 입력창 pre-fill만
      flowDispatch(flowActions.setAiInput(userQuery))
      setUserQuery(null)
    }
  }, [data, validationResults, userQuery, flowState.aiRecommendation, flowState.isAiLoading, flowState.aiChatInput, flowDispatch, setUserQuery, handleAiSubmit])

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
          <div key="browse">
            {/* Header with back button */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGuidedBack}
                  className="gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t.purposeInput.buttons.back}
                </Button>
                <div className="h-4 w-px bg-border/60" />
                <h3 className="text-base font-semibold tracking-tight">
                  {t.purposeInput.buttons.allMethods}
                </h3>
              </div>
              {/* Action Button - browse 모드에서는 수동 선택만으로 진행 가능 */}
              {renderSelectedMethodBar({ showOnManual: true, confirmTestId: 'confirm-method-btn' })}
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
        <h3 className="text-base font-semibold tracking-tight" id="purpose-selection-label">
          {t.purposeInput.labels.purposeHeading}
        </h3>
        {/* Action Button - purpose step에서 상단에 표시 */}
        {renderSelectedMethodBar()}
      </div>

      {/* Purpose Selection */}
      <div>
        <div
          role="radiogroup"
          aria-labelledby="purpose-selection-label"
          aria-describedby="purpose-selection-help"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
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
