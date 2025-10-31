/**
 * RAG Assistant Hook
 *
 * 통계 페이지에서 RAG 도우미를 사용하기 위한 커스텀 훅
 * 기존 페이지 코드 변경 최소화
 */

import { useState, useCallback } from 'react'
import { queryRAG } from '../rag-service'
import type { RAGResponse } from '../providers/base-provider'

export interface UseRAGAssistantOptions {
  /** 현재 통계 메서드 */
  method?: string
  /** 자동 초기화 (기본: true) */
  autoInit?: boolean
}

export interface UseRAGAssistantReturn {
  /** RAG에 질문하기 */
  ask: (question: string) => Promise<void>
  /** 응답 */
  answer: string | null
  /** 참조 문서 */
  sources: RAGResponse['sources'] | null
  /** 로딩 상태 */
  isLoading: boolean
  /** 에러 */
  error: string | null
  /** 대화 초기화 */
  reset: () => void
}

/**
 * RAG 도우미 Hook
 *
 * 사용 예시:
 * ```tsx
 * const { ask, answer, isLoading } = useRAGAssistant({ method: 'tTest' })
 *
 * // 질문하기
 * await ask('대립가설과 귀무가설의 차이는?')
 * ```
 */
export function useRAGAssistant(options: UseRAGAssistantOptions = {}): UseRAGAssistantReturn {
  const { method, autoInit = true } = options

  const [answer, setAnswer] = useState<string | null>(null)
  const [sources, setSources] = useState<RAGResponse['sources'] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ask = useCallback(
    async (question: string) => {
      if (!question.trim()) {
        setError('질문을 입력하세요')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await queryRAG({
          query: question.trim(),
          method
        })

        setAnswer(response.answer)
        setSources(response.sources || null)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류'
        setError(errorMessage)
        setAnswer(null)
        setSources(null)
      } finally {
        setIsLoading(false)
      }
    },
    [method]
  )

  const reset = useCallback(() => {
    setAnswer(null)
    setSources(null)
    setError(null)
  }, [])

  return {
    ask,
    answer,
    sources,
    isLoading,
    error,
    reset
  }
}
