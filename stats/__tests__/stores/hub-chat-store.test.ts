/**
 * hub-chat-store 단위 테스트
 *
 * HubChatMessage CRUD, FIFO 30개 제한, dataContext 관리,
 * clearMessages/clearAll 동작, hasSeenUploadSuggestion 플래그 검증.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useHubChatStore, MAX_MESSAGES, type HubChatMessage, type HubDataContext } from '@/lib/stores/hub-chat-store'
import type { ValidationResults } from '@/types/analysis'

// ===== Helpers =====

function makeMsg(overrides: Partial<HubChatMessage> = {}): HubChatMessage {
  return {
    id: `msg_${Math.random().toString(36).slice(2, 8)}`,
    role: 'user',
    content: 'test message',
    timestamp: Date.now(),
    ...overrides,
  }
}

function makeDataContext(overrides: Partial<HubDataContext> = {}): HubDataContext {
  return {
    fileName: 'test.csv',
    totalRows: 100,
    columnCount: 5,
    numericColumns: ['weight', 'height'],
    categoricalColumns: ['group'],
    validationResults: {
      isValid: true,
      totalRows: 100,
      columnCount: 5,
      missingValues: 0,
      dataType: 'mixed',
      variables: ['weight', 'height', 'group'],
      errors: [],
      warnings: [],
    } as ValidationResults,
    ...overrides,
  }
}

// ===== Tests =====

describe('hub-chat-store', () => {
  beforeEach(() => {
    act(() => { useHubChatStore.getState().clearAll() })
  })

  // ===== 초기 상태 =====

  describe('초기 상태', () => {
    it('기본값이 올바르다', () => {
      const state = useHubChatStore.getState()
      expect(state.messages).toEqual([])
      expect(state.dataContext).toBeNull()
      expect(state.isStreaming).toBe(false)
      expect(state.hasSeenUploadSuggestion).toBe(false)
    })
  })

  // ===== addMessage =====

  describe('addMessage', () => {
    it('메시지를 추가한다', () => {
      expect(useHubChatStore.getState().messages).toHaveLength(0)  // before

      const msg = makeMsg({ content: '안녕하세요' })
      act(() => { useHubChatStore.getState().addMessage(msg) })

      const { messages } = useHubChatStore.getState()
      expect(messages).toHaveLength(1)
      expect(messages[0].content).toBe('안녕하세요')
    })

    it('여러 메시지를 순서대로 저장한다', () => {
      expect(useHubChatStore.getState().messages).toHaveLength(0)  // before

      act(() => {
        useHubChatStore.getState().addMessage(makeMsg({ content: '첫 번째' }))
        useHubChatStore.getState().addMessage(makeMsg({ content: '두 번째' }))
        useHubChatStore.getState().addMessage(makeMsg({ content: '세 번째' }))
      })

      const { messages } = useHubChatStore.getState()
      expect(messages).toHaveLength(3)
      expect(messages[0].content).toBe('첫 번째')
      expect(messages[2].content).toBe('세 번째')
    })

    it('30개 초과 시 FIFO로 오래된 메시지를 제거한다', () => {
      act(() => {
        for (let i = 0; i < 35; i++) {
          useHubChatStore.getState().addMessage(makeMsg({ id: `msg_${i}`, content: `메시지 ${i}` }))
        }
      })

      const { messages } = useHubChatStore.getState()
      expect(messages).toHaveLength(30)
      // 가장 오래된 5개(0~4) 제거, 5번부터 시작
      expect(messages[0].content).toBe('메시지 5')
      expect(messages[29].content).toBe('메시지 34')
    })
  })

  // ===== removeMessages (원자적 다중 삭제) =====

  describe('removeMessages', () => {
    it('여러 id를 단일 연산으로 동시에 제거한다', () => {
      const a = makeMsg({ id: 'a' })
      const b = makeMsg({ id: 'b' })
      const c = makeMsg({ id: 'c' })
      act(() => {
        useHubChatStore.getState().addMessage(a)
        useHubChatStore.getState().addMessage(b)
        useHubChatStore.getState().addMessage(c)
      })

      // 제거 전: 3개
      expect(useHubChatStore.getState().messages).toHaveLength(3)

      act(() => { useHubChatStore.getState().removeMessages(['a', 'c']) })

      // 제거 후: b만 남아야 함
      const { messages } = useHubChatStore.getState()
      expect(messages).toHaveLength(1)
      expect(messages[0].id).toBe('b')
      expect(messages.find((m) => m.id === 'a')).toBeUndefined()
      expect(messages.find((m) => m.id === 'c')).toBeUndefined()
    })

    it('존재하지 않는 id가 섞여 있어도 존재하는 것만 제거한다', () => {
      const a = makeMsg({ id: 'a' })
      const b = makeMsg({ id: 'b' })
      act(() => {
        useHubChatStore.getState().addMessage(a)
        useHubChatStore.getState().addMessage(b)
      })

      act(() => { useHubChatStore.getState().removeMessages(['a', 'nonexistent']) })

      const { messages } = useHubChatStore.getState()
      expect(messages).toHaveLength(1)
      expect(messages[0].id).toBe('b')
    })

    it('빈 배열이면 아무것도 하지 않는다', () => {
      act(() => {
        useHubChatStore.getState().addMessage(makeMsg({ id: 'x' }))
      })

      expect(useHubChatStore.getState().messages).toHaveLength(1)  // before

      act(() => { useHubChatStore.getState().removeMessages([]) })

      // after: 길이 변화 없고 기존 메시지 보존
      expect(useHubChatStore.getState().messages).toHaveLength(1)
      expect(useHubChatStore.getState().messages[0].id).toBe('x')
    })

    it('재시도 시나리오: 에러 메시지 + 유저 메시지를 동시에 제거한다', () => {
      const userMsg = makeMsg({ id: 'user_1', role: 'user', content: '두 그룹 비교하고 싶어요' })
      const assistantMsg = makeMsg({ id: 'asst_1', role: 'assistant', content: '추천: t-검정' })
      const errorMsg = makeMsg({ id: 'err_1', role: 'assistant', content: '분류 오류', isError: true })

      act(() => {
        useHubChatStore.getState().addMessage(userMsg)
        useHubChatStore.getState().addMessage(assistantMsg)
        useHubChatStore.getState().addMessage(errorMsg)
      })

      expect(useHubChatStore.getState().messages).toHaveLength(3)

      // handleRetry 패턴: [errorMessageId, lastUserMsg.id] 동시 삭제
      act(() => {
        useHubChatStore.getState().removeMessages(['err_1', 'user_1'])
      })

      const { messages } = useHubChatStore.getState()
      expect(messages).toHaveLength(1)
      expect(messages[0].id).toBe('asst_1')  // 기존 assistant 메시지는 보존
    })
  })

  // ===== removeMessage =====

  describe('removeMessage', () => {
    it('id로 특정 메시지만 제거한다', () => {
      const a = makeMsg({ id: 'a', content: '첫 번째' })
      const b = makeMsg({ id: 'b', content: '두 번째' })
      const c = makeMsg({ id: 'c', content: '세 번째' })
      act(() => {
        useHubChatStore.getState().addMessage(a)
        useHubChatStore.getState().addMessage(b)
        useHubChatStore.getState().addMessage(c)
      })

      act(() => { useHubChatStore.getState().removeMessage('b') })

      const { messages } = useHubChatStore.getState()
      expect(messages).toHaveLength(2)
      expect(messages[0].id).toBe('a')
      expect(messages[1].id).toBe('c')
      expect(messages.find((m) => m.id === 'b')).toBeUndefined()
    })

    it('존재하지 않는 id는 무시한다', () => {
      act(() => { useHubChatStore.getState().addMessage(makeMsg({ id: 'x' })) })
      act(() => { useHubChatStore.getState().removeMessage('nonexistent') })
      expect(useHubChatStore.getState().messages).toHaveLength(1)
    })
  })

  // ===== clearMessages =====

  describe('clearMessages', () => {
    it('메시지를 초기화하고 uploadSuggestion 플래그를 리셋한다', () => {
      act(() => {
        useHubChatStore.getState().addMessage(makeMsg())
        useHubChatStore.getState().setHasSeenUploadSuggestion(true)
      })

      expect(useHubChatStore.getState().messages).toHaveLength(1)
      expect(useHubChatStore.getState().hasSeenUploadSuggestion).toBe(true)

      act(() => { useHubChatStore.getState().clearMessages() })

      expect(useHubChatStore.getState().messages).toEqual([])
      expect(useHubChatStore.getState().hasSeenUploadSuggestion).toBe(false)
    })

    it('dataContext는 유지한다', () => {
      act(() => {
        useHubChatStore.getState().setDataContext(makeDataContext())
        useHubChatStore.getState().addMessage(makeMsg())
      })

      act(() => { useHubChatStore.getState().clearMessages() })

      const { dataContext } = useHubChatStore.getState()
      expect(useHubChatStore.getState().messages).toEqual([])
      expect(dataContext).not.toBeNull()
      expect(dataContext?.fileName).toBe('test.csv')      // 구체적 값 확인
      expect(dataContext?.totalRows).toBe(100)
    })
  })

  // ===== clearAll =====

  describe('clearAll', () => {
    it('모든 상태를 초기화한다', () => {
      act(() => {
        useHubChatStore.getState().addMessage(makeMsg())
        useHubChatStore.getState().setDataContext(makeDataContext())
        useHubChatStore.getState().setStreaming(true)
        useHubChatStore.getState().setHasSeenUploadSuggestion(true)
      })

      act(() => { useHubChatStore.getState().clearAll() })

      const state = useHubChatStore.getState()
      expect(state.messages).toEqual([])
      expect(state.dataContext).toBeNull()
      expect(state.isStreaming).toBe(false)
      expect(state.hasSeenUploadSuggestion).toBe(false)
    })
  })

  // ===== dataContext =====

  describe('dataContext', () => {
    it('데이터 컨텍스트를 설정한다', () => {
      const ctx = makeDataContext({ fileName: 'sample.csv', totalRows: 200 })
      act(() => { useHubChatStore.getState().setDataContext(ctx) })

      const { dataContext } = useHubChatStore.getState()
      expect(dataContext?.fileName).toBe('sample.csv')
      expect(dataContext?.totalRows).toBe(200)
    })

    it('null로 설정하면 클리어된다', () => {
      act(() => { useHubChatStore.getState().setDataContext(makeDataContext()) })
      expect(useHubChatStore.getState().dataContext).not.toBeNull()

      act(() => { useHubChatStore.getState().setDataContext(null) })
      expect(useHubChatStore.getState().dataContext).toBeNull()
    })
  })

  // ===== isStreaming =====

  describe('isStreaming', () => {
    it('스트리밍 상태를 토글한다', () => {
      expect(useHubChatStore.getState().isStreaming).toBe(false)

      act(() => { useHubChatStore.getState().setStreaming(true) })
      expect(useHubChatStore.getState().isStreaming).toBe(true)

      act(() => { useHubChatStore.getState().setStreaming(false) })
      expect(useHubChatStore.getState().isStreaming).toBe(false)
    })
  })

  // ===== hasSeenUploadSuggestion =====

  describe('hasSeenUploadSuggestion', () => {
    it('플래그를 설정하고 해제할 수 있다', () => {
      expect(useHubChatStore.getState().hasSeenUploadSuggestion).toBe(false)

      act(() => { useHubChatStore.getState().setHasSeenUploadSuggestion(true) })
      expect(useHubChatStore.getState().hasSeenUploadSuggestion).toBe(true)

      act(() => { useHubChatStore.getState().setHasSeenUploadSuggestion(false) })
      expect(useHubChatStore.getState().hasSeenUploadSuggestion).toBe(false)
    })
  })
})
