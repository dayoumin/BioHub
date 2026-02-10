/**
 * Guided Flow 상태 머신
 * useReducer와 함께 사용
 *
 * 2025 UI/UX 현대화 + AI Chat:
 * - ai-chat → (옵션) questions → result
 * - 또는 category → subcategory → questions → result (기존 가이드)
 *
 * Fix 3-A: previousStep 단일값 → stepHistory 스택으로 변경
 * Fix 3-B: AI 상태 유지/초기화 일관성 보장
 */

import type {
  GuidedFlowState,
  GuidedFlowAction,
  GuidedFlowStep,
  StatisticalMethod,
  AnalysisCategory,
  AIRecommendation
} from '@/types/smart-flow'
import { decide } from './DecisionTree'

/** AI 관련 상태만 추출 (유지/초기화 시 일관된 처리를 위해) */
interface AiState {
  aiChatInput: string | null
  aiRecommendation: AIRecommendation | null
  aiResponseText: string | null
  aiError: string | null
  isAiLoading: boolean
  aiProvider: 'openrouter' | 'ollama' | 'keyword' | null
}

/** 현재 상태에서 AI 관련 필드만 추출 */
function preserveAiState(state: GuidedFlowState): AiState {
  return {
    aiChatInput: state.aiChatInput,
    aiRecommendation: state.aiRecommendation,
    aiResponseText: state.aiResponseText,
    aiError: state.aiError,
    isAiLoading: state.isAiLoading,
    aiProvider: state.aiProvider,
  }
}

const INITIAL_AI_STATE: AiState = {
  aiChatInput: null,
  aiRecommendation: null,
  aiResponseText: null,
  aiError: null,
  isAiLoading: false,
  aiProvider: null,
}

/** Fix 3-A: 히스토리 스택에 현재 step을 push */
function pushHistory(state: GuidedFlowState): GuidedFlowStep[] {
  return [...state.stepHistory, state.step]
}

/**
 * 초기 상태 (ai-chat부터 시작)
 */
export const initialFlowState: GuidedFlowState = {
  step: 'ai-chat',
  selectedCategory: null,
  selectedSubcategory: null,
  selectedPurpose: null,
  answers: {},
  autoAnswers: {},
  result: null,
  stepHistory: [],
  ...INITIAL_AI_STATE,
}

/**
 * 상태 리듀서
 */
