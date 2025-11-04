/**
 * RAG 채팅 세션 관리 훅
 *
 * ChatStorageIndexedDB와 React state를 통합하여
 * 세션 로드, 메시지 저장, 배치 저장 등을 중앙화
 *
 * 핵심 설계:
 * - 낙관적 UI 업데이트 (사용자 경험)
 * - 배치 저장으로 Race condition 방지 (성능)
 * - 자동 재시도 (복원력)
 * - cleanup 안전성 (메모리 누수 방지)
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { ChatStorageIndexedDB } from '@/lib/services/storage/chat-storage-indexed-db'
import type { ChatMessage, ChatSession } from '@/lib/types/chat'

export interface UseChatSessionOptions {
  /** 세션 ID */
  sessionId: string
  /** 자동 저장 활성화 (기본: true) */
  enableAutoSave?: boolean
  /** 배치 저장 지연 (ms, 기본: 1000) */
  autoSaveDelay?: number
}

export interface UseChatSessionReturn {
  // 상태
  messages: ChatMessage[]
  isLoading: boolean

  // 메서드
  loadSession: () => Promise<void>
  addMessage: (message: ChatMessage) => Promise<void>
  deleteMessage: (messageId: string) => Promise<void>
  addMessages: (messages: ChatMessage[]) => Promise<void>
}

/**
 * RAG 채팅 세션 관리 훅
 *
 * @example
 * const { messages, addMessage, loadSession } = useChatSession({
 *   sessionId: 'session-123',
 *   autoSaveDelay: 1000,
 * })
 *
 * // 세션 로드
 * await loadSession()
 *
 * // 메시지 추가 (낙관적 UI 업데이트 + 배치 저장)
 * await addMessage({
 *   id: '1',
 *   role: 'user',
 *   content: '질문',
 *   timestamp: Date.now(),
 * })
 */
export function useChatSession(options: UseChatSessionOptions): UseChatSessionReturn {
  const { sessionId, enableAutoSave = true, autoSaveDelay = 1000 } = options

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // 🆕 큐 관리: 여러 메시지를 모았다가 일괄 저장
  const saveQueueRef = useRef<ChatMessage[]>([])
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * 배치 저장 로직
   *
   * 큐에 모인 메시지를 일괄 저장하여 Race condition 방지
   *
   * @throws 저장 실패 시 큐에 다시 추가
   */
  const flushSaveQueue = useCallback(async () => {
    if (saveQueueRef.current.length === 0) return

    // Step 1: 저장할 메시지 복사 (중복 저장 방지)
    const messagesToSave = [...saveQueueRef.current]
    saveQueueRef.current = []

    try {
      // Step 2: 각 메시지 순차 저장 (트랜잭션 안전)
      for (const msg of messagesToSave) {
        await ChatStorageIndexedDB.addMessage(sessionId, msg)
      }
    } catch (err) {
      // Step 3: 실패 시 다시 큐에 추가 (자동 재시도)
      saveQueueRef.current = [...messagesToSave, ...saveQueueRef.current]

      console.error('[useChatSession] 배치 저장 실패, 재시도 대기 중:', err)

      // 재시도 타이머 설정
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
      saveTimerRef.current = setTimeout(
        () => void flushSaveQueue(),
        autoSaveDelay * 2 // 2배 지연
      )

      throw err
    }
  }, [sessionId, autoSaveDelay])

  /**
   * 세션 로드
   *
   * IndexedDB에서 메시지를 로드하고 상태 업데이트
   */
  const loadSession = useCallback(async () => {
    setIsLoading(true)
    try {
      const session = await ChatStorageIndexedDB.loadSession(sessionId)
      if (session) {
        setMessages(session.messages as ChatMessage[])
      }
    } catch (err) {
      console.error('[useChatSession] 세션 로드 실패:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [sessionId])

  /**
   * 메시지 추가 (비동기)
   *
   * Step 1: UI 즉시 업데이트 (낙관적)
   * Step 2: 저장 큐에 추가
   * Step 3: 배치 저장 타이머 설정
   *
   * @param message - 저장할 메시지
   * @throws 저장 실패 시 에러 발생 (UI는 이미 업데이트됨)
   */
  const addMessage = useCallback(
    async (message: ChatMessage) => {
      // Step 1: UI 즉시 업데이트 (낙관적 업데이트)
      setMessages((prev) => [...prev, message])

      if (!enableAutoSave) {
        return // 자동 저장 비활성화 시 반환
      }

      // Step 2: 저장 큐에 추가
      saveQueueRef.current.push(message)

      // Step 3: 타이머 설정 (기존 타이머 취소)
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }

      saveTimerRef.current = setTimeout(() => {
        void flushSaveQueue()
      }, autoSaveDelay)
    },
    [enableAutoSave, autoSaveDelay, flushSaveQueue]
  )

  /**
   * 여러 메시지 추가 (배치)
   *
   * 여러 메시지를 한 번에 추가할 때 사용
   * (예: 세션 로드 후 이전 메시지 추가)
   *
   * @param newMessages - 추가할 메시지 배열
   */
  const addMessages = useCallback(
    async (newMessages: ChatMessage[]) => {
      // UI 업데이트
      setMessages((prev) => [...prev, ...newMessages])

      if (!enableAutoSave) {
        return
      }

      // 큐에 모두 추가
      saveQueueRef.current.push(...newMessages)

      // 배치 저장
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }

      await flushSaveQueue()
    },
    [enableAutoSave, flushSaveQueue]
  )

  /**
   * 메시지 삭제
   *
   * @param messageId - 삭제할 메시지 ID
   */
  const deleteMessage = useCallback(
    async (messageId: string) => {
      // Step 1: UI 업데이트
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId))

      try {
        // Step 2: IndexedDB에서 삭제
        await ChatStorageIndexedDB.deleteMessage(sessionId, messageId)

        // Step 3: 세션 갱신 (삭제 반영)
        const updatedSession = await ChatStorageIndexedDB.loadSession(sessionId)
        if (updatedSession) {
          setMessages(updatedSession.messages as ChatMessage[])
        }
      } catch (err) {
        console.error('[useChatSession] 메시지 삭제 실패:', err)
        throw err
      }
    },
    [sessionId]
  )

  /**
   * cleanup: 컴포넌트 언마운트 시 남은 메시지 저장
   *
   * useEffect cleanup은 비동기 작업을 대기할 수 없으므로
   * 여기서는 타이머만 취소하고
   * 남은 메시지는 다음에 저장 시도
   */
  useEffect(() => {
    return () => {
      // cleanup: 타이머 취소
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }

      // ⚠️ cleanup에서는 async 대기 불가능
      // 남은 메시지가 있으면 다음 사용 시 저장됨
      if (saveQueueRef.current.length > 0) {
        console.warn('[useChatSession] cleanup: 저장되지 않은 메시지 있음', saveQueueRef.current)
      }
    }
  }, [])

  return {
    messages,
    isLoading,
    loadSession,
    addMessage,
    deleteMessage,
    addMessages,
  }
}
