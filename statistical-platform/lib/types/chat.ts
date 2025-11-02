/**
 * AI 챗봇 세션 타입 정의
 */

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
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