export function flowReducer(
  state: GuidedFlowState,
  action: GuidedFlowAction
): GuidedFlowState {
  switch (action.type) {
    // ============================================
    // AI Chat 관련 액션
    // ============================================
    case 'SET_AI_INPUT':
      return {
        ...state,
        aiChatInput: action.input
      }

    case 'START_AI_CHAT':
      return {
        ...state,
        isAiLoading: true,
        aiResponseText: null,
        aiRecommendation: null,
        aiError: null
      }

    case 'SET_AI_RESPONSE':
      return {
        ...state,
        aiResponseText: action.text
      }

    case 'SET_AI_RECOMMENDATION':
      return {
        ...state,
        isAiLoading: false,
        aiRecommendation: action.recommendation,
        // AI 추천 결과를 DecisionResult 형태로도 저장
        result: {
          method: action.recommendation.method,
          reasoning: action.recommendation.reasoning.map((r, i) => ({
            step: `근거 ${i + 1}`,
            description: r
          })),
          alternatives: action.recommendation.alternatives?.map(alt => ({
            method: {
              id: alt.id,
              name: alt.name,
              description: alt.description || '',
              category: alt.category || 'advanced'
            },
            reason: alt.description || ''
          })) || []
        }
      }

    case 'AI_CHAT_ERROR':
      return {
        ...state,
        isAiLoading: false,
        aiError: action.error
      }

    case 'SET_AI_PROVIDER':
      return {
        ...state,
        aiProvider: action.provider
      }

    case 'GO_TO_GUIDED':
      // AI Chat에서 단계별 가이드로 이동 — AI 상태 유지
      return {
        ...state,
        step: 'category',
        stepHistory: pushHistory(state),
      }

    // ============================================
    // 기존 액션들
    // ============================================
    case 'SELECT_CATEGORY':
      return {
        ...state,
        step: 'subcategory',
        selectedCategory: action.category,
        selectedSubcategory: null,
        selectedPurpose: null,
        answers: {},
        autoAnswers: {},
        result: null,
        stepHistory: pushHistory(state),
      }

    case 'SELECT_SUBCATEGORY':
      return {
        ...state,
        step: 'questions',
        selectedSubcategory: action.subcategoryId,
        selectedPurpose: action.mapsToPurpose,
        answers: action.presetAnswers || {},
        autoAnswers: {},
        result: null,
        stepHistory: pushHistory(state),
      }

    case 'SELECT_PURPOSE':
      return {
        ...state,
        step: 'questions',
        selectedPurpose: action.purpose,
        answers: {},
        autoAnswers: {},
        result: null,
        stepHistory: pushHistory(state),
      }

    case 'ANSWER_QUESTION':
      return {
        ...state,
        answers: {
          ...state.answers,
          [action.questionId]: action.value
        }
      }

    case 'SET_AUTO_ANSWER':
      return {
        ...state,
        autoAnswers: {
          ...state.autoAnswers,
          [action.questionId]: action.result
        },
        answers: action.result.confidence === 'high' && !action.result.requiresConfirmation
          ? { ...state.answers, [action.questionId]: action.result.value }
          : state.answers
      }

    case 'COMPLETE_QUESTIONS': {
      if (!state.selectedPurpose) {
        return state
      }

      const result = decide({
        purpose: state.selectedPurpose,
        answers: state.answers
      })

      return {
        ...state,
        step: 'result',
        result,
        stepHistory: pushHistory(state),
      }
    }

    case 'BROWSE_ALL':
      return {
        ...state,
        step: 'browse',
        stepHistory: pushHistory(state),
      }

    // Fix 3-A: GO_BACK은 스택에서 pop — 하드코딩 제거
    case 'GO_BACK': {
      if (state.stepHistory.length === 0) {
        // 히스토리 없으면 초기 상태로 (AI 상태 유지)
        return {
          ...initialFlowState,
          ...preserveAiState(state),
        }
      }

      const history = [...state.stepHistory]
      const prevStep = history.pop()!

      // Fix 3-B: AI 상태는 항상 유지 (ai-chat으로 돌아가든 아니든)
      // 선택 데이터만 현재 step에 맞게 정리
      const cleanState = cleanSelectionForStep(state, prevStep)

      return {
        ...state,
        ...cleanState,
        step: prevStep,
        stepHistory: history,
      }
    }

    case 'SELECT_METHOD':
      return {
        ...state,
        step: 'result',
        result: {
          method: action.method,
          reasoning: [
            { step: '직접 선택', description: '사용자가 직접 분석 방법을 선택했습니다' }
          ],
          alternatives: []
        },
        stepHistory: pushHistory(state),
      }

    case 'CONFIRM':
      return state

    case 'RESET':
      return initialFlowState

    default:
      return state
  }
}

/**
 * 뒤로 갈 때 목적지 step에 맞게 선택 데이터 정리
 * AI 상태는 건드리지 않음 (Fix 3-B)
 */
function cleanSelectionForStep(
  state: GuidedFlowState,
  targetStep: GuidedFlowStep
): Partial<GuidedFlowState> {
  switch (targetStep) {
    case 'ai-chat':
      return {
        selectedCategory: null,
        selectedSubcategory: null,
        selectedPurpose: null,
        answers: {},
        autoAnswers: {},
        result: null,
      }
    case 'category':
      return {
        selectedCategory: null,
        selectedSubcategory: null,
        selectedPurpose: null,
        answers: {},
        autoAnswers: {},
        result: null,
      }
    case 'subcategory':
      return {
        selectedSubcategory: null,
        selectedPurpose: null,
        answers: {},
        autoAnswers: {},
        result: null,
      }
    case 'questions':
      return {
        result: null,
      }
    case 'purpose':
      return {
        selectedPurpose: null,
        answers: {},
        autoAnswers: {},
        result: null,
      }
    default:
      return {}
  }
}

