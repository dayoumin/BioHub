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

export interface ChatProject {
  id: string
  name: string
  description?: string
  emoji?: string
  color?: string
  createdAt: number
  updatedAt: number
  isArchived: boolean
  isFavorite?: boolean
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  projectId?: string  // 🆕 프로젝트 참조 (선택)
  createdAt: number
  updatedAt: number
  isFavorite: boolean
  isArchived: boolean
}

export interface ChatSettings {
  floatingButtonEnabled: boolean
  theme: 'light' | 'dark' | 'system'
  /** Ollama 추론 모델 (자동으로 추천됨, 사용자가 변경 가능) */
  inferenceModel?: string
}
