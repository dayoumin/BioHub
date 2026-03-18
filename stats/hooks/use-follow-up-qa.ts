'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { AnalysisResult } from '@/types/analysis'
import type { ChatMessage } from '@/lib/types/chat'
import { streamFollowUp, type InterpretationContext } from '@/lib/services/result-interpreter'

interface UseFollowUpQAOptions {
  results: AnalysisResult | null
  interpretation: string | null | undefined
  sampleSize: number | undefined
  mappedVariables: string[]
  uploadedFileName: string | null | undefined
  /** t.analysis.executionLogs.errorPrefix */
  errorPrefix: (msg: string) => string
  /** t.results.followUp.errorMessage */
  errorMessage: string
}

interface UseFollowUpQAReturn {
  followUpMessages: ChatMessage[]
  setFollowUpMessages: Dispatch<SetStateAction<ChatMessage[]>>
  followUpInput: string
  setFollowUpInput: Dispatch<SetStateAction<string>>
  isFollowUpStreaming: boolean
  chatBottomRef: RefObject<HTMLDivElement | null>
  handleFollowUp: (question: string) => Promise<void>
  /** 히스토리 전환 시 호출 — 스트림 중단 + 상태 초기화 */
  resetFollowUp: () => void
}

export function useFollowUpQA({
  results,
  interpretation,
  sampleSize,
  mappedVariables,
  uploadedFileName,
  errorPrefix,
  errorMessage,
}: UseFollowUpQAOptions): UseFollowUpQAReturn {
  const [followUpMessages, setFollowUpMessages] = useState<ChatMessage[]>([])
  const [followUpInput, setFollowUpInput] = useState('')
  const [isFollowUpStreaming, setIsFollowUpStreaming] = useState(false)

  // 동기 가드 — state 업데이트 지연으로 인한 더블클릭 race 방지
  const isFollowUpStreamingRef = useRef(false)
  const followUpAbortRef = useRef<AbortController | null>(null)
  const chatBottomRef = useRef<HTMLDivElement | null>(null)

  // 언마운트 시 진행 중인 스트림 취소 + 동기 가드 리셋 (재마운트 시 가드 잠김 방지)
  useEffect(() => {
    return () => {
      followUpAbortRef.current?.abort()
      isFollowUpStreamingRef.current = false
    }
  }, [])

  const resetFollowUp = useCallback(() => {
    followUpAbortRef.current?.abort()
    setFollowUpMessages([])
    setFollowUpInput('')
    setIsFollowUpStreaming(false)
    isFollowUpStreamingRef.current = false
  }, [])

  const handleFollowUp = useCallback(async (question: string) => {
    if (!results || !interpretation || isFollowUpStreamingRef.current || !question.trim()) return
    isFollowUpStreamingRef.current = true

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question.trim(),
      timestamp: Date.now(),
    }
    setFollowUpMessages(prev => [...prev, userMsg])
    setFollowUpInput('')

    const assistantPlaceholder: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    }
    setFollowUpMessages(prev => [...prev, assistantPlaceholder])
    setIsFollowUpStreaming(true)

    const controller = new AbortController()
    followUpAbortRef.current = controller

    const ctx: InterpretationContext = {
      results,
      sampleSize,
      variables: mappedVariables.length > 0 ? mappedVariables : undefined,
      uploadedFileName: uploadedFileName ?? undefined,
    }

    try {
      let accumulated = ''
      await streamFollowUp(
        question.trim(),
        followUpMessages,
        ctx,
        interpretation,
        (chunk) => {
          accumulated += chunk
          setFollowUpMessages(prev => {
            if (prev.length === 0) return prev
            const last = prev[prev.length - 1]
            if (last.role !== 'assistant') return prev
            return [...prev.slice(0, -1), { ...last, content: accumulated }]
          })
        },
        controller.signal
      )
    } catch (error) {
      if (controller.signal.aborted) return
      const errorContent = error instanceof Error
        ? errorPrefix(error.message)
        : errorMessage
      setFollowUpMessages(prev => {
        if (prev.length === 0) return prev
        const last = prev[prev.length - 1]
        if (last.role !== 'assistant') return prev
        return [...prev.slice(0, -1), { ...last, content: errorContent }]
      })
    } finally {
      isFollowUpStreamingRef.current = false
      setIsFollowUpStreaming(false)
      followUpAbortRef.current = null
      requestAnimationFrame(() => chatBottomRef.current?.scrollIntoView?.({ behavior: 'smooth' }))
    }
  }, [results, interpretation, followUpMessages, sampleSize, mappedVariables, uploadedFileName, errorPrefix, errorMessage])

  return {
    followUpMessages,
    setFollowUpMessages,
    followUpInput,
    setFollowUpInput,
    isFollowUpStreaming,
    chatBottomRef,
    handleFollowUp,
    resetFollowUp,
  }
}
