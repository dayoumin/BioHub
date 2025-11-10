/**
 * Chatbot Tabs Component
 *
 * Chatbot 페이지의 3-탭 구조를 제공
 * - 💬 Conversations: RAG 챗봇 인터페이스
 * - 📚 Documents: 문서 관리
 * - ⚙️ Settings: 설정 (모델, 환경 등)
 */

'use client'

import { useState, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MessageSquare, FileText, Settings } from 'lucide-react'

export type ChatbotTab = 'conversations' | 'documents' | 'settings'

interface ChatbotTabsProps {
  /** Conversations 탭 콘텐츠 */
  conversationsContent: React.ReactNode
  /** Documents 탭 콘텐츠 */
  documentsContent: React.ReactNode
  /** Settings 탭 콘텐츠 */
  settingsContent: React.ReactNode
  /** 기본 선택 탭 */
  defaultTab?: ChatbotTab
  /** 탭 변경 콜백 */
  onTabChange?: (tab: ChatbotTab) => void
}

export function ChatbotTabs({
  conversationsContent,
  documentsContent,
  settingsContent,
  defaultTab = 'conversations',
  onTabChange,
}: ChatbotTabsProps) {
  const [activeTab, setActiveTab] = useState<ChatbotTab>(defaultTab)

  const handleTabChange = useCallback(
    (value: string) => {
      const tab = value as ChatbotTab
      setActiveTab(tab)
      onTabChange?.(tab)
    },
    [onTabChange]
  )

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="flex flex-col h-full"
    >
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="conversations" className="gap-2">
          <MessageSquare className="h-4 w-4" />
          <span>대화</span>
        </TabsTrigger>
        <TabsTrigger value="documents" className="gap-2">
          <FileText className="h-4 w-4" />
          <span>문서</span>
        </TabsTrigger>
        <TabsTrigger value="settings" className="gap-2">
          <Settings className="h-4 w-4" />
          <span>설정</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="conversations" className="flex-1 mt-0" forceMount>
        <div className={activeTab === 'conversations' ? 'flex flex-col h-full' : 'hidden'}>
          {conversationsContent}
        </div>
      </TabsContent>

      <TabsContent value="documents" className="flex-1 mt-0" forceMount>
        <div className={activeTab === 'documents' ? 'flex flex-col h-full' : 'hidden'}>
          {documentsContent}
        </div>
      </TabsContent>

      <TabsContent value="settings" className="flex-1 mt-0 overflow-auto" forceMount>
        <div className={activeTab === 'settings' ? 'block' : 'hidden'}>
          {settingsContent}
        </div>
      </TabsContent>
    </Tabs>
  )
}
