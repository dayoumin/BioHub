/**
 * Guided Flow 상태 머신
 * useReducer와 함께 사용
 */

import type {
  GuidedFlowState,
  GuidedFlowAction,
  StatisticalMethod
} from '@/types/smart-flow'
import { decide } from './DecisionTree'

/**
 * 초기 상태
 */
export const initialFlowState: GuidedFlowState = {
  step: 'purpose',
  selectedPurpose: null,
  answers: {},
  autoAnswers: {},
  result: null,
  previousStep: null
}

/**
 * 상태 리듀서
 */
export function flowReducer(
  state: GuidedFlowState,
  action: GuidedFlowAction
): GuidedFlowState {
  switch (action.type) {
    case 'SELECT_PURPOSE':
      return {
        ...state,
        step: 'questions',
        selectedPurpose: action.purpose,
        answers: {},
        autoAnswers: {},
        result: null,
        previousStep: 'purpose'
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
        // high confidence면 자동으로 answers에도 설정
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
        return state
      }

      // questions로 돌아갈 때는 answers 유지
      if (state.previousStep === 'questions') {
        return {
          ...state,
          step: 'questions',
          result: null,
          previousStep: 'purpose'
        }
      }

      // purpose로 돌아갈 때는 모든 상태 초기화
      if (state.previousStep === 'purpose') {
        return {
          ...state,
          step: 'purpose',
          selectedPurpose: null,
          answers: {},
          autoAnswers: {},
          result: null,
          previousStep: null
        }
      }

      return {
        ...state,
        step: state.previousStep,
        previousStep: null
      }

    case 'SELECT_METHOD':
      // browse에서 직접 선택
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
        previousStep: 'browse'
      }

    case 'CONFIRM':
      // 최종 확정 - 외부에서 처리
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
    case 'purpose':
      return state.selectedPurpose !== null
    case 'questions':
      return areAllQuestionsAnswered(state, requiredQuestionIds)
    case 'result':
      return state.result !== null
    case 'browse':
      return false // browse에서는 select로만 진행
    default:
      return false
  }
}

/**
 * 액션 생성자들
 */
export const flowActions = {
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
