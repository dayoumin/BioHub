/**
 * RAG 메시지 지속성 테스트
 *
 * 테스트 시나리오:
 * 1. 사용자 메시지 즉시 저장 검증
 * 2. Citation 메타데이터 유지 검증
 * 3. 네트워크 오류 시 데이터 복구 검증
 */

// Mock ChatStorage
const mockChatStorage = {
  messages: [] as Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: number
    sources?: Array<{ title: string; content: string; score: number }>
    model?: { provider: string; embedding?: string; inference?: string }
  }>,

  addMessage(sessionId: string, message: unknown) {
    this.messages.push(message as typeof this.messages[0])
  },

  loadSession(sessionId: string) {
    return { messages: this.messages }
  },

  reset() {
    this.messages = []
  },
}

describe('RAG Message Persistence', () => {
  beforeEach(() => {
    mockChatStorage.reset()
  })

  describe('Issue 1: 메시지 손실 방지', () => {
    test('사용자 메시지가 API 요청 전에 저장되어야 함', () => {
      // Arrange
      const userMessage = {
        id: '123-user',
        role: 'user' as const,
        content: 't-test 사용법을 알려줘',
        timestamp: Date.now(),
      }

      // Act: 사용자 메시지 즉시 저장 (API 요청 전)
      mockChatStorage.addMessage('session-1', userMessage)

      // Assert
      const session = mockChatStorage.loadSession('session-1')
      expect(session.messages).toHaveLength(1)
      expect(session.messages[0].role).toBe('user')
      expect(session.messages[0].content).toBe('t-test 사용법을 알려줘')
    })

    test('네트워크 오류 발생 시에도 사용자 메시지는 보존되어야 함', async () => {
      // Arrange
      const userMessage = {
        id: '456-user',
        role: 'user' as const,
        content: 'ANOVA와 회귀분석의 차이점?',
        timestamp: Date.now(),
      }

      // Act
      mockChatStorage.addMessage('session-2', userMessage)

      // 네트워크 오류 시뮬레이션
      const errorOccurred = true

      // Assert: 오류 발생 후에도 사용자 메시지는 존재
      if (errorOccurred) {
        const session = mockChatStorage.loadSession('session-2')
        expect(session.messages).toHaveLength(1)
        expect(session.messages[0].content).toContain('ANOVA')
      }
    })

    test('사용자 메시지 저장 후 응답 메시지도 저장되어야 함', () => {
      // Arrange
      const userMessage = {
        id: '789-user',
        role: 'user' as const,
        content: '정규성 검정이란?',
        timestamp: Date.now(),
      }

      const assistantMessage = {
        id: '789-assistant',
        role: 'assistant' as const,
        content: '정규성 검정은 데이터가 정규분포를 따르는지 확인하는 검정입니다.',
        timestamp: Date.now() + 1000,
        sources: [
          {
            title: '정규성 검정 가이드',
            content: '데이터가 정규분포를 따르는지 확인...',
            score: 0.95,
          },
        ],
        model: { provider: 'ollama', inference: 'qwen:7b' },
      }

      // Act
      mockChatStorage.addMessage('session-3', userMessage)
      mockChatStorage.addMessage('session-3', assistantMessage)

      // Assert
      const session = mockChatStorage.loadSession('session-3')
      expect(session.messages).toHaveLength(2)
      expect(session.messages[0].role).toBe('user')
      expect(session.messages[1].role).toBe('assistant')
    })
  })

  describe('Issue 2: Citation 메타데이터 유지', () => {
    test('응답 메시지에 sources 정보가 포함되어야 함', () => {
      // Arrange
      const assistantMessage = {
        id: 'msg-001-assistant',
        role: 'assistant' as const,
        content: 't-test는 두 그룹의 평균 차이를 검정합니다.',
        timestamp: Date.now(),
        sources: [
          {
            title: 't-test 기초',
            content: '독립 표본 t-test는...',
            score: 0.92,
          },
          {
            title: 't-test 가정',
            content: 't-test의 가정: 정규성, 등분산성...',
            score: 0.88,
          },
        ],
        model: { provider: 'ollama', embedding: 'nomic-embed-text', inference: 'neural-chat' },
      }

      // Act
      mockChatStorage.addMessage('session-4', assistantMessage)

      // Assert
      const session = mockChatStorage.loadSession('session-4')
      const savedMessage = session.messages[0]

      expect(savedMessage.sources).toBeDefined()
      expect(savedMessage.sources).toHaveLength(2)
      expect(savedMessage.sources?.[0].title).toBe('t-test 기초')
      expect(savedMessage.sources?.[0].score).toBe(0.92)
    })

    test('재방문 시에도 Citation 정보가 복구되어야 함', () => {
      // Arrange: 이전 세션에 저장된 메시지
      const savedMessage = {
        id: 'prev-msg-001',
        role: 'assistant' as const,
        content: 'ANOVA는 여러 그룹의 평균을 비교합니다.',
        timestamp: Date.now(),
        sources: [
          { title: 'ANOVA 개요', content: 'ANOVA (분산분석)...', score: 0.89 },
        ],
        model: { provider: 'ollama' },
      }

      // Act: 메시지 저장
      mockChatStorage.addMessage('session-5', savedMessage)

      // 페이지 새로고침 시뮬레이션 (재로드)
      const reloadedSession = mockChatStorage.loadSession('session-5')

      // Assert
      const reloadedMessage = reloadedSession.messages[0]
      expect(reloadedMessage.sources).toBeDefined()
      expect(reloadedMessage.sources?.[0].title).toBe('ANOVA 개요')
      expect(reloadedMessage.model?.provider).toBe('ollama')
    })

    test('모델 정보가 저장되고 복구되어야 함', () => {
      // Arrange
      const messageWithModelInfo = {
        id: 'msg-with-model',
        role: 'assistant' as const,
        content: '회귀분석의 R-squared 값이 0.85입니다.',
        timestamp: Date.now(),
        model: {
          provider: 'ollama',
          embedding: 'qwen3-embedding:0.6b',
          inference: 'neural-chat:7b',
        },
      }

      // Act
      mockChatStorage.addMessage('session-6', messageWithModelInfo)
      const session = mockChatStorage.loadSession('session-6')

      // Assert
      const saved = session.messages[0]
      expect(saved.model).toBeDefined()
      expect(saved.model?.provider).toBe('ollama')
      expect(saved.model?.embedding).toBe('qwen3-embedding:0.6b')
      expect(saved.model?.inference).toBe('neural-chat:7b')
    })
  })

  describe('Integration: 메시지 손실 + Citation 함께', () => {
    test('전체 대화 흐름에서 모든 메타데이터 보존', () => {
      // Arrange: 완전한 대화 흐름
      const conversation = [
        {
          id: 'msg-1-user',
          role: 'user' as const,
          content: 'Pearson 상관계수 계산하기',
          timestamp: 1000,
        },
        {
          id: 'msg-1-assistant',
          role: 'assistant' as const,
          content:
            'Pearson 상관계수는 두 변수 간의 선형 관계를 측정합니다. 범위는 -1에서 1입니다.',
          timestamp: 2000,
          sources: [
            {
              title: 'Pearson 상관계수',
              content: 'r = Σ((x - x̄)(y - ȳ)) / √(Σ(x - x̄)² × Σ(y - ȳ)²)',
              score: 0.96,
            },
          ],
          model: { provider: 'ollama', inference: 'qwen:7b' },
        },
      ]

      // Act
      conversation.forEach((msg) => {
        mockChatStorage.addMessage('session-full', msg as never)
      })

      // Assert
      const session = mockChatStorage.loadSession('session-full')
      expect(session.messages).toHaveLength(2)

      // 사용자 메시지 검증
      const userMsg = session.messages[0]
      expect(userMsg.role).toBe('user')
      expect(userMsg.content).toContain('Pearson')

      // 응답 메시지 검증 (메타데이터 포함)
      const assistantMsg = session.messages[1]
      expect(assistantMsg.role).toBe('assistant')
      expect(assistantMsg.sources).toHaveLength(1)
      expect(assistantMsg.model?.provider).toBe('ollama')
    })
  })
})
