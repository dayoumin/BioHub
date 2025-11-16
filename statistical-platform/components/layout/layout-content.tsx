'use client'

import { useUI } from '@/contexts/ui-context'
import { ChatPanel } from '@/components/chatbot/chat-panel'

export function LayoutContent() {
  const { isChatPanelOpen } = useUI()

  if (!isChatPanelOpen) return null

  return <ChatPanel />
}
