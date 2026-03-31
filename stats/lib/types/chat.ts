/** 채팅 메시지 타입 — FollowUp Q&A, 히스토리 등에서 공유 */

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  isError?: boolean
  isStreaming?: boolean
  timestamp?: number
}