/**
 * 모든 필수 질문에 응답했는지 확인
 */
export function areAllQuestionsAnswered(
  state: GuidedFlowState,
  requiredQuestionIds: string[]
): boolean {
  return requiredQuestionIds.every(id => id in state.answers)
}

/**
 * 현재 단계에서 다음으로 갈 수 있는지 확인
 */
export function canProceed(
  state: GuidedFlowState,
  requiredQuestionIds: string[]
): boolean {
  switch (state.step) {
    case 'ai-chat':
      return state.aiRecommendation !== null
    case 'category':
      return state.selectedCategory !== null
    case 'subcategory':
      return state.selectedSubcategory !== null
    case 'purpose':
      return state.selectedPurpose !== null
    case 'questions':
      return areAllQuestionsAnswered(state, requiredQuestionIds)
    case 'result':
      return state.result !== null
    case 'browse':
      return false
    default:
      return false
  }
}

/**
 * 액션 생성자들
 */
export const flowActions = {
  // ============================================
  // AI Chat 액션
  // ============================================
  setAiInput: (input: string): GuidedFlowAction => ({
    type: 'SET_AI_INPUT',
    input
  }),

  startAiChat: (): GuidedFlowAction => ({
    type: 'START_AI_CHAT'
  }),

  setAiResponse: (text: string): GuidedFlowAction => ({
    type: 'SET_AI_RESPONSE',
    text
  }),

  setAiRecommendation: (recommendation: AIRecommendation): GuidedFlowAction => ({
    type: 'SET_AI_RECOMMENDATION',
    recommendation
  }),

  aiChatError: (error: string): GuidedFlowAction => ({
    type: 'AI_CHAT_ERROR',
    error
  }),

  goToGuided: (): GuidedFlowAction => ({
    type: 'GO_TO_GUIDED'
  }),

  setAiProvider: (provider: 'openrouter' | 'ollama' | 'keyword'): GuidedFlowAction => ({
    type: 'SET_AI_PROVIDER',
    provider
  }),

  // ============================================
  // 기존 액션들
  // ============================================
  selectCategory: (category: AnalysisCategory): GuidedFlowAction => ({
    type: 'SELECT_CATEGORY',
    category
  }),

  selectSubcategory: (
    subcategoryId: string,
    mapsToPurpose: GuidedFlowState['selectedPurpose'],
    presetAnswers?: Record<string, string>
  ): GuidedFlowAction => ({
    type: 'SELECT_SUBCATEGORY',
    subcategoryId,
    mapsToPurpose: mapsToPurpose!,
    presetAnswers
  }),

  selectPurpose: (purpose: GuidedFlowState['selectedPurpose']): GuidedFlowAction => ({
    type: 'SELECT_PURPOSE',
    purpose: purpose!
  }),

  answerQuestion: (questionId: string, value: string): GuidedFlowAction => ({
    type: 'ANSWER_QUESTION',
    questionId,
    value
  }),

  setAutoAnswer: (questionId: string, result: GuidedFlowState['autoAnswers'][string]): GuidedFlowAction => ({
    type: 'SET_AUTO_ANSWER',
    questionId,
    result
  }),

  completeQuestions: (): GuidedFlowAction => ({
    type: 'COMPLETE_QUESTIONS'
  }),

  browseAll: (): GuidedFlowAction => ({
    type: 'BROWSE_ALL'
  }),

  goBack: (): GuidedFlowAction => ({
    type: 'GO_BACK'
  }),

  selectMethod: (method: StatisticalMethod): GuidedFlowAction => ({
    type: 'SELECT_METHOD',
    method
  }),

  confirm: (): GuidedFlowAction => ({
    type: 'CONFIRM'
  }),

  reset: (): GuidedFlowAction => ({
    type: 'RESET'
  })
}
