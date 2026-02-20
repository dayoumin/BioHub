/**
 * RAG 시스템 에러 처리 표준화
 *
 * 일관된 에러 처리를 위해 다양한 에러 타입을 분류하고
 * 사용자 친화적 메시지를 생성
 *
 * 핵심 원칙:
 * - 절대 throw하지 않음 (항상 결과 반환)
 * - 원본 에러 보존 (디버깅용)
 * - 사용자 친화적 메시지
 */

export interface RAGErrorResult {
  /** 사용자 표시 메시지 */
  message: string
  /** 네트워크 에러 여부 */
  isNetworkError: boolean
  /** 재시도 권장 여부 */
  shouldRetry: boolean
  /** 원본 에러 (개발자 디버깅용) */
  originalError: unknown
  /** 에러 타입 분류 */
  errorType:
    | 'network'
    | 'model_not_found'
    | 'timeout'
    | 'permission'
    | 'validation'
    | 'unknown'
}

/**
 * RAG 에러 처리 핵심 함수
 *
 * 모든 RAG 관련 에러를 이 함수로 처리하면 일관된 에러 핸들링 가능
 *
 * @param error - 발생한 에러
 * @param context - 에러 발생 지점 (예: 'queryRAG', 'loadSession')
 * @returns RAGErrorResult - 일관된 형식의 에러 정보
 *
 * @example
 * try {
 *   const response = await queryRAG(...)
 * } catch (err) {
 *   const errorResult = handleRAGError(err, 'queryRAG')
 *   setError(errorResult.message)
 *   if (errorResult.shouldRetry) {
 *     // 재시도 로직
 *   }
 * }
 */
export function handleRAGError(error: unknown, context: string): RAGErrorResult {
  // Step 1: 에러 타입 분류
  const errorType = classifyError(error)
  const isNetworkError = errorType === 'network'
  const shouldRetry = isNetworkError || errorType === 'timeout'

  // Step 2: 사용자 친화적 메시지 생성
  let message: string
  if (error instanceof Error) {
    message = formatUserMessage(error.message, errorType, context)
  } else {
    message = '알 수 없는 오류가 발생했습니다.'
  }

  // Step 3: 개발 환경 로깅
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
    console.error(`[${context}] ${errorType}: ${message}`, error)
  }

  return {
    message,
    isNetworkError,
    shouldRetry,
    originalError: error,
    errorType,
  }
}

/**
 * 에러 타입 분류
 */
function classifyError(error: unknown): RAGErrorResult['errorType'] {
  if (error instanceof TypeError) {
    const message = error.message.toLowerCase()
    // 네트워크 에러
    if (message.includes('fetch') || message.includes('network')) {
      return 'network'
    }
  }

  if (error instanceof Error) {
    const message = error.message

    // 모델 없음
    if (message.includes('not found') || message.includes('no model')) {
      return 'model_not_found'
    }

    // 타임아웃
    if (message.includes('timeout') || message.includes('time out')) {
      return 'timeout'
    }

    // 권한 문제
    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'permission'
    }

    // 검증 에러
    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation'
    }

    // 연결 거부 (Ollama 서버 미작동)
    if (message.includes('ECONNREFUSED') || message.includes('connection refused')) {
      return 'network'
    }
  }

  return 'unknown'
}

/**
 * 사용자 친화적 메시지 생성
 */
function formatUserMessage(
  errorMessage: string,
  errorType: RAGErrorResult['errorType'],
  context: string
): string {
  // Provider에서 온 사용자 친화적 에러 메시지 감지
  // (예: "RAG 챗봇은 로컬 환경에서만 사용 가능합니다...")
  if (
    errorMessage.includes('RAG 챗봇') ||
    errorMessage.includes('NEXT_PUBLIC_OLLAMA_ENDPOINT') ||
    errorMessage.includes('localhost에서 실행')
  ) {
    return errorMessage // Provider 메시지 그대로 전달
  }

  switch (errorType) {
    case 'model_not_found':
      return 'AI 모델을 찾을 수 없습니다. 설정에서 모델을 선택해주세요.'

    case 'network':
      return 'Ollama 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.'

    case 'timeout':
      return '응답 시간이 초과되었습니다. 다시 시도해주세요.'

    case 'permission':
      return '접근 권한이 없습니다. 설정을 확인해주세요.'

    case 'validation':
      return `유효하지 않은 입력입니다: ${errorMessage}`

    case 'unknown':
    default:
      return `${context}에서 오류가 발생했습니다. 다시 시도해주세요.`
  }
}

/**
 * 에러 메시지 포맷 규칙
 *
 * 모든 사용자 메시지는 다음 원칙을 따름:
 * 1. 무엇이 문제인가? (문제 진단)
 * 2. 어떻게 해야 하는가? (해결 방법)
 * 3. 기술 정보 없음 (사용자 친화적)
 *
 * @example
 * ✅ 좋은 메시지:
 * "AI 모델을 찾을 수 없습니다. 설정에서 모델을 선택해주세요."
 *
 * ❌나쁜 메시지:
 * "ReferenceError: models[0] is not defined"
 */
export const ERROR_MESSAGE_FORMAT = {
  description: '사용자 친화적 메시지 규칙',
  rules: [
    '1. 문제를 명확히 설명 (무엇이 문제인가)',
    '2. 해결 방법 제시 (어떻게 해야 하는가)',
    '3. 기술 용어 피하기',
    '4. 정중한 톤 사용',
  ],
} as const
