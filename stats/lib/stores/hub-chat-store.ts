import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ValidationResults, MethodRecommendation, ResolvedIntent } from '@/types/analysis'

// ===== Types =====

/** 허브 채팅 메시지 */
export interface HubChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  /** user 메시지: 인텐트 분류 결과 */
  intent?: ResolvedIntent
  /** assistant 메시지: 추천 카드 */
  recommendations?: MethodRecommendation[]
  /** true → LLM 컨텍스트에서 제외 + 재시도 버튼 표시 */
  isError?: boolean
  /** 데이터 없을 때 업로드 유도 표시 여부 */
  suggestUpload?: boolean
}

/** 허브에 로드된 데이터 컨텍스트 */
export interface HubDataContext {
  fileName: string
  totalRows: number
  columnCount: number
  numericColumns: string[]
  categoricalColumns: string[]
  /** Step 1 호환 — analysis-store에도 동일하게 저장됨 */
  validationResults: ValidationResults
}

// ===== Store =====

export const MAX_MESSAGES = 30

interface HubChatState {
  messages: HubChatMessage[]
  dataContext: HubDataContext | null
  isStreaming: boolean
  /** 업로드 유도를 이미 1회 표시했는지 */
  hasSeenUploadSuggestion: boolean

  addMessage: (msg: HubChatMessage) => void
  removeMessage: (id: string) => void
  /** 여러 메시지를 단일 set()으로 원자적 제거 (재시도 시 에러+유저 메시지 동시 삭제용) */
  removeMessages: (ids: string[]) => void
  clearMessages: () => void
  clearAll: () => void
  setDataContext: (ctx: HubDataContext | null) => void
  setStreaming: (v: boolean) => void
  setHasSeenUploadSuggestion: (v: boolean) => void
}

const initialState = {
  messages: [] as HubChatMessage[],
  dataContext: null as HubDataContext | null,
  isStreaming: false,
  hasSeenUploadSuggestion: false,
}

export const useHubChatStore = create<HubChatState>()(
  persist(
    (set) => ({
      ...initialState,

      addMessage: (msg) =>
        set((state) => ({
          messages: [...state.messages, msg].slice(-MAX_MESSAGES),
        })),

      removeMessage: (id) =>
        set((state) => ({
          messages: state.messages.filter((m) => m.id !== id),
        })),

      removeMessages: (ids) =>
        set((state) => ({
          messages: state.messages.filter((m) => !ids.includes(m.id)),
        })),

      clearMessages: () =>
        set({ messages: [], hasSeenUploadSuggestion: false }),

      clearAll: () => set(initialState),

      setDataContext: (ctx) => set({ dataContext: ctx }),

      setStreaming: (v) => set({ isStreaming: v }),

      setHasSeenUploadSuggestion: (v) => set({ hasSeenUploadSuggestion: v }),
    }),
    {
      name: 'hub-chat-storage',
      storage: createJSONStorage(() => sessionStorage),
      // dataContext 제외: analysis-store.uploadedData가 persist되지 않아,
      // 새로고침 후 배지는 "데이터 있음"이지만 실제 분석 데이터가 없는 불일치 방지
      partialize: (state) => ({
        messages: state.messages,
        hasSeenUploadSuggestion: state.hasSeenUploadSuggestion,
      }),
    }
  )
)
