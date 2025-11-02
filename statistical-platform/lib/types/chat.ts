/**
 * AI 챗봇 세션 타입 정의
 */

export interface ChatSource {
  title: string
  content: string
  score: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  // ✅ Citation 메타데이터 (Assistant 메시지만)
  sources?: ChatSource[]
  // ✅ 모델 정보
  model?: {
    provider: string
    embedding?: string
    inference?: string
  }
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
  isFavorite: boolean
  isArchived: boolean
}

export interface ChatSettings {
  floatingButtonEnabled: boolean
  theme: 'light' | 'dark' | 'system'
}
