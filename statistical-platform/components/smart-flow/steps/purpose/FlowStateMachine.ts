/**
 * Guided Flow 상태 머신
 * useReducer와 함께 사용
 *
 * 2025 UI/UX 현대화 + AI Chat:
 * - ai-chat → (옵션) questions → result
 * - 또는 category → subcategory → questions → result (기존 가이드)
 */

import type {
  GuidedFlowState,
  GuidedFlowAction,
  StatisticalMethod,
  AnalysisCategory,
  AIRecommendation
} from '@/types/smart-flow'
import { decide } from './DecisionTree'

/**
 * 초기 상태 (ai-chat부터 시작 - NEW!)
 */
export const initialFlowState: GuidedFlowState = {
  step: 'ai-chat',
  selectedCategory: null,
  selectedSubcategory: null,
  selectedPurpose: null,
  answers: {},
  autoAnswers: {},
  result: null,
  previousStep: null,
  // AI Chat 관련 (NEW)
  aiChatInput: null,
  aiRecommendation: null,
  aiResponseText: null,
  aiError: null,
  isAiLoading: false
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
    // AI Chat 관련 액션 (NEW)
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

    case 'GO_TO_GUIDED':
      // AI Chat에서 단계별 가이드로 이동
      return {
        ...state,
        step: 'category',
        previousStep: 'ai-chat',
        // AI 상태는 유지 (돌아올 수 있도록)
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
        previousStep: 'category'
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
        previousStep: 'subcategory'
      }

    case 'SELECT_PURPOSE':
      return {
        ...state,
        step: 'questions',
        selectedPurpose: action.purpose,
        answers: {},
        autoAnswers: {},
        result: null,
        previousStep: state.step
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

    case 'COMPLETE_QUESTIONS':
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
        previousStep: 'questions'
      }

    case 'BROWSE_ALL':
      return {
        ...state,
        step: 'browse',
        previousStep: state.step
      }

    case 'GO_BACK':
      if (!state.previousStep) {
        // ai-chat이 첫 화면이므로 previousStep 없으면 ai-chat으로
        return {
          ...initialFlowState
        }
      }

      // ai-chat으로 돌아갈 때
      if (state.previousStep === 'ai-chat') {
        return {
          ...state,
          step: 'ai-chat',
          selectedCategory: null,
          selectedSubcategory: null,
          selectedPurpose: null,
          answers: {},
          autoAnswers: {},
          result: null,
          previousStep: null
          // AI 상태는 유지
        }
      }

      // category로 돌아갈 때
      if (state.previousStep === 'category') {
        return {
          ...state,
          step: 'category',
          selectedCategory: null,
          selectedSubcategory: null,
          selectedPurpose: null,
          answers: {},
          autoAnswers: {},
          result: null,
          previousStep: 'ai-chat'
        }
      }

      // subcategory로 돌아갈 때
      if (state.previousStep === 'subcategory') {
        return {
          ...state,
          step: 'subcategory',
          selectedSubcategory: null,
          selectedPurpose: null,
          answers: {},
          autoAnswers: {},
          result: null,
          previousStep: 'category'
        }
      }

      // questions로 돌아갈 때
      if (state.previousStep === 'questions') {
        return {
          ...state,
          step: 'questions',
          result: null,
          previousStep: 'subcategory'
        }
      }

      // purpose로 돌아갈 때 (legacy)
      if (state.previousStep === 'purpose') {
        return {
          ...state,
          step: 'purpose',
          selectedPurpose: null,
          answers: {},
          autoAnswers: {},
          result: null,
          previousStep: 'category'
        }
      }

      return {
        ...state,
        step: state.previousStep,
        previousStep: null
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
        previousStep: state.step
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
  // AI Chat 액션 (NEW)
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
